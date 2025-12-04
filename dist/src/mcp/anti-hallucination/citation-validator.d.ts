/**
 * Citation Validation
 * Validates medical citations against trusted sources
 */
import type { Citation, ValidationResult } from '../types';
export declare class CitationValidator {
    private readonly trustedSources;
    private readonly minimumYear;
    constructor();
    /**
     * Validate a single citation
     */
    validateCitation(citation: Citation): ValidationResult;
    /**
     * Validate multiple citations for consistency
     */
    validateCitations(citations: Citation[]): ValidationResult;
    /**
     * Verify citation against source (simulated)
     */
    verifyCitationSource(citation: Citation): Promise<boolean>;
    /**
     * Check if source is trusted
     */
    private isTrustedSource;
    /**
     * Calculate citation confidence
     */
    private calculateCitationConfidence;
    /**
     * Calculate overall confidence across citations
     */
    private calculateOverallConfidence;
    /**
     * Generate recommendations based on issues
     */
    private generateRecommendations;
}
//# sourceMappingURL=citation-validator.d.ts.map