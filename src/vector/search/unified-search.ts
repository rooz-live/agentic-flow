/**
 * Unified Semantic Search Interface
 * Cross-domain hybrid search with MMR diversity
 */

import { 
  VectorIndex, 
  SearchResult, 
  SearchOptions, 
  Pattern,
  DomainConfig 
} from '../core/types';
import { MultiDomainVectorIndex } from '../core/agentdb-adapter';
import { DomainAdapter } from '../adapters/base';
import { globalEmbeddingRegistry } from '../core/embedding';

export interface HybridSearchOptions extends SearchOptions {
  k?: number;
  domains?: string[];
  synthesizeContext?: boolean;
  maxTokens?: number;
}

export interface SynthesizedResult {
  results: SearchResult[];
  context: string;
  domains: string[];
  query: string;
}

export class UnifiedSemanticSearch {
  private multiIndex: MultiDomainVectorIndex;
  private adapters: Map<string, DomainAdapter> = new Map();
  private embeddingModel = globalEmbeddingRegistry.getDefault();

  constructor(dbPath: string) {
    this.multiIndex = new MultiDomainVectorIndex(dbPath);
  }

  async addDomain(adapter: DomainAdapter): Promise<void> {
    await this.multiIndex.addDomain(adapter.config);
    this.adapters.set(adapter.domain, adapter);
  }

  async indexSource(domain: string, source: string): Promise<number> {
    const adapter = this.adapters.get(domain);
    if (!adapter) {
      throw new Error(`No adapter registered for domain: ${domain}`);
    }

    const patterns = await adapter.extractPatterns(source);
    const index = this.multiIndex.getDomain(domain);
    
    if (!index) {
      throw new Error(`Index not initialized for domain: ${domain}`);
    }

    let indexed = 0;
    for (const pattern of patterns) {
      const embedding = await adapter.generateEmbedding(pattern);
      await index.insert(pattern.id, embedding, pattern.metadata);
      indexed++;
    }

    return indexed;
  }

  async query(text: string, options: HybridSearchOptions = {}): Promise<SearchResult[]> {
    const { 
      k = 10, 
      domains,
      threshold = 0.7,
      useMMR = false,
      mmrLambda = 0.5
    } = options;

    const queryEmbedding = await this.embeddingModel.compute(text);

    if (domains && domains.length > 0) {
      return this.multiIndex.searchDomains(queryEmbedding, domains, k, {
        threshold,
        useMMR,
        mmrLambda
      });
    }

    return this.multiIndex.searchAll(queryEmbedding, k, {
      threshold,
      useMMR,
      mmrLambda
    });
  }

  async queryWithContext(text: string, options: HybridSearchOptions = {}): Promise<SynthesizedResult> {
    const results = await this.query(text, options);
    const context = this.synthesizeContext(results, options.maxTokens);
    const domains = [...new Set(results.map(r => r.metadata.domain))];

    return {
      results,
      context,
      domains,
      query: text
    };
  }

  async hybridSearch(
    text: string, 
    filters: { domain?: string; tags?: string[]; timestamp?: { $gte?: number; $lte?: number } },
    options: HybridSearchOptions = {}
  ): Promise<SearchResult[]> {
    const { k = 10, threshold = 0.7 } = options;
    const queryEmbedding = await this.embeddingModel.compute(text);

    return this.multiIndex.searchAll(queryEmbedding, k, {
      threshold,
      filters
    });
  }

  async findSimilarPatterns(patternId: string, k: number = 5): Promise<SearchResult[]> {
    // Find the pattern's embedding
    const domain = patternId.split(':')[0];
    const index = this.multiIndex.getDomain(domain);
    
    if (!index) {
      throw new Error(`Domain not found: ${domain}`);
    }

    // This is a simplified implementation - in production, you'd store embeddings
    // in a way that allows retrieval by ID for similarity search
    return [];
  }

  async stats(): Promise<Record<string, { total: number; avgLatency: number }>> {
    const stats = await this.multiIndex.stats();
    const result: Record<string, { total: number; avgLatency: number }> = {};

    for (const [domain, stat] of Object.entries(stats)) {
      result[domain] = {
        total: stat.totalVectors,
        avgLatency: stat.avgSearchLatency
      };
    }

    return result;
  }

  private synthesizeContext(results: SearchResult[], maxTokens: number = 2000): string {
    let context = '';
    let tokenCount = 0;

    for (const result of results) {
      const text = `${result.metadata.tags?.join(', ') || ''}: ${result.metadata.source}`;
      const estimatedTokens = text.length / 4; // Rough estimate

      if (tokenCount + estimatedTokens > maxTokens) {
        break;
      }

      context += `${text}\n\n`;
      tokenCount += estimatedTokens;
    }

    return context;
  }

  close(): void {
    this.multiIndex.close();
  }
}

// Singleton instance for application-wide use
let globalSearchInstance: UnifiedSemanticSearch | null = null;

export function initGlobalSearch(dbPath: string): UnifiedSemanticSearch {
  if (!globalSearchInstance) {
    globalSearchInstance = new UnifiedSemanticSearch(dbPath);
  }
  return globalSearchInstance;
}

export function getGlobalSearch(): UnifiedSemanticSearch {
  if (!globalSearchInstance) {
    throw new Error('Global search not initialized. Call initGlobalSearch() first.');
  }
  return globalSearchInstance;
}
