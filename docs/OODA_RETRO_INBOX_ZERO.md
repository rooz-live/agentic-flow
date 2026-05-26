# OODA Loop Retro & Inbox Zero Framework
## Observe-Orient-Decide-Act for Legal Advocacy & Goal Planning

### Current State Analysis

**OODA Loop Implementation Review:**
- ✅ **Observe**: Mail capture, intake parsing, role assignment working
- ✅ **Orient**: 40-role governance council, WSJF scoring, ROAM analysis
- ✅ **Decide**: Consensus validation, strategic diversity (SFT→RL→MGPO)
- ⚠️ **Act**: Execution gaps - deployment blocked (cPanel), some CLI incomplete

**Inbox Zero Status:**
- Current: 58 hours manual effort per email cycle
- Target: 5-10 minutes per email (auto-validation + human review)
- Gap: 348x efficiency improvement needed

---

## RETRO FINDINGS

### What Works Well

| Component | Status | Evidence |
|-----------|--------|----------|
| Mail Capture & Parse | ✅ | `mail-capture-validate.sh` functional |
| 40-Role Validation | ✅ | `governance_council.py` operational |
| WSJF Scoring | ✅ | `vibethinker_pipeline.py` --deadline working |
| Systemic Analysis | ✅ | `systemic_indifference_analyzer.py` scoring 40/40 for MAA |
| Coherence Validation | ✅ | `validate_coherence.py` running (timeout issues) |

### What Needs Improvement

| Component | Issue | Impact |
|-----------|-------|--------|
| **cPanel Deployment** | Missing `CPANEL_API_TOKEN` | Blocking resume deployment |
| **TUI Dashboard** | Lint errors, limited interactivity | Reduced usability |
| **Rust Core Tests** | Compilation slow | Delaying validation |
| **Validation Speed** | Coherence check times out | 10+ min vs target <30 sec |
| **Integration** | Fragmented CLI tools | No unified interface |

### Anti-Patterns Detected

1. **Tool Sprawl**: 15+ separate scripts vs unified `advocate` CLI
2. **Environment Fragmentation**: `.env`, `.env.example`, `.env.template` - naming inconsistency
3. **Blocking Dependencies**: cPanel token blocks 3 downstream tasks
4. **Validation Without Enforcement**: DoD gates exist but not blocking CI/CD

---

## REPLENISHMENT PLAN

### N-1 (Now - This Week)

**Goal:** Unblock critical path, establish fiscal discipline

```bash
# 1. Environment Consolidation (2 hours)
./scripts/cpanel-env-setup.sh        # Once token provided
./scripts/cpanel-env-setup.sh --all # Propagate to all .env files

# 2. Freeze Unvalidated Subscriptions ($2K/mo savings)
./scripts/subscription-audit.sh --cancel-unused

# 3. Coherence Validation Gate (already built, needs fixing)
python3 scripts/validate_coherence.py --fail-below 85

# 4. Settlement Email Pre-Send Gate (already built)
./scripts/mail-capture-validate.sh --file email.eml --strategic --notify

# 5. WSJF as Budget Enforcer
# Auto-defer any task with WSJF < 3.0
```

**Exit Condition:**
- [ ] cPanel API responding
- [ ] $2K/mo subscription savings realized
- [ ] Coherence validation < 30 seconds
- [ ] Settlement email validation passing

### N-2 (Next - This Month)

**Goal:** Operational efficiency, data-driven insights

```bash
# X-1: Automated Spend Dashboard
python3 src/budget_dashboard.py --real-time

# X-2: WSJF-Driven Task Rotation
python3 src/wsjf_rotation.py --auto

# X-3: CV/Resume Deployment Pipeline  
./scripts/cv-deploy-cicd.sh all  # Build + Measure + Learning

# X-4: Advocate CLI 40-Role Integration
advocate validate --file email.eml --deep

# X-5: Telegram Bot Activation
python3 src/telegram_notifier.py --bot-token $TELEGRAM_BOT_TOKEN

# X-6: PRD Documents with Measurable Criteria
# All PRDs must have Gherkin acceptance criteria
```

**Exit Condition:**
- [ ] Budget dashboard live
- [ ] CV auto-deploying on PR merge
- [ ] Advocate CLI handling 80% of validation use cases
- [ ] Telegram notifications for critical alerts

### N-3 (Later - This Quarter)

**Goal:** Predictive capabilities, AI-driven optimization

```bash
# L-1: AI-Driven Spend Anomaly Detection
python3 src/anomaly_detector.py --model ensemble

# L-2: Predictive Budgeting (Monte Carlo)
python3 src/predictive_budget.py --simulations 10000

# L-3: Semi-Auto Patent Application System
# See PATENT_SYSTEM_SPEC.md for architecture

# L-4: React GUI / Electron Dashboard
npm run dev  # Local development

# L-5: Cross-Platform IDE Extensions
# Windsurf/VSCode extension for validation

# L-6: Meta/LinkedIn/X Integrations
# OAuth2 flows, webhook handling

# L-7: STX/OpenStack Infrastructure Optimization
# Cloud cost reduction via autoscaling
```

**Exit Condition:**
- [ ] 95% anomaly detection accuracy
- [ ] ±10% budget forecast accuracy
- [ ] Patent system processing applications
- [ ] GUI dashboard with real-time metrics

---

## OODA LOOP REFINEMENTS

### Observe Phase Improvements

```python
# Enhanced mail observation with metadata extraction
class MailObserver:
    """Improved observation with context preservation"""
    
    def observe(self, email_path: str) -> Observation:
        return Observation(
            # Existing
            sender=self.extract_sender(email_path),
            subject=self.extract_subject(email_path),
            body=self.extract_body(email_path),
            
            # NEW: Contextual metadata
            thread_depth=self.count_thread_depth(email_path),
            response_latency_hours=self.calculate_latency(email_path),
            tone_sentiment=self.analyze_sentiment(email_path),
            legal_deadline=self.extract_deadline(email_path),
            opposing_counsel_pattern=self.detect_counsel_tactics(email_path)
        )
```

