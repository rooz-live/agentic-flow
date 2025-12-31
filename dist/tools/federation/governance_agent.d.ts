import { EventEmitter } from 'events';
declare class RealTimeFeed extends EventEmitter {
    private patternsPath;
    private metricsPath;
    private patternsWatcher?;
    private metricsWatcher?;
    constructor(goalieDir: string);
    startMonitoring(): Promise<void>;
    stopMonitoring(): void;
}
export declare function createRealTimeFeed(goalieDir: string): RealTimeFeed;
export declare function simulateAnalyst(context: {
    runId: string;
    circle: string;
}, emit?: boolean): void;
export declare function simulateAssessor(context: {
    runId: string;
    circle: string;
}, emit?: boolean): void;
export {};
//# sourceMappingURL=governance_agent.d.ts.map