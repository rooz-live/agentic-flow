import fs from 'fs';
import path from 'path';
import type { PatternMetric } from './types';

const WORKSPACE_ROOT = path.resolve(process.cwd(), '../../../..');
const METRICS_FILE = path.join(WORKSPACE_ROOT, '.goalie', 'pattern_metrics.jsonl');

function loadEvents(): PatternMetric[] {
  if (!fs.existsSync(METRICS_FILE)) {
    console.log('No pattern_metrics.jsonl found');
    return [];
  }
  const content = fs.readFileSync(METRICS_FILE, 'utf8');
  const lines = content.trim().split('\\n').filter(Boolean);
  return lines.map(line => {
    try {
      return JSON.parse(line) as PatternMetric;
    } catch {
      return null;
    }
  }).filter((e): e is PatternMetric => e !== null) as PatternMetric[];
}

function analyzeTierDepth(events: PatternMetric[]) {
  const tiers = new Set(events.map(e => e.tier || 'base'));
  const depths = events.map(e => e.depth || 1);
  const avgDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;
  const tierCov = Math.min((tiers.size / 10) * 100, 100); // Assume max 10 tiers
  const depthCov = Math.min((avgDepth / 5) * 100, 100); // Max depth 5
  const overallCov = (tierCov + depthCov) / 2;
  console.log(`Tier Coverage: ${tierCov.toFixed(1)}% (${tiers.size} tiers)`);
  console.log(`Average Depth: ${avgDepth.toFixed(1)} (coverage ${depthCov.toFixed(1)}%)`);
  console.log(`Overall Tier/Depth Coverage: ${overallCov.toFixed(1)}%`);
  return { 
    tier_coverage_pct: tierCov, 
    depth_coverage_pct: depthCov, 
    overall_coverage_pct: overallCov,
    tiers_detected: Array.from(tiers),
    avg_depth: avgDepth 
  };
}

if (require.main === module) {
  const events = loadEvents();
  if (events.length === 0) {
    console.log('No events to analyze. Run pattern-metrics-logger first.');
  } else {
    analyzeTierDepth(events);
  }
}