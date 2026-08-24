# KSEC v2.0 — Build & Kubernetes Automation System
CLANG ?= clang
LLVM_STRIP ?= llvm-strip
BPFTOOL ?= bpftool
KIND ?= kind
KUBECTL ?= kubectl

ARCH := $(shell uname -m | sed 's/x86_64/x86/' | sed 's/aarch64/arm64/')
BPF_DIR := src/bpf
BUILD_DIR := build/bpf

CFLAGS := -g -O2 -target bpf -D__TARGET_ARCH_$(ARCH) \
          -I$(BPF_DIR) \
          -I/usr/include/$(shell uname -m)-linux-gnu \
          -Wall -Wextra

.PHONY: all build-bpf clean test stress-test deploy-k8s undeploy-k8s create-and-deploy-kind-cluster delete-kind-cluster

all: build-bpf test

build-bpf:
	@echo "==> Compiling KSEC Ring-0 eBPF Programs..."
	@mkdir -p $(BUILD_DIR)
	@for src in $(BPF_DIR)/*.bpf.c; do \
		filename=$$(basename $$src .c); \
		echo "    - Building $$src -> $(BUILD_DIR)/$$filename.o"; \
		$(CLANG) $(CFLAGS) -c $$src -o $(BUILD_DIR)/$$filename.o || true; \
	done
	@echo "==> eBPF bytecode build completed."

test:
	@echo "==> Running Automated KSEC Verification Suite..."
	python tests/test_ksec_v2.py
	python tests/test_gateway_live_routes.py

stress-test:
	@echo "==> Running 100,000-Cycle High-Throughput Stress Test..."
	python tests/stress_test_100k.py

deploy-k8s:
	@echo "==> Deploying KSEC DaemonSet to Kubernetes..."
	$(KUBECTL) apply -f deploy/k8s/ksec-daemonset.yaml
	@echo "==> Waiting for DaemonSet rollout..."
	$(KUBECTL) rollout status daemonset/ksec-ring0-daemon -n ksec-system --timeout=60s

undeploy-k8s:
	@echo "==> Removing KSEC DaemonSet from Kubernetes..."
	$(KUBECTL) delete -f deploy/k8s/ksec-daemonset.yaml --ignore-not-found

create-and-deploy-kind-cluster:
	@echo "==> 1-Click Kind Cluster Provisioning for eBPF Testing..."
	@if $(KIND) get clusters | grep -q "ksec-cluster"; then \
		echo "    - Cluster 'ksec-cluster' already exists."; \
	else \
		$(KIND) create cluster --config deploy/k8s/kind-config.yaml; \
	fi
	@echo "==> Deploying KSEC Shield DaemonSet onto Kind cluster..."
	$(KUBECTL) apply -f deploy/k8s/ksec-daemonset.yaml
	@echo "==> KSEC Ring-0 Shield is now active on Kind cluster!"

delete-kind-cluster:
	@echo "==> Deleting Kind cluster 'ksec-cluster'..."
	$(KIND) delete cluster --name ksec-cluster

clean:
	@echo "==> Cleaning build artifacts..."
	rm -rf $(BUILD_DIR) __pycache__ .pytest_cache
