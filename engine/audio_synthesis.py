"""
Auditory Prosody & Voice Synthesis Modulation Engine.

Translates real-time Affective Cognitive Vectors (Valence, Arousal, Resonance)
into dynamic speech synthesis prosody parameters (pitch, rate, volume, cadence, pause duration).
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from engine.affective_engine import AffectiveVector


class ProsodyProfile(BaseModel):
    """
    Speech synthesis prosody directives for Web Speech API and neural TTS providers (ElevenLabs, Coqui, Edge-TTS).
    """
    pitch_multiplier: float = Field(1.0, ge=0.5, le=2.0, description="Voice pitch scale (lower for grounded/calm, higher for bright)")
    rate_multiplier: float = Field(1.0, ge=0.5, le=2.0, description="Speech rate cadence (slower for deep empathy, faster for excitement)")
    volume: float = Field(0.95, ge=0.1, le=1.0, description="Output volume gain")
    micro_pause_ms: int = Field(250, ge=50, le=1000, description="Pause duration between thought clauses in milliseconds")
    timbre_label: str = Field("Warm & Grounded", description="Human-perceivable acoustic coloration")
    ssml_markup: Optional[str] = None


class ProsodyEngine:
    """
    Synthesizes acoustic prosody curves from Affective Cognitive Vectors.
    """

    @staticmethod
    def calculate_prosody(state: AffectiveVector, response_text: str = "") -> ProsodyProfile:
        """
        Derives human-like acoustic prosody from emotional state.
        """
        # Baseline: neutral calm
        # Valence [-1.0, 1.0]: negative lowers pitch slightly and adds warmth; positive lifts pitch
        pitch = 1.0 + (state.valence * 0.15)

        # Arousal [0.0, 1.0]: higher arousal accelerates cadence slightly
        rate = 0.90 + (state.arousal * 0.30)

        # High resonance adds soothing, unhurried pauses
        pause_ms = int(200 + (state.resonance * 250) + (max(0.0, 0.5 - state.arousal) * 200))

        # Timbre identification
        if state.arousal > 0.6 and state.valence < -0.2:
            timbre = "Alert & Protective (Tereddüt & Koruma)"
            pitch = max(0.9, pitch)
            rate = 1.05
            pause_ms = 400
        elif state.valence < -0.1 and state.resonance > 0.7:
            timbre = "Gentle & Compassionate (Şefkatli & Dinlendirici)"
            pitch = 0.92
            rate = 0.88
            pause_ms = 450
        elif state.valence > 0.4:
            timbre = "Bright & Uplifting (Coşkulu & Neşeli)"
            pitch = 1.12
            rate = 1.10
            pause_ms = 220
        else:
            timbre = "Warm & Grounded (Dingin & Samimi)"
            pitch = 1.0
            rate = 0.95
            pause_ms = 280

        # Construct SSML representation
        pitch_pct = f"{int((pitch - 1.0) * 100):+d}%"
        rate_pct = f"{int((rate - 1.0) * 100):+d}%"
        ssml = (
            f'<speak><prosody pitch="{pitch_pct}" rate="{rate_pct}">'
            f'{response_text}'
            f'</prosody></speak>'
        ) if response_text else None

        return ProsodyProfile(
            pitch_multiplier=round(pitch, 2),
            rate_multiplier=round(rate, 2),
            volume=0.95,
            micro_pause_ms=pause_ms,
            timbre_label=timbre,
            ssml_markup=ssml
        )


prosody_engine = ProsodyEngine()