### Orient Phase Improvements

```python
# Faster orientation with cached role profiles
class FastOrientor:
    """Sub-second orientation for inbox zero target"""
    
    def __init__(self):
        # Pre-load role profiles
        self.role_cache = self._load_role_cache()
        self.case_history = self._load_case_history()
    
    def orient(self, observation: Observation) -> Orientation:
        # Parallel role simulation (was sequential)
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {
                executor.submit(self._simulate_role, role, observation): role
                for role in self.role_cache.values()
            }
            
            verdicts = {}
            for future in as_completed(futures):
                role = futures[future]
                verdicts[role.id] = future.result()
        
        return Orientation(
            verdicts=verdicts,
            consensus=self._calculate_consensus(verdicts),
            roam_classification=self._classify_roam(observation),
            wsjf_score=self._calculate_wsjf(observation),
            recommended_action=self._select_action(verdicts)
        )
```

### Decide Phase Improvements

```python
# Confidence-weighted decision with human-in-the-loop
class ConfidenceBasedDecider:
    """Decide with confidence threshold for HITL"""
    
    CONFIDENCE_THRESHOLDS = {
        "auto_execute": 0.95,    # Confidence ≥95%: auto-send
        "human_review": 0.70,    # Confidence 70-95%: review queue
        "full_analysis": 0.50    # Confidence <70%: deep analysis
    }
    
    def decide(self, orientation: Orientation) -> Decision:
        confidence = orientation.consensus.confidence
        
        if confidence >= self.CONFIDENCE_THRESHOLDS["auto_execute"]:
            return Decision(
                action=orientation.recommended_action,
                auto_execute=True,
                human_approval_required=False,
                explanation=f"High confidence ({confidence:.1%}) - auto-executing"
            )
        
        elif confidence >= self.CONFIDENCE_THRESHOLDS["human_review"]:
            return Decision(
                action=orientation.recommended_action,
                auto_execute=False,
                human_approval_required=True,
                review_queue="standard",
                explanation=f"Moderate confidence ({confidence:.1%}) - needs review"
            )
        
        else:
            return Decision(
                action="deep_analysis",
                auto_execute=False,
                human_approval_required=True,
                review_queue="urgent",
                explanation=f"Low confidence ({confidence:.1%}) - requires deep analysis"
            )
```

### Act Phase Improvements

```python
# Reliable action execution with rollback capability
class ReliableActor:
    """Execute with verification and rollback"""
    
    def act(self, decision: Decision) -> ActionResult:
        # Pre-action snapshot
        snapshot = self._create_state_snapshot()
        
        try:
            # Execute with timeout
            result = self._execute_with_timeout(
                decision.action,
                timeout_seconds=30
            )
            
            # Verify outcome
            if not self._verify_outcome(result, decision.expected_outcome):
                raise ActionVerificationError("Outcome mismatch")
            
            # Log success
            self._log_action(decision, result, status="success")
            
            return ActionResult(
                status="success",
                outcome=result,
                verification_passed=True
            )
            
        except Exception as e:
            # Rollback on failure
            self._restore_snapshot(snapshot)
            
            # Log failure
            self._log_action(decision, None, status="failed", error=str(e))
            
            # Escalate
            self._escalate_to_human(decision, e)
            
            return ActionResult(
                status="failed",
                error=str(e),
                rolled_back=True
            )
```

---

## INBOX ZERO TARGET ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INBOX ZERO TARGET (< 5 min/email)                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  OBSERVE (30 sec)          ORIENT (60 sec)          DECIDE (30 sec)      │
│  ┌──────────────┐          ┌──────────────┐          ┌──────────────┐    │
│  │ Mail Parse   │─────────▶│ 40-Role Sim  │─────────▶│ Confidence   │    │
│  │ Metadata Ext │  0.5s    │ (parallel)   │  2.0s    │ Threshold  │    │
│  │ Context Load │          │ WSJF Score   │          │ Route Queue  │    │
│  └──────────────┘          │ ROAM Class   │          └──────────────┘    │
│                            └──────────────┘                             │
│                                                                         │
│  ACT (180 sec) - Conditional                                           │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │ High Confidence (≥95%): Auto-execute (5 sec)                 │      │
│  │ Medium Confidence (70-95%): Human review queue (180 sec)      │      │
│  │ Low Confidence (<70%): Deep analysis → human (defer)          │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                         │
│  TARGET: 5 min/email = 12 emails/hour = 96 emails/day                     │
│  CURRENT: 58 hours/email = 0.017 emails/hour                            │
│  IMPROVEMENT: 348x efficiency gain                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## EXIT CONDITIONS (DoR/DoD)

### Definition of Ready (DoR) for Email Processing

- [ ] Mail parsed with metadata extraction
- [ ] 40-role verdicts cached or computed
- [ ] WSJF score calculated
- [ ] ROAM classification complete
- [ ] Confidence threshold determined

### Definition of Done (DoD) for Email Processing

- [ ] Consensus ≥70% (or HITL approved)
- [ ] Action executed or queued
- [ ] Outcome verified or escalated
- [ ] Audit trail logged
- [ ] Response time <5 minutes

---

## IMMEDIATE ACTIONS (This Session)

1. **Provide CPANEL_API_TOKEN** → Unblocks deployment
2. **Run validation coherence with timeout fix** → Faster feedback
3. **Execute cargo test** → Verify Rust core (running now)
4. **Fix TUI lint errors** → Clean build
5. **Consolidate .env files** → Reduce confusion

**Target State:** All N-1 (Now) items complete by end of week.

