/**
 * Citation Verification Tool
 * Verifies medical citations against trusted sources
 */
import { CitationValidator } from '../anti-hallucination/citation-validator';
export class CitationVerifyTool {
    validator;
    constructor() {
        this.validator = new CitationValidator();
    }
    /**
     * Verify citations
     */
    async execute(args) {
        try {
            const strictMode = args.strictMode ?? true;
            // Validate citations
            const validation = this.validator.validateCitations(args.citations);
            // Verify each citation against source
            const verificationResults = await Promise.all(args.citations.map(async (citation) => ({
                citation,
                individualValidation: this.validator.validateCitation(citation),
                sourceVerified: await this.validator.verifyCitationSource(citation),
            })));
            const response = {
                overallValidation: validation,
                individualResults: verificationResults,
                summary: this.generateSummary(validation, verificationResults),
                passed: validation.isValid || !strictMode,
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
                        text: `❌ Citation verification failed: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }
    /**
     * Generate verification summary
     */
    generateSummary(validation, results) {
        const totalCitations = results.length;
        const verifiedSources = results.filter(r => r.sourceVerified).length;
        const validCitations = results.filter(r => r.individualValidation.isValid).length;
        const avgConfidence = results.reduce((sum, r) => sum + r.individualValidation.confidence, 0) / totalCitations;
        const issuesByType = {
            critical: validation.issues.filter(i => i.severity === 'critical').length,
            error: validation.issues.filter(i => i.severity === 'error').length,
            warning: validation.issues.filter(i => i.severity === 'warning').length,
            info: validation.issues.filter(i => i.severity === 'info').length,
        };
        return {
            total: totalCitations,
            verified: verifiedSources,
            valid: validCitations,
            avgConfidence,
            issuesByType,
            passRate: (validCitations / totalCitations * 100).toFixed(1) + '%',
            verificationRate: (verifiedSources / totalCitations * 100).toFixed(1) + '%',
        };
    }
    /**
     * Format verification report
     */
    formatVerificationReport(response) {
        let report = '📚 Citation Verification Report\n\n';
        const summary = response.summary;
        report += `📊 Summary:\n`;
        report += `  Total Citations: ${summary.total}\n`;
        report += `  Verified Sources: ${summary.verified}/${summary.total} (${summary.verificationRate})\n`;
        report += `  Valid Citations: ${summary.valid}/${summary.total} (${summary.passRate})\n`;
        report += `  Average Confidence: ${(summary.avgConfidence * 100).toFixed(1)}%\n`;
        report += `  Overall Status: ${response.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
        if (summary.issuesByType.critical > 0 || summary.issuesByType.error > 0) {
            report += `⚠️  Issues Detected:\n`;
            if (summary.issuesByType.critical > 0)
                report += `  🚨 Critical: ${summary.issuesByType.critical}\n`;
            if (summary.issuesByType.error > 0)
                report += `  ❌ Errors: ${summary.issuesByType.error}\n`;
            if (summary.issuesByType.warning > 0)
                report += `  ⚠️  Warnings: ${summary.issuesByType.warning}\n`;
            if (summary.issuesByType.info > 0)
                report += `  ℹ️  Info: ${summary.issuesByType.info}\n`;
            report += '\n';
        }
        report += `📋 Individual Citation Results:\n\n`;
        for (let i = 0; i < response.individualResults.length; i++) {
            const result = response.individualResults[i];
            const citation = result.citation;
            report += `${i + 1}. ${citation.title}\n`;
            report += `   Source: ${citation.source} (${citation.sourceType})\n`;
            report += `   Relevance: ${(citation.relevanceScore * 100).toFixed(1)}%\n`;
            report += `   Source Verified: ${result.sourceVerified ? '✅' : '❌'}\n`;
            report += `   Validation: ${result.individualValidation.isValid ? '✅' : '❌'} (${(result.individualValidation.confidence * 100).toFixed(1)}% confidence)\n`;
            if (result.individualValidation.issues.length > 0) {
                report += `   Issues:\n`;
                for (const issue of result.individualValidation.issues) {
                    report += `     • [${issue.severity.toUpperCase()}] ${issue.description}\n`;
                }
            }
            report += '\n';
        }
        if (response.overallValidation.recommendations.length > 0) {
            report += `💡 Recommendations:\n`;
            for (const rec of response.overallValidation.recommendations) {
                report += `  • ${rec}\n`;
            }
        }
        return report;
    }
}
//# sourceMappingURL=citation-verify.js.map