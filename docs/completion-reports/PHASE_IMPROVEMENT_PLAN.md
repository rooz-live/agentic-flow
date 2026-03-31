# PHASE IMPROVEMENT PLAN — Agentic Flow Advocacy Pipeline

**Generated:** 2026-02-13
**Version:** 2.0.0
**Case:** 26CV005596-590 (MAA v. Bhopti)
**Priority Method:** WSJF (Weighted Shortest Job First)

---

## STATUS SNAPSHOT

| Component | State | Robustness | Coverage | Blocker |
|:---|:---|:---:|:---:|:---|
| `governance_council.py` (21-role) | ✅ Operational | 85% | 21/21 roles | None |
| `governance_council_33_roles.py` | ✅ **UPGRADED** | 90% | 33/33 roles | None — all TODOs implemented |
| `advocate_cli.py` | ✅ Operational | 70% | 14 commands | Needs 33-role integration |
| `vibesthinker_ai.py` | ✅ Operational | 65% | SFT+RL pipeline | Needs real LLM backend |
| `validation_dashboard_tui.py` | ✅ Operational | 80% | 18 widgets | Needs interactivity polish |
| `signature_block_validator.py` | ✅ Operational | 95% | settlement+court | Add discovery type |
| `telegram_notifier.py` | ✅ Operational | 90% | 10 event types | Needs .env token |
| `systemic_indifference_analyzer.py` | ✅ **UPGRADED** | 85% | Real file scanning | Timeline date filtering |
| `mail-capture-validate.sh` | ✅ **NEW** | 80% | 5 modes | macOS only for Mail.app |
| `communication_integration_strategy.md` | ✅ Strategy doc | — | 6 platforms | Implementation pending |
| `.env` consolidation | 🟡 Partial | 50% | 3 projects | Naming alignment needed |
| CV/Resume deployment | 🟡 Partial | 40% | Build script exists | pandoc + cPanel testing |
| Rust CLI (`RUST_CLI_SPEC.md`) | 🟠 Spec only | 10% | LRU cache TDD | napi-rs integration |
| React GUI dashboard | 🟠 Spec only | 5% | — | Electron + Mail.app |

---

## PHASE NOW — Immediate Value (Next 4 Hours)

> **Theme:** Surface errors early, validate before send, strengthen MAA case

### 1. ✅ DONE — 33-Role Governance Council Implementation

- **DoR:** `governance_council.py` importable, all base enums working
- **DoD:** All 12 strategic roles return real validation results, zero TODOs
- **Delivered:**
  - ROLE 22: Game Theorist — Nash equilibrium, first-mover, BATNA detection
  - ROLE 23: Behavioral Economist — 5 cognitive biases with strength scoring
  - ROLE 24: Systems Thinker — Feedback loops, leverage points, system archetypes
  - ROLE 25: Narrative Designer — Tension curve, climax position, emotional beats, SNR
  - ROLE 26: Emotional Intelligence — Empathy mapping, composure, steelmanning
  - ROLE 27: Information Theorist — Info density, redundancy, structure entropy
  - ROLE 28: Patent Examiner — Prior art citations, novelty, multi-theory
  - ROLE 29: Portfolio Strategist — Options diversity, risk/return, escalation path
  - ROLE 30: Temporal Validator — Date arithmetic, day-of-week, deadline proximity
  - ROLE 31: Systemic Indifference — Multi-org pattern matching, delay tactics
  - ROLE 32: Strategic Diversity — Pass@K with 12 settlement strategies, entropy
  - ROLE 33: MGPO Optimizer — Entropy-guided selection, confident winner detection
- **Verification:** `33/43 checks passed (76.7%)` on sample settlement email

### 2. ✅ DONE — Mail.app Integration (`mail-capture-validate.sh`)

- **DoR:** macOS, Python 3.10+, vibesthinker installed
- **DoD:** Pre-send validation gate, 5 modes, AppleScript bridge
- **Modes:**
  - `--file path.eml` — Validate specific file
  - `--auto` — Watch directories for new .eml files (3s poll)
  - (interactive) — Pick from Mail.app drafts via AppleScript
  - `--drafts` — List Mail.app drafts
  - `--save-research` — Save selected emails to RESEARCH/ directory
- **Features:** Signature validation → 33-role council → Temporal check → ROAM classification
- **Exit codes:** 0=PASS, 1=FAIL, 2=CONFIG, 3=MAIL_UNAVAILABLE

### 3. ✅ DONE — Systemic Indifference Analyzer v2.0

- **DoR:** Access to BHOPTI-LEGAL directory
- **DoD:** Scans real files, extracts timelines, validates evidence chains, generates scored report
- **Delivered:**
  - Real file system scanning (1,892 files across BHOPTI-LEGAL)
  - Date extraction from filenames and content
  - Multi-org pattern matching with delay tactics detection
  - Scoring on 0-40 scale with 5 components (depth, diversity, volume, timeline, delay bonus)
  - WSJF-prioritised output with judicial perspective
  - Markdown + JSON dual report generation
  - Cross-org comparison and shared pattern detection

