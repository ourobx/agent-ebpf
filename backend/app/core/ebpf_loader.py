"""
High-Performance ctypes eBPF RingBuffer Loader & Telemetry Bridge.
Interacts directly with libbpf to poll kernel ring buffers and publish events to FastAPI EventBroadcaster.
"""

import ctypes
import socket
import struct
import threading
import time
from typing import Optional

from backend.app.core.broadcaster import event_broadcaster
from backend.app.schemas.telemetry import EbpfEvent

# -----------------------------------------------------------------------------
# 1. Ctypes Data Structure (Aligned 1-to-1 with C struct event_t in telemetry.bpf.h)
# -----------------------------------------------------------------------------
TASK_COMM_LEN = 16


class EventStruct(ctypes.Structure):
    _fields_ = [
        ("timestamp_ns", ctypes.c_uint64),
        ("pid", ctypes.c_uint32),
        ("uid", ctypes.c_uint32),
        ("saddr", ctypes.c_uint32),
        ("daddr", ctypes.c_uint32),
        ("sport", ctypes.c_uint16),
        ("dport", ctypes.c_uint16),
        ("protocol", ctypes.c_uint8),
        ("severity", ctypes.c_uint8),
        ("comm", ctypes.c_char * TASK_COMM_LEN),
    ]


# -----------------------------------------------------------------------------
# 2. libbpf C Function Signatures
# -----------------------------------------------------------------------------
RING_BUFFER_SAMPLE_FN = ctypes.CFUNCTYPE(
    ctypes.c_int,
    ctypes.c_void_p,  # ctx
    ctypes.c_void_p,  # data (void *data)
    ctypes.c_size_t,  # size
)


