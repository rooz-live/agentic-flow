// src/routing/advisor/circuit-breaker.ts
import * as fs from 'fs';
import * as path from 'path';

/**
 * ADR-092: Provider-Agnostic Advisor Strategy
 *
 * Circuit breaker to prevent execution overages in multi-model advisor consultation.
 * Upgraded from hardcoded bound to configurable limit aligned with ADR-092.
 */

export type ScenarioBand = 'baseline' | 'adverse' | 'severe' | 'critical';

// Slow-edge thresholds per scenario band (ms) — aligned with mape-k-loop LATENCY_THRESHOLDS × 10
// baseline: 2000ms (10× 200), adverse: 4000, severe: 9000, critical: 15000
export const SLOW_EDGE_THRESHOLDS_MS: Record<ScenarioBand, number> = {
  baseline: 2_000,
  adverse:  4_000,
  severe:   9_000,
  critical: 15_000,
};

export type VectorId = 'code' | 'clt' | 'shared';

export interface CircuitBreakerConfig {
  maxCallsPerSession?: number;
  softLimitPercent?: number;
  stateFilePath?: string;
  scenario?: ScenarioBand;
  opexUtilizationPercent?: number;   // 0–100 — injected from BudgetTracker
  vectorId?: VectorId;               // SA: per-vector gating
  slowEdgeRatioThreshold?: number;   // SA: 0–1, default 0.3
}

export interface CircuitBreakerSnapshot {
  callsTracked: number;
  maxCallsPerSession: number;
  remainingCalls: number;
  utilizationPercent: number;
  nearLimit: boolean;
  opexUtilizationPercent: number;
  opexGated: boolean;
  scenario: ScenarioBand;
  slowEdgeRatio: number;             // SA: fraction of calls that were slow-edge
  vectorId: VectorId;                // SA: which vector this breaker gates
  suggestedScenario: ScenarioBand;   // SA: autoEscalateScenario() result
  slowEdgeFractionString: string;    // SA: explicit string representation (%.# %/#)
  LBEC_OFFLOAD_STATUS?: boolean;     // LBEC: Is dynamic cloud offloading mandated?
  lbecEndpointTarget?: string;       // LBEC: The explicit cloud router to bypass frugal constraints
}

export class AdvisorCircuitBreaker {
  /**
   * MAX_CALLS_PER_SESSION: Configurable hard bound per ADR-092
   * Default: 10 (upgraded from placeholder '#')
   *
   * This structural bound prevents infinite recursion tokens during
   * multi-model advisor consultation loops.
   */
  private static readonly DEFAULT_MAX_CALLS_PER_SESSION = 12;
  private static readonly MIN_MAX_CALLS_PER_SESSION = 1;
  private static readonly MAX_MAX_CALLS_PER_SESSION = 48;   // SA: upgraded ceiling (4× default × 4 bands)
  private static readonly OPEX_GATE_THRESHOLD = 95;         // hard gate at 95% OPEX utilization
  private static readonly DEFAULT_SLOW_EDGE_RATIO_THRESHOLD = 0.3;
  private readonly maxCallsPerSession: number;
  private readonly softLimitPercent: number;
  private stateFilePath: string;
  private readonly scenario: ScenarioBand;
  private opexUtilizationPercent: number;
  private readonly vectorId: VectorId;
  private readonly slowEdgeRatioThreshold: number;
  private slowEdgeCalls = 0;
  private totalCalls = 0;

  constructor(config: CircuitBreakerConfig = {}) {
    this.maxCallsPerSession = this.resolveMaxCallsPerSession(config.maxCallsPerSession);
    this.softLimitPercent = config.softLimitPercent ?? 0.8;
    this.stateFilePath = config.stateFilePath ?? path.resolve(process.cwd(), '.goalie/circuit_breaker_state.json');
    this.scenario = config.scenario ?? 'baseline';
    this.opexUtilizationPercent = config.opexUtilizationPercent ?? 0;
    this.vectorId = config.vectorId ?? 'code';
    this.slowEdgeRatioThreshold = config.slowEdgeRatioThreshold ?? AdvisorCircuitBreaker.DEFAULT_SLOW_EDGE_RATIO_THRESHOLD;
    this.initializeState();
  }

  /** Update OPEX utilization from external BudgetTracker — call before canCall() checks */
  public setOpexUtilization(percent: number): void {
    this.opexUtilizationPercent = Math.max(0, Math.min(100, percent));
  }

  /** SA: Record whether a call was a slow-edge call. Call after each isSlowEdge() check. */
  public recordSlowEdge(wasSlowEdge: boolean): void {
    this.totalCalls++;
    if (wasSlowEdge) this.slowEdgeCalls++;
  }

  /** SA: Returns fraction of calls that exceeded slow-edge threshold (0–1) */
  public getSlowEdgeRatio(): number {
    if (this.totalCalls === 0) return 0;
    return this.slowEdgeCalls / this.totalCalls;
  }

  /**
   * SA: Returns the suggested next scenario band if slow-edge ratio > threshold.
   * Escalates: baseline→adverse→severe→critical. Never de-escalates.
   */
  public autoEscalateScenario(): ScenarioBand {
    const ratio = this.getSlowEdgeRatio();
    if (ratio <= this.slowEdgeRatioThreshold) return this.scenario;
    const BANDS: ScenarioBand[] = ['baseline', 'adverse', 'severe', 'critical'];
    const currentIndex = BANDS.indexOf(this.scenario);
    const nextIndex = Math.min(currentIndex + 1, BANDS.length - 1);
    return BANDS[nextIndex];
  }

