// SEC("xdp") eBPF Firewall Core with BTF & CO-RE Support
#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_endian.h>

#define ETH_P_IP 0x0800
#define ACTION_PASSED 1
#define ACTION_BLOCKED 2

struct blocked_entry_t {
    __u64 blocked_at;
    __u64 rule_id;
};

struct security_event_t {
    __u32 src_ip;
    __u32 dst_ip;
    __u16 src_port;
    __u16 dst_port;
    __u32 protocol;
    __u32 action;
    __u64 timestamp_ns;
};

// 1. Map: IP Blocklist (LRU Hash Map for Auto Eviction)
struct {
    __uint(type, BPF_MAP_TYPE_LRU_HASH);
    __uint(max_entries, 10000);
    __type(key, __u32);               // IPv4 Address
    __type(value, struct blocked_entry_t);
} blocked_ips SEC(".maps");

// 2. Map: Live Security Violation Events (RingBuffer)
struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 256 * 1024); // 256 KB
} events_ringbuf SEC(".maps");

// 3. Map: Packet Statistics Counters
struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __uint(max_entries, 2);
    __type(key, __u32);   // 0 = Total, 1 = Dropped
    __type(value, __u64);
} stats_map SEC(".maps");

static __always_inline void increment_stat(__u32 index) {
    __u64 *val = bpf_map_lookup_elem(&stats_map, &index);
    if (val) {
        __sync_fetch_and_add(val, 1);
    }
}

SEC("xdp")
int xdp_shield_filter(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data     = (void *)(long)ctx->data;

    __u32 total_idx = 0;
    __u32 drop_idx  = 1;

    increment_stat(total_idx);

    // Ethernet Header Parse
    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;

    if (eth->h_proto != bpf_htons(ETH_P_IP))
        return XDP_PASS;

    // IP Header Parse
    struct iphdr *iph = (void *)(eth + 1);
    if ((void *)(iph + 1) > data_end)
        return XDP_PASS;

    __u32 src_ip = iph->saddr;
    __u32 dst_ip = iph->daddr;
    __u32 protocol = iph->protocol;

    __u16 src_port = 0;
    __u16 dst_port = 0;

    if (protocol == IPPROTO_TCP) {
        struct tcphdr *tcph = (void *)iph + (iph->ihl * 4);
        if ((void *)(tcph + 1) <= data_end) {
            src_port = bpf_ntohs(tcph->source);
            dst_port = bpf_ntohs(tcph->dest);
        }
    } else if (protocol == IPPROTO_UDP) {
        struct udphdr *udph = (void *)iph + (iph->ihl * 4);
        if ((void *)(udph + 1) <= data_end) {
            src_port = bpf_ntohs(udph->source);
            dst_port = bpf_ntohs(udph->dest);
        }
    }

    // IP Block Check
    struct blocked_entry_t *entry = bpf_map_lookup_elem(&blocked_ips, &src_ip);
    if (entry) {
        increment_stat(drop_idx);

        // RingBuffer Event Notification
        struct security_event_t *evt = bpf_ringbuf_reserve(&events_ringbuf, sizeof(*evt), 0);
        if (evt) {
            evt->src_ip = src_ip;
            evt->dst_ip = dst_ip;
            evt->src_port = src_port;
            evt->dst_port = dst_port;
            evt->protocol = protocol;
            evt->action = ACTION_BLOCKED;
            evt->timestamp_ns = bpf_ktime_get_ns();
            bpf_ringbuf_submit(evt, 0);
        }
        return XDP_DROP;
    }

    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";
