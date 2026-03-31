## DT Threshold Calibration Overview

Decision Transformer (DT) thresholds encode the minimum model quality required for a given environment (staging vs production). They are used by:
- `af validate-dt-model` and the broader `af validate-success` / `af prod-cycle` governance loop
- The DT evaluation dashboard (`af dt-dashboard`) for visualizing historical performance and pass-rates

Calibration is about choosing thresholds that:
- Catch obviously broken models early (staging)
- Protect production from regressions while allowing healthy iteration (production)
- Are grounded in **historical DT evaluation data**, not ad‑hoc guesses

This document describes:
- How to preview the impact of candidate threshold YAMLs with `--dry-run-config`
- How to auto-generate suggested thresholds with `af dt-suggest-thresholds`
- Best practices for staging vs production
- How these tools can be surfaced via the VSCode extension
- How to integrate these tools into CI using `af dt-e2e-check` as an end-to-end guard

---

## Threshold Impact Preview with `--dry-run-config`

### Purpose and use cases

`af dt-dashboard --dry-run-config <yaml>` lets you answer:
- "If we had enforced these thresholds historically, how often would evaluations have passed?"
- "Which criteria most frequently caused failures under this candidate?"

Typical use cases:
- Tuning new production thresholds before enabling them in CI
- Comparing multiple candidate YAMLs (e.g. stricter vs looser)
- Sanity-checking automated suggestions from `af dt-suggest-thresholds`

### Basic workflow and commands

1. Ensure you have recent DT evaluations logged:
   - Run `af prod-cycle` or `af evaluate-dt` to populate `.goalie/metrics_log.jsonl`.
2. Create a candidate threshold YAML (starting from your base config):

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````yaml
# .goalie/dt_validation_thresholds_production_candidate.yaml
model_quality_thresholds:
  min_top1_accuracy: 0.78
  max_cont_mae: 0.15
  per_circle_min_top1_orchestrator: 0.80
````
</augment_code_snippet>

3. Preview its impact using the dashboard:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````bash
./scripts/af dt-dashboard \
  --dry-run-config .goalie/dt_validation_thresholds_production_candidate.yaml \
  --format html --format table --format json
````
</augment_code_snippet>

The command:
- Regenerates the HTML dashboard (with threshold lines + reward preset view if trajectories are available)
- Updates `.goalie/dt_evaluation_summary.json` with a new `config_impact["dt_validation_thresholds_production_candidate.yaml"]` entry
- Prints an ASCII table summarizing pass-rates and top failure reasons

### Interpreting pass-rates

In the JSON summary (`dt_evaluation_summary.json`) and ASCII table, each config has:
- `pass_count`, `fail_count`
- `pass_rate` (0–1)
- `failure_reasons` histogram (e.g. `"min_top1_accuracy"`, `"max_cont_mae"`)

For **production** thresholds, we generally aim for:
- **80–90% pass-rate** over historical evaluations
  - **< 0.8** → thresholds likely too strict (many historical models would have been rejected)
  - **> 0.9–0.95** → thresholds likely too lenient (little protection against regressions)

For **staging**, a wider band is acceptable; the goal is primarily early detection, not stability guarantees.

### Suggested iterative workflow

1. Start from either:
   - Your current production YAML, or
   - Suggested thresholds from `af dt-suggest-thresholds` (see below).
2. Run `af dt-dashboard --dry-run-config <candidate.yaml>`.
3. Inspect `config_impact`:
   - If `pass_rate` is below target, slightly **loosen** thresholds (e.g. reduce `min_top1_accuracy` by 0.01–0.02).
   - If `pass_rate` is above target, slightly **tighten** thresholds.
   - Use `failure_reasons` to see which metrics are binding.
4. Iterate until production `pass_rate` sits in the desired band and failure reasons are intuitively aligned with what you consider "unacceptably bad" behavior.

---

## `af dt-suggest-thresholds` – Automated Threshold Generation

### Purpose and methodology

`af dt-suggest-thresholds` automates threshold generation from the JSON summary emitted by `af dt-dashboard`. It:
- Reads quantile statistics for global and per-circle metrics (e.g. p25, median, p75 for `top1_accuracy` and `cont_mae`)
- Proposes **staging** thresholds that are conservative but lenient
- Proposes **production** thresholds centered around median historical performance
- Optionally runs a preview using `--dry-run-config` and enforces a target production pass-rate band (default 0.75–0.90)

