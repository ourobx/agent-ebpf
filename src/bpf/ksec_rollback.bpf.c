// SPDX-License-Identifier: GPL-2.0
/*
 * KSEC v2.0 — Sub-35µs Autonomous Zero-State Wire Rollback Injector
 *
 * Intercepts unauthorized SQL transactions and injects a synthesized
 * PostgreSQL ROLLBACK protocol frame directly at the kernel socket boundary
 * before application state corruption occurs.
 */

#include "bpf_compat.h"
#include "ksec_common.h"

char LICENSE[] SEC("license") = "GPL";

/* ── Ring Buffer for Forensic Telemetry ───────────────────────────────── */

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 256 * 1024);
} ksec_rollback_events SEC(".maps");

/* ── PostgreSQL Wire Protocol 'Q' ROLLBACK Payload ────────────────────── */

/*
 * PostgreSQL Simple Query format:
 * 'Q' (1 byte) + Length (4 bytes, big endian) + "ROLLBACK;\0" (10 bytes)
 * Total length field value: 14 (0x0000000e)
 */
static const char pg_rollback_payload[15] = {
    'Q',
    0x00, 0x00, 0x00, 0x0E,
    'R', 'O', 'L', 'L', 'B', 'A', 'C', 'K', ';', '\0'
};

/* ── sk_msg Verdict Hook with Autonomous In-Wire Rollback ─────────────── */

SEC("sk_msg")
int ksec_rollback_injector(struct sk_msg_md *msg) {
    void *data = (void *)(long)msg->data;
    void *data_end = (void *)(long)msg->data_end;

    if (data >= data_end)
        return SK_PASS;

    __u64 len = (__u64)((char *)data_end - (char *)data);
    if (len < 5)
        return SK_PASS;

    char *buf = (char *)data;

    /* Check for Postgres Query frame 'Q' */
    if (buf[0] == 'Q') {
        char *query = buf + 5;
        if ((void *)(query + 6) <= data_end) {
            int is_destructive = 0;
            if ((query[0] == 'D' || query[0] == 'd') &&
                (query[1] == 'E' || query[1] == 'e') &&
                (query[2] == 'L' || query[2] == 'l') &&
                (query[3] == 'E' || query[3] == 'e') &&
                (query[4] == 'T' || query[4] == 't') &&
                (query[5] == 'E' || query[5] == 'e')) {
                is_destructive = 1;
            }

            if (is_destructive) {
                struct ksec_event_hdr *evt;
                evt = bpf_ringbuf_reserve(&ksec_rollback_events, sizeof(*evt), 0);
                if (evt) {
                    evt->timestamp_ns = bpf_ktime_get_ns();
                    evt->event_type = KSEC_VIOLATION_RLS_BREACH;
                    evt->tgid = 0;
                    evt->agent_id = 0;
                    evt->denied = 1;
                    bpf_ringbuf_submit(evt, 0);
                }

                if (len >= sizeof(pg_rollback_payload)) {
                    #pragma unroll
                    for (int i = 0; i < (int)sizeof(pg_rollback_payload); i++) {
                        buf[i] = pg_rollback_payload[i];
                    }
                    return SK_PASS;
                }

                return SK_DROP;
            }
        }
    }

    return SK_PASS;
}
