/**
 * OPEX Test Budget Authorizer Tests
 * Red-Green-Refactor — WSJF: BV=9 / TC=8 / RR=8 / Size=2 → WSJF=12.5
 *
 * Tests define expected behaviour for the formal OPEX allocation script
 * that gates swarm experiments behind budget approval.
 */

import * as fs from 'fs';
import * as path from 'path';

// This import will fail (RED) until opex-test-budget-authorizer.ts is created
import {
  authorizeTestBudget,
  getSwarmBudgetStatus,
  recordSwarmExpenseAndGate,
  OPEXAuthorizationResult,
  SwarmBudgetStatus,
  SwarmScenario,
} from '../../src/integrations/opex-test-budget-authorizer';

const TEST_DB = path.join(process.cwd(), 'logs', `opex_test_${Date.now()}.db`);

afterAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

// ─── Suite: Budget authorization ─────────────────────────────────────────────

describe('authorizeTestBudget', () => {
  it('approves allocation within budget', async () => {
    const result: OPEXAuthorizationResult = await authorizeTestBudget({
      dbPath: TEST_DB,
      scenario: 'baseline',
      requestedAmount: 5.00,
      allocatedBudget: 100.00,
      alreadySpent: 20.00,
    });
    expect(result.approved).toBe(true);
    expect(result.scenario).toBe('baseline');
    expect(result.remainingBudget).toBeCloseTo(75.00);
    expect(result.utilizationAfter).toBeCloseTo(25);
  });

  it('rejects allocation that would breach critical threshold (95%)', async () => {
    const result: OPEXAuthorizationResult = await authorizeTestBudget({
      dbPath: TEST_DB,
      scenario: 'critical',
      requestedAmount: 10.00,
      allocatedBudget: 100.00,
      alreadySpent: 92.00,  // 92 + 10 = 102 → >95%
    });
    expect(result.approved).toBe(false);
    expect(result.rejectionReason).toMatch(/critical.*threshold|budget.*exceeded/i);
  });

  it('applies scenario multiplier for adverse band', async () => {
    const result: OPEXAuthorizationResult = await authorizeTestBudget({
      dbPath: TEST_DB,
      scenario: 'adverse',
      requestedAmount: 5.00,
      allocatedBudget: 100.00,
      alreadySpent: 0,
    });
    // adverse multiplier = 1.25 → effective cost = 6.25
    expect(result.effectiveCost).toBeCloseTo(6.25);
    expect(result.approved).toBe(true);
  });

  it('applies scenario multiplier for severe band', async () => {
    const result: OPEXAuthorizationResult = await authorizeTestBudget({
      dbPath: TEST_DB,
      scenario: 'severe',
      requestedAmount: 5.00,
      allocatedBudget: 100.00,
      alreadySpent: 0,
    });
    // severe multiplier = 1.75 → effective cost = 8.75
    expect(result.effectiveCost).toBeCloseTo(8.75);
  });

  it('applies scenario multiplier for critical band', async () => {
    const result: OPEXAuthorizationResult = await authorizeTestBudget({
      dbPath: TEST_DB,
      scenario: 'critical',
      requestedAmount: 5.00,
      allocatedBudget: 100.00,
      alreadySpent: 0,
    });
    // critical multiplier = 2.5 → effective cost = 12.50
    expect(result.effectiveCost).toBeCloseTo(12.50);
  });
});

// ─── Suite: Swarm budget status ───────────────────────────────────────────────

describe('getSwarmBudgetStatus', () => {
  it('returns status object with all required fields', async () => {
    const status: SwarmBudgetStatus = await getSwarmBudgetStatus({ dbPath: TEST_DB });
    expect(status).toHaveProperty('allocatedBudget');
    expect(status).toHaveProperty('spentAmount');
    expect(status).toHaveProperty('utilizationPercent');
    expect(status).toHaveProperty('gateOpen');
    expect(status).toHaveProperty('recommendedScenario');
    expect(['baseline', 'adverse', 'severe', 'critical']).toContain(status.recommendedScenario);
  });

  it('gate is open when utilization < 95%', async () => {
    const status: SwarmBudgetStatus = await getSwarmBudgetStatus({
      dbPath: TEST_DB,
      mockUtilization: 60,
    });
    expect(status.gateOpen).toBe(true);
  });

  it('gate is closed when utilization >= 95%', async () => {
    const status: SwarmBudgetStatus = await getSwarmBudgetStatus({
      dbPath: TEST_DB,
      mockUtilization: 96,
    });
    expect(status.gateOpen).toBe(false);
  });
});

// ─── Suite: Record expense and re-gate ────────────────────────────────────────

describe('recordSwarmExpenseAndGate', () => {
  it('records expense and returns updated gate status', async () => {
    const result = await recordSwarmExpenseAndGate({
      dbPath: TEST_DB,
      scenario: 'baseline',
      amount: 3.50,
      description: 'SwarmCycle baseline dry run',
      category: 'api',
    });
    expect(result.expenseRecorded).toBe(true);
    expect(result.expenseId).toMatch(/^exp_/);
    expect(result.budgetStatus.spentAmount).toBeGreaterThan(0);
  });

  it('unleash decision = UNLEASH when gate open and utilization < 70%', async () => {
    const result = await recordSwarmExpenseAndGate({
      dbPath: TEST_DB,
      scenario: 'baseline',
      amount: 1.00,
      description: 'test',
      category: 'api',
      mockUtilization: 40,
    });
    expect(result.bmlDecision).toBe('UNLEASH');
  });

  it('unleash decision = REHEARSE when utilization 70-94%', async () => {
    const result = await recordSwarmExpenseAndGate({
      dbPath: TEST_DB,
      scenario: 'adverse',
      amount: 1.00,
      description: 'test',
      category: 'api',
      mockUtilization: 80,
    });
    expect(result.bmlDecision).toBe('REHEARSE');
  });

  it('unleash decision = ITERATE when gate closed', async () => {
    const result = await recordSwarmExpenseAndGate({
      dbPath: TEST_DB,
      scenario: 'critical',
      amount: 1.00,
      description: 'test',
      category: 'api',
      mockUtilization: 96,
    });
    expect(result.bmlDecision).toBe('ITERATE');
  });
});
