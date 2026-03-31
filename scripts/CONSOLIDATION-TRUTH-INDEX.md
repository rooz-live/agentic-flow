# Validation Consolidation Truth — Index
<!-- CANONICAL: One of 4 canonical files. See VALIDATOR_INVENTORY.md for full cross-ref map. -->
<!-- CROSS-REFS: VALIDATOR_INVENTORY.md, ADR-019, ADR-020, CASE_REGISTRY.yaml -->
<!-- UPDATED: 2026-03-10 — DDD/VDD/ADR/PRD/WSJF/ROAM, red-green-refactor/backup/TDD, 26CV007491-590 contrastive/move -->

**Entry points (ay / advocate / ti):** `ay validate-email <file>`, `ay compare-validators`, `advocate validate-email <file>`, `advocate compare-validators` — see [How to Run](#how-to-run-one-constant-ship--first) and [Iterative script review (WSJF)](#iterative-script-reviewexecution-wsjf).

**Generated report:** `../reports/CONSOLIDATION-TRUTH-REPORT.md`  
**Regenerate:** `./compare-all-validators.sh [--latest] [files...]` or `advocate compare-validators` / `ay compare-validators`  
**Metric standard (%/#, %.#, one constant):** `../docs/VALIDATION_METRICS_AND_PROGRESS.md`  
**Master inventory:** `../VALIDATOR_INVENTORY.md` (44 validators, 2 trees, convergence/divergence map)

---

## DDD / VDD / ADR / PRD / WSJF / ROAM — Red-Green-Refactor, Backup, TDD

| Layer | Where | Role |
|-------|--------|------|
| **DDD** | `validation-core.sh` (pure checks), `rust/core/src/validation/` (ValidationReport aggregate), `validate_coherence.py` (aggregate detection) | Domain boundaries; single source of truth for checks. |
| **VDD** | `compare-all-validators.sh` → `CONSOLIDATION-TRUTH-REPORT.md`, exit 0/1/2/3 contracts | Validation-driven: one report, %/# state. |
| **ADR** | `../docs/adr/ADR-019-VALIDATION-CONSOLIDATION.md`, `../docs/adr/ADR-020-WSJF-PROCESS-LEDGER-DOMAIN.md`; gate: `scripts/ci/adr-frontmatter-gate.sh` | Decisions (consolidation, PROCESS=file.rooz.live); CI enforces frontmatter. |
| **PRD** | `../docs/prd/`, acceptance criteria → tests | Requirements; coherence (COH-003) maps PRD → TDD. |
| **WSJF** | `./wsjf-script-review-execute.sh`, `../docs/QUICK_WINS.md`, `../POST-TRIAL/26CV007491-590-MOVE-PLAN.md` (L1–M4) | Prioritization; script execution order; move/appeal task scores. |
| **ROAM risks** | `../ROAM_TRACKER.yaml`, `check_roam_staleness.py`, `contract-enforcement-gate.sh` | Risks/Owned/Accepted/Mitigated; staleness gates. |

**Red-green-refactor:** Validators = **green** gate (pass to proceed). Failing run = **red**; fix in-place (see FIX-CHECKLIST.md), then re-run = **refactor**. No new validator until existing ones documented here.

**Backup:** Pre-change backups: `../.rca-backups/`, `../.backups/` (or project-specific). Evidence hashing: `evidence-hasher.py` → `EVIDENCE-HASH-MANIFEST-*.txt` for integrity.

**TDD:** Coherence rules COH-001 (aggregates→tests), COH-003 (PRD→tests), COH-005 (PRD→ADR). Traceability: `../docs/VALIDATION-PIPELINE-TRACING.md`.

**Anti compatibility/fragile/inflation:** Discover/Consolidate THEN extend. Prefer fixing existing scripts over adding new ones. Avoid duplicate logic (core → runner → compare); keep one constant (%/#) and one report.

**Config contract (guard before any work):** Wrong repo/root → exit 78 (EX_CONFIG); PWD outside roots → loud message + auto-cd once; missing LEGAL_CASE_IDS → exit 78; prod on wrong branch → exit 78; FA in T0 → auto-downgrade to SA. See `../docs/LLM-EML-DASHBOARD-ITERATION-UPGRADE.md`: **§0** — Config contract and edge cases (condition → exit/behavior table); **§0b** — Deploy switch (shell validation pipeline as gate; exit_code=160 and RUNNER_EXIT=100 → fix before action; optional auto-raise WSJF/ROAM when validation fails; %/# and %.# for hierarchical depth); **§6** — Bottom line (trend %/# and exit_code toward 0; %.# as velocity; ROAM when 160/100; simplexity = one env block + one guard block so assumptions are explicit and checked).

---

## TCC Full Disk Access (macOS LaunchAgent Requirement)

**Problem:** LaunchAgents fail with Exit Code 126 ("Operation not permitted") when bash lacks Full Disk Access in macOS TCC (Transparency, Consent, Control) subsystem.

**Affected Agents:**
| Agent | Status | Exit Code |
|-------|--------|-----------|
| `com.bhopti.roam.staleness.watchdog` | Failing | 110 (validation) |
| `com.bhopti.legal.roam-watchdog` | Failing | 110 (validation) |
| `com.bhopti.swarm.supervisor` | Failing | 1 (general error) |
| `com.bhopti.legal.wsjf-escalator` | Failing | 1 (general error) |
| `com.bhopti.legal.validator13` | Running | 0 |
| `com.bhopti.validator12.enhanced` | Running | 0 |
| `com.bhopti.legal.filewatcher` | Running | 0 |
| `com.bhopti.legal.portalcheck` | Running | 0 |
| `com.bhopti.wsjf.email-dashboard` | Running | 0 |

**Manual Fix (REQUIRED — Do NOT automate TCC settings):**

1. Open **System Settings** → **Privacy & Security** → **Full Disk Access**
2. Click the **+** button to add an application
3. Add **Terminal.app** (or your terminal emulator) from `/Applications/`
4. If using Homebrew bash, also add `/usr/local/Cellar/bash/5.2.37/bin/bash`
5. **Important:** Even if Homebrew bash is listed, `/bin/bash` may need to be added separately
6. Restart Terminal and reload LaunchAgents:
   ```bash
   launchctl unload ~/Library/LaunchAgents/com.bhopti.*.plist
   launchctl load ~/Library/LaunchAgents/com.bhopti.*.plist
   ```

**Verification Command:**
```bash
launchctl list | grep com.bhopti
```

Expected output: All agents showing exit code `0` (running) or `-` (idle but loaded).

**Security Note:** This is a manual security gate by design. macOS TCC protects user data by requiring explicit consent for Full Disk Access. Do NOT attempt to programmatically modify TCC settings (e.g., via `tccutil` or direct database manipulation) as this would violate macOS security policies.

**Related:** PHASE 1.2 of critical gating & service health improvements. See `REMINDERS` for task tracking.

---

## Case 26CV007491-590 — Contrastive OCR, Findings, Move/Appeal

| What | Where / Command |
|------|------------------|
| **OCR → review → rename → refile** | `./legal-doc-processor.sh "~/Downloads/26CV007491-590.pdf" "~/Downloads/Register of Actions - 26CV007491-590.pdf"` (exit 0/1/2/3). Heavy OCR: `../_SYSTEM/_AUTOMATION/legal-pdf-ocr.sh`. |
| **Contrastive analysis + findings** | `../COURT-FILINGS/CONTRASTIVE-ANALYSIS-26CV007491-590.md` — appeal deadline (Mar 20), Motion to Consolidate (2/23 unruled), uninhabitability defense, possession status. |
| **Legal findings (notice adequacy)** | Same doc: appeal deadline, consolidation gap, habitability scope, possession vs “mentally vacated.” Use for appeal / stay / reconsider drafting. |
| **Evidence hashing** | `evidence-hasher.py` → `EVIDENCE-HASH-MANIFEST-########.txt` (integrity). |
| **WSJF routing** | `file-to-wsjf-router.sh` — route filed PDFs into WSJF lanes. |
| **ADR gate** | `./scripts/ci/adr-frontmatter-gate.sh` — ADR compliance (date, status). |
| **Move + appeal plan** | `../POST-TRIAL/26CV007491-590-MOVE-PLAN.md` — WSJF tasks (L1–L4 legal, M1–M4 move/evidence), 10-day grid, ROAM risk sketches. |

Related case: 26CV005596-590 (arbitration Mar 3). Cross-reference in motion strategy and consolidation grounds.

---

## Multi-Ledger Tunnels (PROCESS = file.rooz.live)

| Ledger | Subdomain | Exit | Purpose |
|--------|-----------|------|---------|
| ROOT | law.rooz.live | 150 | Legal aggregate root |
| GATEWAY | pur.tag.vote | 151 | WSJF/email validation gate |
| EVIDENCE | hab.yo.life | 152 | Habitability evidence |
| PROCESS | **file.rooz.live** | 153 | Filing/execution layer |

**Start:** `./scripts/orchestrators/cascade-tunnel.sh multi-ledger`  
**Diagnose:** `../_SYSTEM/_AUTOMATION/debug-exit-codes.sh diag`  
**ADR:** `../docs/adr/ADR-020-WSJF-PROCESS-LEDGER-DOMAIN.md` — WSJF 95, file.rooz.live chosen; rejected arb/motion/brief.  
**Doc:** `../docs/MULTI_LEDGER_TUNNELS.md`

---

## Existing Validators Audit

### File-level (email) validators — agentic-flow tree (5)

| # | Script | Role |
|---|--------|------|
| 1 | `pre-send-email-gate.sh` | Placeholder, legal citation, Pro Se signature, attachments, mesh |
| 2 | `validation-runner.sh` | Orchestrates validation-core.sh (4 checks) |
| 3 | `pre-send-email-workflow.sh` | Full ceremony: ROAM, WSJF, coherence, 33-role (optional) |
| 4 | `comprehensive-wholeness-validator.sh` | Wholeness/circle checks (--target-file) |
| 5 | `mail-capture-validate.sh` | Mail.app extraction, 33-role council (needs click/textual) |

### File-level (email) validators — CLT tree (7)

| # | Script | Path (relative to BHOPTI-LEGAL/) | Role |
|---|--------|---|------|
| 1 | `validate-email.sh` | `_SYSTEM/_AUTOMATION/` | **21-check RFC 5322** (header, multiline To/Cc, date, stale) |
| 2 | `validate-emails.sh` | `_SYSTEM/_AUTOMATION/` | Batch: placeholder, address, date, citation, depth |
| 3 | `validate-email-depth.sh` | `_SYSTEM/_AUTOMATION/` | Strategic depth scoring (7 dimensions) |
| 4 | `validate-recipients.sh` | `11-ADVOCACY-PIPELINE/scripts/` | Role/org coverage, allowed contacts |
| 5 | `validate-template-wholeness.sh` | `11-ADVOCACY-PIPELINE/scripts/` | Template completeness |
| 6 | `validate-template-dates.sh` | `11-ADVOCACY-PIPELINE/scripts/` | Template date consistency |
| 7 | `send-with-full-wholeness.sh` | `11-ADVOCACY-PIPELINE/scripts/` | 21-point Christopher Alexander wholeness |

### Dashboard bridge — CLT tree (1)

| # | Script | Path | Role |
|---|--------|---|------|
| 1 | `email-server.js` | `00-DASHBOARD/` | **8 JS validators** + bash bridge (`/validate-full` runs all 3 systems) |

### Core / orchestration — agentic-flow (2)

| # | Script | Role |
|---|--------|------|
| 1 | `validation-core.sh` | Pure functions + CLI: placeholders, signature, citations, attachments |
| 2 | `validation-runner.sh` | Sources core, runs all 4 checks, PASS/FAIL/VERDICT |

### Core / orchestration — CLT tree (3)

| # | Script | Path (relative to BHOPTI-LEGAL/) | Role |
|---|--------|---|------|
| 1 | `validation-core.sh` | `_SYSTEM/_AUTOMATION/` | v1.0, DDD aggregate, 337 lines (richer than agentic-flow's v0.9) |
| 2 | `validation-runner.sh` | `_SYSTEM/_AUTOMATION/` | 8 checks, feature flags, validation-history.jsonl logging |
| 3 | `validation-consolidation-v1-wip.sh` | `_SYSTEM/_AUTOMATION/` | Unified mesh (WIP, not yet integrated) |

### Project-level validators (4)

| # | Script | Role |
|---|--------|------|
| 1 | `unified-validation-mesh.sh` | Feature-flagged mesh (placeholder, cyclic regression, legal, attachment, auto-fix) |
| 2 | `validate_coherence.py` | DDD/ADR/TDD/PRD coherence |
| 3 | `check_roam_staleness.py` | ROAM_TRACKER freshness |
| 4 | `contract-enforcement-gate.sh` | ROAM/contract staleness (e.g. 96h) |

---

## Overlap Analysis (Cross-Tree)

| Check | AF core | AF gate | AF mesh | AF workflow | CLT validate-email.sh | CLT email-server.js | CLT advocacy |
|-------|---------|---------|---------|-------------|----------------------|---------------------|-------------|
| Placeholder detection | ✓ | ✓ (sources core) | ✓ (own block) | ✓ (final) | ✓ (check 4) | ✓ (placeholder) | — |
| Legal citation | ✓ | ✓ (sources core) | ✓ | — | ✓ (check 11) | ✓ (legalCitationFormat) | — |
| Pro Se signature | ✓ | ✓ (sources core) | — | — | — | — | — |
| Attachments | ✓ | ✓ (sources core) | ✓ | — | ✓ (check 9) | — | — |
| Recipient format | — | — | — | — | ✓ (check 5-6) | ✓ (recipientDisplayName) | ✓ (validate-recipients.sh) |
| Date consistency | — | — | — | — | ✓ (check 16-21) | ✓ (temporalConsistency) | ✓ (validate-template-dates.sh) |
| Subject present | — | — | — | — | ✓ (check 3) | ✓ (subject) | — |
| Sender identity | — | — | — | — | ✓ (check 2) | ✓ (sender) | — |
| Strategic depth | — | — | — | — | — | ✓ (strategicDepth) | ✓ (send-with-full-wholeness.sh) |
| Council / multi-role | — | — | — | 33-role | — | — | ✓ (33-role optional) |
| WSJF scoring | — | — | — | — | — | — | ✓ (validate-email-wsjf.sh) |
| Case number | — | — | — | — | — | — | ✓ (validate-case-numbers.sh) |
| Text/HTML parity | — | — | — | — | ✓ (check 14) | ✓ (textHtmlParity) | — |
| Employment claims | — | — | — | — | — | — | ✓ (validation-core.sh CLT) |

### Convergence Targets (reduce duplication)

- **Placeholder**: AF `validation-core.sh::core_check_placeholders` is source of truth. CLT's validate-email.sh check 4 and email-server.js should call it.
- **Legal citation**: AF `validation-core.sh::core_check_legal_citations` is source of truth. CLT's check 11 uses different regex — converge.
- **Date consistency**: CLT's validate-email.sh checks 16-21 are the most comprehensive. Should be extracted into validation-core.sh functions.

### Anti-Fragile Divergences (keep separate — see VALIDATOR_INVENTORY.md)

- **RFC 5322 parsing** (CLT bash awk) vs **JS runtime checks** (email-server.js) — different failure modes
- **Strategic depth scoring** (CLT) vs **format validation** (AF) — orthogonal concerns
- **Christopher Alexander wholeness** (advocacy) vs **regex checks** (core) — qualitative vs quantitative

- **Duplication removed:** gate and runner use core only; mesh still has its own placeholder block (optional future refactor).

---

## How to Run (one constant: ship %/# first)

```bash
# Per-check (source of truth)
./validation-core.sh email --file email.eml --check all --json

# Semi-auto max coverage (runner + gate)
./validation-runner.sh email.eml
./pre-send-email-gate.sh email.eml

# Via advocate/ay
advocate validate-email email.eml
ay validate-email email.eml

# Full comparison → reports/CONSOLIDATION-TRUTH-REPORT.md (%/# and What works NOW)
./compare-all-validators.sh
# or
advocate compare-validators
ay compare-validators
```

---

## Current State (fill from latest report)

After running `./compare-all-validators.sh` (e.g. 2026-02-26 run):

- **%/# file-level:** 8/10 PASS (80%) — Green: pre-send-email-gate.sh, validation-runner.sh, pre-send-email-workflow.sh, comprehensive-wholeness-validator.sh; SKIP: mail-capture-validate.sh (deps: pip install click textual).
- **%/# project-level:** 3/4 PASS (75%) — Green: unified-validation-mesh.sh, check_roam_staleness.py, contract-enforcement-gate.sh; SKIP: validate_coherence.py (exit 124/timeout or JSON).
- **Progress[now]:** [80%, —, T_remaining to Trial #1, 80% file-level implementation] — see `docs/VALIDATION_METRICS_AND_PROGRESS.md` for %.# velocity and 4D vector.

---

## Consolidation-first (Discover/Consolidate THEN extend)

- **Architecture:** core → runner → compare → report. Already consolidated.
- **Fix in-place:** quoting (FILE path), deps (pip install click textual), PASS/FAIL/JSON parsing for Python validators. No new build; extend coverage from ~40% toward ~90%.
- **Then extend:** RAG/AgentDB, LLMLingua, LazyLLM, agentic-qe fleet, Claude Flow hooks.
- **Anti-inflation:** No new validator or script until listed here and traceable to DDD/ADR/PRD/ROAM; avoid compatibility/fragile sprawl.

See `FIX-CHECKLIST.md` in this directory for remaining tasks.

---

## Iterative script review/execution (WSJF)

Run scripts in WSJF priority order after syntax review:

```bash
# Review + list order (no execution)
./wsjf-script-review-execute.sh --review-only

# Dry-run: show what would run
./wsjf-script-review-execute.sh --dry-run --max 5

# Execute top 5 scripts by WSJF (default 50 if not in script)
./wsjf-script-review-execute.sh --max 5

# Iterate twice, prompt before each run
./wsjf-script-review-execute.sh --iterate 2 --max 3 --interactive

# JSON output (one JSON object per script, wsjf/path/review_ok)
./wsjf-script-review-execute.sh --review-only --json
```

Convention: in the first 30 lines of a script, add `# WSJF: 85` or `# WSJF=90` to set priority (higher = run first). Default 50.

---

## Claude Flow (optional)

Run in project root for hooks and daemon (user environment; not required for validation pipeline):

```bash
npm install -g @claude-flow/cli@latest
cd /path/to/agentic-flow
npx @claude-flow/cli@latest daemon start
npx @claude-flow/cli@latest hooks session-start --auto-configure
npx @claude-flow/cli@latest doctor --fix
```

---

## agentic-qe and fleet (optional)

```bash
npx agentic-qe@latest init --auto
# Then: aqe fleet orchestrate --task email-validation --agents qe-quality-gate,qe-test-executor --topology hierarchical
# Or run: npx tsx scripts/validation-with-fleet.ts <email-file>
```

See scripts/README-VALIDATION.md and validation-with-fleet.ts for wiring.

---

## ETA / Bounded execution and TurboFlow

- **run_bounded():** `../_SYSTEM/_AUTOMATION/robust-quality.sh` — process contracts, progress hooks, timeout guards. Source before long-running steps for ETA dashboards.
- **TurboFlow (DevPod):** `../docs/TURBO_FLOW_DEV_ENV.md` — DevPod vs manual clone, v4 setup; point TurboFlow at this repo’s scripts (consolidate then extend).

---

## Dashboard upgrade scope (localhost:9000)

Served from **BHOPTI-LEGAL/00-DASHBOARD** (or paths in `unified-dashboard-nav.sh`) via `scripts/email-review-server.js` (port 9000).

### mover-tracking.html

- **Mesh hierarchy:** Edit functionality at each menu and submenu level; topological structure (MCP/MPP method–pattern–protocol factors or elements).
- **Pivotable / drillable:** Views that pivot by ledger, tenant, or DDD layer; drill from summary to deep to deeper to deepest (or "deepen" menu).
- **Multi-ledger / multi-tenant / multi-DDD:** Ties to law.rooz.live, pur.tag.vote, hab.yo.life, file.rooz.live; tenant/case filters; DDD aggregate labels.
- **Depth:** UI levels deep / deeper / deepest with "deepen" entry; scope reflected in %/# (state) and %.# (velocity) where applicable.
- **%/# %.# tracking:** Show state (e.g. X/Y tasks, N% complete) and velocity (e.g. change % per day) in headers or panels; link to `../docs/VALIDATION_METRICS_AND_PROGRESS.md`.

### in.html

- **Upgrade path:** Send .eml, posts, social app messages, web form/API, odoo (or other CRM), Symfony, SMS/TTS/IVR, and tracking dashboard.
- **Integration:** Link or embed flow from `WSJF-LIVE-V5-MODULAR.html#email-panel` for email send; extend with placeholders for social, web form, CRM, SMS/TTS/IVR and tracking (discover/consolidate then extend; no new backend without ROAM/ADR).
- **LLM API + good-enough-to-send:** See `../docs/LLM-EML-DASHBOARD-ITERATION-UPGRADE.md` — governance loop (ay → aisp-status.json), Grimes-style fix/re-validate until RUNNER_EXIT 0–1, and new .eml → WSJF/ROAM routing wire (Semi-Auto).

### Cross-reference

- **Move vs appeal:** See `../POST-TRIAL/26CV007491-590-MOVE-PLAN.md` — "Why is filing an appeal a priority if I'm moving?" (deadline is fixed; stay can pair with appeal for orderly move).
