#!/usr/bin/env npx tsx
/**
 * Record causal observation from ay-prod-cycle execution
 * Called automatically after completion tracking (Step 7.6)
 */

import { CausalLearningIntegration } from '../src/core/causal-learning-integration.js';

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 7) {
  console.error('Usage: ay-prod-record-causal.ts <episode_id> <circle> <ceremony> <completion_pct> <skill_count> <mcp_status> <dod_passed>');
  process.exit(1);
}

const [episodeId, circle, ceremony, completionPct, skillCount, mcpStatus, dodPassed] = args;

async function recordCausal() {
  const causal = new CausalLearningIntegration();
  
  try {
    await causal.recordObservation({
      episodeId,
      circle,
      ceremony,
      completionPct: parseInt(completionPct),
      context: {
        skillCount: parseInt(skillCount),
        mcpStatus,
        dodPassed: dodPassed === 'true'
      }
    });
    
  } catch (error) {
    console.error('❌ Error recording causal observation:', error);
    process.exit(1);
  } finally {
    causal.close();
  }
}

recordCausal();
