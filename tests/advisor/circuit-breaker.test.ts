/**
 * Circuit Breaker + OPEX Budget Authorizer Tests
 * Red-Green-Refactor — WSJF: Business Value=9 / Time Criticality=8 / Risk Reduction=9 / Size=2 → WSJF=13
 *
 * Tests define expected behaviour BEFORE implementation is upgraded.
 * Run: npx vitest run tests/advisor/circuit-breaker.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { AdvisorCircuitBreaker } from '../../src/routing/advisor/circuit-breaker';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tmpState = (suffix: string) =>
  path.join(process.cwd(), '.goalie', `test_cb_${suffix}.json`);

function cleanUp(p: string) {
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// ─── Suite: Core session bounds ───────────────────────────────────────────────

describe('AdvisorCircuitBreaker — session bounds', () => {
  let stateFile: string;
  let cb: AdvisorCircuitBreaker;

  beforeEach(() => {
    stateFile = tmpState(Date.now().toString());
    cb = new AdvisorCircuitBreaker({ maxCallsPerSession: 4, stateFilePath: stateFile });
  });

  afterEach(() => cleanUp(stateFile));

  it('starts at zero calls', () => {
    expect(cb.getCallsCount()).toBe(0);
  });

  it('increments on each call and returns snapshot', () => {
    const snap = cb.incrementCall();
    expect(snap.callsTracked).toBe(1);
    expect(snap.remainingCalls).toBe(3);
    expect(snap.utilizationPercent).toBeCloseTo(25);
  });

  it('nearLimit triggers at softLimit (80% default)', () => {
    cb.incrementCall(); // 1
    cb.incrementCall(); // 2
    cb.incrementCall(); // 3 — 75% → below 80% soft
    const snap = cb.incrementCall(); // 4 — 100% → at/above soft (floor(4*0.8)=3)
    expect(snap.nearLimit).toBe(true);
  });

  it('throws hard error when maxCalls exceeded', () => {
    cb.incrementCall();
    cb.incrementCall();
    cb.incrementCall();
    cb.incrementCall();
    expect(() => cb.incrementCall()).toThrow(/Hard 4-call-per-session ceiling exceeded/);
  });

  it('resetSession brings count back to zero', () => {
    cb.incrementCall();
    cb.incrementCall();
    cb.resetSession();
    expect(cb.getCallsCount()).toBe(0);
  });

  it('persists state across instances sharing same file', () => {
    cb.incrementCall();
    cb.incrementCall();
    const cb2 = new AdvisorCircuitBreaker({ maxCallsPerSession: 4, stateFilePath: stateFile });
    expect(cb2.getCallsCount()).toBe(2);
  });
});

// ─── Suite: Scenario-band slow-edge thresholds ────────────────────────────────

describe('AdvisorCircuitBreaker — scenario-band slow-edge detection', () => {
  let stateFile: string;

  beforeEach(() => {
    stateFile = tmpState(`scenario_${Date.now()}`);
  });
  afterEach(() => cleanUp(stateFile));

  it.each([
    ['baseline', 2000,  true],   // 2000ms ≥ 2000 baseline slow-edge threshold
    ['baseline', 1999,  false],  // just under
    ['adverse',  4000,  true],
    ['adverse',  3999,  false],
    ['severe',   9000,  true],
    ['critical', 15000, true],
  ] as const)('scenario=%s latency=%dms isSlowEdge=%s', (scenario, latencyMs, expected) => {
    const cb = new AdvisorCircuitBreaker({ stateFilePath: stateFile, scenario });
    expect(cb.isSlowEdge(latencyMs)).toBe(expected);
  });
});

// ─── Suite: OPEX gating integration ──────────────────────────────────────────

describe('AdvisorCircuitBreaker — OPEX budget gate', () => {
  let stateFile: string;

  beforeEach(() => {
    stateFile = tmpState(`opex_${Date.now()}`);
  });
  afterEach(() => cleanUp(stateFile));

  it('canCall() returns false when OPEX utilization >= 95%', () => {
    const cb = new AdvisorCircuitBreaker({
      stateFilePath: stateFile,
      opexUtilizationPercent: 96,
    });
    expect(cb.canCall()).toBe(false);
  });

  it('canCall() returns true when OPEX utilization < 95%', () => {
    const cb = new AdvisorCircuitBreaker({
      stateFilePath: stateFile,
      opexUtilizationPercent: 80,
    });
    expect(cb.canCall()).toBe(true);
  });

  it('getSnapshot includes opexUtilizationPercent', () => {
    const cb = new AdvisorCircuitBreaker({
      stateFilePath: stateFile,
      opexUtilizationPercent: 72.4,
    });
    const snap = cb.getSnapshot();
    expect(snap.opexUtilizationPercent).toBeCloseTo(72.4);
    expect(snap.opexGated).toBe(false);
  });
});
