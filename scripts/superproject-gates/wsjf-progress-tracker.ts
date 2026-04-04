#!/usr/bin/env tsx
/**
 * WSJF Progress Tracker
 * Tracks % progress and hierarchical mesh sparse attention coverage swarm
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface WSJFProgress {
  iteration: number;
  cycle: number;
  progressPercent: number;
  hierarchicalMeshCoverage: number;
  sparseAttentionCoverage: number;
  swarmState: {
    activeAgents: number;
    maxAgents: number;
    topology: string;
  };
  metrics: {
    patternRationale: number;
    mymScores: {
      manthra: number | null;
      yasna: number | null;
      mithra: number | null;
    };
    roamStaleness: number;
    testCoverage: number;
  };
  timestamp: number;
}

export class WSJFProgressTracker {
  private projectRoot: string;
  private progressFile: string;
  
  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.progressFile = path.join(this.projectRoot, '.goalie/wsjf-progress.jsonl');
    this.ensureProgressFile();
  }
  
  private ensureProgressFile(): void {
    const dir = path.dirname(this.progressFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.progressFile)) {
      fs.writeFileSync(this.progressFile, '', 'utf-8');
    }
  }
  
  /**
   * Calculate progress percent for iteration
   */
  calculateProgress(iteration: number, cycle: number, totalCycles: number): number {
    const cycleProgress = (cycle / totalCycles) * 100;
    const iterationProgress = ((iteration - 1) / 10) * 100; // Assume 10 iterations per phase
    return Math.min(100, (cycleProgress + iterationProgress) / 2);
  }
  
  /**
   * Get hierarchical mesh coverage
   */
  async getHierarchicalMeshCoverage(): Promise<number> {
    try {
      const coveragePath = path.join(this.projectRoot, 'coverage-v8/coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
        return coverage.total?.lines?.pct || 0;
      }
    } catch {
      // Ignore
    }
    return 0;
  }
  
  /**
   * Get sparse attention coverage
   */
  async getSparseAttentionCoverage(): Promise<number> {
    // Calculate based on settings.json sparse attention config
    try {
      const settingsPath = path.join(this.projectRoot, 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        const sparsity = settings.memory?.sparseAttention?.sparsity || 0.8;
        // Coverage = (1 - sparsity) * 100 (inverse: lower sparsity = higher coverage)
        return (1 - sparsity) * 100;
      }
    } catch {
      // Ignore
    }
    return 20; // Default 20% (0.8 sparsity)
  }
  
  /**
   * Get swarm state
   */
  async getSwarmState(): Promise<WSJFProgress['swarmState']> {
    try {
      const settingsPath = path.join(this.projectRoot, 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        return {
          activeAgents: 0, // Would need to query Claude-Flow
          maxAgents: settings.maxAgents || 15,
          topology: settings.topology || 'hierarchical-mesh'
        };
      }
    } catch {
      // Ignore
    }
    return {
      activeAgents: 0,
      maxAgents: 15,
      topology: 'hierarchical-mesh'
    };
  }
  
  /**
   * Get metrics
   */
  async getMetrics(): Promise<WSJFProgress['metrics']> {
    // This would integrate with toolsets orchestrator
    return {
      patternRationale: 0,
      mymScores: { manthra: null, yasna: null, mithra: null },
      roamStaleness: 0,
      testCoverage: await this.getHierarchicalMeshCoverage()
    };
  }
  
  /**
   * Record progress
   */
  async recordProgress(iteration: number, cycle: number, totalCycles: number): Promise<WSJFProgress> {
    const progress: WSJFProgress = {
      iteration,
      cycle,
      progressPercent: this.calculateProgress(iteration, cycle, totalCycles),
      hierarchicalMeshCoverage: await this.getHierarchicalMeshCoverage(),
      sparseAttentionCoverage: await this.getSparseAttentionCoverage(),
      swarmState: await this.getSwarmState(),
      metrics: await this.getMetrics(),
      timestamp: Date.now()
    };
    
    // Append to progress file
    fs.appendFileSync(this.progressFile, JSON.stringify(progress) + '\n', 'utf-8');
    
    return progress;
  }
  
  /**
   * Get latest progress
   */
  getLatestProgress(): WSJFProgress | null {
    try {
      const lines = fs.readFileSync(this.progressFile, 'utf-8').split('\n').filter(l => l.trim());
      if (lines.length === 0) return null;
      
      const latest = JSON.parse(lines[lines.length - 1]);
      return latest;
    } catch {
      return null;
    }
  }
  
  /**
   * Get progress trend
   */
  getProgressTrend(iterations: number = 10): Array<{ iteration: number; progress: number; coverage: number }> {
    try {
      const lines = fs.readFileSync(this.progressFile, 'utf-8').split('\n').filter(l => l.trim());
      const recent = lines.slice(-iterations);
      
      return recent.map(line => {
        const progress = JSON.parse(line);
        return {
          iteration: progress.iteration,
          progress: progress.progressPercent,
          coverage: progress.hierarchicalMeshCoverage
        };
      });
    } catch {
      return [];
    }
  }
  
  /**
   * Generate status line
   */
  generateStatusLine(progress: WSJFProgress): string {
    return `[Iter ${progress.iteration}.${progress.cycle}] Progress: ${progress.progressPercent.toFixed(1)}% | ` +
           `Mesh Coverage: ${progress.hierarchicalMeshCoverage.toFixed(1)}% | ` +
           `Sparse Attention: ${progress.sparseAttentionCoverage.toFixed(1)}% | ` +
           `Swarm: ${progress.swarmState.activeAgents}/${progress.swarmState.maxAgents} agents`;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const tracker = new WSJFProgressTracker();
  const iteration = Number(process.argv[2]) || 1;
  const cycle = Number(process.argv[3]) || 1;
  const totalCycles = Number(process.argv[4]) || 5;
  
  tracker.recordProgress(iteration, cycle, totalCycles)
    .then(progress => {
      console.log(tracker.generateStatusLine(progress));
      process.exit(0);
    })
    .catch(error => {
      console.error('Progress tracking failed:', error);
      process.exit(1);
    });
}
