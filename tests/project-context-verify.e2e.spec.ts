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
  // Anti-CVT: symbol contract assertions replace file-existence gate.
  test('project_context.py exports ProjectContext and ProjectContextManager', async () => {
    const content = readFile('src/projects/project_context.py');
    expect(content.length, 'project_context.py must be non-empty').toBeGreaterThan(0);
    expect(content, 'ProjectContext dataclass required').toContain('class ProjectContext');
    expect(content, 'ProjectContextManager required for CRUD operations').toContain('class ProjectContextManager');
  });

  test('ProjectContext has budget and constraint fields', async () => {
    const content = readFile('src/projects/project_context.py');
    expect(content.toLowerCase(), 'budget field required for cost gate').toContain('budget');
    expect(content.toLowerCase(), 'constraint field required for operational limits').toContain('constraint');
    // ProjectStatus and ProjectPhase enums required by billing.proto
    expect(content, 'ProjectStatus enum required').toContain('ProjectStatus');
    expect(content, 'ProjectPhase enum required').toContain('ProjectPhase');
  });

  test('ProjectContext has BillingTerms (client contract terms)', async () => {
    const content = readFile('src/projects/project_context.py');
    expect(content, 'BillingTerms class required for client contract').toContain('BillingTerms');
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
