# ---------------------------------------------------------
# Stage 1: eBPF Builder & Python Dependencies Compiler
# ---------------------------------------------------------
FROM ubuntu:24.04 AS builder

WORKDIR /build

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC

# Install build tools, compiler toolchain, libbpf, and python dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    clang \
    llvm \
    libbpf-dev \
    linux-headers-generic \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment and install backend requirements
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy complete project source code
COPY . /build/

# Compile eBPF C program to BPF bytecode object (.o)
WORKDIR /build/agent
RUN make all

# ---------------------------------------------------------
# Stage 2: Production Runner (Non-root, Minimal Security Image)
# ---------------------------------------------------------
FROM python:3.12-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8000

# Install runtime dependencies for libbpf
RUN apt-get update && apt-get install -y --no-install-recommends \
    libbpf1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root user and group
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/sh appuser

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy compiled eBPF bytecode object and backend source
COPY --from=builder /build/agent/build/telemetry.bpf.o /app/agent/build/telemetry.bpf.o
COPY --chown=appuser:appgroup backend/ /app/backend/
COPY --chown=appuser:appgroup src/ /app/src/
COPY --chown=appuser:appgroup docs/ /app/docs/
COPY --chown=appuser:appgroup landing.html index.html styles.css app.js robots.txt sitemap.xml policy.yaml /app/
COPY --chown=appuser:appgroup mcp_server.py run.py requirements.txt /app/

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz').read()" || exit 1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips=*"]
