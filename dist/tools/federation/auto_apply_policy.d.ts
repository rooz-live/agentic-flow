/**
 * Auto-Apply Policy Engine
 *
 * Implements policy-based decision making for automated code fix application.
 * Integrates with .goalie/autocommit_policy.yaml to respect user preferences.
 */
import type { CodeFixProposal, CodeFixApplicationResult } from './code_fix_proposals.js';
export interface AutoApplyPolicy {
    /** Whether auto-apply is globally enabled */
    enabled: boolean;
    /** Risk levels that can be auto-applied without approval */
    autoApplyRiskLevels: Array<'low' | 'medium' | 'high'>;
    /** Patterns that are always blocked from auto-apply */
    blockedPatterns: string[];
    /** File path prefixes that are blocked from auto-apply */
    blockedPaths: string[];
    /** File path prefixes that are allowed for auto-apply */
    allowedPaths: string[];
    /** Maximum number of files to modify in one batch */
    maxFilesPerBatch: number;
    /** Whether to require test passage before applying */
    requireTestsPassing: boolean;
    /** Whether to create backup before applying */
    createBackup: boolean;
}
export interface PolicyDecision {
    /** The original proposal */
    proposal: CodeFixProposal;
    /** Decision: apply, dry-run, or manual */
    decision: 'apply' | 'dry-run' | 'manual';
    /** Reason for the decision */
    reason: string;
    /** Policy rules that were evaluated */
    rulesEvaluated: string[];
}
/**
 * Load auto-apply policy from .goalie/autocommit_policy.yaml
 */
export declare function loadAutoApplyPolicy(goalieDir: string): AutoApplyPolicy;
/**
 * Evaluate whether a proposal should be auto-applied based on policy
 */
export declare function evaluateProposal(proposal: CodeFixProposal, policy: AutoApplyPolicy): PolicyDecision;
/**
 * Batch evaluate multiple proposals
 */
export declare function batchEvaluate(proposals: CodeFixProposal[], policy: AutoApplyPolicy): PolicyDecision[];
/**
 * Filter proposals by policy decision
 */
export declare function filterByDecision(decisions: PolicyDecision[], targetDecision: 'apply' | 'dry-run' | 'manual'): PolicyDecision[];
/**
 * Apply a code fix proposal (actually modify files)
 */
export declare function applyCodeFix(proposal: CodeFixProposal, policy: AutoApplyPolicy, goalieDir: string): Promise<CodeFixApplicationResult>;
/**
 * Log policy decision to pattern metrics
 */
export declare function logPolicyDecision(decision: PolicyDecision, goalieDir: string): void;
//# sourceMappingURL=auto_apply_policy.d.ts.map