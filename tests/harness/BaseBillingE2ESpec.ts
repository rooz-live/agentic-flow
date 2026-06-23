/**
 * BaseBillingE2ESpec — Sovereign Billing Harness (canonical, do NOT fork)
 *
 * CANONICAL_SCHEMA:    docs/api/billing.proto
 * INVENTORY:           docs/billing/CONSOLIDATION_INVENTORY.md
 * INTEGRATION_TEST:    tests/billing-platform-integration.e2e.spec.ts
 * ARCHIVED_FRAGMENTS:  tests/e2e/billing-verify.e2e.spec.ts (capabilities merged here)
 *                      tests/e2e/chunked-delivery.config.ts (FQDN registry merged here)
 *
 * Anti-CVT Rule: All billing domain specs extend this base.
 * Do NOT copy readFile/fileExists/PROJECT_ROOT into individual specs.
 * Do NOT create another "unified_*" harness — extend this file.
 *
 * Merged capabilities (2026-05-25 green-room):
 *   - FQDN_REGISTRY + getDomainBatch (from chunked-delivery.config.ts)
 *   - assertEdgeFQDN + assertStripeWebhookBoundary (from billing-verify.e2e.spec.ts)
 *   - INVOICE_ENGINE domain entry
 *   - Invoice error codes
 *
 * Usage:
 *   import { billingHelpers, ERROR_CODES, BILLING_DOMAINS, FQDN_REGISTRY } from '../harness/BaseBillingE2ESpec';
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ─── Path Helpers ───────────────────────────────────────────────────────────

export const PROJECT_ROOT = join(__dirname, '..', '..');

export function readFile(path: string): string {
  return readFileSync(join(PROJECT_ROOT, path), 'utf-8');
}

export function fileExists(path: string): boolean {
  return existsSync(join(PROJECT_ROOT, path));
}

export function requireFile(path: string): string {
  if (!fileExists(path)) {
    throw new Error(`Required file missing: ${path}`);
  }
  return readFile(path);
}

// ─── Domain Registry ────────────────────────────────────────────────────────

export const BILLING_DOMAINS = {
  ENTITY_IDENTITY: {
    name: 'entity-identity',
    srcPath: 'src/identity/entity_registry.py',
    wsjf: 4.80,
    phase: 2,
  },
  RATE_ENGINE: {
    name: 'rate-engine',
    srcPath: 'src/rates/rate_engine.py',
    wsjf: 4.33,
    phase: 2,
  },
  PROJECT_CONTEXT: {
    name: 'project-context',
    srcPath: 'src/projects/project_context.py',
    wsjf: 4.60,
    phase: 2,
  },
  EVENTOPS: {
    name: 'eventops',
    srcPath: 'src/eventops/event_logger.py',
    wsjf: 4.75,
    phase: 2,
  },
  CEREMONY_LOGGER: {
    name: 'ceremony-logger',
    srcPath: 'src/ceremony/ceremony_logger.py',
    wsjf: 4.75,
    phase: 2,
  },
  JOB_MANIFEST: {
    name: 'job-manifest',
    srcPath: 'src/jobs/job_manifest.py',
    wsjf: 4.50,
    phase: 2,
  },
  CALCULATION_ENGINE: {
    name: 'calculation-engine',
    srcPath: 'src/calculation/calculation_engine.py',
    wsjf: 4.67,
    phase: 2,
  },
  COST_LEDGER: {
    name: 'cost-ledger',
    srcPath: 'src/ledger/cost_ledger.py',
    wsjf: 4.55,
    phase: 2,
  },
  TAX_CURRENCY: {
    name: 'tax-currency',
    srcPath: 'src/tax/tax_currency.py',
    wsjf: 4.40,
    phase: 2,
  },
  INVOICE_ENGINE: {
    name: 'invoice-engine',
    srcPath: 'src/billing/invoice_engine.py',
    wsjf: 9.50,
    phase: 3,
  },
} as const;

// ─── Error Code Constants ────────────────────────────────────────────────────

export const ERROR_CODES = {
  // Schema / Contracts
  ERR_INVALID_CONTRACT_FORMAT: 'ERR_INVALID_CONTRACT_FORMAT',
  ERR_SCHEMA_VIOLATION: 'ERR_SCHEMA_VIOLATION',
  ERR_MISSING_REQUIRED_FIELD: 'ERR_MISSING_REQUIRED_FIELD',
  ERR_TYPE_MISMATCH: 'ERR_TYPE_MISMATCH',
  ERR_VALUE_OUT_OF_RANGE: 'ERR_VALUE_OUT_OF_RANGE',
  ERR_INVALID_REGEX_PATTERN: 'ERR_INVALID_REGEX_PATTERN',
  // Timestamps
  ERR_ISO8601_REQUIRED: 'ERR_ISO8601_REQUIRED',
  ERR_UTC_OFFSET_REQUIRED: 'ERR_UTC_OFFSET_REQUIRED',
  // Identity
  ERR_INVALID_UUID_V7: 'ERR_INVALID_UUID_V7',
  ERR_ENTITY_NOT_FOUND: 'ERR_ENTITY_NOT_FOUND',
  ERR_ROLE_MISMATCH: 'ERR_ROLE_MISMATCH',
  // Rates
  ERR_RATE_NOT_FOUND: 'ERR_RATE_NOT_FOUND',
  ERR_RATE_EXPIRED: 'ERR_RATE_EXPIRED',
  ERR_INVALID_MULTIPLIER: 'ERR_INVALID_MULTIPLIER',
  // Events / Immutability
  ERR_IMMUTABILITY_VIOLATION: 'ERR_IMMUTABILITY_VIOLATION',
  ERR_CORRECTION_CHAIN_BROKEN: 'ERR_CORRECTION_CHAIN_BROKEN',
  ERR_CONTENT_HASH_MISMATCH: 'ERR_CONTENT_HASH_MISMATCH',
  ERR_INVALID_EVENT_TYPE: 'ERR_INVALID_EVENT_TYPE',
  // Projects
  ERR_PROJECT_NOT_FOUND: 'ERR_PROJECT_NOT_FOUND',
  ERR_BUDGET_EXCEEDED: 'ERR_BUDGET_EXCEEDED',
  ERR_GEO_FENCE_VIOLATION: 'ERR_GEO_FENCE_VIOLATION',
  // Financials
  ERR_NEGATIVE_AMOUNT: 'ERR_NEGATIVE_AMOUNT',
  ERR_CURRENCY_NOT_SUPPORTED: 'ERR_CURRENCY_NOT_SUPPORTED',
  ERR_TOTAL_MISMATCH: 'ERR_TOTAL_MISMATCH',
  // Tax
  ERR_INVALID_JURISDICTION: 'ERR_INVALID_JURISDICTION',
  ERR_TAX_RATE_OUT_OF_RANGE: 'ERR_TAX_RATE_OUT_OF_RANGE',
  // Invoice
  ERR_INVOICE_GENERATION_FAILED: 'ERR_INVOICE_GENERATION_FAILED',
  ERR_MISSING_SIGNOFF: 'ERR_MISSING_SIGNOFF',
  ERR_INVOICE_ALREADY_ISSUED: 'ERR_INVOICE_ALREADY_ISSUED',
  ERR_CREDIT_NOTE_CHAIN_BROKEN: 'ERR_CREDIT_NOTE_CHAIN_BROKEN',
  ERR_INVALID_DISCOUNT: 'ERR_INVALID_DISCOUNT',
} as const;

// ─── Schema Pattern Constants ────────────────────────────────────────────────

export const SCHEMA_PATTERNS = {
  UUID_V7: /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  ISO8601_UTC: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$/,
  ISO4217: /^[A-Z]{3}$/,
  DECIMAL: /^\d+(\.\d{1,10})?$/,
  CONTENT_HASH_SHA256: /^[a-f0-9]{64}$/,
  JURISDICTION: /^[A-Z]{2}-[A-Z]{2}-[A-Z]+$/,
} as const;

// ─── Shared Domain Assertions ────────────────────────────────────────────────

export const billingHelpers = {

  /** Assert a domain source file exists and is non-empty */
  assertDomainFileExists(domainKey: keyof typeof BILLING_DOMAINS): void {
    const domain = BILLING_DOMAINS[domainKey];
    if (!fileExists(domain.srcPath)) {
      throw new Error(`Domain file missing: ${domain.srcPath}`);
    }
    const content = readFile(domain.srcPath);
    if (content.trim().length < 50) {
      throw new Error(`Domain file appears empty or stub: ${domain.srcPath}`);
    }
  },

  /** Assert source file contains required class/function name */
  assertContains(filePath: string, pattern: string | RegExp): void {
    const content = readFile(filePath);
    const match = typeof pattern === 'string'
      ? content.includes(pattern)
      : pattern.test(content);
    if (!match) {
      throw new Error(`Pattern not found in ${filePath}: ${pattern}`);
    }
  },

  /** Assert error code defined in source */
  assertErrorCode(filePath: string, errorCode: string): void {
    billingHelpers.assertContains(filePath, errorCode);
  },

  /** Assert ISO 8601 UTC timestamp format */
  assertValidTimestamp(ts: string): void {
    if (!SCHEMA_PATTERNS.ISO8601_UTC.test(ts)) {
      throw new Error(
        `${ERROR_CODES.ERR_ISO8601_REQUIRED}: Invalid timestamp format: ${ts}`
      );
    }
  },

  /** Assert UUID v7 format */
  assertValidUuidV7(uuid: string): void {
    if (!SCHEMA_PATTERNS.UUID_V7.test(uuid)) {
      throw new Error(
        `${ERROR_CODES.ERR_INVALID_UUID_V7}: Invalid UUID v7 format: ${uuid}`
      );
    }
  },

  /** Assert decimal money string */
  assertValidDecimal(value: string): void {
    if (!SCHEMA_PATTERNS.DECIMAL.test(value)) {
      throw new Error(
        `${ERROR_CODES.ERR_TYPE_MISMATCH}: Expected decimal, got: ${value}`
      );
    }
  },

  /** Assert ISO 4217 currency code */
  assertValidCurrency(code: string): void {
    if (!SCHEMA_PATTERNS.ISO4217.test(code)) {
      throw new Error(
        `${ERROR_CODES.ERR_INVALID_CONTRACT_FORMAT}: Invalid ISO 4217 code: ${code}`
      );
    }
  },

  /** Assert Rust bridge function exported */
  assertRustBridgeExport(funcName: string): void {
    const libRs = readFile('src/rust/eventops_pyo3/src/lib.rs');
    if (!libRs.includes(`wrap_pyfunction!(${funcName}`)) {
      throw new Error(`Rust bridge missing function: ${funcName}`);
    }
  },

  /** Assert protobuf canonical schema contains a message */
  assertProtoMessage(messageName: string): void {
    billingHelpers.assertContains(
      'docs/api/billing.proto',
      `message ${messageName}`
    );
  },

  /** Check if domain has both TDD and VERIFY specs */
  getDomainSpecStatus(domainName: string): {
    hasTdd: boolean;
    hasVerify: boolean;
    gap: boolean;
  } {
    const hasTdd = fileExists(`tests/${domainName}-tdd.e2e.spec.ts`);
    const hasVerify = fileExists(`tests/${domainName}-verify.e2e.spec.ts`);
    return { hasTdd, hasVerify, gap: hasTdd && !hasVerify };
  },
};

