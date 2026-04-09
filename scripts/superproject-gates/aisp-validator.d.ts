/**
 * AISP Validator - Validates AISP documents for well-formedness and ambiguity
 *
 * Implements validation rules from AISP v5.1:
 * - Document structure validation (⟦Ω⟧, ⟦Σ⟧, ⟦Γ⟧, ⟦Λ⟧, ⟦Χ⟧?, ⟦Ε⟧)
 * - Ambiguity calculation (target: <0.02)
 * - Quality tier assignment (◊⁺⁺, ◊⁺, ◊, ◊⁻, ⊘)
 */
import { AISPDocument, AISPValidationResult, QualityTier } from './aisp-types';
export declare class AISPValidator {
    private readonly AMBIGUITY_THRESHOLD;
    private readonly MIN_BLOCKS;
    /**
     * Validate an AISP document
     */
    validate(doc: AISPDocument): AISPValidationResult;
    /**
     * Quick check if document meets minimum quality threshold
     */
    meetsQualityThreshold(doc: AISPDocument, minTier?: QualityTier): boolean;
    /**
     * Calculate document density (ratio of symbolic tokens to total tokens)
     */
    calculateDensity(tokens: string[]): number;
    /**
     * Validate tri-vector signal dimensions
     */
    validateTriVector(signal: AISPDocument['signal']): boolean;
}
export declare const aispValidator: AISPValidator;
//# sourceMappingURL=aisp-validator.d.ts.map