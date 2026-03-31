# Validator Inventory Report
<!-- CANONICAL: This is the ONE inventory. Do not create new registry/inventory files. -->
<!-- CROSS-REFS: ADR-019, CONSOLIDATION-TRUTH-INDEX.md, CASE_REGISTRY.yaml, CONSOLIDATION-TRUTH-REPORT.json -->
<!-- UPDATED: 2026-03-09 — Extended to cross-tree (agentic-flow + CLT/BHOPTI-LEGAL) -->
<!-- VECTOR-SEARCHABLE: validator, validation, consolidation, registry, inventory, cross-reference -->

## Overview

**Total Validators Found**: 44 scripts across 2 trees
- **agentic-flow tree** (`/code/investing/agentic-flow/`): 25 scripts
- **CLT tree** (`/CLT/MAA/Uptown/BHOPTI-LEGAL/`): 19 scripts
- **Convergent** (same domain, should share logic): 12 pairs
- **Divergent** (anti-fragile, keep separate): 8 scripts

---

## Domain Flow: Purpose → Accountability → Bounded Context

```
PURPOSE: Ensure every outbound email is legally sound, factually grounded, and strategically timed.

ACCOUNTABILITIES (holacratic circles):
├── Email Content Validation ← validation-core.sh, validate-email.sh (21-check)
├── Recipient/Format Gate    ← email-server.js (recipientDisplayName), validate-recipients.sh
├── Legal Citation Audit     ← validation-core.sh (core_check_legal_citations)
├── Strategic Depth Scoring  ← validate-email-depth.sh, email-server.js (strategicDepth)
├── Cross-Validator Truth    ← compare-all-validators.sh (symlink: validate.sh)
├── Project Coherence        ← validate_coherence.py, contract-enforcement-gate.sh
└── ROAM/Risk Freshness      ← check_roam_staleness.py, ROAM_TRACKER.yaml

DOMAIN FLOW (DDD bounded contexts):
  EmailValidation → PreSendGate → CompareAll → TruthReport → Dashboard
       ↑                                                         ↓
  CLT/_SYSTEM/_AUTOMATION/                          00-DASHBOARD/email-server.js
  (bash, 21 checks)                                 (Node.js, 8 JS + bash bridge)
```

## Convergence vs Anti-Fragile Divergence

### CONVERGE (share logic, reduce duplication)

| Check Domain | Canonical Source | Consumers (source/call it) |
|---|---|---|
| Placeholder detection | `validation-core.sh::core_check_placeholders` | pre-send-email-gate.sh, validation-runner.sh, unified-validation-mesh.sh |
| Legal citation format | `validation-core.sh::core_check_legal_citations` | pre-send-email-gate.sh, validation-runner.sh |
| Pro Se signature | `validation-core.sh::core_check_pro_se_signature` | pre-send-email-gate.sh |
| Attachment verification | `validation-core.sh::core_check_attachments` | pre-send-email-gate.sh, validation-runner.sh |
| Required recipients | `validation-core.sh::validate_required_recipients` | CLT validation-runner.sh |
| Employment claims | `validation-core.sh::validate_employment_claims` | CLT validation-runner.sh |
| Date consistency | CLT `validate-email.sh` (check 16-21) | Should feed into validation-core.sh |
| Case number validation | `CASE_REGISTRY.yaml` + `validate-case-numbers.sh` | semantic validators |

### DIVERGE — Anti-Fragile (keep separate, different lens = strength)

| Script | Why Divergent | Anti-Fragile Value |
|---|---|---|
| `validate-email.sh` (CLT, 21 checks) | RFC 5322 header parsing, multiline awk | **Anti-compatible**: catches format issues JS misses |
| `email-server.js` (8 JS checks) | Runtime in-browser, real-time feedback | **Anti-inflation**: fast, no shell overhead |
| `validate-email-depth.sh` (CLT) | Strategic depth scoring (urgency, authority, BV) | **Anti-shallow**: orthogonal to format checks |
| `validate-recipients.sh` (advocacy) | Wholeness: role coverage, org coverage | **Anti-fragile**: social graph validation |
| `validate_coherence.py` (Python) | DDD/ADR/TDD/PRD cross-layer coherence | **Anti-drift**: architecture-level, not email-level |
| `compare-all-validators.sh` (orchestrator) | Runs ALL validators, detects disagreements | **Contrastive**: meta-validator, finds blind spots |
| `send-with-full-wholeness.sh` (advocacy) | Christopher Alexander 15 properties | **Anti-reductive**: qualitative, not just regex |
| `validate-email-wsjf.sh` (semantic) | WSJF priority scoring on email content | **Anti-entropy**: priority-aware validation |

