/* SPDX-License-Identifier: GPL-2.0
 *
 * KSEC v2.0 — eBPF Compatibility & IDE Shim Header
 *
 * Provides fallback definitions for standard BPF types, map descriptors,
 * section macros, and helper declarations when compiled or linted outside
 * a native Linux kernel development environment.
 */

#pragma once

#ifndef __KSEC_BPF_COMPAT_H
#define __KSEC_BPF_COMPAT_H

#if defined(__has_include)
  #if __has_include(<linux/types.h>)
    #include <linux/types.h>
    #define __KSEC_HAS_LINUX_TYPES 1
  #endif
  #if __has_include(<linux/bpf.h>)
    #include <linux/bpf.h>
    #define __KSEC_HAS_LINUX_BPF 1
  #endif
  #if __has_include(<bpf/bpf_helpers.h>)
    #include <bpf/bpf_helpers.h>
    #include <bpf/bpf_tracing.h>
    #include <bpf/bpf_endian.h>
    #define __KSEC_HAS_LIBBPF 1
  #endif
#endif

/* ── Fallback Primitive Types ─────────────────────────────────────────── */

#ifndef __KSEC_HAS_LINUX_TYPES
  #include <stdint.h>
  #include <stddef.h>

  typedef uint8_t   __u8;
  typedef uint16_t  __u16;
  typedef uint32_t  __u32;
  typedef uint64_t  __u64;

  typedef int8_t    __s8;
  typedef int16_t   __s16;
  typedef int32_t   __s32;
  typedef int64_t   __s64;

  typedef uint16_t  __be16;
  typedef uint32_t  __be32;
  typedef uint64_t  __be64;
#endif

/* ── Fallback Compiler Attributes ─────────────────────────────────────── */

#ifndef SEC
  #define SEC(name) __attribute__((section(name), used))
#endif

#ifndef __always_inline
  #define __always_inline inline __attribute__((always_inline))
#endif

/* ── Fallback BPF Map Definition Macros ───────────────────────────────── */

#ifndef __uint
  #define __uint(name, val) int (*name)[val]
#endif

#ifndef __type
  #define __type(name, val) typeof(val) *name
#endif

#ifndef LIBBPF_PIN_BY_NAME
  #define LIBBPF_PIN_BY_NAME 1
#endif

/* ── Fallback BPF Map Types & Enums ───────────────────────────────────── */

#ifndef BPF_MAP_TYPE_HASH
  #define BPF_MAP_TYPE_HASH       1
  #define BPF_MAP_TYPE_ARRAY      2
  #define BPF_MAP_TYPE_PROG_ARRAY 3
  #define BPF_MAP_TYPE_PERF_EVENT_ARRAY 4
  #define BPF_MAP_TYPE_PERCPU_HASH 5
  #define BPF_MAP_TYPE_LRU_HASH   9
  #define BPF_MAP_TYPE_SOCKHASH   18
  #define BPF_MAP_TYPE_RINGBUF    27
#endif

#ifndef BPF_ANY
  #define BPF_ANY     0
  #define BPF_NOEXIST 1
  #define BPF_EXIST   2
#endif

#ifndef XDP_DROP
  #define XDP_ABORTED 0
  #define XDP_DROP    1
  #define XDP_PASS    2
  #define XDP_TX      3
  #define XDP_REDIRECT 4
#endif

#ifndef SK_DROP
  #define SK_DROP 0
  #define SK_PASS 1
#endif

#ifndef BPF_TCP_ESTABLISHED
  #define BPF_TCP_ESTABLISHED 1
#endif

#ifndef BPF_SOCK_OPS_STATE_CB
  #define BPF_SOCK_OPS_STATE_CB 4
#endif

#ifndef SOL_TCP
  #define SOL_TCP 6
#endif

#ifndef TCP_ULP
  #define TCP_ULP 31
#endif

#ifndef AF_INET
  #define AF_INET 2
#endif

#ifndef ETH_P_IP
  #define ETH_P_IP 0x0800
#endif

/* ── Fallback Kernel Context Structures (IDE Mocking) ─────────────────── */

#ifndef __KSEC_HAS_LINUX_BPF

struct socket {
    int state;
    short type;
    unsigned long flags;
    void *file;
    void *sk;
    void *ops;
};

struct in_addr {
    __u32 s_addr;
};

struct sockaddr {
    unsigned short sa_family;
    char sa_data[14];
};

struct sockaddr_in {
    unsigned short sin_family;
    __be16 sin_port;
    struct in_addr sin_addr;
    unsigned char sin_zero[8];
};

struct msghdr {
    void *msg_name;
    int msg_namelen;
    void *msg_iov;
    size_t msg_iovlen;
    void *msg_control;
    size_t msg_controllen;
    unsigned int msg_flags;
};

struct sk_msg_md {
    void *data;
    void *data_end;
    __u32 family;
    __u32 remote_ip4;
    __u32 local_ip4;
    __u32 remote_port;
    __u32 local_port;
    __u32 size;
};

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
    void *sk;
    void *skb;
    void *skb_data;
    void *skb_data_end;
    __u32 flags;
    void *skb_tcp_header;
};

struct xdp_md {
    __u32 data;
    __u32 data_end;
    __u32 data_meta;
    __u32 ingress_ifindex;
    __u32 rx_queue_index;
    __u32 egress_ifindex;
};

struct ethhdr {
    unsigned char h_dest[6];
    unsigned char h_source[6];
    __be16 h_proto;
};

struct iphdr {
    __u8 ihl:4, version:4;
    __u8 tos;
    __be16 tot_len;
    __be16 id;
    __be16 frag_off;
    __u8 ttl;
    __u8 protocol;
    __sum16 check;
    __be32 saddr;
    __be32 daddr;
};

#endif /* !__KSEC_HAS_LINUX_BPF */

/* ── Fallback BPF Helper Prototypes ───────────────────────────────────── */

#ifndef __KSEC_HAS_LIBBPF

#define BPF_PROG(name, ...) name(__VA_ARGS__)
#define BPF_KPROBE(name, ...) name(void *ctx, ##__VA_ARGS__)

static inline __u64 bpf_ktime_get_ns(void) { return 0; }
static inline __u64 bpf_get_current_pid_tgid(void) { return 0; }
static inline void *bpf_map_lookup_elem(void *map, const void *key) { return 0; }
static inline long bpf_map_update_elem(void *map, const void *key, const void *value, __u64 flags) { return 0; }
static inline long bpf_map_delete_elem(void *map, const void *key) { return 0; }
static inline void *bpf_ringbuf_reserve(void *ringbuf, __u64 size, __u64 flags) { return 0; }
static inline void bpf_ringbuf_submit(void *data, __u64 flags) {}
static inline long bpf_send_signal(__u32 sig) { return 0; }
static inline long bpf_setsockopt(void *ctx, int level, int optname, void *optval, int optlen) { return 0; }
static inline long bpf_sock_hash_update(void *ctx, void *map, void *key, __u64 flags) { return 0; }
static inline long bpf_probe_read_user(void *dst, __u32 size, const void *unsafe_ptr) { return 0; }
static inline __u32 bpf_ntohl(__u32 val) { return ((val >> 24) & 0xff) | ((val >> 8) & 0xff00) | ((val << 8) & 0xff0000) | ((val << 24) & 0xff000000); }
static inline __u16 bpf_htons(__u16 val) { return ((val >> 8) & 0xff) | ((val << 8) & 0xff00); }

#endif /* !__KSEC_HAS_LIBBPF */

#endif /* __KSEC_BPF_COMPAT_H */
