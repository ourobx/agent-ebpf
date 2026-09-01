#ifndef __TELEMETRY_BPF_H
#define __TELEMETRY_BPF_H

#define TASK_COMM_LEN 16

/* 64-bit memory-aligned eBPF RingBuffer telemetry event */
struct event_t {
    __u64 timestamp_ns;
    __u32 pid;
    __u32 uid;
    __u32 saddr;          /* IPv4 Source Address */
    __u32 daddr;          /* IPv4 Destination Address */
    __u16 sport;          /* Source Port */
    __u16 dport;          /* Destination Port */
    __u8  protocol;       /* IPPROTO_TCP (6), etc. */
    __u8  severity;       /* 0: INFO, 1: WARN, 2: CRIT */
    char  comm[TASK_COMM_LEN];
};

#endif /* __TELEMETRY_BPF_H */
