/**
 * Base Domain Adapter Interface
 * Contract for extracting and embedding domain-specific patterns
 */

import { Pattern, VectorMetadata, DomainConfig } from '../core/types';

export interface DomainAdapter {
  readonly domain: string;
  readonly config: DomainConfig;
  
  extractPatterns(source: string): Promise<Pattern[]>;
  generateEmbedding(pattern: Pattern): Promise<number[]>;
  extractMetadata(pattern: Pattern): VectorMetadata;
}

export interface ExtractionOptions {
  recursive?: boolean;
  filePattern?: string;
  maxDepth?: number;
  exclude?: string[];
}