### 4. Run Settlement Email Validation NOW

```bash
# Validate the settlement proposal
./scripts/mail-capture-validate.sh \
  --file ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND/04-SETTLEMENT-OFFERS/*.eml \
  --type settlement \
  --strategic \
  --notify

# Generate fresh systemic report
python3 scripts/systemic_indifference_analyzer.py --org MAA --output detailed

# Launch dashboard
./scripts/run-validation-dashboard.sh
```

### 5. Verify Signature Block Before Send

```bash
./signature_block_validator.py \
  -f ~/Documents/Personal/CLT/MAA/.../SETTLEMENT-PROPOSAL-SCENARIO-C.eml \
  -t settlement
```

**Exit criteria for PHASE NOW:**
- [ ] Settlement email passes 33-role validation at ≥85% consensus
- [ ] Signature block validated for correct type (settlement vs court)
- [ ] Temporal validation confirms no expired deadlines
- [ ] ROAM risk classified (Situational/Strategic/Systemic)
- [ ] Systemic score ≥35/40 for MAA

---

## PHASE NEXT — This Week

> **Theme:** Integrate, consolidate, harden CI/CD

### 6. Advocate CLI — 33-Role Integration (WSJF 8.5)

- **DoR:** `GovernanceCouncil33` importable, advocate_cli.py working
- **DoD:** `advocate validate --strategic` runs 33 roles, `advocate audit --adversarial` uses Roles 22-27

```python
# advocate_cli.py additions needed:
@cli.command()
@click.option('--strategic', '-s', is_flag=True, help='Run all 33 roles')
@click.option('--min-consensus', default=85, help='Minimum consensus percentage')
def validate(file, type, strategic, min_consensus):
    if strategic:
        from vibesthinker import GovernanceCouncil33
        council = GovernanceCouncil33()
        report = council.validate_document(content, doc_type=type)
    # ...
```

**Tasks:**
- [ ] Add `--strategic` flag to `validate` command
- [ ] Add `--adversarial` mode using Roles 22 (Game Theory) + 23 (Biases) + 26 (EI)
- [ ] Add `advocate systemic --scan` to invoke real file scanner
- [ ] Add `advocate temporal --verify` for standalone date checks
- [ ] Wire `advocate dashboard` to launch TUI with `--strategic` flag

### 7. Environment Consolidation (WSJF 6.0)

- **DoR:** `.env` files identified across projects
- **DoD:** Single `.env.example` per project, `env.catalog.json` as source of truth

**Tasks:**
- [ ] Align `CPANEL_API_KEY` → `CPANEL_API_TOKEN` everywhere
- [ ] Merge `.env.example` and `.env.template` in agentic-flow
- [ ] Remove `.env.backup` / `.env.bak` from repos
- [ ] Add `.env.backup`, `.env.bak` to `.gitignore`
- [ ] Run `./scripts/cpanel-env-setup.sh --all` to propagate
- [ ] Prompt for `CPANEL_API_TOKEN` if missing (not hardcode)
- [ ] Validate `TELEGRAM_BOT_TOKEN` format in `.env`

**Quick reference (target state):**

| Project | Primary env | Template |
|:---|:---|:---|
| investing/agentic-flow | `.env` | `.env.example` |
| agentic-flow-core | `.env` | `.env.example` |
| config/ (root) | `config/.env` | `config/secrets/.envrc.template` |
| lionagi-qe-fleet | — | `.env.example` |

### 8. CV/Resume Deployment Pipeline (WSJF 5.0)

- **DoR:** pandoc installed, cPanel API token in `.env`, `CV_RESUME_UPGRADE_2026.md` exists
- **DoD:** `./scripts/cv-deploy-cicd.sh all` builds PDF/DOCX, verifies URLs, deploys to cv.rooz.live

**Tasks:**
- [ ] Test `pandoc docs/cv/CV_RESUME_UPGRADE_2026.md -o CV_2026.pdf`
- [ ] Test cPanel API: `curl -k -H "Authorization: cpanel rooz:$TOKEN" "https://54.241.233.105:2083/..."`
- [ ] Implement URL health check in `cv-deploy-cicd.sh measure`
- [ ] Log deployment metrics to `.goalie/cv_deploy_metrics.jsonl`
- [ ] Review prior resumes at cv.rooz.live before deploying

### 9. Validation Dashboard Interactivity (WSJF 5.0)

- **DoR:** Textual 7.5+ installed, dashboard launches
- **DoD:** Real-time file watcher, keyboard navigation for all 33 roles, focus/strategic modes

