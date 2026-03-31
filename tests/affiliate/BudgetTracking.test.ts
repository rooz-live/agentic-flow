/**
 * Budget Tracking Integration Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import {
    BudgetTracker,
    createBudgetTracker,
    Expense
} from '../../src/integrations/budget_tracking';

describe('BudgetTracker', () => {
  let tracker: BudgetTracker;
  const testDbPath = path.join(process.cwd(), 'logs', 'test_budget.db');

  beforeEach(() => {
    // Ensure logs directory exists
    const logsDir = path.dirname(testDbPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    // Remove test database if exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    tracker = new BudgetTracker({ dbPath: testDbPath });
  });

  afterEach(() => {
    tracker.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Expense Management', () => {
    it('should record CapEx expense', () => {
      const expense = tracker.recordExpense({
        type: 'capex',
        category: 'infrastructure',
        description: 'StarlingX Server Setup',
        amount: 5000,
        currency: 'USD',
        vendor: 'Dell',
        resourceId: '23.92.79.2',
      });

      expect(expense.id).toBeDefined();
      expect(expense.type).toBe('capex');
      expect(expense.amount).toBe(5000);
    });

    it('should record OpEx expense', () => {
      const expense = tracker.recordExpense({
        type: 'opex',
        category: 'hosting',
        description: 'AWS Monthly Cost',
        amount: 150,
        currency: 'USD',
        vendor: 'AWS',
        resourceId: 'i-097706d9355b9f1b2',
      });

      expect(expense.type).toBe('opex');
      expect(expense.category).toBe('hosting');
    });

    it('should retrieve expenses by type', () => {
      tracker.recordExpense({ type: 'capex', category: 'infrastructure', description: 'Server', amount: 5000, currency: 'USD' });
      tracker.recordExpense({ type: 'opex', category: 'api', description: 'API Cost', amount: 100, currency: 'USD' });
      tracker.recordExpense({ type: 'opex', category: 'stripe_fees', description: 'Stripe Fees', amount: 50, currency: 'USD' });

      const capexExpenses = tracker.getExpenses('capex');
      const opexExpenses = tracker.getExpenses('opex');

      expect(capexExpenses.length).toBe(1);
      expect(opexExpenses.length).toBe(2);
    });

    it('should emit event when expense recorded', () => {
      const recorded: Expense[] = [];
      tracker.on('expense:recorded', (e) => recorded.push(e));

      tracker.recordExpense({ type: 'capex', category: 'infrastructure', description: 'Test', amount: 1000, currency: 'USD' });
      expect(recorded.length).toBe(1);
    });
  });

  describe('Budget Management', () => {
    it('should create budget', () => {
      const budget = tracker.createBudget({
        name: 'Q4 Infrastructure',
        type: 'capex',
        allocatedAmount: 50000,
        currency: 'USD',
        periodStart: new Date('2024-10-01'),
        periodEnd: new Date('2024-12-31'),
      });

      expect(budget.id).toBeDefined();
      expect(budget.allocatedAmount).toBe(50000);
      expect(budget.spentAmount).toBe(0);
    });

    it('should retrieve budget by ID', () => {
      const created = tracker.createBudget({
        name: 'Monthly OpEx',
        type: 'opex',
        allocatedAmount: 5000,
        currency: 'USD',
        periodStart: new Date('2024-12-01'),
        periodEnd: new Date('2024-12-31'),
      });

      const retrieved = tracker.getBudget(created.id);
      expect(retrieved?.name).toBe('Monthly OpEx');
    });

    it('should update budget spent amount', () => {
      const budget = tracker.createBudget({
        name: 'Test Budget',
        type: 'opex',
        allocatedAmount: 1000,
        currency: 'USD',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      tracker.updateBudgetSpent(budget.id, 250);
      tracker.updateBudgetSpent(budget.id, 150);

      const updated = tracker.getBudget(budget.id);
      expect(updated?.spentAmount).toBe(400);
    });
  });

  describe('Alert Management', () => {
    it('should create warning alert at threshold', () => {
      const budget = tracker.createBudget({
        name: 'Alert Test',
        type: 'opex',
        allocatedAmount: 1000,
        currency: 'USD',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      tracker.updateBudgetSpent(budget.id, 850); // 85% - should trigger warning

      const alerts = tracker.getAlerts(false);
      expect(alerts.some(a => a.level === 'warning')).toBe(true);
    });

    it('should create critical alert at threshold', () => {
      const budget = tracker.createBudget({
        name: 'Critical Test',
        type: 'opex',
        allocatedAmount: 1000,
        currency: 'USD',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      tracker.updateBudgetSpent(budget.id, 960); // 96% - should trigger critical

      const alerts = tracker.getAlerts(false);
      expect(alerts.some(a => a.level === 'critical')).toBe(true);
    });

    it('should acknowledge alerts', () => {
      const budget = tracker.createBudget({
        name: 'Ack Test',
        type: 'opex',
        allocatedAmount: 1000,
        currency: 'USD',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      tracker.updateBudgetSpent(budget.id, 900);
      const alerts = tracker.getAlerts(false);

      if (alerts.length > 0) {
        tracker.acknowledgeAlert(alerts[0].id);
        const acknowledged = tracker.getAlerts(true);
        expect(acknowledged.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Forecasting', () => {
    it('should forecast budget utilization', () => {
      const budget = tracker.createBudget({
        name: 'Forecast Test',
        type: 'opex',
        allocatedAmount: 10000,
        currency: 'USD',
        periodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        periodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      });

      tracker.updateBudgetSpent(budget.id, 5000); // 50% spent halfway through

      const forecast = tracker.forecastBudget(budget.id);
      expect(forecast).not.toBeNull();
      expect(forecast?.projectedSpend).toBeGreaterThan(0);
      expect(forecast?.burnRate).toBeGreaterThan(0);
    });
  });

  describe('Summary', () => {
    it('should return correct summary', () => {
      tracker.recordExpense({ type: 'capex', category: 'infrastructure', description: 'Server', amount: 5000, currency: 'USD' });
      tracker.recordExpense({ type: 'opex', category: 'hosting', description: 'AWS', amount: 150, currency: 'USD' });
      tracker.recordExpense({ type: 'opex', category: 'api', description: 'API', amount: 50, currency: 'USD' });

      const summary = tracker.getSummary();
      expect(summary.capex.total).toBe(5000);
      expect(summary.opex.total).toBe(200);
    });
  });

  describe('Factory Functions', () => {
    it('should create tracker with factory function', () => {
      const factoryTracker = createBudgetTracker({ dbPath: ':memory:' });
      expect(factoryTracker).toBeInstanceOf(BudgetTracker);
      factoryTracker.close();
    });
  });
});
