// SPDX-License-Identifier: (LGPL-2.1 OR BSD-2-Clause)
/* Copyright (c) 2026 Agent-eBPF Engineering */
#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_endian.h>
#include "empathy_state.h"

SEC("xdp")
int xdp_empathy_monitor(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data     = (void *)(long)ctx->data;

    // Ethernet Header Parse
    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;

    if (eth->h_proto != bpf_htons(0x0800))
        return XDP_PASS;

    // Inspect Ring-0 Cognitive State Map
    struct cognitive_stress_telemetry *st = get_cognitive_state();
    if (st) {
        // High cognitive stress / hesitation (stress_index >= 2) triggers trace notification
        if (st->stress_index >= 2) {
            bpf_printk("eBPF Empathy Bridge: Stress Alarm (stress_index=%u, arousal=%u)\n",
                       st->stress_index, st->arousal_scaled);
        }
    }

    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";
