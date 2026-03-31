# Production Maturity Phase Design: `af prod-cycle`

This document outlines the technical design for the "Production Maturity" phase of the Goalie ecosystem. The core objective is to transform the `af` CLI into a robust, risk-aware system driven by the new `af prod-cycle` command, integrating 8 key governance patterns and full JSON telemetry.

## 1. Architecture Overview

The architecture follows a **CLI-Wrapper + Middleware** pattern:
*   **CLI (`af`)**: The entry point (Bash script) handles argument parsing, environment setup, and high-level orchestration.
*   **Governance Middleware (Python)**: A new Python module (`investing/agentic-flow/scripts/policy/governance.py`) will encapsulate complex logic for the 8 patterns (risk assessment, depth calculation, dynamic budgeting).
*   **Policy Hooks (Bash/Python)**: Scripts like `dynamic_autocommit.sh` act as gates, enforcing policy decisions before critical actions (commit, deploy).
*   **Telemetry (JSONL)**: Centralized logging to `.goalie/*.jsonl` provides the data backbone for the "Observability First" pattern.

## 2. `af prod-cycle` Specification

### 2.1 CLI Arguments & Environment Variables

The `prod-cycle` command extends the `af` interface:

```bash
af prod-cycle [iterations] [flags]
```

**Arguments:**
*   `iterations`: (Optional, Integer) Number of BML cycles to run. Default: `12`.

**Flags:**
*   `--depth <n>`: Set base depth level (1-5). Default: `3`.
*   `--circle <name>`: Focus on a specific circle (disables rotation).
*   `--rotate-circles`: Enable circle rotation (default).
*   `--autocommit`: Enable autocommit (default).
*   `--no-autocommit`: Disable autocommit.
*   `--dry-run`: Run logic without applying changes (Shadow Mode).
*   `--shadow`: Alias for `--dry-run`.

**Environment Variables:**
*   `AF_PROD_ITERATIONS`: Override default iterations.
*   `AF_PROD_DEPTH`: Override default depth.
*   `AF_PROD_CIRCLE`: Override specific circle.
*   `AF_PROD_AUTOCOMMIT`: `1` or `0`.
*   `AF_PROD_SHADOW_MODE`: `1` or `0`.

### 2.2 Execution Flow

1.  **Initialization**:
    *   Parse arguments and environment variables.
    *   Initialize `AF_RUN_ID` (UUID) for traceability.
2.  **Governance Check (Pre-Flight)**:
    *   Call **Safe Degrade** middleware to check system load and risk score.
    *   Call **Iteration Budget** middleware to calculate dynamic budget.
3.  **Cycle Execution Loop**:
    *   **Circle Risk Focus**: Determine current circle (rotation or fixed).
    *   **Depth Ladder**: Calculate effective depth based on circle risk profile.
    *   **Execute `cmd_full_cycle`**:
        *   **Guardrail Lock**: Run pre-commit tests (`af test`, `af validate`).
        *   **Autocommit Shadow**: If `--shadow`, log actions but skip `git commit`.
        *   **Failure Strategy**: On failure, trigger rollback or alert logic.
    *   **Observability First**: Emit `pattern_metrics.jsonl` events at each step.
    *   **Dynamic Extension**: Check if budget extension is needed (via **Iteration Budget**).
4.  **Completion**:
    *   Summarize cycle results.
    *   Emit final completion telemetry.

## 3. Governance Middleware Specification (8 Patterns)

These patterns will be implemented primarily in `governance.py` and invoked by `af`.

### 3.1 Safe Degrade
*   **Logic**: Prevent automated actions when the system is stressed or risky.
*   **Inputs**: `logs/governor_incidents.jsonl` (CPU load), `.goalie/metrics_log.jsonl` (Risk Score).
*   **Implementation**:
    *   Check recent CPU overload incidents (> 5 in last 10m).
    *   Check average risk score (< 50).
    *   **Action**: If unsafe, set `AF_ALLOW_CODE_AUTOCOMMIT=0` and log warning.

### 3.2 Circle Risk Focus
*   **Logic**: Rotate focus across circles to ensure holistic maturity, but prioritize high-risk areas.
*   **Inputs**: Circle list (`analyst`, `assessor`, `innovator`, `intuitive`, `orchestrator`, `seeker`), optional user override.
*   **Implementation**:
    *   Standard: Round-robin rotation.
    *   Risk-Aware (Future): Query `retro_coach` for "needy" circles and prioritize them.

### 3.3 Autocommit Shadow
*   **Logic**: Allow safe testing of autocommit logic without side effects.
*   **Inputs**: `--shadow` or `--dry-run` flag.
*   **Implementation**:
    *   If enabled, `cmd_commit` prints "WOULD COMMIT" message and logs to telemetry, but does not run `git commit`.
    *   Useful for verifying guardrails in production.

### 3.4 Guardrail Lock
*   **Logic**: Hard gates that *must* pass before code is committed.
*   **Inputs**: `code_guardrails.py` output, Test results, Linter results.
*   **Implementation**:
    *   **Test Gate**: `af test` must return 0.
    *   **Validation Gate**: `af validate` must return 0.
    *   **Code Gate**: `code_guardrails.py` filter must return valid file list.
    *   **Action**: If any gate fails, skip commit and log `pattern="guardrail-lock" gate="<name>" result="blocked"`.

