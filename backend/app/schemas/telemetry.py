from datetime import datetime, timezone
from typing import Dict, Any, Literal
from pydantic import BaseModel, Field


class EbpfEvent(BaseModel):
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    pid: int = Field(..., description="Process ID")
    comm: str = Field(..., description="Process / Command Name")
    event_type: str = Field(..., description="Hook type: kprobe, tracepoint, raw_syscalls, xdp, sockops")
    syscall: str = Field(..., description="Target system call (e.g. sys_enter_connect, tcp_v4_connect, sys_enter_execve)")
    details: Dict[str, Any] = Field(default_factory=dict, description="Structured event payload (IP, Port, Query, Arguments)")
    severity: Literal["INFO", "WARN", "CRIT"] = Field(default="INFO", description="Event severity classification")
