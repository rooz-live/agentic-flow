/**
 * Neural-WSJF Bridge
 *
 * Bridges neural-trader's Kelly Criterion sizing and time-series prediction
 * to WSJF (Weighted Shortest Job First) scoring. Gracefully degrades to
 * pure-TS implementations when native bindings are unavailable (e.g. macOS
 * without the linux-only NAPI binary).
 *
 * ## Architecture
 *
 * ```
 *  neural-trader (native)          Pure TS fallback
 *  ┌─────────────────────┐        ┌─────────────────────┐
 *  │ calculateKellyCrit. │   OR   │ kellyFractionTS()   │
 *  │ neuralForecast()    │        │ emaCriticalityDecay()│
 *  │ riskAnalysis()      │        │ monteCarloAlloc()    │
 *  └────────┬────────────┘        └────────┬────────────┘
 *           │                               │
 *           └───────────┬───────────────────┘
 *                       ▼
 *              NeuralWsjfBridge
 *              ├─ scoreWsjfItem()
 *              ├─ predictCriticalityDecay()
 *              ├─ allocateMultiRisk()
 *              └─ diagnostics()
 * ```
 */

// ---------------------------------------------------------------------------
// Native binding loader with graceful fallback
// ---------------------------------------------------------------------------

interface NativeBindings {
  calculateKellyCriterion: (config: {
    winRate: number;
    avgWin: number;
    avgLoss: number;
  }) => { fraction: number; expectedValue: number };
  neuralForecast: (config: {
    data: number[];
    horizon: number;
    model?: string;
  }) => { predictions: number[]; confidence: number };
  riskAnalysis: (config: {
    portfolio: Array<{ symbol: string; weight: number }>;
    period?: string;
  }) => { sharpe: number; sortino: number; maxDrawdown: number; var95: number };
  monteCarloSimulation: (config: {
    initialValue: number;
    expectedReturn: number;
    volatility: number;
    simulations: number;
    periods: number;
  }) => { mean: number; percentile5: number; percentile95: number };
}

let _native: NativeBindings | null = null;
let _nativeLoadAttempted = false;

function tryLoadNative(): NativeBindings | null {
  if (_nativeLoadAttempted) return _native;
  _nativeLoadAttempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nt = require('neural-trader');
    if (
      typeof nt.calculateKellyCriterion === 'function' &&
      typeof nt.neuralForecast === 'function'
    ) {
      _native = nt as NativeBindings;
    }
  } catch {
    // Native bindings unavailable — fall through to TS fallback
  }
  return _native;
}

// ---------------------------------------------------------------------------
// Pure-TS fallback implementations
// ---------------------------------------------------------------------------

/**
 * Kelly Criterion fraction: f* = (bp - q) / b
 * where b = reward/risk ratio, p = win probability, q = 1-p.
 * Half-Kelly is applied for safety.
 */
function kellyFractionTS(
  winRate: number,
  avgWin: number,
  avgLoss: number,
): { fraction: number; expectedValue: number } {
  const b = avgLoss === 0 ? 0 : avgWin / avgLoss;
  const p = Math.max(0, Math.min(1, winRate));
  const q = 1 - p;
  const fullKelly = b === 0 ? 0 : (b * p - q) / b;
  const fraction = Math.max(0, Math.min(1, fullKelly * 0.5)); // half-Kelly
  const expectedValue = p * avgWin - q * avgLoss;
  return { fraction, expectedValue };
}

/**
 * Exponential Moving Average forecast for time_criticality decay.
 * Returns predicted values for `horizon` steps ahead by projecting
 * the trailing EMA slope.
 */
function emaCriticalityDecay(
  data: number[],
  horizon: number,
  alpha = 0.3,
): { predictions: number[]; confidence: number } {
  if (data.length === 0) {
    return { predictions: Array(horizon).fill(0), confidence: 0 };
  }
  let ema = data[0];
  let prevEma = ema;
  for (const val of data) {
    prevEma = ema;
    ema = alpha * val + (1 - alpha) * ema;
  }
  const slope = ema - prevEma;
  const predictions: number[] = [];
  for (let i = 1; i <= horizon; i++) {
    predictions.push(Math.max(0, ema + slope * i));
  }
  // Confidence decays with horizon length
  const confidence = Math.max(0.1, 1 - horizon * 0.05);
  return { predictions, confidence };
}

