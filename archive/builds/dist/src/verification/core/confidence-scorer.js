/**
 * Confidence Scoring System
 * Statistical confidence metrics, citation strength, and medical literature validation
 */
export class ConfidenceScorer {
    MIN_CONFIDENCE_THRESHOLD = 0.7;
    CITATION_WEIGHTS = {
        'peer-reviewed': 1.0,
        'clinical-trial': 1.2,
        'meta-analysis': 1.5,
        'expert-opinion': 0.7,
        'guideline': 1.3,
    };
    /**
     * Calculate overall confidence score
     */
    async calculateConfidence(claim, citations, context) {
        const statistical = this.calculateStatisticalConfidence(citations, context);
        const citationStrength = this.calculateCitationStrength(citations);
        const medicalAgreement = this.calculateMedicalAgreement(citations);
        const expertConsensus = this.calculateExpertConsensus(citations);
        const contradictions = await this.detectContradictions(claim, citations);
        const overall = this.calculateOverallScore(statistical, citationStrength, medicalAgreement, expertConsensus, contradictions.length);
        return {
            overall,
            statistical,
            citationStrength,
            medicalAgreement,
            expertConsensus,
            contradictions,
            metadata: this.buildMetadata(citations, context),
        };
    }
    /**
     * Calculate statistical confidence based on sample size and quality
     */
    calculateStatisticalConfidence(citations, context) {
        if (citations.length === 0)
            return 0;
        // Factor in number of high-quality sources
        const qualityScore = citations.reduce((sum, citation) => {
            const evidenceWeight = { A: 1.0, B: 0.8, C: 0.6, D: 0.4 }[citation.evidenceLevel];
            return sum + evidenceWeight;
        }, 0) / citations.length;
        // Factor in recency (newer studies weighted higher)
        const currentYear = new Date().getFullYear();
        const recencyScore = citations.reduce((sum, citation) => {
            const age = currentYear - citation.year;
            const recencyWeight = Math.max(0, 1 - (age / 10)); // Decay over 10 years
            return sum + recencyWeight;
        }, 0) / citations.length;
        // Factor in sample size if provided
        let sampleSizeScore = 0.5; // Default mid-range
        if (context?.sampleSize) {
            sampleSizeScore = Math.min(1, Math.log10(context.sampleSize) / 4);
        }
        return (qualityScore * 0.5 + recencyScore * 0.3 + sampleSizeScore * 0.2);
    }
    /**
     * Calculate citation strength based on quality and impact
     */
    calculateCitationStrength(citations) {
        if (citations.length === 0)
            return 0;
        const totalScore = citations.reduce((sum, citation) => {
            const typeWeight = this.CITATION_WEIGHTS[citation.type];
            // Impact factor contribution (normalize around 10)
            const impactScore = citation.impactFactor
                ? Math.min(1, citation.impactFactor / 10)
                : 0.5;
            // Citation count contribution (log scale)
            const citationScore = Math.min(1, Math.log10(citation.citationCount + 1) / 4);
            return sum + (typeWeight * (impactScore * 0.5 + citationScore * 0.5));
        }, 0);
        return Math.min(1, totalScore / citations.length);
    }
    /**
     * Calculate medical literature agreement level
     */
    calculateMedicalAgreement(citations) {
        if (citations.length < 2)
            return 0.5; // Insufficient data
        // Count citations by evidence level
        const evidenceLevels = citations.reduce((acc, citation) => {
            acc[citation.evidenceLevel] = (acc[citation.evidenceLevel] || 0) + 1;
            return acc;
        }, {});
        // High agreement if most are Level A or B
        const highQuality = (evidenceLevels['A'] || 0) + (evidenceLevels['B'] || 0);
        const agreementRatio = highQuality / citations.length;
        return agreementRatio;
    }
    /**
     * Calculate expert consensus level
     */
    calculateExpertConsensus(citations) {
        // Guidelines and meta-analyses indicate strong consensus
        const consensusSources = citations.filter(c => c.type === 'guideline' || c.type === 'meta-analysis');
        if (citations.length === 0)
            return 0;
        const consensusRatio = consensusSources.length / citations.length;
        // Weight by evidence quality
        const qualityWeight = consensusSources.reduce((sum, citation) => {
            return sum + { A: 1.0, B: 0.8, C: 0.6, D: 0.4 }[citation.evidenceLevel];
        }, 0) / (consensusSources.length || 1);
        return consensusRatio * qualityWeight;
    }
    /**
     * Detect contradictions in citations and claims
     */
    async detectContradictions(claim, citations) {
        const contradictions = [];
        // Check for conflicting evidence levels
        const hasHighQuality = citations.some(c => c.evidenceLevel === 'A');
        const hasLowQuality = citations.some(c => c.evidenceLevel === 'D');
        if (hasHighQuality && hasLowQuality) {
            contradictions.push('Mixed evidence quality detected (Level A and D present)');
        }
        // Check for temporal contradictions (old vs new evidence)
        const currentYear = new Date().getFullYear();
        const oldStudies = citations.filter(c => currentYear - c.year > 10);
        const newStudies = citations.filter(c => currentYear - c.year <= 5);
        if (oldStudies.length > 0 && newStudies.length > 0) {
            contradictions.push('Temporal evidence gap detected (10+ year span)');
        }
        // Check for citation type conflicts
        const hasGuideline = citations.some(c => c.type === 'guideline');
        const hasExpertOpinion = citations.some(c => c.type === 'expert-opinion');
        if (hasGuideline && hasExpertOpinion && !citations.some(c => c.type === 'clinical-trial')) {
            contradictions.push('Guidelines present without supporting clinical trials');
        }
        return contradictions;
    }
    /**
     * Calculate overall weighted confidence score
     */
    calculateOverallScore(statistical, citationStrength, medicalAgreement, expertConsensus, contradictionCount) {
        // Weighted average with penalties for contradictions
        const baseScore = (statistical * 0.3 +
            citationStrength * 0.25 +
            medicalAgreement * 0.25 +
            expertConsensus * 0.2);
        // Penalty for contradictions (5% per contradiction)
        const contradictionPenalty = Math.min(0.3, contradictionCount * 0.05);
        return Math.max(0, baseScore - contradictionPenalty);
    }
    /**
     * Build confidence metadata
     */
    buildMetadata(citations, context) {
        const currentYear = new Date().getFullYear();
        return {
            sourceCount: citations.length,
            peerReviewedSources: citations.filter(c => c.type === 'peer-reviewed').length,
            expertOpinions: citations.filter(c => c.type === 'expert-opinion').length,
            conflictingEvidence: citations.filter(c => c.evidenceLevel === 'D').length,
            recencyScore: citations.reduce((sum, c) => {
                return sum + Math.max(0, 1 - ((currentYear - c.year) / 10));
            }, 0) / (citations.length || 1),
            sampleSize: context?.sampleSize,
            confidenceInterval: context?.confidenceInterval,
        };
    }
    /**
     * Check if confidence meets threshold
     */
    isConfident(score) {
        return score.overall >= this.MIN_CONFIDENCE_THRESHOLD;
    }
    /**
     * Get confidence level description
     */
    getConfidenceLevel(score) {
        if (score >= 0.8)
            return 'high';
        if (score >= 0.6)
            return 'medium';
        if (score >= 0.4)
            return 'low';
        return 'very-low';
    }
}
//# sourceMappingURL=confidence-scorer.js.map