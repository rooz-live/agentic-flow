/**
 * chunked-delivery.config.ts — Thin re-export shim (do not add logic here)
 *
 * CANONICAL SOURCE: tests/harness/BaseBillingE2ESpec.ts
 * MERGED: 2026-05-25 green-room consolidation
 * INVENTORY: docs/billing/CONSOLIDATION_INVENTORY.md
 *
 * FQDN_REGISTRY and getDomainBatch now live in BaseBillingE2ESpec.ts.
 * This file re-exports them for backward compatibility with any spec
 * still importing from this path. Do NOT add new logic here.
 */

export {
  FQDN_REGISTRY,
  getDomainBatch,
  getTotalBatches,
} from '../harness/BaseBillingE2ESpec';
