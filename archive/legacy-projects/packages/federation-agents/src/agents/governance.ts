#!/usr/bin/env node
/**
 * Governance Agent - Pattern Telemetry Enforcement
 * Validates pattern compliance and suggests governance actions
 */
import { readFileSync } from 'fs';
import { join } from 'path';

interface PatternEvent {
  ts: string;
  pattern: string;
  mode: string;
  mutation: boolean;
  gate: string;
  circle: string;
  economic?: {
    cod: number;
    wsjf_score: number;
  };
}

interface GovernanceRule {
  pattern: string;
  maxFrequency?: number; // Max occurrences per hour
  requiredMode?: string; // advisory, enforcement, mutation
  requiredGate?: string; // health, governance, wsjf, focus
}

export class GovernanceAgent {
  private goalieDir: string;
  private rules: GovernanceRule[] = [
    { pattern: 'safe-degrade', maxFrequency: 20 }, // Max 20 degrades per hour indicates stress
    { pattern: 'guardrail-lock', requiredMode: 'enforcement' }, // Must be in enforcement mode
    { pattern: 'autocommit-shadow', requiredGate: 'governance' } // Must pass governance gate
  ];

  constructor(goalieDir: string = '.goalie') {
    this.goalieDir = goalieDir;
  }

  /**
   * Load pattern events from pattern_metrics.jsonl
   */
  private loadPatternEvents(): PatternEvent[] {
    const logPath = join(this.goalieDir, 'pattern_metrics.jsonl');
    try {
      const content = readFileSync(logPath, 'utf-8');
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch (error) {
      console.error(`Warning: Could not load pattern events from ${logPath}`);
      return [];
    }
  }

  /**
   * Check pattern compliance against governance rules
   */
  public checkCompliance(options: { json?: boolean } = {}): void {
    const events = this.loadPatternEvents();

    if (events.length === 0) {
      console.log('No pattern events found.');
      return;
    }

    // Get events from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = events.filter(e => new Date(e.ts) > oneHourAgo);

    const violations: Array<{ rule: GovernanceRule; count: number; message: string }> = [];

    for (const rule of this.rules) {
      const matchingEvents = recentEvents.filter(e => e.pattern === rule.pattern);

      // Check frequency
      if (rule.maxFrequency && matchingEvents.length > rule.maxFrequency) {
        violations.push({
          rule,
          count: matchingEvents.length,
          message: `Pattern '${rule.pattern}' triggered ${matchingEvents.length} times (max: ${rule.maxFrequency})`
        });
      }

      // Check mode
      if (rule.requiredMode) {
        const wrongMode = matchingEvents.filter(e => e.mode !== rule.requiredMode);
        if (wrongMode.length > 0) {
          violations.push({
            rule,
            count: wrongMode.length,
            message: `Pattern '${rule.pattern}' has ${wrongMode.length} events not in '${rule.requiredMode}' mode`
          });
        }
      }

      // Check gate
      if (rule.requiredGate) {
        const wrongGate = matchingEvents.filter(e => e.gate !== rule.requiredGate);
        if (wrongGate.length > 0) {
          violations.push({
            rule,
            count: wrongGate.length,
            message: `Pattern '${rule.pattern}' has ${wrongGate.length} events not passing '${rule.requiredGate}' gate`
          });
        }
      }
    }

    if (options.json) {
      const report = {
        timestamp: new Date().toISOString(),
        total_events: recentEvents.length,
        violations,
        compliant: violations.length === 0
      };
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log('\n=== Governance Agent Report ===');
      console.log(`Analyzed ${recentEvents.length} recent pattern events\n`);

      if (violations.length === 0) {
        console.log('✅ All patterns are compliant with governance rules.');
      } else {
        console.log(`⚠️  Found ${violations.length} governance violation(s):\n`);
        violations.forEach((v, i) => {
          console.log(`${i + 1}. ${v.message}`);
        });
        console.log('\nRecommended Actions:');
        console.log('  • Review pattern telemetry in .goalie/pattern_metrics.jsonl');
        console.log('  • Adjust pattern enforcement in scripts/af');
        console.log('  • Consider running: af retro-coach --json');
      }
    }
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const goalieDir = args.find(arg => arg.startsWith('--goalie-dir='))?.split('=')[1] || '.goalie';
  const json = args.includes('--json');

  const agent = new GovernanceAgent(goalieDir);
  agent.checkCompliance({ json });
}
