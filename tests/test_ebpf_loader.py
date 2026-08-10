import sys
import os
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tools.ebpf_loader import (
    compile_ebpf,
    load_with_bpftool,
    unload_ebpf,
    add_blocked_ip,
    inspect_maps,
    EBPFLoaderError,
    KernelCapabilityError
)


class TestEBPFLoader(unittest.TestCase):

    @patch("subprocess.run")
    def test_compile_ebpf_success(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        with patch.object(Path, "exists", return_value=True):
            res = compile_ebpf()
            self.assertTrue(str(res).endswith("shield.bpf.o"))

    @patch("subprocess.run")
    def test_compile_ebpf_failure(self, mock_run):
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="Clang error")
        with self.assertRaises(EBPFLoaderError):
            compile_ebpf()

    @patch("tools.ebpf_loader.check_system_capabilities")
    def test_inspect_maps_not_loaded(self, mock_caps):
        with patch.object(Path, "exists", return_value=False):
            stats = inspect_maps()
            self.assertEqual(stats["status"], "not_loaded")

    @patch("tools.ebpf_loader.check_system_capabilities")
    @patch("subprocess.run")
    def test_add_blocked_ip_missing_map(self, mock_run, mock_caps):
        with patch.object(Path, "exists", return_value=False):
            with self.assertRaises(EBPFLoaderError):
                add_blocked_ip("192.168.1.100")


if __name__ == "__main__":
    unittest.main()
