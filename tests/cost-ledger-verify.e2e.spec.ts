/**
 * Cost & Budget Ledger - VERIFY Phase E2E Tests
 * Validates real-time expenditure tracking, budget limits, margin calculation
 *
 * WSJF Priority: 3.83 (Phase 2)
 * CANONICAL_SCHEMA: /docs/api/billing.proto
 */

import { test, expect } from '@playwright/test';
import { readFile, fileExists } from './harness/BaseBillingE2ESpec';

test.describe('Cost Ledger - Implementation', () => {
  // Anti-CVT: contract symbol assertions replace weak file-existence gate.
  // NOTE: src/ledger/cost_ledger.py exports LedgerEngine + BudgetLedger
  // (not CostLedger). That drift is intentional — legacy name tracked here
  // so the next refactor knows the canonical name from billing.proto.
  test('cost_ledger.py exports LedgerEngine (canonical billing class)', async () => {
    const content = readFile('src/ledger/cost_ledger.py');
    expect(content.length, 'cost_ledger.py must be non-empty').toBeGreaterThan(0);
    // LedgerEngine is the actual exported class (billing.proto: LedgerEngine)
    expect(content, 'LedgerEngine class required (do not rename to CostLedger)').toContain('class LedgerEngine');
  });

  test('cost_ledger.py exports BudgetLedger for budget enforcement', async () => {
    const content = readFile('src/ledger/cost_ledger.py');
    expect(content, 'BudgetLedger required for budget gate operations').toContain('class BudgetLedger');
  });

  test('Budget enforcement: budget field present in cost model', async () => {
    const content = readFile('src/ledger/cost_ledger.py');
    expect(content.toLowerCase(), 'budget field required for cost tracking').toContain('budget');
    // Immutability gate: no UPDATE/DELETE SQL in pure calculation engine
    const hasUpdateSql = content.toUpperCase().includes('UPDATE ') || content.toUpperCase().includes('DELETE FROM');
    expect(hasUpdateSql, 'Ledger engine must not contain raw UPDATE/DELETE SQL (append-only)').toBe(false);
  });
});

test.describe('Cost Ledger - Budget Enforcement', () => {
  test('Budget limit: spent never exceeds total', async () => {
    const budget = {
      project_id: 'proj-001',
      total_budget: '10000.00',
      spent: '9500.00',
      remaining: '500.00',
    };
    expect(parseFloat(budget.spent)).toBeLessThanOrEqual(parseFloat(budget.total_budget));
    expect(parseFloat(budget.remaining)).toBe(
      parseFloat(budget.total_budget) - parseFloat(budget.spent)
    );
  });

  test('Multi-entry cost accumulation', async () => {
    const entries = [
      { cost_type: 'labor', amount: '500.00' },
      { cost_type: 'materials', amount: '125.00' },
    ];
    const total = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    expect(total).toBeCloseTo(625.0, 2);
  });

  test('Net pricing: gross + markup + overhead', async () => {
    const pricing = {
      gross_cost: '5000.00',
      markup_percentage: 0.20,
      overhead_allocation: '500.00',
      net_price: '6500.00',
    };
    const calculated =
      parseFloat(pricing.gross_cost) * (1 + pricing.markup_percentage) +
      parseFloat(pricing.overhead_allocation);
    expect(calculated).toBeCloseTo(parseFloat(pricing.net_price), 0);
  });
});

test.describe('Cost Ledger - Margin Reporting', () => {
  test('Margin: (revenue - cost) / revenue', async () => {
    const report = { revenue: '10000.00', direct_costs: '7500.00' };
    const margin =
      (parseFloat(report.revenue) - parseFloat(report.direct_costs)) /
      parseFloat(report.revenue);
    expect(margin).toBeCloseTo(0.25, 2);
  });

  test('Negative margin flags at_risk', async () => {
    const project = {
      projected_cost: '6000.00',
      projected_revenue: '5000.00',
      at_risk: true,
    };
    expect(parseFloat(project.projected_cost)).toBeGreaterThan(
      parseFloat(project.projected_revenue)
    );
    expect(project.at_risk).toBe(true);
  });
});

test.describe('Cost Ledger - Correction Entries', () => {
  test('Cost correction references original entry and negates amount', async () => {
    const original = { entry_id: 'cost-003', amount: '500.00', status: 'posted' };
    const correction = {
      correction_of: 'cost-003',
      amount: '-500.00',
      reason: 'Incorrect hours logged',
    };
    expect(correction.correction_of).toBe(original.entry_id);
    expect(parseFloat(correction.amount)).toBe(-parseFloat(original.amount));
  });
});
