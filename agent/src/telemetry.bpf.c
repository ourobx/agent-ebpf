#include "../include/vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>
#include "telemetry.bpf.h"

char LICENSE[] SEC("license") = "Dual BSD/GPL";

/* 256 KB Zero-Copy RingBuffer Map */
struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 256 * 1024);
} events SEC(".maps");

/* In-Kernel Policy Whitelist Map synchronized from FastAPI Control Plane */
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1024);
    __type(key, __u32);   /* PID or Security Context ID */
    __type(value, __u8);  /* 1: Allowed, 0: Denied / Drop */
} policy_whitelist_map SEC(".maps");

/* Kprobe hook intercepting outbound IPv4 TCP connections */
SEC("kprobe/tcp_v4_connect")
int BPF_KPROBE(tcp_v4_connect, struct sock *sk) {
    struct event_t *event;
    __u64 pid_tgid = bpf_get_current_pid_tgid();
    __u32 pid = pid_tgid >> 32;
    __u32 uid = bpf_get_current_uid_gid();

    /* Intent-to-Execution (I2E) Policy Validation */
    __u8 *allowed = bpf_map_lookup_elem(&policy_whitelist_map, &pid);
    __u8 severity = 0; /* Default INFO */

    if (allowed && *allowed == 0) {
        /* Explicitly blocked process attempting outbound connection */
        severity = 2; /* CRIT */
    }

    /* Zero-copy memory reservation in the RingBuffer */
    event = bpf_ringbuf_reserve(&events, sizeof(*event), 0);
    if (!event) {
        return 0; /* Buffer full: drop event safely without blocking kernel */
    }

    event->timestamp_ns = bpf_ktime_get_ns();
    event->pid = pid;
    event->uid = uid;
    event->protocol = 6; /* IPPROTO_TCP */
    event->severity = severity;

    /* Safe CO-RE read from kernel sock struct */
    event->saddr = BPF_CORE_READ(sk, __sk_common.skc_rcv_saddr);
    event->daddr = BPF_CORE_READ(sk, __sk_common.skc_daddr);
    event->dport = BPF_CORE_READ(sk, __sk_common.skc_dport);
    event->sport = BPF_CORE_READ(sk, __sk_common.skc_num);

    bpf_get_current_comm(&event->comm, sizeof(event->comm));

    /* Submit event to userspace */
    bpf_ringbuf_submit(event, 0);
    return 0;
}
