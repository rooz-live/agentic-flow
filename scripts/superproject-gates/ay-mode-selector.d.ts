#!/usr/bin/env tsx
/**
 * AY Mode Selector - Dynamic ay-prod/ay-yolife Selection
 *
 * Intelligently selects between ay-prod (production) and ay-yolife (development)
 * based on context, risk assessment, and system state.
 */
export interface ModeSelectionContext {
    environment: 'production' | 'development' | 'testing';
    riskLevel: 'low' | 'medium' | 'high';
    coverageStatus: 'adequate' | 'inadequate' | 'unknown';
    lastRunMode?: 'prod' | 'yolife';
    iterationCount: number;
    hasRecentFailures: boolean;
    skillConfidence: number;
}
export type SelectedMode = 'prod' | 'yolife' | 'hybrid';
export declare class AYModeSelector {
    private agentdbPath;
    private projectRoot;
    constructor(agentdbPath?: string, projectRoot?: string);
    /**
     * Select appropriate mode based on context
     */
    selectMode(context?: Partial<ModeSelectionContext>): Promise<SelectedMode>;
    /**
     * Build full context from system state
     */
    private buildContext;
    private detectEnvironment;
    private assessRiskLevel;
    private assessCoverage;
    private getLastRunMode;
    private getIterationCount;
    private hasRecentFailures;
    private getSkillConfidence;
    /**
     * Save selected mode for next iteration
     */
    saveMode(mode: SelectedMode): Promise<void>;
    /**
     * Get execution command for selected mode
     */
    getExecutionCommand(mode: SelectedMode, circle: string, ceremony: string, modeArg?: string): string;
}
//# sourceMappingURL=ay-mode-selector.d.ts.map