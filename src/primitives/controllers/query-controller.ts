/**
 * Query Controller - Single Responsibility
 * DDD Bounded Context: Vector Search
 * Deconstructs: God controllers → Single-responsibility handlers
 * 
 * ROAM: R5 MITIGATED - Per-domain query handling
 * WSJF: NEXT - Controller decomposition
 */

import { TelemetryLeanAdapter } from '../../vector/adapters/telemetry-lean';
import { AgentDBEmbeddingBridge } from '../../vector/integrations/agentdb-bridge';

// Query types (from Contract Layer)
interface VectorQuery {
  text: string;
  domain?: string;
  k?: number;
  threshold?: number;
  useMMR?: boolean;
}

interface SearchResult {
  id: string;
  score: number;
  content: string;
  metadata: Record<string, unknown>;
}

interface QueryResponse {
  results: SearchResult[];
  meta: {
    total: number;
    latencyMs: number;
    domain: string;
    cached: boolean;
  };
}

// Command pattern for clean separation
interface QueryHandler<T, R> {
  handle(query: T): Promise<R>;
}

/**
 * Vector Search Query Controller
 * Single responsibility: Handle vector search queries only
 */
export class VectorSearchQueryController implements QueryHandler<VectorQuery, QueryResponse> {
  private embeddingBridge: AgentDBEmbeddingBridge;
  private telemetryAdapter: TelemetryLeanAdapter;
  private cache: Map<string, QueryResponse> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(
    dbPath: string = './.agentdb/vectors.db',
    embeddingConfigPath?: string
  ) {
    this.embeddingBridge = new AgentDBEmbeddingBridge(dbPath, embeddingConfigPath);
    this.telemetryAdapter = new TelemetryLeanAdapter(dbPath);
  }

  async initialize(): Promise<void> {
    await this.embeddingBridge.initialize();
  }

  /**
   * Handle vector search query
   * Clean separation: No business logic here, just orchestration
   */
  async handle(query: VectorQuery): Promise<QueryResponse> {
    const startTime = Date.now();
    
    // Normalize query
    const normalized = this.normalizeQuery(query);
    
    // Check cache
    const cacheKey = this.generateCacheKey(normalized);
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      this.cacheHits++;
      return {
        ...cached,
        meta: { ...cached.meta, cached: true, latencyMs: Date.now() - startTime }
      };
    }
    
    this.cacheMisses++;
    
    // Compute embedding
    const embedding = await this.embeddingBridge.compute(normalized.text);
    
    // Search domain
    let results: SearchResult[] = [];
    
    if (!normalized.domain || normalized.domain === 'telemetry') {
      const telemetryResults = this.telemetryAdapter.search(
        embedding,
        normalized.k,
        normalized.threshold
      );
      results = telemetryResults.map(r => ({
        id: r.id,
        score: r.score,
        content: r.content,
        metadata: r.metadata as Record<string, unknown>
      }));
    }
    
    // Sort and limit
    results = results
      .sort((a, b) => b.score - a.score)
      .slice(0, normalized.k);
    
    // Build response
    const response: QueryResponse = {
      results,
      meta: {
        total: results.length,
        latencyMs: Date.now() - startTime,
        domain: normalized.domain || 'telemetry',
        cached: false
      }
    };
    
    // Cache result
    this.cache.set(cacheKey, response);
    this.evictCacheIfNeeded();
    
    return response;
  }

  private normalizeQuery(query: VectorQuery): Required<VectorQuery> {
    return {
      text: query.text.trim().toLowerCase(),
      domain: query.domain || 'all',
      k: Math.min(query.k || 10, 100), // Max 100 results
      threshold: query.threshold || 0.7,
      useMMR: query.useMMR || false
    };
  }

  private generateCacheKey(query: Required<VectorQuery>): string {
    return `${query.domain}:${query.text}:${query.k}:${query.threshold}`;
  }

  private isCacheValid(response: QueryResponse): boolean {
    // Cache valid for 5 minutes
    const maxAge = 5 * 60 * 1000;
    return Date.now() - (response.meta.latencyMs || 0) < maxAge;
  }

  private evictCacheIfNeeded(): void {
    // Simple LRU: if >1000 entries, clear half
    if (this.cache.size > 1000) {
      const entries = Array.from(this.cache.entries());
      const toDelete = entries.slice(0, 500);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  getStats(): { cacheHits: number; cacheMisses: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0
    };
  }

  close(): void {
    this.embeddingBridge.close();
    this.telemetryAdapter.close();
  }
}

/**
 * Health Check Controller
 * Single responsibility: Report service health
 */
export class HealthCheckController {
  private controllers: Array<{ name: string; health: () => Promise<boolean> }> = [];

  register(name: string, health: () => Promise<boolean>): void {
    this.controllers.push({ name, health });
  }

  async check(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const controller of this.controllers) {
      try {
        results[controller.name] = await controller.health();
      } catch {
        results[controller.name] = false;
      }
    }
    
    return results;
  }
}

// Factory function
export async function createVectorSearchController(
  dbPath?: string
): Promise<VectorSearchQueryController> {
  const controller = new VectorSearchQueryController(dbPath);
  await controller.initialize();
  return controller;
}
