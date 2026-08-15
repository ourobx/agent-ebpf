"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalUdsClient = exports.UdsTransportClient = void 0;
const node_net_1 = __importDefault(require("node:net"));
const node_events_1 = require("node:events");
class UdsTransportClient extends node_events_1.EventEmitter {
    socketPath;
    timeoutMs;
    failMode;
    constructor(options = {}) {
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
    async evaluate(payload) {
        return new Promise((resolve) => {
            let isResolved = false;
            const client = new node_net_1.default.Socket();
            const finish = (result) => {
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
            client.on('error', (err) => {
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
                        const parsed = JSON.parse(buffer.trim());
                        if (parsed.allowed === undefined && parsed.decision) {
                            parsed.allowed = parsed.decision === 'ALLOW';
                        }
                        if (parsed.decision === undefined && parsed.allowed !== undefined) {
                            parsed.decision = parsed.allowed ? 'ALLOW' : 'BLOCK';
                        }
                        finish(parsed);
                    }
                    catch {
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
    async checkPolicy(action, target, metadata) {
        return this.evaluate({ actionType: action, target, metadata });
    }
    getSocketPath() {
        return this.socketPath;
    }
    getFailMode() {
        return this.failMode;
    }
}
exports.UdsTransportClient = UdsTransportClient;
exports.LocalUdsClient = UdsTransportClient;
//# sourceMappingURL=uds-client.js.map