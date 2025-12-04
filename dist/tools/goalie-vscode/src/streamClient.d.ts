import * as vscode from 'vscode';
import type { GoalieTelemetry } from './telemetry';
export interface StreamEventPayload {
    type?: string;
    data?: any;
    timestamp?: string;
}
export interface StreamClientOptions {
    socketPath?: string;
    telemetry: GoalieTelemetry;
    output: vscode.OutputChannel;
    reconnectDelayMs?: number;
    onEvent?: (payload: StreamEventPayload) => void;
}
export declare class StreamClient implements vscode.Disposable {
    private readonly options;
    private socket?;
    private reconnectTimer?;
    private buffer;
    private disposed;
    private socketPath?;
    constructor(options: StreamClientOptions);
    start(socketPath?: string): void;
    dispose(): void;
    private connect;
    private handleChunk;
    private flushBuffer;
    private tryProcessBuffer;
    private processLine;
    private emitEvent;
    private scheduleReconnect;
}
//# sourceMappingURL=streamClient.d.ts.map