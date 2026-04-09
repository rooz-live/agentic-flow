#!/usr/bin/env npx tsx
/**
 * Test script to verify causal insights display
 */

import { CompletionTracker } from '../src/core/completion-tracker.js';
import { CausalLearningIntegration } from '../src/core/causal-learning-integration.js';

async function test() {
  console.log('🔬 Testing Causal Learning Integration\n');
  
  const tracker = new CompletionTracker();
  const causal = new CausalLearningIntegration();
  
  // Get all circles
  const circles = await tracker.getAllCircleMetrics();
  console.log(`📊 Found ${circles.length} circles with data:\n`);
  
  // Check causal insights for each circle
  for (const circle of circles) {
    const ceremonies = ['standup', 'wsjf', 'review', 'retro', 'refine', 'replenish', 'synthesis'];
    
    console.log(`🔄 Circle: ${circle.circle}`);
    console.log(`   Completion: ${circle.avgCompletionPct.toFixed(1)}%`);
    console.log(`   Episodes: ${circle.episodeCount}`);
    
    // Check each ceremony for causal insights
    for (const ceremony of ceremonies) {
      const insights = await causal.getCausalInsights(circle.circle, ceremony);
      
      if (insights.hasInsights) {
        console.log(`   ✨ ${ceremony}: ${insights.mechanism} (N=${insights.sampleSize})`);
        console.log(`      Uplift: ${insights.uplift?.toFixed(1)}%`);
      }
    }
    console.log('');
  }
  
  // Show WSJF calculation example
  console.log('\n📈 WSJF Boost Calculation Example:');
  const assessor = circles.find(c => c.circle === 'assessor');
  if (assessor) {
    const insights = await causal.getCausalInsights('assessor', 'wsjf');
    if (insights.hasInsights && insights.uplift) {
      const baseWSJF = 50; // Example base WSJF
      const boost = Math.abs(insights.uplift) / 100;
      const boostedWSJF = baseWSJF * (1 + boost);
      
      console.log(`   Base WSJF: ${baseWSJF.toFixed(1)}`);
      console.log(`   Boost: +${(boost * 100).toFixed(0)}% (from ${insights.uplift.toFixed(1)}% uplift)`);
      console.log(`   Boosted WSJF: ${boostedWSJF.toFixed(1)} ⚡`);
      console.log(`   Display: "WSJF: ${boostedWSJF.toFixed(1)} ⚡+${(boost * 100).toFixed(0)}%"`);
    }
  }
  
  tracker.close();
  causal.close();
}

test().catch(console.error);
