"""
P0 eBPF loader graceful-failure edge tests (platform-independent, mock-backed).

Covers:
  4A. Loader behavior on privileged/capability errors, invalid input, and absent state.
"""
import sys
import os
from unittest.mock import patch, MagicMock
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tools.ebpf_loader import (
    check_system_capabilities,
    load_with_bpftool,
    unload_ebpf,
    add_blocked_ip,
    inspect_maps,
    KernelCapabilityError,
    EBPFLoaderError,
)


def test_capability_check_rejects_non_root():
    """Non-root (EUID != 0) must raise KernelCapabilityError."""
    with patch("tools.ebpf_loader.os.geteuid", return_value=1000, create=True), \
         patch("tools.ebpf_loader.shutil.which", return_value="/usr/sbin/bpftool"):
        try:
            check_system_capabilities()
            assert False, "Expected KernelCapabilityError for non-root"
        except KernelCapabilityError as e:
            assert "Root" in str(e)
    print("[PASS] Capability check rejects non-root")


def test_capability_check_rejects_missing_bpftool():
    """Missing bpftool must raise KernelCapabilityError (graceful, not crash)."""
    fake_btf = MagicMock()
    fake_btf.exists.return_value = True
    with patch("tools.ebpf_loader.os.geteuid", return_value=0, create=True), \
         patch("tools.ebpf_loader.Path", return_value=fake_btf), \
         patch("tools.ebpf_loader.shutil.which", return_value=None):
        try:
            check_system_capabilities()
            assert False, "Expected KernelCapabilityError when bpftool missing"
        except KernelCapabilityError as e:
            assert "bpftool" in str(e)
    print("[PASS] Capability check rejects missing bpftool gracefully")


def test_load_with_bpftool_requires_capabilities():
    """Load must not run and must fail gracefully when capabilities are missing."""
    with patch("tools.ebpf_loader.check_system_capabilities",
               side_effect=KernelCapabilityError("Root permissions required")):
        try:
            load_with_bpftool(Path("ebpf/shield.bpf.o"))
            assert False, "Expected KernelCapabilityError from load_with_bpftool"
        except KernelCapabilityError:
            pass
    print("[PASS] load_with_bpftool defers to capability errors (no partial load)")


def test_unload_graceful_when_nothing_pinned():
    """Unload with no pin dir returns a clean 'unloaded' status instead of crashing."""
    with patch("tools.ebpf_loader.check_system_capabilities"), \
         patch("tools.ebpf_loader.subprocess.run") as mock_sub, \
         patch.object(Path, "exists", return_value=False), \
         patch("tools.ebpf_loader.shutil.rmtree") as mock_rmtree:
        mock_sub.return_value = MagicMock(returncode=0, stdout="", stderr="")
        res = unload_ebpf(iface="eth0")
        assert res["status"] == "unloaded"
        mock_rmtree.assert_not_called()
    print("[PASS] unload_ebpf returns graceful status when nothing pinned")


def test_add_blocked_ip_invalid_ip_raises_valueerror():
    """Malformed IPv4 must raise ValueError before attempting any map write."""
    with patch.object(Path, "exists", return_value=True):
        try:
            add_blocked_ip("not-an-ip")
            assert False, "Expected ValueError for invalid IP"
        except ValueError:
            pass
    print("[PASS] add_blocked_ip rejects invalid IPv4 gracefully")


def test_inspect_maps_not_loaded_returns_empty():
    """inspect_maps without a pinned stats map returns not_loaded, not an exception."""
    with patch.object(Path, "exists", return_value=False):
        stats = inspect_maps()
    assert stats["status"] == "not_loaded"
    assert stats["total_packets"] == 0
    print("[PASS] inspect_maps returns not_loaded state gracefully")


if __name__ == "__main__":
    import unittest
    suite = unittest.TestLoader().loadTestsFromModule(sys.modules[__name__])
    # Run plain functions instead.
    _fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in _fns:
        fn()
    print("\n[SUCCESS] All loader edge tests passed!")
