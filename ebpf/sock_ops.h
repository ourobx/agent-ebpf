// SPDX-License-Identifier: (LGPL-2.1 OR BSD-2-Clause)
/* Copyright (c) 2026 Agent-eBPF Core Engineering */
#ifndef __SOCK_OPS_H
#define __SOCK_OPS_H

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
#ifndef BPF_MAP_TYPE_ARRAY
#define BPF_MAP_TYPE_ARRAY 2
#endif
#ifndef BPF_MAP_TYPE_LRU_HASH
#define BPF_MAP_TYPE_LRU_HASH 9
#endif
#ifndef BPF_MAP_TYPE_RINGBUF
#define BPF_MAP_TYPE_RINGBUF 27
#endif

#ifndef BPF_ANY
#define BPF_ANY 0
#endif

// SockOps Op codes from Linux kernel headers
#ifndef BPF_SOCK_OPS_TCP_CONNECT_CB
#define BPF_SOCK_OPS_TCP_CONNECT_CB 3
#endif
#ifndef BPF_SOCK_OPS_ACTIVE_ESTABLISHED_CB
#define BPF_SOCK_OPS_ACTIVE_ESTABLISHED_CB 4
#endif
#ifndef BPF_SOCK_OPS_PASSIVE_ESTABLISHED_CB
#define BPF_SOCK_OPS_PASSIVE_ESTABLISHED_CB 5
#endif
#ifndef BPF_SOCK_OPS_STATE_CB
#define BPF_SOCK_OPS_STATE_CB 12
#endif

#define ACTION_PASSED 1
#define ACTION_BLOCKED 2

// Monitored Database Default Ports (Host Byte Order)
#define PORT_POSTGRESQL 5432
#define PORT_MYSQL      3306
#define PORT_REDIS      6379
#define PORT_MONGODB    27017

/**
 * struct sock_ops_event_t - Socket Lifecycle & Telemetry Event
 */
struct sock_ops_event_t {
    __u32 op;
    __u32 src_ip;
    __u32 dst_ip;
    __u16 src_port;
    __u16 dst_port;
    __u32 old_state;
    __u32 new_state;
    __u64 start_ts_ns;
    __u64 end_ts_ns;
    __u64 latency_us;
    __u32 is_db_socket;
    __u32 action;
    __u32 pid;
    char  comm[16];
};

/**
 * struct sock_conn_track_t - Tracking map value for in-flight socket connections
 */
struct sock_conn_track_t {
    __u64 start_ts_ns;
    __u32 src_ip;
    __u32 dst_ip;
    __u16 src_port;
    __u16 dst_port;
};

#ifndef BPF_SOCK_OPS_STRUCT_DEFINED
#define BPF_SOCK_OPS_STRUCT_DEFINED
#ifndef __KERNEL__
#ifndef _LINUX_BPF_H
struct bpf_sock_ops {
    __u32 op;
    __u32 args[4];
    __u32 family;
    __u32 remote_ip4;
    __u32 local_ip4;
    __u32 remote_ip6[4];
    __u32 local_ip6[4];
    __u32 remote_port;
    __u32 local_port;
    __u32 is_fullsock;
    __u32 snd_cwnd;
    __u32 srtt_us;
    __u32 bpf_sock_ops_cb_flags;
    __u32 state;
    __u32 rtt_min;
    __u32 snd_ssthresh;
    __u32 rcv_nxt;
    __u32 snd_nxt;
    __u32 snd_una;
    __u32 mss_cache;
    __u32 ecn_flags;
    __u32 rate_delivered;
    __u32 rate_interval_us;
    __u32 packets_out;
    __u32 retrans_out;
    __u32 total_retrans;
    __u32 segs_in;
    __u32 data_segs_in;
    __u32 segs_out;
    __u32 data_segs_out;
    __u32 lost_out;
    __u32 sacked_out;
    __u32 sk_txhash;
    __u64 bytes_received;
    __u64 bytes_acked;
};
#endif
#endif
#endif

#endif /* __SOCK_OPS_H */
