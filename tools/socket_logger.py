"""
KSEC v2.0 — Userspace Socket Connection Logger & Kernel Probe Consumer

Consumes connect_event_t structs from the kernel connect_events_ringbuf
and produces structured, high-visibility audit trails for outbound AI agent traffic.
"""

from __future__ import annotations
import socket
import struct
import time
import json
import logging
from dataclasses import dataclass, asdict
from typing import Dict, Any, List, Optional, Callable

logger = logging.getLogger("socket_logger")

# Binary layout for connect_event_t (56 bytes):
# <IIIIHHIIQ16s
# 0: u32 pid
# 4: u32 tgid
# 8: u32 src_ip
# 12: u32 dst_ip
# 16: u16 src_port
# 18: u16 dst_port
# 20: u32 fd
# 24: u32 is_db_socket
# 28: u32 action
# 32: u64 timestamp_ns
# 40: char comm[16]
_CONNECT_STRUCT = struct.Struct("<IIIIHHIIQ16s")

PORT_SERVICE_MAP = {
    80: "HTTP",
    443: "HTTPS",
    5432: "PostgreSQL",
    3306: "MySQL",
    6379: "Redis",
    27017: "MongoDB",
    9092: "Kafka",
    8000: "KSEC_Gateway",
    8080: "HTTP_Proxy",
}


@dataclass
class SocketConnectRecord:
    pid: int
    tgid: int
    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    target_service: str
    fd: int
    is_db_socket: bool
    action: str  # "PASS", "ALERT", "BLOCK"
    timestamp_ns: int
    comm: str

    def to_log_line(self, colored: bool = True) -> str:
        """Returns a high-visibility terminal log line."""
        ts_sec = self.timestamp_ns / 1e9
        dt_str = time.strftime("%H:%M:%S", time.localtime(ts_sec)) + f".{int((ts_sec % 1) * 1000):03d}"

        tag = "[CONNECT]"
        if self.is_db_socket:
            tag = "[DB-CONNECT]"

        if colored:
            color = "\033[92m" if self.action == "PASS" else "\033[91m"
            reset = "\033[0m"
            return (
                f"{color}{tag}{reset} {dt_str} | PID={self.pid} ({self.comm}) "
                f"-> {self.dst_ip}:{self.dst_port} ({self.target_service}) "
                f"| FD={self.fd} | Action={self.action}"
            )
        return (
            f"{tag} {dt_str} | PID={self.pid} ({self.comm}) "
            f"-> {self.dst_ip}:{self.dst_port} ({self.target_service}) "
            f"| FD={self.fd} | Action={self.action}"
        )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def parse_connect_event_bytes(blob: bytes) -> SocketConnectRecord:
    """Decodes a single 56-byte connect_event_t struct."""
    if len(blob) < 56:
        raise ValueError(f"Invalid connect_event length: {len(blob)} (expected >= 56)")

    (
        pid, tgid, src_ip, dst_ip,
        src_port, dst_port,
        fd, is_db_socket, action_code,
        timestamp_ns, comm_raw
    ) = _CONNECT_STRUCT.unpack(blob[:56])

    comm = comm_raw.split(b"\x00", 1)[0].decode("utf-8", "replace")
    dst_ip_str = socket.inet_ntoa(struct.pack("<I", dst_ip)) if dst_ip != 0 else "0.0.0.0"
    src_ip_str = socket.inet_ntoa(struct.pack("<I", src_ip)) if src_ip != 0 else "0.0.0.0"

    target_service = PORT_SERVICE_MAP.get(dst_port, "TCP_CUSTOM")

    action_str = "PASS"
    if action_code == 2:
        action_str = "ALERT"
    elif action_code == 3:
        action_str = "BLOCK"

    return SocketConnectRecord(
        pid=pid,
        tgid=tgid,
        src_ip=src_ip_str,
        dst_ip=dst_ip_str,
        src_port=src_port,
        dst_port=dst_port,
        target_service=target_service,
        fd=fd,
        is_db_socket=bool(is_db_socket),
        action=action_str,
        timestamp_ns=timestamp_ns,
        comm=comm,
    )


class SocketConnectLogger:
    """
    Userspace socket connection logger and live ringbuffer consumer.
    """

    def __init__(self, max_history: int = 1000, log_callback: Optional[Callable[[SocketConnectRecord], None]] = None):
        self.max_history = max_history
        self.log_callback = log_callback
        self.history: List[SocketConnectRecord] = []

    def ingest_raw_event(self, blob: bytes) -> SocketConnectRecord:
        """Ingests and decodes raw binary event from BPF ring buffer."""
        record = parse_connect_event_bytes(blob)
        self.history.append(record)
        if len(self.history) > self.max_history:
            self.history.pop(0)

        if self.log_callback:
            self.log_callback(record)
        return record

    def record_connection(
        self,
        pid: int,
        comm: str,
        dst_ip: str,
        dst_port: int,
        fd: int = 3,
        is_db_socket: Optional[bool] = None,
        action: str = "PASS"
    ) -> SocketConnectRecord:
        """Records a connection programmatically (for testing or agent interception)."""
        target_service = PORT_SERVICE_MAP.get(dst_port, "TCP_CUSTOM")
        is_db = is_db_socket if is_db_socket is not None else (dst_port in {5432, 3306, 6379, 27017})

        record = SocketConnectRecord(
            pid=pid,
            tgid=pid,
            src_ip="127.0.0.1",
            dst_ip=dst_ip,
            src_port=50000,
            dst_port=dst_port,
            target_service=target_service,
            fd=fd,
            is_db_socket=is_db,
            action=action,
            timestamp_ns=time.time_ns(),
            comm=comm
        )
        self.history.append(record)
        if len(self.history) > self.max_history:
            self.history.pop(0)

        if self.log_callback:
            self.log_callback(record)
        return record

    def get_recent_logs(self, limit: int = 50, db_only: bool = False) -> List[Dict[str, Any]]:
        """Returns recent socket connection audit records."""
        events = self.history
        if db_only:
            events = [e for e in events if e.is_db_socket]
        return [e.to_dict() for e in events[-limit:]]


# Global singleton instance
socket_logger = SocketConnectLogger()