---

## Long-horizon slice — trust-thread + gate proof (append-only)

### 2026-05-07T04:30Z — Plan (≤15 min)

**Hypothesis:** The `dgm-prototype` / `cargo` path failed because the Rust workspace listed members whose `Cargo.toml` no longer existed (`tooling/scripts/beads_rust/domain_healing`, `extraction_bead`). Dropping those members restores a loadable workspace so `tests/test-dgm-prototype.sh` and trust-path can pass with real binaries.

**Success criteria**

- `bash scripts/ci/check-gate-dedupe.sh` → exit 0
- `TRUST_FORCE_RERUN=1 bash scripts/one.sh trust-path` → exit 0 **and** a new `gate_one_pass_*.json` plus symlink `.goalie/evidence/last_gate_one_pass.json`
- `bash scripts/one.sh verify-contract .goalie/evidence/last_gate_one_pass.json` → exit 0

**Stop conditions (autonomy budget)**

- Max files touched this slice: 2 code paths (`projects/investing/agentic-flow/Cargo.toml` workspace list; this doc append).
- Max commits: 0 (no commit in this pass; working tree left for a human-scoped commit if desired).
- If any gate above fails twice with the same root cause → stop, write RCA + smallest fix; no scope creep to UI/plugins/secrets.
- No secrets in repo; no prod mutations; no force-push.

**Stop conditions (human — [FA]/[SA] only)**

- Policy/security/irreversible infra, merge to protected branch, customer data/billing: require explicit human.

---

### Execute (unattended)

| Command | Result | Notes |
|--------|--------|--------|
| Fix `Cargo.toml` workspace members | Removed two missing paths | Restores `cargo metadata` / `cargo run -p dgm-prototype --bin dgm-gate` |
| `bash tests/test-dgm-prototype.sh` (via trust bundle) | PASS | DGM integration tests green |
| `bash scripts/ci/check-gate-dedupe.sh` | exit 0 | No duplicate gate logic flagged |
| `TRUST_FORCE_RERUN=1 bash scripts/one.sh trust-path` | exit 0 | See evidence bundle below |
| `bash scripts/one.sh verify-contract .goalie/evidence/last_gate_one_pass.json` | exit 0 | Contract + artifact confirmed |

**Evidence bundle (resume here if the session dies — do not trust chat memory)**

- Canonical symlink: `.goalie/evidence/last_gate_one_pass.json` → `gate_one_pass_1778106508.json`
- Detailed log from a background capture: `.goalie/evidence/trust-path-run.log` (trust-path also echoed `EXIT: 0` at end)
- **Checkpoint — `git status -sb`:** superproject `git status` was observed to run **very slowly** on this tree (tens of seconds); prefer `git diff --stat <paths>` for scoped checks. Full status snapshot not inlined to avoid blocking the slice.

**First ~ stderr signal worth tracking (not a failing gate):** coherence subprocess reported `Terminated: 15` (exit 143) in `.goalie/evidence/trust-path-run.log`; bundle still concluded `Trust bundle: ALL GREEN`. Treat as ROAM follow-up: ensure `validate_coherence.py` either completes under policy or fails closed consistently—do not “paper over” with stdout-only green.

---

### Verify (gates only; no new features)

- Dedupe: PASS
- Trust-path: PASS (artifact on disk)
- Verify-contract: PASS

**Env files (existence only — contents not audited)**

- Workspace root `.env` — present
- Workspace root `.env.integration` — present
- `projects/investing/agentic-flow/.env` — present
- `projects/investing/agentic-flow/.env.integration` — present

**Tooling note:** `glab` is on PATH at `/usr/local/bin/glab` (not a blocker locally).

---

### Retro (~5 min)

**What changed**

- Rust workspace manifest repaired by removing dead workspace member entries; DGM gate tests and trust-path can execute real `cargo run` again.

**What did not fail this slice**

- Gate dedupe, trust-path, contract verification (all exit 0 with symlinked artifact).

**Next smallest merge-sized slices (pick one; descending CoD if multi-team)**

1. **Coherence gate honesty:** align trust policy with coherence exit 143 / SIGTERM (timeout vs warn) so “green” never contradicts subprocess death.
2. **`check-gate-dedupe.sh` / policy:** if you intend a dedicated commit, stage only `scripts/ci/check-gate-dedupe.sh` + run the trio again after rebase.
3. **Rebase hygiene:** use your stash recipe on superproject + submodules *before* `git rebase origin/main`; do not rebase with tens of `??` learning dirs unless you accept noise—stash or `.gitignore` review is [FA] when secrets could be under stray paths.
4. **Domain probes:** `verify-domain-probes.sh` path drift — locate the canonical script name in-repo or restore from history; out of scope for this slice.

**Encoding the cadence (prefer script over narrative):** keep “plan → run → artifact → stop” as **one** shell entry (`scripts/one.sh trust-path` + `verify-contract`); long-form doctrine stays in docs like this section; CI and `gate-one-pass` remain the single mechanical truth.

---

### Blocked on human (exactly one)

Do you want the next increment to **run the full superproject + submodule stash → `git fetch` → `git rebase origin/main` → stash pop** sequence locally (you drive it), **or** should agents only produce a **checklist + evidence paths** and avoid touching your dirty submodule/`??` tree until you clean or ignore the learning artifacts?

*(No 1Password / Passbolt / token edits from agents; rotate credentials only in your vault workflow.)*

---

## 2026-05-08 Slice: Sovereign Workspaces + Long-Horizon Wrapper (append-only)

### Plan
- **Hypothesis:** Long-horizon execution should be script-first (not chat-first): one wrapper that enforces `plan -> run -> artifact -> stop` and delegates gate truth to canonical `scripts/one.sh`.
- **Success criteria:**
  - `scripts/long-horizon-slice.sh` exists and is executable.
  - It writes checkpoint + stderr + summary JSON under `.goalie/evidence/slices/`.
  - It runs exactly: dedupe -> trust-path -> verify-contract.