---

## Validator Categories

### 🟢 GREEN — agentic-flow tree (`/code/investing/agentic-flow/`)

#### Core (Canonical Source of Truth)
- ✅ `scripts/validation-core.sh` — Pure functions, CLI mode, --json, self-test
- ✅ `scripts/validation-runner.sh` — Sources core, orchestrates 4 checks
- ✅ `scripts/compare-all-validators.sh` — Meta-orchestrator (symlink: `scripts/validate.sh`)
- ✅ `scripts/pre-send-email-gate.sh` — 5-section gate, sources core

#### Project-Level
- ✅ `scripts/validators/project/validate_coherence.py` — DDD/ADR/TDD/PRD coherence (752 checks)
- ✅ `scripts/validators/project/check_roam_staleness.py` — ROAM freshness (<96h)
- ✅ `scripts/validators/project/contract-enforcement-gate.sh` — Contract staleness gate

#### Semantic (Email Content)
- ✅ `scripts/validators/semantic/validate-dates.sh` — Date consistency
- ✅ `scripts/validators/semantic/validate-contacts.sh` — Contact validation
- ✅ `scripts/validators/semantic/validate-case-numbers.sh` — Case number format
- ✅ `scripts/validators/semantic/validate-email-presend.sh` — Pre-send checks
- ✅ `scripts/validators/semantic/validate-wsjf-escalation.sh` — WSJF priority
- ✅ `scripts/validators/semantic/validate-events.sh` — Event/deadline validation

#### Email-Specific
- ✅ `scripts/validators/validate-email-master.sh` — Master email validator
- ✅ `scripts/validators/email/validate-email-wsjf.sh` — WSJF scoring
- ✅ `scripts/validators/validate-email-pre-send.sh` — Pre-send gate
- ✅ `scripts/validators/validate-email-response-track.sh` — Response tracking
- ✅ `scripts/validators/validate-email-bounce-detect.sh` — Bounce detection
- ✅ `scripts/validators/validate-email-dupe.sh` — Duplicate detection

### 🟢 GREEN — CLT tree (`/CLT/MAA/Uptown/BHOPTI-LEGAL/`)

#### _SYSTEM/_AUTOMATION (Core)
- ✅ `_SYSTEM/_AUTOMATION/validate-email.sh` — **21-check RFC 5322 validator** (pipefail-safe, awk multiline)
- ✅ `_SYSTEM/_AUTOMATION/validate-emails.sh` — Batch email validator (placeholder, address, date, citation, depth)
- ✅ `_SYSTEM/_AUTOMATION/validate-email-depth.sh` — Strategic depth scoring (7 dimensions)
- ✅ `_SYSTEM/_AUTOMATION/validation-core.sh` — Pure functions (v1.0, DDD aggregate, 337 lines)
- ✅ `_SYSTEM/_AUTOMATION/validation-runner.sh` — Orchestration (8 checks, feature flags, logging)
- ✅ `_SYSTEM/_AUTOMATION/validation-consolidation-v1-wip.sh` — Unified mesh (WIP)

#### 00-DASHBOARD (Node.js)
- ✅ `00-DASHBOARD/email-server.js` — **8 JS validators** + bash bridge (`/validate-full` endpoint)
  - recipient, subject, sender, vagueTemporalRefs, temporalConsistency, factualAnchoring, textHtmlParity, recipientDisplayName
  - Bridge: `runBashValidator()` calls validate-email.sh, `runValidationRunner()` calls validation-runner.sh

