/**
 * Document Adapter
 * Markdown, specs, PRDs extraction for RAG-powered knowledge retrieval
 */

import { DomainAdapter, ExtractionOptions } from './base';
import { Pattern, VectorMetadata, DomainConfig } from '../core/types';
import { globalEmbeddingRegistry } from '../core/embedding';
import { promises as fs } from 'fs';
import * as path from 'path';

interface DocumentSection {
  level: number;
  title: string;
  content: string;
  lineStart: number;
  lineEnd: number;
}

export class DocumentAdapter implements DomainAdapter {
  readonly domain = 'docs';
  readonly config: DomainConfig = {
    name: 'docs',
    quantization: { type: 'scalar', bits: 8 },
    embeddingDimension: 768,
    priority: 'high',
    maxVectors: 50000
  };

  async extractPatterns(source: string, options: ExtractionOptions = {}): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    const stats = await fs.stat(source);

    if (stats.isDirectory()) {
      const files = await this.scanDirectory(source, options);
      for (const file of files) {
        const filePatterns = await this.extractFromFile(file);
        patterns.push(...filePatterns);
      }
    } else {
      const filePatterns = await this.extractFromFile(source);
      patterns.push(...filePatterns);
    }

    return patterns;
  }

  private async scanDirectory(dir: string, options: ExtractionOptions): Promise<string[]> {
    const files: string[] = [];
    const { recursive = true, filePattern = '*.{md,mdx,txt}' } = options;
    
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && recursive) {
        if (!options.exclude?.some(e => fullPath.includes(e))) {
          const subFiles = await this.scanDirectory(fullPath, options);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        if (this.matchesPattern(entry.name, filePattern)) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    const extensions = pattern.replace('*', '').replace('{', '').replace('}', '').split(',');
    return extensions.some(ext => filename.endsWith(ext.trim()));
  }

  private async extractFromFile(filePath: string): Promise<Pattern[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const patterns: Pattern[] = [];
    
    const sections = this.parseSections(content);
    const docType = this.detectDocType(filePath, content);
    
    // Full document pattern
    patterns.push({
      id: `${filePath}#full`,
      content: this.summarizeDocument(content),
      metadata: this.createMetadata(filePath, 'full', docType, 0, content.split('\n').length),
      confidence: 0.9
    });

    // Section patterns
    for (const section of sections) {
      patterns.push({
        id: `${filePath}#${section.title.replace(/\s+/g, '-').toLowerCase()}:${section.lineStart}`,
        content: `${section.title}: ${section.content.substring(0, 1000)}`,
        metadata: this.createMetadata(filePath, 'section', section.title, section.lineStart, section.lineEnd, {
          level: section.level,
          docType
        }),
        confidence: 0.85
      });
    }

    // Extract special patterns based on doc type
    if (docType === 'adr') {
      patterns.push(...this.extractADRPatterns(content, filePath));
    } else if (docType === 'spec' || docType === 'prd') {
      patterns.push(...this.extractSpecPatterns(content, filePath));
    } else if (docType === 'wsjf') {
      patterns.push(...this.extractWSJFPatterns(content, filePath));
    }

    return patterns;
  }

  private parseSections(content: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    const lines = content.split('\n');
    
    let currentSection: DocumentSection | null = null;
    let sectionStart = 0;

    lines.forEach((line, idx) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        // Close previous section
        if (currentSection) {
          currentSection.lineEnd = idx - 1;
          currentSection.content = lines
            .slice(currentSection.lineStart, currentSection.lineEnd + 1)
            .join('\n');
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          level: headingMatch[1].length,
          title: headingMatch[2].trim(),
          content: '',
          lineStart: idx,
          lineEnd: idx
        };
      }
    });

    // Close final section
    if (currentSection !== null) {
      const finalSection = currentSection;
      finalSection.lineEnd = lines.length - 1;
      finalSection.content = lines
        .slice(finalSection.lineStart)
        .join('\n');
      sections.push(finalSection);
    }

    return sections;
  }

  private detectDocType(filePath: string, _content: string): string {
    const basename = path.basename(filePath).toLowerCase();
    
    if (basename.includes('adr') || basename.includes('decision')) return 'adr';
    if (basename.includes('spec') || basename.includes('specification')) return 'spec';
    if (basename.includes('prd') || basename.includes('requirement')) return 'prd';
    if (basename.includes('wsjf') || basename.includes('prioritization')) return 'wsjf';
    if (basename.includes('roam') || basename.includes('risk')) return 'roam';
    if (basename.includes('readme')) return 'readme';
    if (basename.includes('plan')) return 'plan';
    
    return 'general';
  }

  private summarizeDocument(content: string): string {
    const lines = content.split('\n');
    const title = lines.find(l => l.startsWith('# '))?.replace('# ', '') || 'Untitled';
    const firstPara = lines.find(l => l.trim() && !l.startsWith('#')) || '';
    
    return `${title}. ${firstPara.substring(0, 500)}`;
  }

  private extractADRPatterns(content: string, filePath: string): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Context section
    const contextMatch = content.match(/##\s*Context\n([\s\S]*?)(?=##|$)/);
    if (contextMatch) {
      patterns.push({
        id: `${filePath}#adr:context`,
        content: `Context: ${contextMatch[1].trim().substring(0, 800)}`,
        metadata: this.createMetadata(filePath, 'adr-context', 'Context'),
        confidence: 0.95
      });
    }

    // Decision section
    const decisionMatch = content.match(/##\s*Decision\n([\s\S]*?)(?=##|$)/);
    if (decisionMatch) {
      patterns.push({
        id: `${filePath}#adr:decision`,
        content: `Decision: ${decisionMatch[1].trim().substring(0, 800)}`,
        metadata: this.createMetadata(filePath, 'adr-decision', 'Decision'),
        confidence: 0.98
      });
    }

    // Consequences
    const consequencesMatch = content.match(/##\s*Consequences\n([\s\S]*?)(?=##|$)/);
    if (consequencesMatch) {
      patterns.push({
        id: `${filePath}#adr:consequences`,
        content: `Consequences: ${consequencesMatch[1].trim().substring(0, 800)}`,
        metadata: this.createMetadata(filePath, 'adr-consequences', 'Consequences'),
        confidence: 0.9
      });
    }

    return patterns;
  }

  private extractSpecPatterns(content: string, filePath: string): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Requirements
    const reqMatches = content.matchAll(/-\s*\[?\s*\]?\s*(.+?(?:should|must|shall).+?)$/gmi);
    for (const match of reqMatches) {
      patterns.push({
        id: `${filePath}#req:${match.index}`,
        content: `Requirement: ${match[1].trim()}`,
        metadata: this.createMetadata(filePath, 'requirement', 'Requirement'),
        confidence: 0.9
      });
    }

    return patterns;
  }

  private extractWSJFPatterns(content: string, filePath: string): Pattern[] {
    const patterns: Pattern[] = [];
    
    // WSJF items
    const wsjfMatches = content.matchAll(/(\d+)\.\s*(.+?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)/g);
    for (const match of wsjfMatches) {
      patterns.push({
        id: `${filePath}#wsjf:${match[1]}`,
        content: `WSJF Item ${match[1]}: ${match[2].trim()}`,
        metadata: this.createMetadata(filePath, 'wsjf-item', match[2].trim(), undefined, undefined, {
          wsjfRank: parseInt(match[1]),
          costOfDelay: parseInt(match[3]),
          jobSize: parseInt(match[4])
        }),
        confidence: 0.9
      });
    }

    return patterns;
  }

  private createMetadata(
    filePath: string, 
    type: string, 
    title: string, 
    lineStart?: number, 
    lineEnd?: number,
    extra?: Record<string, unknown>
  ): VectorMetadata {
    return {
      domain: this.domain,
      source: filePath,
      timestamp: Date.now(),
      tags: [type, title, path.extname(filePath)].filter(Boolean),
      lineStart,
      lineEnd,
      docType: type,
      title,
      ...extra
    } as VectorMetadata;
  }

  async generateEmbedding(pattern: Pattern): Promise<number[]> {
    const model = globalEmbeddingRegistry.getDefault();
    return model.compute(pattern.content);
  }

  extractMetadata(pattern: Pattern): VectorMetadata {
    return pattern.metadata;
  }
}
