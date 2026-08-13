"use strict";
/**
 * Zero-Config Auto-Instrumentation for Node.js / TypeScript AI Agents.
 *
 * Usage:
 *   import '@ksec/shield/auto';
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultShield = void 0;
const index_js_1 = require("./index.js");
const gatewayUrl = (typeof process !== 'undefined' && process.env?.KSEC_GATEWAY_URL) || 'https://ksec.space';
const apiKey = typeof process !== 'undefined' ? process.env?.KSEC_API_KEY : undefined;
exports.defaultShield = new index_js_1.KsecShield({
    gatewayUrl,
    apiKey,
    agentId: (typeof process !== 'undefined' && process.env?.KSEC_AGENT_ID) || 'auto-injected-node-agent',
});
// Auto-patch global fetch
if (typeof globalThis.fetch === 'function') {
    globalThis.fetch = exports.defaultShield.protectFetch(globalThis.fetch);
}
//# sourceMappingURL=auto.js.map