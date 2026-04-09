#!/usr/bin/env tsx
/**
 * ay-prod Runner with Hierarchical Progress Tracking
 * 
 * Integrates the domain progress tracking model with circle ceremonies
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  ProcessingProgress,
  PhaseProgress,
  ProgressCalculator
} from '../src/domain/progress/index.js';
import { UnifiedProgressTracker } from '../src/core/unified-progress-tracker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CircleCeremony {
  circle: string;
  ceremony: string;
  weight: number;
}

class CircleCeremonyRunner {
  private overallProgress: ProcessingProgress;
  private unifiedTracker: UnifiedProgressTracker;
  private processes: Map<string, ChildProcess> = new Map();
  private previousLines = 0;
  
  constructor(private ceremonies: CircleCeremony[]) {
    // Create phases for overall runner
    const phases: PhaseProgress[] = ceremonies.map(c => ({
      name: `${c.circle}:${c.ceremony}`,
      completed: 0,
      total: 100, // Each ceremony is 100 steps
      weight: c.weight,
      status: 'waiting' as const
    }));
    
    this.overallProgress = new ProcessingProgress('ay-prod-runner', phases);
    this.unifiedTracker = new UnifiedProgressTracker();
  }
  
  async runAll(): Promise<void> {
    console.clear();
    console.log('\n🚀 ay-prod: Running Circle Ceremonies with Unified Progress Tracking\n');
    
    // Initialize unified tracker
    await this.unifiedTracker.init();
    
    const phases: PhaseProgress[] = this.ceremonies.map(c => ({
      name: `${c.circle}:${c.ceremony}`,
      completed: 0,
      total: 100,
      weight: c.weight,
      status: 'waiting' as const
    }));
    
    this.overallProgress.start();
    this.unifiedTracker.startExecution('ay-prod-runner', phases);
    
    // Start all ceremonies in parallel
    const promises = this.ceremonies.map(c => this.runCeremony(c));
    
    // Start rendering loop
    const renderInterval = setInterval(() => {
      this.render();
    }, 1000);
    
    // Wait for all to complete
    try {
      await Promise.all(promises);
    } finally {
      clearInterval(renderInterval);
    }
    
    // Final render
    this.render();
    
    // Summary with unified metrics
    const metrics = this.overallProgress.calculateMetrics();
    console.log('\n\n✅ All Ceremonies Complete!\n');
    console.log('📊 Final Metrics:');
    console.log(`   Overall Progress: ${metrics.overallPercentage.toFixed(1)}%`);
    console.log(`   Total Time: ${(metrics.elapsedTime / 1000).toFixed(1)}s`);
    console.log(`   Throughput: ${metrics.throughputRate.toFixed(2)} ceremonies/sec`);
    
    // Show traced issues
    const issues = this.unifiedTracker.getIssues();
    if (issues.length > 0) {
      console.log('\n⚠️  Issues Detected:');
      issues.forEach(issue => {
        const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'error' ? '🟠' : '🟡';
        console.log(`   ${icon} [${issue.severity.toUpperCase()}] ${issue.message}`);
        if (issue.suggestedAction) {
          console.log(`      → ${issue.suggestedAction}`);
        }
      });
    }
    
    // Show high-priority improvements
    const improvements = this.unifiedTracker.getHighPriorityImprovements();
    if (improvements.length > 0) {
      console.log('\n💡 Recommended Improvements:');
      improvements.slice(0, 3).forEach(imp => {
        console.log(`   • ${imp.title}`);
        console.log(`     ${imp.description}`);
        console.log(`     Impact: ${imp.estimatedImpact}`);
      });
      console.log(`\n   (${improvements.length} total high-priority improvements available)`);
    }
    
    this.unifiedTracker.close();
  }
  
  private async runCeremony(ceremony: CircleCeremony): Promise<void> {
    const scriptPath = path.join(__dirname, 'ay-prod-cycle.sh');
    const phaseName = `${ceremony.circle}:${ceremony.ceremony}`;
    
    return new Promise((resolve, reject) => {
      const proc = spawn(
        scriptPath,
        [ceremony.circle, ceremony.ceremony, 'advisory'],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: true
        }
      );
      
      this.processes.set(phaseName, proc);
      
      // Simulate progress based on output
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + 10, 95);
        this.overallProgress.updatePhase(phaseName, progress, 100);
        this.unifiedTracker.updatePhase(phaseName, progress, 100);
      }, 1000);
      
      proc.on('close', async (code) => {
        clearInterval(progressInterval);
        
        if (code === 0) {
          this.overallProgress.updatePhase(phaseName, 100, 100);
          this.unifiedTracker.updatePhase(phaseName, 100, 100);
          
          // Store episode in completion tracker
          const episodeId = `${phaseName}_${Date.now()}`;
          await this.unifiedTracker.completeExecution(
            episodeId,
            ceremony.circle as any,
            ceremony.ceremony,
            'success',
            0.9
          );
          
          resolve();
        } else {
          // Store failed episode
          const episodeId = `${phaseName}_${Date.now()}`;
          await this.unifiedTracker.completeExecution(
            episodeId,
            ceremony.circle as any,
            ceremony.ceremony,
            'failure',
            0.5
          );
          
          reject(new Error(`${phaseName} failed with code ${code}`));
        }
      });
      
      proc.on('error', (err) => {
        clearInterval(progressInterval);
        reject(err);
      });
    });
  }
  
  private render(): void {
    if (this.previousLines > 0) {
      process.stdout.write(`\x1b[${this.previousLines}A`);
    }
    
    const metrics = this.overallProgress.calculateMetrics();
    const phases = this.overallProgress.getPhases();
    
    const lines: string[] = [];
    
    // Header
    const overallBar = this.renderProgressBar(metrics.overallPercentage, 40);
    const eta = metrics.estimatedTimeRemaining > 0
      ? ` | ETA: ${ProgressCalculator.formatDuration(metrics.estimatedTimeRemaining)}`
      : '';
    
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`\x1b[1m🚀 Overall Runner: ${metrics.overallPercentage.toFixed(1)}% complete${eta}\x1b[0m`);
    lines.push(overallBar);
    lines.push('');
    
    // Each ceremony
    phases.forEach((phase, index) => {
      const isLast = index === phases.length - 1;
      const connector = isLast ? '└─' : '├─';
      
      const percentage = phase.total > 0
        ? ((phase.completed / phase.total) * 100).toFixed(1)
        : '0.0';
      
      const statusIcon = this.getStatusIcon(phase.status);
      const color = this.getStatusColor(phase.status);
      
      const bar = this.renderProgressBar(parseFloat(percentage), 30);
      
      lines.push(`${connector} ${color}${phase.name}: ${percentage}% ${statusIcon}\x1b[0m`);
      lines.push(`   ${bar}`);
    });
    
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const output = lines.join('\n');
    console.log(output);
    
    this.previousLines = lines.length;
  }
  
  private renderProgressBar(percentage: number, width: number): string {
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;
    
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    
    let color = '\x1b[90m';
    if (percentage >= 100) color = '\x1b[32m';
    else if (percentage >= 50) color = '\x1b[36m';
    else if (percentage > 0) color = '\x1b[33m';
    
    return `${color}[${filledBar}${emptyBar}]\x1b[0m ${percentage.toFixed(1)}%`;
  }
  
  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'waiting': '⏸️',
      'running': '🔄',
      'completed': '✅',
      'failed': '❌'
    };
    return icons[status] || '•';
  }
  
  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'waiting': '\x1b[90m',
      'running': '\x1b[36m',
      'completed': '\x1b[32m',
      'failed': '\x1b[33m'
    };
    return colors[status] || '\x1b[0m';
  }
}

// Main execution
async function main() {
  const ceremonies: CircleCeremony[] = [
    { circle: 'orchestrator', ceremony: 'standup', weight: 0.25 },
    { circle: 'assessor', ceremony: 'wsjf', weight: 0.25 },
    { circle: 'analyst', ceremony: 'refine', weight: 0.25 },
    { circle: 'innovator', ceremony: 'retro', weight: 0.25 }
  ];
  
  const runner = new CircleCeremonyRunner(ceremonies);
  
  try {
    await runner.runAll();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Runner failed:', error);
    process.exit(1);
  }
}

main();
