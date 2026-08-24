// SPDX-License-Identifier: GPL-2.0
/*
 * KSEC v2.0 — In-Kernel Dynamic Taint Tracking
 *
 * Tags memory blocks and process contexts with sensitivity bitmasks (PII, Credentials, Payments)
 * and intercepts unauthorized egress network flows carrying tainted data.
 */

#include "bpf_compat.h"
#include "ksec_common.h"

char LICENSE[] SEC("license") = "GPL";

/* ── Maps ─────────────────────────────────────────────────────────────── */

struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, KSEC_MAX_AGENTS);
    __type(key, __u32);                  /* TGID */
    __type(value, struct taint_entry);   /* Active taint state */
} ksec_process_taints SEC(".maps");

struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, KSEC_MAX_IPS);
    __type(key, __u32);                  /* IPv4 address */
    __type(value, __u32);                /* 1 = Authorized internal endpoint */
} ksec_authorized_egress SEC(".maps");

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 128 * 1024);
} ksec_taint_events SEC(".maps");

/* ── Tracepoint: sys_enter_sendto (Egress Leakage Inspection) ─────────── */

struct trace_event_raw_sys_enter_sendto {
    __u64 _pad;
    long syscall_nr;
    unsigned long fd;
    void *buff;
    size_t len;
    unsigned int flags;
    struct sockaddr *addr;
    int addr_len;
};

SEC("tracepoint/syscalls/sys_enter_sendto")
int ksec_trace_sys_enter_sendto(struct trace_event_raw_sys_enter_sendto *ctx) {
    __u64 pid_tgid = bpf_get_current_pid_tgid();
    __u32 tgid = (__u32)(pid_tgid >> 32);

    struct taint_entry *taint = bpf_map_lookup_elem(&ksec_process_taints, &tgid);
    if (!taint || taint->taint_mask == TAINT_NONE) {
        return 0;
    }

    if (ctx->addr && ctx->addr_len >= sizeof(struct sockaddr_in)) {
        struct sockaddr_in sin;
        if (bpf_probe_read_user(&sin, sizeof(sin), ctx->addr) == 0) {
            if (sin.sin_family == AF_INET) {
                __u32 dst_ip = sin.sin_addr.s_addr;

                __u32 *auth = bpf_map_lookup_elem(&ksec_authorized_egress, &dst_ip);
                if (!auth || *auth == 0) {
                    struct ksec_event_hdr *evt;
                    evt = bpf_ringbuf_reserve(&ksec_taint_events, sizeof(*evt), 0);
                    if (evt) {
                        evt->timestamp_ns = bpf_ktime_get_ns();
                        evt->event_type = KSEC_VIOLATION_EXFIL_ATTEMPT;
                        evt->tgid = tgid;
                        evt->agent_id = taint->agent_id;
                        evt->denied = 1;
                        bpf_ringbuf_submit(evt, 0);
                    }

                    bpf_send_signal(9); /* SIGKILL */
                    return 0;
                }
            }
        }
    }

    return 0;
}

/* ── Helper: Apply Taint to Process Context ────────────────────────────── */

SEC("kprobe/ksec_tag_taint")
int BPF_KPROBE(ksec_tag_taint, __u32 target_tgid, __u32 taint_mask, __u32 source_hash) {
    struct taint_entry entry = {
        .taint_mask = taint_mask,
        .agent_id = target_tgid,
        .tainted_at_ns = bpf_ktime_get_ns(),
        .source_table_hash = source_hash,
        ._pad = 0,
    };

    bpf_map_update_elem(&ksec_process_taints, &target_tgid, &entry, BPF_ANY);
    return 0;
}
