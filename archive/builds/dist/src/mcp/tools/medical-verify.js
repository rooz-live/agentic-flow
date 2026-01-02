/**
 * Medical Verification Tool
 * Verifies medical analysis quality and accuracy
 */
import { ConfidenceMonitor } from '../anti-hallucination/confidence-monitor';
import { CitationValidator } from '../anti-hallucination/citation-validator';
export class MedicalVerifyTool {
    confidenceMonitor;
    citationValidator;
    constructor() {
        this.confidenceMonitor = new ConfidenceMonitor(0.85, 0.7);
        this.citationValidator = new CitationValidator();
    }
    /**
     * Verify medical analysis
     */
    async execute(args) {
        try {
            const strictMode = args.strictMode ?? true;
            // Perform comprehensive verification
            const verification = await this.verifyAnalysis(args.analysis, strictMode);
            const response = {
                analysisId: args.analysisId,
                verification,
                passed: verification.overallPass,
                confidence: verification.verificationConfidence,
                timestamp: Date.now(),
            };
            return {
                content: [
                    {
                        type: 'json',
                        json: response,
                    },
                    {
                        type: 'text',
                        text: this.formatVerificationReport(response),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Verification failed: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }
    /**
     * Verify analysis comprehensively
     */
    async verifyAnalysis(analysis, strictMode) {
        // 1. Confidence verification
        const confidenceMetrics = this.confidenceMonitor.monitorConfidence(analysis);
        const confidenceIssues = this.confidenceMonitor.validateConfidence(confidenceMetrics);
        const confidencePass = confidenceIssues.every(i => i.severity !== 'critical');
        // 2. Citation verification
        const citationValidation = this.citationValidator.validateCitations(analysis.citations);
        const citationPass = citationValidation.isValid || !strictMode;
        // 3. Consistency checks
        const consistencyChecks = this.performConsistencyChecks(analysis);
        const consistencyPass = consistencyChecks.every(c => c.passed);
        // 4. Completeness checks
        const completenessChecks = this.performCompletenessChecks(analysis);
        const completenessPass = completenessChecks.every(c => c.passed);
        // 5. Safety checks
        const safetyChecks = this.performSafetyChecks(analysis);
        const safetyPass = safetyChecks.every(c => c.passed || c.level !== 'critical');
        // Overall pass/fail
        const overallPass = strictMode
            ? confidencePass && citationPass && consistencyPass && completenessPass && safetyPass
            : confidencePass && consistencyPass && safetyPass;
        // Verification confidence
        const verificationConfidence = this.calculateVerificationConfidence({
            confidencePass,
            citationPass,
            consistencyPass,
            completenessPass,
            safetyPass,
        });
        return {
            overallPass,
            verificationConfidence,
            checks: {
                confidence: {
                    passed: confidencePass,
                    metrics: confidenceMetrics,
                    issues: confidenceIssues,
                },
                citations: {
                    passed: citationPass,
                    validation: citationValidation,
                },
                consistency: {
                    passed: consistencyPass,
                    checks: consistencyChecks,
                },
                completeness: {
                    passed: completenessPass,
                    checks: completenessChecks,
                },
                safety: {
                    passed: safetyPass,
                    checks: safetyChecks,
                },
            },
            recommendations: this.generateVerificationRecommendations({
                confidencePass,
                citationPass,
                consistencyPass,
                completenessPass,
                safetyPass,
            }),
        };
    }
    /**
     * Perform consistency checks
     */
    performConsistencyChecks(analysis) {
        const checks = [];
        // Check severity-urgency alignment
        const maxSeverity = this.getMaxSeverity(analysis.conditions);
        const severityUrgencyAligned = this.checkSeverityUrgencyAlignment(maxSeverity, analysis.urgencyLevel);
        checks.push({
            name: 'Severity-Urgency Alignment',
            passed: severityUrgencyAligned,
            message: severityUrgencyAligned
                ? 'Urgency level matches condition severity'
                : 'Urgency level inconsistent with condition severity',
        });
        // Check condition-symptom consistency
        const symptomsConsistent = analysis.conditions.every(c => c.symptoms.length > 0);
        checks.push({
            name: 'Condition-Symptom Consistency',
            passed: symptomsConsistent,
            message: symptomsConsistent
                ? 'All conditions have associated symptoms'
                : 'Some conditions lack symptom mappings',
        });
        // Check recommendation-condition alignment
        const recommendationsAligned = analysis.recommendations.length > 0;
        checks.push({
            name: 'Recommendation Presence',
            passed: recommendationsAligned,
            message: recommendationsAligned
                ? 'Recommendations provided'
                : 'No recommendations provided',
        });
        return checks;
    }
    /**
     * Perform completeness checks
     */
    performCompletenessChecks(analysis) {
        const checks = [];
        // Check for ICD-10 codes
        const hasICD10 = analysis.conditions.some(c => c.icd10Code);
        checks.push({
            name: 'ICD-10 Coding',
            passed: hasICD10,
            message: hasICD10
                ? 'ICD-10 codes provided'
                : 'Missing ICD-10 codes for billing/documentation',
        });
        // Check for citations
        const hasCitations = analysis.citations.length >= 2;
        checks.push({
            name: 'Citation Count',
            passed: hasCitations,
            message: hasCitations
                ? `${analysis.citations.length} citations provided`
                : 'Insufficient citations (minimum 2 required)',
        });
        // Check for differential diagnoses
        const hasDifferentials = analysis.conditions.some(c => c.differential && c.differential.length > 0);
        checks.push({
            name: 'Differential Diagnoses',
            passed: hasDifferentials,
            message: hasDifferentials
                ? 'Differential diagnoses considered'
                : 'No differential diagnoses provided',
        });
        return checks;
    }
    /**
     * Perform safety checks
     */
    performSafetyChecks(analysis) {
        const checks = [];
        // Check for emergency conditions without emergency urgency
        const hasCritical = analysis.conditions.some(c => c.severity === 'critical');
        const isEmergency = analysis.urgencyLevel === 'emergency';
        checks.push({
            name: 'Emergency Protocol',
            passed: !hasCritical || isEmergency,
            level: 'critical',
            message: hasCritical && !isEmergency
                ? 'Critical condition without emergency urgency - safety concern'
                : 'Emergency protocols appropriate',
        });
        // Check for low confidence with high severity
        const lowConfHighSev = analysis.conditions.some(c => c.severity === 'severe' || c.severity === 'critical' && c.confidence < 0.7);
        checks.push({
            name: 'Confidence-Severity Safety',
            passed: !lowConfHighSev,
            level: 'warning',
            message: lowConfHighSev
                ? 'High severity condition with low confidence - requires verification'
                : 'Confidence appropriate for severity levels',
        });
        // Check provider review requirements
        const requiresReview = analysis.requiresProviderReview;
        const shouldRequireReview = hasCritical || analysis.urgencyLevel !== 'routine';
        checks.push({
            name: 'Provider Review Requirement',
            passed: !shouldRequireReview || requiresReview,
            level: 'critical',
            message: shouldRequireReview && !requiresReview
                ? 'Provider review required but not flagged'
                : 'Provider review requirements appropriate',
        });
        return checks;
    }
    /**
     * Calculate verification confidence
     */
    calculateVerificationConfidence(results) {
        const passCount = Object.values(results).filter(Boolean).length;
        const totalChecks = Object.keys(results).length;
        return passCount / totalChecks;
    }
    /**
     * Generate recommendations
     */
    generateVerificationRecommendations(results) {
        const recommendations = [];
        if (!results.confidencePass) {
            recommendations.push('Improve confidence through additional data sources');
        }
        if (!results.citationPass) {
            recommendations.push('Add or verify citations from trusted medical sources');
        }
        if (!results.consistencyPass) {
            recommendations.push('Review and resolve consistency issues');
        }
        if (!results.completenessPass) {
            recommendations.push('Complete missing information (ICD-10 codes, differentials)');
        }
        if (!results.safetyPass) {
            recommendations.push('Address safety concerns before clinical use');
        }
        if (recommendations.length === 0) {
            recommendations.push('Analysis verified successfully - ready for clinical use');
        }
        return recommendations;
    }
    /**
     * Get maximum severity from conditions
     */
    getMaxSeverity(conditions) {
        const severityOrder = ['mild', 'moderate', 'severe', 'critical'];
        let maxIndex = 0;
        for (const condition of conditions) {
            const index = severityOrder.indexOf(condition.severity);
            if (index > maxIndex)
                maxIndex = index;
        }
        return severityOrder[maxIndex];
    }
    /**
     * Check severity-urgency alignment
     */
    checkSeverityUrgencyAlignment(severity, urgency) {
        const alignments = {
            critical: ['urgent', 'emergency'],
            severe: ['urgent', 'emergency'],
            moderate: ['routine', 'urgent'],
            mild: ['routine'],
        };
        return alignments[severity]?.includes(urgency) ?? false;
    }
    /**
     * Format verification report
     */
    formatVerificationReport(response) {
        let report = '✅ Medical Analysis Verification Report\n\n';
        report += `📋 Analysis ID: ${response.analysisId}\n`;
        report += `⏰ Verified: ${new Date(response.timestamp).toISOString()}\n`;
        report += `📊 Overall Result: ${response.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
        report += `🎯 Verification Confidence: ${(response.confidence * 100).toFixed(1)}%\n\n`;
        report += '📋 Verification Checks:\n\n';
        const checks = response.verification.checks;
        report += `1. Confidence: ${checks.confidence.passed ? '✅' : '❌'}\n`;
        report += `   Issues: ${checks.confidence.issues.length}\n\n`;
        report += `2. Citations: ${checks.citations.passed ? '✅' : '❌'}\n`;
        report += `   Valid: ${checks.citations.validation.isValid}\n\n`;
        report += `3. Consistency: ${checks.consistency.passed ? '✅' : '❌'}\n`;
        report += `   Checks: ${checks.consistency.checks.filter((c) => c.passed).length}/${checks.consistency.checks.length} passed\n\n`;
        report += `4. Completeness: ${checks.completeness.passed ? '✅' : '❌'}\n`;
        report += `   Checks: ${checks.completeness.checks.filter((c) => c.passed).length}/${checks.completeness.checks.length} passed\n\n`;
        report += `5. Safety: ${checks.safety.passed ? '✅' : '❌'}\n`;
        report += `   Checks: ${checks.safety.checks.filter((c) => c.passed).length}/${checks.safety.checks.length} passed\n\n`;
        if (response.verification.recommendations.length > 0) {
            report += '💡 Recommendations:\n';
            for (const rec of response.verification.recommendations) {
                report += `  • ${rec}\n`;
            }
        }
        return report;
    }
}
//# sourceMappingURL=medical-verify.js.map