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