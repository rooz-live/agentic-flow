/**
 * Local LLM Client - GLM-4.7-REAP Integration via vLLM
 *
 * Enables offline inference using locally hosted LLMs for:
 * - Pattern recognition and validation
 * - Code completion and suggestions
 * - Governance decision support
 * - Natural language understanding
 *
 * Recommended model: 0xSero/GLM-4.7-REAP-50-W4A16
 * - Size: 92GB (6.5x compression from 600B)
 * - Optimized for: Code understanding, reasoning, planning
 * - vLLM compatible for efficient serving
 */
import { EventEmitter } from 'events';
export interface LocalLLMConfig {
    endpoint: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stream?: boolean;
    timeout?: number;
    retryAttempts?: number;
    fallbackToRemote?: boolean;
}
export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface LLMCompletionRequest {
    messages: LLMMessage[];
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stream?: boolean;
    stopSequences?: string[];
}
export interface LLMCompletionResponse {
    content: string;
    finishReason: 'stop' | 'length' | 'error';
    tokensUsed: number;
    model: string;
    cached: boolean;
}
export declare class LocalLLMClient extends EventEmitter {
    private config;
    private cache;
    private isHealthy;
    private lastHealthCheck;
    constructor(config: LocalLLMConfig);
    /**
     * Check if local LLM server is healthy
     */
    healthCheck(): Promise<boolean>;
    /**
     * Generate completion from local LLM
     */
    complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;
    /**
     * Generate cache key for request
     */
    private getCacheKey;
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
    };
    /**
     * Warmup: Send a simple request to warm up the model
     */
    warmup(): Promise<boolean>;
}
/**
 * Create local LLM client with environment-based configuration
 */
export declare function createLocalLLMClient(overrides?: Partial<LocalLLMConfig>): LocalLLMClient;
//# sourceMappingURL=local-llm-client.d.ts.map