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
import * as https from 'https';
import { getLLMObservatory } from '../../observability/llm-observatory';
export class GLMREAPClient {
    config;
    constructor(config = {}) {
        this.config = {
            endpoint: config.endpoint || process.env.GLM_REAP_ENDPOINT || 'http://localhost:8000',
            model: config.model || process.env.GLM_REAP_MODEL || '0xSero/GLM-4.7-REAP-50-W4A16',
            apiKey: config.apiKey || process.env.GLM_REAP_API_KEY || '',
            timeout: config.timeout || 60000, // 60s default
        };
        console.log(`🚀 GLM-REAP client initialized (model: ${this.config.model})`);
    }
    /**
     * Generate completion (OpenAI-compatible API)
     */
    async complete(request) {
        const startTime = Date.now();
        try {
            const observatory = getLLMObservatory();
            return await observatory.traceLocalLLM(this.config.model, request.prompt, async (span) => {
                span.setAttribute('llm.request.max_tokens', request.maxTokens || 1024);
                span.setAttribute('llm.request.temperature', request.temperature || 0.7);
                span.setAttribute('llm.request.top_p', request.topP || 0.9);
                const response = await this.callVLLMAPI('/v1/completions', {
                    model: this.config.model,
                    prompt: request.prompt,
                    max_tokens: request.maxTokens || 1024,
                    temperature: request.temperature || 0.7,
                    top_p: request.topP || 0.9,
                    stop: request.stopSequences,
                    stream: request.stream || false,
                });
                const completion = response.choices[0].text;
                const tokens = response.usage?.total_tokens || 0;
                const finishReason = response.choices[0].finish_reason || 'stop';
                return {
                    completion,
                    tokens,
                    result: {
                        completion,
                        tokens,
                        finishReason: finishReason,
                        model: this.config.model,
                        latencyMs: Date.now() - startTime,
                    },
                };
            });
        }
        catch (error) {
            console.error('GLM-REAP completion error:', error);
            throw new Error(`GLM-REAP completion failed: ${error.message}`);
        }
    }
    /**
     * Chat completion (OpenAI-compatible API)
     */
    async chat(request) {
        const startTime = Date.now();
        const prompt = this.formatChatPrompt(request.messages);
        try {
            const observatory = getLLMObservatory();
            return await observatory.traceLocalLLM(this.config.model, prompt, async (span) => {
                span.setAttribute('llm.request.type', 'chat');
                span.setAttribute('llm.request.max_tokens', request.maxTokens || 1024);
                const response = await this.callVLLMAPI('/v1/chat/completions', {
                    model: this.config.model,
                    messages: request.messages,
                    max_tokens: request.maxTokens || 1024,
                    temperature: request.temperature || 0.7,
                    top_p: request.topP || 0.9,
                    stop: request.stopSequences,
                });
                const completion = response.choices[0].message.content;
                const tokens = response.usage?.total_tokens || 0;
                const finishReason = response.choices[0].finish_reason || 'stop';
                return {
                    completion,
                    tokens,
                    result: {
                        completion,
                        tokens,
                        finishReason: finishReason,
                        model: this.config.model,
                        latencyMs: Date.now() - startTime,
                    },
                };
            });
        }
        catch (error) {
            console.error('GLM-REAP chat error:', error);
            throw new Error(`GLM-REAP chat failed: ${error.message}`);
        }
    }
    /**
     * Format chat messages into prompt (GLM-4 format)
     */
    formatChatPrompt(messages) {
        return messages
            .map((msg) => {
            switch (msg.role) {
                case 'system':
                    return `[System]\n${msg.content}\n`;
                case 'user':
                    return `[User]\n${msg.content}\n`;
                case 'assistant':
                    return `[Assistant]\n${msg.content}\n`;
            }
        })
            .join('\n');
    }
    /**
     * Call vLLM OpenAI-compatible API
     */
    async callVLLMAPI(endpoint, body) {
        const url = `${this.config.endpoint}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
        return new Promise((resolve, reject) => {
            const requestBody = JSON.stringify(body);
            const parsedUrl = new URL(url);
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname,
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Length': Buffer.byteLength(requestBody),
                },
                timeout: this.config.timeout,
            };
            const protocol = parsedUrl.protocol === 'https:' ? https : require('http');
            const req = protocol.request(options, (res) => {
                let responseBody = '';
                res.on('data', (chunk) => (responseBody += chunk.toString()));
                res.on('end', () => {
                    try {
                        const data = JSON.parse(responseBody);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(data);
                        }
                        else {
                            reject(new Error(`vLLM API error (${res.statusCode}): ${data.error?.message || responseBody}`));
                        }
                    }
                    catch (err) {
                        reject(new Error(`Failed to parse vLLM response: ${err}`));
                    }
                });
            });
            req.on('error', (err) => reject(err));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('vLLM API request timeout'));
            });
            req.write(requestBody);
            req.end();
        });
    }
    /**
     * Health check - verify vLLM server is running
     */
    async healthCheck() {
        try {
            const response = await this.callVLLMAPI('/v1/models', {});
            return response.data?.some((model) => model.id === this.config.model);
        }
        catch (error) {
            console.error('GLM-REAP health check failed:', error);
            return false;
        }
    }
    /**
     * Get model information
     */
    async getModelInfo() {
        const info = {
            name: this.config.model,
            parameterCount: '179B',
            quantization: 'INT4 (W4A16)',
            pruningRate: '50%',
            vramRequired: '~92GB',
        };
        // Adjust for 218B variant
        if (this.config.model.includes('218B')) {
            info.parameterCount = '218B';
            info.pruningRate = '40%';
            info.vramRequired = '~116GB';
        }
        return info;
    }
}
/**
 * Factory function
 */
export function createGLMREAPClient(config) {
    return new GLMREAPClient(config);
}
/**
 * Example usage
 */
export async function exampleUsage() {
    const client = createGLMREAPClient();
    // Health check
    const healthy = await client.healthCheck();
    if (!healthy) {
        console.error('❌ vLLM server not available');
        return;
    }
    // Get model info
    const info = await client.getModelInfo();
    console.log('📊 Model Info:', info);
    // Completion
    const completion = await client.complete({
        prompt: 'Write a Python function to calculate fibonacci numbers:',
        maxTokens: 500,
        temperature: 0.2,
    });
    console.log('Completion:', completion.completion);
    console.log(`Tokens: ${completion.tokens}, Latency: ${completion.latencyMs}ms`);
    // Chat
    const chatResponse = await client.chat({
        messages: [
            { role: 'system', content: 'You are a helpful coding assistant.' },
            { role: 'user', content: 'Explain async/await in JavaScript' },
        ],
        maxTokens: 300,
    });
    console.log('Chat response:', chatResponse.completion);
}
//# sourceMappingURL=glm-reap-client.js.map