#### 11-ADVOCACY-PIPELINE
- ✅ `11-ADVOCACY-PIPELINE/scripts/validate-recipients.sh` — Role/org coverage
- ✅ `11-ADVOCACY-PIPELINE/scripts/validate-template-wholeness.sh` — Template completeness
- ✅ `11-ADVOCACY-PIPELINE/scripts/validate-template-dates.sh` — Template date checks
- ✅ `11-ADVOCACY-PIPELINE/scripts/validate-timestamp-generation.sh` — Timestamp validation
- ✅ `11-ADVOCACY-PIPELINE/scripts/validate-dashboard.sh` — Dashboard TUI launcher
- ✅ `11-ADVOCACY-PIPELINE/scripts/validate-dashboard-enhanced.sh` — Enhanced dashboard
- ✅ `11-ADVOCACY-PIPELINE/scripts/send-with-full-wholeness.sh` — 21-point wholeness (Christopher Alexander)

#### 00-DASHBOARD (Cosmetic — NOT real validation)
- ❌ `00-DASHBOARD/scripts/validate.sh` — **FAKE**: hardcoded PASS strings, static coverage. DO NOT USE.

### 🟡 YELLOW — Functional, Need Convergence Review
- ⚠️ `ay-validate-email.sh` — Thin wrapper → should call validation-runner.sh
- ⚠️ `mail-capture-validate.sh` — Mail.app integration, needs pip deps
- ⚠️ `send-with-tdd-gate.sh` — TDD validation loop
- ⚠️ `contract-enforcement-gate.sh` (agentic-flow root) — Contract verification

### 🔴 RED (Broken/Deprecated)
- ❌ `ay-aisp-validate.sh` — AISP validation (obsolete)
- ❌ `ay-validate-phase1.sh` — Phase 1 validation (obsolete)
- ❌ `ay-validate.sh` — General validator (obsolete)
- ❌ `validate_blockers.sh` — Blocker validation (obsolete)
- ❌ `validate_proxy_gaming.sh` — Proxy gaming detection (obsolete)
- ❌ `validate-bridge-integration.sh` — Bridge validation (obsolete)
- ❌ `validate-dynamic-thresholds.sh` — Threshold validation (obsolete)
- ❌ `validate-foundation.sh` — Foundation validation (obsolete)
- ❌ `validate-governor-integration.sh` — Governor validation (obsolete)
- ❌ `validate-learned-skills.sh` — Skills validation (obsolete)
- ❌ `validate-p0-implementation.sh` — P0 validation (obsolete)
- ❌ `validate-secrets.sh` — Secrets validation (obsolete)
- ❌ `run-verification-gates.sh` — Verification gates (obsolete)
- ❌ `send-settlement-with-gate.sh` — Settlement gate (obsolete)

## Consolidation Analysis

### Duplicated Functionality

**Email Validation (3 scripts):**
- `ay-validate-email.sh` - Legacy email validation
- `mail-capture-validate.sh` - Mail.app integration
- `send-with-tdd-gate.sh` - TDD email validation
- **CONSOLIDATED INTO**: `pre-send-email-gate.sh`

**General Validation (11 scripts):**
- Multiple `validate-*.sh` scripts with overlapping functionality
- **CONSOLIDATED INTO**: `validation-core.sh` + `validation-runner.sh`

### Coverage Metrics

| Category | Count | Working | Consolidated | Coverage % |
|----------|-------|---------|-------------|------------|
| Email Validators | 4 | 3 | 1 | 75% |
| General Validators | 19 | 2 | 2 | 11% |
| Gate Scripts | 6 | 2 | 2 | 33% |
| **TOTAL** | **25** | **7** | **5** | **28%** |

## Anti-Pattern Analysis

### 🚫 Critical Issues Found

| Anti-Pattern | Count | Impact | Scripts Affected |
|--------------|-------|--------|------------------|
| No JSON output | 18 | Can't aggregate | Most legacy scripts |
| Silent failures (2>/dev/null) | 12 | Hides errors | ay-*.sh scripts |
| Hardcoded paths | 15 | Not portable | validate-*.sh scripts |
| External dependencies | 8 | Tight coupling | mail-capture, bridge scripts |
| No coverage metrics | 20 | Can't report %/# | All legacy scripts |
| No orchestration | 22 | Each runs alone | Most scripts |

