/**
 * P1.2: Skill Confidence Update Mechanism
 * 
 * Replaces hardcoded 0.5 confidence values with dynamic scoring based on execution outcomes.
 * Updates skill confidence scores to reflect actual performance metrics.
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../agentdb.db');

export interface SkillValidationInput {
  skillId: number;
  validationType: 'execution' | 'test' | 'peer_review' | 'regression' | 'benchmark';
  outcome: 'success' | 'failure' | 'partial' | 'skipped';
  durationMs?: number;
  episodeId?: number;
  validator?: string;
  inputContext?: Record<string, any>;
  outputResult?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ConfidenceUpdateResult {
  skillId: number;
  skillName: string;
  previousConfidence: number;
  newConfidence: number;
  delta: number;
  validationId: number;
}

// Confidence delta calculation based on outcome
const CONFIDENCE_DELTAS = {
  execution: { success: 0.05, failure: -0.10, partial: 0.02, skipped: 0.0 },
  test: { success: 0.08, failure: -0.15, partial: 0.03, skipped: 0.0 },
  peer_review: { success: 0.10, failure: -0.12, partial: 0.04, skipped: 0.0 },
  regression: { success: 0.03, failure: -0.20, partial: 0.01, skipped: 0.0 },
  benchmark: { success: 0.07, failure: -0.08, partial: 0.03, skipped: 0.0 }
};

export class SkillConfidenceUpdater {
  private db: Database.Database;

  constructor(dbPath?: string) {
    this.db = new Database(dbPath || DB_PATH);
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Record a skill validation and update confidence accordingly
   */
  recordValidation(input: SkillValidationInput): ConfidenceUpdateResult {
    // Get current skill state
    const skill = this.db.prepare('SELECT id, name, confidence FROM skills WHERE id = ?').get(input.skillId) as any;
    if (!skill) throw new Error(`Skill ${input.skillId} not found`);

    // Calculate confidence delta
    const delta = CONFIDENCE_DELTAS[input.validationType][input.outcome];
    const newConfidence = Math.max(0.0, Math.min(1.0, skill.confidence + delta));

    // Insert validation record (trigger will update confidence)
    const insertStmt = this.db.prepare(`
      INSERT INTO skill_validations (skill_id, validation_type, outcome, confidence_delta, duration_ms, episode_id, validator, input_context, output_result, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertStmt.run(
      input.skillId, input.validationType, input.outcome, delta,
      input.durationMs || null, input.episodeId || null, input.validator || 'system',
      JSON.stringify(input.inputContext || {}), JSON.stringify(input.outputResult || {}),
      JSON.stringify(input.metadata || {})
    );

    return {
      skillId: input.skillId,
      skillName: skill.name,
      previousConfidence: skill.confidence,
      newConfidence,
      delta,
      validationId: Number(result.lastInsertRowid)
    };
  }

  /**
   * Recalculate skill confidence from historical performance data
   */
  recalculateFromHistory(skillId: number): ConfidenceUpdateResult {
    const skill = this.db.prepare('SELECT id, name, confidence, success_rate, uses FROM skills WHERE id = ?').get(skillId) as any;
    if (!skill) throw new Error(`Skill ${skillId} not found`);

    // Get validation history
    const validations = this.db.prepare(`
      SELECT outcome, COUNT(*) as count FROM skill_validations WHERE skill_id = ? GROUP BY outcome
    `).all(skillId) as any[];

    let successCount = 0, failureCount = 0, totalCount = 0;
    for (const v of validations) {
      totalCount += v.count;
      if (v.outcome === 'success') successCount = v.count;
      if (v.outcome === 'failure') failureCount = v.count;
    }

    // Calculate new confidence: weighted average of success_rate and validation history
    const validationSuccessRate = totalCount > 0 ? successCount / totalCount : 0.5;
    const historicalWeight = Math.min(skill.uses / 100, 0.7); // Max 70% weight to historical
    const newConfidence = (skill.success_rate * historicalWeight) + (validationSuccessRate * (1 - historicalWeight));

    // Update skill confidence directly
    this.db.prepare('UPDATE skills SET confidence = ?, updated_at = strftime("%s", "now") WHERE id = ?')
      .run(Math.max(0.0, Math.min(1.0, newConfidence)), skillId);

    return {
      skillId, skillName: skill.name, previousConfidence: skill.confidence,
      newConfidence: Math.max(0.0, Math.min(1.0, newConfidence)),
      delta: newConfidence - skill.confidence, validationId: -1
    };
  }

  /**
   * Batch recalculate all skill confidences from history
   */
  recalculateAllFromHistory(): ConfidenceUpdateResult[] {
    const skills = this.db.prepare('SELECT id FROM skills').all() as any[];
    return skills.map(s => this.recalculateFromHistory(s.id));
  }

  /**
   * Get skill validation history
   */
  getValidationHistory(skillId: number, limit: number = 50): any[] {
    return this.db.prepare(`
      SELECT * FROM skill_validations WHERE skill_id = ? ORDER BY validated_at DESC LIMIT ?
    `).all(skillId, limit) as any[];
  }

  close(): void {
    this.db.close();
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const updater = new SkillConfidenceUpdater();
  console.log('🔄 Recalculating all skill confidences from history...');
  const results = updater.recalculateAllFromHistory();
  results.forEach(r => console.log(`   ${r.skillName}: ${(r.previousConfidence * 100).toFixed(1)}% → ${(r.newConfidence * 100).toFixed(1)}%`));
  console.log(`✅ Updated ${results.length} skills`);
  updater.close();
}

