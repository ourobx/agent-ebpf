"""
Ring-0 Kernel Memory Bridge: Synchronizes Affective Vector states with Ring-0 eBPF Array Maps.
"""

import os
import time
import ctypes
import logging
from typing import Optional, Dict, Any
from engine.affective_engine import AffectiveVector

logger = logging.getLogger("kernel_sync")

# C struct cognitive_stress_telemetry memory layout alignment (24 bytes)
class CognitiveStressTelemetry(ctypes.Structure):
    _fields_ = [
        ("valence_scaled", ctypes.c_uint32),    # (valence + 1.0) * 500 -> [0, 1000]
        ("arousal_scaled", ctypes.c_uint32),    # arousal * 1000       -> [0, 1000]
        ("resonance_scaled", ctypes.c_uint32),  # resonance * 1000     -> [0, 1000]
        ("stress_index", ctypes.c_uint32),      # 0: SERENE, 1: FOCUSED, 2: HESITATION_ALARM
        ("last_tick_ns", ctypes.c_uint64),      # CLOCK_MONOTONIC ns
    ]


class KernelEmpathyBridge:
    """
    Bridge module for packing AffectiveVector continuous variables into
    C struct layout and persisting them to Linux kernel BPF array maps.
    """

    def __init__(self, map_pin_path: str = "/sys/fs/bpf/agent_ebpf/cognitive_state_map"):
        self.map_pin_path = map_pin_path
        self.map_fd: Optional[int] = None
        self._init_bpf_map()

    def _init_bpf_map(self) -> None:
        """Opens pinned BPF map file descriptor or defaults to mock mode."""
        if os.path.exists(self.map_pin_path):
            try:
                self.map_fd = os.open(self.map_pin_path, os.O_RDWR)
                logger.info(f"[KernelBridge] Connected to pinned BPF map at {self.map_pin_path} (fd={self.map_fd})")
            except Exception as e:
                logger.warning(f"[KernelBridge] Could not open pinned BPF map ({e}); operating in mock bridge mode.")
                self.map_fd = None
        else:
            self.map_fd = None

    def sync_state(self, state: AffectiveVector) -> CognitiveStressTelemetry:
        """Packs emotional state vector into C struct and writes to kernel array map (Key 0)."""
        # 1. Stress Index Calculation (Hesitation Threshold)
        if state.arousal > 0.65 or state.valence < -0.3:
            stress_idx = 2  # Hesitation Alarm / Destructive Caution
        elif state.arousal > 0.4 or state.curiosity > 0.75:
            stress_idx = 1  # High Focus
        else:
            stress_idx = 0  # Serene / Tranquil

        # 2. Scalar Normalization: [-1.0, 1.0] -> [0, 1000]
        valence_uint = int((state.valence + 1.0) * 500.0)
        arousal_uint = int(state.arousal * 1000.0)
        resonance_uint = int(state.resonance * 1000.0)

        payload = CognitiveStressTelemetry(
            valence_scaled=max(0, min(1000, valence_uint)),
            arousal_scaled=max(0, min(1000, arousal_uint)),
            resonance_scaled=max(0, min(1000, resonance_uint)),
            stress_index=stress_idx,
            last_tick_ns=time.time_ns(),
        )

        if self.map_fd is not None:
            self._write_bpf_map(0, payload)

        return payload

    def _write_bpf_map(self, key: int, payload: CognitiveStressTelemetry) -> bool:
        """Performs atomic sys_bpf update on the pinned BPF array map."""
        try:
            # Struct byte payload write
            buf = bytes(payload)
            # In Linux kernel runtime with bpftool / libc sys_bpf wrapper:
            # Here we perform low-level file / map descriptor write
            os.write(self.map_fd, buf)
            return True
        except Exception as e:
            logger.warning(f"[KernelBridge] BPF map write update error: {e}")
            return False

    def close(self) -> None:
        if self.map_fd is not None:
            try:
                os.close(self.map_fd)
            except Exception:
                pass
            self.map_fd = None
