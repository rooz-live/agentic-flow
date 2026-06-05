/**
 * Telemetry Adapter - Lean Version
 * Reuses existing pattern_metrics.jsonl infrastructure
 * Deconstructs monolith: focused single-purpose adapter
 * 
 * ROAM: R2 MITIGATED - adaptive dimension handling
 * WSJF: NOW - telemetry has immediate operational value
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import * as Database from 'better-sqlite3';

interface TelemetryPattern {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    timestamp: number;
    correlationId: string;
    eventType: string;
    duration?: number;
    success?: boolean;
    source: string;
  };
}

interface IngestOptions {
  batchSize?: number;
  onProgress?: (indexed: number, total: number) => void;
}

/**
 * Lean telemetry adapter - indexes existing pattern metrics
 * Anti-fragile: Processes files that exist, skips missing
 */
export class TelemetryLeanAdapter {
  private db: any;
  private dimension: number;

  constructor(dbPath: string, dimension = 384) {
    this.db = new (Database as any)(dbPath);
    this.dimension = dimension;
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Vectors table with metadata
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS telemetry_vectors (
        id TEXT PRIMARY KEY,
        embedding BLOB NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        correlation_id TEXT,
        event_type TEXT,
        duration_ms INTEGER,
        success BOOLEAN,
        source_file TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_telemetry_time 
        ON telemetry_vectors(timestamp);
      CREATE INDEX IF NOT EXISTS idx_telemetry_type 
        ON telemetry_vectors(event_type);
      CREATE INDEX IF NOT EXISTS idx_telemetry_corr 
        ON telemetry_vectors(correlation_id);
    `);
  }

  /**
   * Ingest telemetry from pattern_metrics.jsonl files
   * NOW: Immediate operational value
   */
  async ingestFromPath(
    logPath: string,
    options: IngestOptions = {}
  ): Promise<{ indexed: number; errors: number }> {
    const { batchSize = 100 } = options;
    let indexed = 0;
    let errors = 0;

    if (!existsSync(logPath)) {
      console.warn(`Telemetry path not found: ${logPath}`);
      return { indexed: 0, errors: 0 };
    }

    // Find all jsonl files
    const files = this.findJsonlFiles(logPath);
    
    for (const file of files) {
      try {
        const patterns = await this.parseJsonlFile(file);
        
        // Batch insert
        const insert = this.db.prepare(`
          INSERT OR REPLACE INTO telemetry_vectors 
          (id, embedding, content, timestamp, correlation_id, event_type, 
           duration_ms, success, source_file)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const insertMany = this.db.transaction((items: TelemetryPattern[]) => {
          for (const item of items) {
            insert.run(
              item.id,
              Buffer.from(new Float32Array(item.embedding).buffer),
              item.content,
              item.metadata.timestamp,
              item.metadata.correlationId,
              item.metadata.eventType,
              item.metadata.duration || null,
              item.metadata.success ?? null,
              item.metadata.source
            );
          }
        });

        // Process in batches
        for (let i = 0; i < patterns.length; i += batchSize) {
          const batch = patterns.slice(i, i + batchSize);
          insertMany(batch);
          indexed += batch.length;
          options.onProgress?.(indexed, patterns.length);
        }
        
      } catch (err) {
        console.error(`Failed to process ${file}:`, err);
        errors++;
      }
    }

    return { indexed, errors };
  }

  private findJsonlFiles(logPath: string): string[] {
    if (!existsSync(logPath)) return [];
    
    const stats = statSync(logPath);
    
    if (stats.isFile() && logPath.endsWith('.jsonl')) {
      return [logPath];
    }
    
    if (stats.isDirectory()) {
      return readdirSync(logPath)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => join(logPath, f));
    }
    
    return [];
  }

  private async parseJsonlFile(filePath: string): Promise<TelemetryPattern[]> {
    const patterns: TelemetryPattern[] = [];
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    
    for (let i = 0; i < lines.length; i++) {
      try {
        const event = JSON.parse(lines[i]);
        
        // Generate deterministic embedding (simplified)
        // In production: use AgentDB EmbeddingService
        const embedding = this.generateDeterministicEmbedding(
          event.pattern || event.event || JSON.stringify(event)
        );
        
        patterns.push({
          id: `${basename(filePath)}:${i}:${event.correlation_id || Date.now()}`,
          content: this.extractContent(event),
          embedding,
          metadata: {
            timestamp: event.timestamp || Date.now(),
            correlationId: event.correlation_id || `unknown-${i}`,
            eventType: event.event_type || 'unknown',
            duration: event.duration_ms,
            success: event.success,
            source: filePath
          }
        });
      } catch {
        // Skip malformed lines (anti-fragile)
      }
    }
    
    return patterns;
  }

  private extractContent(event: Record<string, unknown>): string {
    // Extract searchable content from event
    const parts: string[] = [];
    
    if (event.pattern) parts.push(String(event.pattern));
    if (event.event) parts.push(String(event.event));
    if (event.critique) parts.push(String(event.critique));
    if (event.input) parts.push(`Input: ${String(event.input).substring(0, 200)}`);
    if (event.output) parts.push(`Output: ${String(event.output).substring(0, 200)}`);
    
    return parts.join('. ') || JSON.stringify(event).substring(0, 500);
  }

  /**
   * Deterministic embedding for initial indexing
   * In production: replace with actual embedding service
   */
  private generateDeterministicEmbedding(text: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    
    // Simple hash-based distribution
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      vector[i % this.dimension] += char / 65536;
    }
    
    // Normalize
    const norm = Math.sqrt(vector.reduce((a, b) => a + b * b, 0));
    return vector.map(v => v / (norm || 1));
  }

  /**
   * Simple similarity search (cosine)
   * NOW: Functional search
   * NEXT: HNSW index
   */
  search(
    queryEmbedding: number[],
    k: number = 10,
    threshold: number = 0.7
  ): Array<{ id: string; score: number; content: string; metadata: TelemetryPattern['metadata'] }> {
    // Validate dimensions (R2 MITIGATED)
    if (queryEmbedding.length !== this.dimension) {
      throw new Error(
        `Dimension mismatch: query=${queryEmbedding.length}, index=${this.dimension}`
      );
    }

    const rows = this.db.prepare(
      'SELECT id, embedding, content, timestamp, correlation_id, event_type, duration_ms, success, source_file FROM telemetry_vectors'
    ).all() as Array<{
      id: string;
      embedding: Buffer;
      content: string;
      timestamp: number;
      correlation_id: string;
      event_type: string;
      duration_ms: number | null;
      success: boolean | null;
      source_file: string;
    }>;

    const results = rows.map(row => {
      const embedding = Array.from(new Float32Array(row.embedding.buffer));
      const score = this.cosineSimilarity(queryEmbedding, embedding);
      
      return {
        id: row.id,
        score,
        content: row.content,
        metadata: {
          timestamp: row.timestamp,
          correlationId: row.correlation_id,
          eventType: row.event_type,
          duration: row.duration_ms ?? undefined,
          success: row.success ?? undefined,
          source: row.source_file
        }
      };
    });

    return results
      .filter(r => r.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }

  getStats(): { totalVectors: number; uniqueFiles: number } {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM telemetry_vectors').get() as { count: number };
    const files = this.db.prepare('SELECT COUNT(DISTINCT source_file) as count FROM telemetry_vectors').get() as { count: number };
    
    return {
      totalVectors: total.count,
      uniqueFiles: files.count
    };
  }

  close(): void {
    if (this.db && this.db.close) {
      this.db.close();
    }
  }
}

import { statSync } from 'fs';
