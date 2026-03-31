# IRIS Validation Quickstart

This guide helps you quickly validate the IRIS + Governance Dashboard integration
in **stub mode**, without a live IRIS backend.

It complements the full integration guide in
`docs/integrations/IRIS_INTEGRATION.md` and focuses on the fastest
"happy path" from a clean checkout.

---

## 1. Prerequisites

From the repo root (`investing/agentic-flow`):

```bash
# Node dependencies
pnpm install

# Python dependencies (for IRIS analysis + governance dashboard)
pip install -r analysis/requirements.txt
```

You should have:

- Node.js 20+ (Node 22+ recommended)
- `pnpm` installed
- Python 3.10+ with `pip`

---

## 2. Quick Validation Workflow (Stub Mode)

All commands below are run from `investing/agentic-flow`.

### 2.1 Build agentic-flow + ReasoningBank

```bash
pnpm run build
```

This will:

- Build the `agentic-flow/agentic-flow` TypeScript package
- Build ReasoningBank WASM bundles via `wasm-pack`
- Copy ReasoningBank prompts + config into `agentic-flow/dist/reasoningbank`

### 2.2 Run a stubbed prod-cycle with IRIS metrics

Set env vars to enable IRIS metrics and stub mode, then run one prod-cycle:

```bash
export AF_ENABLE_IRIS_METRICS=1
export AF_IRIS_STUB=1
export AF_TEST_MODE=1
export AF_IRIS_CMD=true

./scripts/af prod-cycle 1 --log-goalie --force
```

This will:

- Run a short production cycle using stubbed IRIS responses
- Log metrics (including IRIS evaluation events) to `.goalie/metrics_log.jsonl`

### 2.3 Generate the Governance Evaluation Dashboard

```bash
python scripts/analysis/governance_evaluation_dashboard.py \
  --metrics-log .goalie/metrics_log.jsonl \
  --output-html .goalie/governance_evaluation_dashboard.html
```

On success, you should see an HTML dashboard at:

- `.goalie/governance_evaluation_dashboard.html`

You can open this file locally in a browser to inspect IRIS-related panels.

---

## 3. Environment Variables Reference

These are the key IRIS-related flags for stub-mode validation:

- `AF_ENABLE_IRIS_METRICS` (default: `0`)
  - When `1`, emits IRIS-related metrics (e.g. `iris_evaluation` events)
- `AF_IRIS_STUB` (default: `0`)
  - When `1`, use the built-in IRIS stub instead of a live backend
- `AF_TEST_MODE` (default: `0`)
  - Enables additional test-mode behavior; used by integration tests
- `AF_IRIS_CMD` (default: IRIS CLI path)
  - Override for the IRIS CLI binary; `true` is sufficient in stub mode
- `AF_SKIP_GOVERNOR_HEALTH` (optional)
  - If set to `1`, skips certain governor health checks during experiments

For real IRIS deployments, see `docs/integrations/IRIS_INTEGRATION.md`.

---

## 4. Verification Commands

Run these from `investing/agentic-flow` after the steps above.

### 4.1 Check for IRIS evaluation events

```bash
grep '"iris_evaluation"' .goalie/metrics_log.jsonl | head || echo 'NO_IRIS_EVENTS'
```

You should see one or more lines containing `"iris_evaluation"`.

### 4.2 Run targeted IRIS + Governance tests

```bash
pytest tests/analysis/test_iris_prod_cycle_integration.py -q
pytest tests/analysis/test_governance_evaluation_dashboard.py -q
```

Both tests should pass and confirm that:

- IRIS metrics are emitted correctly in stub mode
- The governance evaluation dashboard is generated and parses IRIS data

---

## 5. Troubleshooting

**No `iris_evaluation` events found**

- Confirm you exported/defined the env vars in the **same shell**:
  - `AF_ENABLE_IRIS_METRICS=1`
  - `AF_IRIS_STUB=1`
  - `AF_TEST_MODE=1`
  - `AF_IRIS_CMD=true`
- Re-run:

  ```bash
  ./scripts/af prod-cycle 1 --log-goalie --force
  ```

**Dashboard HTML not created**

- Ensure `.goalie/metrics_log.jsonl` exists and is non-empty
- Re-run the dashboard script and watch for Python exceptions:

  ```bash
  python scripts/analysis/governance_evaluation_dashboard.py \
    --metrics-log .goalie/metrics_log.jsonl \
    --output-html .goalie/governance_evaluation_dashboard.html
  ```

**Python tests fail**

- Verify Python deps:

  ```bash
  pip install -r analysis/requirements.txt
  ```

- Check test output for missing env vars or file paths

If issues persist, consult `docs/integrations/IRIS_INTEGRATION.md` for
full integration details and deeper diagnostics.
