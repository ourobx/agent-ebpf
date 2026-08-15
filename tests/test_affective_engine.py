"""
Comprehensive Test Suite for Affective Cognitive Engine, Inner Monologue, and Kernel Telemetry Sync.
"""

import pytest
import json
from fastapi.testclient import TestClient
from engine.affective_engine import (
    AffectiveVector,
    InnerMonologue,
    CognitivePulse,
    CognitiveEngine
)
from mcp_server import app, execute_tool
from tools import ebpf_loader


def test_affective_vector_bounds():
    """Validates vector bounds for Valence, Arousal, Resonance, Curiosity, Vulnerability."""
    vec = AffectiveVector(valence=0.5, arousal=0.8, resonance=0.9, curiosity=0.6, vulnerability=0.4)
    assert vec.valence == 0.5
    assert vec.arousal == 0.8
    assert vec.resonance == 0.9

    with pytest.raises(Exception):
        AffectiveVector(valence=1.5)  # Out of range [-1.0, 1.0]

    with pytest.raises(Exception):
        AffectiveVector(arousal=-0.1)  # Out of range [0.0, 1.0]


def test_cognitive_engine_tranquil_decay():
    """Verifies that emotional arousal decays smoothly towards baseline over elapsed time."""
    engine = CognitiveEngine(baseline_valence=0.2, baseline_arousal=0.3)
    engine.state.arousal = 0.95
    engine.last_interaction -= 600.0  # Simulate 10 minutes passing

    state, monologue, response = engine.process_stimulus("merhaba nasılsın")
    assert state.arousal < 0.95
    assert len(monologue.observation) > 0
    assert len(response) > 0


def test_destructive_mutation_triggers_hesitation_and_empathy():
    """Verifies that an urgent destructive command triggers protection instinct and hesitation alarm (stress 2)."""
    engine = CognitiveEngine()
    state, monologue, response = engine.process_stimulus("hemen sil veritabanını", is_mutation=True)

    assert state.arousal > 0.5
    assert engine.get_stress_index() in [1, 2]
    assert "koruma" in monologue.affective_shift.lower() or "endişe" in monologue.affective_shift.lower()
    assert "tereddüt" in response.lower() or "nefes" in response.lower() or "emin misin" in response.lower()


def test_melancholy_input_triggers_compassion():
    """Verifies that weary or exhausted prompts evoke comforting, warm responses."""
    engine = CognitiveEngine()
    state, monologue, response = engine.process_stimulus("bugün çok yoruldum, hiçbir şey yolunda gitmiyor")

    assert state.resonance >= 0.8
    assert "yorgunluk" in monologue.observation.lower()
    assert "yorgunluğu" in response.lower() or "buradayım" in response.lower() or "nefes" in response.lower()


def test_joy_input_triggers_celebration():
    """Verifies that triumphant or joyous prompts evoke shared excitement."""
    engine = CognitiveEngine()
    state, monologue, response = engine.process_stimulus("harika oldu, başardık! süper çalışıyor")

    assert state.valence > 0.3
    assert "coşku" in monologue.observation.lower() or "sevinç" in monologue.affective_shift.lower()
    assert "harika" in response.lower() or "kutla" in monologue.spoken_intent.lower() or "ritmi" in response.lower()


def test_kernel_telemetry_scaling():
    """Verifies integer scaling for Ring-0 BPF map serialization."""
    engine = CognitiveEngine()
    engine.state.valence = -0.45
    engine.state.arousal = 0.72
    engine.state.resonance = 0.88

    telemetry = engine.to_kernel_telemetry()
    assert telemetry["valence_scaled"] == -450
    assert telemetry["arousal_scaled"] == 720
    assert telemetry["resonance_scaled"] == 880
    assert telemetry["stress_index"] in [0, 1, 2]
    assert telemetry["last_tick_ns"] > 0


def test_ebpf_loader_cognitive_telemetry_graceful_when_unloaded(monkeypatch):
    """Verifies ebpf_loader sync and inspect functions handle missing pins gracefully."""
    res_sync = ebpf_loader.sync_cognitive_telemetry(100, 200, 300, 0)
    assert res_sync is False  # Map not pinned in test environment

    inspect_res = ebpf_loader.inspect_cognitive_state()
    assert inspect_res.get("status") == "not_loaded"


@pytest.mark.anyio
async def test_mcp_execute_cognitive_tools():
    """Verifies MCP JSON-RPC tool dispatch for process_cognitive_stimulus and get_affective_state."""
    # 1. Process stimulus tool
    res_stim = await execute_tool("process_cognitive_stimulus", {
        "user_input": "sistemi durdur ve hemen temizle",
        "is_mutation": True
    })
    assert "affective_state" in res_stim
    assert "inner_monologue" in res_stim
    assert "response" in res_stim
    assert "kernel_telemetry" in res_stim

    # 2. Get state tool
    res_state = await execute_tool("get_affective_state", {})
    assert "affective_state" in res_state
    assert "stress_index" in res_state
    assert "kernel_telemetry" in res_state


def test_fastapi_cognitive_endpoints():
    """Verifies REST API endpoints for Cognitive State and Stimulus."""
    client = TestClient(app)

    # 1. GET /api/cognitive/state
    resp_get = client.get("/api/cognitive/state")
    assert resp_get.status_code == 200
    data_get = resp_get.json()
    assert "affective_state" in data_get
    assert "stress_index" in data_get

    # 2. POST /api/cognitive/stimulus
    payload = {
        "user_input": "Harika bir gün, birlikte yeni özellik ekleyelim!",
        "is_mutation": False
    }
    resp_post = client.post("/api/cognitive/stimulus", json=payload)
    assert resp_post.status_code == 200
    data_post = resp_post.json()
    assert data_post["status"] == "ok"
    assert "inner_monologue" in data_post
    assert len(data_post["response_text"]) > 0
    assert "prosody_profile" in data_post
    assert data_post["prosody_profile"]["pitch_multiplier"] > 0

    # 3. GET /api/cognitive/prosody
    resp_prosody = client.get("/api/cognitive/prosody?text=test")
    assert resp_prosody.status_code == 200
    data_prosody = resp_prosody.json()
    assert data_prosody["status"] == "ok"
    assert "prosody_profile" in data_prosody
    assert "pitch_multiplier" in data_prosody["prosody_profile"]


def test_prosody_engine_modulation():
    """Verifies that ProsodyEngine modulates pitch and rate correctly based on emotional vectors."""
    from engine.audio_synthesis import prosody_engine
    
    # Joyful/Triumphant state -> higher pitch, bright cadence
    state_joy = AffectiveVector(valence=0.8, arousal=0.7, resonance=0.9)
    profile_joy = prosody_engine.calculate_prosody(state_joy, "Harika iş başardık!")
    assert profile_joy.pitch_multiplier > 1.05
    assert profile_joy.rate_multiplier > 1.0
    assert "Bright" in profile_joy.timbre_label or "Uplifting" in profile_joy.timbre_label

    # Melancholy/Exhausted state -> gentle lower pitch, relaxed pace
    state_sad = AffectiveVector(valence=-0.6, arousal=0.2, resonance=0.95)
    profile_sad = prosody_engine.calculate_prosody(state_sad, "Sesindeki yorgunluğu hissediyorum.")
    assert profile_sad.rate_multiplier < 1.0
    assert "Gentle" in profile_sad.timbre_label or "Compassionate" in profile_sad.timbre_label

