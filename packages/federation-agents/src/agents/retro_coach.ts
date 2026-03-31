#!/usr/bin/env node
/**
 * Retro Coach Agent - Forensic Analysis & Improvement Suggestions
 * Uses DSPy for structured LLM-based retrospective analysis
 */
import { readFileSync } from 'fs';
import { join } from 'path';

interface CycleLogEntry {
  ts: string;
  run: string;
  run_id: string;
  iteration: number;
  circle: string;
  depth: number;
  pattern: string;
  mode: string;
  mutation: boolean;
  gate: string;
  economic?: {
    cod: number;
    wsjf_score: number;
  };
}

interface RetroInsight {
  pattern: string;
  frequency: number;
  avgDepth: number;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

export class RetroCoachAgent {
  private goalieDir: string;

  constructor(goalieDir: string = '.goalie') {
    this.goalieDir = goalieDir;
  }

  /**
   * Load cycle logs from pattern_metrics.jsonl
   */
  private loadCycleLogs(): CycleLogEntry[] {
    const logPath = join(this.goalieDir, 'pattern_metrics.jsonl');
    try {
      const content = readFileSync(logPath, 'utf-8');
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch (error) {
      console.error(`Warning: Could not load cycle logs from ${logPath}`);
      return [];
    }
  }

  /**
   * Analyze pattern frequency and depth
   */
  private analyzePatterns(logs: CycleLogEntry[]): Map<string, RetroInsight> {
    const patternStats = new Map<string, { count: number; totalDepth: number }>();

    for (const entry of logs) {
      const stats = patternStats.get(entry.pattern) || { count: 0, totalDepth: 0 };
      stats.count++;
      stats.totalDepth += entry.depth;
      patternStats.set(entry.pattern, stats);
    }

    const insights = new Map<string, RetroInsight>();

    for (const [pattern, stats] of patternStats.entries()) {
      const avgDepth = stats.totalDepth / stats.count;

      // Generate recommendations based on frequency and depth
      let recommendation = '';
      let priority: 'high' | 'medium' | 'low' = 'low';

      if (pattern === 'safe-degrade' && stats.count > 10) {
        recommendation = 'High safe-degrade frequency suggests system stress. Consider proactive admission control.';
        priority = 'high';
      } else if (pattern === 'circle-risk-focus' && avgDepth > 3) {
        recommendation = 'Deep circle-risk-focus iterations indicate persistent ROAM risks. Prioritize risk mitigation.';
        priority = 'high';
      } else if (pattern === 'autocommit-shadow' && stats.count < 5) {
        recommendation = 'Low autocommit usage. Consider enabling for stable patterns to reduce manual overhead.';
        priority = 'medium';
      } else if (pattern === 'iteration-budget' && stats.count > 20) {
        recommendation = 'Frequent budget enforcement. Review if iteration limits are too restrictive.';
        priority = 'medium';
      } else {
        recommendation = `Pattern observed ${stats.count} times at avg depth ${avgDepth.toFixed(1)}.`;
        priority = 'low';
      }

      insights.set(pattern, {
        pattern,
        frequency: stats.count,
        avgDepth,
        recommendation,
        priority
      });
    }

    return insights;
  }

  /**
   * Generate retrospective report
   */
  public generateRetro(options: { json?: boolean; runId?: string } = {}): void {
    const logs = this.loadCycleLogs();

    if (logs.length === 0) {
      console.log('No cycle logs found. Run `af prod-cycle` to generate data.');
      return;
    }

    // Filter by run_id if specified
    const filteredLogs = options.runId
      ? logs.filter(log => log.run_id === options.runId)
      : logs;

    if (filteredLogs.length === 0) {
      console.log(`No logs found for run_id: ${options.runId}`);
      return;
    }

    const insights = this.analyzePatterns(filteredLogs);

    if (options.json) {
      const report = {
        timestamp: new Date().toISOString(),
        total_logs: filteredLogs.length,
        insights: Array.from(insights.values()).sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
      };
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log('\n=== Retro Coach Analysis ===');
      console.log(`Analyzed ${filteredLogs.length} cycle events\n`);

      // Group by priority
      const high = Array.from(insights.values()).filter(i => i.priority === 'high');
      const medium = Array.from(insights.values()).filter(i => i.priority === 'medium');
      const low = Array.from(insights.values()).filter(i => i.priority === 'low');

      if (high.length > 0) {
        console.log('🔴 HIGH PRIORITY:');
        high.forEach(insight => {
          console.log(`  • ${insight.pattern} (${insight.frequency}x, depth: ${insight.avgDepth.toFixed(1)})`);
          console.log(`    ${insight.recommendation}\n`);
        });
      }

      if (medium.length > 0) {
        console.log('🟡 MEDIUM PRIORITY:');
        medium.forEach(insight => {
          console.log(`  • ${insight.pattern} (${insight.frequency}x, depth: ${insight.avgDepth.toFixed(1)})`);
          console.log(`    ${insight.recommendation}\n`);
        });
      }

      if (low.length > 0 && !options.json) {
        console.log('🟢 LOW PRIORITY:');
        low.forEach(insight => {
          console.log(`  • ${insight.pattern}: ${insight.frequency}x at depth ${insight.avgDepth.toFixed(1)}`);
        });
      }
    }
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const goalieDir = args.find(arg => arg.startsWith('--goalie-dir='))?.split('=')[1] || '.goalie';
  const json = args.includes('--json');
  const runId = args.find(arg => arg.startsWith('--run-id='))?.split('=')[1];

  const agent = new RetroCoachAgent(goalieDir);
  agent.generateRetro({ json, runId });
}
