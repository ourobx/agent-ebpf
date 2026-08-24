/**
 * KSEC Shield · Telemetry & Forensics Type Definitions
 * Enterprise B2B Cybersecurity Standards
 */

export interface LatencyQuantiles {
  p50: number; // in microseconds (µs)
  p95: number;
  p99: number;
  jitter: number;
  ringbufSaturation: number; // percentage
}

export interface HistogramBin {
  label: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export type LeaseState = 'CRYPTOGRAPHICALLY_VERIFIED' | 'INTENT_MISMATCH_BLOCKED' | 'LEASE_EXPIRED' | 'REVOKED';

export interface IntentLeaseProof {
  leaseTokenId: string;
  agentId: string;
  ed25519Signature: string;
  astFingerprintSha256: string;
  declaredIntent: {
    tool: string;
    action: string;
    parameters: Record<string, unknown>;
  };
  interceptedSyscall: {
    syscall: string;
    rawPayload: string;
    target: string;
  };
  leaseState: LeaseState;
  diffSummary: string;
}

export interface KernelHealthMetrics {
  bpfMapCapacity: {
    used: number;
    total: number;
    percentage: number;
  };
  xdpThroughput: {
    processedMpps: number;
    droppedLineRate: number;
  };
  kprobeOverheadPercent: number;
  memoryFootprintMb: number;
  lastSyncUtc: string;
}

export interface ForensicEvent {
  id: string;
  timestamp: string;
  action: 'PASS' | 'DROP' | 'REDACT';
  agent_id: string;
  syscall: string;
  query: string;
  hash: string;
  latency: string;
  policy: string;
  intentLease?: IntentLeaseProof;
  ast: Record<string, unknown>;
}
