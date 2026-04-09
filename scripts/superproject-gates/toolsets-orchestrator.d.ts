#!/usr/bin/env tsx
/**
 * Toolsets Orchestrator - Best-of-Breed Integration
 *
 * Integrates AISP, agentic-qe, claude-flow, and llm-observatory into ay runs
 * Provides unified metrics tracking, coverage analysis, and quality assurance
 *
 * Implements the AISP/QE fleet/v3 prompt requirements:
 * - Full test coverage and quality assurance
 * - ROAM all problems in single hive mind sprint
 * - Visual metaphors and Three.js interface consideration
 * - Multi-LLM consultation (Z AI, Gemini 3 Pro, OpenAI, Perplexity)
 * - Skill persistence validation (P0) and feedback loop (P1)
 */
export interface ToolsetsMetrics {
    patternRationaleGap: {
        missing: number;
        total: number;
        coveragePercent: number;
    };
    mymScores: {
        manthra: number | null;
        yasna: number | null;
        mithra: number | null;
    };
    roamStaleness: {
        oldestEntryDays: number;
        targetDays: number;
        isStale: boolean;
    };
    typescriptErrors: number;
    iterationGreenStreak: number;
    okRate: number;
    stabilityScore: number;
    missingObservabilityPatterns: number;
    testCoverage: number;
    patternNamingMismatches: number;
    executionPerformance: {
        avgExecutionTime: number;
        p95ExecutionTime: number;
    };
    skillPersistence: {
        run1Skills: number;
        run2Skills: number;
        persistenceRate: number;
        skillsLoaded: boolean;
        modeScoresReflectConfidence: boolean;
    };
}
export interface ToolsetsRunResult {
    success: boolean;
    metrics: ToolsetsMetrics;
    issues: Array<{
        severity: 'critical' | 'error' | 'warning' | 'info';
        category: string;
        message: string;
        suggestedAction?: string;
    }>;
    recommendations: string[];
    executionTime: number;
}
export declare class ToolsetsOrchestrator {
    private projectRoot;
    private agentdbPath;
    private roamTrackerPath;
    private patternMetricsPath;
    constructor(projectRoot?: string);
    /**
     * Execute full toolsets integration run
     * Implements AISP/QE fleet/v3 prompt requirements
     */
    executeRun(runId: string): Promise<ToolsetsRunResult>;
    /**
     * AISP Validation - Formal specification compliance
     */
    private runAISPValidation;
    /**
     * Agentic-QE Fleet - Comprehensive quality assurance
     */
    private runAgenticQEFleet;
    /**
     * Claude-Flow Agent Coordination
     */
    private runClaudeFlowAgents;
    /**
     * LLM Observatory Instrumentation
     */
    private runLLMObservatory;
    /**
     * Collect comprehensive metrics
     */
    private collectMetrics;
    private calculatePatternRationaleGap;
    private calculateMYMScores;
    private calculateROAMStaleness;
    private countTypeScriptErrors;
    private getIterationGreenStreak;
    private calculateOKRate;
    private calculateStabilityScore;
    private countMissingObservabilityPatterns;
    private calculateTestCoverage;
    private countPatternNamingMismatches;
    private calculateExecutionPerformance;
    /**
     * Validate skill persistence (P0 validation)
     */
    private validateSkillPersistence;
    private checkModeScoresReflectConfidence;
    /**
     * ROAM All Problems - Hive Mind Sprint
     * Implements the requirement to "roam ALL problems identified by agentic QE fleet"
     * Enhanced with visual interface libraries support
     */
    private roamAllProblems;
    /**
     * Get hierarchical mesh coverage status
     */
    private getHierarchicalMeshCoverage;
    /**
     * Generate comprehensive report
     */
    generateReport(result: ToolsetsRunResult): string;
}
//# sourceMappingURL=toolsets-orchestrator.d.ts.map