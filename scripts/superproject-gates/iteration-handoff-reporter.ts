#!/usr/bin/env node

/**
 * @fileoverview Iteration Handoff Reporter
 * 
 * Creates iteration handoff reports for cross-iteration tracking
 * Summarizes skills used, confidence scores, and outcomes
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { SkillValidationTracker, generateRunId } from './src/core/skill-validation-tracker.js';

// ══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ══════════════════════════════════════════════════════════════════════════════

export interface IterationHandoffReport {
  handoff_id: string;
  from_run_id: string;
  to_run_id: string;
  iteration_number: number;
  timestamp: number;
  skills_summary: {
    total_skills: number;
    skills_by_circle: Record<string, number>;
    top_confident_skills: Array<{
      skill_id: string;
      description: string;
      confidence: number;
      uses: number;
    }>;
    low_confident_skills: Array<{
      skill_id: string;
      description: string;
      confidence: number;
      uses: number;
    }>;
  };
  confidence_summary: {
    avg_confidence: number;
    min_confidence: number;
    max_confidence: number;
    confidence_distribution: {
      high: number;  // > 0.8
      medium: number; // 0.5 - 0.8
      low: number;    // < 0.5
    };
  };
  outcomes_summary: {
    total_validations: number;
    success_count: number;
    failure_count: number;
    partial_count: number;
    timeout_count: number;
    success_rate: number;
  };
  recommendations: string[];
  handoff_data: {
    circle_performance: Record<string, {
      unique_skills: number;
      avg_confidence: number;
      success_rate: number;
    }>;
    skills_needing_attention: string[];
  };
}

export interface HandoffConfig {
  fromRunId?: string;
  toRunId?: string;
  iterationNumber?: number;
  dbPath?: string;
  outputPath?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// Iteration Handoff Reporter Class
// ══════════════════════════════════════════════════════════════════════════

export class IterationHandoffReporter {
  private db: Database.Database;
  private tracker: SkillValidationTracker;
  private outputPath: string;

  constructor(config: HandoffConfig = {}) {
    this.db = new Database(config.dbPath || './agentdb.db');
    this.tracker = new SkillValidationTracker(config.dbPath || './agentdb.db');
    this.outputPath = config.outputPath || '.goalie/iteration_handoffs.jsonl';
  }

  /**
   * Generate iteration handoff report
   */
  generateHandoffReport(config: HandoffConfig): IterationHandoffReport {
    const fromRunId = config.fromRunId || this.getLastRunId();
    const toRunId = config.toRunId || generateRunId();
    const iterationNumber = config.iterationNumber || this.getNextIterationNumber();

    // Get skills summary from skill_validations table
    const skillsSummary = this.getSkillsSummary(fromRunId);

    // Get confidence summary
    const confidenceSummary = this.getConfidenceSummary(fromRunId);

    // Get outcomes summary
    const outcomesSummary = this.getOutcomesSummary(fromRunId);

    // Generate recommendations
    const recommendations = this.generateRecommendations(skillsSummary, confidenceSummary, outcomesSummary);

    // Get handoff data
    const handoffData = {
      circle_performance: this.getCirclePerformance(fromRunId),
      skills_needing_attention: this.getSkillsNeedingAttention(fromRunId)
    };

    const report: IterationHandoffReport = {
      handoff_id: uuidv4(),
      from_run_id: fromRunId,
      to_run_id: toRunId,
      iteration_number: iterationNumber,
      timestamp: Date.now(),
      skills_summary: skillsSummary,
      confidence_summary: confidenceSummary,
      outcomes_summary: outcomesSummary,
      recommendations,
      handoff_data: handoffData
    };

    // Store handoff in database
    this.tracker.createIterationHandoff(
      fromRunId,
      toRunId,
      iterationNumber,
      JSON.stringify(skillsSummary),
      recommendations.join('; '),
      JSON.stringify(handoffData)
    );

    return report;
  }

  /**
   * Get skills summary from recent validations
   */
  private getSkillsSummary(runId: string): IterationHandoffReport['skills_summary'] {
    const skills = this.db.prepare(`
      SELECT 
        s.skill_id,
        s.description,
        s.success_rate as confidence,
        s.uses,
        s.circle,
        COUNT(sv.validation_id) as validation_count
      FROM skills s
      LEFT JOIN skill_validations sv ON s.skill_id = sv.skill_id AND sv.run_id = ?
      GROUP BY s.skill_id
      ORDER BY s.success_rate DESC
    `).all(runId) as Array<{
      skill_id: string;
      description: string;
      confidence: number;
      uses: number;
      circle: string;
      validation_count: number;
    }>;

    const skillsByCircle: Record<string, number> = {};
    skills.forEach(s => {
      skillsByCircle[s.circle] = (skillsByCircle[s.circle] || 0) + 1;
    });

    const topConfidentSkills = skills
      .filter(s => s.confidence > 0.8)
      .slice(0, 10)
      .map(s => ({
        skill_id: s.skill_id,
        description: s.description,
        confidence: s.confidence,
        uses: s.uses
      }));

    const lowConfidentSkills = skills
      .filter(s => s.confidence < 0.5 && s.validation_count > 0)
      .map(s => ({
        skill_id: s.skill_id,
        description: s.description,
        confidence: s.confidence,
        uses: s.uses
      }));

    return {
      total_skills: skills.length,
      skills_by_circle: skillsByCircle,
      top_confident_skills: topConfidentSkills,
      low_confident_skills: lowConfidentSkills
    };
  }

  /**
   * Get confidence summary
   */
  private getConfidenceSummary(runId: string): IterationHandoffReport['confidence_summary'] {
    const summary = this.db.prepare(`
      SELECT 
        AVG(updated_confidence) as avg_confidence,
        MIN(updated_confidence) as min_confidence,
        MAX(updated_confidence) as max_confidence
      FROM skill_validations
      WHERE run_id = ?
    `).get(runId) as {
      avg_confidence: number;
      min_confidence: number;
      max_confidence: number;
    } | undefined;

    const allConfidences = this.db.prepare(`
      SELECT updated_confidence FROM skill_validations WHERE run_id = ?
    `).all(runId) as Array<{ updated_confidence: number }>;

    const confidenceDistribution = {
      high: allConfidences.filter(c => c.updated_confidence > 0.8).length,
      medium: allConfidences.filter(c => c.updated_confidence >= 0.5 && c.updated_confidence <= 0.8).length,
      low: allConfidences.filter(c => c.updated_confidence < 0.5).length
    };

    return {
      avg_confidence: summary?.avg_confidence || 0,
      min_confidence: summary?.min_confidence || 0,
      max_confidence: summary?.max_confidence || 0,
      confidence_distribution: confidenceDistribution
    };
  }

  /**
   * Get outcomes summary
   */
  private getOutcomesSummary(runId: string): IterationHandoffReport['outcomes_summary'] {
    const summary = this.db.prepare(`
      SELECT 
        COUNT(*) as total_validations,
        SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN outcome = 'failure' THEN 1 ELSE 0 END) as failure_count,
        SUM(CASE WHEN outcome = 'partial' THEN 1 ELSE 0 END) as partial_count,
        SUM(CASE WHEN outcome = 'timeout' THEN 1 ELSE 0 END) as timeout_count
      FROM skill_validations
      WHERE run_id = ?
    `).get(runId) as {
      total_validations: number;
      success_count: number;
      failure_count: number;
      partial_count: number;
      timeout_count: number;
    } | undefined;

    const successRate = summary && summary.total_validations > 0
      ? (summary.success_count / summary.total_validations) * 100
      : 0;

    return {
      total_validations: summary?.total_validations || 0,
      success_count: summary?.success_count || 0,
      failure_count: summary?.failure_count || 0,
      partial_count: summary?.partial_count || 0,
      timeout_count: summary?.timeout_count || 0,
      success_rate: successRate
    };
  }

  /**
   * Get circle performance
   */
  private getCirclePerformance(runId: string): IterationHandoffReport['handoff_data']['circle_performance'] {
    const circles = this.db.prepare(`
      SELECT 
        sv.circle,
        COUNT(DISTINCT sv.skill_id) as unique_skills,
        AVG(sv.updated_confidence) as avg_confidence,
        CAST(SUM(CASE WHEN sv.outcome = 'success' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as success_rate
      FROM skill_validations sv
      WHERE sv.run_id = ?
      GROUP BY sv.circle
    `).all(runId) as Array<{
      circle: string;
      unique_skills: number;
      avg_confidence: number;
      success_rate: number;
    }>;

    const performance: Record<string, { unique_skills: number; avg_confidence: number; success_rate: number }> = {};
    circles.forEach(c => {
      performance[c.circle] = {
        unique_skills: c.unique_skills,
        avg_confidence: c.avg_confidence,
        success_rate: c.success_rate
      };
    });

    return performance;
  }

  /**
   * Get skills needing attention
   */
  private getSkillsNeedingAttention(runId: string): string[] {
    const skills = this.db.prepare(`
      SELECT 
        sv.skill_id,
        AVG(sv.updated_confidence) as avg_confidence,
        SUM(CASE WHEN sv.outcome = 'failure' THEN 1 ELSE 0 END) as failure_count,
        COUNT(*) as total_count
      FROM skill_validations sv
      WHERE sv.run_id = ?
      GROUP BY sv.skill_id
      HAVING avg_confidence < 0.5 OR (CAST(failure_count AS REAL) / total_count) > 0.3
      ORDER BY avg_confidence ASC
    `).all(runId) as Array<{
      skill_id: string;
    }>;

    return skills.map(s => s.skill_id);
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    skillsSummary: IterationHandoffReport['skills_summary'],
    confidenceSummary: IterationHandoffReport['confidence_summary'],
    outcomesSummary: IterationHandoffReport['outcomes_summary']
  ): string[] {
    const recommendations: string[] = [];

    // Confidence-based recommendations
    if (confidenceSummary.confidence_distribution.low > 0) {
      recommendations.push(
        `${confidenceSummary.confidence_distribution.low} skills have low confidence (< 0.5). Consider reviewing and improving these skills.`
      );
    }

    if (confidenceSummary.avg_confidence < 0.7) {
      recommendations.push(
        `Average confidence (${confidenceSummary.avg_confidence.toFixed(2)}) is below target (0.7). Focus on improving skill execution quality.`
      );
    }

    // Outcome-based recommendations
    if (outcomesSummary.failure_count > outcomesSummary.success_count) {
      recommendations.push(
        `Failure rate (${((outcomesSummary.failure_count / outcomesSummary.total_validations) * 100).toFixed(1)}%) exceeds success rate. Investigate root causes.`
      );
    }

    // Circle balance recommendations
    const circleCounts = Object.values(skillsSummary.skills_by_circle);
    const maxCircleSkills = Math.max(...circleCounts);
    const minCircleSkills = Math.min(...circleCounts);
    if (maxCircleSkills - minCircleSkills > 3) {
      recommendations.push(
        `Skill distribution across circles is imbalanced (${minCircleSkills} to ${maxCircleSkills}). Consider redistributing skill development.`
      );
    }

    // Skills needing attention
    if (skillsSummary.low_confident_skills.length > 0) {
      recommendations.push(
        `${skillsSummary.low_confident_skills.length} skills need attention due to low confidence or high failure rate.`
      );
    }

    return recommendations;
  }

  /**
   * Get last run ID from database
   */
  private getLastRunId(): string {
    const row = this.db.prepare(`
      SELECT run_id FROM skill_validations 
      ORDER BY completed_at DESC 
      LIMIT 1
    `).get() as { run_id: string } | undefined;

    return row?.run_id || generateRunId();
  }

  /**
   * Get next iteration number
   */
  private getNextIterationNumber(): number {
    const row = this.db.prepare(`
      SELECT MAX(iteration_number) as max_iteration FROM iteration_handoffs
    `).get() as { max_iteration: number } | undefined;

    return (row?.max_iteration || 0) + 1;
  }

  /**
   * Save handoff report to file
   */
  saveHandoffReport(report: IterationHandoffReport): void {
    const fs = require('fs');
    const path = require('path');

    // Ensure directory exists
    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Append to JSONL file
    fs.appendFileSync(this.outputPath, JSON.stringify(report) + '\n');
  }

  /**
   * Print handoff report to console
   */
  printHandoffReport(report: IterationHandoffReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('ITERATION HANDOFF REPORT');
    console.log('='.repeat(80));
    console.log(`Handoff ID: ${report.handoff_id}`);
    console.log(`From Run: ${report.from_run_id}`);
    console.log(`To Run: ${report.to_run_id}`);
    console.log(`Iteration: ${report.iteration_number}`);
    console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
    console.log('');

    console.log('SKILLS SUMMARY');
    console.log('-'.repeat(40));
    console.log(`Total Skills: ${report.skills_summary.total_skills}`);
    console.log(`Skills by Circle:`);
    Object.entries(report.skills_summary.skills_by_circle).forEach(([circle, count]) => {
      console.log(`  ${circle}: ${count}`);
    });
    console.log(`Top Confident Skills: ${report.skills_summary.top_confident_skills.length}`);
    console.log(`Low Confident Skills: ${report.skills_summary.low_confident_skills.length}`);
    console.log('');

    console.log('CONFIDENCE SUMMARY');
    console.log('-'.repeat(40));
    console.log(`Average: ${report.confidence_summary.avg_confidence.toFixed(3)}`);
    console.log(`Range: ${report.confidence_summary.min_confidence.toFixed(3)} - ${report.confidence_summary.max_confidence.toFixed(3)}`);
    console.log(`Distribution:`);
    console.log(`  High (>0.8): ${report.confidence_summary.confidence_distribution.high}`);
    console.log(`  Medium (0.5-0.8): ${report.confidence_summary.confidence_distribution.medium}`);
    console.log(`  Low (<0.5): ${report.confidence_summary.confidence_distribution.low}`);
    console.log('');

    console.log('OUTCOMES SUMMARY');
    console.log('-'.repeat(40));
    console.log(`Total Validations: ${report.outcomes_summary.total_validations}`);
    console.log(`Success: ${report.outcomes_summary.success_count}`);
    console.log(`Failure: ${report.outcomes_summary.failure_count}`);
    console.log(`Partial: ${report.outcomes_summary.partial_count}`);
    console.log(`Timeout: ${report.outcomes_summary.timeout_count}`);
    console.log(`Success Rate: ${report.outcomes_summary.success_rate.toFixed(1)}%`);
    console.log('');

    console.log('RECOMMENDATIONS');
    console.log('-'.repeat(40));
    report.recommendations.forEach((rec, idx) => {
      console.log(`${idx + 1}. ${rec}`);
    });
    console.log('');

    console.log('='.repeat(80));
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
    this.tracker.close();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// CLI Entry Point
// ══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);
  const config: HandoffConfig = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--from':
        config.fromRunId = args[++i];
        break;
      case '--to':
        config.toRunId = args[++i];
        break;
      case '--iteration':
        config.iterationNumber = parseInt(args[++i]);
        break;
      case '--db':
        config.dbPath = args[++i];
        break;
      case '--output':
        config.outputPath = args[++i];
        break;
      case '--help':
        console.log(`
Usage: iteration-handoff-reporter.ts [options]

Options:
  --from <run_id>       Source run ID (default: last run)
  --to <run_id>         Target run ID (default: new run)
  --iteration <number>   Iteration number (default: auto-increment)
  --db <path>            Database path (default: ./agentdb.db)
  --output <path>         Output file path (default: .goalie/iteration_handoffs.jsonl)
  --help                 Show this help message

Example:
  node scripts/iteration-handoff-reporter.ts --from run_12345 --to run_67890 --iteration 5
        `);
        process.exit(0);
    }
  }

  try {
    const reporter = new IterationHandoffReporter(config);
    const report = reporter.generateHandoffReport(config);

    reporter.printHandoffReport(report);
    reporter.saveHandoffReport(report);

    console.log(`\n✅ Handoff report saved to: ${reporter['outputPath']}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

export { IterationHandoffReporter, IterationHandoffReport, HandoffConfig };
