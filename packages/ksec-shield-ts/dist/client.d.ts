import { KsecShieldConfig, PolicyRule, ShieldTelemetryEvent } from './types.js';
export declare class KsecClient {
    private gatewayUrl;
    private apiKey;
    private debug;
    constructor(config: KsecShieldConfig);
    private getHeaders;
    fetchPolicies(): Promise<PolicyRule[]>;
    sendTelemetryBatch(events: ShieldTelemetryEvent[]): Promise<void>;
}
//# sourceMappingURL=client.d.ts.map