// ─── FQDN Registry + Chunked Delivery ───────────────────────────────────────
// Merged from: tests/e2e/chunked-delivery.config.ts (2026-05-25 green-room)
// Rule: Update this list here. Do NOT maintain a separate FQDN registry.

export const FQDN_REGISTRY = [
  'billing.bhopti.com',
  'crm.bhopti.com',
  'shop.bhopti.com',
  'docs.bhopti.com',
  'admin.bhopti.com',
  'mailadmin.bhopti.com',
  'summerjobswap.com',
  'nextwavenetwork.com',
  // gRPC EventOps primitive — R-EVENTOPS-01: RESOLVED 2026-06-19
  // eventops-grpc.service active on :50051 (h2c). grpc.health.v1.Health=SERVING.
  // Root path returns 502 by design (gRPC-only server). Use /grpc.health.v1.Health/Check for health.
  // Chain: HAProxy mailadmin_https → Caddy :8444 → h2c://127.0.0.1:50051
  'api.interface.tag.ooo',
] as const;

export type BillingFQDN = typeof FQDN_REGISTRY[number];

/**
 * Migration status as of 2026-06-19 (source: config/fqdn_registry.yaml)
 * pending    — DNS not confirmed / origin placeholder
 * delegated  — DNS live, origin validated via external HTTP check
 * hardened   — TLS + WAF + DDoS active
 * sovereign  — Full billing pipeline wired (Stripe/HostBill/Oro live)
 */
