# Lean Budget Guardrails — Strategic Roadmap

**Status**: Accepted
**Date**: 2026-02-13
**WSJF Score**: 9.2 (Cost of Delay: 27 / Job Size: 2.9)
**Framework**: Now / Next / Later Horizons
**Method**: WSJF-driven, OODA-aligned, DoR/DoD exit conditions per initiative
**Case Context**: 26CV005596-590 (MAA v. Bhopti) — active settlement/litigation

---

## Governing Principle

> Don't blindly accept unvalidated, unverified prior acceptance criteria.
> Review/Define DoD → Build Validation → Implement → Verify → Measure → Learn.

Every line item below was placed in its horizon by answering three questions:

1. **What is the cost of delay?** (Business value + time criticality + risk reduction)
2. **What is the job size?** (Effort to reach first usable increment)
3. **Is this item validated, or am I carrying forward an assumption?**

Items that fail question 3 are tagged `⚠️ UNVALIDATED` and require a validation
step before any CapEx/OpEx commitment.

---

## Budget Taxonomy

| Category | Symbol | Description |
|:---------|:------:|:------------|
| CapEx (one-time) | 💎 | Tools, licenses, hardware, setup labour |
| OpEx (recurring) | 🔄 | Monthly SaaS, API costs, hosting, maintenance |
| Time (effort) | ⏱️ | Person-hours at opportunity cost |
| Free/OSS | 🆓 | No direct monetary cost |
| Revenue-generating | 💰 | Expected to produce income |
| Risk-reducing | 🛡️ | Prevents loss, litigation exposure, or rework |

---

## Horizon Map

```
  NOW (0–2 weeks)           NEXT (2–8 weeks)          LATER (8+ weeks)
  ─────────────────         ─────────────────         ─────────────────
  Fiscal discipline         Data-driven insight       Predictive systems
  Stop the bleeding         Refine operations         AI-driven anomaly
  Minimum viable gates      Automated reporting       Portfolio optimization
  Manual → Detection        Detection → Application   Application → Auto
  Level 0–1                 Level 2–3                 Level 4–5
```

---

## NOW — Fiscal Discipline & Minimum Viable Gates (0–2 weeks)

> **Theme**: Establish budget guardrails that prevent waste _today_.
> **Automation Level**: 0 (Manual) → 1 (Detection)

### Rationale for NOW placement

These items have the highest cost-of-delay because every day without them
means uncontrolled spend, unvalidated assumptions carried forward, and
settlement/litigation time pressure with a March 3 court hearing.

### N-1. Freeze Unvalidated Subscriptions

| Field | Value |
|:------|:------|
| WSJF | **12.0** (BV:8 + TC:9 + RR:7 / JS:2) |
| Type | 🛡️ Risk-reducing |
| Cost | 🆓 Zero — savings only |
| DoR | List of all active SaaS subscriptions identified |
| DoD | Each subscription tagged: KEEP / PAUSE / CANCEL with monthly cost |
| Success Metric | ≥30% reduction in non-essential OpEx within 7 days |

**Action**: Audit every recurring charge. Apply the OODA loop:

- **Observe**: Export bank/card statements for last 90 days
- **Orient**: Categorise each charge as ESSENTIAL / USEFUL / NICE-TO-HAVE / UNKNOWN
- **Decide**: Cancel UNKNOWN immediately, pause NICE-TO-HAVE, keep ESSENTIAL
- **Act**: Cancel/pause before next billing cycle

**Immediate restrictions** (enforce today):

| Service | Monthly Cost | Decision | Rationale |
|:--------|:-------------|:---------|:----------|
| Westlaw/Lexis | $400–$2,000 | ❌ CANCEL | Overkill for $13K case; use free alternatives |
| Casetext CoCounsel | $90–$150 | ⏸️ PAUSE | 7-day trial only if Gary confirms litigation path |
| Paid API keys (unused) | Varies | ❌ CANCEL | Audit `env.catalog.json` — remove keys with zero calls/month |
| Hosting (idle VMs) | Varies | 🔍 AUDIT | Check Hivelocity, STX instances for utilisation |
| Premium IDE plugins | $10–$50 | ⏸️ PAUSE | Use free tiers until revenue covers |
| CourtListener API | 🆓 Free | ✅ KEEP | Primary legal research tool |
| Google Scholar | 🆓 Free | ✅ KEEP | Case validation |
| Fastcase (NC Bar) | 🆓 Free w/ Bar | ⚠️ N/A | Pro Se lacks Bar access — find alternative |

