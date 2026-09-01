-- KSEC High-Throughput eBPF Telemetry Schema for ClickHouse
CREATE DATABASE IF NOT EXISTS ksec_telemetry;

CREATE TABLE IF NOT EXISTS ksec_telemetry.events (
    timestamp DateTime64(3, 'UTC') CODEC(DoubleDelta, ZSTD(1)),
    tenant_id LowCardinality(String),
    node_id LowCardinality(String),
    pid UInt32 CODEC(T64, ZSTD(1)),
    uid UInt32 CODEC(T64, ZSTD(1)),
    comm String CODEC(ZSTD(3)),
    event_type LowCardinality(String),
    syscall LowCardinality(String),
    severity LowCardinality(String),
    saddr IPv4,
    daddr IPv4,
    sport UInt16,
    dport UInt16,
    details String CODEC(ZSTD(3))
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, node_id, timestamp, pid)
SETTINGS index_granularity = 8192;
