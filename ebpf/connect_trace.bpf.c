// SPDX-License-Identifier: (LGPL-2.1 OR BSD-2-Clause)
/* Copyright (c) 2026 Agent-eBPF Core Engineering */
#include "connect_trace.h"

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
// Mock BPF Helper Declarations for IDE static analysis
static void *(*bpf_map_lookup_elem)(void *map, const void *key) = (void *)1;
static void *(*bpf_ringbuf_reserve)(void *ringbuf, __u64 size, __u64 flags) = (void *)131;
static void (*bpf_ringbuf_submit)(void *data, __u64 flags) = (void *)132;
static __u64 (*bpf_ktime_get_ns)(void) = (void *)5;
static __u64 (*bpf_get_current_pid_tgid)(void) = (void *)14;
static long (*bpf_get_current_comm)(void *buf, __u32 size_of_buf) = (void *)16;
static long (*bpf_probe_read_user)(void *dst, __u32 size, const void *unsafe_ptr) = (void *)112;
static inline __u32 bpf_ntohl(__u32 val) { return ((val >> 24) & 0xff) | ((val << 8) & 0xff0000) | ((val >> 8) & 0xff00) | ((val << 24) & 0xff000000); }
static inline __u16 bpf_ntohs(__u16 val) { return (val >> 8) | (val << 8); }
#endif

// 1. Map: Live Outbound Socket Connect RingBuffer (512 KB)
struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 512 * 1024);
} connect_events_ringbuf SEC(".maps");

// 2. Map: Outbound Connect Statistics Counters
struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __uint(max_entries, 4);
    __type(key, __u32);   // 0=Total Connects, 1=DB Connects, 2=HTTP/S Connects, 3=Other
    __type(value, __u64);
} connect_stats_map SEC(".maps");

static __always_inline void increment_connect_stat(__u32 index) {
    __u64 *val = bpf_map_lookup_elem(&connect_stats_map, &index);
    if (val) {
        __sync_fetch_and_add(val, 1);
    }
}

static __always_inline int is_database_port(__u16 port) {
    return (port == PORT_POSTGRESQL || port == PORT_MYSQL ||
            port == PORT_REDIS || port == PORT_MONGODB);
}

// Tracepoint: syscalls/sys_enter_connect
struct trace_event_raw_sys_enter_connect_t {
    __u64 unused;
    long syscall_nr;
    long fd;
    const struct sockaddr *uservaddr;
    long addrlen;
};

SEC("tracepoint/syscalls/sys_enter_connect")
int tracepoint_sys_enter_connect(struct trace_event_raw_sys_enter_connect_t *ctx) {
    if (!ctx->uservaddr || ctx->addrlen < 8) {
        return 0;
    }

    // Read IPv4 sockaddr from user memory safely
    struct sockaddr_in sin = {};
    if (bpf_probe_read_user(&sin, sizeof(sin), ctx->uservaddr) != 0) {
        return 0;
    }

    // Filter IPv4 (AF_INET = 2)
    if (sin.sin_family != 2 /* AF_INET */) {
        return 0;
    }

    __u32 dst_ip = sin.sin_addr.s_addr;
    __u16 dst_port = bpf_ntohs(sin.sin_port);
    __u64 pid_tgid = bpf_get_current_pid_tgid();
    __u32 pid = (__u32)(pid_tgid >> 32);
    __u32 tgid = (__u32)pid_tgid;

    increment_connect_stat(0); // Total

    int is_db = is_database_port(dst_port);
    if (is_db) {
        increment_connect_stat(1); // DB
    } else if (dst_port == PORT_HTTP || dst_port == PORT_HTTPS) {
        increment_connect_stat(2); // HTTP/S
    } else {
        increment_connect_stat(3); // Other
    }

    // Submit to RingBuffer
    struct connect_event_t *evt = bpf_ringbuf_reserve(&connect_events_ringbuf, sizeof(*evt), 0);
    if (evt) {
        evt->pid = pid;
        evt->tgid = tgid;
        evt->src_ip = 0;
        evt->dst_ip = dst_ip;
        evt->src_port = 0;
        evt->dst_port = dst_port;
        evt->fd = (__u32)ctx->fd;
        evt->is_db_socket = is_db ? 1 : 0;
        evt->action = CONNECT_ACTION_PASS;
        evt->timestamp_ns = bpf_ktime_get_ns();
        bpf_get_current_comm(&evt->comm, sizeof(evt->comm));

        bpf_ringbuf_submit(evt, 0);
    }

    return 0;
}

// Fallback / Alternative Kprobe hook for kernels lacking tracepoint
SEC("kprobe/__x64_sys_connect")
int BPF_KPROBE(kprobe_sys_connect, int fd, struct sockaddr *uservaddr, int addrlen) {
    if (!uservaddr || addrlen < 8) {
        return 0;
    }

    struct sockaddr_in sin = {};
    if (bpf_probe_read_user(&sin, sizeof(sin), uservaddr) != 0) {
        return 0;
    }

    if (sin.sin_family != 2 /* AF_INET */) {
        return 0;
    }

    __u32 dst_ip = sin.sin_addr.s_addr;
    __u16 dst_port = bpf_ntohs(sin.sin_port);
    __u64 pid_tgid = bpf_get_current_pid_tgid();
    __u32 pid = (__u32)(pid_tgid >> 32);
    __u32 tgid = (__u32)pid_tgid;

    increment_connect_stat(0);

    int is_db = is_database_port(dst_port);
    if (is_db) {
        increment_connect_stat(1);
    }

    struct connect_event_t *evt = bpf_ringbuf_reserve(&connect_events_ringbuf, sizeof(*evt), 0);
    if (evt) {
        evt->pid = pid;
        evt->tgid = tgid;
        evt->src_ip = 0;
        evt->dst_ip = dst_ip;
        evt->src_port = 0;
        evt->dst_port = dst_port;
        evt->fd = (__u32)fd;
        evt->is_db_socket = is_db ? 1 : 0;
        evt->action = CONNECT_ACTION_PASS;
        evt->timestamp_ns = bpf_ktime_get_ns();
        bpf_get_current_comm(&evt->comm, sizeof(evt->comm));

        bpf_ringbuf_submit(evt, 0);
    }

    return 0;
}

char _license[] SEC("license") = "Dual BSD/GPL";
