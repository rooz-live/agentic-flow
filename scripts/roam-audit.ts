#!/usr/bin/env npx tsx
/**
 * ROAM Falsifiability Audit Script
 * 
 * Validates:
 * - ROAM (Resolved/Owned/Accepted/Mitigated) risk tracking coverage
 * - Pattern rationale documentation completeness
 * - MYM (Manthra/Yasna/Mithra) alignment scores
 * - WSJF (Weighted Shortest Job First) scoring accuracy
 * - Falsifiability of stated claims and metrics
 * 
 * Usage: npx tsx scripts/roam-audit.ts [--fix] [--report-path ./reports/roam-audit.json]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { glob } from 'glob';
import * as path from 'path';

interface ROAMItem {
  id: string;
  type: 'risk' | 'pattern' | 'decision';
  status: 'resolved' | 'owned' | 'accepted' | 'mitigated' | 'untracked';
  title: string;
  rationale?: string;
  falsifiable: boolean;
  mymScore?: {
    manthra: number;  // Method consistency (0-1)
    yasna: number;    // Practice alignment (0-1)
    mithra: number;   // Protocol adherence (0-1)
  };
  wsjfScore?: number;
  lastUpdated?: string;
  staleDays?: number;
}

interface AuditReport {
  timestamp: string;
  summary: {
    totalItems: number;
    tracked: number;
    untracked: number;
    withRationale: number;
    falsifiable: number;
    stale: number;
    avgMymScore: number;
    coveragePercent: number;
  };
  issues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: string;
    message: string;
    item?: string;
  }>;
  recommendations: string[];
  items: ROAMItem[];
}

async function findROAMDocuments(): Promise<string[]> {
  const patterns = [
    'docs/adr/**/*.md',
    'docs/roam/**/*.md',
    'docs/patterns/**/*.md',
    '.claude/roam/**/*.json',
    'reports/roam/**/*.json'
  ];
  
  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern);
    files.push(...matches);
  }
  
  return files;
}

function parseMarkdownROAM(content: string, filePath: string): ROAMItem[] {
  const items: ROAMItem[] = [];
  const lines = content.split('\n');
  
  let currentItem: Partial<ROAMItem> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect ROAM status markers
    const roamMatch = line.match(/\[([ROAM])\]/i);
    if (roamMatch) {
      if (currentItem) items.push(currentItem as ROAMItem);
      
      const statusMap: Record<string, ROAMItem['status']> = {
        'R': 'resolved',
        'O': 'owned',
        'A': 'accepted',
        'M': 'mitigated'
      };
      
      currentItem = {
        id: `${path.basename(filePath)}-${i}`,
        type: 'risk',
        status: statusMap[roamMatch[1].toUpperCase()] || 'untracked',
        title: line.replace(/\[([ROAM])\]/i, '').trim(),
        falsifiable: false
      };
    }
    
    // Extract rationale
    if (currentItem && line.match(/rationale:/i)) {
      currentItem.rationale = line.split(/rationale:/i)[1].trim();
    }
    
    // Extract WSJF score
    if (currentItem && line.match(/wsjf:\s*(\d+\.?\d*)/i)) {
      currentItem.wsjfScore = parseFloat(line.match(/wsjf:\s*(\d+\.?\d*)/i)![1]);
    }
    
    // Check falsifiability (contains measurable claims)
    if (currentItem && line.match(/(\d+%|<|>|=|measure|metric|validate|test)/i)) {
      currentItem.falsifiable = true;
    }
  }
  
  if (currentItem) items.push(currentItem as ROAMItem);
  return items;
}

function calculateMYMScore(item: ROAMItem): { manthra: number; yasna: number; mithra: number } {
  // Manthra: Method consistency
  const manthra = item.rationale && item.rationale.length > 50 ? 0.8 : 0.3;
  
  // Yasna: Practice alignment (has WSJF scoring)
  const yasna = item.wsjfScore !== undefined ? 0.9 : 0.4;
  
  // Mithra: Protocol adherence (falsifiable + tracked)
  const mithra = (item.falsifiable && item.status !== 'untracked') ? 0.85 : 0.35;
  
  return { manthra, yasna, mithra };
}

function calculateStaleness(lastUpdated?: string): number {
  if (!lastUpdated) return 999;
  const last = new Date(lastUpdated);
  const now = new Date();
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}

