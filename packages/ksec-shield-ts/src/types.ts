/**
 * Type definitions for @ksec/shield SDK.
 */

export interface KsecShieldConfig {
  /** Gateway base URL (defaults to 'https://ksec.space') */
  gatewayUrl?: string;
  /** API Key or OAuth Bearer Token for ksec.space authentication */
  apiKey?: string;
  /** Agent Identifier (e.g. 'agent-support-01') */
  agentId?: string;
  /** Circuit breaker fallback policy: 'fail-open' (allow on network error) or 'fail-closed' (block on error) */
  fallbackPolicy?: 'fail-open' | 'fail-closed';
  /** Policy sync interval in milliseconds (default: 30000ms / 30s) */
  syncIntervalMs?: number;
  /** Batch telemetry interval in milliseconds (default: 5000ms / 5s) */
  telemetryBatchIntervalMs?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export type ActionType = 
  | 'network_egress' 
  | 'tool_execution' 
  | 'file_system' 
  | 'syscall' 
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
}

export type ShieldEventType = 'threat_blocked' | 'policy_synced' | 'telemetry_flushed' | 'error';
export type ShieldEventListener = (event: Record<string, unknown>) => void;
