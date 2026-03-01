/* tslint:disable */
/* eslint-disable */

export class NeuralTrader {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Analyze market conditions array → trading signals with Kelly sizing.
     *
     * Input: JSON string of `MarketCondition[]`.
     * Returns: JSON string of `AnalysisResult`.
     */
    analyze(market_data: any): any;
    /**
     * Calculate risk for a single position.
     *
     * Input: JSON string of a single `MarketCondition`.
     * Returns: JSON string of `RiskResult`.
     */
    calculate_risk(position_data: any): any;
    get_health(): any;
    initialize(): void;
    /**
     * Create a new NeuralTrader.
     *
     * Config JSON (all optional):
     * ```json
     * { "riskThreshold": 0.15, "maxPositionPct": 0.25, "totalBudget": 100000 }
     * ```
     */
    constructor(config: any);
}

export function greet(name: string): void;

export function main(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_neuraltrader_free: (a: number, b: number) => void;
    readonly greet: (a: number, b: number) => void;
    readonly neuraltrader_analyze: (a: number, b: any) => any;
    readonly neuraltrader_calculate_risk: (a: number, b: any) => any;
    readonly neuraltrader_get_health: (a: number) => any;
    readonly neuraltrader_initialize: (a: number) => void;
    readonly neuraltrader_new: (a: any) => number;
    readonly main: () => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
