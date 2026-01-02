/**
 * Code Fix Proposal Framework
 *
 * Provides structured interfaces for representing automated code fixes
 * generated from governance violations with risk-based stratification.
 */
export interface CodeFixProposal {
    /** Unique identifier for the proposal */
    proposalId: string;
    /** Associated pattern that triggered this fix */
    pattern: string;
    /** ID of the governance violation */
    violationId?: string;
    /** Target file path (absolute or relative to repo root) */
    filePath?: string;
    /** Proposed code snippet or fix content */
    codeSnippet?: string;
    /** Human-readable description of the fix */
    description: string;
    /** Risk level: low, medium, high */
    riskLevel: 'low' | 'medium' | 'high';
    /** Whether manual approval is required */
    approvalRequired: boolean;
    /** Execution mode: apply (auto), dry-run (preview), manual (user action) */
    mode: 'apply' | 'dry-run' | 'manual';
    /** Rationale explaining why this fix is needed */
    rationale: string;
    /** Impact assessment */
    impact?: {
        /** Estimated lines of code affected */
        locAffected?: number;
        /** Modules or components affected */
        modulesAffected?: string[];
        /** Test coverage impact */
        testCoverageImpact?: 'increase' | 'decrease' | 'neutral';
    };
    /** Economic metrics */
    economic?: {
        /** Cost of delay if not fixed */
        cod?: number;
        /** WSJF priority score */
        wsjfScore?: number;
        /** Time to apply (minutes) */
        timeToApply?: number;
    };
    /** Metadata */
    metadata?: {
        /** Who/what generated this proposal */
        generatedBy?: 'governance-agent' | 'retro-coach' | 'manual';
        /** Timestamp of proposal creation */
        createdAt?: string;
        /** Associated action ID from Goalie board */
        actionId?: string;
        /** Tags for categorization */
        tags?: string[];
    };
    /** Validation rules */
    validation?: {
        /** Pre-conditions that must be met */
        preconditions?: string[];
        /** Post-conditions to verify after application */
        postconditions?: string[];
        /** Required tests to pass */
        requiredTests?: string[];
    };
}
export interface CodeFixProposalBatch {
    /** Batch identifier */
    batchId: string;
    /** Proposals in this batch */
    proposals: CodeFixProposal[];
    /** Batch-level risk assessment */
    overallRiskLevel: 'low' | 'medium' | 'high';
    /** Whether entire batch requires approval */
    batchApprovalRequired: boolean;
    /** Execution strategy: sequential, parallel, or staged */
    executionStrategy: 'sequential' | 'parallel' | 'staged';
    /** Dependencies between proposals */
    dependencies?: Array<{
        proposalId: string;
        dependsOn: string[];
    }>;
}
export interface CodeFixApplicationResult {
    /** ID of the applied proposal */
    proposalId: string;
    /** Success or failure */
    success: boolean;
    /** Error message if failed */
    error?: string;
    /** Files actually modified */
    filesModified?: string[];
    /** Test results if tests were run */
    testResults?: {
        passed: number;
        failed: number;
        skipped: number;
    };
    /** Duration in milliseconds */
    durationMs?: number;
    /** Timestamp of application */
    appliedAt?: string;
}
/**
 * Risk stratification rules for code fix proposals
 */
export declare const RiskStratificationRules: {
    /**
     * Determine risk level based on file path and pattern
     */
    assessRisk(filePath: string | undefined, pattern: string, snippet: string | undefined): "low" | "medium" | "high";
    /**
     * Determine if approval is required based on risk and mode
     */
    requiresApproval(riskLevel: "low" | "medium" | "high", autoCommitEnabled: boolean): boolean;
    /**
     * Determine execution mode based on risk and policy
     */
    determineMode(riskLevel: "low" | "medium" | "high", autoCommitEnabled: boolean, dryRunOnly: boolean): "apply" | "dry-run" | "manual";
};
/**
 * Factory for creating code fix proposals from governance violations
 */
export declare class CodeFixProposalFactory {
    private readonly goalieDir;
    private readonly autoCommitEnabled;
    private readonly dryRunOnly;
    constructor(goalieDir: string, autoCommitEnabled?: boolean, dryRunOnly?: boolean);
    /**
     * Create a proposal from a governance pattern violation
     */
    createFromPattern(pattern: string, description: string, options?: {
        filePath?: string;
        codeSnippet?: string;
        rationale?: string;
        violationId?: string;
        actionId?: string;
        tags?: string[];
    }): CodeFixProposal;
    /**
     * Create a batch of related proposals
     */
    createBatch(proposals: CodeFixProposal[], executionStrategy?: 'sequential' | 'parallel' | 'staged'): CodeFixProposalBatch;
}
//# sourceMappingURL=code_fix_proposals.d.ts.map