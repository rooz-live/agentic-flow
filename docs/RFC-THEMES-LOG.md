# RFC Themes Log (Swarm Backlog)

## Core Philosophy
This document aligns all forward-looking architecture themes with their Problem Statements, Acceptance Tests, Risk Owners, and Risk Bands. 

**The Invert Test (Trust Gate):** What would we stop if `NEXT` were wrong? 
Any item in this log that lacks a clear Problem Statement and verifiable Acceptance Test stays strictly in the **Backlog / Review-Only** state. The Swarm may parallelize exploration against these themes, but no implementation PRs may be raised until these constraints are satisfied.

## Theme Registry

| Theme / Capability | Risk Band | Risk Owner | Problem Statement (Why?) | Acceptance Test (How we prove it) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Teleological Constellation Training** | Passive/Config | `@orchestrator_circle` | Portable AI tooling contexts (.vscode, .roo) do not symmetrically share discovered skills, causing siloed agent drift. | `mcp-discovery-protocol.json` accurately maps skills; capabilities sync symmetrically across environments. | [x] ACTIVE |
| **Mythos / LFM Propagation** | Graph/Embeddings | `@intuitive_circle` | Graph nodes lack organic cross-domain linkage; synthesis requires explicit human prompting. | `lfm_propagator.py` dynamically discovers cross-domain bridges and persists to `transfer_registry`. | [x] ACTIVE |
| **SimpleFlow Dynamic WSJF Routing** | Passive/Config | `@orchestrator_circle` | Swarm routing uses rigid bash keywords instead of economic value. | `ay-swarm.sh` calculates WSJF scores and dynamically routes tasks to optimal circles. | [x] ACTIVE |
| **TurboQuant DGM Prompts Loop** | Passive → Graph | `@ai_circle` | ML drift in UI/UX telemetry is evaluated manually instead of actively via the Playwright MCP bridge. | `turboquant-prompts-loop.ts` simulates 10,000 UI paths and accurately feeds the `DashboardConsumer`. | [x] ACTIVE |
| **RuVector ADR-147** | Graph/Embeddings | `@ai_circle` | Stacked KV Cache Tri-attention is not natively supported, stalling retrieval limits. | *TBD* | [ ] BACKLOG |
| **Email/n8n Automation (inbox-zero)** | Out-of-repo | `@seeker_circle` | Manual triage of infrastructure alerts and ecosystem inputs degrades operational velocity. | n8n pipeline properly tags, categorizes, and auto-responds to 95% of incoming alerts. | [ ] BACKLOG |
| **Neural Trader / ETF Dashboard** | Out-of-repo | `@analyst_circle` | Tax-loss harvesting strategies for SOXS/SOXL require manual macro-temporal (daily/weekly) review. | TLD Dashboard displays real-time ROAM risks for active/passive hold/trade strategies securely. | [ ] BACKLOG |
| **TinyGPU / tinygrad Acceleration** | Experimental | `@ai_circle` | Local swarm processing incurs high computational overhead on standard infrastructure. | *TBD* | [ ] BACKLOG |
| **ArtChat & EUDMusic Integration** | External | *TBD* | *TBD* | *TBD* | [ ] BACKLOG |
| **EPIC.CAB & DecisionCall** | External | *TBD* | *TBD* | *TBD* | [ ] BACKLOG |
| **Foundassion & Next Wave Network** | External | *TBD* | *TBD* | *TBD* | [ ] BACKLOG |
| **TAG.VOTE Governance Protocol** | External | *TBD* | *TBD* | *TBD* | [ ] BACKLOG |

## Swarm Parallelization Guidelines
1. The Swarm mesh is completely unblocked to run research, generate telemetry, and simulate workloads out-of-repo against **[ ] BACKLOG** items.
2. The Swarm synthesizes its findings backward into this `RFC-THEMES-LOG.md` by filling out the `Problem Statement` and `Acceptance Test` rows.
3. Once an item has a clear PS, AT, Owner, and Band, it becomes eligible for the single-threaded WSJF deployment cycle.