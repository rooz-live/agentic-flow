#!/usr/bin/env tsx
/**
 * Demo: Multi-Pipeline Progress Tracking with Overall Runner
 * 
 * Shows hierarchical progress with:
 * - Overall Runner Pipeline (Level 0)
 *   - Individual Pipelines (Level 1)
 *     - Phases (Level 2)
 *       - Sub-phases (Level 3)
 */

import {
  ProcessingProgress,
  PhaseProgress,
  ProgressCalculator
} from '../src/domain/progress/index';
import { ProgressFormatter } from '../src/domain/progress/formatter';

interface PipelineStatus {
  id: string;
  progress: ProcessingProgress;
  completed: number;
  total: number;
}

class MultiPipelineRunner {
  private pipelines: Map<string, PipelineStatus> = new Map();
  private overallProgress: ProcessingProgress;
  
  constructor(pipelineConfigs: Array<{ id: string; metrics: number; episodes: number; learning: number }>) {
    // Create individual pipelines
    pipelineConfigs.forEach(config => {
      const phases: PhaseProgress[] = [
        {
          name: 'metrics',
          completed: 0,
          total: config.metrics,
          weight: 0.2,
          status: 'waiting'
        },
        {
          name: 'episodes',
          completed: 0,
          total: config.episodes,
          weight: 0.4,
          status: 'waiting',
          children: [
            {
              name: 'episodes:generation',
              completed: 0,
              total: config.episodes,
              weight: 0.5,
              status: 'waiting'
            },
            {
              name: 'episodes:insertion',
              completed: 0,
              total: config.episodes,
              weight: 0.5,
              status: 'waiting'
            }
          ]
        },
        {
          name: 'learning',
          completed: 0,
          total: config.learning,
          weight: 0.4,
          status: 'waiting'
        }
      ];
      
      const pipeline = new ProcessingProgress(config.id, phases);
      pipeline.start();
      
      const totalItems = config.metrics + config.episodes + config.learning;
      this.pipelines.set(config.id, {
        id: config.id,
        progress: pipeline,
        completed: 0,
        total: totalItems
      });
    });
    
    // Create overall runner pipeline
    const runnerPhases: PhaseProgress[] = Array.from(this.pipelines.values()).map((ps, index) => ({
      name: ps.id,
      completed: 0,
      total: ps.total,
      weight: 1.0 / this.pipelines.size, // Equal weight for each pipeline
      status: 'waiting' as const
    }));
    
    this.overallProgress = new ProcessingProgress('overall-runner', runnerPhases);
    this.overallProgress.start();
  }
  
  updatePipeline(pipelineId: string, phase: string, completed: number) {
    const ps = this.pipelines.get(pipelineId);
    if (!ps) return;
    
    const phaseObj = ps.progress.getPhases().find(p => p.name === phase);
    if (!phaseObj) return;
    
    ps.progress.updatePhase(phase, completed, phaseObj.total);
    
    // Update overall runner
    const pipelinePercentage = ps.progress.calculateOverallProgress();
    const pipelineCompleted = Math.floor((pipelinePercentage / 100) * ps.total);
    this.overallProgress.updatePhase(pipelineId, pipelineCompleted, ps.total);
  }
  
  render(): string {
    const lines: string[] = [];
    
    // Overall runner header
    const overallMetrics = this.overallProgress.calculateMetrics();
    const overallBar = this.renderProgressBar(overallMetrics.overallPercentage, 40);
    const eta = overallMetrics.estimatedTimeRemaining > 0
      ? ` | ETA: ${ProgressCalculator.formatDuration(overallMetrics.estimatedTimeRemaining)}`
      : '';
    
    lines.push(`\x1b[1m🚀 Overall Runner Pipeline: ${overallMetrics.overallPercentage.toFixed(1)}% complete${eta}\x1b[0m`);
    lines.push(overallBar);
    lines.push('');
    
    // Each individual pipeline
    Array.from(this.pipelines.values()).forEach((ps, index) => {
      const isLast = index === this.pipelines.size - 1;
      const connector = isLast ? '└─' : '├─';
      const childPrefix = isLast ? '   ' : '│  ';
      
      const pipelineMetrics = ps.progress.calculateMetrics();
      const pipelineBar = this.renderProgressBar(pipelineMetrics.overallPercentage, 30);
      
      // Pipeline header
      lines.push(`${connector} \x1b[36m${ps.id}: ${pipelineMetrics.overallPercentage.toFixed(1)}%\x1b[0m`);
      lines.push(`${childPrefix}${pipelineBar}`);
      
      // Each phase
      const phases = ps.progress.getPhases();
      phases.forEach((phase, phaseIndex) => {
        const isLastPhase = phaseIndex === phases.length - 1;
        const phaseConnector = isLastPhase ? '└─' : '├─';
        const phasePrefix = isLastPhase ? '   ' : '│  ';
        
        const phasePercentage = phase.total > 0
          ? ((phase.completed / phase.total) * 100).toFixed(1)
          : '0.0';
        
        const statusIcon = this.getStatusIcon(phase.status);
        const color = this.getStatusColor(phase.status);
        
        lines.push(`${childPrefix}${phaseConnector} ${color}${phase.name}: ${phasePercentage}% (${phase.completed}/${phase.total}) ${statusIcon}\x1b[0m`);
        
        // Progress bar for phase
        const phaseBar = this.renderProgressBar(parseFloat(phasePercentage), 20);
        lines.push(`${childPrefix}${phasePrefix}${phaseBar}`);
      });
      
      if (!isLast) lines.push('│');
    });
    
    return lines.join('\n');
  }
  
