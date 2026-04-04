#!/usr/bin/env tsx
/**
 * P1 Feedback Loop Implementation
 * - skill_validations table + tracking
 * - Confidence updates based on outcomes
 * - Iteration handoff reporting
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface SkillValidation {
  skillId: string;
  skillName: string;
  circle: string;
  validationResult: 'success' | 'failure' | 'partial';
  confidenceBefore: number;
  confidenceAfter: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface IterationHandoff {
  iterationId: string;
  fromIteration: number;
  toIteration: number;
  skillsTransferred: number;
  confidenceChanges: Array<{
    skillId: string;
    oldConfidence: number;
    newConfidence: number;
    change: number;
  }>;
  timestamp: number;
}

export class P1FeedbackLoop {
  private agentdbPath: string;
  private projectRoot: string;
  
  constructor(agentdbPath?: string, projectRoot?: string) {
    this.agentdbPath = agentdbPath || process.env.AGENTDB_PATH || path.join(process.cwd(), 'agentdb.db');
    this.projectRoot = projectRoot || process.cwd();
  }
  
  /**
   * P1.1: Create skill_validations table
   */
  async createSkillValidationsTable(): Promise<void> {
    console.log('📊 Creating skill_validations table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS skill_validations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        skill_id TEXT NOT NULL,
        skill_name TEXT NOT NULL,
        circle TEXT NOT NULL,
        validation_result TEXT NOT NULL CHECK(validation_result IN ('success', 'failure', 'partial')),
        confidence_before REAL NOT NULL,
        confidence_after REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        metadata TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_skill_validations_skill_id ON skill_validations(skill_id);
      CREATE INDEX IF NOT EXISTS idx_skill_validations_circle ON skill_validations(circle);
      CREATE INDEX IF NOT EXISTS idx_skill_validations_timestamp ON skill_validations(timestamp);
    `;
    
    try {
      execSync(`sqlite3 "${this.agentdbPath}" "${createTableSQL}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      console.log('✓ skill_validations table created');
    } catch (error: any) {
      console.error('✗ Failed to create table:', error.message);
      throw error;
    }
  }
  
  /**
   * P1.1: Record skill validation
   */
  async recordValidation(validation: SkillValidation): Promise<void> {
    const insertSQL = `
      INSERT INTO skill_validations (
        skill_id, skill_name, circle, validation_result,
        confidence_before, confidence_after, timestamp, metadata
      ) VALUES (
        '${validation.skillId}',
        '${validation.skillName.replace(/'/g, "''")}',
        '${validation.circle}',
        '${validation.validationResult}',
        ${validation.confidenceBefore},
        ${validation.confidenceAfter},
        ${validation.timestamp},
        '${JSON.stringify(validation.metadata || {}).replace(/'/g, "''")}'
      );
    `;
    
    try {
      execSync(`sqlite3 "${this.agentdbPath}" "${insertSQL}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
    } catch (error: any) {
      console.error('✗ Failed to record validation:', error.message);
    }
  }
  
  /**
   * P1.2: Update confidence based on outcomes
   */
  async updateConfidenceFromOutcomes(skillId: string, outcome: 'success' | 'failure' | 'partial'): Promise<number> {
    // Get current confidence
    const currentConfidenceQuery = `
      SELECT confidence FROM skills WHERE id = '${skillId}';
    `;
    
    let currentConfidence = 50;
    try {
      const result = execSync(`sqlite3 "${this.agentdbPath}" "${currentConfidenceQuery}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim();
      currentConfidence = Number(result) || 50;
    } catch {
      // Skill may not exist yet
    }
    
    // Calculate new confidence based on outcome
    let newConfidence = currentConfidence;
    const adjustment = 2; // Confidence adjustment per outcome
    
    switch (outcome) {
      case 'success':
        newConfidence = Math.min(100, currentConfidence + adjustment);
        break;
      case 'failure':
        newConfidence = Math.max(0, currentConfidence - adjustment);
        break;
      case 'partial':
        newConfidence = currentConfidence; // No change for partial
        break;
    }
    
    // Update confidence in skills table
    const updateSQL = `
      UPDATE skills SET confidence = ${newConfidence} WHERE id = '${skillId}';
    `;
    
    try {
      execSync(`sqlite3 "${this.agentdbPath}" "${updateSQL}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
    } catch {
      // Skills table may not exist or use different structure
    }
    
    // Record validation
    await this.recordValidation({
      skillId,
      skillName: skillId, // Would need to look up actual name
      circle: 'unknown',
      validationResult: outcome,
      confidenceBefore: currentConfidence,
      confidenceAfter: newConfidence,
      timestamp: Date.now()
    });
    
    return newConfidence;
  }
  
  /**
   * P1.3: Generate iteration handoff report
   */
  async generateHandoffReport(fromIteration: number, toIteration: number): Promise<IterationHandoff> {
    console.log(`📋 Generating handoff report: iteration ${fromIteration} → ${toIteration}`);
    
    // Get skills transferred
    const skillsQuery = `
      SELECT COUNT(*) FROM skills;
    `;
    
    let skillsTransferred = 0;
    try {
      const result = execSync(`sqlite3 "${this.agentdbPath}" "${skillsQuery}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim();
      skillsTransferred = Number(result) || 0;
    } catch {
      // Skills table may not exist
    }
    
    // Get confidence changes from validations
    const confidenceChangesQuery = `
      SELECT 
        skill_id,
        confidence_before as old_confidence,
        confidence_after as new_confidence,
        (confidence_after - confidence_before) as change
      FROM skill_validations
      WHERE timestamp > strftime('%s', 'now', '-1 hour')
      ORDER BY timestamp DESC
      LIMIT 20;
    `;
    
    const confidenceChanges: IterationHandoff['confidenceChanges'] = [];
    try {
      const result = execSync(`sqlite3 "${this.agentdbPath}" "${confidenceChangesQuery}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      const lines = result.trim().split('\n');
      for (const line of lines) {
        const [skillId, oldConf, newConf, change] = line.split('|');
        if (skillId && oldConf && newConf) {
          confidenceChanges.push({
            skillId,
            oldConfidence: Number(oldConf),
            newConfidence: Number(newConf),
            change: Number(change)
          });
        }
      }
    } catch {
      // No validations yet
    }
    
    const handoff: IterationHandoff = {
      iterationId: `iter-${fromIteration}-to-${toIteration}`,
      fromIteration,
      toIteration,
      skillsTransferred,
      confidenceChanges,
      timestamp: Date.now()
    };
    
    // Save report
    const reportPath = path.join(this.projectRoot, `.goalie/handoff-${fromIteration}-${toIteration}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(handoff, null, 2));
    
    console.log(`✓ Handoff report saved to ${reportPath}`);
    console.log(`  Skills transferred: ${skillsTransferred}`);
    console.log(`  Confidence changes: ${confidenceChanges.length}`);
    
    return handoff;
  }
  
  /**
   * Initialize P1 feedback loop
   */
  async initialize(): Promise<void> {
    await this.createSkillValidationsTable();
    console.log('✓ P1 feedback loop initialized');
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const feedbackLoop = new P1FeedbackLoop();
  const command = process.argv[2] || 'init';
  
  switch (command) {
    case 'init':
      feedbackLoop.initialize();
      break;
    case 'validate':
      const skillId = process.argv[3] || 'test-skill';
      const outcome = (process.argv[4] || 'success') as 'success' | 'failure' | 'partial';
      feedbackLoop.updateConfidenceFromOutcomes(skillId, outcome);
      break;
    case 'handoff':
      const from = Number(process.argv[3]) || 1;
      const to = Number(process.argv[4]) || 2;
      feedbackLoop.generateHandoffReport(from, to);
      break;
    default:
      console.log('Usage: p1-feedback-loop.ts [init|validate|handoff]');
  }
}
