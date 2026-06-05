/**
 * Code Pattern Adapter
 * AST-aware semantic extraction for code patterns, ADRs, DDD contexts
 */

import { DomainAdapter, ExtractionOptions } from './base';
import { Pattern, VectorMetadata, DomainConfig } from '../core/types';
import { globalEmbeddingRegistry } from '../core/embedding';
import { promises as fs } from 'fs';
import * as path from 'path';

interface CodePattern {
  type: 'function' | 'class' | 'interface' | 'adr' | 'ddd' | 'comment' | 'import';
  name: string;
  content: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  dependencies: string[];
}

export class CodePatternAdapter implements DomainAdapter {
  readonly domain = 'code';
  readonly config: DomainConfig = {
    name: 'code',
    quantization: { type: 'scalar', bits: 8 },
    embeddingDimension: 768,
    priority: 'high',
    maxVectors: 100000
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
    const { recursive = true, filePattern = '*.{ts,js,tsx,jsx,py,md}' } = options;
    
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
    const lines = content.split('\n');

    patterns.push(...this.extractFunctions(lines, filePath, content));
    patterns.push(...this.extractClasses(lines, filePath, content));
    patterns.push(...this.extractInterfaces(lines, filePath, content));
    patterns.push(...this.extractADRs(content, filePath));
    patterns.push(...this.extractDDDContexts(content, filePath));
    patterns.push(...this.extractImports(lines, filePath));

    return patterns;
  }

  private extractFunctions(lines: string[], filePath: string, fullContent: string): Pattern[] {
    const patterns: Pattern[] = [];
    const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g;
    const arrowRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
    
    let match;
    while ((match = funcRegex.exec(fullContent)) !== null) {
      const name = match[1];
      const lineNum = fullContent.substring(0, match.index).split('\n').length;
      
      patterns.push({
        id: `${filePath}#${name}:${lineNum}`,
        content: `Function ${name} in ${filePath}`,
        metadata: this.createMetadata(filePath, 'function', name, lineNum),
        confidence: 0.9
      });
    }

    while ((match = arrowRegex.exec(fullContent)) !== null) {
      const name = match[1];
      const lineNum = fullContent.substring(0, match.index).split('\n').length;
      
      patterns.push({
        id: `${filePath}#${name}:${lineNum}`,
        content: `Arrow function ${name} in ${filePath}`,
        metadata: this.createMetadata(filePath, 'function', name, lineNum),
        confidence: 0.85
      });
    }

    return patterns;
  }

  private extractClasses(lines: string[], filePath: string, fullContent: string): Pattern[] {
    const patterns: Pattern[] = [];
    const classRegex = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
    
    let match;
    while ((match = classRegex.exec(fullContent)) !== null) {
      const name = match[1];
      const parent = match[2];
      const lineNum = fullContent.substring(0, match.index).split('\n').length;
      
      patterns.push({
        id: `${filePath}#class:${name}:${lineNum}`,
        content: `Class ${name}${parent ? ` extends ${parent}` : ''} in ${filePath}`,
        metadata: this.createMetadata(filePath, 'class', name, lineNum),
        confidence: 0.95
      });
    }

    return patterns;
  }

  private extractInterfaces(lines: string[], filePath: string, fullContent: string): Pattern[] {
    const patterns: Pattern[] = [];
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g;
    
    let match;
    while ((match = interfaceRegex.exec(fullContent)) !== null) {
      const name = match[1];
      const lineNum = fullContent.substring(0, match.index).split('\n').length;
      
      patterns.push({
        id: `${filePath}#interface:${name}:${lineNum}`,
        content: `Interface ${name} in ${filePath}`,
        metadata: this.createMetadata(filePath, 'interface', name, lineNum),
        confidence: 0.95
      });
    }

    return patterns;
  }

  private extractADRs(content: string, filePath: string): Pattern[] {
    const patterns: Pattern[] = [];
    
    if (filePath.includes('ADR') || filePath.includes('adr')) {
      const adrRegex = /#\s*ADR-(\d+).*\n##\s*Context\n([\s\S]*?)##\s*Decision\n([\s\S]*?)##\s*Consequences\n([\s\S]*?)(?=##|$)/g;
      
      let match;
      while ((match = adrRegex.exec(content)) !== null) {
        const adrNum = match[1];
        const context = match[2].trim();
        const decision = match[3].trim();
        
        patterns.push({
          id: `${filePath}#ADR-${adrNum}`,
          content: `ADR-${adrNum}: ${decision}. Context: ${context}`,
          metadata: this.createMetadata(filePath, 'adr', `ADR-${adrNum}`),
          confidence: 0.98
        });
      }
    }

    return patterns;
  }

  private extractDDDContexts(content: string, filePath: string): Pattern[] {
    const patterns: Pattern[] = [];
    const dddKeywords = ['aggregate', 'entity', 'value object', 'domain service', 'repository', 'factory'];
    
    for (const keyword of dddKeywords) {
      const regex = new RegExp(`\\b${keyword.replace(' ', '\\s+')}\\b`, 'gi');
      if (regex.test(content)) {
        patterns.push({
          id: `${filePath}#ddd:${keyword}`,
          content: `DDD ${keyword} pattern in ${filePath}`,
          metadata: this.createMetadata(filePath, 'ddd', keyword),
          confidence: 0.8
        });
      }
    }

    return patterns;
  }

  private extractImports(lines: string[], filePath: string): Pattern[] {
    const patterns: Pattern[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"];?/;
    
    lines.forEach((line, idx) => {
      const match = importRegex.exec(line);
      if (match) {
        const module = match[1];
        patterns.push({
          id: `${filePath}#import:${idx}`,
          content: `Import from ${module} in ${filePath}`,
          metadata: this.createMetadata(filePath, 'import', module, idx + 1),
          confidence: 0.7
        });
      }
    });

    return patterns;
  }

  private createMetadata(filePath: string, type: string, name: string, lineNum?: number): VectorMetadata {
    return {
      domain: this.domain,
      source: filePath,
      timestamp: Date.now(),
      tags: [type, name, path.extname(filePath)].filter(Boolean),
      lineNumber: lineNum,
      patternType: type
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