### N-2. Environment Consolidation (.env Sprawl)

| Field | Value |
|:------|:------|
| WSJF | **8.5** (BV:5 + TC:6 + RR:6 / JS:2) |
| Type | 🛡️ Risk-reducing (leaked credentials, config drift) |
| Cost | ⏱️ 2 hours labour |
| DoR | `env.catalog.json` exists as source of truth |
| DoD | One `.env` + one `.env.example` per project, naming aligned |
| Success Metric | Zero duplicate env var names; `CPANEL_API_KEY` → `CPANEL_API_TOKEN` everywhere |

**Naming alignment** (single source of truth):

| Variable | Canonical Name | Old Names (retire) |
|:---------|:---------------|:-------------------|
| cPanel API | `CPANEL_API_TOKEN` | `CPANEL_API_KEY` |
| cPanel user | `CPANEL_USER` | `CPANEL_USERNAME` |
| cPanel host | `CPANEL_HOST` | — |
| Telegram | `TELEGRAM_BOT_TOKEN` | — |
| Telegram chat | `TELEGRAM_CHAT_ID` | — |

**Files to remove/merge**:
- `.env.backup`, `.env.bak` → add to `.gitignore`, delete from repo
- `.env.template` → merge into `.env.example`
- `.env.yolife` → if local-only, add to `.gitignore`

**Executed**:
```bash
./scripts/cpanel-env-setup.sh           # ✅ Local .env updated
./scripts/cpanel-env-setup.sh --all     # ✅ Propagated to config/.env
```

### N-3. Coherence Validation Gate (DDD/TDD/ADR)

| Field | Value |
|:------|:------|
| WSJF | **8.0** (BV:6 + TC:5 + RR:5 / JS:2) |
| Type | 🛡️ Risk-reducing (prevents accepting unvalidated criteria) |
| Cost | 🆓 Already built |
| DoR | `validate_coherence.py` operational |
| DoD | CI/CD gate: exit code 0 required for merge |
| Success Metric | Overall coherence ≥70% before any new feature starts |

**Current state** (after regex fix for ADR bold-markdown status):

| Layer | Health | Files | Status |
|:------|:------:|:-----:|:-------|
| PRD | 60% | 2 | 🟡 Needs measurable success metrics |
| ADR | 85% | 13 | 🟢 Fixed: status fields now detected through `**Status**: X` |
| DDD | 62.5% | 11 | 🟡 39 domain classes, needs more test coverage |
| TDD | 55% | 633 | 🟡 Only 3% domain class coverage (COH-001) |

**Insight**: "Documented but not decided" was a validator bug, not an ADR gap.
The real gap is **PRD → TDD traceability** (COH-003: acceptance criteria not
mapped to test assertions). This is the difference between having documentation
and having _validated_ documentation.

### N-4. Settlement Email Pre-Send Gate

| Field | Value |
|:------|:------|
| WSJF | **11.0** (BV:9 + TC:10 + RR:9 / JS:2.5) |
| Type | 🛡️ Risk-reducing (pre-send vs. post-disaster) |
| Cost | 🆓 Already built |
| DoR | `mail-capture-validate.sh` operational, 33-role council working |
| DoD | No settlement email sent without ≥85% consensus |
| Success Metric | Zero emails sent with temporal errors or signature mismatches |

```bash
./scripts/mail-capture-validate.sh --file path/to/email.eml --strategic --notify
```

### N-5. WSJF Tracker as Budget Enforcer

