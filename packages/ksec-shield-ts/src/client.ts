import { KsecShieldConfig, PolicyRule, ShieldTelemetryEvent } from './types.js';
import { KsecShieldError } from './errors.js';

export interface ClientOptions {
  /** Gateway URL endpoint (e.g. "https://ksec.space") */
  gatewayUrl?: string;
  /** Base URL endpoint alias for gatewayUrl */
  baseUrl?: string;
  /** Authorization bearer token or API key */
  apiKey?: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
  /** Maximum retry attempts for transient network or 5xx failures (default: 3) */
  maxRetries?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
  /** Custom fetch implementation enjected for testing/mocking */
  fetch?: typeof fetch;
}

export type ClientConfig = ClientOptions;

export class KsecClient {
  readonly #apiKey: string;
  readonly #gatewayUrl: string;
  readonly #timeoutMs: number;
  readonly #maxRetries: number;
  readonly #debug: boolean;
  readonly #fetch: typeof fetch;

  constructor(config: KsecShieldConfig & ClientOptions = {}) {
    const rawUrl = config.gatewayUrl || config.baseUrl || 'https://ksec.space';
    this.#gatewayUrl = rawUrl.replace(/\/+$/, '');
    this.#apiKey = config.apiKey || '';
    this.#timeoutMs = config.timeoutMs ?? 10_000;
    this.#maxRetries = config.maxRetries ?? 3;
    this.#debug = config.debug ?? false;
    this.#fetch = config.fetch ?? globalThis.fetch;
  }

  get gatewayUrl(): string {
    return this.#gatewayUrl;
  }

  get apiKey(): string {
    return this.#apiKey;
  }

  get debug(): boolean {
    return this.#debug;
  }

  /**
   * Universal HTTP executor with AbortController timeout and Full Jitter Exponential Backoff.
   */
  async #request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.#gatewayUrl}${path}`;
    let attempt = 0;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-SDK-Version': '1.1.1',
      ...(init.headers as Record<string, string>),
    };

    if (this.#apiKey) {
      headers['Authorization'] = `Bearer ${this.#apiKey}`;
    }

    while (attempt <= this.#maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.#timeoutMs);

      try {
        const res = await this.#fetch(url, {
          ...init,
          signal: controller.signal,
          headers,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as Record<string, any>;
          const msg = errBody.detail || errBody.message || `HTTP ${res.status} error`;
          
          if (res.status === 401 || res.status === 403) {
            throw new KsecShieldError(msg, 'AUTHENTICATION_FAILED', res.status);
          }
          if (res.status === 429) {
            throw new KsecShieldError(msg, 'RATE_LIMITED', 429);
          }

          throw new KsecShieldError(msg, 'API_ERROR', res.status);
        }

        return (await res.json()) as T;
      } catch (err: any) {
        clearTimeout(timeoutId);

        const isAbort = err.name === 'AbortError';
        const isKnownKsecErr = err instanceof KsecShieldError;
        const isNetworkErr = !err.status && !isAbort && !isKnownKsecErr;
        const isRateLimited = err.status === 429;
        const isServerErr = err.status >= 500;

        if (attempt <= this.#maxRetries && (isNetworkErr || isRateLimited || isServerErr)) {
          // Exponential Backoff + Full Jitter: t = min(maxDelay, base * 2^attempt) * random()
          const baseDelay = 100;
          const maxDelay = 2500;
          const calculatedDelay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
          const jitteredDelay = Math.random() * calculatedDelay;

          if (this.#debug) {
            console.warn(`[KsecClient] Retry attempt ${attempt}/${this.#maxRetries} after ${Math.round(jitteredDelay)}ms`);
          }

          await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
          continue;
        }

        if (isAbort) {
          throw new KsecShieldError('Request timed out.', 'TIMEOUT_ERROR', 408);
        }

        if (isKnownKsecErr) {
          throw err;
        }

        throw new KsecShieldError(err.message || 'Network transport failure.', 'NETWORK_FAILURE', 500);
      }
    }

    throw new KsecShieldError('Maximum retry limit exceeded.', 'MAX_RETRIES_EXCEEDED', 500);
  }

  /**
   * Fetches remote policy rules from Gateway.
   */
  public async fetchPolicies(): Promise<PolicyRule[]> {
    try {
      const data = await this.#request<{ policies?: PolicyRule[] }>('/api/v1/policies', {
        method: 'GET',
      });
      return data.policies || [];
    } catch (err) {
      if (this.#debug) {
        console.warn(`[KsecShield] Gateway policies unreachable, running with local cache.`);
      }
      return [];
    }
  }

  /**
   * Evaluates action remotely against Gateway policies.
   */
  public async evaluatePolicy(payload: {
    actionType: string;
    target: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    allowed: boolean;
    decision: 'ALLOW' | 'BLOCK';
    reason?: string;
    kernelTraceId?: string;
    matchedRule?: string;
  }> {
    try {
      const data = await this.#request<{
        allowed?: boolean;
        decision?: 'ALLOW' | 'BLOCK';
        reason?: string;
        kernel_trace_id?: string;
        kernelTraceId?: string;
        matched_rule?: string;
        matchedRule?: string;
      }>('/api/v1/policy/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          actionType: payload.actionType,
          target: payload.target,
          metadata: payload.metadata || {},
        }),
      });

      const decision = data.decision || (data.allowed ? 'ALLOW' : 'BLOCK');
      const allowed = data.allowed ?? (decision === 'ALLOW');

      return {
        allowed,
        decision,
        reason: data.reason,
        kernelTraceId: data.kernelTraceId || data.kernel_trace_id,
        matchedRule: data.matchedRule || data.matched_rule,
      };
    } catch (err: any) {
      if (this.#debug) {
        console.warn(`[KsecShield] Remote gateway evaluation unreachable: ${err.message}`);
      }
      throw err;
    }
  }

  /**
   * Sends telemetry events batch to Gateway.
   */
  public async sendTelemetryBatch(events: ShieldTelemetryEvent[]): Promise<void> {
    if (events.length === 0) return;

    try {
      await this.#request('/api/v1/telemetry', {
        method: 'POST',
        body: JSON.stringify({ events }),
      });
    } catch (err) {
      if (this.#debug) {
        console.warn(`[KsecShield] Telemetry upload failed (buffered locally).`);
      }
    }
  }

  /**
   * Asynchronous generator consuming Server-Sent Events (SSE) stream from Gateway.
   */
  public async *streamEvents(signal?: AbortSignal): AsyncGenerator<Record<string, unknown>, void, unknown> {
    const url = `${this.#gatewayUrl}/api/v1/telemetry/stream`;
    const headers: Record<string, string> = {
      'Accept': 'text/event-stream',
    };
    if (this.#apiKey) {
      headers['Authorization'] = `Bearer ${this.#apiKey}`;
    }

    const response = await this.#fetch(url, {
      headers,
      signal,
    });

    if (!response.ok || !response.body) {
      throw new KsecShieldError('Telemetry stream connection failed.', 'STREAM_CONNECTION_FAILED', response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const rawJson = trimmed.replace(/^data:\s*/, '');
            try {
              yield JSON.parse(rawJson) as Record<string, unknown>;
            } catch {
              // Ignore malformed JSON chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
