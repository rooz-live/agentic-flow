#!/usr/bin/env tsx
/**
 * af retro-analysis
 * 
 * Analyzes retro coach output and generates actionable insights.
 * Tags insights with circle and priority for integration with Goalie board.
 */

import * as fs from 'fs';
import * as path from 'path';

interface Args {
  goalieDir: string;
  json: boolean;
  since?: string;
  circle?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    goalieDir: path.resolve(process.cwd(), '.goalie'),
    json: false,
  };
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--goalie-dir':
        args.goalieDir = path.resolve(argv[++i]);
        break;
      case '--json':
        args.json = true;
        break;
      case '--since':
        args.since = argv[++i];
        break;
      case '--circle':
        args.circle = argv[++i];
        break;
    }
  }
  
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  
  try {
    const retroPath = path.join(args.goalieDir, 'retro_coach.json');
    
    if (!fs.existsSync(retroPath)) {
      console.error('[retro-analysis] No retro_coach.json found. Run retro coach first.');
      process.exit(1);
    }
    
    const retroData = JSON.parse(fs.readFileSync(retroPath, 'utf8'));
    
    // Extract insights
    const insights = [];
    const timestamp = new Date().toISOString();
    
    // Analyze forensic actions
    if (retroData.forensic_action_analysis) {
      for (const [circle, data] of Object.entries(retroData.forensic_action_analysis)) {
        if (args.circle && circle !== args.circle) continue;
        
        const analysis: any = data;
        insights.push({
          id: `insight-${Date.now()}-${circle}`,
          type: 'forensic_action',
          circle,
          priority: analysis.completed_count / (analysis.total_count || 1) < 0.7 ? 'high' : 'medium',
          title: `${circle} action completion`,
          description: `${analysis.completed_count}/${analysis.total_count} actions completed`,
          recommendation: analysis.completed_count < analysis.total_count 
            ? `Focus on completing remaining ${analysis.total_count - analysis.completed_count} actions`
            : 'Continue maintaining high completion rate',
          metrics: {
            completion_rate: analysis.completed_count / (analysis.total_count || 1),
            completed: analysis.completed_count,
            total: analysis.total_count,
          },
          tags: ['retro', circle, 'forensic'],
          timestamp,
        });
      }
    }
    
    // Analyze pattern gaps
    if (retroData.pattern_gaps) {
      for (const gap of retroData.pattern_gaps.slice(0, 5)) {
        insights.push({
          id: `insight-${Date.now()}-pattern-${gap.pattern}`,
          type: 'pattern_gap',
          circle: 'governance',
          priority: gap.severity === 'high' ? 'high' : 'medium',
          title: `Missing pattern: ${gap.pattern}`,
          description: gap.reason,
          recommendation: gap.suggestion,
          metrics: {
            severity: gap.severity,
            pattern: gap.pattern,
          },
          tags: ['retro', 'pattern', gap.pattern],
          timestamp,
        });
      }
    }
    
    // Analyze bottlenecks
    if (retroData.bottleneck_analysis) {
      for (const [area, data] of Object.entries(retroData.bottleneck_analysis)) {
        const bottleneck: any = data;
        if (bottleneck.is_bottleneck) {
          insights.push({
            id: `insight-${Date.now()}-bottleneck-${area}`,
            type: 'bottleneck',
            circle: area,
            priority: 'high',
            title: `Bottleneck detected in ${area}`,
            description: `Average cycle time: ${bottleneck.avg_cycle_time_sec}s (threshold: ${bottleneck.threshold_sec}s)`,
            recommendation: `Investigate and optimize ${area} workflows to reduce cycle time`,
            metrics: {
              avg_cycle_time: bottleneck.avg_cycle_time_sec,
              threshold: bottleneck.threshold_sec,
              cycle_count: bottleneck.cycle_count,
            },
            tags: ['retro', 'bottleneck', area],
            timestamp,
          });
        }
      }
    }
    
    // Emit pattern event
    emitPatternEvent(args.goalieDir, insights.length);
    
    // Save insights
    const insightsPath = path.join(args.goalieDir, 'retro_insights.json');
    fs.writeFileSync(insightsPath, JSON.stringify({ insights, generated_at: timestamp }, null, 2));
    
    // Output
    if (args.json) {
      console.log(JSON.stringify({ insights }, null, 2));
    } else {
      console.log(`\\n=== Retro Analysis Results ===`);
      console.log(`Generated ${insights.length} actionable insights\\n`);
      
      for (const insight of insights) {
        console.log(`[${insight.priority.toUpperCase()}] ${insight.circle} - ${insight.title}`);
        console.log(`  ${insight.description}`);
        console.log(`  → ${insight.recommendation}`);
        console.log();
      }
      
      console.log(`Insights saved to: ${insightsPath}`);
    }
    
  } catch (error) {
    console.error(`[retro-analysis] Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

function emitPatternEvent(goalieDir: string, insightCount: number): void {
  const event = {
    ts: new Date().toISOString(),
    run: 'retro-analysis',
    run_id: process.env.AF_RUN_ID || `retro-${Date.now()}`,
    iteration: 0,
    circle: 'governance',
    depth: 0,
    pattern: 'retro-analysis',
    mode: 'advisory',
    mutation: false,
    gate: 'retro-analysis',
    framework: '',
    scheduler: '',
    tags: ['Federation', 'Retro'],
    economic: { cod: 0, wsjf_score: 0 },
    insight_count: insightCount,
  };
  
  const metricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
  try {
    fs.appendFileSync(metricsPath, JSON.stringify(event) + '\\n');
  } catch (err) {
    console.warn('[retro-analysis] Failed to emit pattern event:', err);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