### ✅ Good Patterns Found

| Pattern | Count | Scripts |
|---------|-------|---------|
| Tool detection | 3 | pre-send-email-gate.sh, contract-enforcement-gate.sh |
| Graceful degradation | 2 | pre-send-email-gate.sh, validation-core.sh |
| Colorized output | 2 | pre-send-email-gate.sh, ay-validate.sh |
| Self-test mode | 1 | validation-core.sh |
| Strict exit codes | 2 | pre-send-email-gate.sh, contract-enforcement-gate.sh |

---

## MPP (Method Pattern Protocol) Classification

Each validator has a **Method** (how it checks), a **Pattern** (what structure it follows), and a **Protocol** (how it communicates results):

| Script | Method | Pattern | Protocol |
|---|---|---|---|
| `validation-core.sh` | Pure functions (bash) | DDD value object | `STATUS\|message` stdout, exit 0/1 |
| `validation-runner.sh` | Orchestration (source core) | DDD aggregate | PASS/FAIL/VERDICT + exit 0/1/2/3 |
| `compare-all-validators.sh` | Meta-aggregation (fork+exec) | Contrastive ensemble | CONSOLIDATION-TRUTH-REPORT.md + .json |
| `validate-email.sh` (CLT) | RFC 5322 parsing (awk/grep) | Checklist (21 checks) | `[PASS/FAIL/WARN] Check N:` stdout |
| `email-server.js` | JS runtime (Node HTTP) | MCP-style REST API | JSON `{summary, checks}` over HTTP |
| `validate_coherence.py` | AST/pattern matching (Python) | Cross-layer coherence | JSON `{layers, checks}` + exit 0/1 |
| `pre-send-email-gate.sh` | Gate (source core) | Pipeline stage | APPROVED/BLOCKED + exit 0/1/2 |
| `CASE_REGISTRY.yaml` | Declarative facts | Ground truth data | YAML (consumed by semantic validators) |

### Protocol Convergence Target

All validators should emit at minimum:
```json
{"validator": "name", "version": "x.y", "result": "PASS|FAIL|WARN", "checks": [...], "exit_code": 0}
```
Currently only `compare-all-validators.sh` and `email-server.js` produce structured JSON. The `--json` flag exists in `validation-core.sh` CLI mode but not all consumers use it.

---

## Cross-Reference Map: All 23 Existing Registries

**RULE: Do not create registry file #24. Extend one of these instead.**

### CANONICAL (extend these)

| File | Role | Extend When |
|---|---|---|
| **`VALIDATOR_INVENTORY.md`** (this file) | Master inventory of all validators | Adding/removing/reclassifying validators |
| **`scripts/validators/CASE_REGISTRY.yaml`** | Ground truth facts for semantic validation | Case milestones, contacts, statutes change |
| **`docs/adr/ADR-019-VALIDATION-CONSOLIDATION.md`** | Architecture decision record | Changing consolidation strategy |
| **`scripts/CONSOLIDATION-TRUTH-INDEX.md`** | Validator overlap matrix + run instructions | Adding validators to `compare-all-validators.sh` |

### GENERATED (output of `compare-all-validators.sh` — do not hand-edit)

| File | Role | Regenerate With |
|---|---|---|
| `CONSOLIDATION-TRUTH-REPORT.md` (root) | Latest truth report | `./scripts/compare-all-validators.sh` |
| `reports/CONSOLIDATION-TRUTH-REPORT.md` | Archived report copy | Same |
| `reports/CONSOLIDATION-TRUTH-REPORT.json` | Machine-readable report | `./scripts/compare-all-validators.sh --json` |

### HISTORICAL (do not update — reference only)

