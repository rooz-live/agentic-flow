/**
 * GLM-4.7-REAP Local LLM Integration
 *
 * Supports offline inference with GLM-4.7-REAP models:
 * - GLM-4.7-REAP-50-W4A16 (~92GB, 50% pruned, INT4)
 * - GLM-4.7-REAP-218B-A32B-W4A16 (~116GB, 40% pruned, INT4)
 *
 * Features:
 * - Offline inference capability
 * - Fallback logic (cloud → local)
 * - Function calling support
 * - Code generation optimization
 * - vLLM deployment ready
 *
 * Based on: https://huggingface.co/0xSero/GLM-4.7-REAP-50-W4A16
 */
export type GLMVariant = '50' | '218B';
export interface GLMConfig {
    /**
     * Model variant to use
     */
    variant: GLMVariant;
    /**
     * vLLM server endpoint (if using deployed model)
     */
    serverEndpoint?: string;
    /**
     * Model path for local loading
     */
    modelPath?: string;
    /**
     * Maximum context length
     */
    maxModelLen?: number;
    /**
     * Enable function calling
     */
    enableFunctionCalling?: boolean;
    /**
     * Fallback to cloud API if local fails
     */
    enableCloudFallback?: boolean;
    /**
     * Cloud API endpoint
     */
    cloudEndpoint?: string;
    /**
     * Cloud API key
     */
    cloudApiKey?: string;
}
export interface GenerateOptions {
    /**
     * Sampling temperature (0.0-2.0)
     */
    temperature?: number;
    /**
     * Top-p nucleus sampling
     */
    topP?: number;
    /**
     * Maximum tokens to generate
     */
    maxTokens?: number;
    /**
     * Stop sequences
     */
    stop?: string[];
    /**
     * Enable streaming
     */
    stream?: boolean;
    /**
     * System prompt
     */
    systemPrompt?: string;
    /**
     * Available functions for tool calling
     */
    functions?: Function[];
}
export interface GenerateResponse {
    /**
     * Generated text
     */
    text: string;
    /**
     * Completion reason
     */
    finishReason: 'stop' | 'length' | 'function_call' | 'error';
    /**
     * Token usage statistics
     */
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    /**
     * Function call if applicable
     */
    functionCall?: {
        name: string;
        arguments: Record<string, any>;
    };
    /**
     * Model used (local or cloud)
     */
    model: string;
    /**
     * Whether fallback was used
     */
    usedFallback: boolean;
}
export declare class GLMReapClient {
    private config;
    private modelReady;
    constructor(config: GLMConfig);
    /**
     * Initialize the model (load or connect to server)
     */
    initialize(): Promise<void>;
    /**
     * Generate text completion
     */
    generate(prompt: string, options?: GenerateOptions): Promise<GenerateResponse>;
    /**
     * Generate with streaming
     */
    generateStream(prompt: string, options?: GenerateOptions): AsyncGenerator<string, void, unknown>;
    /**
     * Check if model is ready
     */
    isReady(): boolean;
    /**
     * Get model specifications
     */
    getModelSpecs(): {
        variant: GLMVariant;
        sizeGB: number;
        pruning: string;
        quantization: string;
    };
    private generateLocal;
    private generateCloud;
    private checkServerHealth;
    private loadModelLocally;
    private getModelName;
    private buildPrompt;
}
/**
 * Helper function to create GLM-REAP client with sensible defaults
 */
export declare function createGLMClient(options?: Partial<GLMConfig>): GLMReapClient;
//# sourceMappingURL=glm-reap-client.d.ts.map