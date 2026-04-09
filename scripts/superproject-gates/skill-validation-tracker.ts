/**
 * @fileoverview Skill Validation Tracker
 * 
 * Tracks skill usage, validation results, and dynamic confidence scores
 * Implements feedback loop for continuous skill improvement
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

// ════════════════════════════════════════════════════════════════════════════
// Type Definitions
// ════════════════════════════════════════════════════════════════════════════

export interface SkillValidation {
  validation_id: string;
  skill_id: string;
  run_id: string;
  correlation_id?: string;
  circle: string;
  ceremony: string;
  mode: 'advisory' | 'mutate' | 'safe_degrade';
  initial_confidence: number;
  updated_confidence: number;
  confidence_delta: number;
  outcome: 'success' | 'failure' | 'partial' | 'timeout';
  completion_pct: number;
  duration_ms?: number;
  mode_score: number;
  reward: number;
  wsjf_score?: number;
  skill_context?: string;
  execution_context?: string;
  mcp_health?: string;
  started_at: number;
  completed_at: number;
}

export interface IterationHandoff {
  handoff_id: string;
  from_run_id: string;
  to_run_id: string;
  iteration_number: number;
  timestamp: number;
  skills_summary: string;
  avg_confidence: number;
  min_confidence: number;
  max_confidence: number;
  total_validations: number;
  success_count: number;
  failure_count: number;
  partial_count: number;
  recommendations?: string;
  handoff_data?: string;
}

export interface SkillContext {
  skills: Array<{
    skill_id: string;
    description: string;
    success_rate: number;
    uses: number;
  }>;
  total_skills: number;
  circle: string;
}

export interface ConfidenceUpdateParams {
  skill_id: string;
  run_id: string;
  correlation_id?: string;
  circle: string;
  ceremony: string;
  mode: 'advisory' | 'mutate' | 'safe_degrade';
  outcome: 'success' | 'failure' | 'partial' | 'timeout';
  completion_pct: number;
  duration_ms?: number;
  mode_score: number;
  reward: number;
  wsjf_score?: number;
  skill_context?: string;
  execution_context?: string;
  mcp_health?: string;
}

export interface ConfidenceSummary {
  skill_id: string;
  total_validations: number;
  avg_confidence: number;
  min_confidence: number;
  max_confidence: number;
  avg_delta: number;
  success_count: number;
  failure_count: number;
  partial_count: number;
  last_validated_at: number;
}

export interface CirclePerformance {
  circle: string;
  unique_skills: number;
  total_validations: number;
  avg_confidence: number;
  avg_completion_pct: number;
  avg_duration_ms: number;
  success_count: number;
  failure_count: number;
  last_activity_at: number;
}

// ════════════════════════════════════════════════════════════════════════════
// Skill Validation Tracker Class
// ════════════════════════════════════════════════════════════════════════════

export class SkillValidationTracker {
  private db: Database.Database;
  private insertValidationStmt!: Database.Statement;
  private insertHandoffStmt!: Database.Statement;
  private getInitialConfidenceStmt!: Database.Statement;
  private updateSkillConfidenceStmt!: Database.Statement;

  constructor(dbPath: string = './agentdb.db') {
    this.db = new Database(dbPath);
    this.initializeStatements();
  }

  private initializeStatements(): void {
    // Insert skill validation
    this.insertValidationStmt = this.db.prepare(`
      INSERT INTO skill_validations (
        validation_id, skill_id, run_id, correlation_id,
        circle, ceremony, mode,
        initial_confidence, updated_confidence,
        outcome, completion_pct, duration_ms,
        mode_score, reward, wsjf_score,
        skill_context, execution_context, mcp_health,
        started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Insert iteration handoff
    this.insertHandoffStmt = this.db.prepare(`
      INSERT INTO iteration_handoffs (
        handoff_id, from_run_id, to_run_id,
        iteration_number, timestamp,
        skills_summary, avg_confidence, min_confidence, max_confidence,
        total_validations, success_count, failure_count, partial_count,
        recommendations, handoff_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Get initial confidence for a skill
    this.getInitialConfidenceStmt = this.db.prepare(`
      SELECT success_rate as confidence FROM skills WHERE skill_id = ?
    `);

    // Update skill confidence in skills table
    this.updateSkillConfidenceStmt = this.db.prepare(`
      UPDATE skills 
      SET success_rate = ?, uses = uses + 1 
      WHERE skill_id = ?
    `);
  }

  /**
   * Calculate dynamic confidence score based on execution outcome
   * Uses Bayesian-inspired update with momentum
   */
  private calculateUpdatedConfidence(
    initialConfidence: number,
    outcome: 'success' | 'failure' | 'partial' | 'timeout',
    completionPct: number,
    modeScore: number,
    reward: number
  ): number {
    // Base confidence adjustment based on outcome
    let outcomeMultiplier: number;
    switch (outcome) {
      case 'success':
        outcomeMultiplier = 1.1; // Increase confidence
        break;
      case 'partial':
        outcomeMultiplier = 1.0; // Maintain confidence
        break;
      case 'timeout':
        outcomeMultiplier = 0.95; // Slight decrease
        break;
      case 'failure':
        outcomeMultiplier = 0.85; // Decrease confidence
        break;
    }

    // Adjust based on completion percentage
    const completionFactor = completionPct / 100;

    // Adjust based on mode score (0-1 scale)
    const modeFactor = modeScore / 100;

    // Adjust based on reward (normalized)
    const rewardFactor = Math.min(reward / 100, 1);

    // Calculate new confidence with momentum (0.3 learning rate)
    const targetConfidence = initialConfidence * outcomeMultiplier * completionFactor;
    const updatedConfidence = initialConfidence + (targetConfidence - initialConfidence) * 0.3;

    // Clamp to valid range [0, 1]
    return Math.max(0, Math.min(1, updatedConfidence));
  }

  /**
   * Record a skill validation with confidence update
   */
  recordValidation(params: ConfidenceUpdateParams): SkillValidation {
    const now = Date.now();
    const validationId = uuidv4();

    // Get initial confidence from skills table
    const skillRow = this.getInitialConfidenceStmt.get(params.skill_id) as { confidence: number } | undefined;
    const initialConfidence = skillRow?.confidence ?? 0.5;

    // Calculate updated confidence
    const updatedConfidence = this.calculateUpdatedConfidence(
      initialConfidence,
      params.outcome,
      params.completion_pct,
      params.mode_score,
      params.reward
    );

    const confidenceDelta = updatedConfidence - initialConfidence;

    // Insert validation record
    this.insertValidationStmt.run({
      validation_id: validationId,
      skill_id: params.skill_id,
      run_id: params.run_id,
      correlation_id: params.correlation_id,
      circle: params.circle,
      ceremony: params.ceremony,
      mode: params.mode,
      initial_confidence: initialConfidence,
      updated_confidence: updatedConfidence,
      outcome: params.outcome,
      completion_pct: params.completion_pct,
      duration_ms: params.duration_ms,
      mode_score: params.mode_score,
      reward: params.reward,
      wsjf_score: params.wsjf_score,
      skill_context: params.skill_context,
      execution_context: params.execution_context,
      mcp_health: params.mcp_health,
      started_at: now,
      completed_at: now
    });

    // Update skill confidence in skills table
    this.updateSkillConfidenceStmt.run(updatedConfidence, params.skill_id);

    return {
      validation_id: validationId,
      skill_id: params.skill_id,
      run_id: params.run_id,
      correlation_id: params.correlation_id,
      circle: params.circle,
      ceremony: params.ceremony,
      mode: params.mode,
      initial_confidence: initialConfidence,
      updated_confidence: updatedConfidence,
      confidence_delta: confidenceDelta,
      outcome: params.outcome,
      completion_pct: params.completion_pct,
      duration_ms: params.duration_ms,
      mode_score: params.mode_score,
      reward: params.reward,
      wsjf_score: params.wsjf_score,
      skill_context: params.skill_context,
      execution_context: params.execution_context,
      mcp_health: params.mcp_health,
      started_at: now,
      completed_at: now
    };
  }

  /**
   * Create iteration handoff report
   */
  createIterationHandoff(
    fromRunId: string,
    toRunId: string,
    iterationNumber: number,
    skillsSummary: string,
    recommendations?: string,
    handoffData?: string
  ): IterationHandoff {
    const now = Date.now();
    const handoffId = uuidv4();

    // Calculate confidence summary from recent validations
    const summary = this.db.prepare(`
      SELECT 
        COUNT(*) as total_validations,
        AVG(updated_confidence) as avg_confidence,
        MIN(updated_confidence) as min_confidence,
        MAX(updated_confidence) as max_confidence,
        SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN outcome = 'failure' THEN 1 ELSE 0 END) as failure_count,
        SUM(CASE WHEN outcome = 'partial' THEN 1 ELSE 0 END) as partial_count
      FROM skill_validations
      WHERE run_id = ?
    `).get(fromRunId) as {
      total_validations: number;
      avg_confidence: number;
      min_confidence: number;
      max_confidence: number;
      success_count: number;
      failure_count: number;
      partial_count: number;
    };

    this.insertHandoffStmt.run({
      handoff_id: handoffId,
      from_run_id: fromRunId,
      to_run_id: toRunId,
      iteration_number: iterationNumber,
      timestamp: now,
      skills_summary: skillsSummary,
      avg_confidence: summary.avg_confidence || 0,
      min_confidence: summary.min_confidence || 0,
      max_confidence: summary.max_confidence || 0,
      total_validations: summary.total_validations || 0,
      success_count: summary.success_count || 0,
      failure_count: summary.failure_count || 0,
      partial_count: summary.partial_count || 0,
      recommendations,
      handoff_data: handoffData
    });

    return {
      handoff_id: handoffId,
      from_run_id: fromRunId,
      to_run_id: toRunId,
      iteration_number: iterationNumber,
      timestamp: now,
      skills_summary: skillsSummary,
      avg_confidence: summary.avg_confidence || 0,
      min_confidence: summary.min_confidence || 0,
      max_confidence: summary.max_confidence || 0,
      total_validations: summary.total_validations || 0,
      success_count: summary.success_count || 0,
      failure_count: summary.failure_count || 0,
      partial_count: summary.partial_count || 0,
      recommendations,
      handoff_data: handoffData
    };
  }

  /**
   * Get confidence summary for a skill
   */
  getSkillConfidenceSummary(skillId: string): ConfidenceSummary | null {
    const row = this.db.prepare(`
      SELECT * FROM skill_confidence_summary WHERE skill_id = ?
    `).get(skillId) as ConfidenceSummary | undefined;

    return row || null;
  }

  /**
   * Get circle performance summary
   */
  getCirclePerformance(circle: string): CirclePerformance | null {
    const row = this.db.prepare(`
      SELECT * FROM circle_skill_performance WHERE circle = ?
    `).get(circle) as CirclePerformance | undefined;

    return row || null;
  }

  /**
   * Get recent skill validations
   */
  getRecentValidations(limit: number = 20): SkillValidation[] {
    return this.db.prepare(`
      SELECT * FROM recent_skill_validations LIMIT ?
    `).all(limit) as SkillValidation[];
  }

  /**
   * Get skills needing attention (low confidence or high failure rate)
   */
  getSkillsNeedingAttention(threshold: number = 0.5): Array<{
    skill_id: string;
    avg_confidence: number;
    failure_rate: number;
  }> {
    return this.db.prepare(`
      SELECT 
        skill_id,
        avg_confidence,
        CAST(failure_count AS REAL) / total_validations as failure_rate
      FROM skill_confidence_summary
      WHERE avg_confidence < ? OR (CAST(failure_count AS REAL) / total_validations) > 0.3
      ORDER BY avg_confidence ASC
    `).all(threshold) as Array<{
      skill_id: string;
      avg_confidence: number;
      failure_rate: number;
    }>;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generate a correlation ID for tracking related operations
 */
export function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a run ID for tracking execution runs
 */
export function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse skill context from JSON string
 */
export function parseSkillContext(context: string): SkillContext | null {
  try {
    return JSON.parse(context);
  } catch {
    return null;
  }
}

/**
 * Stringify skill context to JSON
 */
export function stringifySkillContext(context: SkillContext): string {
  return JSON.stringify(context);
}
