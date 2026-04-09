/**
 * P2-TIME: Auto-Generate Runbooks from ROAM
 *
 * Generates operational runbooks from ROAM_TRACKER.yaml entries.
 * Creates step-by-step procedures for each risk category.
 */
export interface ROAMEntry {
    id: string;
    title: string;
    description: string;
    roam_status: 'RESOLVED' | 'OWNED' | 'ACCEPTED' | 'MITIGATING';
    risk_score: number;
    mitigation_plan: string;
    last_updated: string;
}
export interface RunbookTemplate {
    id: string;
    title: string;
    status: string;
    riskScore: number;
    createdAt: string;
    lastUpdated: string;
    overview: string;
    prerequisites: string[];
    steps: RunbookStep[];
    escalationPath: EscalationStep[];
    rollbackProcedure: RollbackStep[];
    verification: string[];
}
export interface RunbookStep {
    step: number;
    action: string;
    expectedOutcome: string;
    timeout: string;
}
export interface EscalationStep {
    level: number;
    contact: string;
    criteria: string;
}
export interface RollbackStep {
    step: number;
    action: string;
    validation: string;
}
export declare class ROAMRunbookGenerator {
    private roamTrackerPath;
    private runbooksDir;
    constructor(baseDir?: string);
    loadROAMTracker(): {
        blockers: ROAMEntry[];
        risks: ROAMEntry[];
        dependencies: ROAMEntry[];
    };
    generateRunbook(entry: ROAMEntry, category: string): RunbookTemplate;
    renderMarkdown(runbook: RunbookTemplate): string;
    generateAllRunbooks(): string[];
}
//# sourceMappingURL=roam-runbook-generator.d.ts.map