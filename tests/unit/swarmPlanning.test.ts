import { planRiskBasedSwarm } from '../../src/core/swarm/swarmPlanning';

describe('swarmPlanning', () => {
  test('disables sandboxing when E2B_API_KEY absent and requireE2B is false', () => {
    const plan = planRiskBasedSwarm(
      { category: 'security', severity: 'medium', complexity: 5 },
      { env: {} },
    );
    expect(plan.sandboxing).toBe('disabled');
    expect(plan.agentCount).toBeGreaterThan(0);
  });

  test('enables sandboxing when E2B_API_KEY present', () => {
    const plan = planRiskBasedSwarm(
      { category: 'security', severity: 'critical', complexity: 10 },
      { env: { E2B_API_KEY: 'e2b_test_key' } },
    );

    expect(plan.sandboxing).toBe('enabled');
    expect(plan.e2b?.distribution.reduce((a, b) => a + b, 0)).toBe(plan.agentCount);
    expect(Math.max(...(plan.e2b?.distribution ?? []))).toBeLessThanOrEqual(10);
  });
});
