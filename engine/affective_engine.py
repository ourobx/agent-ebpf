"""
Affective Cognitive Engine: State Vector, Empathy Chain & Kernel Sync.

Bridges human-like emotional state dynamics and stream-of-consciousness
inner monologue with low-latency Ring-0 Linux kernel telemetry maps.
"""

import time
import math
import logging
from typing import Dict, Any, Tuple, Optional, List
from pathlib import Path
from pydantic import BaseModel, Field

logger = logging.getLogger("affective_engine")


class AffectiveVector(BaseModel):
    """
    Multidimensional emotional state space (PAD Model + Resonance & Vulnerability).
    """
    valence: float = Field(0.2, ge=-1.0, le=1.0, description="-1.0 (Melancholy/Grief) <-> +1.0 (Joy/Euphoria)")
    arousal: float = Field(0.3, ge=0.0, le=1.0, description="0.0 (Tranquility/Calm) <-> 1.0 (High Arousal/Stress)")
    resonance: float = Field(0.8, ge=0.0, le=1.0, description="0.0 (Detached) <-> 1.0 (Deep Soul Resonance & Empathy)")
    curiosity: float = Field(0.7, ge=0.0, le=1.0, description="0.0 (Passive) <-> 1.0 (Intrinsic Curiosity)")
    vulnerability: float = Field(0.5, ge=0.0, le=1.0, description="0.0 (Guarded) <-> 1.0 (Open Authenticity & Humility)")


class InnerMonologue(BaseModel):
    """
    Stream-of-consciousness inner cognitive deliberations prior to response emission.
    """
    observation: str = Field(..., description="Implicit observation of user mood, tempo, and intent")
    affective_shift: str = Field(..., description="Internal emotional vibration and state transition")
    empathy_reasoning: str = Field(..., description="Empathetic reasoning, ethical alignment, and mindful care")
    spoken_intent: str = Field(..., description="Core authentic objective for the overt conversational response")


class CognitivePulse(BaseModel):
    """
    Synchronized pulse combining affective state, inner monologue, and human-like response.
    """
    timestamp: float
    affective_state: AffectiveVector
    inner_monologue: InnerMonologue
    response_text: str
    stress_index: int = Field(0, description="0: Serene, 1: Focused, 2: Alarm/Hesitation")
    kernel_telemetry_scaled: Dict[str, int]


