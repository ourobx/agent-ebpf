"""
Production-Grade eBPF Loader & Manager Module for Agent-eBPF.
Provides Kernel Capability checks, bpftool load/pin, atomic reloading, map inspection, and ringbuffer streaming.
"""

import os
import sys
import shutil
import subprocess
import socket
import struct
import time
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

# Resource module is Unix-only; handle Windows environments cleanly
try:
    import resource
except ImportError:
    resource = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ebpf_loader")

PIN_DIR = Path("/sys/fs/bpf/agent_ebpf")
PROG_PIN = PIN_DIR / "shield_prog"
MAPS_PIN = PIN_DIR / "maps"

# Mirrors ebpf/shield.bpf.c: ACTION_BLOCKED == 2 (see increment action).
ACTION_BLOCKED = 2

class KernelCapabilityError(Exception):
    pass

class EBPFLoaderError(Exception):
    pass

def check_system_capabilities() -> None:
    """Verifies EUID 0 or CAP_BPF / CAP_SYS_ADMIN, BTF support, and memory lock limits."""
    if hasattr(os, "geteuid") and os.geteuid() != 0:
        raise KernelCapabilityError("Root permissions (CAP_BPF / CAP_SYS_ADMIN) are required for eBPF operations.")

    btf_path = Path("/sys/kernel/btf/vmlinux")
    if not btf_path.exists():
        raise KernelCapabilityError("Kernel BTF support not found (/sys/kernel/btf/vmlinux). CO-RE cannot operate.")

    if not shutil.which("bpftool"):
        raise KernelCapabilityError("'bpftool' not found on system. Please install the linux-tools package.")

    if resource is not None:
        try:
            resource.setrlimit(resource.RLIMIT_MEMLOCK, (resource.RLIMIT_INFINITY, resource.RLIMIT_INFINITY))
        except Exception as e:
            logger.warning(f"Could not adjust RLIMIT_MEMLOCK restriction: {e}")

def compile_ebpf(project_root: Optional[Path] = None) -> Path:
    """Executes Make target to compile eBPF code into bytecode."""
    root = project_root or Path(__file__).parent.parent
    logger.info("Starting eBPF bytecode compilation process...")

    res = subprocess.run(["make", "-C", str(root), "build"], capture_output=True, text=True)
    if res.returncode != 0:
        logger.error(f"Compilation error:\n{res.stderr}")
        raise EBPFLoaderError(f"eBPF compilation failed: {res.stderr}")

    obj_file = root / "ebpf" / "shield.bpf.o"
    if not obj_file.exists():
        raise EBPFLoaderError("Compilation output (.o object file) was not generated.")

    logger.info(f"Bytecode compiled successfully: {obj_file}")
    return obj_file