export const FQDN_MIGRATION_STATUS: Record<BillingFQDN, 'pending' | 'delegated' | 'hardened' | 'sovereign'> = {
  'billing.bhopti.com':      'delegated',  // HTTP 200 confirmed 2026-06-19
  'crm.bhopti.com':          'delegated',  // HTTP 200 confirmed 2026-06-19
  'shop.bhopti.com':         'delegated',  // HTTP 200 confirmed 2026-06-19
  'docs.bhopti.com':         'delegated',  // origin 23.92.79.2
  'admin.bhopti.com':        'delegated',  // origin 23.92.79.2
  'mailadmin.bhopti.com':    'delegated',  // HTTP 200 confirmed 2026-06-19
  'summerjobswap.com':       'delegated',
  'nextwavenetwork.com':     'delegated',
  'api.interface.tag.ooo':   'delegated',  // gRPC HTTP 200 confirmed 2026-06-19
} as const;

/**
 * Config-enabled domain batch sizing — prevents context window overflow
 * during full portfolio evaluation. Set MAX_DOMAINS_PER_BATCH env var to tune.
 * RCA: No chunking strategy caused test timeouts on 5+ FQDN runs.
 */
export function getDomainBatch(batchIndex: number = 0): readonly string[] {
  const maxPerBatch = parseInt(
    process.env.MAX_DOMAINS_PER_BATCH || '3', 10
  );
  const start = batchIndex * maxPerBatch;
  return FQDN_REGISTRY.slice(start, start + maxPerBatch);
}

