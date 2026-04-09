#!/usr/bin/env bash
# Yo.life Digital Cockpit - Unified ay-prod × yo.life Dashboard
# 
# Integrates:
# - Circle ceremonies (orchestrator, assessor, analyst, innovator, seeker, intuitive)
# - Yo.life dimensions (temporal, spatial, goal, event, barrier, mindset, cockpit, psychological)
# - Real-time progress + historical completion

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ============================================================================
# Circle → Yo.life Dimension Mapping
# ============================================================================

get_yolife_dimension() {
    local ceremony="$1"
    case "$ceremony" in
        standup)    echo "temporal" ;;
        wsjf)       echo "goal" ;;
        review)     echo "event" ;;
        retro)      echo "barrier" ;;
        refine)     echo "mindset" ;;
        replenish)  echo "cockpit" ;;
        synthesis)  echo "psychological" ;;
        *)          echo "unknown" ;;
    esac
}

# ============================================================================
# Digital Cockpit Dashboard
# ============================================================================

npx tsx <<'EOF'
import { CompletionTracker } from './src/core/completion-tracker.js';
import type { Circle } from './src/core/completion-tracker.js';
import * as fs from 'fs';

const CIRCLE_CEREMONY_MAP = {
  orchestrator: { ceremonies: ['standup'], dimension: 'temporal', skills: ['chaotic_workflow', 'minimal_cycle'] },
  assessor: { ceremonies: ['wsjf', 'review'], dimension: 'goal', skills: ['planning_heavy', 'assessment_focused'] },
  innovator: { ceremonies: ['retro'], dimension: 'barrier', skills: ['retro_driven', 'high_failure_cycle'] },
  analyst: { ceremonies: ['refine'], dimension: 'mindset', skills: ['planning_heavy', 'full_cycle'] },
  seeker: { ceremonies: ['replenish'], dimension: 'cockpit', skills: ['full_sprint_cycle'] },
  intuitive: { ceremonies: ['synthesis'], dimension: 'psychological', skills: ['full_cycle'] }
};

