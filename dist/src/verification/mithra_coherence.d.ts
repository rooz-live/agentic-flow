/**
 * Mithra Coherence Validation System
 *
 * Implements three-way alignment checking between:
 * - Intention (PR description, commit messages)
 * - Documentation (README, comments, docstrings)
 * - Implementation (actual code changes)
 *
 * Named after Mithra - the binding coherence between thought, word, and deed.
 */
export interface CoherenceCheckResult {
    score: number;
    passed: boolean;
    alignment: {
        intentionToCode: number;
        intentionToDocs: number;
        codeToDocumentation: number;
    };
    misalignments: MisalignmentDetail[];
    recommendations: string[];
}
export interface MisalignmentDetail {
    type: 'intention-code' | 'intention-docs' | 'code-docs';
    severity: 'low' | 'medium' | 'high';
    description: string;
    evidence: {
        claimed: string;
        actual: string;
    };
}
export interface PRContext {
    description: string;
    commitMessages: string[];
    codeChanges: CodeChange[];
    documentationChanges: string[];
}
export interface CodeChange {
    file: string;
    additions: string[];
    deletions: string[];
}
/**
 * Measure coherence between PR description, code changes, and commit messages
 */
export declare function measureCoherence(context: PRContext): CoherenceCheckResult;
/**
 * Request human review if coherence is below threshold
 */
export declare function requestCoherenceReview(context: PRContext): {
    needsReview: boolean;
    message: string;
};
//# sourceMappingURL=mithra_coherence.d.ts.map