export type OtelRuntime = {
    sdk?: any;
    started: boolean;
    stop: () => Promise<void>;
};
export declare function startOtel(): Promise<OtelRuntime>;
export declare function stopOtel(): Promise<void>;
export declare function getOtelStatus(): {
    enabled: boolean;
    started: boolean;
    endpoint?: string;
    traces: boolean;
    metrics: boolean;
    serviceName: string;
};
//# sourceMappingURL=otel.d.ts.map