export function getTotalBatches(): number {
  const maxPerBatch = parseInt(
    process.env.MAX_DOMAINS_PER_BATCH || '3', 10
  );
  return Math.ceil(FQDN_REGISTRY.length / maxPerBatch);
}

// ─── Edge + Stripe Assertion Helpers ────────────────────────────────────────
// Merged from: tests/e2e/billing-verify.e2e.spec.ts (2026-05-25 green-room)

export const edgeHelpers = {

  /**
   * Assert a public FQDN responds with <400 and has a server header.
   * Validates Caddy/HAProxy/Envoy proxy headers during edge transition.
   */
  async assertEdgeFQDN(
    page: { goto: Function },
    domain: string
  ): Promise<void> {
    const response = await page.goto(
      `https://${domain}/`, { waitUntil: 'networkidle' }
    );
    if (!response) throw new Error(`No response from ${domain}`);
    if (response.status() >= 400) {
      throw new Error(
        `Edge FQDN ${domain} returned ${response.status()} — expected <400`
      );
    }
    const serverHeader = response.headers()['server'];
    if (!serverHeader) {
      throw new Error(`Edge FQDN ${domain} missing 'server' header`);
    }
  },

  /**
   * Assert Stripe webhook endpoint rejects tampered signatures with 400/403.
   * Validates secure rejection without 500 crash.
   */
  async assertStripeWebhookBoundary(
    request: { post: Function },
    webhookUrl: string = 'http://127.0.0.1:9091/webhooks/stripe'
  ): Promise<void> {
    const response = await request.post(webhookUrl, {
      data: { test: true },
      headers: { 'Stripe-Signature': 't=123,v1=invalid_hash' },
    });
    const status = response.status();
    if (status !== 400 && status !== 403) {
      throw new Error(
        `Stripe webhook boundary failed: expected 400/403, got ${status}`
      );
    }
  },
};

// ─── Phase Labels ────────────────────────────────────────────────────────────

export const PHASE_LABELS = {
  RED: 'RED',
  GREEN: 'GREEN',
  VERIFY: 'VERIFY',
  REFACTOR: 'REFACTOR',
} as const;

export function phaseDescribe(phase: keyof typeof PHASE_LABELS, domain: string): string {
  return `${PHASE_LABELS[phase]}: ${domain}`;
}