async function renderCockpit() {
  const tracker = new CompletionTracker();
  
  console.clear();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 Yo.life Digital Cockpit');
  console.log('   Unified ay-prod × yo.life Dashboard');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // Get system overview
    const system = await tracker.getSystemOverview();
    console.log(`\n📊 System Overview:`);
    console.log(`   Total Episodes: ${system.totalEpisodes}`);
    console.log(`   Overall Completion: ${system.overallCompletionPct.toFixed(1)}%`);
    
    // Get all circle metrics
    const circles = await tracker.getAllCircleMetrics();
    
    // Map Yo.life dimensions to completion
    console.log(`\n🌐 Yo.life Dimensional Health:`);
    const dimensionMap = new Map<string, { circle: string; completion: number; episodes: number }>();
    
    for (const [circleName, config] of Object.entries(CIRCLE_CEREMONY_MAP)) {
      const circleMetrics = circles.find(c => c.circle === circleName);
      if (circleMetrics) {
        dimensionMap.set(config.dimension, {
          circle: circleName,
          completion: circleMetrics.avgCompletionPct,
          episodes: circleMetrics.episodeCount
        });
      }
    }
    
    // Render dimensions
    const dimensions = ['temporal', 'goal', 'barrier', 'mindset', 'cockpit', 'psychological', 'event'];
    for (const dim of dimensions) {
      const data = dimensionMap.get(dim);
      if (data) {
        const status = data.completion >= 80 ? '✅' : data.completion >= 50 ? '⚠️ ' : '❌';
        const bar = '█'.repeat(Math.floor(data.completion / 10));
        console.log(`   ${status} ${dim.padEnd(15)}: [${bar.padEnd(10)}] ${data.completion.toFixed(1)}% (${data.circle}, ${data.episodes} eps)`);
      } else {
        console.log(`   ⚪ ${dim.padEnd(15)}: [          ] 0.0% (no data)`);
      }
    }
    
    // Circle status
    console.log(`\n🔄 Circle Status:`);
    for (const circle of circles) {
      const bar = '█'.repeat(Math.floor(circle.avgCompletionPct / 10));
      const trend = circle.successRate >= 80 ? '📈' : circle.successRate >= 50 ? '➡️ ' : '📉';
      console.log(`   ${trend} ${circle.circle.padEnd(12)}: [${bar.padEnd(10)}] ${circle.avgCompletionPct.toFixed(1)}% (${circle.episodeCount} eps, ${circle.successRate.toFixed(0)}% success)`);
    }
    
    // Phase breakdown
    const phases = await tracker.getAllPhaseMetrics();
    if (phases.length > 0) {
      console.log(`\n📈 Phase Rollup (A→B→C→D):`);
      for (const phase of phases) {
        const criticalPath = phase.criticalPathPct;
        const avgCompletion = phase.overallCompletionPct;
        const status = avgCompletion >= 80 ? '✅' : avgCompletion >= 50 ? '⚠️ ' : '❌';
        console.log(`   ${status} Phase ${phase.phase}: Overall ${avgCompletion.toFixed(1)}% | Critical Path ${criticalPath.toFixed(1)}% | ${phase.activeCircles} circles`);
      }
    }
    
    // Improvement recommendations
    console.log(`\n💡 Recommended Actions:`);
    let actionCount = 0;
    
    for (const circle of circles) {
      if (circle.avgCompletionPct < 70) {
        console.log(`   • Circle "${circle.circle}" at ${circle.avgCompletionPct.toFixed(1)}% - Run: ./scripts/ay-prod-cycle.sh ${circle.circle} ${CIRCLE_CEREMONY_MAP[circle.circle as Circle]?.ceremonies[0] || 'ceremony'} advisory`);
        actionCount++;
      }
      
      if (circle.episodeCount < 5) {
        console.log(`   • Circle "${circle.circle}" has only ${circle.episodeCount} episodes - run more ceremonies to build history`);
        actionCount++;
      }
    }
    
    // Yo.life dimension recommendations
    for (const [dim, data] of dimensionMap) {
      if (data && data.completion < 60) {
        console.log(`   • Yo.life dimension "${dim}" underperforming (${data.completion.toFixed(1)}%) - Focus on: ./scripts/ay-yo.sh ${dim}`);
        actionCount++;
      }
    }
    
    if (actionCount === 0) {
      console.log(`   🎉 All systems performing well! Continue current pace.`);
    } else if (actionCount >= 2) {
      console.log(`\n🎮 Tip: With ${actionCount} actions available, try interactive mode for WSJF-prioritized execution:`);
      console.log(`   ./scripts/ay-yo.sh i`);
    }
    
    // Check for recent episodes
    const recentEpisodes = await getRecentEpisodes();
    if (recentEpisodes.length > 0) {
      console.log(`\n🕒 Recent Activity (last 24h):`);
      recentEpisodes.slice(0, 5).forEach((ep: any) => {
        const ageHours = ((Date.now() - ep.timestamp) / (1000 * 60 * 60)).toFixed(1);
        const outcomeIcon = ep.outcome === 'success' ? '✅' : ep.outcome === 'partial' ? '⚠️ ' : '❌';
        console.log(`   ${outcomeIcon} ${ep.circle}/${ep.ceremony} - ${ageHours}h ago (${ep.completion_pct}%)`);
      });
    }
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📅 Last updated: ${new Date().toISOString()}`);
    console.log(`🔄 Refresh: watch -n 5 './scripts/ay-yo-digital-cockpit.sh'`);
    
  } catch (error) {
    console.error('❌ Error rendering cockpit:', error);
  } finally {
    tracker.close();
  }
}

async function getRecentEpisodes(): Promise<any[]> {
  try {
    const tracker = new CompletionTracker();
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    // Query recent episodes from completion_episodes table
    const query = `SELECT * FROM completion_episodes WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 10`;
    const rows = await (tracker as any).agentdb.query(query, [cutoff]);
    tracker.close();
    
    return rows;
  } catch (error) {
    console.error('Error fetching recent episodes:', error);
    return [];
  }
}

renderCockpit().catch(console.error);
EOF
