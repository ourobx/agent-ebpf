"""
Affective Cognitive Engine Package for Agent-eBPF.
Provides affective state modeling, stream-of-consciousness monologue generation,
and kernel-level telemetry synchronization.
"""

from engine.affective_engine import (
    AffectiveVector,
    InnerMonologue,
    CognitivePulse,
    CognitiveEngine,
    cognitive_engine
)
from engine.audio_synthesis import (
    ProsodyProfile,
    ProsodyEngine,
    prosody_engine
)

__all__ = [
    "AffectiveVector",
    "InnerMonologue",
    "CognitivePulse",
    "CognitiveEngine",
    "cognitive_engine",
    "ProsodyProfile",
    "ProsodyEngine",
    "prosody_engine"
]
