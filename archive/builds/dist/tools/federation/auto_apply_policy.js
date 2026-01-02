/**
 * Auto-Apply Policy Engine
 *
 * Implements policy-based decision making for automated code fix application.
 * Integrates with .goalie/autocommit_policy.yaml to respect user preferences.
 */
import * as fs from 'fs';
import * as path from 'path';
/**
 * Load auto-apply policy from .goalie/autocommit_policy.yaml
 */
export function loadAutoApplyPolicy(goalieDir) {
    const policyPath = path.join(goalieDir, 'autocommit_policy.yaml');
    // Default policy (conservative)
    const defaultPolicy = {
        enabled: false,
        autoApplyRiskLevels: ['low'],
        blockedPatterns: [
            'security',
            'auth',
            'database',
            'migration',
            'deployment'
        ],
        blockedPaths: [
            '/auth/',
            '/security/',
            '/database/',
            '/migrations/',
            '/deploy/',
            '/.github/workflows/'
        ],
        allowedPaths: [
            '/tests/',
            '/test/',
            '/__tests__/',
            '/docs/',
            '/documentation/',
            '/.goalie/'
        ],
        maxFilesPerBatch: 10,
        requireTestsPassing: true,
        createBackup: true,
    };
    if (!fs.existsSync(policyPath)) {
        return defaultPolicy;
    }
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const yaml = require('yaml');
        const raw = fs.readFileSync(policyPath, 'utf8');
        const parsed = yaml.parse(raw) || {};
        // Extract auto-apply settings from autocommit_policy.yaml
        const policy = {
            enabled: Boolean(parsed.allow_code_autocommit) || Boolean(parsed.allow_full_cycle_autocommit),
            autoApplyRiskLevels: parsed.auto_apply_risk_levels || defaultPolicy.autoApplyRiskLevels,
            blockedPatterns: parsed.blocked_patterns || defaultPolicy.blockedPatterns,
            blockedPaths: [
                ...(parsed.blocked_code_prefixes || []),
                ...defaultPolicy.blockedPaths
            ],
            allowedPaths: [
                ...(parsed.allowed_code_prefixes || []),
                ...defaultPolicy.allowedPaths
            ],
            maxFilesPerBatch: parsed.max_files_per_batch || defaultPolicy.maxFilesPerBatch,
            requireTestsPassing: parsed.require_tests_passing !== false, // default true
            createBackup: parsed.create_backup !== false, // default true
        };
        return policy;
    }
    catch (err) {
        console.warn('[auto_apply_policy] Failed to parse autocommit_policy.yaml, using defaults:', err);
        return defaultPolicy;
    }
}
/**
 * Evaluate whether a proposal should be auto-applied based on policy
 */
export function evaluateProposal(proposal, policy) {
    const rulesEvaluated = [];
    // Rule 1: Global enable check
    if (!policy.enabled) {
        rulesEvaluated.push('global_disabled');
        return {
            proposal,
            decision: 'dry-run',
            reason: 'Auto-apply is globally disabled in policy',
            rulesEvaluated,
        };
    }
    // Rule 2: Risk level check
    if (!policy.autoApplyRiskLevels.includes(proposal.riskLevel)) {
        rulesEvaluated.push('risk_level_blocked');
        return {
            proposal,
            decision: proposal.riskLevel === 'high' ? 'manual' : 'dry-run',
            reason: `Risk level ${proposal.riskLevel} not allowed for auto-apply`,
            rulesEvaluated,
        };
    }
    // Rule 3: Blocked patterns
    for (const blockedPattern of policy.blockedPatterns) {
        if (proposal.pattern.includes(blockedPattern)) {
            rulesEvaluated.push(`pattern_blocked:${blockedPattern}`);
            return {
                proposal,
                decision: 'manual',
                reason: `Pattern '${proposal.pattern}' contains blocked keyword '${blockedPattern}'`,
                rulesEvaluated,
            };
        }
    }
    // Rule 4: Blocked file paths
    if (proposal.filePath) {
        for (const blockedPath of policy.blockedPaths) {
            if (proposal.filePath.includes(blockedPath)) {
                rulesEvaluated.push(`path_blocked:${blockedPath}`);
                return {
                    proposal,
                    decision: 'manual',
                    reason: `File path '${proposal.filePath}' matches blocked path '${blockedPath}'`,
                    rulesEvaluated,
                };
            }
        }
        // Rule 5: Allowed paths override (if file is in allowed path, always allow regardless of risk)
        let inAllowedPath = false;
        for (const allowedPath of policy.allowedPaths) {
            if (proposal.filePath.includes(allowedPath)) {
                inAllowedPath = true;
                rulesEvaluated.push(`path_allowed:${allowedPath}`);
                break;
            }
        }
        if (inAllowedPath) {
            return {
                proposal,
                decision: 'apply',
                reason: `File path '${proposal.filePath}' is in allowed paths list`,
                rulesEvaluated,
            };
        }
    }
    // Rule 6: Approval required flag
    if (proposal.approvalRequired) {
        rulesEvaluated.push('approval_required');
        return {
            proposal,
            decision: 'dry-run',
            reason: 'Proposal marked as requiring manual approval',
            rulesEvaluated,
        };
    }
    // Rule 7: Test validation required
    if (policy.requireTestsPassing && proposal.validation?.requiredTests?.length) {
        rulesEvaluated.push('tests_required');
        // This would need integration with test runner
        // For now, mark as dry-run if tests are required but not validated
        return {
            proposal,
            decision: 'dry-run',
            reason: 'Tests must pass before auto-apply (not yet validated)',
            rulesEvaluated,
        };
    }
    // Default: allow auto-apply
    rulesEvaluated.push('all_checks_passed');
    return {
        proposal,
        decision: 'apply',
        reason: 'All policy checks passed, auto-apply approved',
        rulesEvaluated,
    };
}
/**
 * Batch evaluate multiple proposals
 */