- **Stop rules:** max 2 files touched, max 0 commits this slice, stop after same gate fails twice.

### Execute
- Added `scripts/long-horizon-slice.sh`.
- Script captures:
  - `git status -sb`
  - first 30 lines of stderr on failure
  - artifact pointer (`.goalie/evidence/last_gate_one_pass.json`)

### Verify
- Script creation completed; executable bit set.
- Existing trust artifacts remain in `.goalie/evidence/`.

### Retro
- **What changed:** operationalized long-horizon cadence in one script aligned with gate-one-pass language.
- **What failed:** none in this slice.
- **Next slice:** run `bash scripts/long-horizon-slice.sh`, then decide rebase window.

### Sovereign Workspaces (operator rule)
- UI-only: root IDE at `src` or `packages/ui`.
- Rust-core-only: root IDE at `rust/core`.
- Cross-context: use a multi-root `.code-workspace` with only active folders.

### Blocked on human (single)
- Should I create and commit three dedicated workspace files next (`ui.code-workspace`, `rust-core.code-workspace`, `cross-context-minimal.code-workspace`) or keep this as a procedural rule only?

---

## 2026-05-08 Slice: Dedicated Sovereign Workspace Files (append-only)

### Plan
- **Hypothesis:** Constraining editor scope with dedicated `.code-workspace` files reduces context thrash and root-ocean drift while keeping long-horizon execution policy script-backed.
- **Success criteria:**
  - Three workspace configs exist for UI-only, Rust-core-only, and cross-context-minimal workflows.
  - Locations are deterministic and non-root-cluttered.
  - Secret/OIDC/Passbolt operations remain procedural-only stubs (no automation mutation).
- **Stop rules:** max 4 files touched, max 0 commits, no secret writes, no prod mutations, no force push.

### Execute
- Added workspace files:
  - `config/workspaces/ui.code-workspace`
  - `config/workspaces/rust-core.code-workspace`
  - `config/workspaces/cross-context-minimal.code-workspace`
- Preserved policy: 1Password/OIDC/Passbolt stay manual/[FA]/[SA] gated only.

### Verify
- File existence and structure created successfully.
- Typecheck/lint re-run recorded for this slice.

### Retro
- **What changed:** Dedicated workspace launch targets are now encoded in-repo.
- **What failed:** none specific to workspace files.
- **Next slice:** run trust gate trio via `scripts/long-horizon-slice.sh` once backend spawn reliability is stable.

### Blocked on human (single)
- Do you want these workspace files opened automatically via a helper script (e.g. `scripts/open-sovereign-workspace.sh <ui|rust|cross>`) in the next slice, or keep launch manual to avoid tool lock-in?

---

## 2026-05-08 Slice: Tiny Sovereign Workspace Launcher (append-only)

### Plan
- **Hypothesis:** a tiny launcher reduces friction and enforces sovereign workspace isolation in daily use.
- **Success criteria:** one script supports `ui`, `rust`, `cross` aliases and opens the corresponding `.code-workspace` file.
- **Stop rules:** max 2 files touched, max 0 commits, no secrets/prod changes.

### Execute
- Added `scripts/open-sovereign-workspace.sh`.
- Resolution order for editor CLIs: `cursor` -> `windsurf` -> `code`.

### Verify
- Script exists, executable, and validates target workspace path before opening.

### Retro
- **What changed:** launch ergonomics improved without changing policy boundaries.
- **What failed:** none specific to launcher.
- **Next slice:** run trust trio via `scripts/long-horizon-slice.sh` when backend spawn is stable.

### Blocked on human (single)
- Keep launcher aliases as `ui|rust|cross`, or rename to `frontend|core|minimal` for your preferred vocabulary?

---

## 2026-05-08 Slice: WSJF Wave4 Workflow Upgrade (append-only)

### Plan
- **Hypothesis:** A small WSJF executor with evidence output prevents ad-hoc prioritization drift and keeps `next bead` selection auditable.
- **Success criteria:**
  - Versioned backlog file exists in repo.
  - WSJF runner emits ranked output and evidence artifact with run_id.
  - No secret/prod mutation pathways introduced.
- **Stop rules:** max 3 files touched, max 0 commits, if execution fails twice with same substrate symptom, stop and write RCA.

### Execute
- Added `config/wsjf/wave4_backlog.json` (seed backlog with now/next/later buckets).
- Added `scripts/wsjf/upgrade_wave4_workflow.py` (computes WSJF+leverage and writes JSON evidence artifact).

### Verify
- Script static review complete.
- Runtime execution hit repeated substrate issue (`Execution backend unavailable` / hanging shell tasks with no body output) and was stopped per rule after repeated attempts.

### Retro
- **What changed:** WSJF workflow is now codified and ready to run once execution substrate stabilizes.
- **What failed:** runtime verification of artifact emission blocked by command backend instability.
- **Smallest next fix:** re-run `python3 scripts/wsjf/upgrade_wave4_workflow.py --backlog config/wsjf/wave4_backlog.json --evidence-dir .goalie/evidence/wsjf` in a stable terminal and capture produced artifact path.

### Blocked on human (single)
- Should we keep this WSJF runner as Python-only (portable, no Node deps), or add a tiny shell wrapper (`scripts/wsjf/upgrade_wave4_workflow.sh`) for operator ergonomics in next slice?

---

## 2026-05-08 Slice: SummerJobSwap WSJF Backlog Codified (append-only)

