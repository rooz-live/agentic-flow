/**
 * QUIC Transport Optional Loader
 *
 * Provides graceful fallback when QUIC WASM module is not available.
 * This ensures agentic-flow works on all Node versions without requiring
 * complex native dependencies.
 *
 * @packageDocumentation
 */
import type { QuicTransport, QuicTransportConfig, AgentMessage } from './quic';
/**
 * WebSocket-based fallback transport
 *
 * Used when QUIC is not available. Provides similar API but uses
 * standard WebSocket instead of QUIC protocol.
 */
declare class WebSocketFallbackTransport {
    private connections;
    private config;
    private messageQueue;
    constructor(config: Required<QuicTransportConfig>);
    static create(config?: QuicTransportConfig): Promise<WebSocketFallbackTransport>;
    private getOrCreateConnection;
    send(address: string, message: AgentMessage): Promise<void>;
    receive(address: string): Promise<AgentMessage>;
    getStats(): Promise<{
        active: number;
        idle: number;
        created: number;
        closed: number;
    }>;
    close(): Promise<void>;
    request(address: string, message: AgentMessage): Promise<AgentMessage>;
    sendBatch(address: string, messages: AgentMessage[]): Promise<void>;
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
export declare function loadQuicTransport(config?: QuicTransportConfig): Promise<QuicTransport | WebSocketFallbackTransport>;
/**
 * Check if QUIC transport is available
 *
 * @returns Promise resolving to true if QUIC is available
 */
export declare function isQuicAvailable(): Promise<boolean>;
/**
 * Get transport capabilities
 *
 * @returns Object describing available transport features
 */
export declare function getTransportCapabilities(): Promise<{
    quic: boolean;
    websocket: boolean;
    recommended: string;
    performance: {
        quic: {
            latency: string;
            throughput: string;
            multiplexing: boolean;
            encryption: string;
        };
        websocket: {
            latency: string;
            throughput: string;
            multiplexing: boolean;
            encryption: string;
        };
    };
}>;
export type { QuicTransport, QuicTransportConfig, AgentMessage };
//# sourceMappingURL=quic-loader.d.ts.map