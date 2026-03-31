/**
 * GLM-4.7-REAP Local LLM Client
 *
 * Integrates with Hugging Face models via vLLM OpenAI-compatible API:
 * - 0xSero/GLM-4.7-REAP-50-W4A16 (~92GB, 50% pruned, INT4)
 * - 0xSero/GLM-4.7-REAP-218B-A32B-W4A16 (~116GB, 40% pruned)
 *
 * Requirements:
 * - vLLM server running locally (port 8000)
 * - Model downloaded from Hugging Face
 * - ~95GB VRAM (fits 2x A100 40GB)
 *
 * Setup:
 *   # Install vLLM
 *   pip install vllm
 *
 *   # Start server
 *   python -m vllm.entrypoints.openai.api_server \
 *     --model 0xSero/GLM-4.7-REAP-50-W4A16 \
 *     --port 8000 \
 *     --tensor-parallel-size 2
 *
 * @see https://huggingface.co/0xSero/GLM-4.7-REAP-50-W4A16
 * @see https://docs.vllm.ai/en/latest/
 */
export interface GLMREAPConfig {
    endpoint?: string;
    model?: string;
    apiKey?: string;
    timeout?: number;
}
export interface GLMREAPCompletionRequest {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
    stream?: boolean;
}
export interface GLMREAPCompletionResponse {
    completion: string;
    tokens: number;
    finishReason: 'stop' | 'length' | 'error';
    model: string;
    latencyMs: number;
}
export interface GLMREAPChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface GLMREAPChatRequest {
    messages: GLMREAPChatMessage[];
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
}
export declare class GLMREAPClient {
    private config;
    constructor(config?: GLMREAPConfig);
    /**
     * Generate completion (OpenAI-compatible API)
     */
    complete(request: GLMREAPCompletionRequest): Promise<GLMREAPCompletionResponse>;
    /**
     * Chat completion (OpenAI-compatible API)
     */
    chat(request: GLMREAPChatRequest): Promise<GLMREAPCompletionResponse>;
    /**
     * Format chat messages into prompt (GLM-4 format)
     */
    private formatChatPrompt;
    /**
     * Call vLLM OpenAI-compatible API
     */
    private callVLLMAPI;
    /**
     * Health check - verify vLLM server is running
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get model information
     */
    getModelInfo(): Promise<{
        name: string;
        parameterCount: string;
        quantization: string;
        pruningRate: string;
        vramRequired: string;
    }>;
}
/**
 * Factory function
 */
export declare function createGLMREAPClient(config?: GLMREAPConfig): GLMREAPClient;
/**
 * Example usage
 */
export declare function exampleUsage(): Promise<void>;
//# sourceMappingURL=glm-reap-client.d.ts.map