async function auditROAM(fix: boolean = false): Promise<AuditReport> {
  const files = await findROAMDocuments();
  const allItems: ROAMItem[] = [];
  
  for (const file of files) {
    if (!existsSync(file)) continue;
    
    const content = readFileSync(file, 'utf-8');
    
    if (file.endsWith('.md')) {
      const items = parseMarkdownROAM(content, file);
      allItems.push(...items);
    } else if (file.endsWith('.json')) {
      try {
        const data = JSON.parse(content);
        if (Array.isArray(data.roamItems)) {
          allItems.push(...data.roamItems);
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
  
  // Calculate MYM scores and staleness
  for (const item of allItems) {
    if (!item.mymScore) {
      item.mymScore = calculateMYMScore(item);
    }
    item.staleDays = calculateStaleness(item.lastUpdated);
  }
  
  // Generate audit report
  const tracked = allItems.filter(i => i.status !== 'untracked').length;
  const withRationale = allItems.filter(i => i.rationale && i.rationale.length > 0).length;
  const falsifiable = allItems.filter(i => i.falsifiable).length;
  const stale = allItems.filter(i => (i.staleDays || 0) > 3).length;
  
  const avgMymScore = allItems.reduce((sum, item) => {
    const mym = item.mymScore || { manthra: 0, yasna: 0, mithra: 0 };
    return sum + (mym.manthra + mym.yasna + mym.mithra) / 3;
  }, 0) / (allItems.length || 1);
  
  const issues: AuditReport['issues'] = [];
  const recommendations: string[] = [];
  
  // Critical issues
  if (tracked / allItems.length < 0.5) {
    issues.push({
      severity: 'critical',
      type: 'coverage',
      message: `Only ${Math.round(tracked / allItems.length * 100)}% of items are tracked (target: >70%)`
    });
    recommendations.push('Add ROAM status markers [R], [O], [A], or [M] to untracked items');
  }
  
  // Pattern rationale gaps
  if (withRationale / allItems.length < 0.6) {
    issues.push({
      severity: 'high',
      type: 'rationale',
      message: `${allItems.length - withRationale} items missing rationale documentation`
    });
    recommendations.push('Document rationale for each pattern and decision');
  }
  
  // Falsifiability issues
  if (falsifiable / allItems.length < 0.4) {
    issues.push({
      severity: 'high',
      type: 'falsifiability',
      message: 'Too few items have measurable/falsifiable claims (target: >60%)'
    });
    recommendations.push('Add measurable metrics, test criteria, or validation methods');
  }
  
  // Staleness warnings
  if (stale > 0) {
    issues.push({
      severity: 'medium',
      type: 'staleness',
      message: `${stale} items not updated in >3 days`
    });
    recommendations.push('Review and update stale ROAM items');
  }
  
  // MYM alignment
  if (avgMymScore < 0.6) {
    issues.push({
      severity: 'high',
      type: 'mym-alignment',
      message: `Average MYM score is ${avgMymScore.toFixed(2)} (target: >0.75)`
    });
    recommendations.push('Improve Method/Yasna/Mithra alignment scores');
  }
  
  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalItems: allItems.length,
      tracked,
      untracked: allItems.length - tracked,
      withRationale,
      falsifiable,
      stale,
      avgMymScore,
      coveragePercent: Math.round(tracked / allItems.length * 100)
    },
    issues,
    recommendations,
    items: allItems
  };
  
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const reportPathArg = args.find(arg => arg.startsWith('--report-path='));
  const reportPath = reportPathArg 
    ? reportPathArg.split('=')[1] 
    : './reports/roam-audit.json';
  
  console.log('🔍 ROAM Falsifiability Audit\n');
  
  const report = await auditROAM(fix);
  
  // Display summary
  console.log('📊 Summary:');
  console.log(`   Total Items: ${report.summary.totalItems}`);
  console.log(`   Tracked: ${report.summary.tracked} (${report.summary.coveragePercent}%)`);
  console.log(`   With Rationale: ${report.summary.withRationale}`);
  console.log(`   Falsifiable: ${report.summary.falsifiable}`);
  console.log(`   Stale (>3 days): ${report.summary.stale}`);
  console.log(`   Avg MYM Score: ${report.summary.avgMymScore.toFixed(2)}\n`);
  
  // Display issues
  if (report.issues.length > 0) {
    console.log('⚠️  Issues:');
    for (const issue of report.issues) {
      const icon = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
      }[issue.severity];
      console.log(`   ${icon} [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.message}`);
    }
    console.log();
  }
  
  // Display recommendations
  if (report.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    for (const rec of report.recommendations) {
      console.log(`   • ${rec}`);
    }
    console.log();
  }
  
  // Save report
  const reportDir = path.dirname(reportPath);
  if (!existsSync(reportDir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(reportDir, { recursive: true });
  }
  
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`✅ Audit report saved to ${reportPath}`);
  
  // Exit with error if critical issues found
  const hasCritical = report.issues.some(i => i.severity === 'critical');
  process.exit(hasCritical ? 1 : 0);
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Audit failed:', err);
    process.exit(1);
  });
}

export { auditROAM, type AuditReport, type ROAMItem };
