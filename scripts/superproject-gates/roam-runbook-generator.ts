/**
 * P2-TIME: Auto-Generate Runbooks from ROAM
 *
 * Generates operational runbooks from ROAM_TRACKER.yaml entries.
 * Creates step-by-step procedures for each risk category.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ROAMEntry {
  id: string;
  title: string;
  description: string;
  roam_status: 'RESOLVED' | 'OWNED' | 'ACCEPTED' | 'MITIGATING';
  risk_score: number;
  mitigation_plan: string;
  last_updated: string;
}

export interface RunbookTemplate {
  id: string;
  title: string;
  status: string;
  riskScore: number;
  createdAt: string;
  lastUpdated: string;
  overview: string;
  prerequisites: string[];
  steps: RunbookStep[];
  escalationPath: EscalationStep[];
  rollbackProcedure: RollbackStep[];
  verification: string[];
}

export interface RunbookStep { step: number; action: string; expectedOutcome: string; timeout: string; }
export interface EscalationStep { level: number; contact: string; criteria: string; }
export interface RollbackStep { step: number; action: string; validation: string; }

// Template generators by ROAM status
const STATUS_TEMPLATES = {
  OWNED: (entry: ROAMEntry): Partial<RunbookTemplate> => ({
    overview: `Active handling procedure for: ${entry.title}`,
    prerequisites: ['Confirm ownership assignment', 'Review current mitigation status', 'Check dependencies'],
    steps: [
      { step: 1, action: 'Assess current risk state and impact', expectedOutcome: 'Risk assessment documented', timeout: '30m' },
      { step: 2, action: `Execute: ${entry.mitigation_plan}`, expectedOutcome: 'Mitigation in progress', timeout: '4h' },
      { step: 3, action: 'Monitor for effectiveness', expectedOutcome: 'Metrics stabilized', timeout: '2h' },
      { step: 4, action: 'Update ROAM status and stakeholders', expectedOutcome: 'Status communicated', timeout: '15m' }
    ],
    escalationPath: [
      { level: 1, contact: 'Team Lead', criteria: 'Unable to progress after 2 hours' },
      { level: 2, contact: 'Engineering Manager', criteria: 'Risk score increasing or SLA breach imminent' },
      { level: 3, contact: 'VP Engineering', criteria: 'Customer-facing impact or critical system affected' }
    ],
    rollbackProcedure: [
      { step: 1, action: 'Halt current mitigation activities', validation: 'All changes paused' },
      { step: 2, action: 'Revert to last known stable state', validation: 'System operational' },
      { step: 3, action: 'Document failure mode for post-mortem', validation: 'Incident report created' }
    ],
    verification: ['Risk score trending downward', 'No new incidents related to this risk', 'Stakeholder sign-off obtained']
  }),

  ACCEPTED: (entry: ROAMEntry): Partial<RunbookTemplate> => ({
    overview: `Accepted risk monitoring procedure for: ${entry.title}`,
    prerequisites: ['Confirm risk acceptance documented', 'Review acceptance criteria', 'Verify monitoring in place'],
    steps: [
      { step: 1, action: 'Review current risk metrics', expectedOutcome: 'Risk within accepted bounds', timeout: '15m' },
      { step: 2, action: 'Check for condition changes', expectedOutcome: 'No escalation needed', timeout: '30m' },
      { step: 3, action: 'Update tracking documentation', expectedOutcome: 'Records current', timeout: '10m' }
    ],
    escalationPath: [
      { level: 1, contact: 'Risk Owner', criteria: 'Risk exceeds accepted threshold' },
      { level: 2, contact: 'Engineering Manager', criteria: 'Risk materialized or acceptance criteria violated' }
    ],
    rollbackProcedure: [{ step: 1, action: 'Escalate to OWNED status and activate mitigation', validation: 'Status updated' }],
    verification: ['Risk remains within accepted parameters', 'Monitoring alerts functioning', 'Periodic review scheduled']
  }),

  RESOLVED: (entry: ROAMEntry): Partial<RunbookTemplate> => ({
    overview: `Verification procedure for resolved risk: ${entry.title}`,
    prerequisites: ['Confirm resolution documented', 'Verify fix deployed', 'Check validation tests passed'],
    steps: [
      { step: 1, action: 'Verify resolution effectiveness', expectedOutcome: 'Risk eliminated', timeout: '1h' },
      { step: 2, action: 'Close related tracking items', expectedOutcome: 'Records updated', timeout: '15m' },
      { step: 3, action: 'Document lessons learned', expectedOutcome: 'Knowledge captured', timeout: '30m' }
    ],
    escalationPath: [{ level: 1, contact: 'Risk Owner', criteria: 'Risk reappears' }],
    rollbackProcedure: [{ step: 1, action: 'Reopen as OWNED status', validation: 'Status updated' }],
    verification: ['No recurrence in 30 days', 'Related metrics stable', 'Post-mortem completed']
  }),

  MITIGATING: (entry: ROAMEntry): Partial<RunbookTemplate> => ({
    overview: `Active mitigation procedure for: ${entry.title}`,
    prerequisites: ['Confirm mitigation strategy approved', 'Resources allocated', 'Timeline established'],
    steps: [
      { step: 1, action: 'Review mitigation progress', expectedOutcome: 'On track', timeout: '30m' },
      { step: 2, action: `Continue: ${entry.mitigation_plan}`, expectedOutcome: 'Progress made', timeout: '4h' },
      { step: 3, action: 'Measure effectiveness metrics', expectedOutcome: 'Improvement detected', timeout: '1h' },
      { step: 4, action: 'Adjust strategy if needed', expectedOutcome: 'Strategy optimized', timeout: '2h' }
    ],
    escalationPath: [
      { level: 1, contact: 'Team Lead', criteria: 'Mitigation not showing results after 1 week' },
      { level: 2, contact: 'Engineering Manager', criteria: 'Risk score not improving' }
    ],
    rollbackProcedure: [
      { step: 1, action: 'Pause mitigation activities', validation: 'Changes halted' },
      { step: 2, action: 'Reassess approach with team', validation: 'New strategy proposed' }
    ],
    verification: ['Risk score decreasing', 'Mitigation on schedule', 'No negative side effects']
  })
};

export class ROAMRunbookGenerator {
  private roamTrackerPath: string;
  private runbooksDir: string;

  constructor(baseDir?: string) {
    const base = baseDir || join(__dirname, '../..');
    this.roamTrackerPath = join(base, '.goalie', 'ROAM_TRACKER.yaml');
    this.runbooksDir = join(base, 'docs', 'runbooks');
    if (!existsSync(this.runbooksDir)) mkdirSync(this.runbooksDir, { recursive: true });
  }

  loadROAMTracker(): { blockers: ROAMEntry[]; risks: ROAMEntry[]; dependencies: ROAMEntry[] } {
    if (!existsSync(this.roamTrackerPath)) throw new Error(`ROAM tracker not found: ${this.roamTrackerPath}`);
    const content = readFileSync(this.roamTrackerPath, 'utf8');
    return YAML.parse(content);
  }

  generateRunbook(entry: ROAMEntry, category: string): RunbookTemplate {
    const template = STATUS_TEMPLATES[entry.roam_status as keyof typeof STATUS_TEMPLATES];
    if (!template) throw new Error(`Unknown ROAM status: ${entry.roam_status}`);

    const partial = template(entry);
    return {
      id: entry.id, title: entry.title, status: entry.roam_status, riskScore: entry.risk_score,
      createdAt: new Date().toISOString(), lastUpdated: entry.last_updated,
      overview: partial.overview || '', prerequisites: partial.prerequisites || [],
      steps: partial.steps || [], escalationPath: partial.escalationPath || [],
      rollbackProcedure: partial.rollbackProcedure || [], verification: partial.verification || []
    };
  }

  renderMarkdown(runbook: RunbookTemplate): string {
    let md = `# Runbook: ${runbook.title}\n\n`;
    md += `**ID:** ${runbook.id}  \n**Status:** ${runbook.status}  \n**Risk Score:** ${runbook.riskScore}/10  \n`;
    md += `**Generated:** ${runbook.createdAt}  \n**Last Updated:** ${runbook.lastUpdated}\n\n`;
    md += `## Overview\n\n${runbook.overview}\n\n`;
    md += `## Prerequisites\n\n${runbook.prerequisites.map(p => `- [ ] ${p}`).join('\n')}\n\n`;
    md += `## Procedure Steps\n\n`;
    runbook.steps.forEach(s => { md += `### Step ${s.step}: ${s.action}\n\n- **Expected Outcome:** ${s.expectedOutcome}\n- **Timeout:** ${s.timeout}\n\n`; });
    md += `## Escalation Path\n\n| Level | Contact | Criteria |\n|-------|---------|----------|\n`;
    runbook.escalationPath.forEach(e => { md += `| ${e.level} | ${e.contact} | ${e.criteria} |\n`; });
    md += `\n## Rollback Procedure\n\n`;
    runbook.rollbackProcedure.forEach(r => { md += `${r.step}. **${r.action}** - Validate: ${r.validation}\n`; });
    md += `\n## Verification Checklist\n\n${runbook.verification.map(v => `- [ ] ${v}`).join('\n')}\n`;
    return md;
  }

  generateAllRunbooks(): string[] {
    const tracker = this.loadROAMTracker();
    const generated: string[] = [];

    const processEntries = (entries: ROAMEntry[], category: string) => {
      for (const entry of entries) {
        const runbook = this.generateRunbook(entry, category);
        const markdown = this.renderMarkdown(runbook);
        const filename = `${entry.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}-runbook.md`;
        const filepath = join(this.runbooksDir, filename);
        writeFileSync(filepath, markdown);
        generated.push(filepath);
      }
    };

    processEntries(tracker.blockers || [], 'blocker');
    processEntries(tracker.risks || [], 'risk');
    processEntries(tracker.dependencies || [], 'dependency');

    return generated;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔄 Generating runbooks from ROAM tracker...');
  const generator = new ROAMRunbookGenerator();
  const files = generator.generateAllRunbooks();
  files.forEach(f => console.log(`   📋 ${f}`));
  console.log(`✅ Generated ${files.length} runbooks`);
}
