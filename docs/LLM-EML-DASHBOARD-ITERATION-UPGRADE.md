# LLM API + EML Dashboard Upgrade: Iteration Toward Good-Enough-to-Send

**Purpose:** How an LLM API upgrade for the EML dashboard (in.html, PHP/Symfony/Oro/HostBill, etc.) can improve iteration/increment toward **good-enough-to-send** milestones and **cyclic upgrade** (validate → fix → re-validate).  
**Governance:** Run `ay.sh` after small fixes; watch `%/#` and `exit_code` in `aisp-status.json` trend toward 0 and more green actions.  
**Routing:** When governance and email validation are stable, wire one flow: **new .eml → WSJF/ROAM item**, consuming existing exit codes, still Semi-Auto.  
**Bottom line:** Config as first-class contract; deploy switch = shell validation pipeline (exit_code / RUNNER_EXIT); **%/#** = state (checks passed/total), **%.#** = velocity (rate of improvement); ROAM risks tracked and auto-raised when validation fails (160 / 100).

---

## 0. (§0) Config Contract & Edge Cases (Guard Before Any Work)

One env block (AISP_* + LEGAL_*) = “where am I and what lane am I in?” Orchestrators (ay.sh, advocate, cascade-tunnel.sh) **refuse to work** if the contract is not met.

| Condition | Exit | Behavior |
|------------|------|----------|
| AISP_WORKSPACE_ROOT or LEGAL_ROOT missing | **78** (EX_CONFIG) | Immediate exit, no “best guess.” |
| PWD outside both roots | **Loud message + auto-cd once** to AISP_WORKSPACE_ROOT | Never silent run from wrong directory. |
| LEGAL_CASE_IDS empty | **78** (EX_CONFIG) | Immediate exit. |
| AISP_ENV=prod and HEAD ≠ DEFAULT_BRANCH | **78** (EX_CONFIG) | “WSJF-LOW” style — do nothing. |
| AISP_MODE_DEFAULT=FA and AISP_T_STAGE=T0 | **Auto-downgrade to SA** | Warn; no silent Full-Auto. |

**Trace:** %/# = env_config_checks_passed / total (e.g. 4/4 or 5/5). %.# = rate of config-failure exits (10/12/21/78/160) over time → config readiness before trusting BML.

---

## 0b. (§0b) Operational Health & Routing Maturity (Deploy Switch)

- **Deploy switch:** Exit code + shell validation pipeline (validation-runner.sh, pre-send-email-gate.sh) is the gate. **Do not send** until RUNNER_EXIT ∈ {0,1} and no 100+ failures.
- **exit_code=160** (business-logic / temporal wholeness) and **RUNNER_EXIT=100** (overall validation fail): treat as “fix before action.” Optionally **auto-raise WSJF/ROAM risks** (e.g. create or update a ROAM item or WSJF task “Email draft needs review — exit 160”) so governance and legal lanes stay visible.
- **Hierarchical depth:** Dashboard and APIs can expose **%/#** (e.g. checks_passed/checks_total per validator, per lane) and **%.#** (e.g. fix rate per day) for mesh/interactivity depth and drillable scope.

---

## 1. LLM API Upgrade for EML Dashboard (in.html / PHP / Symfony / Oro / HostBill)

### Goal
- **Good-enough-to-send milestones:** Dashboard shows per-draft state: e.g. RUNNER_EXIT 0–1, %/# checks passed, and a single “safe to send” signal.
- **Cyclic upgrade:** Each edit → re-validate → show updated status so the user iterates until “good enough,” then sends manually (Semi-Auto).

### How an LLM API Helps

| Capability | Role in iteration / cyclic upgrade |
|------------|-----------------------------------|
| **Validate on demand** | Dashboard (in.html or backend) calls validation-runner (or pre-send gate) via CLI/API; LLM or script returns RUNNER_EXIT, pass/fail counts, and fix hints. |
| **Structured feedback** | API returns AISP-style or JSON with `exit_code`, `%/#` (e.g. checks_passed/checks_total), and a short “learn” message (e.g. “Fix: Add year to Feb 27–28 references”). |
| **Good-enough gate** | UI shows “Good to send” only when RUNNER_EXIT ∈ {0,1} and no 100+ failures; otherwise “Fix N issue(s) and re-validate.” |
| **Cyclic loop** | User edits EML in dashboard (or external editor) → clicks “Re-validate” → same API runs validation-runner → UI updates; repeat until gate passes. |

### Backend Options (discover/consolidate then extend)

