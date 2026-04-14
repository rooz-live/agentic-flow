# ADR-025: N8N Emailibrium Webhook Isolation & Ingress

## Status
Accepted

## Context & Problem Statement
The Swarm hierarchical mesh operates effectively in parallel, but the top of the funnel—Triage and Tension Discovery—remains a manual bottleneck. Human operators currently evaluate raw ROAM risks, unstructured emails, financial alerts (finelo), and zero-day CVEs to determine what enters the `docs/RFC-THEMES-LOG.md` ledger.

If the Swarm is given direct permission to parse, decide, and commit these findings simultaneously, it risks triggering **Cognitive Drift (RISK-010)** and polluting Git Object Health with hallucinatory mutations. We need a way for the Swarm to operate a passive, out-of-repo classification loop (via n8n / emailibrium) while bridging the findings safely into the single-threaded deterministic CI pipeline.

## Decision
We will formally isolate the Email/N8N Automation layer strictly **[out-of-repo]**. The Swarm will utilize N8N webhook loops to passively ingest, classify, and score unstructured telemetry (emails, logs, financial alerts). 

To bridge this data back into the repository without compromising state integrity, we are implementing a strict Single-Thread Ingress Protocol:
1. **Schema Constraint**: N8N workflows must output a strictly defined JSON array matching `schemas/emailibrium-schema.min.json`.
2. **Multi-Tenant Isolation**: Inbound webhook data will be written to a logically isolated `n8n.inbox` multi-tenant array within the `ConceptRepository`, preventing it from polluting primary `law.rooz.live` or `epic.cab` memory rings.
3. **Semantic Validation**: Red/Green TDD validation layers will actively reject any payloads that hallucinate beyond the defined B/H/S-style confidence bounds.
4. **WSJF Ledger Mapping**: Validated `classification_signal` items will automatically route into the WSJF ledger, converting raw unstructured tensions into explicit, economically-proven PI priorities.

## Consequences

### Positive
* **Infinite Parallelization**: The Swarm can classify 10,000 emails or alerts simultaneously in external SaaS environments without locking the primary Git thread.
* **Deterministic Safety**: By treating external N8N classifiers as untrusted inputs parsed against a rigid JSON schema, we eliminate the risk of the Swarm mutating infrastructure based on an email hallucination.
* **Economic Prioritization**: Triage is automated. The WSJF algorithm will organically absorb these raw requests and numericize their priority, feeding directly into the next `STANDUP → WSJF SELECT → DoR` cycle.

### Negative / Risks
* **Schema Rigidity**: The N8N out-of-repo workflows must tightly couple to our `emailibrium-schema.min.json`. Any schema evolution requires synchronized updates to the external webhooks.
* **Data Volume**: The `ConceptRepository` must safely rotate or archive the `n8n.inbox` signals to prevent database bloat from low-confidence spam rejections.

## Compliance & Trust Gates
This ADR satisfies the requirement that Swarm parallel exploration and single-threaded integration remain structurally separated. The CI runner enforces the boundary via `test-emailibrium-ingress.spec.ts` to ensure invalid data is trapped at the edge.