### 3.5 Failure Strategy
*   **Logic**: Automated response to cycle failures.
*   **Implementation**:
    *   **Retry**: If `af test` fails due to flaky infrastructure (e.g., timeout), retry once.
    *   **Abort**: If critical governance check fails, abort the *entire* prod-cycle.
    *   **Rollback**: If a deployment script fails (see below), trigger rollback.

### 3.6 Iteration Budget
*   **Logic**: Dynamically adjust the number of iterations to ensure work completes or stops early if inefficient.
*   **Inputs**: `iterations` arg, completion status.
*   **Implementation**:
    *   If cycle completes successfully but "unfinished business" remains (e.g., uncommitted changes due to load), extend budget by +1 (up to max +3).
    *   Log `pattern="iteration-budget" action="extend"`.

### 3.7 Observability First
*   **Logic**: Telemetry is not an afterthought; it is the driver.
*   **Implementation**:
    *   Every pattern decision (gate pass/fail, rotation choice, budget change) logs a structured event to `pattern_metrics.jsonl`.
    *   Schema defined in Section 4.

### 3.8 Depth Ladder
*   **Logic**: Adjust depth of analysis/execution based on risk/circle.
*   **Inputs**: Base `depth`, Circle type.
*   **Implementation**:
    *   **Orchestrator**: Base Depth + 1 (Needs broad view).
    *   **Innovator**: Base Depth (Needs freedom).
    *   **Assessor**: Base Depth + 2 (Needs deep rigor).
    *   **Action**: Export `AF_DEPTH_LEVEL` for downstream tools.

## 4. Telemetry Schema

### 4.1 `.goalie/metrics_log.jsonl`
Records quantitative metrics for risk and performance.
```json
{
  "timestamp": "ISO8601",
  "run_id": "UUID",
  "average_score": 85, // 0-100
  "system_load": 1.2,
  "active_blockers": 3,
  "cycle_count": 12
}
```

### 4.2 `.goalie/test_results.jsonl`
Records outcomes of automated tests.
```json
{
  "timestamp": "ISO8601",
  "run_id": "UUID",
  "suite": "unit|integration|governor",
  "status": "pass|fail",
  "duration_ms": 150,
  "error_code": null
}
```

### 4.3 `.goalie/pattern_metrics.jsonl`
Records governance pattern events.
```json
{
  "ts": "ISO8601",
  "run": "prod-cycle",
  "iteration": 1,
  "circle": "orchestrator",
  "depth": 4,
  "pattern": "safe-degrade|guardrail-lock|etc",
  "mode": "enforce|advisory",
  "mutation": true, // Did it change flow?
  "gate": "system-load",
  "reason": "load > 5",
  "action": "disable-autocommit"
}
```

## 5. Deployment & Rollback Strategy

### 5.1 `quick-publish.sh`
*   **Purpose**: Fast path for documentation or config updates.
*   **Logic**:
    *   Check `git status` for *only* safe files (`.md`, `.yaml`, `docs/`).
    *   If code files present -> Fail (Require full cycle).
    *   If safe -> `git commit -m "Quick publish..." && git push`.

### 5.2 `deploy_discord_bot.sh`
*   **Purpose**: Deploy the Discord bot to production.
*   **Logic**:
    *   **Pre-check**: Run `af test`.
    *   **Snapshot**: `af snapshot pre-deploy-$(date)`.
    *   **Deploy**: `docker-compose up -d --build discord-bot`.
    *   **Verify**: Check container health and logs.
    *   **Rollback**: On failure, `af restore pre-deploy-$(date)`.

## 7. Decision Transformer Readiness (Phase 1)

The production maturity system now treats Decision Transformer (DT) readiness as a first-class gate alongside tests, deployments, and governance patterns.

- **Goal:** Ensure we have sequence-ready trajectories before training or deploying a DT-based controller.
- **Inputs:**
  - `.goalie/trajectories.jsonl` built from metrics and decision events.
  - Canonical reward schema: each transition contains `reward.value` (scalar) and optional `reward.components` (`success`, `duration`, `roam`).
  - Thresholds from `.goalie/dt_validation_thresholds.yaml` (e.g., `min_episodes`, `max_horizon_variance`, `min_reward_diversity`).
- **Implementation:**
  - `scripts/analysis/validate_dt_trajectories.py` computes horizon, reward, action, and state feature statistics and evaluates them against thresholds.
  - `scripts/analysis/validate_success_criteria.sh` calls `af validate-dt --json` and fails the overall success gate when DT readiness warnings are present.
- **Signals:**
  - Sufficient episode count and stable horizons.
  - Well-formed rewards with low malformed fraction.
  - Diverse reward values and non-trivial action coverage.

This pattern is intentionally conservative: it prevents us from over-trusting DT models trained on sparse or low-quality trajectories and makes DT readiness visible in the same report as other production maturity checks.

### 5.3 Rollback Scripts
*   Integrated into deployment scripts.
*   Uses `af restore` logic to revert state.

## 6. Retro Integration

*   **Consumer**: `retro_coach.ts` (and the new `governance.py` middleware).
*   **Flow**:
    1.  `af prod-cycle` emits telemetry.
    2.  `retro_coach.ts` reads `.goalie/*.jsonl`.
    3.  `retro_coach` calculates `baselineComparison` and updates `retro_coach.json`.
    4.  Next `prod-cycle` reads `retro_coach.json` to adjust gates (e.g., if regression detected, tighten **Safe Degrade** thresholds).
