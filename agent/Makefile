CLANG ?= clang
LLVM_STRIP ?= llvm-strip
BPFTOOL ?= bpftool

SRC_DIR := src
INC_DIR := include
BUILD_DIR := build

TARGET := $(BUILD_DIR)/telemetry.bpf.o
SOURCE := $(SRC_DIR)/telemetry.bpf.c
VMLINUX := $(INC_DIR)/vmlinux.h

# Architecture detection
ARCH := $(shell uname -m | sed 's/x86_64/x86/' | sed 's/aarch64/arm64/' | sed 's/ppc64le/powerpc/' | sed 's/mips.*/mips/')

# Compiler & CO-RE Flags
CLANG_FLAGS := -g -O2 \
               -target bpf \
               -D__TARGET_ARCH_$(ARCH) \
               -I$(INC_DIR) \
               -I/usr/include/$(shell uname -m)-linux-gnu \
               -Wall \
               -Werror \
               -c

.PHONY: all clean vmlinux verify

all: $(TARGET)

# 1. Generate or verify vmlinux.h from kernel BTF
$(VMLINUX):
	@mkdir -p $(INC_DIR)
	@if [ -f /sys/kernel/btf/vmlinux ]; then \
		echo "==> Dumping vmlinux.h from /sys/kernel/btf/vmlinux..."; \
		$(BPFTOOL) btf dump file /sys/kernel/btf/vmlinux format c > $(VMLINUX); \
	else \
		echo "==> Using repository vmlinux.h header."; \
	fi

vmlinux: $(VMLINUX)

# 2. Compile eBPF C program to BPF bytecode object (.o)
$(TARGET): $(SOURCE) $(VMLINUX)
	@mkdir -p $(BUILD_DIR)
	@echo "==> Compiling $(SOURCE) to BPF bytecode..."
	$(CLANG) $(CLANG_FLAGS) $(SOURCE) -o $@
	@echo "==> Stripping debug symbols..."
	$(LLVM_STRIP) -g $@ || true
	@echo "[OK] eBPF build succeeded: $@"

# 3. Verify eBPF Bytecode with bpftool
verify: $(TARGET)
	@echo "==> Verifying $(TARGET) with bpftool..."
	$(BPFTOOL) prog dump xlated file $(TARGET)

clean:
	@rm -rf $(BUILD_DIR)
	@echo "[OK] Cleaned build artifacts."
