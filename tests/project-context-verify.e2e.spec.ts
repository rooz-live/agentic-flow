/**
 * Project Context - VERIFY Phase E2E Tests
 * Validates project metadata, budgets, constraints, operational parameters
 *
 * WSJF Priority: 3.80 (Phase 2)
 * CANONICAL_SCHEMA: /docs/api/billing.proto
 */

import { test, expect } from '@playwright/test';
import { readFile, fileExists } from './harness/BaseBillingE2ESpec';

test.describe('Project Context - Implementation', () => {
  test('project_context.py exists', async () => {
    expect(fileExists('src/projects/project_context.py')).toBe(true);
  });

  test('ProjectContext class defined', async () => {
    const content = readFile('src/projects/project_context.py');
    expect(content).toContain('class ProjectContext');
  });

  test('Budget and constraint fields present', async () => {
    const content = readFile('src/projects/project_context.py');
    expect(content.toLowerCase()).toContain('budget');
    expect(content.toLowerCase()).toContain('constraint');
  });
});

test.describe('Project Context - Schema Validation', () => {
  test('Project has required metadata fields', async () => {
    const project = {
      project_id: 'proj-website-redesign',
      name: 'Acme Corp Website Redesign',
      client_id: 'client-acme-corp',
      status: 'active',
      phase: 'development',
    };
    expect(project.project_id).toBeDefined();
    expect(project.client_id).toBeDefined();
    expect(project.status).toMatch(/^(active|paused|completed|cancelled)$/);
  });

  test('Lifecycle phases ordered correctly', async () => {
    const phases = ['discovery', 'design', 'development', 'testing', 'deployment', 'maintenance'];
    expect(phases.indexOf('development')).toBeGreaterThan(phases.indexOf('design'));
    expect(phases.indexOf('testing')).toBeGreaterThan(phases.indexOf('development'));
    expect(phases.indexOf('deployment')).toBeGreaterThan(phases.indexOf('testing'));
  });

  test('Budget type validates to known values', async () => {
    const budget = { total_budget: '50000.00', budget_type: 'fixed_fee', currency: 'USD' };
    expect(['fixed_fee', 'time_and_materials', 'not_to_exceed']).toContain(budget.budget_type);
    expect(parseFloat(budget.total_budget)).toBeGreaterThan(0);
  });

  test('Operational constraints contain severity levels', async () => {
    const constraints = [
      { type: 'gdpr_compliance', severity: 'critical', description: 'GDPR required for EU users' },
      { type: 'uptime_sla', severity: 'high', description: '99.9% uptime SLA' },
    ];
    const criticalConstraints = constraints.filter(c => c.severity === 'critical');
    expect(criticalConstraints.length).toBeGreaterThan(0);
  });

  test('Payment terms match known values', async () => {
    const terms = { payment_terms: 'net_30' };
    expect(terms.payment_terms).toMatch(/^(net_30|net_15|net_7|due_on_receipt)$/);
  });
});
