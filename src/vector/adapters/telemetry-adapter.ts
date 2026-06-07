/**
 * Telemetry Adapter
 * Execution trace and pattern metric extraction for operational intelligence
 */

import { DomainAdapter, ExtractionOptions } from './base';
import { Pattern, VectorMetadata, DomainConfig } from '../core/types';
import { globalEmbeddingRegistry } from '../core/embedding';
import { promises as fs } from 'fs';

interface TelemetryEvent {
  timestamp: number;
  pattern?: string;
  correlation_id?: string;
  domain?: string;
  success?: boolean;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}

export class TelemetryAdapter implements DomainAdapter {
  readonly domain = 'telemetry';
  readonly config: DomainConfig = {
    name: 'telemetry',
    quantization: { type: 'binary' },
    embeddingDimension: 384,
    priority: 'medium',
    maxVectors: 500000
  };

  async extractPatterns(source: string, options: ExtractionOptions = {}): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    const content = await fs.readFile(source, 'utf-8');
    const lines = content.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const event: TelemetryEvent = JSON.parse(line);
        const pattern = this.extractFromEvent(event, source);
        if (pattern) {
          patterns.push(pattern);
        }
      } catch {
        // Skip malformed JSON lines
      }
    }

    return patterns;
  }

  private extractFromEvent(event: TelemetryEvent, source: string): Pattern | null {
    if (!event.pattern) return null;

    const content = this.generateContent(event);
    const id = `${event.correlation_id || 'unknown'}:${event.pattern}:${event.timestamp}`;

    return {
      id,
      content,
      metadata: this.createMetadata(event, source),
      confidence: event.success ? 0.9 : 0.7
    };
  }

  private generateContent(event: TelemetryEvent): string {
    const parts: string[] = [
      `Pattern: ${event.pattern}`,
      `Domain: ${event.domain || 'unknown'}`
    ];

    if (event.success !== undefined) {
      parts.push(`Success: ${event.success}`);
    }

    if (event.duration_ms) {
      parts.push(`Duration: ${event.duration_ms}ms`);
    }

    if (event.metadata) {
      parts.push(`Metadata: ${JSON.stringify(event.metadata)}`);
    }

    return parts.join('. ');
  }

  private createMetadata(event: TelemetryEvent, source: string): VectorMetadata {
    const tags: string[] = [event.pattern!];
    
    if (event.domain) tags.push(event.domain);
    if (event.success !== undefined) tags.push(event.success ? 'success' : 'failure');
    
    return {
      domain: this.domain,
      source,
      timestamp: event.timestamp || Date.now(),
      tags,
      correlationId: event.correlation_id,
      pattern: event.pattern,
      success: event.success,
      duration: event.duration_ms,
      originalMetadata: event.metadata
    } as VectorMetadata;
  }

  async generateEmbedding(pattern: Pattern): Promise<number[]> {
    const model = globalEmbeddingRegistry.getDefault();
    return model.compute(pattern.content);
  }

  extractMetadata(pattern: Pattern): VectorMetadata {
    return pattern.metadata;
  }

  // Specialized query methods for telemetry
  async findSimilarFailures(patternName: string, source: string): Promise<Pattern[]> {
    const allPatterns = await this.extractPatterns(source);
    return allPatterns.filter(p => 
      p.metadata.pattern === patternName && 
      p.metadata.success === false
    );
  }

  async findDurationAnomalies(source: string, thresholdMs: number): Promise<Pattern[]> {
    const allPatterns = await this.extractPatterns(source);
    return allPatterns.filter(p => 
      (p.metadata.duration as number) > thresholdMs
    );
  }
}