class EbpfRingBufferLoader:
    def __init__(self, bpf_obj_path: str = "agent/build/telemetry.bpf.o", map_name: str = "events"):
        self.bpf_obj_path = bpf_obj_path
        self.map_name = map_name.encode("utf-8")
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._rb_mgr = None
        self._bpf_obj = None
        self.libbpf = None

        # Dynamically load libbpf shared object
        try:
            self.libbpf = ctypes.CDLL("libbpf.so.1", use_errno=True)
        except OSError:
            try:
                self.libbpf = ctypes.CDLL("libbpf.so", use_errno=True)
            except OSError:
                # Mock / Fallback mode if libbpf is not available on host system
                self.libbpf = None

        if self.libbpf:
            self._setup_libbpf_signatures()

        # Retain callback reference in class instance to prevent Python garbage collection
        self._c_callback = RING_BUFFER_SAMPLE_FN(self._ring_buffer_sample_cb)

    def _setup_libbpf_signatures(self):
        """Configures libbpf C API function argument and return types."""
        # bpf_object__open_file
        self.libbpf.bpf_object__open_file.argtypes = [ctypes.c_char_p, ctypes.c_void_p]
        self.libbpf.bpf_object__open_file.restype = ctypes.c_void_p

        # bpf_object__load
        self.libbpf.bpf_object__load.argtypes = [ctypes.c_void_p]
        self.libbpf.bpf_object__load.restype = ctypes.c_int

        # bpf_object__find_map_by_name
        self.libbpf.bpf_object__find_map_by_name.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
        self.libbpf.bpf_object__find_map_by_name.restype = ctypes.c_void_p

        # bpf_map__fd
        self.libbpf.bpf_map__fd.argtypes = [ctypes.c_void_p]
        self.libbpf.bpf_map__fd.restype = ctypes.c_int

        # ring_buffer__new
        self.libbpf.ring_buffer__new.argtypes = [
            ctypes.c_int,               # map_fd
            RING_BUFFER_SAMPLE_FN,      # sample_cb
            ctypes.c_void_p,            # ctx
            ctypes.c_void_p             # opts
        ]
        self.libbpf.ring_buffer__new.restype = ctypes.c_void_p

        # ring_buffer__poll
        self.libbpf.ring_buffer__poll.argtypes = [ctypes.c_void_p, ctypes.c_int]
        self.libbpf.ring_buffer__poll.restype = ctypes.c_int

        # ring_buffer__free
        self.libbpf.ring_buffer__free.argtypes = [ctypes.c_void_p]
        self.libbpf.ring_buffer__free.restype = None

        # bpf_object__close
        self.libbpf.bpf_object__close.argtypes = [ctypes.c_void_p]
        self.libbpf.bpf_object__close.restype = None

    # -------------------------------------------------------------------------
    # 3. Ring Buffer Callback Function (Kernel -> Userspace Bridge)
    # -------------------------------------------------------------------------
    def _ring_buffer_sample_cb(self, ctx: int, data_ptr: int, size: int) -> int:
        if size < ctypes.sizeof(EventStruct):
            return 0

        # Cast raw memory buffer to ctypes struct
        raw_event = EventStruct.from_address(data_ptr)

        # Parse IPv4 addresses and network ports
        src_ip = socket.inet_ntoa(struct.pack("<I", raw_event.saddr))
        dst_ip = socket.inet_ntoa(struct.pack("<I", raw_event.daddr))
        sport = socket.ntohs(raw_event.sport)
        dport = socket.ntohs(raw_event.dport)

        severity_map = {0: "INFO", 1: "WARN", 2: "CRIT"}
        severity = severity_map.get(raw_event.severity, "INFO")

        # Convert to Pydantic v2 telemetry schema
        telemetry_event = EbpfEvent(
            pid=raw_event.pid,
            comm=raw_event.comm.decode("utf-8", errors="replace"),
            event_type="kprobe",
            syscall="tcp_v4_connect",
            severity=severity,
            details={
                "uid": raw_event.uid,
                "src": f"{src_ip}:{sport}",
                "dst": f"{dst_ip}:{dport}",
                "protocol": "TCP" if raw_event.protocol == 6 else str(raw_event.protocol),
                "kernel_time_ns": raw_event.timestamp_ns
            }
        )

        # Dispatch event asynchronously into FastAPI event loop
        event_broadcaster.publish_from_thread(telemetry_event)
        return 0

    # -------------------------------------------------------------------------
    # 4. Poller Daemon Loop & Lifecycle Management
    # -------------------------------------------------------------------------
    def start(self):
        """Loads the compiled eBPF object and launches the polling daemon thread."""
        if not self.libbpf:
            raise RuntimeError("libbpf library not found on host system (apt install libbpf-dev)")

        self._bpf_obj = self.libbpf.bpf_object__open_file(self.bpf_obj_path.encode("utf-8"), None)
        if not self._bpf_obj:
            raise RuntimeError(f"Could not open eBPF object file: {self.bpf_obj_path}")

        err = self.libbpf.bpf_object__load(self._bpf_obj)
        if err != 0:
            self.libbpf.bpf_object__close(self._bpf_obj)
            raise RuntimeError(f"Failed to load eBPF object (Verifier check failure), error code: {err}")

        bpf_map = self.libbpf.bpf_object__find_map_by_name(self._bpf_obj, self.map_name)
        if not bpf_map:
            self.libbpf.bpf_object__close(self._bpf_obj)
            raise RuntimeError(f"Target BPF map not found: {self.map_name.decode('utf-8')}")

        map_fd = self.libbpf.bpf_map__fd(bpf_map)
        self._rb_mgr = self.libbpf.ring_buffer__new(map_fd, self._c_callback, None, None)
        if not self._rb_mgr:
            self.libbpf.bpf_object__close(self._bpf_obj)
            raise RuntimeError("Failed to allocate BPF ring buffer manager")

        self._running = True
        self._thread = threading.Thread(target=self._poll_loop, daemon=True, name="ebpf-ringbuf-poller")
        self._thread.start()

    def _poll_loop(self):
        """Background adaptive ring buffer polling loop with dynamic latency profiling."""
        from backend.app.core.ringbuf_sentinel import ringbuf_sentinel

        while self._running:
            if self._rb_mgr and self.libbpf:
                timeout_ms = ringbuf_sentinel.adaptive_poll_timeout_ms
                t_start = time.perf_counter_ns()
                res = self.libbpf.ring_buffer__poll(self._rb_mgr, timeout_ms)
                duration_us = (time.perf_counter_ns() - t_start) / 1000.0

                if res >= 0:
                    ringbuf_sentinel.record_batch(event_count=res, dropped_count=0, poll_duration_us=round(duration_us, 2))
                else:
                    ringbuf_sentinel.record_batch(event_count=0, dropped_count=1, poll_duration_us=round(duration_us, 2))
                    time.sleep(0.01)
            else:
                break

    def stop(self):
        """Gracefully stops poller thread and frees C libbpf resources."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
        if self._rb_mgr and self.libbpf:
            self.libbpf.ring_buffer__free(self._rb_mgr)
            self._rb_mgr = None
        if self._bpf_obj and self.libbpf:
            self.libbpf.bpf_object__close(self._bpf_obj)
            self._bpf_obj = None


ebpf_loader = EbpfRingBufferLoader()
