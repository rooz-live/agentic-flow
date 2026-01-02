import * as vscode from 'vscode';
export type TelemetryEventProps = Record<string, string>;
export type TelemetryMeasurements = Record<string, number>;
export declare class GoalieTelemetry {
    private readonly output;
    private logger;
    private readonly fallbackPath;
    private readonly afContext;
    constructor(output: vscode.OutputChannel, workspaceRoot: string | undefined);
    log(eventName: string, properties?: TelemetryEventProps, measurements?: TelemetryMeasurements): void;
    logError(eventName: string, properties?: TelemetryEventProps): void;
    dispose(): void;
    buildProperties(properties?: TelemetryEventProps, measurements?: TelemetryMeasurements): TelemetryEventProps;
    writeFallback(eventName: string, properties?: TelemetryEventProps, measurements?: TelemetryMeasurements): Promise<void>;
}
//# sourceMappingURL=telemetry.d.ts.map