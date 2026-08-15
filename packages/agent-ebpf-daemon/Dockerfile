FROM ubuntu:24.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    clang \
    llvm \
    libbpf-dev \
    linux-headers-generic \
    pkg-config \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
RUN make build

FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    libbpf1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/ksec
COPY --from=builder /app/bin/agent-ebpf-daemon /opt/ksec/agent-ebpf-daemon

# Socket directory and permissions
RUN mkdir -p /var/run/ksec && chmod 755 /var/run/ksec

ENTRYPOINT ["/opt/ksec/agent-ebpf-daemon"]
CMD ["--socket-path", "/var/run/ksec/agent-ebpf.sock"]
