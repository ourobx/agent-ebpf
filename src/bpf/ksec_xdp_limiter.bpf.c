// SPDX-License-Identifier: GPL-2.0
/*
 * KSEC v2.0 — Native XDP Hardware Token-Bucket Rate Limiter
 *
 * Runs at the NIC driver layer (XDP_FAST) to protect kernel ring buffers
 * and eBPF maps from high-frequency agent call bombardment and DoS attacks.
 */

#include "bpf_compat.h"
#include "ksec_common.h"

char LICENSE[] SEC("license") = "GPL";

#define DEFAULT_FILL_RATE_PER_SEC 10000ULL   /* 10,000 packets/sec */
#define DEFAULT_BURST_MAX         20000ULL   /* Max token ceiling */
#define NS_PER_SEC                1000000000ULL

/* ── Per-IP Rate Bucket Map ───────────────────────────────────────────── */

struct {
    __uint(type, BPF_MAP_TYPE_LRU_HASH);
    __uint(max_entries, KSEC_MAX_IPS);
    __type(key, __u32);                 /* IPv4 Address */
    __type(value, struct rate_bucket);  /* Token bucket state */
} ksec_ip_buckets SEC(".maps");

/* ── XDP Fast-Path Hook ───────────────────────────────────────────────── */

SEC("xdp")
int ksec_xdp_rate_limit(struct xdp_md *ctx) {
    void *data = (void *)(long)ctx->data;
    void *data_end = (void *)(long)ctx->data_end;

    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;

    if (eth->h_proto != bpf_htons(ETH_P_IP))
        return XDP_PASS;

    struct iphdr *ip = (void *)(eth + 1);
    if ((void *)(ip + 1) > data_end)
        return XDP_PASS;

    __u32 src_ip = ip->saddr;
    __u64 now = bpf_ktime_get_ns();

    struct rate_bucket *bucket = bpf_map_lookup_elem(&ksec_ip_buckets, &src_ip);
    if (!bucket) {
        struct rate_bucket new_bucket = {
            .tokens = DEFAULT_BURST_MAX,
            .last_update_ns = now,
            .fill_rate_per_sec = DEFAULT_FILL_RATE_PER_SEC,
            .max_tokens = DEFAULT_BURST_MAX,
        };
        bpf_map_update_elem(&ksec_ip_buckets, &src_ip, &new_bucket, BPF_NOEXIST);
        return XDP_PASS;
    }

    __u64 elapsed_ns = now - bucket->last_update_ns;
    if (elapsed_ns > 0) {
        __u64 added_tokens = (elapsed_ns * bucket->fill_rate_per_sec) / NS_PER_SEC;
        if (added_tokens > 0) {
            bucket->tokens += added_tokens;
            if (bucket->tokens > bucket->max_tokens)
                bucket->tokens = bucket->max_tokens;
            bucket->last_update_ns = now;
        }
    }

    if (bucket->tokens > 0) {
        bucket->tokens--;
        return XDP_PASS;
    }

    return XDP_DROP;
}
