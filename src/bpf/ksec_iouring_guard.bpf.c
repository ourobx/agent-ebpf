// SPDX-License-Identifier: GPL-2.0
/*
 * KSEC v2.0 — io_uring Asynchronous RingBuffer Guard
 *
 * Intercepts io_uring SQE submissions to prevent AI agent runtimes from
 * bypassing synchronous sys_enter hooks via asynchronous I/O rings.
 */

#include "bpf_compat.h"
#include "ksec_common.h"

char LICENSE[] SEC("license") = "GPL";

#define IORING_OP_READV        1
#define IORING_OP_WRITEV       2
#define IORING_OP_WRITE        23
#define IORING_OP_CONNECT      16
#define IORING_OP_SENDMSG      9
#define IORING_OP_RECVMSG      10
#define IORING_OP_SEND         26
#define IORING_OP_RECV         27

/* Tracepoint format for io_uring_submit */
struct trace_event_raw_io_uring_submit {
    __u64 _pad0;
    void *ctx;
    unsigned int opcode;
    unsigned long user_data;
    int flags;
    int fd;
    __u64 addr;
    __u32 len;
    __u32 op_flags;
};

/* ── External / Shared Maps ───────────────────────────────────────────── */

struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, KSEC_MAX_AGENTS);
    __type(key, __u32);
    __type(value, struct agent_session);
} ksec_agent_sessions SEC(".maps");

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 128 * 1024);
} ksec_iouring_events SEC(".maps");

/* ── Tracepoint: io_uring_submit ──────────────────────────────────────── */

SEC("tracepoint/io_uring/io_uring_submit")
int ksec_trace_io_uring_submit(struct trace_event_raw_io_uring_submit *ctx) {
    __u64 pid_tgid = bpf_get_current_pid_tgid();
    __u32 tgid = (__u32)(pid_tgid >> 32);

    struct agent_session *session = bpf_map_lookup_elem(&ksec_agent_sessions, &tgid);
    if (!session) {
        return 0;
    }

    __u32 opcode = ctx->opcode;

    if (opcode == IORING_OP_CONNECT ||
        opcode == IORING_OP_SENDMSG ||
        opcode == IORING_OP_SEND ||
        opcode == IORING_OP_WRITE ||
        opcode == IORING_OP_WRITEV) {

        if (session->lease_nonce == 0 || (session->flags & KSEC_AGENT_FLAG_FROZEN)) {
            struct ksec_event_hdr *evt;
            evt = bpf_ringbuf_reserve(&ksec_iouring_events, sizeof(*evt), 0);
            if (evt) {
                evt->timestamp_ns = bpf_ktime_get_ns();
                evt->event_type = KSEC_VIOLATION_IOURING_BYPASS;
                evt->tgid = tgid;
                evt->agent_id = session->agent_id;
                evt->denied = 1;
                bpf_ringbuf_submit(evt, 0);
            }

            bpf_send_signal(9); /* SIGKILL */
            return 0;
        }
    }

    return 0;
}
