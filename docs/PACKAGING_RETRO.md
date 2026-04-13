# Packaging & Working Tree Retrospective

## Context & Problem Statement
The Swarm hierarchical mesh generates significant parallel telemetry, testing outputs, and tool-configuration churn (e.g., `.goalie/`, `.cursorrules`, `.roo/`, `test-results/`). When these parallel exploration artifacts bleed directly into the working tree, they trigger **Cognitive Drift (RISK-010)**, degrade Git Object Health, and violate the strict single-threaded WSJF commitment model.

Trust is broken when rapid, unverified state mutations bypass the strict `STANDUP → WSJF SELECT → DoR → EXECUTE → VERIFY → COMMIT` cycle.

## Root Cause Analysis (RCA: Deep Why)
1. **Why is the working tree consistently dirty?** Telemetry, test logs, and audit trails are written to disk paths inadvertently tracked by Git instead of ephemeral RAM-disks or strictly ignored directories.
2. **Why is tooling config churn high?** Portable AI tooling contexts (`.vscode`, `.roo`, `.cursor`, `.windsurf`) are iteratively discovered and modified by the Swarm globally, causing fragmented config states and mixed-concern commits.
3. **Why does this block deployment trust?** If the swarm has permission to recursively PR, merge, and mutate state completely detached from the single-threaded WSJF truth ledger (`pi-sync-targets.min.json`), the blast radius becomes uncontainable. Rollbacks are impossible if a single commit contains infrastructure mutations *and* telemetry noise.

## ROAM Risk Assessment
* **Risk:** Git Object Health Degradation / Deployment Pipeline Poisoning.
* **Impact:** HIGH. Blocks trust, disrupts the deterministic CI/CD pipeline, and obscures the economic verifiable value (WSJF) of individual commits.
* **Owner:** Orchestrator Circle.
* **Status:** MITIGATED.

## Packaging & Hygiene Policies

To restore trust and deterministic state, the following packaging rules are now strictly enforced:

### 1. Ephemeral State & The Swarm's Scratchpad (Out-of-Repo)
* The Swarm is fully unblocked to run parallel exploration, simulate 10,000 UI prompt paths using the `@playwright/mcp` bridge, and parse out-of-repo automations (e.g., n8n).
* **Rule:** All raw outputs (telemetry, `.goalie/` temporary audits, Playwright traces, LLM prompt logs) MUST NOT be committed. They belong in `.gitignore` or temporal volumes.
* **Integration:** The Swarm must synthesize its parallel findings *backwards* into the `RFC-THEMES-LOG.md` as WSJF parameters, or as a verified entry in `pi-sync-targets.min.json`. 

### 2. Symmetrical Editor Tooling (Single Blast Radius)
* Editor config hygiene (`.cursorrules`, `.roo/*.json`, `.windsurfrules`, `.vscode/settings.json`) must be managed in **staged, passive PRs**.
* **Rule:** A PR modifying agent capabilities (`mcp-discovery-protocol.json`) cannot simultaneously mutate infrastructure, graph schemas, or application code. One PR = One Target Family.

### 3. The Single-Threaded Commit Gate
The optimal cycle (`STANDUP → WSJF SELECT → DoR → RED/GREEN TDD → VERIFY → COMMIT → RETRO → REPLENISH`) is the necessary anchor for the repository. This does not limit the Swarm's *cognitive capacity* (which explodes in Research/Discovery)—it strictly limits its *deployment permissions*.
* **Rule:** Every single line of code merged to MAIN must explicitly resolve an economically-proven risk that the Swarm isolated.
* **Invert Test:** "What would we stop if NEXT were wrong?" If a single commit is bound to one clear problem statement and one verifiable acceptance test, that exact single commit can be safely rolled back.

## Action Items (Replenishment)
- [x] Symmetrical alignment of portable tooling (`.cursorrules`, `.roo`, `.windsurf`).
- [ ] Verify `.gitignore` strictly covers all `.goalie/` sub-directories (excluding core ledgers/trackers explicitly required for state like `ROAM_TRACKER.yaml`).
- [ ] Audit `pi-sync-targets.min.json` to ensure every target has exactly one measurable delta mapped.
- [ ] Bind all remaining active mutation scripts to require explicit `--confirm` and structured JSONL audit logging before pipeline launch.