#!/usr/bin/env npx tsx
/**
 * Store completion data from ay-prod-cycle execution
 * Called automatically after each ceremony execution
 */

import { CompletionTracker, type Episode, type Circle, type Outcome } from '../src/core/completion-tracker.js';

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 4) {
  console.error('Usage: ay-prod-store-completion.ts <episode_id> <circle> <ceremony> <outcome> [completion_pct] [confidence]');
  process.exit(1);
}

const [episodeId, circle, ceremony, outcome, completionPct, confidence] = args;

// Validate inputs
const validCircles: Circle[] = ['orchestrator', 'assessor', 'innovator', 'analyst', 'seeker', 'intuitive'];
const validOutcomes: Outcome[] = ['success', 'failure', 'partial'];

if (!validCircles.includes(circle as Circle)) {
  console.error(`Invalid circle: ${circle}. Valid: ${validCircles.join(', ')}`);
  process.exit(1);
}

if (!validOutcomes.includes(outcome as Outcome)) {
  console.error(`Invalid outcome: ${outcome}. Valid: ${validOutcomes.join(', ')}`);
  process.exit(1);
}

async function storeCompletion() {
  const tracker = new CompletionTracker();
  
  try {
    const episode: Episode = {
      episode_id: episodeId,
      circle: circle as Circle,
      ceremony,
      outcome: outcome as Outcome,
      completion_pct: completionPct ? parseInt(completionPct) : undefined,
      confidence: confidence ? parseFloat(confidence) : 0.8,
      timestamp: Date.now()
    };
    
    await tracker.storeEpisode(episode);
    console.log(`✅ Stored completion: ${circle}/${ceremony} (${outcome})`);
    
  } catch (error) {
    console.error('❌ Error storing completion:', error);
    process.exit(1);
  } finally {
    tracker.close();
  }
}

storeCompletion();