- **in.html (static/front-end):** No backend yet. Add a small **proxy** that:
  - Accepts POST with `eml_path` or file upload.
  - Shells out to `validation-runner.sh` (or `pre-send-email-gate.sh`) with correct roots (AISP_WORKSPACE_ROOT, LEGAL_ROOT).
  - Returns JSON: `{ "exit_code", "%/#", "verdict", "fix_hints" }` for the dashboard to render.
- **PHP / Symfony / Oro / HostBill:** Same contract: an endpoint that runs the existing validation pipeline and returns exit_code + %/# + fix hints. Prefer reusing `validation-runner.sh` and robust exit codes rather than reimplementing checks.

### Single contract (recommended)

```json
{
  "exit_code": 0,
  "verdict": "PASS",
  "%/#": { "checks_passed": 14, "checks_total": 14 },
  "fix_hints": [],
  "good_enough_to_send": true
}
```

- `good_enough_to_send`: true when `exit_code` ∈ {0,1} and no 100+ validation failures.
- Dashboard shows “Good to send” / “Fix and re-validate” based on this; LLM or future automation can use the same JSON.

### Cyclic upgrade in practice

1. User opens draft in dashboard (or links to .eml path).
2. Dashboard calls “Validate” API → gets exit_code, %/#, fix_hints.
3. If not good-enough: user edits (or LLM suggests edits), then “Re-validate” until RUNNER_EXIT 0–1.
4. When good_enough_to_send: user sends manually (Semi-Auto); no auto-send until FA is explicitly enabled.

---

## 2. Governance: Run ay.sh After Small Fixes

- After any small fix (config, script, or validator), run:
  ```bash
  export AISP_ENV=dev AISP_T_STAGE=T0 AISP_WORKSPACE_ROOT="/path/to/agentic-flow" \
    LEGAL_ROOT="/path/to/BHOPTI-LEGAL" LEGAL_CASE_IDS="26CV005596-590,26CV007491-590" \
    AISP_MODE_DEFAULT=SA EXIT_CODES_REGISTRY="_SYSTEM/_AUTOMATION/exit-codes-robust.sh" \
    CPANEL_NONINTERACTIVE=1
  cd "$AISP_WORKSPACE_ROOT" && ./scripts/ay.sh
  ```
- **Watch:** `reports/aisp-status.json`:
  - `aisp_header.exit_code` → trend toward **0** (GO).
  - `aisp_header["%/#"].checks_passed` / `checks_total` → trend toward more green (e.g. 6/6).
  - `intro.learn` → use for next fix (e.g. “fix failures before heavy BML runs”).
- **Interpretation:** exit_code 0 = safe for heavier Build–Measure–Learn; 1 = Semi-Auto only; 2 = fix ay’s failing actions before big changes.

---

## 3. Grimes Email: Fix Feb 27–28 Phrasing, Re-run Until RUNNER_EXIT 0–1

- **Rule:** Every mention of “Feb 27” or “Feb 28” (or “February 27/28”) must be **temporally anchored**: include year (e.g. 2026) or past-tense verb (signed, filed, occurred, was, had, did). See `scripts/validators/file/semantic-validation-gate.sh` (Content Freshness check).
- **Fix:** In `EMAIL-TO-DOUG-GRIMES-POST-ARBITRATION-ORDER.eml`, ensure the only such reference is explicit, e.g. “signed on February 27, 2026” (already past-tense + year).
- **Loop:** Re-run until RUNNER_EXIT is 0 or 1 with no remaining 100+ failures:
  ```bash
  ./scripts/validators/file/validation-runner.sh "$LEGAL_ROOT/01-ACTIVE-CRITICAL/MAA-26CV005596-590/EMAIL-TO-DOUG-GRIMES-POST-ARBITRATION-ORDER.eml"
  echo "RUNNER_EXIT=$?"
  ```
- **Then:** Send manually in Mail.app (Semi-Auto); do not auto-send.

---

## 4. Routing: New .eml → WSJF/ROAM Item (Semi-Auto)

When governance (ay exit_code trending to 0) and Grimes email (RUNNER_EXIT 0–1) are stable:

- **Pick one flow:** e.g. “new .eml in folder X → create WSJF/ROAM item.”
- **Consume existing exit codes:**
  - Run validation-runner (or pre-send gate) on the new .eml; if exit_code ∉ {0,1} or 100+ failures, do **not** create a ROAM/WSJF item (or create as “needs_review”).
  - If exit_code ∈ {0,1}, allow creating a WSJF task and/or ROAM risk entry from the .eml metadata (case, subject, path).