| Field | Value |
|:------|:------|
| WSJF | **7.5** (BV:5 + TC:7 + RR:3 / JS:2) |
| Type | ⏱️ Time-saving |
| Cost | ⏱️ 1 hour to formalise |
| DoR | `_WSJF-TRACKER/` directory exists |
| DoD | Every spend decision has WSJF score attached |
| Success Metric | No initiative started without documented WSJF ≥ 3.0 |

**Rule**: Before spending money or time on anything, calculate:

```
WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
```

If WSJF < 3.0, it goes to LATER or gets cut. No exceptions without HITL override.

### NOW Horizon — Total Budget

| Category | Estimated | Notes |
|:---------|:----------|:------|
| CapEx | **$0** | All tools are built or free-tier |
| OpEx saved | **−$500–$2,000/mo** | Subscription freeze |
| Time invested | **8 hours** | Env consolidation + WSJF discipline + coherence gate |
| Opportunity cost avoided | **High** | Pre-send gate prevents email disasters |

---

## NEXT — Data-Driven Insights & Workflow Integration (2–8 weeks)

> **Theme**: Turn detection into application. Automate reporting. Integrate workflows.
> **Automation Level**: 2 (Application) → 3 (With Review)

### Rationale for NEXT placement

These items deliver compounding value but require the NOW gates to be in place
first. Starting them without fiscal discipline would burn budget on optimising
processes that haven't been validated yet.

### X-1. Automated Spend Reporting Dashboard

| Field | Value |
|:------|:------|
| WSJF | **6.0** (BV:6 + TC:4 + RR:5 / JS:2.5) |
| Type | 🔄 OpEx insight |
| Cost | ⏱️ 8 hours + 🆓 Textual TUI (already installed) |
| DoR | Subscription audit from N-1 complete |
| DoD | Monthly spend visible in TUI dashboard with trend line |
| Success Metric | Time to generate monthly spend report < 5 minutes |

**Implementation**: Add a `BudgetWidget` to `validation_dashboard_tui.py`:
- Parse bank/card CSV exports
- Categorise by ESSENTIAL/USEFUL/NICE-TO-HAVE
- Show month-over-month delta
- Alert on any charge not in approved list

### X-2. WSJF-Driven Task Rotation Orchestrator

| Field | Value |
|:------|:------|
| WSJF | **5.5** (BV:5 + TC:5 + RR:4 / JS:2.5) |
| Type | ⏱️ Automation |
| Cost | ⏱️ 12 hours |
| DoR | `.agentdb/wsjf.sqlite` operational, `wsjf_rotation_orchestrator.py` exists |
| DoD | WSJF delta ≥30% triggers rotation recommendation; HITL approval for execution |
| Success Metric | ≥80% of high-WSJF tasks completed before low-WSJF |

**Features**:
- 30% WSJF delta threshold detection
- Time-decay recalculation every 4 hours
- Emergency priority auto-switch (with audit log)
- HITL approval for cross-team rotations

### X-3. CV/Resume Deployment Pipeline

| Field | Value |
|:------|:------|
| WSJF | **5.0** (BV:4 + TC:4 + RR:2 / JS:2) |
| Type | 💰 Revenue-enabling (job opportunities) |
| Cost | ⏱️ 4 hours + 💎 pandoc (free) |
| DoR | `CV_RESUME_UPGRADE_2026.md` exists, cPanel access validated |
| DoD | `./scripts/cv-deploy-cicd.sh all` builds PDF/DOCX, verifies URLs, deploys |
| Success Metric | cv.rooz.live returns 200; PDF renders correctly |

```bash
./scripts/cv-deploy-cicd.sh all       # Build + Measure + Learning
```

⚠️ **UNVALIDATED**: Assumption that `CPANEL_API_TOKEN` works. Validate before
investing time in the full pipeline:

```bash
curl -k -H "Authorization: cpanel rooz:$CPANEL_API_TOKEN" \
  "https://54.241.233.105:2083/json-api/listaccts?api.version=1"
```

If this returns an error, the cPanel integration task drops to LATER.

### X-4. Advocate CLI 33-Role Integration

