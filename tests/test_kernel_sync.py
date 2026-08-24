import pytest
from engine.affective_engine import AffectiveVector
from engine.kernel_sync import KernelEmpathyBridge, CognitiveStressTelemetry

def test_ctypes_struct_alignment():
    payload = CognitiveStressTelemetry(
        valence_scaled=750,
        arousal_scaled=350,
        resonance_scaled=900,
        stress_index=1,
        last_tick_ns=123456789
    )
    assert payload.valence_scaled == 750
    assert payload.arousal_scaled == 350
    assert payload.resonance_scaled == 900
    assert payload.stress_index == 1
    assert payload.last_tick_ns == 123456789

def test_kernel_empathy_bridge_sync_mock():
    bridge = KernelEmpathyBridge(map_pin_path="/tmp/non_existent_bpf_map")
    vec = AffectiveVector(valence=-0.5, arousal=0.85, resonance=0.9)
    
    payload = bridge.sync_state(vec)
    assert payload.valence_scaled == 250  # (-0.5 + 1.0) * 500 = 250
    assert payload.arousal_scaled == 850
    assert payload.resonance_scaled == 900
    assert payload.stress_index == 2  # High arousal + negative valence -> Alarm
    bridge.close()
