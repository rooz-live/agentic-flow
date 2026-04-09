#!/usr/bin/env npx tsx
/**
 * Combined setup: Initialize schema AND seed data in same process
 * This ensures schema changes persist for the seed operation
 */

import { CompletionTracker } from '../src/core/completion-tracker.js';

async function setup() {
  console.log('🔧 Setting up CompletionTracker...\n');
  
  const tracker = new CompletionTracker();
  
  try {
    // Step 1: Initialize schema
    console.log('📋 Step 1: Initializing schema...');
    await tracker.initSchema();
    console.log('✅ Schema initialized\n');
    
    // Step 2: Seed sample data (in same process)
    console.log('🌱 Step 2: Seeding sample data...');
    
    // Assessor - Low completion (high WSJF)
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
    
    // Orchestrator - Medium completion
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
    
    // Analyst - High completion
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
    
    // Innovator - Perfect
    await tracker.storeEpisode({
      episode_id: 'innovator_retro_1',
      circle: 'innovator',
      ceremony: 'retro',
      outcome: 'success',
      completion_pct: 100,
      confidence: 1.0,
      timestamp: Date.now() - 3600000
    });
    
    console.log('✅ Seeded 8 episodes\n');
    
    // Step 3: Verify
    console.log('🔍 Step 3: Verifying data...');
    const circles = await tracker.getAllCircleMetrics();
    console.log(`Found ${circles.length} circles with data:`);
    circles.forEach(c => {
      console.log(`  - ${c.circle}: ${c.avgCompletionPct.toFixed(1)}% (${c.episodeCount} episodes)`);
    });
    
    console.log('\n✅ Setup complete!');
    console.log('\n📖 Next steps:');
    console.log('   1. Launch dashboard: ./scripts/ay-yo.sh dashboard');
    console.log('   2. Or interactive: ./scripts/ay-yo.sh i');
    
  } catch (error) {
    console.error('\n❌ Error during setup:', error);
    process.exit(1);
  } finally {
    tracker.close();
  }
}

setup();
