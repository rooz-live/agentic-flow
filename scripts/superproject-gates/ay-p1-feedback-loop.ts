#!/usr/bin/env tsx
/**
 * P1 Feedback Loop Implementation
 * 
 * Implements skill validation tracking, confidence updates, and iteration handoff reporting
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

interface SkillValidation {
  id: number;
  skill_id: string;
  skill_name: string;
  circle: string;
  confidence_before: number;
  confidence_after: number;
  outcome: 'success' | 'failure' | 'partial';
  iteration_id: string;
  timestamp: string;
  momentum: number;
}

interface IterationHandoff {
  id: number;
  from_iteration: string;
  to_iteration: string;
  skills_handed_off: number;
  skills_received: number;
  confidence_delta: number;
  timestamp: string;
}

class P1FeedbackLoop {
  private db: Database.Database;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || path.resolve(__dirname, '../..');
    this.db = new Database(path.join(this.projectRoot, 'agentdb.db'));
    this.initializeTables();
  }

  /**
   * Initialize database tables for P1 feedback loop
   */
  private initializeTables(): void {
    // Create skill_validations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skill_validations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        skill_id TEXT NOT NULL,
        skill_name TEXT NOT NULL,
        circle TEXT NOT NULL,
        confidence_before REAL NOT NULL,
        confidence_after REAL NOT NULL,
        outcome TEXT NOT NULL,
        iteration_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        momentum REAL NOT NULL DEFAULT 0
      )
    `);

    // Create iteration_handoffs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS iteration_handoffs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_iteration TEXT NOT NULL,
        to_iteration TEXT NOT NULL,
        skills_handed_off INTEGER NOT NULL,
        skills_received INTEGER NOT NULL,
        confidence_delta REAL NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);

    // Create skill_confidence_summary table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skill_confidence_summary (
        skill_id TEXT PRIMARY KEY,
        skill_name TEXT NOT NULL,
        total_validations INTEGER NOT NULL DEFAULT 0,
        successful_validations INTEGER NOT NULL DEFAULT 0,
        current_confidence REAL NOT NULL DEFAULT 0,
        momentum REAL NOT NULL DEFAULT 0,
        last_updated TEXT NOT NULL
      )
    `);

    console.log('  ✓ P1 feedback loop tables initialized');
  }

  /**
   * Record skill validation with confidence update
   */
  recordSkillValidation(params: {
    skillId: string;
    skillName: string;
    circle: string;
    confidenceBefore: number;
    outcome: 'success' | 'failure' | 'partial';
    iterationId: string;
  }): void {
    const timestamp = new Date().toISOString();
    
    // Calculate confidence after based on outcome
    let confidenceAfter = params.confidenceBefore;
    const momentum = this.calculateMomentum(params.outcome, params.confidenceBefore);
    
    switch (params.outcome) {
      case 'success':
        confidenceAfter = Math.min(1.0, params.confidenceBefore + 0.1 + momentum);
        break;
      case 'failure':
        confidenceAfter = Math.max(0.0, params.confidenceBefore - 0.15 - momentum);
        break;
      case 'partial':
        // No change for partial outcomes
        break;
    }

    // Insert into skill_validations
    this.db.prepare(`
      INSERT INTO skill_validations 
      (skill_id, skill_name, circle, confidence_before, confidence_after, outcome, iteration_id, timestamp, momentum)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.skillId,
      params.skillName,
      params.circle,
      params.confidenceBefore,
      confidenceAfter,
      params.outcome,
      params.iterationId,
      timestamp,
      momentum
    );

    // Update skill_confidence_summary
    this.updateSkillConfidenceSummary(params.skillId, params.skillName, params.outcome, confidenceAfter, momentum);

    console.log(`  ✓ Recorded skill validation: ${params.skillName} (${params.outcome})`);
  }

  /**
   * Calculate momentum based on outcome
   * Uses Bayesian-inspired momentum for confidence updates
   */
  private calculateMomentum(outcome: 'success' | 'failure' | 'partial', currentConfidence: number): number {
    // Momentum increases with consecutive successes, decreases with failures
    const baseMomentum = 0.05;
    
    switch (outcome) {
      case 'success':
        return baseMomentum * (1 + currentConfidence); // Higher confidence = more momentum
      case 'failure':
        return -baseMomentum * (1 + (1 - currentConfidence)); // Lower confidence = less negative momentum
      case 'partial':
        return 0; // No momentum for partial
    }
  }

  /**
   * Update skill confidence summary
   */
  private updateSkillConfidenceSummary(skillId: string, skillName: string, outcome: 'success' | 'failure' | 'partial', newConfidence: number, momentum: number): void {
    const now = new Date().toISOString();
    
    // Check if summary exists
    const existing = this.db.prepare('SELECT * FROM skill_confidence_summary WHERE skill_id = ?').get(skillId);
    
    if (existing) {
      // Update existing summary
      const totalValidations = existing.total_validations + 1;
      const successfulValidations = existing.successful_validations + (outcome === 'success' ? 1 : 0);
      const avgMomentum = (existing.momentum * existing.total_validations + momentum) / totalValidations;
      
      this.db.prepare(`
        UPDATE skill_confidence_summary
        SET total_validations = ?, successful_validations = ?, current_confidence = ?, momentum = ?, last_updated = ?
        WHERE skill_id = ?
      `).run(totalValidations, successfulValidations, newConfidence, avgMomentum, now, skillId);
    } else {
      // Insert new summary
      this.db.prepare(`
        INSERT INTO skill_confidence_summary
        (skill_id, skill_name, total_validations, successful_validations, current_confidence, momentum, last_updated)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(skillId, skillName, 1, outcome === 'success' ? 1 : 0, newConfidence, momentum, now);
    }
  }

  /**
   * Record iteration handoff
   */
  recordIterationHandoff(params: {
    fromIteration: string;
    toIteration: string;
    skillsHandedOff: number;
    skillsReceived: number;
  }): void {
    const timestamp = new Date().toISOString();
    const confidenceDelta = this.calculateIterationConfidenceDelta(params.skillsHandedOff, params.skillsReceived);

    this.db.prepare(`
      INSERT INTO iteration_handoffs
      (from_iteration, to_iteration, skills_handed_off, skills_received, confidence_delta, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      params.fromIteration,
      params.toIteration,
      params.skillsHandedOff,
      params.skillsReceived,
      confidenceDelta,
      timestamp
    );

    console.log(`  ✓ Recorded iteration handoff: ${params.fromIteration} → ${params.toIteration}`);
  }

  /**
   * Calculate confidence delta for iteration handoff
   */
  private calculateIterationConfidenceDelta(skillsHandedOff: number, skillsReceived: number): number {
    if (skillsHandedOff === 0) return 0;
    return (skillsReceived - skillsHandedOff) / skillsHandedOff;
  }

  /**
   * Get skill validation report
   */
  getSkillValidationReport(limit: number = 10): {
    recentValidations: SkillValidation[];
    summary: {
      totalValidations: number;
      successfulValidations: number;
      avgConfidence: number;
    };
  } {
    const recentValidations = this.db.prepare(`
      SELECT * FROM skill_validations
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit) as SkillValidation[];

    const summary = this.db.prepare(`
      SELECT 
        COUNT(*) as total_validations,
        SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as successful_validations,
        AVG(current_confidence) as avg_confidence
      FROM skill_validations
    `).get() as any;

    return { recentValidations, summary };
  }

  /**
   * Get iteration handoff report
   */
  getIterationHandoffReport(limit: number = 10): IterationHandoff[] {
    return this.db.prepare(`
      SELECT * FROM iteration_handoffs
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit) as IterationHandoff[];
  }

  /**
   * Generate comprehensive report
   */
  generateReport(): string {
    const validationReport = this.getSkillValidationReport(20);
    const handoffReport = this.getIterationHandoffReport(20);

    const lines: string[] = [];
    
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('                    P1 FEEDBACK LOOP REPORT');
    lines.push('═══════════════════════════════════════════════════════════\n');

    // Summary
    lines.push('📊 SUMMARY:');
    lines.push(`  Total Validations:     ${validationReport.summary.totalValidations}`);
    lines.push(`  Successful Validations: ${validationReport.summary.successfulValidations}`);
    lines.push(`  Success Rate:          ${((validationReport.summary.successfulValidations / validationReport.summary.totalValidations) * 100).toFixed(1)}%`);
    lines.push(`  Avg Confidence:         ${validationReport.summary.avgConfidence.toFixed(3)}\n`);

    // Recent Validations
    lines.push('📋 RECENT SKILL VALIDATIONS:');
    for (const validation of validationReport.recentValidations) {
      const icon = validation.outcome === 'success' ? '✅' : validation.outcome === 'failure' ? '❌' : '⚠️';
      const confidenceChange = (validation.confidence_after - validation.confidence_before).toFixed(3);
      const changeIcon = parseFloat(confidenceChange) >= 0 ? '📈' : '📉';
      
      lines.push(`  ${icon} ${validation.skill_name} (${validation.circle})`);
      lines.push(`     Confidence: ${validation.confidence_before.toFixed(3)} → ${validation.confidence_after.toFixed(3)} ${changeIcon}${confidenceChange}`);
      lines.push(`     Momentum: ${validation.momentum.toFixed(4)}`);
    }

    // Iteration Handoffs
    lines.push('\n🔄 ITERATION HANDOFFS:');
    for (const handoff of handoffReport) {
      const deltaIcon = parseFloat(handoff.confidence_delta) >= 0 ? '📈' : '📉';
      lines.push(`  ${handoff.from_iteration} → ${handoff.to_iteration}`);
      lines.push(`     Skills: ${handoff.skills_handed_off} → ${handoff.skills_received}`);
      lines.push(`     Confidence Delta: ${deltaIcon}${handoff.confidence_delta.toFixed(3)}`);
    }

    lines.push('\n═══════════════════════════════════════════════════════════\n');

    return lines.join('\n');
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const feedbackLoop = new P1FeedbackLoop();
  const command = process.argv[2] || 'report';

  switch (command) {
    case 'report':
      console.log(feedbackLoop.generateReport());
      break;
    case 'validations':
      const validationReport = feedbackLoop.getSkillValidationReport(parseInt(process.argv[3] || '10'));
      console.log(JSON.stringify(validationReport, null, 2));
      break;
    case 'handoffs':
      const handoffReport = feedbackLoop.getIterationHandoffReport(parseInt(process.argv[3] || '10'));
      console.log(JSON.stringify(handoffReport, null, 2));
      break;
    default:
      console.log('Usage: tsx ay-p1-feedback-loop.ts [command] [options]');
      console.log('');
      console.log('Commands:');
      console.log('  report       - Generate comprehensive report');
      console.log('  validations  - Get recent validations (default: 10)');
      console.log('  handoffs     - Get recent handoffs (default: 10)');
      break;
  }

  feedbackLoop.close();
}

export { P1FeedbackLoop, SkillValidation, IterationHandoff };
