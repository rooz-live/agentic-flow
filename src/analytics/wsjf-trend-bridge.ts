/**
 * WSJF Trend Bridge
 *
 * TypeScript wrapper that invokes wsjf_trend_analyzer.py via child_process
 * and returns a typed TrendAnalysis result.
 */

import { spawnSync } from 'child_process';
import * as path from 'path';
import type { TrendAnalysis, TrendDataPoint } from '../api/wsjf-shared-types';

const ANALYZER_PATH = path.resolve(
  process.env.WSJF_TREND_ANALYZER_PATH ??
  path.join(process.cwd(), 'tooling', 'scripts', 'agentic', 'wsjf_trend_analyzer.py'),
);

const PYTHON_BIN = process.env.WSJF_PYTHON_BIN ?? 'python3';

export interface TrendBridgeOptions {
  timeoutMs?: number;
}

export class WSJFTrendBridge {
  private readonly timeoutMs: number;

  constructor(opts: TrendBridgeOptions = {}) {
    this.timeoutMs = opts.timeoutMs ?? 15_000;
  }

  /**
   * Run the Python trend analyzer for a team and return the analysis.
   */
  analyze(
    teamId: string,
    tenantId: string,
    dataPoints: TrendDataPoint[],
  ): TrendAnalysis {
    const input  = JSON.stringify(dataPoints);

    const result = spawnSync(
      PYTHON_BIN,
      [
        ANALYZER_PATH,
        '--team-id',   teamId,
        '--tenant-id', tenantId,
      ],
      {
        input,
        encoding: 'utf8',
        timeout:  this.timeoutMs,
      },
    );

    if (result.error) {
      throw new Error(`Trend analyzer process error: ${result.error.message}`);
    }
    if (result.status !== 0) {
      throw new Error(
        `Trend analyzer exited with code ${result.status}: ${result.stderr ?? ''}`,
      );
    }

    const parsed = JSON.parse(result.stdout) as {
      teamId: string;
      tenantId: string;
      period: { from: string; to: string };
      dataPoints: TrendDataPoint[];
      slope: number;
      velocityBaseline: number;
      anomalies: Array<{ date: string; score: number; zScore: number }>;
    };

    return {
      teamId:           parsed.teamId,
      tenantId:         parsed.tenantId,
      period:           parsed.period,
      dataPoints:       parsed.dataPoints,
      slope:            parsed.slope,
      velocityBaseline: parsed.velocityBaseline,
      anomalies:        parsed.anomalies,
    };
  }
}

export const wsjfTrendBridge = new WSJFTrendBridge();