| Field | Value |
|:------|:------|
| WSJF | **5.0** (BV:6 + TC:3 + RR:5 / JS:2.8) |
| Type | ⏱️ Productivity |
| Cost | ⏱️ 6 hours |
| DoR | `GovernanceCouncil33` importable, `advocate_cli.py` has 14 commands |
| DoD | `advocate validate --strategic` runs 33 roles from CLI |
| Success Metric | Full 33-role validation in < 5 seconds |

### X-5. Telegram Bot Activation

| Field | Value |
|:------|:------|
| WSJF | **4.0** (BV:3 + TC:3 + RR:2 / JS:2) |
| Type | 🔄 OpEx ($0 — Telegram bots are free) |
| Cost | ⏱️ 30 minutes |
| DoR | @BotFather bot created |
| DoD | `python3 telegram_notifier.py --test` returns ✅ |
| Success Metric | Real-time notifications for validation events |

### X-6. PRD Documents with Measurable Criteria

| Field | Value |
|:------|:------|
| WSJF | **4.5** (BV:4 + TC:3 + RR:2 / JS:2) |
| Type | 🛡️ Risk-reducing (validates before building) |
| Cost | ⏱️ 4 hours |
| DoR | `docs/prd/TEMPLATE.md` scaffolded |
| DoD | ≥3 PRDs with quantifiable success metrics; coherence score ≥80% |
| Success Metric | PRD layer health ≥80% in coherence validator |

**Critical PRDs needed**:
1. `PRD-001-settlement-validation-pipeline.md` — the email validation workflow
2. `PRD-002-systemic-indifference-analysis.md` — the multi-org analyzer
3. `PRD-003-lean-budget-guardrails.md` — this document's acceptance criteria

### NEXT Horizon — Total Budget

| Category | Estimated | Notes |
|:---------|:----------|:------|
| CapEx | **$0** | All tools free/OSS |
| OpEx | **$0** | Telegram free, cPanel already paid |
| Time invested | **35 hours** | Across 6 initiatives |
| Expected return | **High** | Automated reporting saves 4+ hours/month; CV enables job search |

---

## LATER — Predictive Systems & AI-Driven Anomaly Detection (8+ weeks)

> **Theme**: Invest in systems that compound over time. Only after NOW+NEXT validated.
> **Automation Level**: 4 (Fully Auto) → 5 (Semi-Auto HITL)

### Rationale for LATER placement

These items have high potential value but also high job size and unvalidated
assumptions. Investing here before NOW/NEXT are stable would be premature
optimisation — the error that "Where Error Goes to Hide" warns about:

> "Most systems do not fail because they are foolish or corrupt. They fail
> because learning becomes too expensive."

Building predictive budgeting before establishing fiscal discipline would be
building a warehouse of justifications rather than a body of knowledge.

### L-1. AI-Driven Anomaly Detection for Spend

| Field | Value |
|:------|:------|
| WSJF | **3.0** (BV:7 + TC:2 + RR:3 / JS:4) |
| Type | 🔄 OpEx insight |
| Cost | ⏱️ 20 hours + 🔄 potential API costs |
| DoR | ≥6 months of categorised spend data from X-1 |
| DoD | Alerts on spend anomalies >2σ from rolling mean |
| Success Metric | ≥1 anomaly caught before invoice due |

⚠️ **UNVALIDATED**: Requires 6+ months of clean spend data. Cannot start until
X-1 (Spend Dashboard) has been operational for one full quarter.

### L-2. Predictive Budgeting (Monte Carlo)

| Field | Value |
|:------|:------|
| WSJF | **2.5** (BV:6 + TC:2 + RR:2 / JS:4) |
| Type | 🛡️ Risk-reducing (forward-looking) |
| Cost | ⏱️ 30 hours |
| DoR | Anomaly detection (L-1) operational; ≥12 months historical data |
| DoD | 90-day budget forecast with confidence intervals |
| Success Metric | Forecast accuracy ≥80% at 30-day horizon |

### L-3. Semi-Auto Patent Application System

