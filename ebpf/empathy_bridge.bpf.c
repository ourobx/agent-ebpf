// SPDX-License-Identifier: (LGPL-2.1 OR BSD-2-Clause)
/* Copyright (c) 2026 Agent-eBPF Engineering */
#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>

struct cognitive_stress_telemetry {
    __u32 valence_scaled;    // 0 to 1000
    __u32 arousal_scaled;    // 0 to 1000
    __u32 resonance_scaled;  // 0 to 1000
    __u32 stress_index;      // 0: SERENE, 1: FOCUSED, 2: HESITATION_ALARM
    __u64 last_tick_ns;
};

struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __type(key, __u32);
    __type(value, struct cognitive_stress_telemetry);
    __uint(max_entries, 1);
} cognitive_state_map SEC(".maps");

// Tracepoint: Monitor destructive file deletion syscall (sys_enter_unlinkat)
SEC("tp/syscalls/sys_enter_unlinkat")
int handle_unlinkat_enter(struct trace_event_raw_sys_enter *ctx) {
    __u32 key = 0;
    struct cognitive_stress_telemetry *state;

    state = bpf_map_lookup_elem(&cognitive_state_map, &key);
    if (!state)
        return 0;

    // If high cognitive hesitation/alarm stress is active (stress_index == 2)
    if (state->stress_index == 2) {
        bpf_printk("[ksec-empathy] HESITATION: High stress detected (%u). Audit logging triggered for unlinkat.\n",
                   state->arousal_scaled);
    }

    return 0;
}

char LICENSE[] SEC("license") = "Dual BSD/GPL";