  /** SA (Inverted Door): Dynamically escalate the MAX boundary if density threshold breaches */
  public getDynamicMaxCallsPerSession(): number {
    const ratio = this.getSlowEdgeRatio();
    if (ratio > this.slowEdgeRatioThreshold) {
      const ceiling = Math.min(AdvisorCircuitBreaker.MAX_MAX_CALLS_PER_SESSION, Math.floor(48 * Math.max(ratio, 0.5)));
      return Math.max(this.maxCallsPerSession, ceiling);
    }
    return this.maxCallsPerSession;
  }

  /** Returns true if latencyMs exceeds the slow-edge threshold for the current scenario band */
  public isSlowEdge(latencyMs: number): boolean {
    return latencyMs >= SLOW_EDGE_THRESHOLDS_MS[this.scenario];
  }

  /** Gate check: false if OPEX utilization >= 95% OR session is exhausted */
  public canCall(): boolean {
    if (this.opexUtilizationPercent >= AdvisorCircuitBreaker.OPEX_GATE_THRESHOLD) return false;
    return this.getCallsCount() < this.getDynamicMaxCallsPerSession();
  }

  private resolveMaxCallsPerSession(explicitMaxCalls?: number): number {
    const envRaw = process.env.ADVISOR_MAX_CALLS_PER_SESSION;
    const envParsed = envRaw !== undefined ? Number.parseInt(envRaw, 10) : Number.NaN;
    const candidate = explicitMaxCalls ?? (Number.isFinite(envParsed) ? envParsed : AdvisorCircuitBreaker.DEFAULT_MAX_CALLS_PER_SESSION);

    if (!Number.isFinite(candidate) || candidate < AdvisorCircuitBreaker.MIN_MAX_CALLS_PER_SESSION) {
      return AdvisorCircuitBreaker.DEFAULT_MAX_CALLS_PER_SESSION;
    }

    return Math.min(candidate, AdvisorCircuitBreaker.MAX_MAX_CALLS_PER_SESSION);
  }

  private initializeState(): void {
    if (!fs.existsSync(this.stateFilePath)) {
      this.writeState({ callsTracked: 0 });
    }
  }

  private readState(): { callsTracked: number } {
    try {
      const data = fs.readFileSync(this.stateFilePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return { callsTracked: 0 };
    }
  }

  private writeState(state: { callsTracked: number }): void {
    try {
      fs.mkdirSync(path.dirname(this.stateFilePath), { recursive: true });
      fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
    } catch (err) {
      console.warn('Failed to persist circuit breaker state:', err);
    }
  }

  public incrementCall(): CircuitBreakerSnapshot {
    const currentState = this.readState();
    currentState.callsTracked += 1;
    
    const currentMax = this.getDynamicMaxCallsPerSession();
    const softLimit = Math.max(
      1,
      Math.floor(currentMax * this.softLimitPercent),
    );

    if (currentState.callsTracked >= softLimit && currentState.callsTracked <= currentMax) {
      console.warn(
        `[AdvisorCircuitBreaker] Slow-edge boundary nearing limit: ${currentState.callsTracked}/${currentMax} calls in this session.`,
      );
    }

    if (currentState.callsTracked > currentMax) {
      console.warn(
        `[AdvisorCircuitBreaker] Hard ${currentMax}-call-per-session ceiling exceeded. ` +
        `This is a structural bound enforced via ADR-092. ` +
        `LBEC OFFLOAD TRIGGERED natively to bypass Frugal Mode limits.`
      );
      this.writeState(currentState);
      return {
        ...this.getSnapshot(),
        LBEC_OFFLOAD_STATUS: true,
        lbecEndpointTarget: 'tag.ooo_internal_cloud_router'
      };
    }

    this.writeState(currentState);
    return {
      ...this.getSnapshot(),
      LBEC_OFFLOAD_STATUS: false
    };
  }

  public getMaxCallsPerSession(): number {
    return this.getDynamicMaxCallsPerSession();
  }

  public resetSession(): void {
    this.writeState({ callsTracked: 0 });
  }

  public getCallsCount(): number {
    return this.readState().callsTracked;
  }

  public getSnapshot(): CircuitBreakerSnapshot {
    const callsTracked = this.getCallsCount();
    const currentMax = this.getDynamicMaxCallsPerSession();
    const utilizationPercent = (callsTracked / currentMax) * 100;
    const softLimit = Math.max(
      1,
      Math.floor(currentMax * this.softLimitPercent),
    );

    return {
      callsTracked,
      maxCallsPerSession: currentMax,
      remainingCalls: Math.max(0, currentMax - callsTracked),
      utilizationPercent,
      nearLimit: callsTracked >= softLimit,
      opexUtilizationPercent: this.opexUtilizationPercent,
      opexGated: this.opexUtilizationPercent >= AdvisorCircuitBreaker.OPEX_GATE_THRESHOLD,
      scenario: this.scenario,
      slowEdgeRatio: this.getSlowEdgeRatio(),
      vectorId: this.vectorId,
      suggestedScenario: this.autoEscalateScenario(),
      slowEdgeFractionString: `${this.getSlowEdgeRatio().toFixed(2)} (${this.slowEdgeCalls}/${this.totalCalls})`,
    };
  }
}
