import net from 'node:net';
import { EventEmitter } from 'node:events';
export class UdsTransportClient extends EventEmitter {
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
            const client = new net.Socket();
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
// Alias for backward compatibility
export { UdsTransportClient as LocalUdsClient };
//# sourceMappingURL=uds-client.js.map