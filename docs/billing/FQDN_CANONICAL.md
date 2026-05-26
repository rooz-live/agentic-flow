# Canonical Billing Public FQDN

**Agents: read this file first.** Do not infer the public billing host from CI env vars or Caddy snippets alone.

## Decision (2026-05-26, WSJF Slice C)

| Role | FQDN | Source of truth |
|------|------|-----------------|
| **Canonical public billing (production edge)** | `billing.bhopti.com` | `src/proxies/edge_gateway.cfg` (Caddy), `tests/harness/BaseBillingE2ESpec.ts` `FQDN_REGISTRY[0]` |
| **CI / legacy deploy target (until edge cutover)** | `api.billing.o-gov.com` | `.github/workflows/billing-deploy.yml` `PROD_FQDN` |
| **CI staging alias** | `staging.api.billing.o-gov.com` | `.github/workflows/billing-deploy.yml` `STAGING_FQDN` |

**Rule:** Synthetic checks, agent session DoR, and human-facing “is billing live?” proofs use **`billing.bhopti.com`**. GitHub deploy workflows may still push to **o-gov** hostnames until DNS and Caddy on the sovereign edge are the single ingress (tracked in consolidation inventory).

## URL patterns

| Purpose | Pattern |
|---------|---------|
| Public UI / HostBill | `https://billing.bhopti.com/` |
| Stripe webhooks (edge) | `https://billing.bhopti.com/webhooks/stripe` → `127.0.0.1:9090` (see `edge_gateway.cfg`) |
| CI deploy smoke (legacy) | `https://api.billing.o-gov.com/` |
| gRPC EventOps (internal) | `api.interface.tag.ooo` (not billing UI) |

## Related portfolio FQDNs

Registered in harness `FQDN_REGISTRY` (chunked E2E batches): `crm.bhopti.com`, `shop.bhopti.com`, `docs.bhopti.com`, `admin.bhopti.com`.

## Evidence

After trust refresh, run:

```bash
cd /path/to/repo
PUBLIC_WRITE_EVIDENCE=1 bash code/tooling/scripts/public_synthetic_check.sh billing.bhopti.com
```

Artifacts: `.goalie/evidence/public-edge/public_*.json` (and `latest.json` pointer).

## Migration note (o-gov → bhopti)

CI `PROD_FQDN` remains `api.billing.o-gov.com` for pipeline compatibility. **Do not** change workflow FQDNs in this slice; align DNS/TLS and deploy routing in a follow-up wave, then update `billing-deploy.yml` to match this doc.
