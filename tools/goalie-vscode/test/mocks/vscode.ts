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

const noop = () => {};

export const env = {
  createTelemetryLogger: (_sender?: TelemetrySender): TelemetryLogger => ({
    logUsage: noop,
    logError: noop,
    dispose: noop,
  }),
};
