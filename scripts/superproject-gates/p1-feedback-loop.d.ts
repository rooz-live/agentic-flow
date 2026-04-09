#!/usr/bin/env tsx
/**
 * P1 Feedback Loop Implementation
 * - skill_validations table + tracking
 * - Confidence updates based on outcomes
 * - Iteration handoff reporting
 */
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
export declare class P1FeedbackLoop {
    private agentdbPath;
    private projectRoot;
    constructor(agentdbPath?: string, projectRoot?: string);
    /**
     * P1.1: Create skill_validations table
     */
    createSkillValidationsTable(): Promise<void>;
    /**
     * P1.1: Record skill validation
     */
    recordValidation(validation: SkillValidation): Promise<void>;
    /**
     * P1.2: Update confidence based on outcomes
     */
    updateConfidenceFromOutcomes(skillId: string, outcome: 'success' | 'failure' | 'partial'): Promise<number>;
    /**
     * P1.3: Generate iteration handoff report
     */
    generateHandoffReport(fromIteration: number, toIteration: number): Promise<IterationHandoff>;
    /**
     * Initialize P1 feedback loop
     */
    initialize(): Promise<void>;
}
//# sourceMappingURL=p1-feedback-loop.d.ts.map