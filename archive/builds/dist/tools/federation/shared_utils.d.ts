export interface PatternEvent {
    ts?: string;
    pattern?: string;
    gate?: string;
    run?: string;
    circle?: string;
    category?: string;
    fix_proposal?: string;
    [key: string]: any;
}
export declare function readJsonl<T = any>(filePath: string): Promise<T[]>;
export declare function summarizePatterns(patterns: PatternEvent[]): Map<string, number>;
export declare function getActionKeys(goalieDir: string): Set<string>;
export declare class PatternBaselineDelta {
    pattern: string;
    circle: string;
    depth: number;
    baselineScore?: number;
    currentScore?: number;
    delta?: number;
    deltaPct?: number;
}
export declare function computeCodBaselineDeltas(patterns: PatternEvent[]): PatternBaselineDelta[];
//# sourceMappingURL=shared_utils.d.ts.map