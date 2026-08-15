/**
 * Type definitions for @ourobx/shield SDK.
 */

export type FailMode = 'fail-open' | 'fail-closed';

export interface KsecShieldConfig {
  /** Gateway base URL (defaults to 'https://ksec.space') */
  gatewayUrl?: string;
  /** API Key or OAuth Bearer Token for ksec.space authentication */
  apiKey?: string;
  /** Agent Identifier (e.g. 'agent-support-01') */
  agentId?: string;
  /** Circuit breaker fallback policy: 'fail-open' (allow on network error) or 'fail-closed' (block on error) */
  fallbackPolicy?: FailMode;
  /** Policy sync interval in milliseconds (default: 30000ms / 30s) */
  syncIntervalMs?: number;
  /** Batch telemetry interval in milliseconds (default: 5000ms / 5s) */
  telemetryBatchIntervalMs?: number;
  /** Custom Unix Domain Socket or Named Pipe path for local eBPF daemon */
  udsSocketPath?: string;
  /** Timeout for UDS daemon requests in milliseconds (default: 50ms) */
  udsTimeoutMs?: number;
  /** Enable local kernel UDS verification in hybrid guard pipeline (default: false) */
  enableKernelUds?: boolean;
  /** Enable OpenTelemetry exporter */
  enableOTel?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

export type ActionType = 
  | 'network_egress' 
  | 'network_request'
  | 'tool_execution' 
  | 'file_system' 
  | 'syscall'
  | 'system_call'
  | 'memory_access';

export interface GuardOptions {
  /** The action type being guarded */
  actionType: ActionType;
  /** Target resource (e.g. IP '1.1.1.1', domain 'api.badsite.com', or tool 'bash_exec') */
  target: string;
  /** Optional metadata payload */
  metadata?: Record<string, unknown>;
  /** Custom timeout in milliseconds for policy validation */
  timeoutMs?: number;
}

export interface PolicyRule {
  id: string;
  actionType: ActionType;
  target: string;
  decision: 'ALLOW' | 'BLOCK';
  reason?: string;
  ttlSeconds?: number;
}

export interface ShieldTelemetryEvent {
  id: string;
  agentId: string;
  actionType: ActionType;
  target: string;
  decision: 'ALLOW' | 'BLOCK';
  durationMs: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
  reason?: string;
  kernelTraceId?: string;
}

export interface ThreatBlockedEvent {
  id: string;
  actionType: ActionType | string;
  target: string;
  reason: string;
  timestamp: string;
  kernelTraceId?: string;
  metadata?: Record<string, unknown>;
  ruleId?: string;
}

export type ShieldEventType = 'threat_blocked' | 'policy_synced' | 'telemetry_flushed' | 'transport_error' | 'error';
export type ShieldEventListener = (event: Record<string, unknown>) => void;
