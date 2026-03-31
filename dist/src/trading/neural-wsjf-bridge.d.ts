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
export interface WsjfItem {
    id: string;
    task: string;
    business_value: number;
    time_criticality: number;
    risk_reduction: number;
    job_size: number;
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
    allocation: number;
    expectedValue: number;
    riskContribution: number;
}
export interface BridgeDiagnostics {
    backend: 'native' | 'ts-fallback';
    nativeAvailable: boolean;
    version: string;
    capabilities: string[];
}
export declare class NeuralWsjfBridge {
    private native;
    constructor();
    /** True if neural-trader NAPI bindings loaded successfully. */
    get isNative(): boolean;
    /**
     * Score a WSJF item with Kelly-adjusted job sizing and criticality decay.
     *
     * 1. Maps `risk_reduction` to Kelly Criterion win-rate
     * 2. Adjusts `job_size` by Kelly fraction (smaller bet → lower job_size)
     * 3. Forecasts `time_criticality` decay over a 5-step horizon
     * 4. Computes composite WSJF score:
     *    `(business_value + time_criticality + risk_reduction) / kellyAdjustedSize`
     */
    scoreWsjfItem(item: WsjfItem): WsjfScoreResult;
    /**
     * Predict time_criticality decay over `horizon` steps.
     * Uses neural-trader LSTM when available, EMA fallback otherwise.
     */
    predictCriticalityDecay(historicalValues: number[], horizon?: number): {
        predictions: number[];
        confidence: number;
        backend: string;
    };
    /**
     * Allocate capacity across multiple WSJF items using Monte-Carlo risk
     * simulation. Each item gets a fraction of total capacity proportional
     * to its risk-adjusted expected value.
     */
    allocateMultiRisk(items: WsjfItem[], totalCapacity?: number, simulations?: number): MultiRiskAllocation[];
    /**
     * Return bridge diagnostics (backend, capabilities, version).
     */
    diagnostics(): BridgeDiagnostics;
}
//# sourceMappingURL=neural-wsjf-bridge.d.ts.map