export interface WsjfInputs {
    userBusinessValue: number;
    timeCriticality: number;
    riskReduction: number;
    jobSize: number;
}
export declare function computeWsjfScore(inputs: WsjfInputs): number;
export interface BrutalHonestyMetrics {
    score: number;
    hedgingRatio: number;
    confidenceDowngrades: number;
}
export interface SsotItem {
    id: string;
    title: string;
    status?: string;
    wsjfScore?: number;
    source: 'kanban' | 'roam';
    brutalHonesty?: BrutalHonestyMetrics;
}
export interface SsotSnapshot {
    generatedAt: string;
    items: SsotItem[];
}
export declare function loadYamlFile(filePath: string): unknown;
export declare function buildSsotSnapshotFromObjects(input: {
    kanban?: unknown;
    roam?: unknown;
}): SsotSnapshot;
export declare function buildSsotSnapshotFromFiles(input: {
    kanbanPath?: string;
    roamPath?: string;
}): SsotSnapshot;
//# sourceMappingURL=ssot.d.ts.map