| File | Role | Why Frozen |
|---|---|---|
| `reports/CONSOLIDATION-TRUTH-REPORT-20260226.md` | Snapshot | Pre-consolidation baseline |
| `reports/CONSOLIDATION-ROADMAP-20260227-2217.md` | Roadmap v1 | Superseded by ADR-019 |
| `reports/VALIDATION-CONSOLIDATION-ROADMAP-20260228.md` | Roadmap v2 (111 validators) | Superseded by this inventory |
| `scripts/CONSOLIDATION-STATUS.md` | "FINAL STATUS" snapshot | Superseded by this inventory |
| `scripts/CONSOLIDATION-EXECUTION-PLAN.md` | Execution plan snapshot | Superseded by ADR-019 |
| `docs/VALIDATION-CONSOLIDATION-PLAN.md` | 496-line plan | Superseded by ADR-019 |
| `docs/DPC-CONSOLIDATION-ACTION-PLAN.md` | DPC action plan | Superseded by this inventory |
| `CAPABILITY-CONSOLIDATION-SUMMARY.md` | Dashboard capability extraction | Reference for dashboard features |
| `DASHBOARD_CONSOLIDATION_PLAN.md` | Dashboard consolidation | Superseded by this inventory |

### INVENTORY DATA (flat lists — regenerate, don't hand-edit)

| File | Regenerate With |
|---|---|
| `inventory-scripts.txt` | `find scripts/ -name '*.sh' -exec ls -la {} \;` |
| `inventory-docs.txt` | `find docs/ -name '*.md' -exec ls -la {} \;` |
| `inventory-configs.txt` | `find . -name '*.yaml' -o -name '*.json' \| grep -v node_modules` |
| `inventory-tests.txt` | `find tests/ -exec ls -la {} \;` |
| `reports/validation-audit/scripts-inventory.txt` | `ls -la scripts/*.sh` |

### OTHER REGISTRIES (separate domains, not validation)

| File | Domain |
|---|---|
| `reports/dashboard-registry.json` | Dashboard URLs |
| `docs/PROTOCOL_REGISTRY.md` | Communication protocols |
| `VisionFlow/multi-agent-docker/mcp-infrastructure/mcp-full-registry.json` | MCP tools |

---

## Anti-Fragile Contrastive Validation Strategy

### Why Keep Multiple Validators (Intentional Divergence)

The goal is NOT to reduce to 1 validator. The goal is to ensure:
1. **Every validator knows about its siblings** (this inventory)
2. **Convergent checks share a single source** (validation-core.sh pure functions)
3. **Divergent checks are intentionally different** (anti-fragile value documented above)
4. **`compare-all-validators.sh` detects disagreements** (contrastive meta-validation)

### The Contrastive Pattern

```
Validator A (bash, RFC 5322)  ─┐
Validator B (JS, runtime)      ├─→ compare-all-validators.sh ─→ TRUTH REPORT
Validator C (Python, coherence)─┘       ↓ disagreement?
                                   ⚠️ Flag for human review
                                   (anti-fragile: disagreement = signal, not noise)
```

When validators **agree**: high confidence, auto-proceed.
When validators **disagree**: the disagreement itself is the most valuable signal — it means one validator caught something the others missed.

---

## DPC Impact Analysis

### Current State (post cross-tree integration)
- **%/# Coverage**: 64% (28/44 validators working across both trees)
- **R(t) Robustness**: 60% (cross-tree bridge via email-server.js /validate-full)
- **DPC_R(t)**: 38.4

### After Full Convergence
- **%/# Coverage**: 85% (convergent checks deduplicated, divergent checks preserved)
- **R(t) Robustness**: 90% (all canonical scripts emit JSON, cross-referenced)
- **DPC_R(t)**: 76.5

---

## Vector Search Optimization

For ruvector or other vector search indexing, this file contains keywords covering the full scope:
`validator validation consolidation registry inventory email legal citation RFC5322 placeholder
recipient subject sender depth wholeness coherence ROAM WSJF DDD ADR PRD TDD MCP MPP
anti-fragile contrastive convergence divergence cross-tree cross-reference bash node.js python
validation-core validation-runner compare-all-validators pre-send-email-gate email-server
CASE_REGISTRY CONSOLIDATION-TRUTH-REPORT BHOPTI-LEGAL agentic-flow advocacy-pipeline dashboard`
