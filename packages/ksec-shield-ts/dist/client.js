export class KsecClient {
    gatewayUrl;
    apiKey;
    debug;
    constructor(config) {
        this.gatewayUrl = (config.gatewayUrl || 'https://ksec.space').replace(/\/+$/, '');
        this.apiKey = config.apiKey || '';
        this.debug = config.debug ?? false;
    }
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        return headers;
    }
    async fetchPolicies() {
        try {
            const response = await fetch(`${this.gatewayUrl}/api/v1/policies`, {
                method: 'GET',
                headers: this.getHeaders(),
            });
            if (!response.ok) {
                if (this.debug) {
                    console.warn(`[KsecShield] Policy sync status: ${response.status}`);
                }
                return [];
            }
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                return [];
            }
            const data = (await response.json());
            return data.policies || [];
        }
        catch (err) {
            if (this.debug) {
                console.warn(`[KsecShield] Gateway offline, running with local in-memory shield cache.`);
            }
            return [];
        }
    }
    async sendTelemetryBatch(events) {
        if (events.length === 0)
            return;
        try {
            const response = await fetch(`${this.gatewayUrl}/api/v1/telemetry`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ events }),
            });
            if (!response.ok && this.debug) {
                console.warn(`[KsecShield] Telemetry upload status: ${response.status}`);
            }
        }
        catch (err) {
            if (this.debug) {
                console.warn(`[KsecShield] Telemetry buffered locally (gateway unreachable).`);
            }
        }
    }
}
//# sourceMappingURL=client.js.map