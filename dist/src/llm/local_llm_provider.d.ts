/**
 * Local LLM Provider - Offline Inference Support
 *
 * Integrates local LLM models (HuggingFace) for offline inference.
 * Primary model: GLM-4.7-REAP (pruned + quantized) for efficient deployment.
 *
 * Models supported:
 * - GLM-4.7-REAP-50-W4A16: 50% pruned + INT4 quantized (~92GB, 179B params)
 * - GLM-4.7-REAP-218B-A32B-W4A16: 40% pruned + INT4 quantized (~108GB, 218B params)
 *
 * Based on:
 * - https://huggingface.co/0xSero/GLM-4.7-REAP-50-W4A16
 * - https://huggingface.co/0xSero/GLM-4.7-REAP-218B-A32B-W4A16
 *
 * WSJF Score: 3.33 (High value for offline capability)
 */
export interface LocalLLMConfig {
    modelId: string;
    modelPath?: string;
    quantization: 'int4' | 'int8' | 'fp16' | 'bf16';
    device: 'cpu' | 'cuda' | 'mps';
    maxTokens: number;
    temperature: number;
    topP: number;
}
export interface LocalLLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface LocalLLMResponse {
    content: string;
    tokens: number;
    inferenceTimeMs: number;
    model: string;
}
export interface ModelMetadata {
    name: string;
    size: string;
    parameters: string;
    quantization: string;
    vramRequired: string;
    compression: string;
    capabilities: string[];
}
export declare const SUPPORTED_MODELS: Record<string, ModelMetadata>;
export declare class LocalLLMProvider {
    private config;
    private modelLoaded;
    private pythonProcess;
    private modelCache;
    constructor(config?: Partial<LocalLLMConfig>);
    /**
     * Initialize local LLM model
     * Downloads from HuggingFace if not cached locally
     */
    initialize(): Promise<void>;
    /**
     * Generate response from local LLM
     */
    generate(messages: LocalLLMMessage[]): Promise<LocalLLMResponse>;
    /**
     * Stream response from local LLM (generator pattern)
     */
    generateStream(messages: LocalLLMMessage[]): AsyncGenerator<string, void, unknown>;
    /**
     * Get model capabilities
     */
    getCapabilities(): string[];
    /**
     * Check if model supports specific capability
     */
    hasCapability(capability: string): boolean;
    /**
     * Unload model from memory
     */
    unload(): Promise<void>;
    private detectDevice;
    private getModelCacheDir;
    private checkModelExists;
    private downloadModel;
    private loadModel;
    private formatChatMessages;
    private runInference;
    private runInferenceStreaming;
    private runPythonScript;
}
/**
 * Example: Initialize and use local LLM
 */
export declare function exampleUsage(): Promise<void>;
/**
 * Example: Streaming generation
 */
export declare function exampleStreaming(): Promise<void>;
export default LocalLLMProvider;
//# sourceMappingURL=local_llm_provider.d.ts.map