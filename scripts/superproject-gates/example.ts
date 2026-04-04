/**
 * Example: Hierarchical Progress Tracking Usage
 * 
 * Demonstrates how to integrate progress tracking into pipelines
 */

import {
  ProcessingProgress,
  PipelinePhaseFactory,
  ProgressCalculator
} from './index';
import { ProgressFormatter } from './formatter';
import { InMemoryProgressRepository } from './repository';

// ============================================================================
// Example 1: Basic Pipeline Progress
// ============================================================================

async function exampleBasicPipeline() {
  // Create pipeline with standard phases
  const phases = PipelinePhaseFactory.createStandardPipeline();
  const progress = new ProcessingProgress('pipeline-001', phases);
  
  // Start pipeline
  progress.start();
  
  // Simulate metrics phase
  progress.updatePhase('metrics', 0, 6334);
  for (let i = 0; i <= 6334; i += 100) {
    progress.updatePhase('metrics', i, 6334);
    console.log(ProgressFormatter.renderCompact(progress));
    await sleep(10); // Simulate work
  }
  
  // Simulate episodes phase
  progress.updatePhase('episodes', 0, 926);
  for (let i = 0; i <= 926; i += 10) {
    progress.updatePhase('episodes', i, 926);
    console.log(ProgressFormatter.renderCompact(progress));
    await sleep(10);
  }
  
  // Final render
  console.log('\n' + ProgressFormatter.renderTree(progress));
}

// ============================================================================
// Example 2: Live Updating Tree View
// ============================================================================

async function exampleLiveTreeView() {
  const phases = PipelinePhaseFactory.createStandardPipeline();
  const progress = new ProcessingProgress('pipeline-002', phases);
  
  progress.start();
  
  // Set totals
  progress.updatePhase('metrics', 0, 6334);
  progress.updatePhase('episodes', 0, 926);
  progress.updatePhase('learning', 0, 5);
  
  let lineCount = 0;
  
  // Simulate metrics
  for (let i = 0; i <= 6334; i += 317) {
    progress.updatePhase('metrics', Math.min(i, 6334), 6334);
    lineCount = ProgressFormatter.renderLive(progress, lineCount);
    await sleep(100);
  }
  
  // Simulate episodes
  for (let i = 0; i <= 926; i += 46) {
    progress.updatePhase('episodes', Math.min(i, 926), 926);
    lineCount = ProgressFormatter.renderLive(progress, lineCount);
    await sleep(100);
  }
  
  // Simulate learning
  for (let i = 0; i <= 5; i++) {
    progress.updatePhase('learning', i, 5);
    lineCount = ProgressFormatter.renderLive(progress, lineCount);
    await sleep(200);
  }
  
  console.log('\n✅ Pipeline complete!');
}

// ============================================================================
// Example 3: With Repository and Event Handling
// ============================================================================

async function exampleWithRepository() {
  const repo = new InMemoryProgressRepository();
  const phases = PipelinePhaseFactory.createStandardPipeline();
  const progress = new ProcessingProgress('pipeline-003', phases);
  
  // Start and save
  progress.start();
  await repo.save(progress);
  
  // Update and handle events
  progress.updatePhase('metrics', 100, 1000);
  
  // Get events
  const events = progress.getEvents();
  events.forEach(event => {
    console.log(`Event: ${event.type}`, event);
  });
  
  // Clear events after processing
  progress.clearEvents();
  
  // Save updated state
  await repo.save(progress);
  
  // Retrieve later
  const retrieved = await repo.findById('pipeline-003');
  if (retrieved) {
    console.log('Retrieved progress:', retrieved.calculateOverallProgress());
  }
}

// ============================================================================
// Example 4: Hierarchical Progress with Children
// ============================================================================

async function exampleHierarchical() {
  const phases = PipelinePhaseFactory.createStandardPipeline();
  const progress = new ProcessingProgress('pipeline-004', phases);
  
  progress.start();
  
  // Set totals for parent and children
  progress.updatePhase('episodes', 0, 926);
  
  // Note: To update children, you need to track them separately
  // or extend the ProcessingProgress class to support nested updates
  
  // For now, this shows how hierarchical calculation works
  const episodesPhase = progress.getPhases().find(p => p.name === 'episodes');
  if (episodesPhase?.children) {
    const generationProgress = ProgressCalculator.calculateHierarchical(
      episodesPhase.children[0]
    );
    const insertionProgress = ProgressCalculator.calculateHierarchical(
      episodesPhase.children[1]
    );
    
    console.log(`Generation: ${generationProgress}%`);
    console.log(`Insertion: ${insertionProgress}%`);
  }
}

// ============================================================================
// Example 5: Integration with Existing Pipeline
// ============================================================================

export class PipelineProgressTracker {
  private progress: ProcessingProgress;
  private repo: InMemoryProgressRepository;
  private updateInterval?: NodeJS.Timeout;
  private lineCount = 0;

  constructor(pipelineId: string) {
    const phases = PipelinePhaseFactory.createStandardPipeline();
    this.progress = new ProcessingProgress(pipelineId, phases);
    this.repo = new InMemoryProgressRepository();
  }

  async start(metricsTotal: number, episodesTotal: number, learningTotal: number) {
    this.progress.start();
    
    // Set totals
    this.progress.updatePhase('metrics', 0, metricsTotal);
    this.progress.updatePhase('episodes', 0, episodesTotal);
    this.progress.updatePhase('learning', 0, learningTotal);
    
    await this.repo.save(this.progress);
    
    // Start live rendering
    this.startLiveRender();
  }

  updateMetrics(completed: number) {
    const phase = this.progress.getPhases().find(p => p.name === 'metrics');
    if (phase) {
      this.progress.updatePhase('metrics', completed, phase.total);
    }
  }

  updateEpisodes(completed: number) {
    const phase = this.progress.getPhases().find(p => p.name === 'episodes');
    if (phase) {
      this.progress.updatePhase('episodes', completed, phase.total);
    }
  }

  updateLearning(completed: number) {
    const phase = this.progress.getPhases().find(p => p.name === 'learning');
    if (phase) {
      this.progress.updatePhase('learning', completed, phase.total);
    }
  }

  private startLiveRender() {
    this.updateInterval = setInterval(() => {
      this.lineCount = ProgressFormatter.renderLive(this.progress, this.lineCount);
    }, 1000); // Update every second
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    console.log('\n' + ProgressFormatter.renderTree(this.progress));
  }

  getMetrics() {
    return this.progress.calculateMetrics();
  }
}

// ============================================================================
// Utility
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Run examples
// ============================================================================

if (require.main === module) {
  (async () => {
    console.log('Example 1: Basic Pipeline\n');
    await exampleBasicPipeline();
    
    console.log('\n\nExample 2: Live Tree View\n');
    ProgressFormatter.clearScreen();
    await exampleLiveTreeView();
    
    console.log('\n\nExample 3: With Repository\n');
    await exampleWithRepository();
  })();
}