**Tasks:**
- [ ] Wire `s` key (strategic mode) to call `GovernanceCouncil33.validate_document()`
- [ ] Add Roles 22-33 to the verdict DataTable (colour-coded by verdict)
- [ ] Add entropy sparkline widget in strategic mode
- [ ] Add Pass@K score display
- [ ] Improve `f` (focus mode) to filter by layer
- [ ] Add `d` key for diversity analysis popup
- [ ] Test with real settlement .eml files

### 10. Telegram Bot Token Validation (WSJF 4.0)

- **DoR:** @BotFather bot created, token obtained
- **DoD:** `.env` has valid `TELEGRAM_BOT_TOKEN`, `--test` flag confirms connectivity

```bash
# Setup
echo "TELEGRAM_BOT_TOKEN=your_token" >> .env
echo "TELEGRAM_CHAT_ID=your_chat_id" >> .env

# Test
python3 telegram_notifier.py --test

# Integrate with mail validation
./scripts/mail-capture-validate.sh --file email.eml --strategic --notify
```

---

## PHASE LATER — Next Sprint

> **Theme:** Scale, automate, cross-platform, precedent

### 11. Meta/LinkedIn/X Platform Integrations (WSJF 3.0)

- **DoR:** `communication_integration_strategy.md` reviewed, OAuth2 credentials obtained
- **DoD:** Unified notification API for Telegram + WhatsApp + Email + LinkedIn

**Tasks:**
- [ ] Implement `MetaMessagingHub` from strategy doc (WhatsApp Business API)
- [ ] Implement `LinkedInIntegration` for case milestone sharing
- [ ] Implement `XIntegration` for public advocacy updates
- [ ] Create `communication_platform_integrations.py` with unified send API
- [ ] Add rate limiting and webhook handlers
- [ ] OAuth2 token refresh automation

### 12. React GUI / Electron Dashboard (WSJF 2.5)

- **DoR:** Node.js 20+, React 19, reactflow installed
- **DoD:** Electron app with Mail.app integration, real-time validation as you type

```typescript
// legal-research-gui/src/App.tsx
import { FileTree, CaseTable, CitationValidator } from './components';
// 3-panel layout: File tree | Case table | Citation validator
```

**Tasks:**
- [ ] Scaffold Electron app with React + Tailwind
- [ ] Implement FileTree component for BHOPTI-LEGAL navigation
- [ ] Implement CaseTable with NC habitability case search
- [ ] Implement CitationValidator using CourtListener API
- [ ] Wire reactflow for visual case relationship graph
- [ ] Connect to vibesthinker Python backend via IPC

### 13. Rust CLI Architecture (WSJF 2.0)

- **DoR:** `RUST_CLI_SPEC.md` reviewed, `Cargo.toml` exists
- **DoD:** LRU cache manager TDD, napi-rs bindings for Node.js integration

**Tasks:**
- [ ] Implement cache manager with TDD (test first)
- [ ] Portfolio hierarchy with aggregate roots (DDD)
- [ ] ADR for Rust ↔ Node.js bridge decision
- [ ] napi-rs function callbacks for Win/Linux/macOS
- [ ] Benchmark vs Python implementation

### 14. WSJF Auto-Rotation Orchestrator (WSJF 2.0)

- **DoR:** `.agentdb/wsjf.sqlite` operational, orchestrator_learning.json exists
- **DoD:** WSJF delta threshold triggers rotation, HITL approval for cross-team changes

**Tasks:**
- [ ] Implement 30% WSJF delta threshold detection
- [ ] Time-decay recalculation (every 4 hours)
- [ ] Emergency priority auto-switch
- [ ] Map WSJF scores to agent capabilities
- [ ] Rotation recommendation dashboard (TUI widget)
- [ ] Override mechanism with audit log

### 15. Patent Application System (WSJF 1.5)

- **DoR:** Advocacy pipeline methodology documented
- **DoD:** Semi-auto patent draft/validation/enforcement pipeline

**Tasks:**
- [ ] Draft ADR for patent application architecture
- [ ] Implement examiner simulator (prior art search)
- [ ] Create team memory for patent portfolio
- [ ] Portfolio optimiser with risk/return analysis

### 16. Cross-Platform IDE Extensions (WSJF 1.0)

- **DoR:** VS Code Extension API, Zed plugin API
- **DoD:** vsix package for VS Code, Zed extension for advocate commands

**Target platforms:**
- VS Code (vsix)
- Windsurf
- Cursor / Roo
- Augment
- Zed (v0.app integration)

### 17. STX/OpenStack/HostBill Integration (WSJF 1.0)

- **DoR:** STX credentials, OpenStack CLI access
- **DoD:** Deployment pipeline for advocacy tools on STX infrastructure

### 18. Appellate Counsel Journey + Precedent (WSJF 0.5)

