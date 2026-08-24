/* SPDX-License-Identifier: GPL-2.0
 *
 * KSEC v2.0 — Shared Kernel Data Structures & Constants
 *
 * Included by all eBPF programs. Keep this header BPF-verifier-clean:
 * no function definitions, no VLAs, no dynamic allocation.
 *
 * Target: Linux >= 5.15, libbpf >= 1.0, clang >= 15
 */

#pragma once

#ifndef __KSEC_COMMON_H
#define __KSEC_COMMON_H

#include "bpf_compat.h"

/* ── Global Limits ────────────────────────────────────────────────────── */

#define KSEC_MAX_AGENTS        1024
#define KSEC_MAX_IPS           4096
#define KSEC_SHA256_LEN        32
#define KSEC_ED25519_SIG_LEN   64
#define KSEC_NONCE_TTL_NS      (500ULL * 1000000ULL)   /* 500 ms */
#define KSEC_MAX_SQL_INSPECT   1460                    /* 1 MTU */

/* ── Taint Bitmask Constants ──────────────────────────────────────────── */

#define TAINT_NONE             0x00
#define TAINT_PII              0x01   /* users, emails, names */
#define TAINT_CREDENTIALS      0x02   /* passwords, api_keys */
#define TAINT_PAYMENTS         0x04   /* payment records, card data */
#define TAINT_SESSIONS         0x08   /* session tokens */
#define TAINT_ALL              0xFF

/* ── Lease Entry ──────────────────────────────────────────────────────── */

/*
 * Stored in ksec_atomic_leases BPF_MAP_TYPE_HASH, keyed by nonce.
 *
 * The IEP v2 gateway populates this map before each agent tool call.
 * The eBPF LSM hook performs atomic single-use verification and deletes
 * the entry on first successful execution.
 *
 * Layout is __packed to avoid BPF verifier padding issues on 32-bit reads.
 */
struct lease_entry {
	__u8  ed25519_sig[64];   /* Ed25519 signature of intent AST */
	__u8  ast_sha256[32];    /* SHA-256 of authorised payload blob */
	__u64 nonce;             /* Unique single-use token identifier */
	__u64 expires_ns;        /* Absolute expiry in ktime_get_ns() space */
	__u32 consumed;          /* 0 = available, 1 = consumed (CAS target) */
	__u32 agent_id;          /* Registered agent process ID */
	__u32 allowed_ops;       /* Bitmask: which syscall classes are permitted */
	__u32 taint_expected;    /* Taint mask this agent is authorised to carry */
} __attribute__((packed));

/* ── Taint Entry ──────────────────────────────────────────────────────── */

struct taint_entry {
	__u32 taint_mask;        /* OR of TAINT_* bitmasks */
	__u32 agent_id;
	__u64 tainted_at_ns;     /* ktime when taint was first applied */
	__u32 source_table_hash; /* FNV-1a hash of originating table name */
	__u32 _pad;
};

/* ── Token Bucket (XDP Rate Limiter) ─────────────────────────────────── */

struct rate_bucket {
	__u64 tokens;            /* Current available tokens */
	__u64 last_update_ns;    /* ktime of last token refill */
	__u64 fill_rate_per_sec; /* Tokens to add per second */
	__u64 max_tokens;        /* Burst ceiling */
};

/* ── Agent Session ────────────────────────────────────────────────────── */

struct agent_session {
	__u32 agent_id;
	__u32 flags;             /* Runtime flags (KSEC_AGENT_FLAG_*) */
	__u64 lease_nonce;       /* Active lease nonce this session holds */
	__u32 taint_mask;        /* Current taint bitmask */
	__u32 violation_count;   /* Cumulative policy violations */
};

/* ── Agent Flags ──────────────────────────────────────────────────────── */

#define KSEC_AGENT_FLAG_TRUSTED     0x00000001
#define KSEC_AGENT_FLAG_FROZEN      0x00000002
#define KSEC_AGENT_FLAG_TERMINATED  0x00000004
#define KSEC_AGENT_FLAG_TAINTED     0x00000008

/* ── Allowed Ops Bitmask ──────────────────────────────────────────────── */

#define KSEC_OP_CONNECT     (1U << 0)
#define KSEC_OP_SENDMSG     (1U << 1)
#define KSEC_OP_WRITE       (1U << 2)
#define KSEC_OP_READ        (1U << 3)
#define KSEC_OP_IOURING     (1U << 4)
#define KSEC_OP_ALL         0xFFFFFFFF

/* ── Violation Codes ──────────────────────────────────────────────────── */

#define KSEC_VIOLATION_TOCTOU_REPLAY   0x01
#define KSEC_VIOLATION_HASH_MISMATCH   0x02
#define KSEC_VIOLATION_EXPIRED_NONCE   0x03
#define KSEC_VIOLATION_NO_LEASE        0x04
#define KSEC_VIOLATION_IOURING_BYPASS  0x05
#define KSEC_VIOLATION_EXFIL_ATTEMPT   0x06
#define KSEC_VIOLATION_RLS_BREACH      0x07
#define KSEC_VIOLATION_DDL_BLOCKED     0x08
#define KSEC_VIOLATION_RATE_LIMIT      0x09

/* ── Ring Buffer Event Header (common prefix for all events) ─────────── */

struct ksec_event_hdr {
	__u64 timestamp_ns;
	__u32 event_type;      /* KSEC_VIOLATION_* */
	__u32 tgid;
	__u32 agent_id;
	__u32 denied;          /* 1 = execution was blocked */
};

#endif /* __KSEC_COMMON_H */
