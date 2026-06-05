/**
 * Core Vector Search Types
 * Foundation for multi-domain semantic search with HNSW indexing
 */

export interface EmbeddingModel {
  readonly dimension: number;
  readonly name: string;
  compute(text: string): Promise<number[]>;
  computeBatch(texts: string[]): Promise<number[][]>;
}

export interface VectorIndex {
  insert(id: string, embedding: number[], metadata: VectorMetadata): Promise<void>;
  search(query: number[], k: number, options?: SearchOptions): Promise<SearchResult[]>;
  delete(id: string): Promise<void>;
  rebuild(): Promise<void>;
  stats(): Promise<IndexStats>;
}

export interface VectorMetadata {
  domain: string;
  source: string;
  timestamp: number;
  tags?: string[];
  [key: string]: unknown;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
  embedding?: number[];
  mmrScore?: number;
  relevanceScore?: number;
  diversityScore?: number;
}

export interface SearchOptions {
  threshold?: number;
  metric?: DistanceMetric;
  filters?: MetadataFilters;
  useMMR?: boolean;
  mmrLambda?: number;
}

export type DistanceMetric = 'cosine' | 'euclidean' | 'dot';

export interface MetadataFilters {
  domain?: string | string[];
  tags?: string[];
  timestamp?: { $gte?: number; $lte?: number };
  [key: string]: unknown;
}

export interface IndexStats {
  totalVectors: number;
  dimensions: number;
  domains: Record<string, number>;
  avgSearchLatency: number;
  indexSize: number;
}

export type QuantizationType = 'none' | 'scalar' | 'product' | 'binary';

export interface QuantizationConfig {
  type: QuantizationType;
  bits?: number;
  trainingSize?: number;
}

export interface DomainConfig {
  name: string;
  quantization: QuantizationConfig;
  embeddingDimension: number;
  priority: 'high' | 'medium' | 'low';
  maxVectors?: number;
}

export const DEFAULT_DOMAINS: DomainConfig[] = [
  {
    name: 'code',
    quantization: { type: 'scalar', bits: 8 },
    embeddingDimension: 768,
    priority: 'high',
    maxVectors: 100000
  },
  {
    name: 'telemetry',
    quantization: { type: 'binary' },
    embeddingDimension: 384,
    priority: 'medium',
    maxVectors: 500000
  },
  {
    name: 'docs',
    quantization: { type: 'scalar', bits: 8 },
    embeddingDimension: 768,
    priority: 'high',
    maxVectors: 50000
  }
];

export interface Pattern {
  id: string;
  content: string;
  embedding?: number[];
  metadata: VectorMetadata;
  confidence: number;
}

export interface MMRResult extends SearchResult {
  mmrScore: number;
  relevanceScore: number;
  diversityScore: number;
}