/**
 * Lightweight Monte Carlo for WSJF multi-risk allocation.
 * Runs `simulations` paths of `periods` steps with given return/vol.
 */
function monteCarloAllocTS(
  initialValue: number,
  expectedReturn: number,
  volatility: number,
  simulations: number,
  periods: number,
): { mean: number; percentile5: number; percentile95: number } {
  const results: number[] = [];
  for (let s = 0; s < simulations; s++) {
    let value = initialValue;
    for (let t = 0; t < periods; t++) {
      // Box-Muller for normal random
      const u1 = Math.random() || 1e-10;
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      value *= Math.exp(expectedReturn - 0.5 * volatility ** 2 + volatility * z);
    }
    results.push(value);
  }
  results.sort((a, b) => a - b);
  const p5 = results[Math.floor(simulations * 0.05)];
  const p95 = results[Math.floor(simulations * 0.95)];
  const mean = results.reduce((a, b) => a + b, 0) / simulations;
  return { mean, percentile5: p5, percentile95: p95 };
}

// ---------------------------------------------------------------------------
// WSJF types
// ---------------------------------------------------------------------------

export interface WsjfItem {
  id: string;
  task: string;
  business_value: number;   // 1–10
  time_criticality: number; // 1–10
  risk_reduction: number;   // 1–10
  job_size: number;          // 1–10
  status?: string;
  deadline?: string;
}

export interface WsjfScoreResult {
  id: string;
  wsjfScore: number;
  kellyAdjustedSize: number;
  criticalityDecayForecast: number[];
  riskAllocation: number;
  horizon: 'NOW' | 'NEXT' | 'LATER';
  backend: 'native' | 'ts-fallback';
}

export interface MultiRiskAllocation {
  itemId: string;
  allocation: number;      // 0–1 fraction of capacity
  expectedValue: number;
  riskContribution: number;
}

export interface BridgeDiagnostics {
  backend: 'native' | 'ts-fallback';
  nativeAvailable: boolean;
  version: string;
  capabilities: string[];
}

// ---------------------------------------------------------------------------
// NeuralWsjfBridge
// ---------------------------------------------------------------------------

export class NeuralWsjfBridge {
  private native: NativeBindings | null;

  constructor() {
    this.native = tryLoadNative();
  }

  /** True if neural-trader NAPI bindings loaded successfully. */
  get isNative(): boolean {
    return this.native !== null;
  }

  // ── Core API ─────────────────────────────────────────────────────────