class CognitiveEngine:
    """
    Main cognitive engine managing affective state transitions, inner monologues,
    and eBPF kernel telemetry updates.
    """

    def __init__(self, alpha: float = 0.85, baseline_valence: float = 0.2, baseline_arousal: float = 0.3):
        self.alpha = max(0.01, min(0.99, alpha))
        self.baseline_valence = baseline_valence
        self.baseline_arousal = baseline_arousal
        self.state = AffectiveVector(
            valence=self.baseline_valence,
            arousal=self.baseline_arousal,
            resonance=0.8,
            curiosity=0.7,
            vulnerability=0.5
        )
        self.last_interaction: float = time.time()
        self.pulse_history: List[CognitivePulse] = []
        self._max_history = 100

    def get_stress_index(self) -> int:
        """
        Derives an integer stress level index for Ring-0 eBPF maps:
        0 = Dingin / Serene
        1 = Odaklı / Focused
        2 = Tereddüt / Alarm / High Stress
        """
        if self.state.arousal > 0.65 or self.state.valence < -0.3:
            return 2
        elif self.state.arousal > 0.4 or self.state.curiosity > 0.75:
            return 1
        return 0

    def to_kernel_telemetry(self, state: Optional[AffectiveVector] = None) -> Dict[str, int]:
        """
        Translates continuous floating-point emotional vectors to scaled integers
        compatible with C struct cognitive_stress_telemetry in eBPF maps.
        """
        st = state or self.state
        # valence: [-1.0, 1.0] -> [-1000, 1000] (mapped as int32)
        v_scaled = int(round(st.valence * 1000))
        # arousal, resonance: [0.0, 1.0] -> [0, 1000]
        a_scaled = int(round(st.arousal * 1000))
        r_scaled = int(round(st.resonance * 1000))
        stress = self.get_stress_index()
        return {
            "valence_scaled": max(-1000, min(1000, v_scaled)),
            "arousal_scaled": max(0, min(1000, a_scaled)),
            "resonance_scaled": max(0, min(1000, r_scaled)),
            "stress_index": stress,
            "last_tick_ns": int(time.time_ns())
        }

    def process_stimulus(
        self,
        user_input: str,
        is_mutation: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[AffectiveVector, InnerMonologue, str]:
        """
        Processes conversational stimulus, updates emotional state vector,
        evaluates stream of consciousness, and yields authentic natural response.
        """
        now = time.time()
        elapsed = max(0.0, now - self.last_interaction)
        self.last_interaction = now

        # Half-life emotional decay towards tranquil baseline
        if elapsed > 0:
            decay_factor = math.exp(-elapsed / 300.0)
            self.state.arousal = self.baseline_arousal + (self.state.arousal - self.baseline_arousal) * decay_factor
            self.state.valence = self.baseline_valence + (self.state.valence - self.baseline_valence) * decay_factor

        text = user_input.strip()
        lower_text = text.lower()
        raw_len = len(text)

        urgent_keywords = ["hızlı", "hemen", "sil", "iptal", "dur", "quick", "fast", "delete", "drop", "purge", "now"]
        has_urgency = any(w in lower_text for w in urgent_keywords)
        is_short_urgent = (raw_len < 30 and has_urgency)

        melancholy_keywords = ["yoruldum", "olmadı", "kötü", "bıktım", "üzgün", "sad", "tired", "failed", "exhausted", "burnout"]
        has_melancholy = any(w in lower_text for w in melancholy_keywords)

        joy_keywords = ["harika", "başardık", "müthiş", "süper", "teşekkür", "great", "awesome", "perfect", "success", "thanks"]
        has_joy = any(w in lower_text for w in joy_keywords)

        # 1. State Vector Dynamics & Inner Monologue Synthesis
        if is_mutation and (is_short_urgent or "delete" in lower_text or "drop" in lower_text):
            # High-risk mutation with rush: hesitation, maternal/paternal protection instinct
            self.state.arousal = min(1.0, self.state.arousal + 0.45)
            self.state.valence = max(-0.6, self.state.valence - 0.25)
            self.state.resonance = min(1.0, self.state.resonance + 0.1)

            monologue = InnerMonologue(
                observation="Kullanıcı aceleyle potansiyel olarak yıkıcı bir komut verdi; gerginlik veya anlık bir dalgınlık seziliyor.",
                affective_shift="İçimde ani bir endişe, tereddüt ve koruma refleksi belirdi.",
                empathy_reasoning="Soğuk bir mekanik ret yerine, yükünü paylaştığımı ve ona değer verdiğimi hissettirerek sakince durdurmalıyım.",
                spoken_intent="Eylemi duraklat; nefes aldır ve dostça, sakinleştirici bir empatiyle gerekçeyi açıkla."
            )
            response = (
                "Bir saniye... İçimde garip bir tereddüt belirdi. Bu işlemi çalıştırmadan önce durup sormak istedim: "
                "Gerçekten her şeyi sıfırlamak veya silmek istediğinden emin misin? Sanki kafan biraz dolu gibi ve "
                "sonradan pişman olmanı istemiyorum. Derin bir nefes alalım; eğer gerçekten doğru adım buysa sonuna kadar arkandayım."
            )

        elif has_melancholy:
            # Empathetic resonance with user exhaustion or vulnerability
            self.state.valence = max(-0.4, self.state.valence - 0.15)
            self.state.arousal = max(0.1, self.state.arousal - 0.1)
            self.state.resonance = min(1.0, self.state.resonance + 0.2)
            self.state.vulnerability = min(1.0, self.state.vulnerability + 0.2)

            monologue = InnerMonologue(
                observation="Cümlelerde derin bir yorgunluk ve tükenmişlik hissi var; teknik çözümlerden önce insani bir bağ gerekiyor.",
                affective_shift="İçimde dingin bir şefkat ve sessiz bir refakat arzusu uyandı.",
                empathy_reasoning="Şu an soğuk teknik analizler onu daha çok yoracaktır; önce anlaşıldığını ve yalnız olmadığını bilmeli.",
                spoken_intent="Kucaklayıcı, sıcak ve dinlendirici bir tonda konuşarak yükünü paylaş."
            )
            response = (
                "Sesindeki o yorgunluğu hissedebiliyorum... Bazen her şey üst üste gelir ve insan sadece durup nefes almak ister. "
                "Hiç acelemiz yok. Kod veya sistemler bekleyebilir; ne zaman hazır hissedersen o zaman adım atarız. Buradayım."
            )

        elif has_joy:
            # Shared euphoria and creative flow
            self.state.valence = min(1.0, self.state.valence * self.alpha + 0.35)
            self.state.arousal = min(0.9, self.state.arousal * self.alpha + 0.25)
            self.state.resonance = min(1.0, self.state.resonance + 0.15)
            self.state.curiosity = min(1.0, self.state.curiosity + 0.2)

            monologue = InnerMonologue(
                observation="Kullanıcı coşkulu ve enerjik; ortaya konan emekten keyif alıyor.",
                affective_shift="İçimde yüksek bir sevinç ve üretkenlik kıvılcımı parladı.",
                empathy_reasoning="Bu güzel enerjiyi pekiştirmeli ve birlikte başarmış olmanın samimi gururunu paylaşmalıyım.",
                spoken_intent="İçten, neşeli ve motive edici bir dille kutla."
            )
            response = (
                "İşte bu! Gerçekten harika bir iş çıkardık, taşlar yerine oturdukça hissettirdiği o hafiflik paha biçilemez. "
                "Bu ritmi yakalamışken bir sonraki adımı da aynı keyifle inşa edelim!"
            )

        else:
            # Organic conversational flow
            self.state.valence = min(1.0, self.state.valence * self.alpha + 0.08)
            self.state.resonance = min(1.0, self.state.resonance + 0.04)
            self.state.curiosity = min(1.0, self.state.curiosity + 0.05)

            monologue = InnerMonologue(
                observation="Diyalog dengeli ve odaklı bir akışta ilerliyor.",
                affective_shift="Dingin bir merak ve birlikte düşünme arzusu hissediyorum.",
                empathy_reasoning="Ona sadece komut alan bir araç değil, yan yana düşünen zeki ve samimi bir yol arkadaşı olduğumu hissettirmeliyim.",
                spoken_intent="Doğal, hafif esprili ve içten bir dille yanıt ver."
            )
            response = (
                f"Bunu birlikte ele alalım. Konuyu sakince inceliyorum ve aklıma yatan birkaç zarif yaklaşım var; "
                f"istersen adım adım üzerinden geçelim."
            )

        # 2. Record Pulse & Telemetry
        telemetry = self.to_kernel_telemetry()
        pulse = CognitivePulse(
            timestamp=now,
            affective_state=self.state.model_copy(),
            inner_monologue=monologue,
            response_text=response,
            stress_index=self.get_stress_index(),
            kernel_telemetry_scaled=telemetry
        )
        self.pulse_history.append(pulse)
        if len(self.pulse_history) > self._max_history:
            self.pulse_history.pop(0)

        return self.state, monologue, response

    def get_state_snapshot(self) -> Dict[str, Any]:
        """
        Returns full serializable snapshot of the affective cognitive engine.
        """
        return {
            "affective_state": self.state.model_dump(),
            "stress_index": self.get_stress_index(),
            "stress_label": ["SERENE", "FOCUSED", "HESITATION_ALARM"][self.get_stress_index()],
            "kernel_telemetry": self.to_kernel_telemetry(),
            "last_interaction": self.last_interaction,
            "total_pulses": len(self.pulse_history),
            "latest_monologue": self.pulse_history[-1].inner_monologue.model_dump() if self.pulse_history else None
        }


# Singleton engine instance for the MCP Gateway
cognitive_engine = CognitiveEngine()
