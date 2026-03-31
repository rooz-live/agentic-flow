/**
 * GLM-4.7-REAP Local LLM Integration
 *
 * Provides offline inference capability using:
 * - GLM-4.7-REAP-50-W4A16 (179B params, ~92GB) - Smaller, faster
 * - GLM-4.7-REAP-218B-A32B-W4A16 (218B params, ~108GB) - Larger, more accurate
 *
 * Benefits:
 * - ~6.5x compression from original 700GB
 * - Offline capability for edge deployments
 * - Reduced API costs
 * - Lower latency for local decisions
 * - INT4 quantization (AutoRound W4A16)
 *
 * @see https://huggingface.co/0xSero/GLM-4.7-REAP-50-W4A16
 * @see https://huggingface.co/0xSero/GLM-4.7-REAP-218B-A32B-W4A16
 */
import { EventEmitter } from 'events';
export interface GLMConfig {
    modelVariant: 'small' | 'large';
    modelPath: string;
    vramGB: number;
    gpuLayers?: number;
    batchSize?: number;
    contextLength?: number;
    temperature?: number;
    topP?: number;
}
export interface GLMModelSpecs {
    name: string;
    totalParams: string;
    activeParams: string;
    diskSize: string;
    vramRequired: string;
    quantization: string;
    compression: string;
    features: string[];
}
export interface InferenceRequest {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
}
export interface InferenceResponse {
    text: string;
    tokensGenerated: number;
    latencyMs: number;
    model: string;
    source: 'local' | 'api';
}
export declare const GLM_MODELS: Record<'small' | 'large', GLMModelSpecs>;
export declare class GLMLocalLLM extends EventEmitter {
    private config;
    private isLoaded;
    private fallbackToAPI;
    private inferenceStats;
    constructor(config?: Partial<GLMConfig>);
    private getDefaultModelPath;
    private validateConfig;
    loadModel(): Promise<void>;
    private loadLocalModel;
    infer(request: InferenceRequest): Promise<InferenceResponse>;
    private inferLocal;
    private inferAPI;
    private generateMockResponse;
    getStats(): {
        localPercentage: string;
        apiPercentage: string;
        avgLatencyDiff: string;
        totalInferences: number;
        localInferences: number;
        apiInferences: number;
        avgLatencyLocal: number;
        avgLatencyAPI: number;
    };
    getModelSpecs(): GLMModelSpecs;
    isModelLoaded(): boolean;
    unloadModel(): void;
}
export declare function createGLMInstance(variant?: 'small' | 'large'): Promise<GLMLocalLLM>;
export declare const INSTALLATION_GUIDE = "\n# GLM-4.7-REAP Local LLM Setup\n\n## Prerequisites\n- Python 3.10+\n- CUDA 12.1+\n- 100-120GB VRAM (A100 80GB x2 or H100)\n\n## Installation\n\n### Option 1: vLLM (Recommended for Production)\n```bash\npip install vllm\npip install autoround\n\n# Download model\nhuggingface-cli download 0xSero/GLM-4.7-REAP-50-W4A16\n\n# Start server\npython -m vllm.entrypoints.openai.api_server \\\n  --model 0xSero/GLM-4.7-REAP-50-W4A16 \\\n  --gpu-memory-utilization 0.9 \\\n  --max-model-len 32768 \\\n  --tensor-parallel-size 2 \\\n  --quantization autoround \\\n  --port 8000\n```\n\n### Option 2: Transformers (Development)\n```bash\npip install transformers autoround torch\n\n# Python usage\nfrom transformers import AutoModelForCausalLM, AutoTokenizer\n\nmodel = AutoModelForCausalLM.from_pretrained(\n    \"0xSero/GLM-4.7-REAP-50-W4A16\",\n    device_map=\"auto\",\n    trust_remote_code=True\n)\ntokenizer = AutoTokenizer.from_pretrained(\n    \"0xSero/GLM-4.7-REAP-50-W4A16\",\n    trust_remote_code=True\n)\n```\n\n## Integration with agentic-flow\n\n```typescript\nimport { createGLMInstance } from './src/llm/local-glm-integration';\n\n// Create instance\nconst glm = await createGLMInstance('small'); // or 'large'\n\n// Inference\nconst response = await glm.infer({\n  prompt: \"Explain AISP proof-carrying protocol\",\n  maxTokens: 500,\n  temperature: 0.7\n});\n\nconsole.log(response.text);\nconsole.log(`Source: ${response.source} (local or API)`);\nconsole.log(`Latency: ${response.latencyMs}ms`);\n\n// Stats\nconsole.log(glm.getStats());\n```\n\n## Model Selection\n\n- **Small (GLM-4.7-REAP-50-W4A16)**: 92GB, faster, good for:\n  - Code generation\n  - Function calling\n  - Quick iterations\n  - Edge deployments\n\n- **Large (GLM-4.7-REAP-218B-A32B-W4A16)**: 108GB, more accurate, good for:\n  - Complex reasoning\n  - Production workloads\n  - High-quality outputs\n  - Critical decisions\n\n## Performance\n\n- Local inference: 50-200ms (GPU-dependent)\n- API fallback: 500-2000ms (network-dependent)\n- Cost savings: ~90% vs API at scale\n- Latency improvement: 2-10x faster than API\n";
export default GLMLocalLLM;
//# sourceMappingURL=local-glm-integration.d.ts.map