<<<<<<< HEAD
# Makefile for building eBPF object files

EBPF_C=ebpf/shield.bpf.c
EBPF_O=ebpf/shield.bpf.o
CLANG=clang
TARGET_FLAGS=-g -O2 -target bpf -D__TARGET_ARCH_x86

.PHONY: all build clean

all: build

build: $(EBPF_O)
	@echo "Built $(EBPF_O)"

$(EBPF_O): $(EBPF_C)
	@echo "Compiling $(EBPF_C) -> $(EBPF_O)"
	$(CLANG) $(TARGET_FLAGS) -c $< -o $@

clean:
	rm -f $(EBPF_O)
	@echo "cleaned"
=======
# Agent-eBPF Build System (CO-RE Enabled)
CLANG ?= clang
LLVM_STRIP ?= llvm-strip
BPFTOOL ?= bpftool

ARCH := $(shell uname -m | sed 's/x86_64/x86/' | sed 's/aarch64/arm64/')
BPF_DIR := ebpf
SRC_C := $(BPF_DIR)/shield.bpf.c
OBJ_O := $(BPF_DIR)/shield.bpf.o
VMLINUX_H := $(BPF_DIR)/vmlinux.h

CFLAGS := -g -O2 -target bpf -D__TARGET_ARCH_$(ARCH) \
          -mcpu=v3 \
          -I$(BPF_DIR) \
          -I/usr/include/$(shell uname -m)-linux-gnu \
          -Wall -Wextra -Werror

.PHONY: all generate-vmlinux build clean load unload status

all: build

generate-vmlinux:
	@echo "==> Vmlinux BTF başlık dosyası çıkartılıyor..."
	@if [ ! -f /sys/kernel/btf/vmlinux ]; then \
		echo "HATA: /sys/kernel/btf/vmlinux bulunamadı. Kernel BTF desteklemiyor!"; \
		exit 1; \
	fi
	$(BPFTOOL) btf dump file /sys/kernel/btf/vmlinux format c > $(VMLINUX_H)
	@echo "==> $(VMLINUX_H) başarıyla oluşturuldu."

build: generate-vmlinux
	@echo "==> eBPF Bytecode derleniyor: $(SRC_C) -> $(OBJ_O)"
	$(CLANG) $(CFLAGS) -c $(SRC_C) -o $(OBJ_O)
	$(LLVM_STRIP) -g $(OBJ_O)
	@echo "==> Derleme tamamlandı: $(OBJ_O)"

clean:
	@echo "==> Artefact'lar temizleniyor..."
	rm -f $(OBJ_O) $(VMLINUX_H)

load: build
	@echo "==> eBPF Programı yükleniyor..."
	python3 -m tools.ebpf_loader load --obj $(OBJ_O)

unload:
	@echo "==> eBPF Programı kaldırılıyor..."
	python3 -m tools.ebpf_loader unload

status:
	@python3 -m tools.ebpf_loader status
>>>>>>> a13feab (feat: add 1-click launch scripts, web dashboard UI, LRU eBPF maps and Coolify deployment setup)
