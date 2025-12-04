export interface StreamEventPayload {
    type: string;
    data: any;
    timestamp?: string;
}
export declare function resolveStreamSocket(goalieDir: string): string | undefined;
export declare function isSocketAvailable(socketPath: string | undefined): boolean;
export declare function publishStreamEvent(socketPath: string | undefined, payload: StreamEventPayload): Promise<void>;
//# sourceMappingURL=streamPublisher.d.ts.map