### Plan
- **Hypothesis:** Encoding SummerJobSwap priorities as a scored WSJF backlog creates deterministic, auditable next-bead selection and prevents narrative drift.
- **Success criteria:**
  - Backlog file created with now/next/later buckets and WSJF factors.
  - Selector command attempted against this backlog.
  - No secret/prod mutation scope touched.
- **Stop rules:** max 2 files touched, max 0 commits, if selector runtime fails twice with substrate symptoms, stop and record RCA.

### Execute
- Added `config/wsjf/summerjobswap_backlog.json` with nine prioritized streams:
  1. trust baseline
  2. core funnel determinism
  3. auth/secrets hygiene
  4. two-sided onboarding
  5. matching quality v1
  6. messaging/notifications
  7. community integrations (flagged)
  8. CRM/forum adapters
  9. ecosystem integrations post-retention
- Ran selector:
  `python3 scripts/wsjf/upgrade_wave4_workflow.py --backlog config/wsjf/summerjobswap_backlog.json --evidence-dir .goalie/evidence/wsjf`

### Verify
- Selector process invocation completed without emitted stdout in this substrate.
- No new artifact file observed via directory check in this run.

### Retro
- **What changed:** SummerJobSwap priorities are now executable backlog data, not prose-only.
- **What failed:** selector evidence emission remains non-deterministic in current execution substrate.
- **Next smallest fix:** run selector from an external stable terminal and capture emitted artifact path into inbox record.

### Blocked on human (single)
- Do you want me to add a tiny shell wrapper that force-writes fallback evidence (`summary_<run_id>.json`) when selector emits no artifact, or keep strict fail-closed behavior?

---

## 2026-05-25 Slice: Canonical Long-Horizon Board (Anti-CVT + Public Edge)

### Minimum DoD that breaks the cycle (rigid, anti-theater)

| Check | Command / artifact | Hard fail? |
|-------|-------------------|------------|
| Unit baseline | `python3 -m pytest tests/ --rootdir=tests -q --tb=line` | yes |
| E2E discoverability | `npx playwright test --list \| rg "Total:"` | yes |
| Staged evidence | `git diff --cached --stat \| rg "."` | yes (pre-commit) |
| Coherence | `python3 scripts/validators/project/validate_coherence.py --output reports/coherence.md` | yes (post-task) |
| Trust substrate | `.goalie/evidence/last_gate_one_pass.json` from `scripts/one.sh` | yes (release) |
| Public edge | `scripts/public_synthetic_check.sh <fqdn>` exit 0 + artifact | yes (edge claim) |
| Billing slice | `python3 -m pytest tests/billing/ -q` | yes (billing touch) |
| Capability indexed | `git ls-files tooling/scripts/<capability>` or canonical home | yes (new primitive) |

**Invert rule:** termination is observable index change (`git add && git commit`), not local shell success.

### Gate install map (canonical homes)

| Concern | Canonical home | Shim only |
|---------|----------------|-----------|
| Gates | `scripts/one.sh` | `scripts/gate-one-pass.sh`, `scripts/validate-foundation.sh` |
| Evidence | `.goalie/evidence/` | `scripts/collect-evidence.sh` |
| WSJF | `scripts/wsjf/upgrade_wave4_workflow.py` | `scripts/wsjf/wsjf_calculator.py` |
| Deploy | `scripts/deploy.sh` (domain-specific) | per-domain wrappers |
| Contracts | `docs/api/billing.proto` + schema tests | scattered validators |
| Domain probes | `scripts/verify-domain-probes.sh` | n/a |
| Agent session DoR | `scripts/agent_session_dor.sh` | n/a |
| Public synthetic | `scripts/public_synthetic_check.sh` | n/a |
| Pre-commit anti-CVT | `.git/hooks/pre-commit` | install: `chmod +x .git/hooks/pre-commit` |

If a path is not in canonical home: **move** into home, or mark **deprecated shim** for one release cycle.

### Maturity × WSJF (long-horizon swarm vector)

| Rank | Stream | Maturity | CoD | WSJF posture |
|------|--------|----------|-----|--------------|
| L0 | Ecosystem integrations (Whop/Matrix/Circle) | lowest | high coupling risk | later + flags |
| L1 | Community layer integrations | low | retention unproven | flagged |
| L2 | CRM/forum adapters (Oro/Flarum/WP) | low | architecture in prose | next after trust |
| L3 | Matching quality v1 | low | no ranking contract | next |
| L4 | Messaging/notifications | medium-low | no delivery guarantees | next |
| L5 | Multi-sided onboarding | medium-low | role flows incomplete | next |
| L6 | Auth/secrets hygiene | medium | policy exists, execution gated | now |
| L7 | Core funnel determinism | medium | critical, unproven E2E | now |
| L8 | Platform trust baseline | medium-high | substrate gate blocks | **NOW** |
| L9 | ArtChat deploy + checkout contract | highest near-term | revenue path structured | **NOW** |
| L10 | Billing public FQDN + invoice proof | strategic | blocked DNS historically | **NEXT** after index gate |

### NOW / NEXT / LATER (billing + agentics foundation)

**NOW (highest CoD, shortest duration)**
1. Trust substrate hard gate (`dedupe → trust-path → verify-contract` + artifact)
2. Anti-CVT commit gate (`.git/hooks/pre-commit` + `scripts/agent_session_dor.sh` pre-task)
3. Capability index gate (no new primitive without test/contract home)
4. Surgical untracked triage in `src/` — index → shim → archive (retain via config upgrade, not delete)

**NEXT**
5. Public FQDN edge deploy proof (`scripts/public_synthetic_check.sh` + HostBill/Stripe test-mode webhook artifact)
6. Domain probe external verification (`scripts/verify-domain-probes.sh`)
7. MPP consolidation pass (one home per concern; thin shims only)
8. Schema regression CI gate

**LATER**
9. Immutable Event Store PostgreSQL (append-only)
10. Performance benchmarks (k6 150% scale, p99 targets)
11. Chunked multi-domain delivery (`# domains max per prompt`)

