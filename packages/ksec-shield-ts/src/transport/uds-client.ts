import net from 'node:net';
import { EventEmitter } from 'node:events';
import type { FailMode } from '../types.js';

export interface UdsClientOptions {
  socketPath?: string;
  timeoutMs?: number;
  failMode?: FailMode;
  fallbackPolicy?: FailMode; // backward compatibility
}

export interface PolicyCheckPayload {
  actionType: string;
  target: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyCheckResponse {
  allowed: boolean;
  decision?: 'ALLOW' | 'BLOCK';
  reason?: string;
  kernelTraceId?: string;
  ruleId?: string;
}

export class UdsTransportClient extends EventEmitter {
  private socketPath: string;
  private timeoutMs: number;
  private failMode: FailMode;

  constructor(options: UdsClientOptions = {}) {
    super();
    const defaultPath = process.platform === 'win32' 
      ? '\\\\.\\pipe\\agent-ebpf' 
      : '/var/run/agent-ebpf.sock';
    
    this.socketPath = options.socketPath || defaultPath;
    this.timeoutMs = options.timeoutMs ?? 50; // Kernel IPC 50ms fast timeout
    this.failMode = options.failMode || options.fallbackPolicy || 'fail-closed';
  }

  /**
   * Evaluates action against local eBPF daemon via Unix Domain Socket / Named Pipe.
   */
  public async evaluate(payload: PolicyCheckPayload): Promise<PolicyCheckResponse> {
    return new Promise((resolve) => {
      let isResolved = false;
      const client = new net.Socket();

      const finish = (result: PolicyCheckResponse) => {
        if (!isResolved) {
          isResolved = true;
          client.destroy();
          resolve(result);
        }
      };

      // Set timeout for both connection and read
      client.setTimeout(this.timeoutMs);

      client.on('timeout', () => {
        const allowed = this.failMode === 'fail-open';
        finish({
          allowed,
          decision: allowed ? 'ALLOW' : 'BLOCK',
          reason: `UDS daemon timeout (${this.timeoutMs}ms) - Handled with ${this.failMode}`,
        });
      });

      client.on('error', (err: NodeJS.ErrnoException) => {
        const allowed = this.failMode === 'fail-open';
        this.emit('transport_error', err);
        finish({
          allowed,
          decision: allowed ? 'ALLOW' : 'BLOCK',
          reason: `UDS connection failed (${err.code || err.message}) - Handled with ${this.failMode}`,
        });
      });

      client.connect(this.socketPath, () => {
        const message = JSON.stringify({
          version: 'v1',
          timestamp: Date.now(),
          ...payload,
        }) + '\n';

        client.write(message);
      });

      let buffer = '';
      client.on('data', (data) => {
        buffer += data.toString();
        if (buffer.includes('\n')) {
          try {
            const parsed = JSON.parse(buffer.trim()) as PolicyCheckResponse;
            if (parsed.allowed === undefined && parsed.decision) {
              parsed.allowed = parsed.decision === 'ALLOW';
            }
            if (parsed.decision === undefined && parsed.allowed !== undefined) {
              parsed.decision = parsed.allowed ? 'ALLOW' : 'BLOCK';
            }
            finish(parsed);
          } catch {
            const allowed = this.failMode === 'fail-open';
            finish({
              allowed,
              decision: allowed ? 'ALLOW' : 'BLOCK',
              reason: `Malformed UDS response - Handled with ${this.failMode}`,
            });
          }
        }
      });
    });
  }

  /**
   * Alias for evaluate matching legacy API.
   */
  public async checkPolicy(action: string, target: string, metadata?: Record<string, unknown>): Promise<PolicyCheckResponse> {
    return this.evaluate({ actionType: action, target, metadata });
  }

  public getSocketPath(): string {
    return this.socketPath;
  }

  public getFailMode(): FailMode {
    return this.failMode;
  }
}

// Alias for backward compatibility
export { UdsTransportClient as LocalUdsClient };
