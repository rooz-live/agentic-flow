/**
 * Token Budget Enforcer Tests - REP-009
 * Unit tests for 4-tier environment budget enforcement
 */

import {
    CircuitState,
    EnvironmentTier,
    TOKEN_BUDGET_CONFIGS,
    TokenBudgetEnforcer,
    checkTokenBudget,
    detectEnvironmentTier,
    getEnvironmentBudget,
    getTokenBudgetEnforcer,
    resetTokenBudgetEnforcer
} from '../tokenBudgetEnforcer';

describe('TokenBudgetEnforcer - REP-009', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    delete process.env.AF_ENVIRONMENT;
    delete process.env.NODE_ENV;
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    resetTokenBudgetEnforcer();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Environment Detection', () => {
    it('should detect LOCAL tier by default', () => {
      expect(detectEnvironmentTier()).toBe(EnvironmentTier.LOCAL);
    });

    it('should detect PRODUCTION from AF_ENVIRONMENT=prod', () => {
      process.env.AF_ENVIRONMENT = 'prod';
      expect(detectEnvironmentTier()).toBe(EnvironmentTier.PRODUCTION);
    });

    it('should detect PRODUCTION from AF_ENVIRONMENT=production', () => {
      process.env.AF_ENVIRONMENT = 'production';
      expect(detectEnvironmentTier()).toBe(EnvironmentTier.PRODUCTION);
    });

    it('should detect STAGING from NODE_ENV=staging', () => {
      process.env.NODE_ENV = 'staging';
      expect(detectEnvironmentTier()).toBe(EnvironmentTier.STAGING);
    });

    it('should detect DEVELOPMENT from CI=true', () => {
      process.env.CI = 'true';
      expect(detectEnvironmentTier()).toBe(EnvironmentTier.DEVELOPMENT);
    });

    it('should prioritize AF_ENVIRONMENT over NODE_ENV', () => {
      process.env.AF_ENVIRONMENT = 'staging';
      process.env.NODE_ENV = 'production';
      expect(detectEnvironmentTier()).toBe(EnvironmentTier.STAGING);
    });
  });

  describe('Budget Configuration', () => {
    it('should have correct budget limits per tier', () => {
      expect(TOKEN_BUDGET_CONFIGS[EnvironmentTier.LOCAL].budgetLimit).toBe(50000);
      expect(TOKEN_BUDGET_CONFIGS[EnvironmentTier.DEVELOPMENT].budgetLimit).toBe(100000);
      expect(TOKEN_BUDGET_CONFIGS[EnvironmentTier.STAGING].budgetLimit).toBe(150000);
      expect(TOKEN_BUDGET_CONFIGS[EnvironmentTier.PRODUCTION].budgetLimit).toBe(200000);
    });

    it('should have 90% circuit breaker threshold', () => {
      Object.values(TOKEN_BUDGET_CONFIGS).forEach(config => {
        expect(config.circuitBreakerThreshold).toBe(0.90);
      });
    });
  });

  describe('Token Consumption', () => {
    let enforcer: TokenBudgetEnforcer;

    beforeEach(() => {
      process.env.AF_ENVIRONMENT = 'local';
      enforcer = new TokenBudgetEnforcer('test-session');
    });

    it('should allow consumption within budget', () => {
      const result = enforcer.checkAndConsume(10000);
      expect(result.allowed).toBe(true);
      expect(result.circuitState).toBe(CircuitState.CLOSED);
      expect(result.tokensRemaining).toBe(40000);
    });

    it('should trigger warning at 75% threshold', () => {
      enforcer.checkAndConsume(38000); // 76%
      const state = enforcer.getState();
      expect(state.warnings.length).toBeGreaterThan(0);
    });

    it('should open circuit breaker at 90% threshold', () => {
      const result = enforcer.checkAndConsume(46000); // 92%
      expect(result.allowed).toBe(false);
      expect(result.circuitState).toBe(CircuitState.OPEN);
      expect(result.degradationActive).toBe(true);
    });

    it('should block requests when circuit is OPEN and total still above threshold', () => {
      enforcer.checkAndConsume(46000); // Opens circuit (92% > 90%)
      // Next request: total would be 47000 tokens (94% > 90%), circuit stays OPEN
      const result = enforcer.checkAndConsume(5000);
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Circuit breaker OPEN');
    });

    it('should track tokens correctly', () => {
      enforcer.checkAndConsume(10000);
      enforcer.checkAndConsume(5000);
      const state = enforcer.getState();
      expect(state.tokensUsed).toBe(15000);
    });
  });

  describe('Circuit Breaker Recovery', () => {
    let enforcer: TokenBudgetEnforcer;

    beforeEach(() => {
      process.env.AF_ENVIRONMENT = 'local';
      enforcer = new TokenBudgetEnforcer('test-session');
    });

    it('should reset budget and close circuit', () => {
      enforcer.checkAndConsume(46000); // Opens circuit
      enforcer.resetBudget('new-session');
      const state = enforcer.getState();
      expect(state.circuitState).toBe(CircuitState.CLOSED);
      expect(state.tokensUsed).toBe(0);
      expect(state.degradationActive).toBe(false);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = getTokenBudgetEnforcer('session1');
      const instance2 = getTokenBudgetEnforcer('session2');
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton correctly', () => {
      const instance1 = getTokenBudgetEnforcer('session1');
      resetTokenBudgetEnforcer();
      const instance2 = getTokenBudgetEnforcer('session2');
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Convenience Functions', () => {
    it('should check budget via convenience function', () => {
      const result = checkTokenBudget(5000);
      expect(result.allowed).toBe(true);
    });

    it('should get environment budget', () => {
      process.env.AF_ENVIRONMENT = 'production';
      resetTokenBudgetEnforcer();
      const budget = getEnvironmentBudget();
      expect(budget.tier).toBe(EnvironmentTier.PRODUCTION);
      expect(budget.limit).toBe(200000);
    });
  });
});
