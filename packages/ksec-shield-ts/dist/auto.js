/**
 * Zero-Config Auto-Instrumentation for Node.js / TypeScript AI Agents.
 *
 * Usage:
 *   import '@ksec/shield/auto';
 */
import { KsecShield } from './index.js';
const gatewayUrl = (typeof process !== 'undefined' && process.env?.KSEC_GATEWAY_URL) || 'https://ksec.space';
const apiKey = typeof process !== 'undefined' ? process.env?.KSEC_API_KEY : undefined;
export const defaultShield = new KsecShield({
    gatewayUrl,
    apiKey,
    agentId: (typeof process !== 'undefined' && process.env?.KSEC_AGENT_ID) || 'auto-injected-node-agent',
});
// Auto-patch global fetch
if (typeof globalThis.fetch === 'function') {
    globalThis.fetch = defaultShield.protectFetch(globalThis.fetch);
}
//# sourceMappingURL=auto.js.map