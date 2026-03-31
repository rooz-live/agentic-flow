import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export type TelemetryEventProps = Record<string, string>;
export type TelemetryMeasurements = Record<string, number>;

interface LogPayload {
  timestamp: string;
  eventName: string;
  properties?: TelemetryEventProps;
  measurements?: TelemetryMeasurements;
}

export class GoalieTelemetry {
  private logger: vscode.TelemetryLogger | undefined;
  private readonly fallbackPath: string | undefined;
  private readonly afContext: string;

  constructor(
    private readonly output: vscode.OutputChannel,
    workspaceRoot: string | undefined
  ) {
    this.afContext = process.env.AF_CONTEXT || (process.env.PROD_CYCLE === 'true' ? 'prod-cycle' : 'dev-cycle');

    if (workspaceRoot) {
      const goalieDir = path.join(workspaceRoot, '.goalie');
      try {
        fs.mkdirSync(goalieDir, { recursive: true });
        this.fallbackPath = path.join(goalieDir, 'telemetry_log.jsonl');
      } catch (err) {
        this.output.appendLine(`[Telemetry] Failed to ensure .goalie directory: ${String(err)}`);
      }
    }

    if (typeof vscode.env.createTelemetryLogger === 'function') {
      try {
        const sender: vscode.TelemetrySender = {
          sendEventData: () => {},
          sendErrorData: () => {},
        };
        this.logger = vscode.env.createTelemetryLogger(sender);
      } catch (err) {
        this.output.appendLine(`[Telemetry] Failed to initialize VS Code telemetry logger: ${String(err)}`);
      }
    }
  }

  log(eventName: string, properties?: TelemetryEventProps, measurements?: TelemetryMeasurements) {
    const props = this.buildProperties(properties, measurements);
    void this.writeFallback(eventName, props, measurements);
    if (this.logger) {
      try {
        this.logger.logUsage(eventName, props);
      } catch (err) {
        this.output.appendLine(`[Telemetry] logUsage failed for ${eventName}: ${String(err)}`);
      }
    }
  }

  logError(eventName: string, properties?: TelemetryEventProps) {
    const props = this.buildProperties(properties);
    void this.writeFallback(eventName, props);
    if (this.logger) {
      try {
        this.logger.logError(eventName, props);
      } catch (err) {
        this.output.appendLine(`[Telemetry] logError failed for ${eventName}: ${String(err)}`);
      }
    }
  }

  dispose() {
    this.logger?.dispose();
  }

  buildProperties(
    properties?: TelemetryEventProps,
    measurements?: TelemetryMeasurements,
  ): TelemetryEventProps {
    const measurementProps: TelemetryEventProps = {};
    if (measurements) {
      for (const [key, value] of Object.entries(measurements)) {
        measurementProps[`m_${key}`] = value.toString();
      }
    }

    return {
      afContext: this.afContext,
      ...properties,
      ...measurementProps,
    };
  }

  async writeFallback(
    eventName: string,
    properties?: TelemetryEventProps,
    measurements?: TelemetryMeasurements,
  ) {
    if (!this.fallbackPath) {
      return;
    }
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      eventName,
      properties,
      measurements,
    };
    try {
      await fs.promises.appendFile(this.fallbackPath, `${JSON.stringify(payload)}\n`, 'utf8');
    } catch (err) {
      this.output.appendLine(`[Telemetry] Failed to write fallback log: ${err}`);
    }
  }
}