### RCA: why untracked capability archives exist (invert thinking)

| Why | Counter-measure |
|-----|-----------------|
| Wave N executes locally, never commits | pre-commit staged-file gate |
| Wave N+1 cannot perceive prior work | pre-task `agent_session_dor.sh` + `git ls-files` |
| Multiple "unified" paths per IDE session | canonical home table + ADR pointer in AGENTS.md |
| Large prompt payloads without chunking | domain batch sizing in config |
| DoD checks "file exists" not "artifact hash" | `.goalie/evidence/*` contract |
| Dirty substrate → repeated trust-path theater | fix substrate once, then gate |

### Billing pipeline primitive stack (field technician MPP)

```
[ Entity Identity ] → [ EventOps ] → [ Calculation Engine ] → [ Invoice Engine ]
        ↓                    ↓                  ↓                      ↓
 [ Rate Engine ]    [ Ceremony Logger ]  [ Cost Ledger ]      [ Tax & Currency ]
        ↓                    ↓                  ↓
 [ Job Manifest ]   [ Project Context ]  [ Schema Validation ]
```

**DoR (pull into sprint):** schema locked (`docs/api/billing.proto`), scale quantified, threat model signed, WSJF approved.

**DoD (production):** pytest + Playwright coverage targets, load at 150%, docs published, backward-compatible schema regression pass.

### Agent contract bundle (integration hardening wave)

- Rust bridge + PyO3 (`src/rust/`, `maturin develop`)
- Schema validation layer (contract tests)
- Public edge deployment (Caddy `src/proxies/edge_gateway.cfg`)
- E2E verify phase (`*-verify.e2e.spec.ts` per domain)
- PostgreSQL append-only event store (design → implement)

### Reasonable observations (minimal zero simplification)

- Do not delete untracked capabilities blindly; triage: **index → shim → archive**.
- Do not claim done without artifact (exit code + path + hash).
- Do not rerun full trust-path on dirty substrate; fix substrate once.
- Vectors explain drift; hashes/schemas/tests authorize change.
- One integration proof per stream (Playwright **or** probe **or** adapter).

### Blocked on human (single)

- Confirm public FQDN target for invoice E2E proof (`billing.bhopti.com` vs `mesh.tag.ooo`) before wiring HostBill/Stripe validators into `public_synthetic_check.sh`.


---

## 2026-05-25 Slice B: Perceive Without Shell Magic

### Question
Can agent/circle role perceive + verify without re-running trust-path?

### Answer (yes — read-only perception chain)
| Layer | Mechanism | Re-runs trust-path? |
|-------|-----------|---------------------|
| Perception | `scripts/perceive-trust-artifact.sh --check` | **No** |
| Agent snapshot | `.goalie/evidence/perception_snapshot.json` | **No** |
| Contract verify | `bash scripts/one.sh verify-contract .goalie/evidence/last_gate_one_pass.json` | **No** |
| Cache (substrate) | `.goalie/trust_cache.json` + `validate-foundation.sh` checkpoint | **No** (unless `TRUST_FORCE_RERUN=1`) |
| Execution | `TRUST_FORCE_RERUN=1 bash scripts/one.sh trust-path` | **Yes** (only when HEAD changed or artifact stale) |

**Invert rule:** Agents read artifacts first; shell magic is for *refresh*, not *perception*.

### Minimum DoD (3 layers — breaks CVT cycle)
1. **Perception (pre-task):** `./scripts/dod-gate.sh --pre-task` + `perception_snapshot.json`
2. **Termination (pre-commit):** staged files + core pytest + `capability-index-gate.sh`
3. **Release (post-merge):** `trust-path` artifact where `hash == HEAD` + `public_synthetic_check.sh`

### AGENT_SLICE=publication shims
- `code/tooling/scripts/agent_session_dor.sh` → `scripts/agent_session_dor.sh`
- `code/tooling/scripts/public_synthetic_check.sh` → `scripts/public_synthetic_check.sh`
- `code/tooling/scripts/perceive-trust-artifact.sh` → `scripts/perceive-trust-artifact.sh`


---

## 2026-05-25 Slice C: Term Retro — Anti-CVT Wave + Gate Evidence (append-only)

**Evidence run:** `dod-gate.sh --perceive` (FAIL), `verify-contract` (FAIL stale hash), `agent_session_dor.sh` (FAIL untracked), `pytest tests/billing|coherence|beads` (**112 passed**). Untracked count from perceive gate: **313** (down from ~1088 wave baseline).

### OODA

| Phase | Bullets |
|-------|---------|
| **Observe** | Substrate: HEAD `33e59baa`, trust artifact `b20ae9aa` (stale). Perceive reports `trust_artifact_ok=false`, `untracked=313`, `tracked=2945`. Core billing/coherence/beads pytest green. |
| **Orient** | Anti-CVT wave reduced untracked surface (~1088→313) via indexing/shims, not hero merge. Termination still blocked: no staged index delta + stale `.goalie/evidence/last_gate_one_pass.json`. FQDN split unresolved (`billing.bhopti.com` vs `api.billing.o-gov.com`). |
| **Decide** | **NOW:** refresh trust artifact OR fail-closed perceive; surgical untracked triage in canonical homes. **NEXT:** FQDN pick + `public_synthetic_check.sh` + invoice-engine-verify in inventory. **LATER:** immutable event store, k6 scale. |
| **Act** | Index increments only (scripts/gates/evidence paths); forbid delete-untracked. Re-run checklist only from `~/Documents/code` with `ensure_monorepo_repo_root` guard. |

### Terminal RCA

