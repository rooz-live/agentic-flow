#!/usr/bin/env npx tsx
/**
 * Seed completion tracker with sample data for testing
 */

import { CompletionTracker } from '../src/core/completion-tracker.js';

async function seedData() {
  console.log('🌱 Seeding completion data...\n');
  
  const tracker = new CompletionTracker();
  
  try {
    // Assessor - Low completion, needs improvement (should have high WSJF)
    await tracker.storeEpisode({
      episode_id: 'assessor_wsjf_1',
      circle: 'assessor',
      ceremony: 'wsjf',
      outcome: 'partial',
      completion_pct: 40,
      confidence: 0.6,
      timestamp: Date.now() - 3600000
    });
    await tracker.storeEpisode({
      episode_id: 'assessor_wsjf_2',
      circle: 'assessor',
      ceremony: 'wsjf',
      outcome: 'failure',
      completion_pct: 30,
      confidence: 0.5,
      timestamp: Date.now() - 7200000
    });
    
    // Orchestrator - Medium completion (should have medium WSJF)
    await tracker.storeEpisode({
      episode_id: 'orchestrator_standup_1',
      circle: 'orchestrator',
      ceremony: 'standup',
      outcome: 'success',
      completion_pct: 60,
      confidence: 0.7,
      timestamp: Date.now() - 1800000
    });
    await tracker.storeEpisode({
      episode_id: 'orchestrator_standup_2',
      circle: 'orchestrator',
      ceremony: 'standup',
      outcome: 'partial',
      completion_pct: 55,
      confidence: 0.6,
      timestamp: Date.now() - 5400000
    });
    await tracker.storeEpisode({
      episode_id: 'orchestrator_standup_3',
      circle: 'orchestrator',
      ceremony: 'standup',
      outcome: 'success',
      completion_pct: 65,
      confidence: 0.8,
      timestamp: Date.now() - 9000000
    });
    
    // Analyst - High completion (should have low WSJF)
    await tracker.storeEpisode({
      episode_id: 'analyst_refine_1',
      circle: 'analyst',
      ceremony: 'refine',
      outcome: 'success',
      completion_pct: 95,
      confidence: 0.9,
      timestamp: Date.now() - 2700000
    });
    await tracker.storeEpisode({
      episode_id: 'analyst_refine_2',
      circle: 'analyst',
      ceremony: 'refine',
      outcome: 'success',
      completion_pct: 100,
      confidence: 1.0,
      timestamp: Date.now() - 6300000
    });
    
    // Innovator - Perfect completion (no action needed)
    await tracker.storeEpisode({
      episode_id: 'innovator_retro_1',
      circle: 'innovator',
      ceremony: 'retro',
      outcome: 'success',
      completion_pct: 100,
      confidence: 1.0,
      timestamp: Date.now() - 3600000
    });
    
    console.log('✅ Seeded 8 episodes');
    console.log('\n📊 Expected WSJF ranking (highest to lowest):');
    console.log('   1. assessor (40% avg, 50% success) - Highest WSJF');
    console.log('   2. orchestrator (60% avg, 66% success) - Medium WSJF');
    console.log('   3. analyst (97.5% avg) - Would appear if threshold lowered');
    console.log('   4. innovator (100%) - No action needed');
    
    tracker.close();
  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    tracker.close();
    process.exit(1);
  }
}

seedData();
