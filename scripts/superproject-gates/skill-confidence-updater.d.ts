/**
 * P1.2: Skill Confidence Update Mechanism
 *
 * Replaces hardcoded 0.5 confidence values with dynamic scoring based on execution outcomes.
 * Updates skill confidence scores to reflect actual performance metrics.
 */
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
export declare class SkillConfidenceUpdater {
    private db;
    constructor(dbPath?: string);
    /**
     * Record a skill validation and update confidence accordingly
     */
    recordValidation(input: SkillValidationInput): ConfidenceUpdateResult;
    /**
     * Recalculate skill confidence from historical performance data
     */
    recalculateFromHistory(skillId: number): ConfidenceUpdateResult;
    /**
     * Batch recalculate all skill confidences from history
     */
    recalculateAllFromHistory(): ConfidenceUpdateResult[];
    /**
     * Get skill validation history
     */
    getValidationHistory(skillId: number, limit?: number): any[];
    close(): void;
}
//# sourceMappingURL=skill-confidence-updater.d.ts.map