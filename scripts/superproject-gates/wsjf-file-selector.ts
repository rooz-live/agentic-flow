/**
 * WSJF File Selector
 *
 * Dynamically selects files/modules for processing based on WSJF (Weighted Shortest Job First)
 * scoring to optimize cognitive load and maximize business value delivery.
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface FileMetadata {
  path: string;
  name: string;
  size: number;
  lines: number;
  extension: string;
  lastModified: Date;
  dependencies: string[];
}

export interface WSJFFileScore {
  file: FileMetadata;
  businessValue: number;      // 1-10
  timeCriticality: number;     // 1-10
  riskReduction: number;       // 1-10
  jobSize: number;             // 1-10 (derived from file complexity)
  wsjfScore: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface SelectionCriteria {
  maxFiles?: number;
  minBusinessValue?: number;
  maxJobSize?: number;
  extensions?: string[];
  excludePatterns?: string[];
  sortBy?: 'wsjf' | 'businessValue' | 'timeCriticality' | 'riskReduction';
}

export interface FileSelectionResult {
  selectedFiles: WSJFFileScore[];
  totalScanned: number;
  averageWSJF: number;
  totalJobSize: number;
  selectionRationale: string;
}

// ============================================================================
// WSJF File Selector Implementation
// ============================================================================

export class WSJFFileSelector {
  private baseDir: string;
  private fileScores: Map<string, WSJFFileScore> = new Map();

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  // ========================================================================
  // File Scanning and Metadata Extraction
  // ========================================================================

  public async scanDirectory(
    dir: string = this.baseDir,
    excludePatterns: string[] = ['node_modules', 'dist', '.git', 'build']
  ): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];

    async function scan(currentDir: string): Promise<void> {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // Skip excluded patterns
        if (excludePatterns.some(pattern => fullPath.includes(pattern))) {
          continue;
        }

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile()) {
          const metadata = await this.extractFileMetadata(fullPath);
          if (metadata) {
            files.push(metadata);
          }
        }
      }
    }

    await scan(dir);
    return files;
  }

  private async extractFileMetadata(filePath: string): Promise<FileMetadata | null> {
    try {
      const stats = await stat(filePath);
      const content = await fs.promises.readFile(filePath, 'utf8');
      const lines = content.split('\n').length;
      const dependencies = this.extractDependencies(content, path.extname(filePath));

      return {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        lines,
        extension: path.extname(filePath),
        lastModified: stats.mtime,
        dependencies
      };
    } catch (error) {
      console.warn(`Failed to extract metadata for ${filePath}:`, error);
      return null;
    }
  }

  private extractDependencies(content: string, extension: string): string[] {
    const dependencies: string[] = [];

    // TypeScript/JavaScript imports
    if (['.ts', '.js', '.tsx', '.jsx'].includes(extension)) {
      const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        dependencies.push(match[1]);
      }

      const requireRegex = /require\(['"](.+?)['"]\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        dependencies.push(match[1]);
      }
    }

    // Python imports
    if (extension === '.py') {
      const importRegex = /(?:from|import)\s+([\w.]+)/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        dependencies.push(match[1]);
      }
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  // ========================================================================
  // WSJF Scoring
  // ========================================================================

  public scoreFile(
    file: FileMetadata,
    criteria: {
      businessValueHeuristic?: (file: FileMetadata) => number;
      timeCriticalityHeuristic?: (file: FileMetadata) => number;
      riskReductionHeuristic?: (file: FileMetadata) => number;
    } = {}
  ): WSJFFileScore {
    // Calculate business value (default heuristic)
    const businessValue = criteria.businessValueHeuristic
      ? criteria.businessValueHeuristic(file)
      : this.calculateBusinessValue(file);

    // Calculate time criticality (default heuristic)
    const timeCriticality = criteria.timeCriticalityHeuristic
      ? criteria.timeCriticalityHeuristic(file)
      : this.calculateTimeCriticality(file);

    // Calculate risk reduction (default heuristic)
    const riskReduction = criteria.riskReductionHeuristic
      ? criteria.riskReductionHeuristic(file)
      : this.calculateRiskReduction(file);

    // Calculate job size
    const jobSize = this.calculateJobSize(file);

    // Calculate WSJF score: (Business Value + Time Criticality + Risk Reduction) / Job Size
    const costOfDelay = businessValue + timeCriticality + riskReduction;
    const wsjfScore = costOfDelay / jobSize;

    // Determine priority
    const priority = this.determinePriority(wsjfScore);

    const score: WSJFFileScore = {
      file,
      businessValue,
      timeCriticality,
      riskReduction,
      jobSize,
      wsjfScore,
      priority
    };

    this.fileScores.set(file.path, score);
    return score;
  }

  private calculateBusinessValue(file: FileMetadata): number {
    // Heuristics for business value
    let score = 5; // Base score

    // Core files have higher business value
    if (file.path.includes('/core/') || file.path.includes('/src/core/')) {
      score += 3;
    }

    // API and interface files
    if (file.name.includes('api') || file.name.includes('interface') || file.name.includes('service')) {
      score += 2;
    }

    // Configuration and framework files
    if (file.name.includes('config') || file.name.includes('framework')) {
      score += 2;
    }

    // Test files have lower direct business value
    if (file.name.includes('.test.') || file.name.includes('.spec.')) {
      score -= 2;
    }

    // High dependency count indicates important files
    if (file.dependencies.length > 10) {
      score += 1;
    }

    return Math.min(Math.max(score, 1), 10);
  }

  private calculateTimeCriticality(file: FileMetadata): number {
    let score = 5; // Base score

    // Recently modified files are more time-critical
    const daysSinceModified = (Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceModified < 1) {
      score += 3; // Modified today
    } else if (daysSinceModified < 7) {
      score += 2; // Modified this week
    } else if (daysSinceModified < 30) {
      score += 1; // Modified this month
    }

    // Files with many dependencies are time-critical (blocking others)
    if (file.dependencies.length > 5) {
      score += 1;
    }

    // Index files and entry points
    if (file.name === 'index.ts' || file.name === 'main.ts' || file.name === 'app.ts') {
      score += 2;
    }

    return Math.min(Math.max(score, 1), 10);
  }

  private calculateRiskReduction(file: FileMetadata): number {
    let score = 5; // Base score

    // Large files have higher risk
    if (file.lines > 1000) {
      score += 3;
    } else if (file.lines > 500) {
      score += 2;
    }

    // Complex files with many dependencies
    if (file.dependencies.length > 15) {
      score += 2;
    } else if (file.dependencies.length > 10) {
      score += 1;
    }

    // Critical system files
    if (file.path.includes('orchestration') || file.path.includes('health')) {
      score += 2;
    }

    // Security-related files
    if (file.path.includes('security') || file.path.includes('auth')) {
      score += 2;
    }

    return Math.min(Math.max(score, 1), 10);
  }

  private calculateJobSize(file: FileMetadata): number {
    // Job size is based on file complexity
    let score = 5; // Base score

    // Lines of code
    if (file.lines < 50) {
      score = 2;
    } else if (file.lines < 200) {
      score = 4;
    } else if (file.lines < 500) {
      score = 6;
    } else if (file.lines < 1000) {
      score = 8;
    } else {
      score = 10;
    }

    // Adjust for dependencies (more dependencies = more complex)
    if (file.dependencies.length > 20) {
      score = Math.min(score + 2, 10);
    } else if (file.dependencies.length > 10) {
      score = Math.min(score + 1, 10);
    }

    return score;
  }

  private determinePriority(wsjfScore: number): 'critical' | 'high' | 'medium' | 'low' {
    if (wsjfScore >= 8) return 'critical';
    if (wsjfScore >= 5) return 'high';
    if (wsjfScore >= 3) return 'medium';
    return 'low';
  }

  // ========================================================================
  // File Selection
  // ========================================================================

  public async selectFiles(criteria: SelectionCriteria = {}): Promise<FileSelectionResult> {
    // Scan directory if not already done
    if (this.fileScores.size === 0) {
      const files = await this.scanDirectory(this.baseDir, criteria.excludePatterns);
      for (const file of files) {
        this.scoreFile(file);
      }
    }

    // Filter files based on criteria
    let filteredScores = Array.from(this.fileScores.values());

    if (criteria.extensions) {
      filteredScores = filteredScores.filter(score =>
        criteria.extensions!.includes(score.file.extension)
      );
    }

    if (criteria.minBusinessValue) {
      filteredScores = filteredScores.filter(score =>
        score.businessValue >= criteria.minBusinessValue!
      );
    }

    if (criteria.maxJobSize) {
      filteredScores = filteredScores.filter(score =>
        score.jobSize <= criteria.maxJobSize!
      );
    }

    // Sort by criteria
    const sortBy = criteria.sortBy || 'wsjf';
    filteredScores.sort((a, b) => {
      switch (sortBy) {
        case 'wsjf':
          return b.wsjfScore - a.wsjfScore;
        case 'businessValue':
          return b.businessValue - a.businessValue;
        case 'timeCriticality':
          return b.timeCriticality - a.timeCriticality;
        case 'riskReduction':
          return b.riskReduction - a.riskReduction;
        default:
          return b.wsjfScore - a.wsjfScore;
      }
    });

    // Limit number of files
    const selectedFiles = criteria.maxFiles
      ? filteredScores.slice(0, criteria.maxFiles)
      : filteredScores;

    // Calculate metrics
    const averageWSJF = selectedFiles.length > 0
      ? selectedFiles.reduce((sum, s) => sum + s.wsjfScore, 0) / selectedFiles.length
      : 0;

    const totalJobSize = selectedFiles.reduce((sum, s) => sum + s.jobSize, 0);

    // Generate rationale
    const rationale = this.generateSelectionRationale(selectedFiles, criteria);

    return {
      selectedFiles,
      totalScanned: this.fileScores.size,
      averageWSJF,
      totalJobSize,
      selectionRationale: rationale
    };
  }

  private generateSelectionRationale(files: WSJFFileScore[], criteria: SelectionCriteria): string {
    const priorities = files.reduce((acc, f) => {
      acc[f.priority] = (acc[f.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const rationale = [
      `Selected ${files.length} files based on WSJF prioritization.`,
      `Priority distribution: ${Object.entries(priorities).map(([p, c]) => `${p}=${c}`).join(', ')}`,
      `Average WSJF score: ${(files.reduce((sum, f) => sum + f.wsjfScore, 0) / files.length).toFixed(2)}`,
      `Total estimated job size: ${files.reduce((sum, f) => sum + f.jobSize, 0)}`
    ];

    if (criteria.maxFiles) {
      rationale.push(`Limited to top ${criteria.maxFiles} files`);
    }

    if (criteria.minBusinessValue) {
      rationale.push(`Minimum business value threshold: ${criteria.minBusinessValue}`);
    }

    return rationale.join('. ') + '.';
  }

  // ========================================================================
  // Reporting
  // ========================================================================

  public getFileScore(filePath: string): WSJFFileScore | undefined {
    return this.fileScores.get(filePath);
  }

  public getAllScores(): WSJFFileScore[] {
    return Array.from(this.fileScores.values());
  }

  public exportScores(outputPath: string): void {
    const scores = this.getAllScores();
    const data = {
      timestamp: new Date().toISOString(),
      baseDir: this.baseDir,
      totalFiles: scores.length,
      scores: scores.map(s => ({
        path: s.file.path,
        name: s.file.name,
        businessValue: s.businessValue,
        timeCriticality: s.timeCriticality,
        riskReduction: s.riskReduction,
        jobSize: s.jobSize,
        wsjfScore: s.wsjfScore,
        priority: s.priority,
        lines: s.file.lines,
        dependencies: s.file.dependencies.length
      }))
    };

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`WSJF scores exported to ${outputPath}`);
  }
}

// ============================================================================
// Factory and Utility Functions
// ============================================================================

export function createFileSelector(baseDir: string): WSJFFileSelector {
  return new WSJFFileSelector(baseDir);
}

export async function quickSelect(
  baseDir: string,
  maxFiles: number = 10,
  extensions: string[] = ['.ts', '.js']
): Promise<FileSelectionResult> {
  const selector = new WSJFFileSelector(baseDir);
  return selector.selectFiles({ maxFiles, extensions });
}
