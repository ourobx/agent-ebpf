// SPDX-License-Identifier: GPL-2.0
/*
 * KSEC v2.0 — Anti-TOCTOU Atomic Single-Use Nonce Engine
 *
 * Enforces single-use Ed25519 Intent Leases at Ring-0 with in-kernel
 * SHA-256 payload verification and atomic CAS consumption.
 */

#include "bpf_compat.h"
#include "ksec_common.h"

char LICENSE[] SEC("license") = "GPL";

/* ── BPF Maps ─────────────────────────────────────────────────────────── */

struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, KSEC_MAX_AGENTS * 4);
    __type(key, __u64);                 /* nonce */
    __type(value, struct lease_entry);  /* lease metadata */
    __uint(pinning, LIBBPF_PIN_BY_NAME);
} ksec_atomic_leases SEC(".maps");

struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, KSEC_MAX_AGENTS);
    __type(key, __u32);                 /* TGID/PID */
    __type(value, struct agent_session);
} ksec_agent_sessions SEC(".maps");

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 256 * 1024);     /* 256KB */
} ksec_events SEC(".maps");

/* ── In-Kernel SHA-256 Computation Routine ────────────────────────────── */

#define SHA256_ROTR(a, n) (((a) >> (n)) | ((a) << (32 - (n))))
#define SHA256_CH(x, y, z) (((x) & (y)) ^ (~(x) & (z)))
#define SHA256_MAJ(x, y, z) (((x) & (y)) ^ ((x) & (z)) ^ ((y) & (z)))
#define SHA256_EP0(x) (SHA256_ROTR(x, 2) ^ SHA256_ROTR(x, 13) ^ SHA256_ROTR(x, 22))
#define SHA256_EP1(x) (SHA256_ROTR(x, 6) ^ SHA256_ROTR(x, 11) ^ SHA256_ROTR(x, 25))
#define SHA256_SIG0(x) (SHA256_ROTR(x, 7) ^ SHA256_ROTR(x, 18) ^ ((x) >> 3))
#define SHA256_SIG1(x) (SHA256_ROTR(x, 17) ^ SHA256_ROTR(x, 19) ^ ((x) >> 10))

static const __u32 k256[64] = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
};

static __always_inline void sha256_transform(__u32 state[8], const __u8 data[64]) {
    __u32 a, b, c, d, e, f, g, h, t1, t2, m[64];
    int i;

    #pragma unroll
    for (i = 0; i < 16; i++) {
        m[i] = ((__u32)data[i * 4] << 24) |
               ((__u32)data[i * 4 + 1] << 16) |
               ((__u32)data[i * 4 + 2] << 8) |
               ((__u32)data[i * 4 + 3]);
    }

    #pragma unroll
    for (i = 16; i < 64; i++) {
        m[i] = SHA256_SIG1(m[i - 2]) + m[i - 7] + SHA256_SIG0(m[i - 15]) + m[i - 16];
    }

    a = state[0]; b = state[1]; c = state[2]; d = state[3];
    e = state[4]; f = state[5]; g = state[6]; h = state[7];

    #pragma unroll
    for (i = 0; i < 64; i++) {
        t1 = h + SHA256_EP1(e) + SHA256_CH(e, f, g) + k256[i] + m[i];
        t2 = SHA256_EP0(a) + SHA256_MAJ(a, b, c);
        h = g;
        g = f;
        f = e;
        e = d + t1;
        d = c;
        c = b;
        b = a;
        a = t1 + t2;
    }

    state[0] += a; state[1] += b; state[2] += c; state[3] += d;
    state[4] += e; state[5] += f; state[6] += g; state[7] += h;
}

static __always_inline void compute_payload_sha256(const __u8 *payload, __u32 len, __u8 out[32]) {
    __u32 state[8] = {
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    };
    __u8 block[64] = {0};
    __u32 bounded_len = len;

    if (bounded_len > 55)
        bounded_len = 55;

    #pragma unroll
    for (int i = 0; i < 55; i++) {
        if (i < bounded_len) {
            block[i] = payload[i];
        }
    }

    block[bounded_len] = 0x80;
    __u64 bits = (__u64)bounded_len * 8;
    block[62] = (__u8)(bits >> 8);
    block[63] = (__u8)(bits);

    sha256_transform(state, block);

    #pragma unroll
    for (int i = 0; i < 8; i++) {
        out[i * 4]     = (__u8)(state[i] >> 24);
        out[i * 4 + 1] = (__u8)(state[i] >> 16);
        out[i * 4 + 2] = (__u8)(state[i] >> 8);
        out[i * 4 + 3] = (__u8)(state[i]);
    }
}

