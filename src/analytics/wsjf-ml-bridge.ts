/**
 * WSJF ML Bridge
 *
 * TypeScript call-through to wsjf_ml_optimizer.py.
 * Exposes fit() and predictWeights() with typed models and confidence envelopes.
 */

import { spawnSync } from 'child_process';
import * as path from 'path';
import type { MLWeightModel, MLPrediction, WeightCoefficients } from '../api/wsjf-shared-types';

const OPTIMIZER_PATH = path.resolve(
  process.env.WSJF_ML_OPTIMIZER_PATH ??
  path.join(process.cwd(), 'tooling', 'scripts', 'agentic', 'wsjf_ml_optimizer.py'),
);

const PYTHON_BIN     = process.env.WSJF_PYTHON_BIN     ?? 'python3';
const WEIGHTS_PATH   = process.env.WSJF_ML_WEIGHTS_PATH ??
  path.join(process.cwd(), '.goalie', 'wsjf-ml-weights.json');

// ─────────────────────────────────────────────────────────────────────────────
// Training example shape (mirrors Python dataclass)
// ─────────────────────────────────────────────────────────────────────────────

export interface TrainingExample {
  userBusinessValue: number;
  timeCriticality:   number;
  riskReduction:     number;
  jobSize:           number;
  actualOutcome:     number;   // 0–1
}

export interface MLBridgeOptions {
  timeoutMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bridge class
// ─────────────────────────────────────────────────────────────────────────────

export class WSJFMLBridge {
  private readonly timeoutMs: number;

  constructor(opts: MLBridgeOptions = {}) {
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  /**
   * Train the optimizer on historical examples and return the updated model.
   */
  fit(tenantId: string, examples: TrainingExample[]): MLWeightModel {
    if (examples.length === 0) {
      return this.predictWeights(tenantId);
    }

    const input  = JSON.stringify(examples);
    const result = spawnSync(
      PYTHON_BIN,
      [
        OPTIMIZER_PATH,
        '--tenant-id',    tenantId,
        '--weights-path', WEIGHTS_PATH,
        '--fit',          '/dev/stdin',
      ],
      {
        input,
        encoding: 'utf8',
        timeout:  this.timeoutMs,
      },
    );

    return this.parseModel(tenantId, result);
  }

  /**
   * Return the current learned weights for a tenant without re-training.
   */
  predictWeights(tenantId: string): MLWeightModel {
    const result = spawnSync(
      PYTHON_BIN,
      [
        OPTIMIZER_PATH,
        '--tenant-id',    tenantId,
        '--weights-path', WEIGHTS_PATH,
        '--predict',
      ],
      {
        encoding: 'utf8',
        timeout:  this.timeoutMs,
      },
    );

    return this.parseModel(tenantId, result);
  }

  /**
   * Return prediction with a confidence envelope (±1σ of weight uncertainty).
   */
  predict(tenantId: string): MLPrediction {
    const model = this.predictWeights(tenantId);

    const uncertainty = 1 - model.confidence;
    const envelope    = 0.1 * uncertainty;   // ±10% at 0% confidence

    const weights: WeightCoefficients = {
      w1: model.weights.w1,
      w2: model.weights.w2,
      w3: model.weights.w3,
    };

    return {
      suggestedWeights: weights,
      confidence:       model.confidence,
      reasoning:
        `Trained on ${model.trainingExamples} examples. ` +
        `Weight uncertainty envelope: ±${(envelope * 100).toFixed(1)}%.`,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private parseModel(
    tenantId: string,
    result: ReturnType<typeof spawnSync>,
  ): MLWeightModel {
    if (result.error) {
      throw new Error(`ML optimizer process error: ${result.error.message}`);
    }
    if (result.status !== 0) {
      throw new Error(
        `ML optimizer exited with code ${result.status}: ${String(result.stderr ?? '')}`,
      );
    }

    const raw = JSON.parse(result.stdout as string) as {
      w1: number; w2: number; w3: number;
      confidence: number;
      trainingExamples: number;
      lastTrainedAt: string;
      modelVersion: string;
    };

    return {
      tenantId,
      weights: { w1: raw.w1, w2: raw.w2, w3: raw.w3 },
      confidence:       raw.confidence,
      trainingExamples: raw.trainingExamples,
      lastTrainedAt:    raw.lastTrainedAt,
      modelVersion:     raw.modelVersion,
    };
  }
}

export const wsjfMLBridge = new WSJFMLBridge();
