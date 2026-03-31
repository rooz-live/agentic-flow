import { getE2BConfigFromEnv, MissingE2BApiKeyError, planE2BProvisioning } from '../../src/core/sandbox/e2b';

describe('e2b integration seam', () => {
  test('getE2BConfigFromEnv throws if E2B_API_KEY missing', () => {
    expect(() => getE2BConfigFromEnv({})).toThrow(MissingE2BApiKeyError);
  });

  test('getE2BConfigFromEnv returns config with default limits', () => {
    const cfg = getE2BConfigFromEnv({ E2B_API_KEY: 'e2b_test_key' });
    expect(cfg.apiKey).toBe('e2b_test_key');
    expect(cfg.limits.maxAgentsPerSandbox).toBe(10);
  });

  test('planE2BProvisioning distributes agents across sandboxes', () => {
    const plan = planE2BProvisioning(21, 10);
    expect(plan.sandboxes).toBe(3);
    expect(plan.distribution).toEqual([10, 10, 1]);
  });
});
