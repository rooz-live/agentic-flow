import { AdvisorCircuitBreaker, SLOW_EDGE_THRESHOLDS_MS } from '../circuit-breaker';
import * as fs from 'fs';
import * as path from 'path';

describe('AdvisorCircuitBreaker', () => {
  const testStatePath = path.join(__dirname, '.test_circuit_breaker_state.json');

  beforeEach(() => {
    if (fs.existsSync(testStatePath)) {
      fs.unlinkSync(testStatePath);
    }
  });

  afterAll(() => {
    if (fs.existsSync(testStatePath)) {
      fs.unlinkSync(testStatePath);
    }
  });

  it('enforces maximum calls per session and throws when exceeded', () => {
    const cb = new AdvisorCircuitBreaker({ maxCallsPerSession: 3, stateFilePath: testStatePath });
    cb.incrementCall();
    cb.incrementCall();
    cb.incrementCall();
    expect(cb.canCall()).toBe(true);

    // 4th call should throw since max is 3
    expect(() => cb.incrementCall()).toThrow(/Hard 3-call-per-session ceiling exceeded/);
    expect(cb.canCall()).toBe(false);
  });

  it('gates execution when OPEX utilization >= 95%', () => {
    const cb = new AdvisorCircuitBreaker({ maxCallsPerSession: 5, stateFilePath: testStatePath, opexUtilizationPercent: 94 });
    expect(cb.canCall()).toBe(true);

    cb.setOpexUtilization(95);
    expect(cb.canCall()).toBe(false);
    expect(cb.getSnapshot().opexGated).toBe(true);
  });

  it('correctly reports slow edge calls according to scenario thresholds', () => {
    const cbBaseline = new AdvisorCircuitBreaker({ scenario: 'baseline', stateFilePath: testStatePath });
    expect(cbBaseline.isSlowEdge(SLOW_EDGE_THRESHOLDS_MS['baseline'] - 1)).toBe(false);
    expect(cbBaseline.isSlowEdge(SLOW_EDGE_THRESHOLDS_MS['baseline'])).toBe(true);

    const cbCritical = new AdvisorCircuitBreaker({ scenario: 'critical', stateFilePath: testStatePath });
    expect(cbCritical.isSlowEdge(SLOW_EDGE_THRESHOLDS_MS['critical'] - 1)).toBe(false);
    expect(cbCritical.isSlowEdge(SLOW_EDGE_THRESHOLDS_MS['critical'])).toBe(true);
  });
  
  it('auto escalates scenario when slow edge ratio exceeds threshold', () => {
    const cb = new AdvisorCircuitBreaker({ scenario: 'baseline', stateFilePath: testStatePath, slowEdgeRatioThreshold: 0.3 });
    cb.recordSlowEdge(false);
    cb.recordSlowEdge(false);
    expect(cb.autoEscalateScenario()).toBe('baseline');

    cb.recordSlowEdge(true);
    cb.recordSlowEdge(true);
    // 2 out of 4 is 0.5 > 0.3 threshold
    expect(cb.autoEscalateScenario()).toBe('adverse');
  });
});
