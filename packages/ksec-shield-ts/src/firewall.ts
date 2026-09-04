/**
 * ksec-shield-ts: Official TypeScript SDK for ksec.space AI Firewall & Policy Engine.
 * Supports Node.js, Bun, Deno, Cloudflare Workers, and Browser environments.
 */

export interface IngressIndicator {
  rule: string;
  severity: "INFO" | "WARN" | "CRIT" | "CRITICAL";
  description: string;
  matched?: string;
}

export interface IngressVerdict {
  verdict: "ALLOW" | "BLOCK";
  threat_score: number;
  threat_level: "SAFE" | "SUSPICIOUS" | "CRITICAL";
  is_blocked: boolean;
  indicators: IngressIndicator[];
  sanitized_prompt?: string;
}

export interface EgressVerdict {
  has_violation: boolean;
  should_block: boolean;
  violation_categories: string[];
  sanitized_text: string;
  matches_count: number;
}

export interface InspectResult {
  status: "success" | "error";
  tenant_id: string;
  policy_name: string;
  latency_ms: number;
  ingress?: IngressVerdict;
  egress?: EgressVerdict;
}

export interface ComplianceReport {
  report_id: string;
  tenant_id: string;
  generated_at: string;
  compliance_standards: string[];
  applied_policies: string[];
  verdict: string;
  audit_seal_sha256: string;
  metrics: {
    total_requests: number;
    allowed_requests: number;
    blocked_injections: number;
    redacted_pii_events: number;
    avg_latency_ms: number;
    violations_by_category: Record<string, number>;
  };
  recommendations: string[];
}

export interface KsecConfig {
  apiKey?: string;
  baseUrl?: string;
  tenantId?: string;
  timeoutMs?: number;
}

export class KsecAIFirewall {
  private apiKey: string;
  private baseUrl: string;
  private tenantId: string;
  private timeoutMs: number;

  constructor(config: KsecConfig = {}) {
    this.apiKey = config.apiKey || (typeof process !== "undefined" ? process.env?.KSEC_API_KEY || "" : "");
    this.baseUrl = (config.baseUrl || (typeof process !== "undefined" ? process.env?.KSEC_BASE_URL || "https://api.ksec.space" : "https://api.ksec.space")).replace(/\/+$/, "");
    this.tenantId = config.tenantId || "global";
    this.timeoutMs = config.timeoutMs || 10000;
  }

  /**
   * Inspects prompt text for Prompt Injections and PII/Secret leakage.
   */
  async inspect(
    text: string,
    options: { checkIngress?: boolean; checkEgress?: boolean } = {}
  ): Promise<InspectResult> {
    const checkIngress = options.checkIngress ?? true;
    const checkEgress = options.checkEgress ?? true;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const resp = await fetch(`${this.baseUrl}/v1/guard/inspect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-KSEC-Policy-Key": this.apiKey,
        },
        body: JSON.stringify({
          text,
          tenant_id: this.tenantId,
          check_ingress: checkIngress,
          check_egress: checkEgress,
        }),
        signal: controller.signal,
      });

      return (await resp.json()) as InspectResult;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Fetches the official cryptographically sealed KVKK / GDPR / EU AI Act 2026 compliance certificate.
   */
  async getComplianceReport(periodDays = 30): Promise<ComplianceReport> {
    const resp = await fetch(
      `${this.baseUrl}/v1/guard/compliance/report?tenant_id=${encodeURIComponent(this.tenantId)}&period_days=${periodDays}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-KSEC-Policy-Key": this.apiKey,
        },
      }
    );
    const data = await resp.json();
    return data.report as ComplianceReport;
  }

  /**
   * Wraps fetch for standard OpenAI SDK requests, redirecting to ksec.space gateway.
   */
  createGuardedOpenAIFetch(): typeof fetch {
    const baseUrl = this.baseUrl;
    const apiKey = this.apiKey;
    const tenantId = this.tenantId;

    return async (url: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = url.toString();
      const targetUrl = urlStr.replace(/^https:\/\/api\.openai\.com/, baseUrl);

      const headers = new Headers(init?.headers || {});
      headers.set("X-KSEC-Policy-Key", apiKey || tenantId);

      return fetch(targetUrl, {
        ...init,
        headers,
      });
    };
  }
}
