# Skill: eBPF Kernel & Daemon Engineering

## Engineering Standards

1. **eBPF Programs (`agent/src/*.bpf.c` & `ebpf/*.bpf.c`)**:
   - Utilize standard section macros accurately: `SEC("kprobe/...")`, `SEC("tracepoint/...")`, `SEC("sockops")`, or `SEC("xdp")`.
   - Adhere to bounded loop requirements (`#pragma unroll`) and the 512-byte stack limit. Allocate large event structures via BPF RingBuffers (`bpf_ringbuf_reserve`) or BPF Maps.
   - Use `bpf_probe_read_kernel()`, `bpf_probe_read_user()`, or CO-RE helpers (`BPF_CORE_READ`) for all pointer dereferences with NULL checks.

2. **Userspace Loader**:
   - Consume ring buffers with non-blocking, zero-copy polling for sub-microsecond latency.
   - Forward structured events in JSON / Protobuf format to the FastAPI ingestion endpoint (`http://127.0.0.1:8000/api/v1/telemetry` or local SSE bridge).
