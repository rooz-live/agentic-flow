# ADR-0042: Accept R-SPOF-01 (Single Nameserver) as Deferrable for MVP Go-Live

**Status:** Accepted
**Date:** 2026-06-29
**Decision Maker:** Maintainer (WSJF override)
**Risk ID:** R-SPOF-01
**ROAM Disposition:** Accepted (deferrable — not on critical path for MVP)

## Context

R-SPOF-01 identifies that the self-hosted authoritative nameserver (ns1.tag.ooo)
runs on the same IP (23.92.79.2) as the application server. Full hardware
redundancy requires provisioning a second DNS host on a separate IP.

The LNNNL blockers lane had R-SPOF-01 at `near`, implying it blocks the next
cycle of work. This created false WSJF pressure — time-criticality was inflated
for an infrastructure hardening task that does not gate MVP delivery.

## Decision

**R-SPOF-01 is Accepted as deferrable.** It does not block shippable go-live for
iOS, Android, or web apps. The single-IP DNS SPOF is a production hardening
concern, not an MVP gate.

**Rationale (WSJF):**
- **Business Value:** MVP go-live (app store submission + web storefronts) has
  higher CoD than DNS redundancy hardening.
- **Time-Criticality:** App store review cycles and revenue generation start
  date are the binding constraints, not DNS failover tolerance.
- **Risk Reduction:** ns1.tag.ooo has operated without incident during the
  entire development cycle. The probability of DNS failure during MVP launch
  window is low; the impact is recoverable (DNS TTL is short).
- **Job Size:** Provisioning a second DNS host requires infrastructure
  procurement (new host, IP allocation, zone replication setup) — high effort
  for low MVP-value.

## Consequences

- **Positive:** Frees the LNNNL blockers lane head for MVP-critical work
  (R-MAIL-03 Stalwart, R-CLS-03 trust coupling). WSJF ranking now accurately
  reflects go-live priority.
- **Negative:** If ns1.tag.ooo fails, DNS resolution for all 29+ TLDs goes down
  until manual recovery. This is an Accepted risk — "no crying at the casino."
- **Re-evaluation trigger:** Post-MVP, when revenue depends on 99.9%+ uptime,
  R-SPOF-01 should be re-promoted to Mitigated/Resolved.

## Reversibility

Fully reversible — re-promote to blockers lane at any time by updating the
ROAM disposition. The ns2.tag.ooo NS record (added Wave 5, R-SPOF-01 partial
mitigation) provides a secondary resolution path already.

## Pre-registered Regression Expectation

None expected. This is a priority/ROAM decision, not a code change. The only
observable effect is WSJF ranking change in the LNNNL.
