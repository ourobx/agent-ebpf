FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# eBPF CO-RE derleme ve runtime bağımlılıkları (Linux 6.8+ eBPF LSM & bpftool)
RUN apt-get update && apt-get install -y --no-install-recommends \
    clang \
    llvm \
    libbpf-dev \
    linux-headers-generic \
    linux-tools-common \
    linux-tools-generic \
    iproute2 \
    make \
    gcc \
    curl \
    python3 \
    python3-dev \
    python3-pip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python paketlerinin yüklenmesi
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip --break-system-packages && \
    pip install --no-cache-dir -r requirements.txt --break-system-packages

# Proje dosyalarının kopyalanması
COPY . .

RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
