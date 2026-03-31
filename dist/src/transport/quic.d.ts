/**
 * QUIC Transport Layer for Agentic Flow
 *
 * High-performance QUIC protocol implementation using Rust/WASM
 * for ultra-low latency agent communication.
 *
 * Features:
 * - 0-RTT connection establishment (50-70% faster than TCP)
 * - Stream multiplexing (no head-of-line blocking)
 * - Connection pooling with automatic reuse
 * - TLS 1.3 encryption built-in
 *
 * @packageDocumentation
 */
/**
 * QUIC transport configuration
 */
export interface QuicTransportConfig {
    /** Server name for SNI (default: "localhost") */
    serverName?: string;
    /** Maximum idle timeout in milliseconds (min: 1000, default: 30000) */
    maxIdleTimeoutMs?: number;
    /** Maximum concurrent streams per connection (default: 100) */
    maxConcurrentStreams?: number;
    /** Enable 0-RTT connection resumption (default: true) */
    enable0Rtt?: boolean;
}
/**
 * Agent message structure
 */
export interface AgentMessage {
    /** Unique message ID */
    id: string;
    /** Message type */
    type: 'task' | 'result' | 'status' | 'coordination' | 'heartbeat' | string;
    /** Message payload (will be serialized) */
    payload: any;
    /** Optional metadata */
    metadata?: Record<string, any>;
}
/**
 * Connection pool statistics
 */
export interface PoolStatistics {
    /** Number of active connections */
    active: number;
    /** Number of idle connections */
    idle: number;
    /** Total connections created */
    created: number;
    /** Total connections closed */
    closed: number;
}
/**
 * QUIC Transport Client
 *
 * Provides high-level API for QUIC-based agent communication.
 *
 * @example
 * ```typescript
 * const transport = await QuicTransport.create({
 *   serverName: 'agent-proxy.local',
 *   enable0Rtt: true
 * });
 *
 * await transport.connect('127.0.0.1:4433');
 *
 * const message = {
 *   id: 'task-1',
 *   type: 'task',
 *   payload: { action: 'spawn', agentType: 'coder' }
 * };
 *
 * await transport.send('127.0.0.1:4433', message);
 * const response = await transport.receive('127.0.0.1:4433');
 *
 * console.log('Stats:', await transport.getStats());
 * ```
 */
export declare class QuicTransport {
    private wasmClient;
    private config;
    private constructor();
    /**
     * Create new QUIC transport instance
     *
     * @param config - Transport configuration
     * @returns Promise resolving to QuicTransport instance
     */
    static create(config?: QuicTransportConfig): Promise<QuicTransport>;
    /**
     * Send message to server
     *
     * @param address - Server address (e.g., "127.0.0.1:4433")
     * @param message - Agent message to send
     */
    send(address: string, message: AgentMessage): Promise<void>;
    /**
     * Receive message from server
     *
     * @param address - Server address
     * @returns Promise resolving to received message
     */
    receive(address: string): Promise<AgentMessage>;
    /**
     * Get connection pool statistics
     *
     * @returns Pool statistics
     */
    getStats(): Promise<PoolStatistics>;
    /**
     * Close all connections and cleanup resources
     */
    close(): Promise<void>;
    /**
     * Convenience method: Connect and send message
     *
     * @param address - Server address
     * @param message - Message to send
     * @returns Response message
     */
    request(address: string, message: AgentMessage): Promise<AgentMessage>;
    /**
     * Batch send multiple messages concurrently
     *
     * @param address - Server address
     * @param messages - Array of messages to send
     * @returns Promise resolving when all messages are sent
     */
    sendBatch(address: string, messages: AgentMessage[]): Promise<void>;
}
/**
 * Create QUIC transport with default configuration
 *
 * @returns Promise resolving to QuicTransport instance
 */
export declare function createQuicTransport(config?: QuicTransportConfig): Promise<QuicTransport>;
export default QuicTransport;
//# sourceMappingURL=quic.d.ts.map