  private renderProgressBar(percentage: number, width: number = 30): string {
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;
    
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    
    let color = '\x1b[90m'; // gray
    if (percentage >= 100) color = '\x1b[32m'; // green
    else if (percentage >= 50) color = '\x1b[36m'; // cyan
    else if (percentage > 0) color = '\x1b[33m'; // yellow
    
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
      'waiting': '\x1b[90m',    // gray
      'running': '\x1b[36m',    // cyan
      'completed': '\x1b[32m',  // green
      'failed': '\x1b[33m'      // yellow
    };
    return colors[status] || '\x1b[0m';
  }
  
  getMetrics() {
    return {
      overall: this.overallProgress.calculateMetrics(),
      pipelines: Array.from(this.pipelines.entries()).map(([id, ps]) => ({
        id,
        metrics: ps.progress.calculateMetrics()
      }))
    };
  }
}

async function demo() {
  console.clear();
  console.log('\n🎯 Multi-Pipeline Runner with Hierarchical Progress\n');
  console.log('Tracking 3 pipelines with overall rollup...\n');
  
  // Create runner with 3 pipelines
  const runner = new MultiPipelineRunner([
    { id: 'pipeline-A', metrics: 2000, episodes: 600, learning: 5 },
    { id: 'pipeline-B', metrics: 3000, episodes: 900, learning: 5 },
    { id: 'pipeline-C', metrics: 1334, episodes: 418, learning: 5 }
  ]);
  
  let previousLines = 0;
  
  // Simulate concurrent execution
  const updateInterval = 200; // ms
  const totalSteps = 20;
  
  for (let step = 0; step <= totalSteps; step++) {
    // Update pipeline-A (faster)
    const progressA = Math.min(step / totalSteps * 1.2, 1.0);
    runner.updatePipeline('pipeline-A', 'metrics', Math.floor(2000 * progressA));
    runner.updatePipeline('pipeline-A', 'episodes', Math.floor(600 * progressA));
    runner.updatePipeline('pipeline-A', 'learning', Math.floor(5 * progressA));
    
    // Update pipeline-B (medium)
    const progressB = Math.min(step / totalSteps * 1.0, 1.0);
    runner.updatePipeline('pipeline-B', 'metrics', Math.floor(3000 * progressB));
    runner.updatePipeline('pipeline-B', 'episodes', Math.floor(900 * progressB));
    runner.updatePipeline('pipeline-B', 'learning', Math.floor(5 * progressB));
    
    // Update pipeline-C (slower)
    const progressC = Math.min(step / totalSteps * 0.8, 1.0);
    runner.updatePipeline('pipeline-C', 'metrics', Math.floor(1334 * progressC));
    runner.updatePipeline('pipeline-C', 'episodes', Math.floor(418 * progressC));
    runner.updatePipeline('pipeline-C', 'learning', Math.floor(5 * progressC));
    
    // Render
    if (previousLines > 0) {
      process.stdout.write(`\x1b[${previousLines}A`); // Move cursor up
    }
    
    const output = runner.render();
    console.log(output);
    previousLines = output.split('\n').length;
    
    await sleep(updateInterval);
  }
  
  // Final summary
  console.log('\n\n✅ All Pipelines Complete!\n');
  
  const metrics = runner.getMetrics();
  console.log('📊 Final Metrics:\n');
  console.log(`   Overall Runner: ${metrics.overall.overallPercentage.toFixed(1)}%`);
  console.log(`   Total Time: ${(metrics.overall.elapsedTime / 1000).toFixed(1)}s`);
  console.log(`   Overall Throughput: ${metrics.overall.throughputRate.toFixed(2)} items/sec\n`);
  
  metrics.pipelines.forEach(p => {
    console.log(`   ${p.id}:`);
    console.log(`     Progress: ${p.metrics.overallPercentage.toFixed(1)}%`);
    console.log(`     Throughput: ${p.metrics.throughputRate.toFixed(2)} items/sec`);
  });
  
  console.log('\n✨ Hierarchical rollup working at all levels!');
  console.log('   Level 0: Overall Runner (aggregates all pipelines)');
  console.log('   Level 1: Individual Pipelines (A, B, C)');
  console.log('   Level 2: Phases (metrics, episodes, learning)');
  console.log('   Level 3: Sub-phases (episodes:generation, episodes:insertion)\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run demo
demo().catch(console.error);
