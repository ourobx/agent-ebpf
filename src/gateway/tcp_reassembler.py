"""
KSEC v2.0 — Streaming TCP Reassembler & Wire Protocol Parser

Maintains a sliding window stream buffer per TCP 4-tuple to defeat
fragmentation evasion attacks across MTU boundaries.
"""

from __future__ import annotations
import time
import struct
from dataclasses import dataclass, field
from typing import Dict, Tuple, Optional, List, Callable

MAX_FRAME_SIZE: int = 65536  # 64 KB max frame buffer
CLEANUP_INTERVAL_SEC: float = 30.0
STREAM_TIMEOUT_SEC: float = 10.0

TupleKey = Tuple[str, int, str, int]


@dataclass
class TCPStreamBuffer:
    src_ip: str
    src_port: int
    dst_ip: str
    dst_port: int
    buffer: bytearray = field(default_factory=bytearray)
    expected_seq: Optional[int] = None
    last_activity: float = field(default_factory=time.monotonic)
    total_reassembled_bytes: int = 0


@dataclass
class ParsedFrame:
    connection_key: TupleKey
    protocol: str
    payload_type: str
    payload: bytes
    is_complete: bool
    reassembly_latency_us: float


class TCPReassembler:
    """
    Zero-copy TCP stream reassembly engine.
    Aggregates multi-packet fragments into complete Postgres / HTTP frames.
    """

    def __init__(self, on_frame_callback: Optional[Callable[[ParsedFrame], None]] = None):
        self._streams: Dict[TupleKey, TCPStreamBuffer] = {}
        self._on_frame = on_frame_callback
        self._last_cleanup = time.monotonic()

    def process_packet(
        self,
        src_ip: str,
        src_port: int,
        dst_ip: str,
        dst_port: int,
        seq_num: int,
        data: bytes
    ) -> Optional[ParsedFrame]:
        """
        Ingests a raw TCP segment, reassembles fragmentation, and returns
        complete protocol frame if a boundary is reached.
        """
        start_t = time.perf_counter()
        key: TupleKey = (src_ip, src_port, dst_ip, dst_port)
        now = time.monotonic()

        if key not in self._streams:
            self._streams[key] = TCPStreamBuffer(
                src_ip=src_ip,
                src_port=src_port,
                dst_ip=dst_ip,
                dst_port=dst_port,
                expected_seq=seq_num
            )

        stream = self._streams[key]
        stream.last_activity = now

        # Append payload to stream buffer
        stream.buffer.extend(data)
        stream.total_reassembled_bytes += len(data)

        # Protection against buffer inflation DoS
        if len(stream.buffer) > MAX_FRAME_SIZE:
            del self._streams[key]
            raise ValueError(f"Stream {key} exceeded MAX_FRAME_SIZE ({MAX_FRAME_SIZE} bytes)")

        # Inspect if we have formed a complete message frame
        frame = self._try_extract_frame(key, stream, start_t)

        # Periodic cleanup of expired streams
        if now - self._last_cleanup > CLEANUP_INTERVAL_SEC:
            self._evict_stale_streams(now)
            self._last_cleanup = now

        return frame

    def _try_extract_frame(
        self,
        key: TupleKey,
        stream: TCPStreamBuffer,
        start_t: float
    ) -> Optional[ParsedFrame]:
        buf = stream.buffer
        if len(buf) < 5:
            return None

        # PostgreSQL Frontend message format check:
        # Byte 0: Type indicator ('Q'=SimpleQuery, 'P'=Parse, 'B'=Bind, 'E'=Execute)
        # Bytes 1-4: Length (32-bit int, big-endian, includes length field itself)
        msg_type = chr(buf[0])
        if msg_type in ('Q', 'P', 'B', 'E', 'D', 'C'):
            (msg_len,) = struct.unpack_from(">I", buf, 1)
            total_expected = 1 + msg_len

            if len(buf) >= total_expected:
                raw_frame = bytes(buf[:total_expected])
                del buf[:total_expected]  # Drain frame from buffer

                elapsed_us = (time.perf_counter() - start_t) * 1_000_000.0
                frame = ParsedFrame(
                    connection_key=key,
                    protocol="PostgreSQL",
                    payload_type=msg_type,
                    payload=raw_frame,
                    is_complete=True,
                    reassembly_latency_us=elapsed_us
                )
                if self._on_frame:
                    self._on_frame(frame)
                return frame

        # HTTP REST / JSON wire protocol boundary check
        elif buf.startswith(b"POST ") or buf.startswith(b"GET ") or buf.startswith(b"PUT "):
            header_end = buf.find(b"\r\n\r\n")
            if header_end != -1:
                # Check for Content-Length
                cl_idx = buf.lower().find(b"content-length:")
                if cl_idx != -1 and cl_idx < header_end:
                    cl_end = buf.find(b"\r\n", cl_idx)
                    cl_val = int(buf[cl_idx + 15:cl_end].strip())
                    total_expected = header_end + 4 + cl_val
                    if len(buf) >= total_expected:
                        raw_frame = bytes(buf[:total_expected])
                        del buf[:total_expected]
                        elapsed_us = (time.perf_counter() - start_t) * 1_000_000.0
                        return ParsedFrame(
                            connection_key=key,
                            protocol="HTTP",
                            payload_type="REST",
                            payload=raw_frame,
                            is_complete=True,
                            reassembly_latency_us=elapsed_us
                        )
                else:
                    # Simple GET with no body
                    raw_frame = bytes(buf[:header_end + 4])
                    del buf[:header_end + 4]
                    elapsed_us = (time.perf_counter() - start_t) * 1_000_000.0
                    return ParsedFrame(
                        connection_key=key,
                        protocol="HTTP",
                        payload_type="GET",
                        payload=raw_frame,
                        is_complete=True,
                        reassembly_latency_us=elapsed_us
                    )

        return None

    def _evict_stale_streams(self, now: float) -> None:
        stale_keys = [
            k for k, s in self._streams.items()
            if now - s.last_activity > STREAM_TIMEOUT_SEC
        ]
        for k in stale_keys:
            del self._streams[k]