  /**
   * Score a WSJF item with Kelly-adjusted job sizing and criticality decay.
   *
   * 1. Maps `risk_reduction` to Kelly Criterion win-rate
   * 2. Adjusts `job_size` by Kelly fraction (smaller bet → lower job_size)
   * 3. Forecasts `time_criticality` decay over a 5-step horizon
   * 4. Computes composite WSJF score:
   *    `(business_value + time_criticality + risk_reduction) / kellyAdjustedSize`
   */
  scoreWsjfItem(item: WsjfItem): WsjfScoreResult {
    // --- Kelly sizing ---
    const winRate = item.risk_reduction / 10; // normalise to 0–1
    const avgWin = item.business_value;
    const avgLoss = item.job_size;

    const kelly = this.native
      ? this.native.calculateKellyCriterion({ winRate, avgWin, avgLoss })
      : kellyFractionTS(winRate, avgWin, avgLoss);

    // Kelly fraction scales the perceived job_size — higher Kelly = higher
    // confidence the investment pays off → effectively shrinks job_size.
    const kellyAdjustedSize = Math.max(
      1,
      item.job_size * (1 - kelly.fraction * 0.5),
    );

    // --- Criticality decay forecast ---
    // Simulate a decaying time_criticality signal
    const criticalitySeries = Array.from({ length: 10 }, (_, i) =>
      item.time_criticality * Math.exp(-0.05 * i),
    );

    const forecast = this.native
      ? this.native.neuralForecast({
          data: criticalitySeries,
          horizon: 5,
          model: 'ema',
        })
      : emaCriticalityDecay(criticalitySeries, 5);

    // --- Composite WSJF ---
    const numerator =
      item.business_value + item.time_criticality + item.risk_reduction;
    const wsjfScore = kellyAdjustedSize > 0 ? numerator / kellyAdjustedSize : 0;

    const horizon: 'NOW' | 'NEXT' | 'LATER' =
      wsjfScore >= 20 ? 'NOW' : wsjfScore >= 10 ? 'NEXT' : 'LATER';

    return {
      id: item.id,
      wsjfScore,
      kellyAdjustedSize,
      criticalityDecayForecast: forecast.predictions,
      riskAllocation: kelly.fraction,
      horizon,
      backend: this.native ? 'native' : 'ts-fallback',
    };
  }

  /**
   * Predict time_criticality decay over `horizon` steps.
   * Uses neural-trader LSTM when available, EMA fallback otherwise.
   */
  predictCriticalityDecay(
    historicalValues: number[],
    horizon = 5,
  ): { predictions: number[]; confidence: number; backend: string } {
    if (this.native) {
      const result = this.native.neuralForecast({
        data: historicalValues,
        horizon,
      });
      return { ...result, backend: 'native' };
    }
    const result = emaCriticalityDecay(historicalValues, horizon);
    return { ...result, backend: 'ts-fallback' };
  }

  /**
   * Allocate capacity across multiple WSJF items using Monte-Carlo risk
   * simulation. Each item gets a fraction of total capacity proportional
   * to its risk-adjusted expected value.
   */
  allocateMultiRisk(
    items: WsjfItem[],
    totalCapacity = 1.0,
    simulations = 1000,
  ): MultiRiskAllocation[] {
    if (items.length === 0) return [];

    const scored = items.map((item) => {
      const winRate = item.risk_reduction / 10;
      const kelly = this.native
        ? this.native.calculateKellyCriterion({
            winRate,
            avgWin: item.business_value,
            avgLoss: item.job_size,
          })
        : kellyFractionTS(winRate, item.business_value, item.job_size);

      const mc = this.native
        ? this.native.monteCarloSimulation({
            initialValue: item.business_value,
            expectedReturn: kelly.fraction,
            volatility: (1 - winRate) * 0.5,
            simulations,
            periods: 10,
          })
        : monteCarloAllocTS(
            item.business_value,
            kelly.fraction,
            (1 - winRate) * 0.5,
            simulations,
            10,
          );

      return {
        item,
        ev: kelly.expectedValue,
        risk: Math.max(0, mc.mean - mc.percentile5),
        mc,
      };
    });

    // Rank by EV/risk ratio (higher is better)
    const totalEv = scored.reduce(
      (sum, s) => sum + Math.max(0.01, s.ev),
      0,
    );

    return scored.map((s) => ({
      itemId: s.item.id,
      allocation:
        totalCapacity * (Math.max(0.01, s.ev) / totalEv),
      expectedValue: s.ev,
      riskContribution: s.risk,
    }));
  }

  /**
   * Return bridge diagnostics (backend, capabilities, version).
   */
  diagnostics(): BridgeDiagnostics {
    const caps: string[] = [
      'kelly-criterion',
      'criticality-decay',
      'multi-risk-allocation',
      'monte-carlo',
    ];
    if (this.native) {
      caps.push('lstm-forecast', 'native-risk-analysis', 'drl-portfolio');
    }
    return {
      backend: this.native ? 'native' : 'ts-fallback',
      nativeAvailable: this.native !== null,
      version: '1.0.0',
      capabilities: caps,
    };
  }
}