| Failure mode | Root cause | Fix |
|--------------|------------|-----|
| Wrong repo / empty gates | User ran checklist from `~` not monorepo | `cd ~/Documents/code` + `ensure_monorepo_repo_root` before any gate |
| Steps “fail” in correct cwd | Stale trust artifact (`b20ae9aa` ≠ HEAD `33e59baa`) | `TRUST_FORCE_RERUN=1 bash scripts/one.sh trust-path` then `verify-contract` |
| DoR red with green pytest | **313 untracked** on canonical paths (`scripts/`, `code/tooling/`) | Surgical **index → shim → archive** (never blind delete) |
| “Nothing staged” | Wave N executed locally; termination = index change, not shell exit 0 | `git add` canonical homes + commit slice |

### Anti-CVT stack maturity

| Layer | Enforced (hard fail) | Theater (exists, not blocking) |
|-------|----------------------|--------------------------------|
| Perceive | `dod-gate.sh --perceive`, `perceive-trust-artifact.sh --check` | Passing perceive while artifact stale (by design: fail-closed) |
| DoR | `agent_session_dor.sh` (untracked canonical paths) | AGENTS.md prose without hook read |
| Contract | `verify-contract` on `.goalie/evidence/last_gate_one_pass.json` | Claiming “trust green” without hash match |
| Evidence JSON | `evidence_json.sh` shape | Evidence file present but old HEAD |
| Pre-commit | `.git/hooks/pre-commit` (if installed) | Hook not installed → local success, CI drift |
| Tests | `pytest` billing/coherence/beads (**112 pass**) | Full-tree pytest / Playwright not in minimum DoD |
| Capability index | `capability-index-gate.sh` | 313 files still off-index |

**Verdict:** Anti-fragile **read** path is mature; **write/terminate** path still theater until artifact refresh + untracked index commits land.

### Anti-fragility (perceive without shell magic)

| Question | Answer |
|----------|--------|
| Can agent circle **perceive + verify** without re-running `trust-path`? | **Yes** for read-only: `dod-gate.sh --perceive`, `perceive-trust-artifact.sh --check`, `verify-contract`, `.goalie/evidence/perception_snapshot.json`. |
| When must shell magic rerun? | When `verify-contract` fails (stale hash), `TRUST_FORCE_RERUN=1`, or substrate dirty after HEAD move. |
| Invert rule | Perception = artifacts first; execution = refresh, not default loop. |

### Minimum DoD (5-step copy-paste)

```bash
cd ~/Documents/code
# 0) Repo guard (if wired in session bootstrap)
# source scripts/lib/ensure_monorepo_repo_root.sh 2>/dev/null || true

# 1) Perceive (read-only)
bash code/tooling/scripts/dod-gate.sh --perceive

# 2) Agent DoR
bash scripts/agent_session_dor.sh

# 3) Contract (no trust-path rerun)
bash scripts/one.sh verify-contract .goalie/evidence/last_gate_one_pass.json

# 4) Unit slice
python3 -m pytest tests/billing/ tests/coherence/ tests/beads/ -q --tb=line

# 5) Termination probe (invert: must show staged/index delta before commit)
git diff --cached --stat | head -20
git status --porcelain | grep '^??' | wc -l
```

**Hard pass:** steps 1–4 green **and** untracked trending down with staged canonical paths; **release pass:** step 3 hash == `git rev-parse HEAD`.

### Counter-hegemonic rules (6)

1. **Termination = observable index change**, not local shell success or model narrative.
2. **Read artifacts before rerun** — stale hash is signal, not noise to override.
3. **One canonical home per concern** — shims expire in one release cycle.
4. **No hero merge** — wave delivers script/gate increments, not 300-file commit.
5. **Fail-closed on trust** — never claim public edge / invoice proof without FQDN + artifact.
6. **Do not delete untracked capabilities** — triage index → shim → archive only.

### WSJF NOW / NEXT / LATER

| Bucket | Item | CoD driver |
|--------|------|------------|
| **NOW** | Refresh `last_gate_one_pass.json` (`trust-path` + verify-contract == HEAD) | Blocks all release claims |
| **NOW** | Untracked surgical index (313 → tracked shims) | DoR + pre-commit anti-CVT |
| **NOW** | `agent_session_dor.sh` + `dod-gate.sh --pre-task` in agent bootstrap | Stops wrong-cwd repeat |
| **NEXT** | Human FQDN pick + DNS + `public_synthetic_check.sh` | Invoice E2E proof |
| **NEXT** | Close `invoice-engine-verify` gap in CONSOLIDATION_INVENTORY | Billing pipeline DoD |
| **NEXT** | `verify-domain-probes.sh` external | Multi-domain claims |
| **LATER** | Immutable PostgreSQL event store | Platform hardening |
| **LATER** | k6 150% / p99 benchmarks | Performance contract |

### Indexable increments this wave (scripts added — not hero merge)

| Increment | Role |
|-----------|------|
| `code/tooling/scripts/dod-gate.sh --perceive` | JSON perceive without full trust-path |
| `scripts/perceive-trust-artifact.sh` | Artifact read/check shim |
| `scripts/agent_session_dor.sh` | Pre-task DoR (untracked policy) |
| `scripts/public_synthetic_check.sh` | Public edge synthetic (FQDN-blocked) |
| `scripts/wsjf/upgrade_wave4_workflow.py` | WSJF evidence emission |
| `config/wsjf/wave4_backlog.json` | Codified now/next/later backlog |
| `.goalie/evidence/perception_snapshot.json` | Agent-readable perceive cache |
| Pre-commit / `capability-index-gate.sh` | Termination layer (install-dependent) |

### Blockers for FQDN invoice proof

1. **DNS / edge:** split targets `billing.bhopti.com` vs `api.billing.o-gov.com` — human must pick one public FQDN.
2. **Inventory gap:** `invoice-engine-verify` not fully wired in CONSOLIDATION_INVENTORY — probe path unclear.
3. **Trust artifact stale** — `public_synthetic_check.sh` claims blocked until hash == HEAD.
4. **313 untracked** — validators/scripts off-index break DoR before E2E wiring.

