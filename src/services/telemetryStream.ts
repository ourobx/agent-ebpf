/**
 * KSEC Sentinel · Production Real-Time Telemetry & eBPF Stream Service
 * Real-time Server-Sent Events (SSE) and WebSocket Transport Client
 */

import { ForensicEvent } from '../types/telemetry';

export type ConnectionState = 'CONNECTING' | 'LIVE_STREAMING' | 'RECONNECTING' | 'OFFLINE';

export interface TelemetryPayload {
  metrics: {
    interceptedThreats: number;
    astBlocks: number;
    rlsDrops: number;
    ddlDrops: number;
    medianLatencyUs: number;
    p50Us: number;
    p95Us: number;
    p99Us: number;
    jitterUs: number;
    activeRulesCount: number;
    activeLeasesCount: number;
    revokedLeasesCount: number;
    ringbufSaturation: number;
  };
  latencyBins: Array<{
    label: string;
    min: number;
    max: number;
    count: number;
    percentage: number;
  }>;
  kernelHealth: {
    bpfMapUsed: number;
    bpfMapTotal: number;
    bpfMapPercentage: number;
    xdpProcessedMpps: number;
    xdpDropped: number;
    kprobeCpuOverhead: number;
    kernelSlabMemoryMb: number;
    nodeId: string;
    kernelVersion: string;
  };
  liveEvents: ForensicEvent[];
}

class TelemetryService {
  private eventSource: EventSource | null = null;
  private listeners: ((data: TelemetryPayload) => void)[] = [];
  private statusListeners: ((status: ConnectionState) => void)[] = [];
  private state: ConnectionState = 'CONNECTING';
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private endpoint = '/api/v1/telemetry/stream';

  public connect(endpoint: string = '/api/v1/telemetry/stream') {
    this.endpoint = endpoint;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.updateState('CONNECTING');

    try {
      this.eventSource = new EventSource(this.endpoint);

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateState('LIVE_STREAMING');
      };

      this.eventSource.onmessage = (event: MessageEvent) => {
        try {
          const rawData: TelemetryPayload = JSON.parse(event.data);
          this.listeners.forEach((listener) => listener(rawData));
        } catch (err) {
          console.error('[KSEC Telemetry] Malformed stream packet received:', err);
        }
      };

      this.eventSource.onerror = () => {
        this.eventSource?.close();
        this.eventSource = null;
        this.reconnectAttempts++;

        if (this.reconnectAttempts > 5) {
          this.updateState('OFFLINE');
        } else {
          this.updateState('RECONNECTING');
        }

        const backoffMs = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
        this.reconnectTimeout = window.setTimeout(() => {
          this.connect(this.endpoint);
        }, backoffMs);
      };
    } catch (err) {
      console.warn('[KSEC Telemetry] EventSource connection initialization failed:', err);
      this.updateState('OFFLINE');
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.updateState('OFFLINE');
  }

  public subscribe(cb: (data: TelemetryPayload) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public subscribeStatus(cb: (status: ConnectionState) => void) {
    this.statusListeners.push(cb);
    cb(this.state);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== cb);
    };
  }

  public getState(): ConnectionState {
    return this.state;
  }

  private updateState(newState: ConnectionState) {
    this.state = newState;
    this.statusListeners.forEach((cb) => cb(newState));
  }
}

export const telemetryService = new TelemetryService();