- **DoR:** Case settled or judgment entered
- **DoD:** Case study published, NC Justice Center partnership initiated

**Sequence:**
1. Document everything for future litigants
2. Settle this case for best possible outcome
3. THEN (after financial stability):
   - Partner with NC Justice Center
   - Support legislative amendment to § 42-37.1
   - Speak at tenant rights conferences
   - Write case study for law journals

---

## RISK REGISTER (ROAM)

| Risk | Category | Classification | Mitigation |
|:---|:---|:---|:---|
| Doug doesn't respond by deadline | OWNED | Strategic | Staged escalation: 5:30→8:00→9AM |
| Settlement fails | ACCEPTED | Situational | Litigation posture already prepared ($20K+ vs $12-18K settlement) |
| Date arithmetic errors in emails | MITIGATED | Systemic | Temporal Validator (Role 30) catches pre-send |
| Methodology disclosure in court filing | MITIGATED | Systemic | Signature block validator enforces type-specific rules |
| Evidence files don't match claims | OWNED | Strategic | Systemic analyzer v2.0 scans real files |
| Telegram token not configured | ACCEPTED | Situational | Graceful degradation — CLI still works |
| .env sprawl across projects | OWNED | Systemic | Phase NEXT: consolidation task |
| Overconfidence in validation scores | OWNED | Strategic | Surface validation caveat: checked text, not evidence ground truth |

---

## LEARNING SYSTEM ALIGNMENT

From "Where Error Goes to Hide" (Minocherhomjee):

| System Property | Advocacy Pipeline Implementation |
|:---|:---|
| **Divergent induction** | 33 roles validate independently (prevents groupthink) |
| **Pragmatic authority** | Reality overrules belief — real file scanning, not mocked data |
| **Error surfaced early** | Pre-send validation gate (not post-disaster) |
| **Correction without humiliation** | CONDITIONAL_APPROVE verdict allows iteration |
| **Multiple perspectives** | 6 Circles + 6 Legal + 5 Gov + 4 SW + 12 Strategic |
| **Adversarial review** | Judge/Prosecutor/Defense simulate opposition |
| **Temporal accountability** | Deadline validator catches "48 hours ≠ Friday" |
| **Systemic pattern recognition** | Multi-org analyzer identifies culture vs. incident |

**Regime classification:** Divergent Induction, Pragmatic, Long-term
> "Learning systems win time. Time always collects."

---

## ENTITY SCOREBOARD

| Entity | Systemic Score | Status | Phase |
|:---|:---:|:---|:---|
| MAA | **40/40** | 🔴 LITIGATION-READY | NOW — Settlement focus |
| Apex/BofA | **15/40** | 🟡 SETTLEMENT-ONLY | LATER — Gather evidence |
| US Bank | **10/40** | 🟠 DEFER | LATER |
| T-Mobile | **8/40** | 🟠 DEFER | LATER |
| Credit Bureaus | **5/40** | 🟠 DEFER | LATER |
| IRS | **3/40** | ⚪ NOT SYSTEMIC | LATER — Isolated event |

**Settlement strategy:** Focus ONLY on MAA (avoid confusion)
**Litigation strategy:** Include cross-org if needed (proves institutional pattern recognition)

---

## QUICK COMMANDS

```bash
# Phase NOW — Run these right now
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# 1. Validate settlement email (33-role strategic mode)
./scripts/mail-capture-validate.sh --file path/to/settlement.eml -t settlement --strategic

# 2. Generate systemic indifference report
python3 scripts/systemic_indifference_analyzer.py --org MAA

# 3. Validate signature block
python3 signature_block_validator.py -f path/to/email.eml -t settlement

# 4. Launch dashboard
./scripts/run-validation-dashboard.sh

# 5. Send Telegram notification
python3 telegram_notifier.py -e validation_passed -d "Settlement email ready"

# Phase NEXT — This week
pip install -e .                          # Install vibesthinker package
advocate validate --file email.eml --strategic
advocate systemic MAA --scan
./scripts/cpanel-env-setup.sh --all       # Propagate .env
./scripts/cv-deploy-cicd.sh all           # Build + deploy resume
```

---

## DEFINITION OF DONE (Global)

- [ ] All 33 roles return real validation results (zero TODOs)
- [ ] Settlement email passes ≥85% consensus before send
- [ ] Signature block correct for email type (settlement vs court)
- [ ] No temporal errors (dates, deadlines, day-of-week)
- [ ] Systemic score ≥35/40 for MAA
- [ ] ROAM risks classified and owned
- [ ] Pre-send validation gate operational (CLI or Mail.app)
- [ ] Reports saved (JSON + Markdown)
- [ ] Telegram notification functional (or gracefully degraded)

---

*Generated by Advocacy Pipeline v2.0.0 | WSJF-prioritised | 33-role governance council*