/**
 * Skills Manager - Agent Skill Management System
 *
 * Provides skill persistence, loading, and confidence tracking for agents.
 * Skills are stored in AgentDB and exported to JSON for backup/restore.
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import type { Skill, Circle, SkillValidation, SkillStatistics } from './types.js';

/**
 * Skills database manager
 */
export class SkillsManager {
  private db: Database.Database;
  private skillsCache: Map<string, Skill> = new Map();
  private initialized: boolean = false;

  constructor(dbPath: string = 'agentdb.db') {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  /**
   * Initialize skills tables in database
   */
  private initializeDatabase(): void {
    if (this.initialized) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        circle TEXT NOT NULL,
        confidence INTEGER NOT NULL DEFAULT 0,
        last_used TEXT,
        usage_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        tags TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS skill_validations (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        outcome TEXT NOT NULL,
        confidence_before INTEGER NOT NULL,
        confidence_after INTEGER NOT NULL,
        iteration_id TEXT,
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_skills_circle ON skills(circle);
      CREATE INDEX IF NOT EXISTS idx_skills_confidence ON skills(confidence DESC);
      CREATE INDEX IF NOT EXISTS idx_skill_validations_skill ON skill_validations(skill_id);
    `);

    this.initialized = true;
    console.log('[SKILLS] Database initialized');
  }

  /**
   * Load all skills from database into cache
   */
  public loadSkills(): Skill[] {
    const rows = this.db.prepare(`
      SELECT * FROM skills ORDER BY confidence DESC
    `).all() as any[];

    const skills: Skill[] = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      circle: row.circle,
      confidence: row.confidence,
      lastUsed: row.last_used,
      usageCount: row.usage_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      tags: row.tags ? JSON.parse(row.tags) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));

    // Update cache
    this.skillsCache.clear();
    skills.forEach(skill => this.skillsCache.set(skill.id, skill));

    console.log(`[SKILLS] Loaded ${skills.length} skills from database`);
    return skills;
  }

  /**
   * Get skill by ID
   */
  public getSkill(id: string): Skill | undefined {
    if (!this.skillsCache.has(id)) {
      const row = this.db.prepare('SELECT * FROM skills WHERE id = ?').get(id) as any;
      if (row) {
        const skill: Skill = {
          id: row.id,
          name: row.name,
          description: row.description,
          circle: row.circle,
          confidence: row.confidence,
          lastUsed: row.last_used,
          usageCount: row.usage_count,
          successCount: row.success_count,
          failureCount: row.failure_count,
          tags: row.tags ? JSON.parse(row.tags) : [],
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        };
        this.skillsCache.set(id, skill);
      }
    }
    return this.skillsCache.get(id);
  }

  /**
   * Get skills by circle
   */
  public getSkillsByCircle(circle: Circle): Skill[] {
    return Array.from(this.skillsCache.values()).filter(s => s.circle === circle);
  }

  /**
   * Get top skills by confidence
   */
  public getTopSkills(limit: number = 10): Skill[] {
    return Array.from(this.skillsCache.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  /**
   * Create or update a skill
   */
  public upsertSkill(skill: Omit<Skill, 'id'>): Skill {
    const existing = Array.from(this.skillsCache.values()).find(
      s => s.name === skill.name && s.circle === skill.circle
    );

    const skillId = existing?.id || uuidv4();
    const now = new Date().toISOString();

    if (existing) {
      // Update existing skill
      this.db.prepare(`
        UPDATE skills SET
          description = ?,
          confidence = ?,
          last_used = ?,
          usage_count = usage_count + 1,
          updated_at = ?
        WHERE id = ?
      `).run(
        skill.description,
        skill.confidence,
        now,
        now,
        skillId
      );

      const updated: Skill = {
        ...existing,
        description: skill.description,
        confidence: skill.confidence,
        lastUsed: now,
        usageCount: existing.usageCount + 1
      };
      this.skillsCache.set(skillId, updated);
      console.log(`[SKILLS] Updated skill: ${skill.name} (${skill.circle})`);
      return updated;
    } else {
      // Create new skill
      this.db.prepare(`
        INSERT INTO skills (id, name, description, circle, confidence, last_used, usage_count, success_count, failure_count, tags, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        skillId,
        skill.name,
        skill.description,
        skill.circle,
        skill.confidence,
        now,
        skill.usageCount || 0,
        skill.successCount || 0,
        skill.failureCount || 0,
        JSON.stringify(skill.tags || []),
        JSON.stringify(skill.metadata || {})
      );

      const newSkill: Skill = {
        id: skillId,
        name: skill.name,
        description: skill.description,
        circle: skill.circle,
        confidence: skill.confidence,
        lastUsed: now,
        usageCount: skill.usageCount || 0,
        successCount: skill.successCount || 0,
        failureCount: skill.failureCount || 0,
        tags: skill.tags || [],
        metadata: skill.metadata
      };
      this.skillsCache.set(skillId, newSkill);
      console.log(`[SKILLS] Created skill: ${skill.name} (${skill.circle})`);
      return newSkill;
    }
  }

  /**
   * Record skill usage outcome and update confidence
   */
  public recordSkillOutcome(
    skillId: string,
    outcome: 'success' | 'failure' | 'partial',
    iterationId?: string
  ): void {
    const skill = this.getSkill(skillId);
    if (!skill) {
      console.warn(`[SKILLS] Skill not found: ${skillId}`);
      return;
    }

    const confidenceBefore = skill.confidence;
    let confidenceAfter = confidenceBefore;

    // Update confidence based on outcome
    if (outcome === 'success') {
      confidenceAfter = Math.min(100, confidenceBefore + 2);
      this.db.prepare('UPDATE skills SET success_count = success_count + 1 WHERE id = ?').run(skillId);
    } else if (outcome === 'failure') {
      confidenceAfter = Math.max(0, confidenceBefore - 5);
      this.db.prepare('UPDATE skills SET failure_count = failure_count + 1 WHERE id = ?').run(skillId);
    } else {
      // Partial - small increase
      confidenceAfter = Math.min(100, confidenceBefore + 1);
    }

    // Update skill confidence
    this.db.prepare('UPDATE skills SET confidence = ?, last_used = ?, updated_at = ? WHERE id = ?').run(
      confidenceAfter,
      new Date().toISOString(),
      new Date().toISOString(),
      skillId
    );

    // Record validation for P1 feedback loop
    const validationId = uuidv4();
    this.db.prepare(`
      INSERT INTO skill_validations (id, skill_id, timestamp, outcome, confidence_before, confidence_after, iteration_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      validationId,
      skillId,
      new Date().toISOString(),
      outcome,
      confidenceBefore,
      confidenceAfter,
      iterationId
    );

    // Update cache
    skill.confidence = confidenceAfter;
    skill.lastUsed = new Date().toISOString();
    skill.usageCount += 1;
    if (outcome === 'success') skill.successCount += 1;
    if (outcome === 'failure') skill.failureCount += 1;

    console.log(`[SKILLS] Recorded outcome for ${skill.name}: ${outcome} (${confidenceBefore} -> ${confidenceAfter})`);
  }

  /**
   * Get skill validations for feedback loop
   */
  public getSkillValidations(skillId?: string, limit: number = 100): SkillValidation[] {
    let query = 'SELECT * FROM skill_validations';
    const params: any[] = [];

    if (skillId) {
      query += ' WHERE skill_id = ?';
      params.push(skillId);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(row => ({
      id: row.id,
      skillId: row.skill_id,
      timestamp: row.timestamp,
      outcome: row.outcome,
      confidenceBefore: row.confidence_before,
      confidenceAfter: row.confidence_after,
      iterationId: row.iteration_id
    }));
  }

  /**
   * Export skills to JSON for backup/restore
   */
  public exportSkills(): string {
    const skills = this.loadSkills();
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      skills: skills
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import skills from JSON
   */
  public importSkills(jsonData: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(jsonData);

      if (!data.skills || !Array.isArray(data.skills)) {
        throw new Error('Invalid skills export format');
      }

      for (const skill of data.skills) {
        try {
          this.upsertSkill({
            name: skill.name,
            description: skill.description,
            circle: skill.circle,
            confidence: skill.confidence,
            usageCount: skill.usageCount,
            successCount: skill.successCount,
            failureCount: skill.failureCount,
            tags: skill.tags,
            metadata: skill.metadata
          });
          imported++;
        } catch (e) {
          errors.push(`Failed to import skill ${skill.name}: ${e}`);
        }
      }

      console.log(`[SKILLS] Imported ${imported} skills from JSON`);
    } catch (e) {
      errors.push(`Failed to parse JSON: ${e}`);
    }

    return { imported, errors };
  }

  /**
   * Get mode scores based on skill confidence
   * Returns scores for each circle based on their top skills
   */
  public getModeScores(): Record<Circle, number> {
    const scores: Record<string, number> = {};

    for (const circle of ['analyst', 'assessor', 'innovator', 'intuitive', 'orchestrator', 'seeker'] as Circle[]) {
      const circleSkills = this.getSkillsByCircle(circle);
      if (circleSkills.length > 0) {
        // Calculate score as weighted average of top 3 skills
        const topSkills = circleSkills.slice(0, 3);
        const avgConfidence = topSkills.reduce((sum, s) => sum + s.confidence, 0) / topSkills.length;
        scores[circle] = avgConfidence;
      } else {
        scores[circle] = 50; // Default score for circles with no skills
      }
    }

    return scores as Record<Circle, number>;
  }

  /**
   * Get skill statistics
   */
  public getStatistics(): SkillStatistics {
    const skills = Array.from(this.skillsCache.values());
    const byCircle: Record<string, number> = {
      analyst: 0,
      assessor: 0,
      innovator: 0,
      intuitive: 0,
      orchestrator: 0,
      seeker: 0
    };

    for (const skill of skills) {
      byCircle[skill.circle]++;
    }

    const avgConfidence = skills.length > 0
      ? skills.reduce((sum, s) => sum + s.confidence, 0) / skills.length
      : 0;

    return {
      totalSkills: skills.length,
      byCircle: byCircle as Record<Circle, number>,
      averageConfidence: avgConfidence,
      topSkills: this.getTopSkills(5)
    };
  }

  /**
   * Close database connection
   */
  public close(): void {
    this.db.close();
    console.log('[SKILLS] Database connection closed');
  }
}

// Singleton instance
let skillsManagerInstance: SkillsManager | null = null;

/**
 * Get or create skills manager singleton
 */
export function getSkillsManager(): SkillsManager {
  if (!skillsManagerInstance) {
    skillsManagerInstance = new SkillsManager();
    skillsManagerInstance.loadSkills();
  }
  return skillsManagerInstance;
}

/**
 * Initialize skills at iteration start (Run 2)
 */
export function initializeSkills(): SkillsManager {
  const manager = getSkillsManager();
  manager.loadSkills();
  console.log('[SKILLS] Initialized at iteration start (Run 2) - skills loaded from agentdb');
  return manager;
}

/**
 * Setup initial skills for Run 1
 */
export function setupRun1Skills(): void {
  const manager = getSkillsManager();

  // Create sample skills for each circle with varying confidence levels
  const sampleSkills = [
    { name: 'Data Analysis', circle: 'analyst' as Circle, confidence: 76 },
    { name: 'Pattern Recognition', circle: 'analyst' as Circle, confidence: 72 },
    { name: 'Risk Assessment', circle: 'assessor' as Circle, confidence: 68 },
    { name: 'Quality Evaluation', circle: 'assessor' as Circle, confidence: 64 },
    { name: 'Creative Problem Solving', circle: 'innovator' as Circle, confidence: 70 },
    { name: 'Solution Design', circle: 'innovator' as Circle, confidence: 66 },
    { name: 'Intuitive Decision Making', circle: 'intuitive' as Circle, confidence: 74 },
    { name: 'Pattern Synthesis', circle: 'intuitive' as Circle, confidence: 69 },
    { name: 'Process Orchestration', circle: 'orchestrator' as Circle, confidence: 71 },
    { name: 'Workflow Optimization', circle: 'orchestrator' as Circle, confidence: 67 },
    { name: 'Insight Discovery', circle: 'seeker' as Circle, confidence: 73 },
    { name: 'Knowledge Exploration', circle: 'seeker' as Circle, confidence: 65 }
  ];

  for (const skill of sampleSkills) {
    manager.upsertSkill({
      name: skill.name,
      description: `Skill for ${skill.circle} circle`,
      circle: skill.circle,
      confidence: skill.confidence,
      usageCount: Math.floor(Math.random() * 10) + 1,
      successCount: Math.floor(skill.confidence * 0.8),
      failureCount: Math.floor((100 - skill.confidence) * 0.2),
      tags: [skill.circle, 'core-skill']
    });
  }

  // Export to JSON for backup (Run 1)
  const jsonData = manager.exportSkills();
  const exportPath = path.join(process.cwd(), '.goalie/skills-export.json');
  // Ensure directory exists
  const dir = path.dirname(exportPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(exportPath, jsonData);

  console.log(`[SKILLS] Run 1 setup complete - ${sampleSkills.length} skills stored in agentdb and exported to ${exportPath}`);
}

/**
 * Execute mode with skill-based confidence scoring
 * Returns the confidence score for the specified mode based on skill performance
 */
export function execute_mode(mode: Circle): number {
  const manager = getSkillsManager();
  const scores = manager.getModeScores();
  const confidence = scores[mode] || 50;

  console.log(`[SKILLS] Executing mode '${mode}' with confidence: ${confidence}`);
  return confidence;
}

/**
 * Get skill confidence for mode scoring
 */
export function getSkillConfidenceForMode(mode: Circle): number {
  const manager = getSkillsManager();
  const scores = manager.getModeScores();
  return scores[mode] || 50;
}
