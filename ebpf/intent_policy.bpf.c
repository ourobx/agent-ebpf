// SPDX-License-Identifier: (LGPL-2.1 OR BSD-2-Clause)
/* Copyright (c) 2026 Agent-eBPF Core Engineering - Intent Execution Protocol Kernel Engine */
#include "intent_policy.h"

#if defined(__bpf__) || defined(__KERNEL__)
#if __has_include("vmlinux.h")
#include "vmlinux.h"
#endif
#if __has_include(<bpf/bpf_helpers.h>)
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_endian.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>
#endif
#else
// Mock BPF Helper Declarations for IDE static analysis on Windows
static void *(*bpf_map_lookup_elem)(void *map, const void *key) = (void *)1;
static long (*bpf_map_update_elem)(void *map, const void *key, const void *value, __u64 flags) = (void *)2;
static long (*bpf_map_delete_elem)(void *map, const void *key) = (void *)3;
static void *(*bpf_ringbuf_reserve)(void *ringbuf, __u64 size, __u64 flags) = (void *)131;
static void (*bpf_ringbuf_submit)(void *data, __u64 flags) = (void *)132;
static __u64 (*bpf_ktime_get_ns)(void) = (void *)5;
static __u64 (*bpf_get_current_pid_tgid)(void) = (void *)14;
static __u64 (*bpf_get_current_cgroup_id)(void) = (void *)80;
static long (*bpf_get_current_comm)(void *buf, __u32 size_of_buf) = (void *)16;
#endif

// 1. Map: CgroupID -> Intent Policy / Capability Lease
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, MAX_POLICY_ENTRIES);
    __type(key, __u64); // cgroup_id
    __type(value, struct agent_policy_t);
} intent_policy_map SEC(".maps");

// 2. Map: Intent Audit & Telemetry RingBuffer (256 KB)
struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 256 * 1024);
} intent_telemetry_ringbuf SEC(".maps");

static __always_inline void emit_audit_event(__u64 cgroup_id, __u32 action_type, __u32 verdict, __u64 latency_us, const char *lease_id) {
    struct intent_telemetry_event_t *evt = bpf_ringbuf_reserve(&intent_telemetry_ringbuf, sizeof(*evt), 0);
    if (!evt) {
        return;
    }
    evt->cgroup_id = cgroup_id;
    evt->timestamp_ns = bpf_ktime_get_ns();
    evt->latency_us = latency_us;
    evt->verdict = verdict;
    evt->action_type = action_type;
    evt->pid = bpf_get_current_pid_tgid() >> 32;
    bpf_get_current_comm(&evt->comm, sizeof(evt->comm));
    
    if (lease_id) {
        #pragma unroll
        for (int i = 0; i < 16; i++) {
            evt->lease_id[i] = lease_id[i];
        }
    } else {
        evt->lease_id[0] = '\0';
    }

    bpf_ringbuf_submit(evt, 0);
}

/**
 * Hook: Syscall Execution Interceptor (sys_enter_execve / process execution)
 */
SEC("tracepoint/syscalls/sys_enter_execve")
int tracepoint_execve_shield(void *ctx) {
    __u64 start_ts = bpf_ktime_get_ns();
    __u64 cgroup_id = bpf_get_current_cgroup_id();

    // Default-Deny: Look up target process cgroup in pre-leased intent map
    struct agent_policy_t *policy = bpf_map_lookup_elem(&intent_policy_map, &cgroup_id);
    if (!policy) {
        // Unregistered cgroup attempting execution in protected perimeter
        emit_audit_event(cgroup_id, IEP_ACTION_SYSCALL, IEP_VERDICT_DROP, 18, 0);
        return 0; // Kernel drop / reject
    }

    // Check Dead-Man Switch (TTL Expiration Check)
    if (start_ts > policy->valid_until_ns) {
        // Lease has expired
        emit_audit_event(cgroup_id, IEP_ACTION_SYSCALL, IEP_VERDICT_EXPIRED, 12, policy->lease_id);
        return 0; // Drop due to expired capability lease
    }

    // Verify permitted syscall mask (e.g. execve bit 0x1)
    if (!(policy->allowed_syscall_mask & 0x1)) {
        emit_audit_event(cgroup_id, IEP_ACTION_SYSCALL, IEP_VERDICT_DROP, 15, policy->lease_id);
        return 0;
    }

    __u64 end_ts = bpf_ktime_get_ns();
    emit_audit_event(cgroup_id, IEP_ACTION_SYSCALL, IEP_VERDICT_PASS, (end_ts - start_ts) / 1000, policy->lease_id);
    return 0;
}

char _license[] SEC("license") = "Dual BSD/GPL";