- **Implementation options (discover then extend):**
  - Extend `validator-12-wsjf-roam-escalator.sh` (or equivalent) to watch a designated .eml folder; on new file, run validation-runner, then if exit 0/1 call existing WSJF/ROAM update logic.
  - Or a small cron/LaunchAgent that: (1) finds new .eml in a given directory, (2) runs validation-runner, (3) if RUNNER_EXIT 0–1, invokes file-to-wsjf-router (or ROAM append) with the file path and optional WSJF score.
- **Stay Semi-Auto:** No auto-send; no auto-escalation to “done” without human confirmation. Routing only creates/updates the WSJF/ROAM item; human still approves send and closure.

### Implementation sketch (one flow)

1. **Trigger:** New or updated `.eml` in a watched folder (e.g. `LEGAL_ROOT/01-ACTIVE-CRITICAL/**/*.eml` or a dedicated `drafts/`).
2. **Validate:** Run `scripts/validators/file/validation-runner.sh "$eml_path"`; capture exit code (RUNNER_EXIT).
3. **Gate:** If RUNNER_EXIT ∉ {0,1} or output contains “FAIL” with exit ≥ 100, log “needs_review” and do not create WSJF/ROAM item (or create with status `needs_review`).
4. **Route:** If RUNNER_EXIT ∈ {0,1}, call existing logic:
   - Option A: Extend `_SYSTEM/_AUTOMATION/validator-12-wsjf-roam-escalator.sh` to accept `--eml <path>`, run validation-runner, then if 0/1 call `assign_wsjf_score` + `route_to_swarm` for that path.
   - Option B: Small wrapper script that: (1) runs validation-runner on the .eml, (2) if exit 0/1, invokes validator-12 with `--route-file "$eml_path"` (validator-12 already routes by filename; ensure .eml gets a WSJF score and swarm).
5. **ROAM:** If your ROAM update is separate (e.g. append risk or task to ROAM_TRACKER.yaml), run it only when RUNNER_EXIT ∈ {0,1} so that only “good enough” drafts create tracked items.

---

## 5. Summary

| Area | Action |
|------|--------|
| **LLM/EML dashboard** | Add API that runs validation-runner (or gate), returns exit_code + %/# + fix_hints; dashboard shows “good enough to send” and supports validate → fix → re-validate cycle. |
| **Governance** | Run ay.sh after small fixes; trend aisp-status.json exit_code → 0 and %/# → more green. |
| **Grimes email** | Anchor Feb 27–28 references (year or past-tense); re-run validation-runner until RUNNER_EXIT 0–1; then send manually. |
| **Routing** | When stable, wire one flow: new .eml → validation-runner → if exit 0/1, create WSJF/ROAM item; keep Semi-Auto (no auto-send). |

All of this reuses existing scripts and robust exit codes; no new validators, and no Full-Auto until lanes show exit_code 0 and high %/# in AISP.

---

## 5b. mover-tracking.html (Planned)

- **Status:** Planned, not yet implemented. Linked from in.html as "Move Command Center" (`mover-tracking.html`).
- **Location (when created):** BHOPTI-LEGAL `00-DASHBOARD/` or `.tmp/browser-check/` (dashboard copy).
- **Validation gate:** When created, **must** use the same `good_enough_to_send` contract as in.html: bind any Send/Route actions to `lastGate.good_enough_to_send`; disable when `RUNNER_EXIT ∉ {0,1}` or `fail100 > 0`.
- **Backup:** If mover-tracking.html exists in BHOPTI-LEGAL (outside workspace), ensure it is validation-gated before allowing edits that affect send flow. Sync with in.html's send-readiness-panel.js `updateSendReadinessGate` contract.

---

## 6. (§6) Bottom Line & ROAM

- **Growth rate:** Trend **%/#** (env + checks passed) and **exit_code** in aisp-status.json toward 0 and more green; **%.#** = velocity of fixes (e.g. validators fixed per day). Bottom line = config readiness first, then Grimes send, then one routing wire (new .eml → WSJF/ROAM).
- **ROAM risks:** When exit_code=160 or RUNNER_EXIT=100, optionally auto-raise a ROAM item (e.g. “Email draft — temporal wholeness / review required”) so risks stay visible without manual tracking.
- **Simplexity:** Simplest mental model = one env block + one guard block. Key assumptions (env, branch, roots, cases, lane, mode) are **explicit and checked**; no script runs “in the right world” by accident.
