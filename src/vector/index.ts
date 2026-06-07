/**
 * Vector Search Module
 * Multi-domain semantic search with HNSW indexing
 */

// Core types and interfaces
export type {
  EmbeddingModel,
  VectorIndex,
  VectorMetadata,
  SearchResult,
  SearchOptions,
  DistanceMetric,
  MetadataFilters,
  IndexStats,
  QuantizationType,
  QuantizationConfig,
  DomainConfig,
  Pattern,
  MMRResult
} from './core/types';
export { DEFAULT_DOMAINS } from './core/types';

// Embedding implementations
export {
  OpenAIEmbedding,
  LocalEmbedding,
  EmbeddingRegistry,
  globalEmbeddingRegistry,
  initDefaultEmbedding
} from './core/embedding';

// Quantization strategies
export {
  BinaryQuantization,
  ScalarQuantization,
  ProductQuantization,
  AdaptiveQuantizer
} from './core/quantization';

// Vector index adapters
export {
  AgentDBVectorIndex,
  MultiDomainVectorIndex
} from './core/agentdb-adapter';

// Domain adapters
export type { DomainAdapter, ExtractionOptions } from './adapters/base';
export { CodePatternAdapter } from './adapters/code-adapter';
export { TelemetryAdapter } from './adapters/telemetry-adapter';
export { DocumentAdapter } from './adapters/document-adapter';

// Unified search
export { UnifiedSemanticSearch, initGlobalSearch, getGlobalSearch } from './search/unified-search';
export type { HybridSearchOptions, SynthesizedResult } from './search/unified-search';

// MCP Server
export { VectorSearchMCPServer } from './integrations/mcp-server';
export type { MCPServerConfig } from './integrations/mcp-server';
