import { KsecShieldConfig, PolicyRule, ShieldTelemetryEvent } from './types.js';

export class KsecClient {
  private gatewayUrl: string;
  private apiKey: string;
  private debug: boolean;

  constructor(config: KsecShieldConfig) {
    this.gatewayUrl = (config.gatewayUrl || 'https://ksec.space').replace(/\/+$/, '');
    this.apiKey = config.apiKey || '';
    this.debug = config.debug ?? false;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  public async fetchPolicies(): Promise<PolicyRule[]> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/v1/policies`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (this.debug) {
          console.warn(`[KsecShield] Failed to fetch policies: ${response.status}`);
        }
        return [];
      }

      const data = (await response.json()) as { policies?: PolicyRule[] };
      return data.policies || [];
    } catch (err) {
      if (this.debug) {
        console.warn(`[KsecShield] Network error fetching policies:`, err);
      }
      throw err;
    }
  }

  public async sendTelemetryBatch(events: ShieldTelemetryEvent[]): Promise<void> {
    if (events.length === 0) return;

    try {
      const response = await fetch(`${this.gatewayUrl}/api/v1/telemetry`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ events }),
      });

      if (!response.ok && this.debug) {
        console.warn(`[KsecShield] Telemetry upload returned ${response.status}`);
      }
    } catch (err) {
      if (this.debug) {
        console.warn(`[KsecShield] Error sending telemetry batch:`, err);
      }
      throw err;
    }
  }
}
