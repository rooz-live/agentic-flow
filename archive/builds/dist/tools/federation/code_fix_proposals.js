/**
 * Code Fix Proposal Framework
 *
 * Provides structured interfaces for representing automated code fixes
 * generated from governance violations with risk-based stratification.
 */
/**
 * Risk stratification rules for code fix proposals
 */
export const RiskStratificationRules = {
    /**
     * Determine risk level based on file path and pattern
     */
    assessRisk(filePath, pattern, snippet) {
        // High risk: core infrastructure, auth, security, database
        if (filePath) {
            if (filePath.includes('/auth/') ||
                filePath.includes('/security/') ||
                filePath.includes('/database/') ||
                filePath.includes('/core/') ||
                filePath.includes('migration') ||
                filePath.match(/\.sql$/) ||
                filePath.includes('/api/') && pattern.includes('security')) {
                return 'high';
            }
            // Medium risk: API endpoints, business logic, config
            if (filePath.includes('/api/') ||
                filePath.includes('/config/') ||
                filePath.includes('/services/') ||
                filePath.match(/\.(yaml|yml|json)$/)) {
                return 'medium';
            }
        }
        // High risk patterns
        if (pattern.includes('security') ||
            pattern.includes('auth') ||
            pattern.includes('permission') ||
            pattern.includes('sql-injection') ||
            pattern.includes('xss')) {
            return 'high';
        }
        // Medium risk patterns
        if (pattern.includes('api-') ||
            pattern.includes('data-') ||
            pattern.includes('state-management')) {
            return 'medium';
        }
        // Check snippet content for risky operations
        if (snippet) {
            if (snippet.includes('DROP TABLE') ||
                snippet.includes('DELETE FROM') ||
                snippet.includes('TRUNCATE') ||
                snippet.includes('rm -rf') ||
                snippet.includes('eval(') ||
                snippet.includes('exec(')) {
                return 'high';
            }
        }
        // Low risk by default: tests, docs, styles, observability
        return 'low';
    },
    /**
     * Determine if approval is required based on risk and mode
     */
    requiresApproval(riskLevel, autoCommitEnabled) {
        if (riskLevel === 'high')
            return true;
        if (riskLevel === 'medium' && !autoCommitEnabled)
            return true;
        return false;
    },
    /**
     * Determine execution mode based on risk and policy
     */
    determineMode(riskLevel, autoCommitEnabled, dryRunOnly) {
        if (dryRunOnly)
            return 'dry-run';
        if (riskLevel === 'high')
            return 'manual';
        if (riskLevel === 'medium') {
            return autoCommitEnabled ? 'apply' : 'dry-run';
        }
        return autoCommitEnabled ? 'apply' : 'dry-run';
    }
};
/**
 * Factory for creating code fix proposals from governance violations
 */
export class CodeFixProposalFactory {
    goalieDir;
    autoCommitEnabled;
    dryRunOnly;
    constructor(goalieDir, autoCommitEnabled = false, dryRunOnly = false) {
        this.goalieDir = goalieDir;
        this.autoCommitEnabled = autoCommitEnabled;
        this.dryRunOnly = dryRunOnly;
    }
    /**
     * Create a proposal from a governance pattern violation
     */
    createFromPattern(pattern, description, options = {}) {
        const proposalId = `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const riskLevel = RiskStratificationRules.assessRisk(options.filePath, pattern, options.codeSnippet);
        const approvalRequired = RiskStratificationRules.requiresApproval(riskLevel, this.autoCommitEnabled);
        const mode = RiskStratificationRules.determineMode(riskLevel, this.autoCommitEnabled, this.dryRunOnly);
        return {
            proposalId,
            pattern,
            violationId: options.violationId,
            filePath: options.filePath,
            codeSnippet: options.codeSnippet,
            description,
            riskLevel,
            approvalRequired,
            mode,
            rationale: options.rationale || `Auto-generated fix for pattern: ${pattern}`,
            metadata: {
                generatedBy: 'governance-agent',
                createdAt: new Date().toISOString(),
                actionId: options.actionId,
                tags: options.tags || [pattern],
            },
        };
    }
    /**
     * Create a batch of related proposals
     */
    createBatch(proposals, executionStrategy = 'sequential') {
        const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const highRiskCount = proposals.filter(p => p.riskLevel === 'high').length;
        const mediumRiskCount = proposals.filter(p => p.riskLevel === 'medium').length;
        const overallRiskLevel = highRiskCount > 0 ? 'high' :
            mediumRiskCount > 0 ? 'medium' :
                'low';
        const batchApprovalRequired = proposals.some(p => p.approvalRequired);
        return {
            batchId,
            proposals,
            overallRiskLevel,
            batchApprovalRequired,
            executionStrategy,
        };
    }
}
//# sourceMappingURL=code_fix_proposals.js.map