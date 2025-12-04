export interface OutputChannel {
    appendLine(message: string): void;
}
export interface TelemetryLogger {
    logUsage(eventName: string, data?: Record<string, unknown>): void;
    logError(eventName: string, data?: Record<string, unknown>): void;
    dispose(): void;
}
export interface TelemetrySender {
    sendEventData: () => void;
    sendErrorData: () => void;
}
export declare const env: {
    createTelemetryLogger: (_sender?: TelemetrySender) => TelemetryLogger;
};
//# sourceMappingURL=vscode.d.ts.map