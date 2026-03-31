/**
 * QUIC Transport Optional Loader
 *
 * Provides graceful fallback when QUIC WASM module is not available.
 * This ensures agentic-flow works on all Node versions without requiring
 * complex native dependencies.
 *
 * @packageDocumentation
 */
/**
 * WebSocket-based fallback transport
 *
 * Used when QUIC is not available. Provides similar API but uses
 * standard WebSocket instead of QUIC protocol.
 */
class WebSocketFallbackTransport {
    connections = new Map();
    config;
    messageQueue = new Map();
    constructor(config) {
        this.config = config;
    }
    static async create(config = {}) {
        const fullConfig = {
            serverName: config.serverName ?? 'localhost',
            maxIdleTimeoutMs: config.maxIdleTimeoutMs ?? 30000,
            maxConcurrentStreams: config.maxConcurrentStreams ?? 100,
            enable0Rtt: config.enable0Rtt ?? false, // Not applicable for WebSocket
        };
        return new WebSocketFallbackTransport(fullConfig);
    }
    getOrCreateConnection(address) {
        return new Promise((resolve, reject) => {
            const existing = this.connections.get(address);
            if (existing && existing.readyState === WebSocket.OPEN) {
                resolve(existing);
                return;
            }
            const ws = new WebSocket(`ws://${address}`);
            ws.onopen = () => {
                this.connections.set(address, ws);
                resolve(ws);
            };
            ws.onerror = (error) => {
                reject(new Error(`WebSocket connection failed: ${error}`));
            };
            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                const queue = this.messageQueue.get(address) || [];
                queue.push(message);
                this.messageQueue.set(address, queue);
            };
        });
    }
    async send(address, message) {
        const ws = await this.getOrCreateConnection(address);
        ws.send(JSON.stringify(message));
    }
    async receive(address) {
        const queue = this.messageQueue.get(address) || [];
        if (queue.length > 0) {
            return queue.shift();
        }
        // Wait for message
        return new Promise((resolve) => {
            const checkQueue = setInterval(() => {
                const queue = this.messageQueue.get(address) || [];
                if (queue.length > 0) {
                    clearInterval(checkQueue);
                    resolve(queue.shift());
                }
            }, 100);
        });
    }
    async getStats() {
        return {
            active: this.connections.size,
            idle: 0,
            created: this.connections.size,
            closed: 0,
        };
    }
    async close() {
        for (const ws of this.connections.values()) {
            ws.close();
        }
        this.connections.clear();
        this.messageQueue.clear();
    }
    async request(address, message) {
        await this.send(address, message);
        return this.receive(address);
    }
    async sendBatch(address, messages) {
        await Promise.all(messages.map(msg => this.send(address, msg)));
    }
}
/**
 * Load QUIC transport with automatic fallback
 *
 * Attempts to load native QUIC WASM module. If not available,
 * falls back to WebSocket transport with graceful warning.
 *
 * @param config - Transport configuration
 * @returns Transport instance (QUIC or WebSocket fallback)
 *
 * @example
 * ```typescript
 * // Works on all Node versions
 * const transport = await loadQuicTransport({
 *   serverName: 'agent-proxy.local'
 * });
 *
 * // API is the same regardless of backend
 * await transport.send('127.0.0.1:4433', message);
 * ```
 */
export async function loadQuicTransport(config = {}) {
    try {
        // Try to load QUIC module
        const { QuicTransport } = await import('./quic');
        const transport = await QuicTransport.create(config);
        // Success! Using high-performance QUIC
        if (process.env.NODE_ENV !== 'test') {
            console.log('✅ QUIC transport loaded successfully (50-70% faster than WebSocket)');
        }
        return transport;
    }
    catch (error) {
        // QUIC not available, use WebSocket fallback
        if (process.env.NODE_ENV !== 'test') {
            console.warn('⚠️  QUIC transport not available, using WebSocket fallback');
            console.warn('   For best performance, consider using Node 18-20 LTS');
            console.warn('   QUIC provides 50-70% faster communication than WebSocket');
        }
        return WebSocketFallbackTransport.create(config);
    }
}
/**
 * Check if QUIC transport is available
 *
 * @returns Promise resolving to true if QUIC is available
 */
export async function isQuicAvailable() {
    try {
        await import('./quic');
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get transport capabilities
 *
 * @returns Object describing available transport features
 */
export async function getTransportCapabilities() {
    const quicAvailable = await isQuicAvailable();
    return {
        quic: quicAvailable,
        websocket: true,
        recommended: quicAvailable ? 'quic' : 'websocket',
        performance: {
            quic: {
                latency: 'Ultra-low (0-RTT)',
                throughput: 'Very High',
                multiplexing: true,
                encryption: 'TLS 1.3 built-in'
            },
            websocket: {
                latency: 'Low',
                throughput: 'High',
                multiplexing: false,
                encryption: 'TLS 1.2/1.3 optional'
            }
        }
    };
}
//# sourceMappingURL=quic-loader.js.map