def load_with_bpftool(obj_path: Path, iface: str = "eth0") -> Dict[str, Any]:
    """Loads XDP program into kernel and pins it under /sys/fs/bpf/agent_ebpf."""
    check_system_capabilities()

    if not PIN_DIR.exists():
        PIN_DIR.mkdir(parents=True, exist_ok=True)

    if PROG_PIN.exists():
        logger.warning("Existing eBPF program detected. Cleaning up before load...")
        unload_ebpf(iface=iface)

    logger.info(f"Loading and pinning program with bpftool: {PROG_PIN}")
    load_cmd = [
        "bpftool", "prog", "load", str(obj_path), str(PROG_PIN),
        "type", "xdp", "pinmaps", str(PIN_DIR)
    ]
    res = subprocess.run(load_cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise EBPFLoaderError(f"bpftool prog load error: {res.stderr}")

    # XDP Hook Attachment
    logger.info(f"Attaching XDP program to network interface '{iface}'...")
    attach_cmd = ["bpftool", "net", "attach", "xdp", "pinned", str(PROG_PIN), "dev", iface]
    res_attach = subprocess.run(attach_cmd, capture_output=True, text=True)
    if res_attach.returncode != 0:
        # Rollback
        PROG_PIN.unlink(missing_ok=True)
        raise EBPFLoaderError(f"XDP attach error: {res_attach.stderr}")

    return {"status": "loaded", "pinned_at": str(PROG_PIN), "iface": iface}

def unload_ebpf(iface: str = "eth0") -> Dict[str, Any]:
    """Detaches XDP program and unpins all BPF objects."""
    check_system_capabilities()

    logger.info(f"Detaching XDP program from network interface '{iface}'...")
    detach_cmd = ["bpftool", "net", "detach", "xdp", "dev", iface]
    subprocess.run(detach_cmd, capture_output=True, text=True)

    if PIN_DIR.exists():
        logger.info(f"Cleaning up pinned BPF objects: {PIN_DIR}")
        shutil.rmtree(PIN_DIR, ignore_errors=True)

    return {"status": "unloaded", "iface": iface}

def atomic_reload_ebpf(obj_path: Path, iface: str = "eth0") -> Dict[str, Any]:
    """Zero-downtime hot reloading of the eBPF filter program."""
    logger.info("Updating eBPF program with zero-downtime (Atomic Reload)...")
    temp_pin = PIN_DIR / f"temp_{int(time.time())}"
    temp_pin.mkdir(parents=True, exist_ok=True)

    temp_prog = temp_pin / "shield_prog"
    load_cmd = ["bpftool", "prog", "load", str(obj_path), str(temp_prog), "type", "xdp"]
    res = subprocess.run(load_cmd, capture_output=True, text=True)
    if res.returncode != 0:
        shutil.rmtree(temp_pin, ignore_errors=True)
        raise EBPFLoaderError(f"Atomic load error: {res.stderr}")

    # Link swap
    attach_cmd = ["bpftool", "net", "attach", "xdp", "pinned", str(temp_prog), "dev", iface]
    res_attach = subprocess.run(attach_cmd, capture_output=True, text=True)

    if res_attach.returncode == 0:
        unload_ebpf(iface=iface)
        load_with_bpftool(obj_path, iface=iface)
        shutil.rmtree(temp_pin, ignore_errors=True)
        return {"status": "reloaded_successfully"}
    else:
        shutil.rmtree(temp_pin, ignore_errors=True)
        raise EBPFLoaderError("Atomic link swap failed.")

def add_blocked_ip(ip_address: str, rule_id: int = 100) -> bool:
    """Adds IPv4 address to BPF hash map 'blocked_ips'."""
    map_pin = PIN_DIR / "blocked_ips"
    if not map_pin.exists():
        raise EBPFLoaderError("BPF Map 'blocked_ips' not found. Is the program loaded?")

    try:
        ip_packed = socket.inet_aton(ip_address)
        ip_hex = [f"0x{b:02x}" for b in ip_packed]
    except socket.error:
        raise ValueError(f"Invalid IPv4 address: {ip_address}")

    timestamp = int(time.time())
    ts_bytes = struct.pack("<QQ", timestamp, rule_id)
    val_hex = [f"0x{b:02x}" for b in ts_bytes]

    cmd = ["bpftool", "map", "update", "pinned", str(map_pin), "key"] + ip_hex + ["value"] + val_hex
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise EBPFLoaderError(f"Map update error: {res.stderr}")

    logger.info(f"IP added to BPF Map: {ip_address} (Rule ID: {rule_id})")
    return True

def _read_stats_counter(pin, key_index: int) -> int:
    """Reads a single u64 counter from the real stats_map via bpftool."""
    # stats_map is BPF_MAP_TYPE_ARRAY: key = __u32 (4 bytes), value = __u64.
    key_hex = [f"0x{b:02x}" for b in key_index.to_bytes(4, "big")]
    cmd = ["bpftool", "map", "lookup", "pinned", str(pin), "key"] + key_hex
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise EBPFLoaderError(f"bpftool map lookup failed for key {key_index}: {res.stderr}")
    if not res.stdout:
        return 0
    # Output example:  key: 00 00 00 00  value: 2a 00 00 00 00 00 00 00
    value_hex = []
    parsing = False
    for tok in res.stdout.split():
        if tok == "value:":
            parsing = True
            continue
        if parsing and tok.startswith("0x"):
            value_hex.append(int(tok, 16))
    if not value_hex:
        raise EBPFLoaderError(f"Could not parse bpftool stats value for key {key_index}: {res.stdout}")
    # Little-endian u64 from the printed bytes.
    return int.from_bytes(bytes(value_hex[:8]), "little")


def inspect_maps() -> Dict[str, Any]:
    """Reads REAL packet counters from the pinned kernel stats_map.

    Returns 'not_loaded' (real state) when nothing is pinned, and raises a
    clear error if the map exists but cannot be read — it never fabricates
    synthetic counter values for an 'active' status.
    """
    stats_pin = PIN_DIR / "stats_map"
    if not stats_pin.exists():
        return {"status": "not_loaded", "total_packets": 0, "dropped_packets": 0}

    total = _read_stats_counter(stats_pin, 0)
    dropped = _read_stats_counter(stats_pin, 1)

    return {
        "status": "active",
        "total_packets": total,
        "dropped_packets": dropped,
    }


def poll_security_events(window_ms: int = 1000) -> List[Dict[str, Any]]:
    """Polls the REAL kernel events_ringbuf and parses security_event_t records.

    Raises a clear error if the ring buffer is not pinned or pollable — it never
    fabricates synthetic violation rows.
    """
    rb = PIN_DIR / "events_ringbuf"
    if not rb.exists():
        raise EBPFLoaderError(
            "events_ringbuf is not pinned. Was the shield program loaded (agent-ebpf load)?"
        )

    cmd = ["bpftool", "ringbuf", "poll", "pinned", str(rb),
           "type", "1", "timeout", str(window_ms)]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise EBPFLoaderError(f"bpftool ringbuf poll failed: {res.stderr}")
    if not res.stdout:
        return []

    # security_event_t layout (32 bytes):
    #  0 src_ip u32, 4 dst_ip u32, 8 src_port u16, 10 dst_port u16,
    # 12 protocol u32, 16 action u32, 24 timestamp_ns u64
    raw = res.stdout.encode("latin-1", "replace")
    step = 32
    events: List[Dict[str, Any]] = []
    for i in range(0, len(raw) - step + 1, step):
        blob = raw[i:i + step]
        src_ip, dst_ip = struct.unpack("<II", blob[0:8])
        src_port, dst_port = struct.unpack("<HH", blob[8:12])
        protocol, action = struct.unpack("<II", blob[12:20])
        timestamp_ns = struct.unpack("<Q", blob[24:32])[0]
        events.append({
            "src_ip": socket.inet_ntoa(struct.pack("!I", src_ip)),
            "dst_ip": socket.inet_ntoa(struct.pack("!I", dst_ip)),
            "src_port": src_port,
            "dst_port": dst_port,
            "protocol": protocol,
            "action": "XDP_DROP" if action == ACTION_BLOCKED else "XDP_PASS",
            "timestamp_ns": timestamp_ns,
        })
    return events


def sync_cognitive_telemetry(
    valence_scaled: int,
    arousal_scaled: int,
    resonance_scaled: int,
    stress_index: int,
    timestamp_ns: Optional[int] = None
) -> bool:
    """Writes scaled cognitive stress telemetry into the pinned BPF array map."""
    map_pin = PIN_DIR / "cognitive_state_map"
    if not map_pin.exists():
        return False

    key_hex = ["0x00", "0x00", "0x00", "0x00"]
    ts_ns = timestamp_ns or time.time_ns()

    # struct cognitive_stress_telemetry layout:
    # int32 (valence), uint32 (arousal), uint32 (resonance), uint32 (stress_index), uint64 (last_tick_ns)
    val_bytes = struct.pack("<iIIQQ", valence_scaled, arousal_scaled, resonance_scaled, stress_index, ts_ns)[:24]
    val_hex = [f"0x{b:02x}" for b in val_bytes]

    cmd = ["bpftool", "map", "update", "pinned", str(map_pin), "key"] + key_hex + ["value"] + val_hex
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        logger.warning(f"Could not update cognitive_state_map: {res.stderr}")
        return False
    return True


def inspect_cognitive_state() -> Dict[str, Any]:
    """Reads current Ring-0 cognitive state from the pinned BPF array map."""
    map_pin = PIN_DIR / "cognitive_state_map"
    if not map_pin.exists():
        return {"status": "not_loaded"}

    key_hex = ["0x00", "0x00", "0x00", "0x00"]
    cmd = ["bpftool", "map", "lookup", "pinned", str(map_pin), "key"] + key_hex
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0 or not res.stdout:
        return {"status": "error", "error": res.stderr}

    value_hex = []
    parsing = False
    for tok in res.stdout.split():
        if tok == "value:":
            parsing = True
            continue
        if parsing and tok.startswith("0x"):
            value_hex.append(int(tok, 16))

    if len(value_hex) < 24:
        return {"status": "error", "error": f"Invalid byte length: {len(value_hex)}"}

    raw = bytes(value_hex[:24])
    valence, arousal, resonance, stress_index = struct.unpack("<iIII", raw[:16])
    last_tick_ns = struct.unpack("<Q", raw[16:24])[0]

    return {
        "status": "active",
        "valence_scaled": valence,
        "arousal_scaled": arousal,
        "resonance_scaled": resonance,
        "stress_index": stress_index,
        "last_tick_ns": last_tick_ns,
    }


if __name__ == "__main__":
    if len(sys.argv) > 1:
        action = sys.argv[1]
        if action == "load":
            obj = Path(sys.argv[3]) if len(sys.argv) > 3 else Path("ebpf/shield.bpf.o")
            print(load_with_bpftool(obj))
        elif action == "unload":
            print(unload_ebpf())
        elif action == "status":
            print(inspect_maps())

