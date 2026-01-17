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

export class GLMReapClient {
  private config: GLMConfig;
  private modelReady = false;
  
  constructor(config: GLMConfig) {
    this.config = {
      maxModelLen: 165000,
      enableFunctionCalling: true,
      enableCloudFallback: true,
      ...config,
    };
  }
  
  /**
   * Initialize the model (load or connect to server)
   */
  async initialize(): Promise<void> {
    if (this.config.serverEndpoint) {
      // Connect to vLLM server
      await this.checkServerHealth();
    } else if (this.config.modelPath) {
      // Load model locally (requires transformers.js or Python backend)
      await this.loadModelLocally();
    } else {
      throw new Error('Either serverEndpoint or modelPath must be provided');
    }
    
    this.modelReady = true;
    console.log(`[GLM-REAP] Initialized ${this.config.variant} variant`);
  }
  
  /**
   * Generate text completion
   */
  async generate(prompt: string, options: GenerateOptions = {}): Promise<GenerateResponse> {
    if (!this.modelReady) {
      throw new Error('Model not initialized. Call initialize() first.');
    }
    
    try {
      // Try local inference first
      return await this.generateLocal(prompt, options);
    } catch (error) {
      console.error('[GLM-REAP] Local inference failed:', error);
      
      if (this.config.enableCloudFallback && this.config.cloudEndpoint) {
        console.log('[GLM-REAP] Falling back to cloud API...');
        return await this.generateCloud(prompt, options);
      }
      
      throw error;
    }
  }
  
  /**
   * Generate with streaming
   */
  async *generateStream(
    prompt: string,
    options: GenerateOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    if (!this.modelReady) {
      throw new Error('Model not initialized. Call initialize() first.');
    }
    
    const endpoint = `${this.config.serverEndpoint}/v1/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.getModelName(),
        prompt,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        top_p: options.topP ?? 0.95,
        stream: true,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`vLLM server error: ${response.statusText}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices[0]?.text || '';
            if (text) yield text;
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }
  }
  
  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.modelReady;
  }
  
  /**
   * Get model specifications
   */
  getModelSpecs(): {
    variant: GLMVariant;
    sizeGB: number;
    pruning: string;
    quantization: string;
  } {
    return {
      variant: this.config.variant,
      sizeGB: this.config.variant === '50' ? 92 : 116,
      pruning: this.config.variant === '50' ? '50%' : '40%',
      quantization: 'INT4 (W4A16)',
    };
  }
  
  // -------------------------------------------------------------------------
  // PRIVATE METHODS
  // -------------------------------------------------------------------------
  
  private async generateLocal(prompt: string, options: GenerateOptions): Promise<GenerateResponse> {
    if (!this.config.serverEndpoint) {
      throw new Error('vLLM server not configured');
    }
    
    const endpoint = `${this.config.serverEndpoint}/v1/completions`;
    const requestBody: any = {
      model: this.getModelName(),
      prompt: this.buildPrompt(prompt, options.systemPrompt),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      top_p: options.topP ?? 0.95,
      stop: options.stop,
    };
    
    // Add function calling if enabled
    if (this.config.enableFunctionCalling && options.functions) {
      requestBody.tools = options.functions.map(f => ({
        type: 'function',
        function: {
          name: f.name,
          description: f.name,
          parameters: {},
        },
      }));
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error(`vLLM server error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const choice = data.choices[0];
    
    return {
      text: choice.text || '',
      finishReason: choice.finish_reason || 'stop',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: this.getModelName(),
      usedFallback: false,
    };
  }
  
  private async generateCloud(prompt: string, options: GenerateOptions): Promise<GenerateResponse> {
    if (!this.config.cloudEndpoint || !this.config.cloudApiKey) {
      throw new Error('Cloud fallback not configured');
    }
    
    // Implement cloud API call (e.g., OpenAI, Anthropic, etc.)
    const response = await fetch(this.config.cloudEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.cloudApiKey}`,
      },
      body: JSON.stringify({
        prompt: this.buildPrompt(prompt, options.systemPrompt),
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.7,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Cloud API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      text: data.text || data.choices?.[0]?.text || '',
      finishReason: 'stop',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      model: 'cloud-fallback',
      usedFallback: true,
    };
  }
  
  private async checkServerHealth(): Promise<void> {
    if (!this.config.serverEndpoint) {
      throw new Error('Server endpoint not configured');
    }
    
    try {
      const response = await fetch(`${this.config.serverEndpoint}/health`);
      if (!response.ok) {
        throw new Error(`Server health check failed: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Cannot connect to vLLM server at ${this.config.serverEndpoint}: ${error}`);
    }
  }
  
  private async loadModelLocally(): Promise<void> {
    // This would require a Python backend or transformers.js
    // For now, throw an error directing to vLLM deployment
    throw new Error(
      'Local model loading not yet implemented. ' +
      'Please deploy using vLLM:\n' +
      'vllm serve ' + this.getModelName() + ' \\\n' +
      '  --tensor-parallel-size 4 \\\n' +
      '  --pipeline-parallel-size 2 \\\n' +
      '  --max-model-len 165000 \\\n' +
      '  --gpu-memory-utilization 0.92 \\\n' +
      '  --kv-cache-dtype fp8_e4m3 \\\n' +
      '  --tool-call-parser glm47'
    );
  }
  
  private getModelName(): string {
    return this.config.variant === '50'
      ? '0xSero/GLM-4.7-REAP-50-W4A16'
      : '0xSero/GLM-4.7-REAP-218B-A32B-W4A16';
  }
  
  private buildPrompt(userPrompt: string, systemPrompt?: string): string {
    if (systemPrompt) {
      return `System: ${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`;
    }
    return userPrompt;
  }
}

/**
 * Helper function to create GLM-REAP client with sensible defaults
 */
export function createGLMClient(options?: Partial<GLMConfig>): GLMReapClient {
  return new GLMReapClient({
    variant: options?.variant || '50',
    serverEndpoint: options?.serverEndpoint || process.env.GLM_REAP_ENDPOINT || 'http://localhost:8000',
    enableCloudFallback: options?.enableCloudFallback ?? true,
    cloudEndpoint: options?.cloudEndpoint || process.env.OPENAI_API_ENDPOINT,
    cloudApiKey: options?.cloudApiKey || process.env.OPENAI_API_KEY,
    ...options,
  });
}