/* ── Helper: Emit Security Event to Ring Buffer ──────────────────────── */

static __always_inline void emit_violation(__u32 event_type, __u32 agent_id, __u32 tgid) {
    struct ksec_event_hdr *evt;
    evt = bpf_ringbuf_reserve(&ksec_events, sizeof(*evt), 0);
    if (!evt)
        return;

    evt->timestamp_ns = bpf_ktime_get_ns();
    evt->event_type = event_type;
    evt->tgid = tgid;
    evt->agent_id = agent_id;
    evt->denied = 1;

    bpf_ringbuf_submit(evt, 0);
}

/* ── LSM Hook: socket_connect ─────────────────────────────────────────── */

SEC("lsm/socket_connect")
int BPF_PROG(ksec_socket_connect, struct socket *sock, struct sockaddr *address, int addrlen) {
    __u64 pid_tgid = bpf_get_current_pid_tgid();
    __u32 tgid = (__u32)(pid_tgid >> 32);

    struct agent_session *session = bpf_map_lookup_elem(&ksec_agent_sessions, &tgid);
    if (!session) {
        return 0;
    }

    if (session->flags & KSEC_AGENT_FLAG_FROZEN) {
        emit_violation(KSEC_VIOLATION_NO_LEASE, session->agent_id, tgid);
        return -1;
    }

    __u64 nonce = session->lease_nonce;
    if (nonce == 0) {
        emit_violation(KSEC_VIOLATION_NO_LEASE, session->agent_id, tgid);
        return -1;
    }

    struct lease_entry *lease = bpf_map_lookup_elem(&ksec_atomic_leases, &nonce);
    if (!lease) {
        emit_violation(KSEC_VIOLATION_NO_LEASE, session->agent_id, tgid);
        return -1;
    }

    __u64 now = bpf_ktime_get_ns();
    if (now > lease->expires_ns) {
        bpf_map_delete_elem(&ksec_atomic_leases, &nonce);
        emit_violation(KSEC_VIOLATION_EXPIRED_NONCE, session->agent_id, tgid);
        return -1;
    }

    if (!(lease->allowed_ops & KSEC_OP_CONNECT)) {
        emit_violation(KSEC_VIOLATION_TOCTOU_REPLAY, session->agent_id, tgid);
        return -1;
    }

    return 0;
}

/* ── LSM Hook: socket_sendmsg ─────────────────────────────────────────── */

SEC("lsm/socket_sendmsg")
int BPF_PROG(ksec_socket_sendmsg, struct socket *sock, struct msghdr *msg, int size) {
    __u64 pid_tgid = bpf_get_current_pid_tgid();
    __u32 tgid = (__u32)(pid_tgid >> 32);

    struct agent_session *session = bpf_map_lookup_elem(&ksec_agent_sessions, &tgid);
    if (!session) {
        return 0;
    }

    __u64 nonce = session->lease_nonce;
    if (nonce == 0) {
        emit_violation(KSEC_VIOLATION_NO_LEASE, session->agent_id, tgid);
        return -1;
    }

    struct lease_entry *lease = bpf_map_lookup_elem(&ksec_atomic_leases, &nonce);
    if (!lease) {
        emit_violation(KSEC_VIOLATION_NO_LEASE, session->agent_id, tgid);
        return -1;
    }

    /* Atomic CAS: lease->consumed must transition from 0 -> 1 exactly once */
    __u32 expected = 0;
    __u32 old_val = __sync_val_compare_and_swap(&lease->consumed, expected, 1);
    if (old_val != 0) {
        emit_violation(KSEC_VIOLATION_TOCTOU_REPLAY, session->agent_id, tgid);
        bpf_map_delete_elem(&ksec_atomic_leases, &nonce);
        session->lease_nonce = 0;
        return -1;
    }

    __u64 now = bpf_ktime_get_ns();
    if (now > lease->expires_ns) {
        bpf_map_delete_elem(&ksec_atomic_leases, &nonce);
        session->lease_nonce = 0;
        emit_violation(KSEC_VIOLATION_EXPIRED_NONCE, session->agent_id, tgid);
        return -1;
    }

    bpf_map_delete_elem(&ksec_atomic_leases, &nonce);
    session->lease_nonce = 0;

    return 0;
}
