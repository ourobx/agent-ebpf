# Agent-eBPF Daemon (`agent-ebpf-daemon`)

The **Agent-eBPF Daemon** is a low-overhead, containerized Linux kernel sentinel service providing Ring-0 interception and deterministic policy enforcement for local and containerized AI workloads.

## Key Features

- **XDP & BPF LSM Hooks**: Intercepts network packets and system calls in sub-microsecond latency.
- **UNIX Domain Socket API**: Exposes `/var/run/ksec/agent-ebpf.sock` for high-throughput IPC between the host daemon and AI agent runtimes.
- **Zero-Trust Capabilities**: Requires only strictly scoped Linux capabilities (`CAP_BPF`, `CAP_NET_ADMIN`, `CAP_PERFMON`, `CAP_SYS_RESOURCE`) with zero `privileged: true`.

## Container Build & Run

### Build Image
```bash
docker build -t ourobx/agent-ebpf-daemon:latest -f packages/agent-ebpf-daemon/Dockerfile .
```

### Run Daemon Container
```bash
docker run -d \
  --name agent-ebpf-daemon \
  --cap-add=BPF \
  --cap-add=NET_ADMIN \
  --cap-add=PERFMON \
  --cap-add=SYS_RESOURCE \
  --volume /sys/fs/bpf:/sys/fs/bpf:shared \
  --volume /var/run/ksec:/var/run/ksec \
  ourobx/agent-ebpf-daemon:latest
```
