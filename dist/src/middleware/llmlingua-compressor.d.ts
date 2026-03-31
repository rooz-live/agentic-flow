/**
 * LLMLingua Prompt Compression Middleware
 * Reduces token consumption for AgentDB historical reflection injection
 */
export interface CompressionOptions {
    targetRatio?: number;
    preserveKeywords?: string[];
    instruction?: string;
}
export interface CompressionResult {
    originalText: string;
    compressedText: string;
    originalTokens: number;
    compressedTokens: number;
    ratio: number;
}
export declare class LLMLinguaCompressor {
    private baseUri;
    constructor(baseUri?: string);
    /**
     * Compresses the provided prompt context (e.g. historical ReflexionMemory trajectories)
     * using an external LLMLingua service. If the service is unreachable, falls back to
     * heuristic text summarization.
     */
    compressPrompt(prompt: string, options?: CompressionOptions): Promise<CompressionResult>;
    /**
     * Local heuristic fallback when the LLMLingua Python microservice isn't running.
     * Strips stop-words, reduces whitespace, and caps length.
     */
    private heuristicFallback;
}
//# sourceMappingURL=llmlingua-compressor.d.ts.map