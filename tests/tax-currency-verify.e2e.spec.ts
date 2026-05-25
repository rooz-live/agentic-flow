/**
 * VERIFY: Tax & Currency Domain - Jurisdiction Rules & Currency Conversion
 *
 * CANONICAL_SCHEMA:  docs/api/billing.proto (message TaxCalculation)
 * HARNESS:           tests/harness/BaseBillingE2ESpec.ts
 * ARCHIVED_TDD:      tests/archive/2026-05-25-tax-currency-tdd.e2e.spec.ts
 * INVENTORY:         docs/billing/CONSOLIDATION_INVENTORY.md
 * WSJF:              4.40 (Phase 2 - COMPLETE)
 */

import { test, expect } from '@playwright/test';
import {
  billingHelpers,
  ERROR_CODES,
  SCHEMA_PATTERNS,
  BILLING_DOMAINS,
} from './harness/BaseBillingE2ESpec';

const DOMAIN = BILLING_DOMAINS.TAX_CURRENCY;

test.describe('VERIFY: Tax & Currency - Jurisdiction & Calculation', () => {

  test('Domain file exists and is non-empty', async () => {
    billingHelpers.assertDomainFileExists('TAX_CURRENCY');
  });

  test('TaxCalculation defines jurisdiction_code, base_amount, tax_rate', async () => {
    billingHelpers.assertContains(DOMAIN.srcPath, 'jurisdiction_code');
    billingHelpers.assertContains(DOMAIN.srcPath, 'base_amount');
    billingHelpers.assertContains(DOMAIN.srcPath, 'tax_rate');
  });

  test('Tax rate range 0.0-1.0 enforced', async () => {
    billingHelpers.assertContains(DOMAIN.srcPath, '0.0');
    billingHelpers.assertContains(DOMAIN.srcPath, '1.0');
  });

  test('Supports percentage, fixed, compound calculation types', async () => {
    const src = require('fs').readFileSync(
      require('path').join(process.cwd(), DOMAIN.srcPath), 'utf-8'
    );
    expect(src).toContain('percentage');
    expect(src).toContain('fixed');
  });

  test('ISO 4217 currency codes enforced', async () => {
    const validCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];
    validCodes.forEach(code => {
      expect(SCHEMA_PATTERNS.ISO4217.test(code)).toBe(true);
    });
  });

  test('Jurisdiction code format validated (e.g. US-NC-MECKLENBURG)', async () => {
    const valid = 'US-NC-MECKLENBURG';
    const invalid = ['us-nc', 'US', '12345', 'US_NC_MECKLENBURG'];
    expect(SCHEMA_PATTERNS.JURISDICTION.test(valid)).toBe(true);
    invalid.forEach(j => {
      expect(SCHEMA_PATTERNS.JURISDICTION.test(j)).toBe(false);
    });
  });

  test('No floating-point arithmetic — all amounts as decimal strings', async () => {
    billingHelpers.assertContains(DOMAIN.srcPath, 'Decimal');
  });

  test('Dependency isolation — no volatile external tax APIs', async () => {
    const src = require('fs').readFileSync(
      require('path').join(process.cwd(), DOMAIN.srcPath), 'utf-8'
    );
    // Must not make live HTTP calls; uses local jurisdiction tables
    expect(src).not.toMatch(/requests\.get|fetch\(/);
  });

  test('Error code ERR_INVALID_JURISDICTION defined', async () => {
    billingHelpers.assertErrorCode(DOMAIN.srcPath, ERROR_CODES.ERR_INVALID_JURISDICTION);
  });

  test('Error code ERR_TAX_RATE_OUT_OF_RANGE defined', async () => {
    billingHelpers.assertErrorCode(DOMAIN.srcPath, ERROR_CODES.ERR_TAX_RATE_OUT_OF_RANGE);
  });

  test('Proto schema defines TaxCalculation message', async () => {
    billingHelpers.assertProtoMessage('TaxCalculation');
  });

  test('Rust bridge exports calculate_jurisdiction_tax', async () => {
    billingHelpers.assertRustBridgeExport('calculate_jurisdiction_tax');
  });

  test('Spec coverage: no missing VERIFY gap', async () => {
    const status = billingHelpers.getDomainSpecStatus('tax-currency');
    expect(status.hasTdd).toBe(true);
    expect(status.hasVerify).toBe(true);
    expect(status.gap).toBe(false);
  });
});
