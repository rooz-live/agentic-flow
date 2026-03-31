import {
  calculateAgentCount,
  calculateTopology,
  splitAgentCountAcrossSandboxes,
  type RiskProfile,
} from '../../src/core/risk/riskAgentAllocation';

describe('riskAgentAllocation', () => {
  test('calculateAgentCount matches spec for baseline + complexity', () => {
    const risk: RiskProfile = { category: 'security', severity: 'medium', complexity: 10 };
    expect(calculateAgentCount(risk)).toBe(6);
  });

  test('calculateAgentCount clamps complexity to 1..10', () => {
    const risk: RiskProfile = { category: 'performance', severity: 'low', complexity: 999 };
    expect(calculateAgentCount(risk)).toBe(2);
  });

  test('calculateTopology defaults to mesh for high/critical', () => {
    const risk: RiskProfile = { category: 'compliance', severity: 'high', complexity: 1 };
    expect(calculateTopology(risk)).toBe('mesh');
  });

  test('splitAgentCountAcrossSandboxes respects maxAgentsPerSandbox', () => {
    expect(splitAgentCountAcrossSandboxes(11, 10)).toEqual([10, 1]);
  });
});
