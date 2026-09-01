// SPDX-License-Identifier: (LGPL-2.1 OR BSD-2-Clause)
/* Copyright (c) 2026 Agent-eBPF Core Engineering */
#ifndef __CONNECT_TRACE_H__
#define __CONNECT_TRACE_H__

#if defined(__bpf__) || defined(__KERNEL__)
#include "vmlinux.h"
#else
#include <stdint.h>
typedef uint8_t  __u8;
typedef uint16_t __u16;
typedef uint32_t __u32;
typedef uint64_t __u64;
#endif

#define PORT_HTTP        80
#define PORT_HTTPS       443
#define PORT_POSTGRESQL  5432
#define PORT_MYSQL       3306
#define PORT_REDIS       6379
#define PORT_MONGODB     27017

#define CONNECT_ACTION_PASS   1
#define CONNECT_ACTION_ALERT  2
#define CONNECT_ACTION_BLOCK  3

/* Binary layout for connect_event_t (48 bytes):
 *  0: u32 pid
 *  4: u32 tgid
 *  8: u32 src_ip
 * 12: u32 dst_ip
 * 16: u16 src_port
 * 18: u16 dst_port
 * 20: u32 fd
 * 24: u32 is_db_socket
 * 28: u32 action
 * 32: u64 timestamp_ns
 * 40: char comm[16]
 * (Total size: 56 bytes)
 */
struct connect_event_t {
    __u32 pid;
    __u32 tgid;
    __u32 src_ip;
    __u32 dst_ip;
    __u16 src_port;
    __u16 dst_port;
    __u32 fd;
    __u32 is_db_socket;
    __u32 action;
    __u64 timestamp_ns;
    char  comm[16];
};

#endif /* __CONNECT_TRACE_H__ */
