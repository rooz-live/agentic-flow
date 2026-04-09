/**
 * AISP Validator - Validates AISP documents for well-formedness and ambiguity
 * 
 * Implements validation rules from AISP v5.1:
 * - Document structure validation (⟦Ω⟧, ⟦Σ⟧, ⟦Γ⟧, ⟦Λ⟧, ⟦Χ⟧?, ⟦Ε⟧)
 * - Ambiguity calculation (target: <0.02)
 * - Quality tier assignment (◊⁺⁺, ◊⁺, ◊, ◊⁻, ⊘)
 */

import {
  AISPDocument,
  AISPValidationResult,
  QualityTier,
  calculateQualityTier,
  calculateAmbiguity
} from './aisp-types';

export class AISPValidator {
  private readonly AMBIGUITY_THRESHOLD = 0.02;
  private readonly MIN_BLOCKS = ['omega', 'sigma', 'gamma', 'lambda', 'epsilon'];
  
  /**
   * Validate an AISP document
   */
  validate(doc: AISPDocument): AISPValidationResult {
    const violations: AISPValidationResult['violations'] = [];
    
    // Check required blocks
    for (const block of this.MIN_BLOCKS) {
      if (!doc.blocks[block as keyof typeof doc.blocks]) {
        violations.push({
          block: 'structure',
          rule: 'required-blocks',
          message: `Missing required block: ⟦${block.toUpperCase()}⟧`,
          severity: 'error'
        });
      }
    }
    
    // Validate header
    if (!doc.header.version || !doc.header.name || !doc.header.date) {
      violations.push({
        block: 'header',
        rule: 'header-format',
        message: 'Header must include version, name, and date',
        severity: 'error'
      });
    }
    
    // Calculate density from evidence
    const density = doc.blocks.epsilon?.density ?? 0;
    const tier = calculateQualityTier(density);
    
    // Validate ambiguity threshold
    const ambiguity = doc.blocks.epsilon?.ambiguity ?? 1.0;
    if (ambiguity >= this.AMBIGUITY_THRESHOLD) {
      violations.push({
        block: 'epsilon',
        rule: 'ambiguity-threshold',
        message: `Ambiguity ${ambiguity.toFixed(3)} exceeds threshold ${this.AMBIGUITY_THRESHOLD}`,
        severity: 'error'
      });
    }
    
    // Validate proofs in evidence
    if (!doc.blocks.epsilon?.proofs?.length) {
      violations.push({
        block: 'epsilon',
        rule: 'proof-required',
        message: 'Evidence block must include at least one proof claim',
        severity: 'warning'
      });
    }
    
    // Validate rules structure
    if (doc.blocks.gamma?.inference?.length === 0) {
      violations.push({
        block: 'gamma',
        rule: 'inference-rules',
        message: 'Rules block should contain inference rules',
        severity: 'warning'
      });
    }
    
    return {
      isValid: violations.filter(v => v.severity === 'error').length === 0,
      tier,
      density,
      ambiguity,
      violations
    };
  }
  
  /**
   * Quick check if document meets minimum quality threshold
   */
  meetsQualityThreshold(doc: AISPDocument, minTier: QualityTier = 'silver'): boolean {
    const result = this.validate(doc);
    const tierOrder: QualityTier[] = ['rejected', 'bronze', 'silver', 'gold', 'platinum'];
    return tierOrder.indexOf(result.tier) >= tierOrder.indexOf(minTier);
  }
  
  /**
   * Calculate document density (ratio of symbolic tokens to total tokens)
   */
  calculateDensity(tokens: string[]): number {
    const SYMBOLIC_PATTERNS = /^[≜≔≡⇒↔∀∃∈⊆∧∨¬⊤⊥λ∘→↦⟨⟩⟦⟧𝒫∅◊]+$/;
    const symbolicCount = tokens.filter(t => SYMBOLIC_PATTERNS.test(t)).length;
    const nonWhitespaceTokens = tokens.filter(t => t.trim().length > 0);
    if (nonWhitespaceTokens.length === 0) return 0;
    return symbolicCount / nonWhitespaceTokens.length;
  }
  
  /**
   * Validate tri-vector signal dimensions
   */
  validateTriVector(signal: AISPDocument['signal']): boolean {
    if (!signal) return true; // Optional
    const D_H = 768, D_L = 512, D_S = 256;
    return (
      signal.V_H.length === D_H &&
      signal.V_L.length === D_L &&
      signal.V_S.length === D_S
    );
  }
}

// Export singleton instance
export const aispValidator = new AISPValidator();

