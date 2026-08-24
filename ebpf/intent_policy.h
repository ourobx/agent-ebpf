// SPDX-License-Identifier: (LGPL-2.1 OR BSD-2-Clause)
/* Copyright (c) 2026 Agent-eBPF Core Engineering - Intent Execution Protocol */
#ifndef __INTENT_POLICY_H
#define __INTENT_POLICY_H

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
#endif

#include <stdint.h>
typedef int32_t   __s32;
typedef uint32_t  __u32;
typedef uint16_t  __u16;
typedef uint8_t   __u8;
typedef uint64_t  __u64;

#ifndef SEC
#define SEC(NAME)
#endif
#ifndef __always_inline
#define __always_inline inline
#endif
#ifndef __uint
#define __uint(name, val) int (*name)[val]
#endif
#ifndef __type
#define __type(name, val) typeof(val) *name
#endif

#ifndef BPF_MAP_TYPE_HASH
#define BPF_MAP_TYPE_HASH 1
#endif
#ifndef BPF_MAP_TYPE_RINGBUF
#define BPF_MAP_TYPE_RINGBUF 27
#endif
#ifndef BPF_MAP_TYPE_LRU_HASH
#define BPF_MAP_TYPE_LRU_HASH 9
#endif

#define MAX_POLICY_ENTRIES 10240

// Action Types matching Proto3
#define IEP_ACTION_UNSPECIFIED 0
#define IEP_ACTION_SYSCALL 1
#define IEP_ACTION_NETWORK_EGRESS 2
#define IEP_ACTION_DB_QUERY 3

// Enforcement Modes
#define IEP_ENFORCE_LOG_ONLY 0
#define IEP_ENFORCE_STRICT_BLOCK 1
#define IEP_ENFORCE_KILL_PROCESS 2

// Verdicts
#define IEP_VERDICT_PASS 0
#define IEP_VERDICT_DROP 1
#define IEP_VERDICT_KILL 2
#define IEP_VERDICT_EXPIRED 3

/**
 * struct agent_policy_t - Hardware-Enforced Intent Capability Lease
 * @allowed_syscall_mask: Bitmask of permitted system calls
 * @valid_until_ns: Monotonic timestamp deadline (bpf_ktime_get_ns() + TTL)
 * @query_fingerprint: Normalized SQL AST hash fingerprint
 * @allowed_ip: Permitted IPv4 destination (Network Byte Order)
 * @allowed_port: Permitted TCP/UDP port (Host Byte Order)
 * @enforcement_mode: STRICT_BLOCK (1) or KILL_PROCESS (2)
 * @action_type: Type of constrained action (SYSCALL, NETWORK, DB)
 * @lease_id: 16-byte cryptographic UUID / nonce
 */
struct agent_policy_t {
    __u64 allowed_syscall_mask;
    __u64 valid_until_ns;
    __u64 query_fingerprint;
    __u32 allowed_ip;
    __u16 allowed_port;
    __u8  enforcement_mode;
    __u8  action_type;
    char  lease_id[16];
};

/**
 * struct intent_telemetry_event_t - Zero-Copy RingBuffer Audit Event
 */
struct intent_telemetry_event_t {
    __u64 cgroup_id;
    __u64 timestamp_ns;
    __u64 latency_us;
    __u32 verdict;
    __u32 action_type;
    __u32 pid;
    char  comm[16];
    char  lease_id[16];
};

#endif /* __INTENT_POLICY_H */
