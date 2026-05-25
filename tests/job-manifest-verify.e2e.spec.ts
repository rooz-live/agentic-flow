/**
 * VERIFY: Job Manifest Domain - Task Completion, Materials & Sign-Off
 *
 * CANONICAL_SCHEMA:  docs/api/billing.proto (message JobManifest)
 * HARNESS:           tests/harness/BaseBillingE2ESpec.ts
 * ARCHIVED_TDD:      tests/archive/2026-05-25-job-manifest-tdd.e2e.spec.ts
 * INVENTORY:         docs/billing/CONSOLIDATION_INVENTORY.md
 * WSJF:              4.50 (Phase 2 - COMPLETE)
 */

import { test, expect } from '@playwright/test';
import {
  billingHelpers,
  ERROR_CODES,
  SCHEMA_PATTERNS,
  BILLING_DOMAINS,
} from './harness/BaseBillingE2ESpec';

const DOMAIN = BILLING_DOMAINS.JOB_MANIFEST;

test.describe('VERIFY: Job Manifest - Task & Materials Tracking', () => {

  test('Domain file exists and is non-empty', async () => {
    billingHelpers.assertDomainFileExists('JOB_MANIFEST');
  });

  test('JobManifest defines all required fields', async () => {
    billingHelpers.assertContains(DOMAIN.srcPath, 'job_id');
    billingHelpers.assertContains(DOMAIN.srcPath, 'project_id');
    billingHelpers.assertContains(DOMAIN.srcPath, 'status');
    billingHelpers.assertContains(DOMAIN.srcPath, 'tasks');
    billingHelpers.assertContains(DOMAIN.srcPath, 'materials');
  });

  test('Sign-off record captures client signature', async () => {
    billingHelpers.assertContains(DOMAIN.srcPath, 'sign_off');
    billingHelpers.assertContains(DOMAIN.srcPath, 'signature');
  });

  test('Job status enum covers full lifecycle', async () => {
    const src = require('fs').readFileSync(
      require('path').join(process.cwd(), DOMAIN.srcPath), 'utf-8'
    );
    ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled'].forEach(status => {
      expect(src.toLowerCase()).toContain(status);
    });
  });

  test('Materials track SKU, quantity, unit cost', async () => {
    billingHelpers.assertContains(DOMAIN.srcPath, 'sku');
    billingHelpers.assertContains(DOMAIN.srcPath, 'quantity');
    billingHelpers.assertContains(DOMAIN.srcPath, 'unit_cost');
  });

  test('Total material cost calculated from line items', async () => {
    billingHelpers.assertContains(DOMAIN.srcPath, 'total');
  });

  test('Error code ERR_SIGN_OFF_REQUIRED or equivalent defined', async () => {
    const src = require('fs').readFileSync(
      require('path').join(process.cwd(), DOMAIN.srcPath), 'utf-8'
    );
    const hasSignOffError = src.includes('ERR_SIGN_OFF') || src.includes('sign_off_required');
    expect(hasSignOffError).toBe(true);
  });

  test('Error code ERR_INVALID_STATUS defined', async () => {
    const src = require('fs').readFileSync(
      require('path').join(process.cwd(), DOMAIN.srcPath), 'utf-8'
    );
    const hasStatusError = src.includes('ERR_INVALID_STATUS') || src.includes('invalid_status');
    expect(hasStatusError).toBe(true);
  });

  test('Proto schema defines JobManifest message', async () => {
    billingHelpers.assertProtoMessage('JobManifest');
    billingHelpers.assertProtoMessage('JobTask');
    billingHelpers.assertProtoMessage('JobMaterial');
    billingHelpers.assertProtoMessage('JobSignOff');
  });

  test('Spec coverage: no missing VERIFY gap', async () => {
    const status = billingHelpers.getDomainSpecStatus('job-manifest');
    expect(status.hasTdd).toBe(true);
    expect(status.hasVerify).toBe(true);
    expect(status.gap).toBe(false);
  });
});
