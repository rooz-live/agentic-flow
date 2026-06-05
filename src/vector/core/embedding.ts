/**
 * Embedding Model Implementations
 * Support for OpenAI, local models, and custom embedding providers
 */

import { EmbeddingModel } from './types';

export class OpenAIEmbedding implements EmbeddingModel {
  readonly dimension = 1536;
  readonly name = 'openai-text-embedding-3-small';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = baseUrl;
  }

  async compute(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: this.dimension
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async computeBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
        dimensions: this.dimension
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((d: { embedding: number[] }) => d.embedding);
  }
}

export class LocalEmbedding implements EmbeddingModel {
  readonly dimension: number;
  readonly name = 'local-sentence-transformers';
  private modelPath: string;

  constructor(dimension = 384, modelPath?: string) {
    this.dimension = dimension;
    this.modelPath = modelPath || process.env.LOCAL_EMBEDDING_PATH || './models/all-MiniLM-L6-v2';
  }

  async compute(_text: string): Promise<number[]> {
    throw new Error('Local embedding not yet implemented. Use OpenAIEmbedding or implement with transformers.js');
  }

  async computeBatch(_texts: string[]): Promise<number[][]> {
    throw new Error('Local embedding not yet implemented. Use OpenAIEmbedding or implement with transformers.js');
  }
}

export class EmbeddingRegistry {
  private models: Map<string, EmbeddingModel> = new Map();

  register(name: string, model: EmbeddingModel): void {
    this.models.set(name, model);
  }

  get(name: string): EmbeddingModel | undefined {
    return this.models.get(name);
  }

  getDefault(): EmbeddingModel {
    const openai = this.models.get('openai');
    if (openai) return openai;
    
    const first = Array.from(this.models.values())[0];
    if (first) return first;
    
    throw new Error('No embedding model registered. Call EmbeddingRegistry.register() first.');
  }

  list(): string[] {
    return Array.from(this.models.keys());
  }
}

export const globalEmbeddingRegistry = new EmbeddingRegistry();

export function initDefaultEmbedding(): void {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    globalEmbeddingRegistry.register('openai', new OpenAIEmbedding(openaiKey));
  }
}
