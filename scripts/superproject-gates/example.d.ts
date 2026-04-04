/**
 * Example: Hierarchical Progress Tracking Usage
 *
 * Demonstrates how to integrate progress tracking into pipelines
 */
export declare class PipelineProgressTracker {
    private progress;
    private repo;
    private updateInterval?;
    private lineCount;
    constructor(pipelineId: string);
    start(metricsTotal: number, episodesTotal: number, learningTotal: number): Promise<void>;
    updateMetrics(completed: number): void;
    updateEpisodes(completed: number): void;
    updateLearning(completed: number): void;
    private startLiveRender;
    stop(): void;
    getMetrics(): import("./index").ProgressMetrics;
}
//# sourceMappingURL=example.d.ts.map