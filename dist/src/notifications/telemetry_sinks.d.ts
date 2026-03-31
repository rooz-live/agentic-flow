import { EventEmitter } from 'events';
export interface EventSink {
    start(): void;
    stop(): void;
}
export interface JsonlSinkOptions {
    filePath: string;
    flushIntervalMs?: number;
    batchSize?: number;
    maxPerMinute?: number;
    dropSummaryEvery?: number;
    subscribeTo?: string[];
}
export declare class JsonlEventSink implements EventSink {
    private bus;
    private opts;
    private buffer;
    private timer?;
    private stream?;
    private perMinute;
    constructor(bus: EventEmitter, opts: JsonlSinkOptions);
    start(): void;
    stop(): void;
    private flush;
    private rateLimited;
}
//# sourceMappingURL=telemetry_sinks.d.ts.map