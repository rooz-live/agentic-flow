/**
 * Dimensional Coherence Validator
 *
 * Implements Manthra-Yasna-Mithra alignment for ethical calibration.
 *
 * - Manthra: Directed thought-power (not casual thinking)
 * - Yasna: Alignment through practice (not performance)
 * - Mithra: Binding force keeping thought, word, deed together
 *
 * Addresses: "capacity to detect misalignment not degrade faster than
 * conditions that require it"
 */
export interface DimensionalState {
    /** Thought dimension: intention clarity */
    manthra: {
        clarity: number;
        direction: 'constructive' | 'neutral' | 'destructive';
        focusScore: number;
    };
    /** Word dimension: alignment with intention */
    yasna: {
        alignment: number;
        performative: boolean;
        ritualIntegrity: number;
    };
    /** Deed dimension: action coherence */
    mithra: {
        coherence: number;
        driftDetected: boolean;
        bindingStrength: number;
    };
}
export interface CoherenceReport {
    overallScore: number;
    dimensional: DimensionalState;
    misalignments: MisalignmentSignal[];
    collapseRisk: number;
    recommendations: string[];
}
export interface MisalignmentSignal {
    dimension: 'manthra' | 'yasna' | 'mithra';
    severity: 'low' | 'medium' | 'high' | 'critical';
    pattern: string;
    evidence: string;
    remediationPath: string;
}
export declare class DimensionalCoherenceValidator {
    private driftHistory;
    /**
     * Assess dimensional coherence across thought, word, deed.
     */
    assessCoherence(intention: string, documentation: string, implementation: string): CoherenceReport;
    private assessManthra;
    private assessYasna;
    private assessMithra;
    private extractConcepts;
    private detectMisalignments;
    private categoryToDimension;
    private getRemediationPath;
    private calculateCollapseRisk;
    private generateRecommendations;
}
export declare const coherenceValidator: DimensionalCoherenceValidator;
//# sourceMappingURL=dimensional_coherence.d.ts.map