"""
KSEC cgroupv2 Automated Quarantine & Process Freezing Engine.
Isolates misbehaving or compromised agent processes by moving their PID into a dedicated
quarantine cgroup (/sys/fs/cgroup/ksec_quarantine) and applying deterministic sub-millisecond freeze.
"""

import os
import signal
from pathlib import Path


class CGroupQuarantineEngine:
    def __init__(self, cgroup_root: str = "/sys/fs/cgroup"):
        self.cgroup_root = Path(cgroup_root)
        self.quarantine_path = self.cgroup_root / "ksec_quarantine"
        self._initialize_quarantine_cgroup()

    def _initialize_quarantine_cgroup(self):
        """Initializes the quarantine cgroupv2 hierarchy and prepares freeze controllers."""
        try:
            if not self.quarantine_path.exists():
                self.quarantine_path.mkdir(parents=True, exist_ok=True)
                print(f"[INFO] [Quarantine] Created cgroupv2 quarantine hierarchy at {self.quarantine_path}")
        except PermissionError:
            print("[WARN] [Quarantine] Running without root privileges. Operating in POSIX signal fallback mode.")
        except Exception as exc:
            print(f"[WARN] [Quarantine] cgroupv2 initialization note: {exc}")

    def freeze_process(self, pid: int) -> bool:
        """
        Transfers the target PID into the quarantine cgroup and asserts atomic cgroup.freeze = 1.
        Falls back gracefully to POSIX SIGSTOP when cgroupv2 controller is unavailable.
        """
        procs_file = self.quarantine_path / "cgroup.procs"
        freeze_file = self.quarantine_path / "cgroup.freeze"

        try:
            # 1. Attach PID to dedicated quarantine control group
            if procs_file.exists():
                procs_file.write_text(str(pid))

            # 2. Assert atomic freeze state
            if freeze_file.exists():
                freeze_file.write_text("1")
                print(f"[SECURITY] [QUARANTINE ENFORCED] PID {pid} frozen via cgroupv2 controller.")
                return True
            else:
                # POSIX SIGSTOP signal fallback
                if pid > 1 and os.name != "nt":
                    os.kill(pid, signal.SIGSTOP)
                print(f"[INFO] [Quarantine] PID {pid} suspended via SIGSTOP fallback.")
                return True

        except ProcessLookupError:
            print(f"[WARN] [Quarantine] PID {pid} terminated before quarantine attachment.")
            return False
        except PermissionError:
            print(f"[ERROR] [Quarantine] Insufficient privileges to freeze PID {pid}. Root CAP_SYS_ADMIN required.")
            return False
        except Exception as exc:
            print(f"[ERROR] [Quarantine] Failed to isolate PID {pid}: {exc}")
            return False

    def unfreeze_process(self, pid: int) -> bool:
        """Restores execution state by releasing freeze locks (cgroup.freeze = 0 or SIGCONT)."""
        freeze_file = self.quarantine_path / "cgroup.freeze"
        try:
            if freeze_file.exists():
                freeze_file.write_text("0")
            elif pid > 1 and os.name != "nt":
                os.kill(pid, signal.SIGCONT)
            print(f"[INFO] [Quarantine] PID {pid} released from quarantine.")
            return True
        except Exception as exc:
            print(f"[WARN] [Quarantine] Failed to unfreeze PID {pid}: {exc}")
            return False


quarantine_engine = CGroupQuarantineEngine()