### LNNNL (one line each)

| Horizon | Line |
|---------|------|
| **Now** | Refresh trust artifact + index highest-CoD untracked scripts under canonical homes. |
| **Near** | Run WSJF selector with stable substrate; attach evidence JSON to inbox. |
| **Next** | FQDN decision → HostBill/Stripe test-mode webhook + `public_synthetic_check.sh` artifact. |
| **Later** | Immutable event store + chunked multi-domain delivery. |
| **Likely** | Without termination discipline, Wave N+1 re-discovers same 313 files and stale `b20ae9aa` artifact. |

### Inline answers (term review)

| Question | Answer |
|----------|--------|
| Can agent circle perceive+verify without shell magic? | **Yes** for perceive + `verify-contract` **read**; **no** for claiming release-ready trust while hash ≠ HEAD — must rerun `trust-path` once. |
| Is AGENTS.md enforced or aspirational? | **Mostly aspirational today** — gates enforce repo root, untracked policy, artifacts, pytest; AGENTS.md is not parsed by `agent_session_dor.sh` / pre-commit unless explicitly wired. |
| What breaks Wave N→N+1? (**Invert: commit is NOT enough**) | Local execution without **indexed termination** (staged canonical paths + commit + fresh evidence hash). Next wave cannot perceive prior work; untracked set becomes the “source of truth,” and trust theater repeats. |


---

## 2026-05-26 — DNS RCA: All bhopti.com domains dead + Phase 3 DoR/DoD gate rollout

### OODA slice

**Observe**
- All bhopti.com subdomains (`billing.bhopti.com`, `crm.bhopti.com`, `bhopti.com`) returning `SERVFAIL` since previous session.
- `8.8.8.8` extended DNS error: `"At delegation bhopti.com for bhopti.com/ns"`.
- WHOIS (Verisign → `whois-service.virtualcloud.co`) confirmed NS records: `NS1–NS4.TAG.OOO`.
- Google DNS `/resolve` on `ns1.tag.ooo`: Status 2 (`SERVFAIL`), Comment: `"Name servers did not respond [23.92.79.2]"`.
- `.OOO` gTLD delegation server `23.92.79.2` is NOT responding at the `tag.ooo` level.

**Orient**
Root cause chain:
```
bhopti.com NS → ns1/2/3/4.TAG.OOO
                     ↓
           TAG.OOO's auth server (23.92.79.2) NOT RESPONDING
                     ↓
           .OOO gTLD delegation broken at glue record level
                     ↓
           ALL bhopti.com resolution → SERVFAIL (Google, Cloudflare, ISP resolvers)
```

This is **not** a Cloudflare issue. The registrar is `sav.com` (IANA ID 609) and the NS records point to `tag.ooo` infrastructure which has gone dark. Domain is registered through 2027-04-16.

**Decide**
- Immediate action (human required): Log in to `sav.com` registrar, change NS records from `tag.ooo` to a working provider (Cloudflare: `ns1.cloudflare.com` / `ns2.cloudflare.com`).
- Blocker classification: `EXTERNAL_INFRA_OUTAGE` — no code fix possible. K8s ingress / cert-manager / TLS for `billing.bhopti.com` remain blocked until NS delegation is restored.
- `public_synthetic_check.sh` will exit 2 until DNS is restored — this is correct behavior, not a bug.

**Act**
- Phase 3 DoR/DoD gate artifact system implemented (this session):
  - `tooling/scripts/lib/evidence_json.sh` — `write_evidence_artifact` + `perceive_evidence` primitives
  - `tooling/scripts/agent_session_dor.sh` — canonical pre-task index gate (replaces broken shim)
  - `tooling/scripts/dod-gate.sh` — canonical `--pre-task` / `--post-task` / `--perceive` modes
  - `tooling/scripts/public_synthetic_check.sh` — FQDN + billing pipeline synthetic check
  - `tooling/scripts/hooks/pre-commit` — pre-commit hook template (CVT termination)

### Test baseline at slice end

| Metric | Value |
|--------|-------|
| pytest passing | 136 pass, 8 skip, 0 fail |
| Playwright discoverable | 5,056 tests / 110 files |
| Pre-commit CVT gate | installed + active |
| DNS status `bhopti.com` | **SERVFAIL** (tag.ooo NS outage, external) |
| Submodule pack corruption | present (lionagi-qe-fleet, turbo-flow, aisp-open-core) |

### Blockers for FQDN invoice proof (updated)

1. **DNS (ROOT CAUSE IDENTIFIED):** `sav.com` registrar NS delegation → `tag.ooo` nameservers are dead. Human must log into `sav.com` and change NS to working provider (Cloudflare recommended).
2. **Submodule pack corruption** — 3 submodule object packs corrupt; `git submodule deinit --force` needed for lionagi-qe-fleet, turbo-flow, aisp-open-core.
3. **HostBill live HTTP** — blocked on `HOSTBILL_API_KEY` / `HOSTBILL_API_URL` secrets (8 tests correctly skipped).

### LNNNL

| Horizon | Line |
|---------|------|
| **Now** | Log into sav.com, change NS from tag.ooo → Cloudflare (ns1/ns2.cloudflare.com). |
| **Near** | Once DNS propagates: run `public_synthetic_check.sh` to generate first clean evidence artifact. |
| **Next** | Deinit 3 corrupt submodules; fix git LFS post-commit hook traversal. |
| **Later** | HostBill staging creds → live HTTP integration tests passing (currently 8 skipped). |
| **Likely** | Without NS fix, all K8s ingress / cert-manager / TLS automation remains deadlocked. |
