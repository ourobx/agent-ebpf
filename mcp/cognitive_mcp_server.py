import json
import asyncio
import logging
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from engine.affective_engine import CognitiveEngine
from engine.kernel_sync import KernelEmpathyBridge

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cognitive_mcp_server")

app = FastAPI(
    title="ksec Cognitive Mind & eBPF Bridge",
    version="1.0.0",
    description="Real-time Cognitive Affective Engine, Ring-0 eBPF Sync & SSE Stream"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = CognitiveEngine()
kernel_bridge = KernelEmpathyBridge()

class StimulusRequest(BaseModel):
    user_input: str = Field(..., description="Conversational prompt or command stimulus")
    is_mutation: bool = Field(False, description="Flag indicating if the action involves destructive mutation")

@app.post("/api/v1/cognitive/stimulus")
async def handle_stimulus(req: StimulusRequest):
    """
    Processes stimulus, updates Affective Vector & Inner Monologue,
    synchronizes Ring-0 BPF map, and returns single cognitive payload.
    """
    state, monologue, response = engine.process_stimulus(
        user_input=req.user_input,
        is_mutation=req.is_mutation
    )

    # Ring-0 Kernel Map Synchronization (< 0.01ms)
    telemetry_payload = kernel_bridge.sync_state(state)

    return {
        "status": "ok",
        "affective_state": state.model_dump(),
        "inner_monologue": monologue.model_dump(),
        "response_text": response,
        "stress_index": engine.get_stress_index(),
        "kernel_telemetry": {
            "valence_scaled": telemetry_payload.valence_scaled,
            "arousal_scaled": telemetry_payload.arousal_scaled,
            "resonance_scaled": telemetry_payload.resonance_scaled,
            "stress_index": telemetry_payload.stress_index,
            "last_tick_ns": telemetry_payload.last_tick_ns,
        }
    }

@app.get("/api/v1/cognitive/stream")
async def stream_mind(request: Request, user_input: str = "", is_mutation: bool = False):
    """
    Streams stream-of-consciousness inner monologue, affective pulses,
    and real-time token stream over Server-Sent Events (SSE).
    """
    async def event_generator():
        input_text = user_input.strip() or "merhaba"
        
        # 1. Cognitive Assessment & Ring-0 Sync
        state, monologue, response_text = engine.process_stimulus(
            user_input=input_text,
            is_mutation=is_mutation
        )
        kernel_bridge.sync_state(state)

        # 2. SSE: Cognitive Pulse (State Vector & Inner Monologue)
        pulse_data = {
            "affective_state": state.model_dump(),
            "inner_monologue": monologue.model_dump(),
            "stress_index": engine.get_stress_index(),
        }
        yield f"event: cognitive_pulse\ndata: {json.dumps(pulse_data, ensure_ascii=False)}\n\n"
        await asyncio.sleep(0.05)

        # 3. SSE: Token Stream Start
        yield f"event: token_stream_start\ndata: {json.dumps({'intent': monologue.spoken_intent}, ensure_ascii=False)}\n\n"

        # 4. SSE: Token Streaming
        words = response_text.split(" ")
        for word in words:
            if await request.is_disconnected():
                break
            yield f"event: token\ndata: {json.dumps({'chunk': word + ' '}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.04)

        yield "event: done\ndata: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
