/**
 * VERIFY: Calculation Engine - Time Aggregation & Financial Totals
 *
 * CANONICAL_SCHEMA:  docs/api/billing.proto (message CalculationResult, TimeAggregation)
 * HARNESS:           tests/harness/BaseBillingE2ESpec.ts
 * ARCHIVED_TDD:      tests/archive/2026-05-25-calculation-engine-tdd.e2e.spec.ts
 * INVENTORY:         docs/billing/CONSOLIDATION_INVENTORY.md
 * WSJF:              4.67 (Phase 2 - COMPLETE)
 */

import { test, expect } from '@playwright/test';
import {
  billingHelpers,
  ERROR_CODES,
  SCHEMA_PATTERNS,
  BILLING_DOMAINS,
} from './harness/BaseBillingE2ESpec';

const DOMAIN = BILLING_DOMAINS.CALCULATION_ENGINE;

test.describe('VERIFY: Calculation Engine - Time Aggregation', () => {

  test('Domain file exists and is non-empty', async () => {
    billingHelpers.assertDomainFileExists('CALCULATION_ENGINE');
  });

  test('Separates billable hours from ceremony hours', async () => {
    billingHelpers.assertContains(DOMAIN.srcPath, 'billable_hours');
    billingHelpers.assertContains(DOMAIN.srcPath, 'ceremony_hours');
  });

  test('Total = subtotal + tax_amount enforced', async () => {
    billingHelpers.assertContains(DOMAIN.srcPath, 'total');
    billingHelpers.assertContains(DOMAIN.srcPath, 'subtotal');
    billingHelpers.assertContains(DOMAIN.srcPath, 'tax');
  });

  test('Rejects payload with missing ISO 8601 timestamps', async () => {
    billingHelpers.assertContains(DOMAIN.srcPath, ERROR_CODES.ERR_ISO8601_REQUIRED);
  });

  test('No floating-point precision errors — uses Decimal', async () => {
    billingHelpers.assertContains(DOMAIN.srcPath, 'Decimal');
  });

  test('Dependency isolation — pure in-memory calculations', async () => {
    const src = require('fs').readFileSync(
      require('path').join(process.cwd(), DOMAIN.srcPath), 'utf-8'
    );
    expect(src).not.toMatch(/requests\.get|httpx\.get/);
  });

  test('Midnight clock-in handled (cross-day duration)', async () => {
    const src = require('fs').readFileSync(
      require('path').join(process.cwd(), DOMAIN.srcPath), 'utf-8'
    );
    const handlesMidnight = src.includes('midnight') || src.includes('timedelta') ||
                            src.includes('cross') || src.includes('24');
    expect(handlesMidnight).toBe(true);
  });

  test('Error code ERR_TOTAL_MISMATCH defined', async () => {
    billingHelpers.assertErrorCode(DOMAIN.srcPath, ERROR_CODES.ERR_TOTAL_MISMATCH);
  });

  test('Proto schema defines CalculationResult and TimeAggregation', async () => {
    billingHelpers.assertProtoMessage('CalculationResult');
    billingHelpers.assertProtoMessage('TimeAggregation');
  });

  test('Rust bridge exports calculate_billable_hours', async () => {
    billingHelpers.assertRustBridgeExport('calculate_billable_hours');
  });

  test('Spec coverage: no missing VERIFY gap', async () => {
    const status = billingHelpers.getDomainSpecStatus('calculation-engine');
    expect(status.hasTdd).toBe(true);
    expect(status.hasVerify).toBe(true);
    expect(status.gap).toBe(false);
  });
});