| Field | Value |
|:------|:------|
| WSJF | **2.0** (BV:5 + TC:1 + RR:2 / JS:4) |
| Type | 💰 Revenue-generating (IP portfolio) |
| Cost | ⏱️ 40+ hours + 💎 USPTO filing fees ($400–$1,600) |
| DoR | ADR-016 (Patent System) status changed from Proposed → Accepted |
| DoD | One provisional patent filed using semi-auto pipeline |
| Success Metric | Draft-to-filing time < 40 hours (vs. 120 hours traditional) |

**Inverted thinking on patent economics**:

| Traditional View | Inverted Opportunity |
|:-----------------|:---------------------|
| Patents cost $10K–$50K | Provisional filing costs $320 (micro entity) |
| Need patent attorney | Semi-auto system reduces attorney hours by 60% |
| Takes 18–36 months | Provisional gives 12-month priority date immediately |
| Only for big companies | Micro entity discount: 80% fee reduction |

**ADR-016 current status**: Proposed → Requires validation before LATER investment.

### L-4. React GUI / Electron Dashboard

| Field | Value |
|:------|:------|
| WSJF | **1.5** (BV:4 + TC:1 + RR:1 / JS:4) |
| Type | 💎 CapEx (Electron setup, design time) |
| Cost | ⏱️ 60+ hours |
| DoR | TUI dashboard validated; user research confirms GUI need |
| DoD | Electron app with Mail.app integration, real-time validation |
| Success Metric | Replaces TUI for daily workflow; < 3 second validation cycle |

⚠️ **UNVALIDATED**: Assumption that GUI is needed. TUI + CLI may be sufficient.
Validate by tracking: how many times per week does the user _wish_ for a GUI
that the TUI cannot provide? If answer < 3, this stays in LATER indefinitely.

### L-5. Cross-Platform IDE Extensions

| Field | Value |
|:------|:------|
| WSJF | **1.0** (BV:3 + TC:1 + RR:1 / JS:5) |
| Type | 💎 CapEx |
| Cost | ⏱️ 80+ hours (VS Code + Zed + Windsurf) |
| DoR | Core validation pipeline stable for ≥3 months |
| DoD | `advocate validate` available as VS Code command palette action |
| Success Metric | ≥10 weekly uses from IDE context |

### L-6. Meta/LinkedIn/X Platform Integrations

| Field | Value |
|:------|:------|
| WSJF | **1.0** (BV:3 + TC:1 + RR:1 / JS:5) |
| Type | 🔄 OpEx (API costs) + 💎 CapEx (OAuth2 setup) |
| Cost | ⏱️ 40 hours + 🔄 ~$20/mo API tier |
| DoR | Settlement resolved; public advocacy strategy approved by counsel |
| DoD | Unified notification API: Telegram + WhatsApp + LinkedIn |
| Success Metric | Case milestone updates posted to ≥2 platforms within 5 minutes |

⚠️ **UNVALIDATED**: Public social media posting during active litigation is a
legal risk. Gary must approve before any investment here.

### L-7. STX/OpenStack/HostBill Infrastructure Optimisation

| Field | Value |
|:------|:------|
| WSJF | **1.5** (BV:3 + TC:2 + RR:2 / JS:4.5) |
| Type | 🔄 OpEx reduction |
| Cost | ⏱️ 20 hours |
| DoR | Current infra utilisation measured (N-1 audit) |
| DoD | Idle instances terminated; remaining consolidated |
| Success Metric | ≥40% reduction in hosting OpEx |

### LATER Horizon — Total Budget

| Category | Estimated | Notes |
|:---------|:----------|:------|
| CapEx | **$320–$1,600** | Patent filing fees only (if validated) |
| OpEx | **~$20/mo** | API tier costs (if social integrations approved) |
| Time invested | **290+ hours** | Spread across 7 initiatives |
| Expected return | **Variable** | Patent portfolio potentially high; GUI uncertain |

---

## Horizon Decision Framework

How to decide if an item moves between horizons:

```
                    ┌─────────────────────────────┐
                    │  Is the DoR met?             │
                    └─────────┬───────────────────┘
                              │
                    ┌─────────▼───────────────────┐
                    │  No → Stay in current horizon │
                    │  Yes ↓                        │
                    └─────────┬───────────────────┘
                              │
                    ┌─────────▼───────────────────┐
                    │  Is the WSJF ≥ 3.0?          │
                    └─────────┬───────────────────┘
                              │
               ┌──────────────┴──────────────┐
               │ No → Stays in LATER          │
               │ Yes ↓                        │
               └──────────────┬──────────────┘
                              │
                    ┌─────────▼───────────────────┐
                    │  Is the assumption validated? │
                    │  (Not just documented)        │
                    └─────────┬───────────────────┘
                              │
               ┌──────────────┴──────────────┐
               │ No → Add validation step     │
               │       first (stays in NEXT)  │
               │ Yes ↓                        │
               └──────────────┬──────────────┘
                              │
                    ┌─────────▼───────────────────┐
                    │  PROMOTE to earlier horizon  │
                    └─────────────────────────────┘
```

**Demotion criteria** (item moves to later horizon):
- WSJF drops below 3.0 due to changed context
- Dependency fails validation (e.g., cPanel API doesn't work)
- Budget constraint requires deferral
- Risk classification changes from Situational → Systemic (larger problem)

---

## OODA Integration at Each Horizon

| Phase | NOW | NEXT | LATER |
|:------|:----|:-----|:------|
| **Observe** | Bank statements, .env sprawl, email quality | Spend trends, WSJF deltas, coherence scores | Market rates, patent landscape, infra utilisation |
| **Orient** | Subscription audit, coherence validator output | Dashboard metrics, rotation recommendations | Monte Carlo forecasts, anomaly alerts |
| **Decide** | Cancel/pause/keep; WSJF threshold gate | Invest/defer based on validated data | Build/buy/partner based on ROI |
| **Act** | Execute cancellations, run validators | Deploy dashboards, activate bots | File patents, launch integrations |

---

## Inverted Thinking Applied to Budget

| Surface Reading | Inverted Opportunity |
|:----------------|:---------------------|
| "We need Westlaw" → $2K/mo | Free alternatives + systemic analyzer → $0/mo |
| "Build GUI" → 60 hours | TUI already works → validate need first |
| "Patent costs $50K" → defer | Provisional micro-entity → $320 |
| "Silence from Doug" → frustration | Silence → documented non-response → discovery leverage |
| "Settlement deadline passed" → failure | Past deadline → holdover status → new leverage position |
| "No PRD documents" → gap | Coherence validator detected gap → now we can fix it |
| "ADR has no status" → undecided | Validator regex bug → ADRs _were_ decided; validator _wasn't_ reading them |

The last example is critical: **the coherence validator found a bug in
itself, not in the ADRs.** This is the learning system working correctly.
A belief system would have marked all ADRs as deficient and demanded rewrites.
A learning system checked its own assumptions first.

---

## Risk Classification for Budget Decisions

Every spend decision gets a ROAM + type classification:

| Risk Type | Budget Response | Example |
|:----------|:----------------|:--------|
| **Situational** (context-dependent) | Defer — may resolve itself | Doug busy reviewing documents |
| **Strategic** (deliberate behaviour) | Invest in countermeasure | MAA delaying → deadline pressure becomes leverage |
| **Systemic** (organisational pattern) | Budget for long-term solution | Recurring .env sprawl → env.catalog.json as source of truth |

---

## Success Metrics by Horizon

### NOW (measured weekly)

| Metric | Target | Current | Status |
|:-------|:-------|:--------|:-------|
| Monthly OpEx reduction | ≥30% | TBD (audit in progress) | 🟡 |
| Coherence score | ≥70% | 70.8% | ✅ |
| Rust test pass rate | 100% | 41/41 (100%) | ✅ |
| Pre-send validation gate | Operational | ✅ Built | ✅ |
| WSJF threshold enforced | All items ≥3.0 | In progress | 🟡 |
| Env naming conflicts | Zero | 2 remaining | 🟡 |

### NEXT (measured monthly)

| Metric | Target | Current | Status |
|:-------|:-------|:--------|:-------|
| Spend report generation time | < 5 min | N/A | ⚪ Not started |
| WSJF rotation accuracy | ≥80% tasks in order | N/A | ⚪ Not started |
| CV deployment success | cv.rooz.live returns 200 | N/A | ⚪ Not started |
| PRD layer health | ≥80% | 60% | 🟡 |
| ADR layer health | ≥90% | 85% | 🟢 |
| Domain test coverage (COH-001) | ≥30% | 3% | 🔴 |

### LATER (measured quarterly)

| Metric | Target | Current | Status |
|:-------|:-------|:--------|:-------|
| Spend anomaly detection rate | ≥1/quarter | N/A | ⚪ Blocked by X-1 |
| Budget forecast accuracy (30-day) | ≥80% | N/A | ⚪ Blocked by L-1 |
| Patent provisional filed | ≥1 | 0 | ⚪ Blocked by ADR-016 validation |
| Hosting OpEx reduction | ≥40% | N/A | ⚪ Blocked by utilisation audit |

---

## ADR Status Inventory (Post-Fix)

The coherence validator regex was fixed to read `**Status**: X` through
markdown bold formatting. Current ADR landscape:

| ADR | Status | Decision | Horizon |
|:----|:-------|:---------|:--------|
| ADR-001: yo.life Dimensional UI | **Proposed** | Not decided — needs validation | LATER |
| ADR-017: Portfolio Hierarchy | **Accepted** | Decided — implementation in Rust | NOW/NEXT |
| ADR-016: Patent System | **Proposed** | Not decided — needs market validation | LATER |
| ADR-001: DDD Layer Responsibilities | **Accepted** | Decided — enforced by coherence validator | NOW |
| ADR-002: Bounded Context Boundaries | **Accepted** | Decided — vibesthinker package boundary | NOW |
| ADR-003: Aggregate Design | **Accepted** | Decided — Portfolio/Dispute/GovernanceCouncil | NOW |
| ADR-0001: Multi-Format Document Extraction | Unknown | Needs status field added | NEXT |
| ADR-TEMPLATE | N/A | Template — no status expected | — |

**Key insight**: 5 of 7 real ADRs are **Accepted** (decided). 2 are **Proposed**
(documented but not decided). The proposed ones correctly belong in LATER
because their DoR is not yet met.

---

## Quarterly Review Cadence

| Event | Frequency | Purpose |
|:------|:----------|:--------|
| **Budget Standup** | Weekly (15 min) | Review spend vs. guardrails; flag breaches |
| **WSJF Recalculation** | Bi-weekly | Re-score all active items; promote/demote |
| **Coherence Validation** | Per commit (CI/CD) | Automated; exit code blocks non-compliant merges |
| **Horizon Review** | Monthly | Move items between NOW/NEXT/LATER based on validation |
| **PI Planning Sync** | Quarterly | Full roadmap review; budget reallocation |
| **Retro** | After each horizon completion | What worked, what didn't, what to change |

---

## Definitions

| Term | Meaning |
|:-----|:--------|
| **DoR** | Definition of Ready — prerequisites before work begins |
| **DoD** | Definition of Done — exit conditions for "complete" |
| **WSJF** | Weighted Shortest Job First: (BV + TC + RR) / JS |
| **OODA** | Observe, Orient, Decide, Act — decision loop |
| **ROAM** | Resolved, Owned, Accepted, Mitigated — risk classification |
| **CapEx** | Capital Expenditure — one-time investment |
| **OpEx** | Operational Expenditure — recurring cost |
| **HITL** | Human In The Loop — manual approval gate |
| **Horizon** | Time-boxed planning window (NOW/NEXT/LATER) |
| **Guardrail** | Hard constraint that prevents budget breach |
| **⚠️ UNVALIDATED** | Assumption carried forward without evidence |

---

*Generated by Lean Budget Guardrails Framework v1.0*
*Coherence: ADR-aligned, WSJF-scored, OODA-integrated*
*Validated by: DDD/TDD/ADR Coherence Validator (70.8% overall)*
*Rust Cache TDD: 41/41 tests pass*
*Date: 2026-02-13*