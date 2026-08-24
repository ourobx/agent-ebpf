// SPDX-License-Identifier: GPL-2.0
/*
 * KSEC v2.0 — eBPF kTLS Zero-Copy Wire Decryptor & Stream AST Hook
 *
 * Hooks into sock_ops to negotiate Linux kTLS zero-copy stream decryption,
 * and attaches sk_msg verifier to inspect plain wire payloads directly in-kernel.
 */

#include "bpf_compat.h"
#include "ksec_common.h"

char LICENSE[] SEC("license") = "GPL";

#define PG_PORT_LE 5432
#define HTTPS_PORT_LE 443

/* ── Sockmap for Stream Redirection ───────────────────────────────────── */

struct {
    __uint(type, BPF_MAP_TYPE_SOCKHASH);
    __uint(max_entries, KSEC_MAX_AGENTS * 2);
    __type(key, __u32);   /* socket hash / fd */
    __type(value, __u64); /* socket context */
} ksec_sock_map SEC(".maps");

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 128 * 1024);
} ksec_wire_events SEC(".maps");

/* ── Helper: Case-Insensitive Prefix Check ────────────────────────────── */

static __always_inline int is_forbidden_sql_prefix(const char *buf, __u32 len) {
    if (len < 4)
        return 0;

    /* Check "DROP" */
    if ((buf[0] == 'D' || buf[0] == 'd') &&
        (buf[1] == 'R' || buf[1] == 'r') &&
        (buf[2] == 'O' || buf[2] == 'o') &&
        (buf[3] == 'P' || buf[3] == 'p')) {
        return 1;
    }

    /* Check "TRUNC" */
    if (len >= 5) {
        if ((buf[0] == 'T' || buf[0] == 't') &&
            (buf[1] == 'R' || buf[1] == 'r') &&
            (buf[2] == 'U' || buf[2] == 'u') &&
            (buf[3] == 'N' || buf[3] == 'n') &&
            (buf[4] == 'C' || buf[4] == 'c')) {
            return 1;
        }
    }

    /* Check "ALTER" */
    if (len >= 5) {
        if ((buf[0] == 'A' || buf[0] == 'a') &&
            (buf[1] == 'L' || buf[1] == 'l') &&
            (buf[2] == 'T' || buf[2] == 't') &&
            (buf[3] == 'E' || buf[3] == 'e') &&
            (buf[4] == 'R' || buf[4] == 'r')) {
            return 1;
        }
    }

    return 0;
}

/* ── sock_ops: Enable kTLS ULP on Established TCP Sockets ─────────────── */

SEC("sockops")
int ksec_sockops_ktls(struct bpf_sock_ops *skops) {
    __u32 op = skops->op;

    if (op == BPF_SOCK_OPS_STATE_CB) {
        __u32 new_state = skops->args[1];

        /* Trigger on TCP_ESTABLISHED */
        if (new_state == BPF_TCP_ESTABLISHED) {
            __u32 remote_port = bpf_ntohl(skops->remote_port);

            /* Check if connecting to PostgreSQL (5432) or HTTPS (443) */
            if (remote_port == PG_PORT_LE || remote_port == HTTPS_PORT_LE) {
                char tls_ulp[] = "tls";
                bpf_setsockopt(skops, SOL_TCP, TCP_ULP, tls_ulp, sizeof(tls_ulp));

                __u32 key = skops->local_port;
                bpf_sock_hash_update(skops, &ksec_sock_map, &key, BPF_NOEXIST);
            }
        }
    }

    return 0;
}

/* ── sk_msg: Inspect Decrypted Wire Payload in Kernel Space ───────────── */

SEC("sk_msg")
int ksec_sk_msg_inspect(struct sk_msg_md *msg) {
    void *data = (void *)(long)msg->data;
    void *data_end = (void *)(long)msg->data_end;

    if (data >= data_end)
        return SK_PASS;

    __u64 len = (__u64)((char *)data_end - (char *)data);
    if (len < 5)
        return SK_PASS;

    char *buf = (char *)data;

    /* PostgreSQL Frontend Wire Protocol:
     * 'Q' (0x51) -> Simple Query message type
     */
    if (buf[0] == 'Q') {
        char *sql_start = buf + 5;
        if ((void *)(sql_start + 8) <= data_end) {
            #pragma unroll
            for (int i = 0; i < 4; i++) {
                if (*sql_start == ' ' || *sql_start == '\t' || *sql_start == '\n') {
                    sql_start++;
                }
            }

            if ((void *)(sql_start + 5) <= data_end) {
                if (is_forbidden_sql_prefix(sql_start, 5)) {
                    struct ksec_event_hdr *evt;
                    evt = bpf_ringbuf_reserve(&ksec_wire_events, sizeof(*evt), 0);
                    if (evt) {
                        evt->timestamp_ns = bpf_ktime_get_ns();
                        evt->event_type = KSEC_VIOLATION_DDL_BLOCKED;
                        evt->tgid = 0;
                        evt->agent_id = 0;
                        evt->denied = 1;
                        bpf_ringbuf_submit(evt, 0);
                    }
                    return SK_DROP;
                }
            }
        }
    }

    return SK_PASS;
}
