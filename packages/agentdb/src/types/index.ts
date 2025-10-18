/**
 * Type definitions for SQLiteVector with ReasoningBank integration
 */

export interface VectorMetadata {
  [key: string]: any;
}

export interface Vector {
  id?: string;
  embedding: number[];
  metadata?: VectorMetadata;
  norm?: number;
  timestamp?: number;
}

export interface SearchResult<T = any> {
  id: string;
  score: number;
  embedding: number[];
  metadata?: T;
}

export type SimilarityMetric = 'cosine' | 'euclidean' | 'dot';

export interface DatabaseConfig {
  path?: string;
  memoryMode?: boolean;
  cacheSize?: number;
  walMode?: boolean;
  mmapSize?: number;
  queryCache?: QueryCacheConfig;
  quantization?: QuantizationConfig;
}

export interface QueryCacheConfig {
  enabled?: boolean;
  maxSize?: number;
  ttl?: number;
  enableStats?: boolean;
}

export interface QuantizationConfig {
  enabled?: boolean;
  dimensions: number;
  subvectors: number;
  bits: number;
  kmeansIterations?: number;
  trainOnInsert?: boolean;
  minVectorsForTraining?: number;
}

// ReasoningBank types
export interface Pattern {
  id: string;
  embedding: number[];
  taskType: string;
  approach: string;
  successRate: number;
  avgDuration: number;
  metadata: PatternMetadata;
  timestamp: number;
}

export interface PatternMetadata {
  domain: string;
  complexity: 'simple' | 'medium' | 'complex';
  iterations: number;
  learningSource: 'success' | 'failure' | 'adaptation';
  tags: string[];
  [key: string]: any;
}

export interface Experience {
  id?: string;
  taskEmbedding: number[];
  taskDescription: string;
  success: boolean;
  duration: number;
  approach: string;
  outcome: string;
  quality: number;
  metadata: ExperienceMetadata;
  timestamp?: number;
}

export interface ExperienceMetadata {
  domain: string;
  agentType?: string;
  errorType?: string;
  tokensUsed?: number;
  iterationCount?: number;
  [key: string]: any;
}

export interface Context {
  taskEmbedding: number[];
  patterns: Pattern[];
  experiences: Experience[];
  sessionHistory: any[];
  synthesizedContext: string;
  confidence: number;
}

export interface MemoryNode {
  id: string;
  embeddings: number[][];
  count: number;
  centroid: number[];
  quality: number;
  metadata: {
    originalIds: string[];
    domains: string[];
    timeRange: [number, number];
  };
}

export interface CollapseStrategy {
  type: 'graph' | 'hierarchical' | 'temporal';
  threshold: number;
  maxNodes?: number;
  preserveRecent?: boolean;
}

export interface LearningMetrics {
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  tokenEfficiency: number;
  domainExpertise: Map<string, number>;
  improvementRate: number;
}