export function batchEvaluate(proposals, policy) {
    return proposals.map(proposal => evaluateProposal(proposal, policy));
}
/**
 * Filter proposals by policy decision
 */
export function filterByDecision(decisions, targetDecision) {
    return decisions.filter(d => d.decision === targetDecision);
}
/**
 * Apply a code fix proposal (actually modify files)
 */
export async function applyCodeFix(proposal, policy, goalieDir) {
    const startTime = Date.now();
    const result = {
        proposalId: proposal.proposalId,
        success: false,
        appliedAt: new Date().toISOString(),
    };
    try {
        // Validate proposal has required fields
        if (!proposal.filePath || !proposal.codeSnippet) {
            throw new Error('Proposal missing filePath or codeSnippet');
        }
        const fullPath = path.isAbsolute(proposal.filePath)
            ? proposal.filePath
            : path.join(goalieDir, '..', proposal.filePath);
        // Create backup if policy requires
        if (policy.createBackup && fs.existsSync(fullPath)) {
            const backupPath = `${fullPath}.backup-${Date.now()}`;
            fs.copyFileSync(fullPath, backupPath);
            console.log(`[auto_apply] Created backup: ${backupPath}`);
        }
        // Ensure directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // Write the fix
        fs.writeFileSync(fullPath, proposal.codeSnippet, 'utf8');
        result.success = true;
        result.filesModified = [fullPath];
        result.durationMs = Date.now() - startTime;
        // Run tests if validation specified
        if (proposal.validation?.requiredTests?.length) {
            const testResults = await runTests(proposal.validation.requiredTests);
            result.testResults = testResults;
            // Rollback if tests failed
            if (testResults.failed > 0) {
                result.success = false;
                result.error = `Tests failed: ${testResults.failed} failures`;
                // Restore from backup
                const backupPath = `${fullPath}.backup-${Date.now()}`;
                if (fs.existsSync(backupPath)) {
                    fs.copyFileSync(backupPath, fullPath);
                    console.log(`[auto_apply] Rolled back due to test failures`);
                }
            }
        }
        return result;
    }
    catch (error) {
        result.success = false;
        result.error = error.message;
        result.durationMs = Date.now() - startTime;
        return result;
    }
}
/**
 * Run tests (stub - would integrate with actual test runner)
 */
async function runTests(testFiles) {
    // This is a stub - real implementation would use npm test, jest, etc.
    console.log(`[auto_apply] Would run tests: ${testFiles.join(', ')}`);
    return {
        passed: 0,
        failed: 0,
        skipped: testFiles.length,
    };
}
/**
 * Log policy decision to pattern metrics
 */
export function logPolicyDecision(decision, goalieDir) {
    const event = {
        ts: new Date().toISOString(),
        run: 'auto-apply-policy',
        run_id: process.env.AF_RUN_ID || `policy-${Date.now()}`,
        iteration: parseInt(process.env.AF_RUN_ITERATION || '0', 10),
        circle: 'governance',
        depth: 0,
        pattern: 'policy-evaluation',
        mode: decision.decision === 'apply' ? 'enforcement' : 'advisory',
        mutation: decision.decision === 'apply',
        gate: 'auto-apply-policy',
        framework: '',
        scheduler: '',
        tags: ['Federation', 'Policy'],
        economic: {
            cod: decision.proposal.economic?.cod || 0,
            wsjf_score: decision.proposal.economic?.wsjfScore || 0,
        },
        proposal_id: decision.proposal.proposalId,
        proposal_pattern: decision.proposal.pattern,
        decision: decision.decision,
        reason: decision.reason,
        rules_evaluated: decision.rulesEvaluated,
        risk_level: decision.proposal.riskLevel,
    };
    const metricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
    try {
        fs.appendFileSync(metricsPath, JSON.stringify(event) + '\\n');
    }
    catch (err) {
        console.warn('[auto_apply_policy] Failed to log policy decision:', err);
    }
}
//# sourceMappingURL=auto_apply_policy.js.map