Heuristics (as implemented in `suggest_dt_thresholds.compute_suggestions`):
- Let `top1` be global top‑1 accuracy stats and `cont_mae` continuous MAE stats.
- **Staging**:
  - `min_top1_accuracy ≈ max(0, p25(top1) − 0.10)`
  - `max_cont_mae ≈ p75(cont_mae) + 0.10` (if available)
  - Per-circle: `per_circle_min_top1_<circle> ≈ max(0, p25(circle_top1) − 0.05)`
- **Production**:
  - `min_top1_accuracy = median(top1)`
  - `max_cont_mae = median(cont_mae)` (if available)
  - Key circles (e.g. orchestrator, assessor): `per_circle_min_top1_<circle> = median(circle_top1)`

### Basic usage

1. Generate/refresh the dashboard summary:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````bash
./scripts/af dt-dashboard --format html --format json
# writes .goalie/dt_evaluation_summary.json
````
</augment_code_snippet>

2. Run the suggestion command:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````bash
./scripts/af dt-suggest-thresholds \
  --input-json .goalie/dt_evaluation_summary.json \
  --output-staging .goalie/dt_validation_thresholds_staging_suggested.yaml \
  --output-production .goalie/dt_validation_thresholds_production_suggested.yaml
````
</augment_code_snippet>

By default, `af dt-suggest-thresholds` will:
- Write two YAML files under `.goalie/` with a `model_quality_thresholds` section
- Invoke the dashboard in `--dry-run-config` mode against the **production** suggestion
- Check whether the resulting production `pass_rate` lies within the target band `[0.75, 0.90]`

You can disable the preview with `--no-preview` or adjust the band via `--target-pass-rate-min` / `--target-pass-rate-max`.

### Reviewing and promoting suggested thresholds

1. Inspect the suggested YAMLs for sanity (e.g. via editor or `yq`).
2. Optionally re-run an explicit preview:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````bash
./scripts/af dt-dashboard \
  --dry-run-config .goalie/dt_validation_thresholds_production_suggested.yaml \
  --format table
````
</augment_code_snippet>

3. Once satisfied:
   - Promote to active staging/production configs, for example:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````bash
cp .goalie/dt_validation_thresholds_staging_suggested.yaml \
   .goalie/dt_validation_thresholds_staging.yaml
cp .goalie/dt_validation_thresholds_production_suggested.yaml \
   .goalie/dt_validation_thresholds_production.yaml
````
</augment_code_snippet>

