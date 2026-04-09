/**
 * Skills Manager - Agent Skill Management System
 *
 * Provides skill persistence, loading, and confidence tracking for agents.
 * Skills are stored in AgentDB and exported to JSON for backup/restore.
 */
import type { Skill, Circle, SkillValidation, SkillStatistics } from './types.js';
/**
 * Skills database manager
 */
export declare class SkillsManager {
    private db;
    private skillsCache;
    private initialized;
    constructor(dbPath?: string);
    /**
     * Initialize skills tables in database
     */
    private initializeDatabase;
    /**
     * Load all skills from database into cache
     */
    loadSkills(): Skill[];
    /**
     * Get skill by ID
     */
    getSkill(id: string): Skill | undefined;
    /**
     * Get skills by circle
     */
    getSkillsByCircle(circle: Circle): Skill[];
    /**
     * Get top skills by confidence
     */
    getTopSkills(limit?: number): Skill[];
    /**
     * Create or update a skill
     */
    upsertSkill(skill: Omit<Skill, 'id'>): Skill;
    /**
     * Record skill usage outcome and update confidence
     */
    recordSkillOutcome(skillId: string, outcome: 'success' | 'failure' | 'partial', iterationId?: string): void;
    /**
     * Get skill validations for feedback loop
     */
    getSkillValidations(skillId?: string, limit?: number): SkillValidation[];
    /**
     * Export skills to JSON for backup/restore
     */
    exportSkills(): string;
    /**
     * Import skills from JSON
     */
    importSkills(jsonData: string): {
        imported: number;
        errors: string[];
    };
    /**
     * Get mode scores based on skill confidence
     * Returns scores for each circle based on their top skills
     */
    getModeScores(): Record<Circle, number>;
    /**
     * Get skill statistics
     */
    getStatistics(): SkillStatistics;
    /**
     * Close database connection
     */
    close(): void;
}
/**
 * Get or create skills manager singleton
 */
export declare function getSkillsManager(): SkillsManager;
/**
 * Initialize skills at iteration start (Run 2)
 */
export declare function initializeSkills(): SkillsManager;
/**
 * Setup initial skills for Run 1
 */
export declare function setupRun1Skills(): void;
/**
 * Execute mode with skill-based confidence scoring
 * Returns the confidence score for the specified mode based on skill performance
 */
export declare function execute_mode(mode: Circle): number;
/**
 * Get skill confidence for mode scoring
 */
export declare function getSkillConfidenceForMode(mode: Circle): number;
//# sourceMappingURL=skills-manager.d.ts.map