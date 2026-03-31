/**
 * ConceptNet Integration for Affiliate Affinity Scoring
 *
 * Provides semantic relationship queries for affiliate behavior pattern analysis.
 * Uses ConceptNet 5 REST API: https://conceptnet.io/
 *
 * Features:
 * - Semantic relationship queries between concepts
 * - Edge/relation analysis for affiliate relationships
 * - Multi-language support for international affiliates
 * - Fallback to cached relationships when API unavailable
 *
 * @module conceptnet_integration
 */

import { EventEmitter } from 'events';

// ConceptNet API Configuration
const CONCEPTNET_API_BASE = 'https://api.conceptnet.io';
const CONCEPTNET_TIMEOUT_MS = 5000;

// Relationship types relevant to affiliate analysis
export type ConceptNetRelation =
  | 'RelatedTo'
  | 'FormOf'
  | 'IsA'
  | 'PartOf'
  | 'HasA'
  | 'UsedFor'
  | 'CapableOf'
  | 'AtLocation'
  | 'Causes'
  | 'HasSubevent'
  | 'HasFirstSubevent'
  | 'HasLastSubevent'
  | 'HasPrerequisite'
  | 'HasProperty'
  | 'MotivatedByGoal'
  | 'ObstructedBy'
  | 'Desires'
  | 'CreatedBy'
  | 'Synonym'
  | 'Antonym'
  | 'DistinctFrom'
  | 'DerivedFrom'
  | 'SymbolOf'
  | 'DefinedAs'
  | 'MannerOf'
  | 'LocatedNear'
  | 'HasContext'
  | 'SimilarTo'
  | 'EtymologicallyRelatedTo'
  | 'EtymologicallyDerivedFrom'
  | 'CausesDesire'
  | 'MadeOf'
  | 'ReceivesAction'
  | 'ExternalURL';

export interface ConceptNetEdge {
  start: { '@id': string; label: string; language: string };
  end: { '@id': string; label: string; language: string };
  rel: { '@id': string; label: ConceptNetRelation };
  weight: number;
  surfaceText: string | null;
  sources: Array<{ '@id': string }>;
}

export interface ConceptNetResponse {
  '@id': string;
  edges: ConceptNetEdge[];
  view?: { '@id': string; firstPage: string; nextPage?: string; previousPage?: string };
}

export interface AffiliateSemanticScore {
  affiliateId: string;
  concept: string;
  relatedConcepts: Array<{ concept: string; relation: ConceptNetRelation; weight: number }>;
  semanticScore: number;
  confidence: number;
  timestamp: Date;
}

export interface ConceptNetConfig {
  apiBase?: string;
  timeout?: number;
  language?: string;
  maxEdges?: number;
  enableCache?: boolean;
  cacheTTLMs?: number;
}

/**
 * ConceptNet client for affiliate semantic analysis
 */
export class ConceptNetClient extends EventEmitter {
  private config: Required<ConceptNetConfig>;
  private cache: Map<string, { data: ConceptNetResponse; expires: number }> = new Map();
  private isAvailable: boolean = true;
  private lastHealthCheck: Date = new Date();

  constructor(config: ConceptNetConfig = {}) {
    super();
    this.config = {
      apiBase: config.apiBase ?? CONCEPTNET_API_BASE,
      timeout: config.timeout ?? CONCEPTNET_TIMEOUT_MS,
      language: config.language ?? 'en',
      maxEdges: config.maxEdges ?? 20,
      enableCache: config.enableCache ?? true,
      cacheTTLMs: config.cacheTTLMs ?? 3600000, // 1 hour
    };
  }

  /**
   * Query ConceptNet for a concept
   */
  async queryConcept(concept: string, limit?: number): Promise<ConceptNetResponse | null> {
    const cacheKey = `concept:${concept}:${limit ?? this.config.maxEdges}`;

    // Check cache first
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        this.emit('cache:hit', { concept, cacheKey });
        return cached.data;
      }
    }

    try {
      const uri = `/c/${this.config.language}/${encodeURIComponent(concept.toLowerCase())}`;
      const url = `${this.config.apiBase}${uri}?limit=${limit ?? this.config.maxEdges}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        this.emit('api:error', { concept, status: response.status });
        this.isAvailable = false;
        return null;
      }

      const data: ConceptNetResponse = await response.json();
      this.isAvailable = true;

      // Cache the result
      if (this.config.enableCache) {
        this.cache.set(cacheKey, { data, expires: Date.now() + this.config.cacheTTLMs });
      }

      this.emit('query:success', { concept, edgeCount: data.edges.length });
      return data;
    } catch (error) {
      this.emit('api:error', { concept, error: error instanceof Error ? error.message : 'Unknown error' });
      this.isAvailable = false;
      return null;
    }
  }

  /**
   * Get semantic relationships between two concepts
   */
  async getRelationship(concept1: string, concept2: string): Promise<ConceptNetEdge[]> {
    const response = await this.queryConcept(concept1);
    if (!response) return [];

    return response.edges.filter(
      (edge) =>
        edge.end.label.toLowerCase() === concept2.toLowerCase() ||
        edge.start.label.toLowerCase() === concept2.toLowerCase()
    );
  }

  /**
   * Calculate semantic affinity score for an affiliate based on their activity concepts
   */
  async calculateAffiliateSemanticScore(
    affiliateId: string,
    activityConcepts: string[]
  ): Promise<AffiliateSemanticScore[]> {
    const scores: AffiliateSemanticScore[] = [];

    for (const concept of activityConcepts) {
      const response = await this.queryConcept(concept);
      if (!response) continue;

      const relatedConcepts = response.edges.map((edge) => ({
        concept: edge.end.label,
        relation: edge.rel.label,
        weight: edge.weight,
      }));

      const avgWeight = relatedConcepts.reduce((sum, rc) => sum + rc.weight, 0) / (relatedConcepts.length || 1);

      scores.push({
        affiliateId,
        concept,
        relatedConcepts: relatedConcepts.slice(0, 10),
        semanticScore: avgWeight,
        confidence: relatedConcepts.length > 5 ? 0.9 : relatedConcepts.length / 10,
        timestamp: new Date(),
      });
    }

    return scores;
  }

  /** Health check for API availability */
  async healthCheck(): Promise<boolean> {
    const response = await this.queryConcept('test');
    this.lastHealthCheck = new Date();
    return response !== null;
  }

  /** Get API availability status */
  getStatus(): { available: boolean; lastCheck: Date; cacheSize: number } {
    return { available: this.isAvailable, lastCheck: this.lastHealthCheck, cacheSize: this.cache.size };
  }

  /** Clear cache */
  clearCache(): void { this.cache.clear(); this.emit('cache:cleared', {}); }
}

/** Factory function */
export function createConceptNetClient(config?: ConceptNetConfig): ConceptNetClient {
  return new ConceptNetClient(config);
}