**Note:** For a CI-friendly guard that runs this full pipeline and validates the key artifacts, see [CI Integration with `af dt-e2e-check`](#ci-integration-with-af-dt-e2e-check) and consider wiring `af dt-e2e-check` into your pipeline.

4. Run your normal validation pipeline (e.g. `./scripts/af validate-success --env production`) to confirm the new thresholds are enforced end‑to‑end.

---

## Best Practices: Staging vs Production Thresholds

**Staging** should be:
- Lenient enough to allow experimentation and rapid iteration
- Strict enough to flag obviously broken models
- More sensitive to **trend changes** than absolute levels (dashboard plots help here)

**Production** should be:
- Based on **median historical performance**, not aspirational targets
- Tuned to an **80–90% pass-rate** over recent historical evaluations
- Stable over time (avoid frequent small changes that churn governance)

A common pattern is:
- Use staging thresholds as a "smoke test" gate before running more expensive checks
- Use production thresholds as a formal, audited contract enforced by `af validate-success` in your prod cycle

---

## Calibration Heuristic Tuning

Phase 3 adds lightweight governance metrics on top of the core DT calibration flow so you can iterate on thresholds based on **observed behavior over time**, not just a single snapshot.

### Inputs

- **CI history guardrail** – `af dt-ci-history` reads `.goalie/ci_dt_check_history.jsonl` and writes an aggregate summary to `.goalie/dt_ci_analysis_summary.json` (overall pass-rate, trend, suggested production pass-rate quantiles).
- **Distribution analysis** – `af dt-dashboard --analyze-distributions` augments the usual summary with `.goalie/dt_distribution_analysis.json` containing:
  - Histograms for `top1_accuracy` and `cont_mae`.
  - Per-circle accuracy distributions.
  - A list of evaluations that would fail the **suggested production thresholds**.
- **Visualization** – `python3 scripts/analysis/plot_dt_distributions.py` renders `dt_distribution_analysis.json` into `.goalie/dt_distribution_plots.html` for quick visual inspection.

Example workflow:

1. Inspect CI stability over the last N runs:

   <augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
   ````bash
   ./scripts/af dt-ci-history
   ````
   </augment_code_snippet>

2. Generate a fresh dashboard summary **and** distribution analysis:

   <augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
   ````bash
   ./scripts/af dt-dashboard --format json --analyze-distributions
   python3 scripts/analysis/plot_dt_distributions.py --open
   ````
   </augment_code_snippet>

3. In `dt_distribution_plots.html`, review:
   - Where most evaluations sit relative to `min_top1_accuracy` / `max_cont_mae`.
   - Which circles systematically hover near the threshold line.
   - The outlier table listing evaluations that would fail the suggested production thresholds.

### How to refine heuristics

Use these signals to iteratively refine the heuristics in:
- `scripts/analysis/suggest_dt_thresholds.py` (quantile-based suggestions and pass-rate band checks), and
- `scripts/analysis/dt_evaluation_dashboard.py` (threshold recommendation helpers).

Typical adjustments include:
- **Target pass-rate band** – if CI history shows that 75–90% is either too strict or too lenient in practice, update the default band used by `af dt-suggest-thresholds`.
- **Quantile offsets** – if histograms show a long tail of bad evaluations, consider tightening `min_top1_accuracy` (e.g. closer to p75) or lowering `max_cont_mae` relative to current medians.
- **Per-circle requirements** – if certain circles are consistently strong or weak, adjust `per_circle_min_top1_<circle>` heuristics to match their empirical behavior.

The goal is to keep the heuristic **simple and explainable**, while grounding it in recurring patterns from CI and historical evaluation distributions.

---


## VSCode Extension Integration (Design Notes)

The DT dashboard and calibration tools can be surfaced in the VSCode extension via `af goalie-gaps vsix`. Two main integration styles are envisioned:

### Option A – JSON message protocol (recommended for richer workflows)

- Extend `af goalie-gaps vsix` to emit **newline-delimited JSON** objects on `stdout`. Each line is a single message the VSCode extension can parse.

- **Envelope and union types (VSCode side, TypeScript)**:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````ts
export interface BaseGoalieVsixMessage {
  source: 'goalie-vsix';
  version: 1;
  opId?: string;           // Optional correlation ID for multi-step flows
  timestamp?: string;      // ISO-8601, filled in by the CLI when convenient
}

export interface WebviewOpenMessage extends BaseGoalieVsixMessage {
  type: 'webview';
  action: 'open';
  title: string;
  htmlPath: string;        // e.g. ".goalie/dt_evaluation_dashboard.html"
}

export interface CommandStatusMessage extends BaseGoalieVsixMessage {
  type: 'command-status';
  command: 'dt-dashboard' | 'dt-suggest-thresholds' | 'prod-cycle' | string;
  phase: 'start' | 'success' | 'error';
  args?: Record<string, unknown>;
  exitCode?: number;       // Present for success/error
  errorMessage?: string;   // Present for error
}

export interface DtDashboardSummaryReadyMessage extends BaseGoalieVsixMessage {
  type: 'dt-dashboard-summary';
  summaryPath: string;     // e.g. ".goalie/dt_evaluation_summary.json"
}

export type GoalieVsixMessage =
  | WebviewOpenMessage
  | CommandStatusMessage
  | DtDashboardSummaryReadyMessage;
````
</augment_code_snippet>

- **Example payloads**:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````json
{"source":"goalie-vsix","version":1,
 "type":"webview","action":"open",
 "title":"DT Evaluation Dashboard",
 "htmlPath":".goalie/dt_evaluation_dashboard.html"}

{"source":"goalie-vsix","version":1,
 "type":"command-status",
 "command":"dt-suggest-thresholds",
 "phase":"success",
 "exitCode":0}
````
</augment_code_snippet>

- The VSCode extension reads these JSON lines from `stdout` and:
  - Opens a webview when it receives a `WebviewOpenMessage`.
  - Tracks background command progress using `CommandStatusMessage`.
  - Optionally waits for `DtDashboardSummaryReadyMessage` to decide when to re-parse `.goalie/dt_evaluation_summary.json`.

- **Required CLI changes (high level)**:
  - Add flags to `af goalie-gaps vsix`, e.g.:
    - `--show-dt-dashboard` – run `dt-dashboard`, then emit:
      - a `command-status` (`phase: "start"` / `"success"`) pair, and
      - a `webview` message once the HTML is written.
    - `--calibrate-dt-thresholds` – run `dt-dashboard` + `dt-suggest-thresholds` and emit:
      - `command-status` messages for each command, and
      - a `dt-dashboard-summary` message when the JSON summary is refreshed.
  - Keep messages **one JSON object per line** to simplify parsing.

- **Optional: type for `.goalie/dt_evaluation_summary.json` (for webview code)**:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````ts
export interface QuantileStats {
  min?: number;
  p25?: number;
  median?: number;
  p75?: number;
  p90?: number;
  max?: number;
}

export interface PerCircleStats {
  [circle: string]: QuantileStats;
}

export interface ConfigImpactEntry {
  pass_count: number;
  fail_count: number;
  pass_rate: number;                   // 0–1
  failure_reasons: Record<string, number>;
}

export interface DtEvaluationSummary {
  total_evaluations: number;
  date_range: { start: string; end: string };
  top1_accuracy: QuantileStats;
  top3_accuracy?: QuantileStats;
  cont_mae?: QuantileStats;
  per_circle_median_top1?: Record<string, number>;
  per_circle_stats?: PerCircleStats;
  pass_rate?: { staging?: number; production?: number };
  config_impact?: Record<string, ConfigImpactEntry>;
  dry_run_config?: string | null;
  // ...plus other fields that the extension may ignore (checkpoint summary, reward presets, etc.)
}
````
</augment_code_snippet>

### Option B – Direct CLI invocation (simpler, less structured)

- The VSCode extension shells out directly to the relevant `af` commands:
  - `af dt-dashboard` to build/refresh the HTML + JSON
  - `af prod-cycle` to generate evaluation data
  - `af dt-suggest-thresholds` for automated calibration
- The extension is responsible for:
  - Locating `.goalie/dt_evaluation_dashboard.html` and loading it into a webview
  - Parsing `dt_evaluation_summary.json` directly (if richer UI is desired)
  - Handling process lifecycle (progress, cancellation, errors)

Required CLI changes are minimal (existing commands are already stable); the main work is inside the extension codebase.


---

## CI Integration with `af dt-e2e-check`

### Purpose

`af dt-e2e-check` is a CI-ready validation command that runs the complete **4-step DT threshold calibration pipeline** and verifies that all key artifacts are present and structurally valid. It is designed to be a single, reliable guardrail you can wire into CI after DT training or threshold changes.

### What it validates

When you run `af dt-e2e-check`, it will:

1. Execute the calibration pipeline via `af`:
   - `af prod-cycle <N>` – generate fresh evaluation data (can be skipped with `--skip-prod-cycle`).
   - `af dt-dashboard --format html --format json` – build the DT evaluation dashboard and JSON summary.
   - `af dt-suggest-thresholds` – generate suggested staging and production thresholds.
   - `af dt-dashboard --dry-run-config .goalie/dt_validation_thresholds_production_suggested.yaml --format table` – preview the suggested production thresholds.

2. Validate the generated artifacts:
   - **Summary JSON**: verifies `.goalie/dt_evaluation_summary.json` exists, is valid JSON, and contains at least the following keys:
     - `total_evaluations`
     - `top1_accuracy`
     - `per_circle_stats`
     - `config_impact`
   - **Suggested thresholds YAMLs**: verifies both of these files exist and are valid YAML mappings:
     - `.goalie/dt_validation_thresholds_staging_suggested.yaml`
     - `.goalie/dt_validation_thresholds_production_suggested.yaml`
     Each must contain a `model_quality_thresholds` mapping with at least `min_top1_accuracy`.
   - **Config impact entry for suggested production thresholds**: confirms that the production suggested config appears as a key in `config_impact` within the summary JSON (using the filename of the production suggested YAML) and that its `pass_rate` field is numeric and lies in the inclusive range `[0.0, 1.0]`.

### Usage examples

```bash
# Full pipeline including generating fresh evaluation data
af dt-e2e-check

# If you already have up-to-date .goalie metrics and want a fast validation:
af dt-e2e-check --skip-prod-cycle

# With custom iterations and verbose logging
af dt-e2e-check --prod-cycle-iterations 50 --verbose
```

### Exit behavior

- Returns **exit code 0** when all four steps succeed and every validation passes.
- Returns a **non-zero exit code** on any failure, including:
  - Subprocess failures from `af prod-cycle`, `af dt-dashboard`, or `af dt-suggest-thresholds`.
  - Missing or malformed JSON/YAML artifacts.
  - Missing required keys in `dt_evaluation_summary.json`.
  - Missing or invalid `config_impact` entry for the production suggested thresholds (e.g., non-numeric or out-of-range `pass_rate`).
- On failure it prints clear, human-readable diagnostics to **stderr** (for example, messages like `Missing key 'per_circle_stats' in dt_evaluation_summary.json`).

### CI recommendation

For CI, the recommended pattern is:

- After training a DT model, updating reward presets, or changing threshold logic, run:
  - `af dt-e2e-check --skip-prod-cycle`
- This assumes recent DT evaluation data is already present in `.goalie/metrics_log.jsonl`; the command then reuses that data to:
  - Rebuild the dashboard,
  - Regenerate suggested thresholds,
  - Re-run the dry-run impact preview for the suggested production config.

Wiring this command into your CI pipeline ensures the full DT calibration toolchain (metrics logging → dashboard → suggestion → impact preview) stays healthy over time.
### How the extension would invoke DT tooling

Regardless of Option A or B, the extension would typically:
1. Run `af prod-cycle` (optionally parameterized) to ensure fresh DT evaluations.
2. Run `af dt-dashboard --format html --format json` to refresh artifacts.
3. Open the HTML dashboard in a VSCode webview.
4. Offer a "Calibrate thresholds" action that:
   - Runs `af dt-suggest-thresholds`
   - Optionally previews the suggested production thresholds via `af dt-dashboard --dry-run-config ...`
   - Surfaces pass-rate results and failure reasons inside VSCode.

---

## End-to-End Calibration Workflow (Concrete Example)

1. **Generate evaluation data** (offline replay / prod-cycle):

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````bash
./scripts/af prod-cycle 100   # or another iteration count suitable for your setup
````
</augment_code_snippet>

2. **Build/update the DT dashboard and summary**:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````bash
./scripts/af dt-dashboard --format html --format json --format table
````
</augment_code_snippet>

3. **Auto-generate suggested thresholds**:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````bash
./scripts/af dt-suggest-thresholds
````
</augment_code_snippet>

4. **Preview the suggested production thresholds against history**:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````bash
./scripts/af dt-dashboard \
  --dry-run-config .goalie/dt_validation_thresholds_production_suggested.yaml \
  --format table
````
</augment_code_snippet>

5. **Promote suggested thresholds once satisfied** (copy into active staging/production files).

6. **Validate the full governance loop**:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````bash
./scripts/af validate-success --env production
````
</augment_code_snippet>

7. **Capture a baseline summary for governance** (once you are happy with the calibrated thresholds):

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````bash
cp .goalie/dt_evaluation_summary.json \
   .goalie/dt_evaluation_summary_baseline.json
````
</augment_code_snippet>

8. **Use the baseline + current summary as inputs to quality gate enforcement** (locally or in CI).

9. **Run quality gate enforcement locally** to verify the behavior before wiring it into CI:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````bash
./scripts/af enforce-dt-gates \
  --summary-json .goalie/dt_evaluation_summary.json \
  --baseline-summary-json .goalie/dt_evaluation_summary_baseline.json \
  --min-staging-pass-rate 0.90 \
  --min-production-pass-rate 0.75 \
  --min-evaluations 5 \
  --max-reward-regression-pct 5.0 \
  --max-metric-regression-pct 10.0 \
  --output-json .goalie/dt_quality_gates_result.json
````
</augment_code_snippet>

10. **Enforce Gates in CI with `af enforce-dt-gates`** – plug the same command into your CI/CD pipeline (GitHub Actions, Jenkins, etc.). The job should fail when the process exits with a non-zero code, and you can archive the JSON output as an auditable artifact.

If all steps succeed and pass-rates + gates look reasonable, you have a calibrated, data-driven set of DT thresholds wired into your production maturity checks.

## Quality Gate JSON Output Schema Reference

The `af enforce-dt-gates` command can optionally emit a machine-readable JSON report (via `--output-json`). This section documents the schema for that output so it can be safely consumed by CI/CD pipelines, audit systems, and governance dashboards.

TypeScript-style interfaces:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````ts
export type QualityGateStatus = 'pass' | 'fail' | 'skip';

export interface DtQualityGateResults {
  timestamp: string;                 // ISO-8601 UTC timestamp (e.g. "2025-11-24T18:35:12Z")
  summary_file: string;              // Path to the dt_evaluation_summary.json used as input
  baseline_file: string | null;      // Path to baseline summary JSON, or null if none
  total_evaluations: number;         // Total count of evaluations in the summary
  date_range: {
    start?: string;                  // Optional start timestamp for the evaluation window
    end?: string;                    // Optional end timestamp for the evaluation window
  };
  gates: QualityGateEntry[];         // One entry per gate that was evaluated
  overall_status: 'pass' | 'fail';   // 'fail' iff at least one gate has status === 'fail'
  failed_gate_count: number;         // Number of gates with status === 'fail'
  passed_gate_count: number;         // Number of gates with status === 'pass'
}

export interface BaseQualityGateEntry {
  name:
    | 'minimum_evaluations'
    | 'staging_pass_rate'
    | 'production_pass_rate'
    | 'reward_preset_regression'
    | 'metric_regression';
  status: QualityGateStatus;
  message: string;                   // Human-readable summary of the gate result
  remediation?: string;              // Suggested action when status === 'fail'
}

export interface MinimumEvaluationsGateEntry extends BaseQualityGateEntry {
  name: 'minimum_evaluations';
  extra?: {
    actual?: number;                 // Observed total evaluations
    threshold?: number;              // Required minimum evaluations
  };
}

export interface PassRateGateEntry extends BaseQualityGateEntry {
  name: 'staging_pass_rate' | 'production_pass_rate';
  extra?: {
    actual?: number;                 // Observed pass-rate (0–1)
    threshold?: number;              // Minimum acceptable pass-rate (0–1)
  };
}

export interface RewardPresetRegressionEntry {
  preset: string;                    // Reward preset name (e.g. 'balanced')
  baseline_mean: number;             // Baseline mean reward
  current_mean: number;              // Current mean reward
  change_pct: number;                // ((current - baseline) / baseline) * 100
  threshold_pct: number;             // Maximum allowed drop in reward (e.g. 5.0 for 5%)
}

export interface RewardPresetRegressionGateEntry extends BaseQualityGateEntry {
  name: 'reward_preset_regression';
  regressions?: RewardPresetRegressionEntry[];  // Only present when status === 'fail'
}

export interface MetricRegressionEntry {
  name:
    | 'top1_accuracy'
    | 'cont_mae'
    | 'top3_accuracy'
    | 'calibration_error'
    | 'latency_p50'
    | 'latency_p95'
    | 'latency_p99';
  baseline_median: number;           // Baseline median metric value
  current_median: number;            // Current median metric value
  change_pct: number;                // ((current - baseline) / baseline) * 100
  threshold_pct: number;             // Maximum allowed regression magnitude (e.g. 10.0)
  higher_is_better: boolean;         // true for accuracies, false for error metrics
  regressed: boolean;                // true iff this metric exceeded the regression threshold
}

export interface MetricRegressionGateEntry extends BaseQualityGateEntry {
  name: 'metric_regression';
  metrics?: MetricRegressionEntry[]; // One entry per metric that was checked
}

export type QualityGateEntry =
  | MinimumEvaluationsGateEntry
  | PassRateGateEntry
  | RewardPresetRegressionGateEntry
  | MetricRegressionGateEntry;
````
</augment_code_snippet>

### Top-level fields

- `timestamp` – UTC timestamp when the report was generated.
- `summary_file` – Path to the `dt_evaluation_summary.json` used as the primary input.
- `baseline_file` – Path to the baseline summary JSON (or `null` if none was provided).
- `total_evaluations` – Total number of evaluations contained in `summary_file`.
- `date_range` – Optional `start` / `end` timestamps for the evaluation window.
- `gates` – Array of per-gate entries, one for each quality gate that was evaluated.
- `overall_status` – `'pass'` if no gates failed, `'fail'` otherwise.
- `failed_gate_count` / `passed_gate_count` – Convenience counts for quick inspection.

### Gate types and `extra` payloads

#### `minimum_evaluations`

- **Status values**: `pass`, `fail`.
- **Extra payload** (`extra`):
  - `actual` – Observed `total_evaluations`.
  - `threshold` – Configured minimum evaluations.

Example failed gate:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````json
{
  "name": "minimum_evaluations",
  "status": "fail",
  "message": "3 < 5",
  "remediation": "Increase evaluation coverage before deploying (run additional DT evaluations).",
  "actual": 3,
  "threshold": 5
}
````
</augment_code_snippet>

#### `staging_pass_rate` / `production_pass_rate`

- **Status values**: `pass`, `fail`.
- **Extra payload** (`extra`):
  - `actual` – Observed pass-rate (0–1) for the environment.
  - `threshold` – Minimum required pass-rate (0–1).

Example failed gate:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````json
{
  "name": "production_pass_rate",
  "status": "fail",
  "message": "60.0% < 75.0%",
  "remediation": "Review recent DT evaluations and adjust thresholds or retrain the model for production environment.",
  "actual": 0.6,
  "threshold": 0.75
}
````
</augment_code_snippet>

#### `reward_preset_regression`

- **Status values**: `pass`, `fail`, `skip` (when no baseline is provided).
- **Extra payload** (`extra`):
  - `regressions` – Array of presets that regressed beyond the allowed drop.

Example failed gate:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````json
{
  "name": "reward_preset_regression",
  "status": "fail",
  "message": "2 presets regressed beyond threshold",
  "remediation": "Investigate trajectory quality, reward function changes, or data shifts affecting reward behavior.",
  "regressions": [
    {
      "preset": "balanced",
      "baseline_mean": 0.72,
      "current_mean": 0.65,
      "change_pct": -9.7,
      "threshold_pct": 5.0
    }
  ]
}
````
</augment_code_snippet>

#### `metric_regression`

- **Status values**: `pass`, `fail`, `skip` (when no baseline is provided or no metrics are usable).
- **Extra payload** (`extra`):
  - `metrics` – Array of metric entries that were evaluated. Each entry indicates whether that metric regressed according to the configured threshold.

Example failed gate:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````json
{
  "name": "metric_regression",
  "status": "fail",
  "message": "2 metrics regressed: top1_accuracy, cont_mae",
  "remediation": "Investigate model performance regressions and consider retraining, data fixes, or threshold adjustments for the affected metrics.",
  "metrics": [
    {
      "name": "top1_accuracy",
      "baseline_median": 0.80,
      "current_median": 0.70,
      "change_pct": -12.5,
      "threshold_pct": 10.0,
      "higher_is_better": true,
      "regressed": true
    },
    {
      "name": "cont_mae",
      "baseline_median": 0.10,
      "current_median": 0.12,
      "change_pct": 20.0,
      "threshold_pct": 10.0,
      "higher_is_better": false,
      "regressed": true
    }
  ]
}
````
</augment_code_snippet>

Example failed gate (latency metric):

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````json
{
  "name": "metric_regression",
  "status": "fail",
  "message": "1 metric regressed: latency_p95",
  "remediation": "Investigate latency regressions and consider performance optimizations or deployment rollbacks.",
  "metrics": [
    {
      "name": "latency_p95",
      "baseline_median": 0.050,
      "current_median": 0.080,
      "change_pct": 60.0,
      "threshold_pct": 10.0,
      "higher_is_better": false,
      "regressed": true
    }
  ]
}
````
</augment_code_snippet>

This schema is considered **stable** and is intended for programmatic consumption by CI/CD workflows, audit pipelines, and governance dashboards.

## CI/CD Integration Examples

This section shows how to wire the DT evaluation dashboard, quality gates, and summary publisher into a CI/CD pipeline.

### Example: GitHub Actions workflow

Run the dashboard, enforce quality gates, and publish HTML + Slack payload in a single job:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````yaml
- name: Enforce DT quality gates
  run: |
    ./scripts/af dt-dashboard --format json
    ./scripts/af enforce-dt-gates --output-json .goalie/dt_quality_gates_result.json
    ./scripts/af publish-dt-gates-summary --format html --format slack
````
</augment_code_snippet>

The HTML report (`.goalie/dt_gates_summary.html`) can be uploaded as a build artifact or published into an internal governance dashboard.

### Example: Slack notification in CI

After `af publish-dt-gates-summary` writes `.goalie/dt_gates_slack_payload.json`, you can send it to a Slack incoming webhook:

<augment_code_snippet path="investing/agentic-flow/docs/dt_threshold_calibration.md" mode="EXCERPT">
````bash
curl -X POST -H 'Content-type: application/json' \
  --data @.goalie/dt_gates_slack_payload.json \
  "$SLACK_WEBHOOK_URL"
````
</augment_code_snippet>

This keeps the enforcement logic in Python/`af` while CI remains a thin orchestrator around these commands.
