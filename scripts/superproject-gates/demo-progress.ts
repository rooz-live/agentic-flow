#!/usr/bin/env tsx
/**
 * Demo: Hierarchical Progress Tracking
 * 
 * Quick demonstration of progress rolling up from leaf to root
 */

import {
  ProcessingProgress,
  PipelinePhaseFactory
} from '../src/domain/progress/index';
import { ProgressFormatter } from '../src/domain/progress/formatter';

async function demo() {
  console.log('\n🎯 Hierarchical Progress Tracking Demo\n');
  console.log('Simulating episode processing pipeline...\n');
  
  // Create pipeline
  const phases = PipelinePhaseFactory.createStandardPipeline();
  const progress = new ProcessingProgress('demo-pipeline', phases);
  
  // Start pipeline
  progress.start();
  
  // Set totals
  progress.updatePhase('metrics', 0, 6334);
  progress.updatePhase('episodes', 0, 1918);
  progress.updatePhase('learning', 0, 5);
  
  let lineCount = 0;
  
  // Simulate metrics phase
  console.log('📊 Phase 1: Metrics Processing\n');
  for (let i = 0; i <= 6334; i += 634) {
    progress.updatePhase('metrics', Math.min(i, 6334), 6334);
    lineCount = ProgressFormatter.renderLive(progress, lineCount);
    await sleep(300);
  }
  
  // Simulate episodes phase
  console.log('\n\n📝 Phase 2: Episode Generation & Insertion\n');
  for (let i = 0; i <= 1918; i += 192) {
    progress.updatePhase('episodes', Math.min(i, 1918), 1918);
    lineCount = ProgressFormatter.renderLive(progress, lineCount);
    await sleep(300);
  }
  
  // Simulate learning phase
  console.log('\n\n🧠 Phase 3: Learning Cycles\n');
  for (let i = 0; i <= 5; i++) {
    progress.updatePhase('learning', i, 5);
    lineCount = ProgressFormatter.renderLive(progress, lineCount);
    await sleep(500);
  }
  
  // Final summary
  console.log('\n\n✅ Pipeline Complete!\n');
  console.log(ProgressFormatter.renderTree(progress));
  
  const metrics = progress.calculateMetrics();
  console.log(`\n📈 Final Metrics:`);
  console.log(`   Overall Progress: ${metrics.overallPercentage.toFixed(1)}%`);
  console.log(`   Total Time: ${(metrics.elapsedTime / 1000).toFixed(1)}s`);
  console.log(`   Throughput: ${metrics.throughputRate.toFixed(2)} items/sec`);
  
  // Show events
  console.log(`\n📋 Domain Events:`);
  const events = progress.getEvents();
  events.forEach(event => {
    console.log(`   - ${event.type}: ${new Date(event.timestamp).toISOString()}`);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run demo
demo().catch(console.error);
