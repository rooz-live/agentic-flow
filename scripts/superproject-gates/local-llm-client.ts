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

export class LocalLLMClient extends EventEmitter {
  private config: Required<LocalLLMConfig>;
  private cache: Map<string, LLMCompletionResponse>;
  private isHealthy: boolean;
  private lastHealthCheck: number;

  constructor(config: LocalLLMConfig) {
    super();
    
    this.config = {
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.95,
      stream: false,
      timeout: 30000,
      retryAttempts: 3,
      fallbackToRemote: false,
      ...config
    };

    this.cache = new Map();
    this.isHealthy = false;
    this.lastHealthCheck = 0;

    console.log('🧠 Local LLM Client initialized');
    console.log(`   Model: ${this.config.model}`);
    console.log(`   Endpoint: ${this.config.endpoint}`);
    console.log(`   Max Tokens: ${this.config.maxTokens}`);
    console.log(`   Temperature: ${this.config.temperature}`);
  }

  /**
   * Check if local LLM server is healthy
   */
  public async healthCheck(): Promise<boolean> {
    const now = Date.now();
    
    // Cache health check for 30 seconds
    if (now - this.lastHealthCheck < 30000) {
      return this.isHealthy;
    }

    try {
      const response = await fetch(`${this.config.endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      this.isHealthy = response.ok;
      this.lastHealthCheck = now;

      if (this.isHealthy) {
        this.emit('health', { status: 'healthy', timestamp: now });
      } else {
        this.emit('health', { status: 'unhealthy', timestamp: now, code: response.status });
      }

      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = now;
      this.emit('health', { status: 'error', timestamp: now, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Generate completion from local LLM
   */
  public async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const cacheKey = this.getCacheKey(request);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      console.log('✨ Cache hit for LLM completion');
      return { ...cached, cached: true };
    }

    // Check health
    const healthy = await this.healthCheck();
    if (!healthy) {
      if (this.config.fallbackToRemote) {
        console.warn('⚠️  Local LLM unavailable, fallback to remote not implemented yet');
        throw new Error('Local LLM unavailable and fallback disabled');
      }
      throw new Error('Local LLM server is not healthy');
    }

    // Prepare request
    const payload = {
      model: this.config.model,
      messages: request.messages,
      max_tokens: request.maxTokens || this.config.maxTokens,
      temperature: request.temperature ?? this.config.temperature,
      top_p: request.topP ?? this.config.topP,
      stream: request.stream ?? this.config.stream,
      stop: request.stopSequences
    };

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.config.retryAttempts) {
      try {
        const startTime = Date.now();
        
        const response = await fetch(`${this.config.endpoint}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const duration = Date.now() - startTime;

        const result: LLMCompletionResponse = {
          content: data.choices[0].message.content,
          finishReason: data.choices[0].finish_reason === 'stop' ? 'stop' : 
                       data.choices[0].finish_reason === 'length' ? 'length' : 'error',
          tokensUsed: data.usage?.total_tokens || 0,
          model: data.model,
          cached: false
        };

        // Cache successful responses
        this.cache.set(cacheKey, result);

        // Emit metrics
        this.emit('completion', {
          duration,
          tokens: result.tokensUsed,
          model: result.model,
          cached: false
        });

        console.log(`✅ LLM completion: ${result.tokensUsed} tokens in ${duration}ms`);

        return result;
      } catch (error) {
        lastError = error as Error;
        attempts++;
        
        if (attempts < this.config.retryAttempts) {
          console.warn(`⚠️  LLM request failed (attempt ${attempts}/${this.config.retryAttempts}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    throw new Error(`LLM completion failed after ${attempts} attempts: ${lastError?.message}`);
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(request: LLMCompletionRequest): string {
    const key = JSON.stringify({
      messages: request.messages,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      topP: request.topP
    });
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return hash.toString(36);
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🗑️  LLM cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: 1000 // Configurable limit
    };
  }

  /**
   * Warmup: Send a simple request to warm up the model
   */
  public async warmup(): Promise<boolean> {
    try {
      console.log('🔥 Warming up local LLM...');
      
      await this.complete({
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          { role: 'user', content: 'Hello' }
        ],
        maxTokens: 10,
        temperature: 0.1
      });

      console.log('✅ LLM warmup complete');
      return true;
    } catch (error) {
      console.error('❌ LLM warmup failed:', error);
      return false;
    }
  }
}

/**
 * Create local LLM client with environment-based configuration
 */
export function createLocalLLMClient(overrides?: Partial<LocalLLMConfig>): LocalLLMClient {
  const config: LocalLLMConfig = {
    endpoint: process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:8000',
    model: process.env.LOCAL_LLM_MODEL || 'GLM-4.7-REAP-50-W4A16',
    ...overrides
  };

  return new LocalLLMClient(config);
}
