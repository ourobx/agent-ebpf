// SPDX-License-Identifier: (LGPL-2.1 OR BSD-2-Clause)
/* Copyright (c) 2026 Sysauto & Agent-eBPF Core Engineering */
#ifndef __EMPATHY_STATE_H
#define __EMPATHY_STATE_H

#if defined(__bpf__) || defined(__KERNEL__)
#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#else
#include <stdint.h>
typedef int32_t   __s32;
typedef uint32_t  __u32;
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
#ifndef BPF_MAP_TYPE_ARRAY
#define BPF_MAP_TYPE_ARRAY 2
#endif
#endif

/**
 * struct cognitive_stress_telemetry - Ring-0 Cognitive & Emotional State Representation
 * @valence_scaled: Scaled emotional valence (-1000 to +1000, mapped as int32)
 * @arousal_scaled: Scaled emotional arousal (0 to 1000)
 * @resonance_scaled: Scaled soul empathy / resonance (0 to 1000)
 * @stress_index: 0 = SERENE, 1 = FOCUSED, 2 = HESITATION_ALARM
 * @last_tick_ns: Monotonic kernel timestamp of the last affective update
 */
struct cognitive_stress_telemetry {
    __s32 valence_scaled;
    __u32 arousal_scaled;
    __u32 resonance_scaled;
    __u32 stress_index;
    __u64 last_tick_ns;
};

#if defined(__bpf__) || defined(__KERNEL__)
/* BPF Map: Ring-0 Cognitive State Telemetry Map (1 entry) */
struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __type(key, __u32);
    __type(value, struct cognitive_stress_telemetry);
    __uint(max_entries, 1);
} cognitive_state_map SEC(".maps");

static __always_inline struct cognitive_stress_telemetry *get_cognitive_state(void) {
    __u32 key = 0;
    return bpf_map_lookup_elem(&cognitive_state_map, &key);
}
#endif

#endif /* __EMPATHY_STATE_H */
