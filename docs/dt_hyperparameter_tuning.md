# Decision Transformer Hyperparameter Tuning

This guide gives practical defaults and tuning ranges for the Decision Transformer
(DT) used in the Agentic Flow governance pipeline. It assumes you are using the
CLIs wired through `scripts/af` and the preprocessing in
`scripts/analysis/prepare_dt_dataset.py`.

---

## 1. Understand Your Dataset

Before tuning, inspect the prepared DT dataset:

- Run a summary on any `.npz` / `.jsonl` pair:
  - `./scripts/af dt-dataset-summary --dataset-npz <path> --dataset-jsonl <path>`
- Pay attention to:
  - **Episode count** and **episode length distribution** (min/avg/max)
  - **Total timesteps**
  - **Action vocabulary size**
  - Sample `state_feature_names` / `action_feature_names`

Rough dataset scales:

- **Small**: `< 1k` timesteps or `< 100` episodes (toy / smoke tests)
- **Medium**: `1k–50k` timesteps or `100–1k` episodes (early prod data)
- **Large**: `> 50k` timesteps or `> 1k` episodes (steady-state prod)

---

## 2. Context Length (`--context-length`)

DT conditions on a fixed-length history window. Longer context gives more
history but increases compute and padding.

- Let `L_max` be the max episode length from the dataset summary.
- Good starting rule:
  - `context_length = min(L_max, 20)` for most workloads
- For **very short** episodes (e.g. `L_max <= 5`):
  - Use `context_length = L_max`.
- For **longer** episodes (`L_max >= 30`):
  - Start with `context_length = 16 or 24` and increase only if metrics plateau.

Governance-specific heuristic:

- Make sure `context_length` comfortably covers at least one full
  **pattern cycle** (e.g. safe-degrade trigger → guardrail lock → recovery) for
  typical runs.

---

## 3. Model Capacity

The main architecture knobs are:

- `--hidden-size`
- `--num-layers`
- `--num-heads`

Recommended ranges by dataset scale:

**Small datasets (< 100 episodes / < 1k steps)**

- `hidden_size`: 64
- `num_layers`: 2
- `num_heads`: 4
- Goal: avoid overfitting; keep model small and fast.

**Medium datasets (100–1k episodes)**

- `hidden_size`: 128–192
- `num_layers`: 3–4
- `num_heads`: 4–8
- Start at (128, 3, 4); scale up only if validation metrics keep improving.

**Large datasets (> 1k episodes)**

- `hidden_size`: 192–256
- `num_layers`: 4
- `num_heads`: 8
- Consider gradient clipping and learning rate decay if training becomes
  unstable.

Governance-specific note:

- If you rely heavily on subtle interactions between **circles** and
  **patterns** (e.g. safe-degrade + iteration-budget + guardrail-lock), prefer
  the **medium** settings even for borderline-small datasets to retain capacity.

---

## 4. Loss Weighting (`--cont-loss-scale`)

The DT optimizes two components:

- **Discrete action ID loss** (cross entropy)
- **Continuous parameter loss** (MSE on `action_param_*` fields)

Use `--cont-loss-scale` to tune their relative importance.

Suggested values:

- **Action ID dominant** (governance mostly about *which* action):
  - `--cont-loss-scale 1.0`
- **Parameters important** (e.g. confidence, iteration budget, priority):
  - `--cont-loss-scale 2.0–5.0`

Signs you should increase `cont_loss_scale`:

- Evaluation shows good discrete accuracy but large MAE/MSE for
  `action_param_*` in `evaluate-dt` output.

Signs you should decrease it:

- Action ID accuracy stalls or degrades while parameter errors keep shrinking.

---

## 5. Training Dynamics

Key knobs:

- `--epochs`
- `--batch-size`
- `--learning-rate`

Recommended starting points:

**Synthetic / very small datasets**

- `epochs`: 10–20
- `batch_size`: 4–8
- `learning_rate`: `1e-4`

**Medium real datasets**

- `epochs`: 30–60
- `batch_size`: 8–16
- `learning_rate`: `1e-4` (consider decay after 50% of epochs)

**Large production datasets**

- `epochs`: 50–100`
- `batch_size`: 16–32` (subject to GPU/CPU memory)
- `learning_rate`: `1e-4` with cosine or step decay

Watch:

- **Training loss** should decrease smoothly.
- If loss oscillates or diverges, try:
  - Reducing `learning_rate` to `5e-5`.
  - Lowering `hidden_size` or `num_layers`.

---

## 6. Example Workflows

### 6.1 Small synthetic dataset (current fixture)

Prepare the dataset (one time):

- `python scripts/analysis/prepare_dt_dataset.py \`
- `  --trajectories .goalie/test_trajectories.jsonl \`
- `  --output-jsonl .goalie/test_dt_dataset.jsonl \`
- `  --output-npz .goalie/test_dt_dataset.npz`

Train a small DT:

- `./scripts/af train-dt \`
- `  --dataset-npz .goalie/test_dt_dataset.npz \`
- `  --dataset-jsonl .goalie/test_dt_dataset.jsonl \`
- `  --epochs 10 --batch-size 4 \`
- `  --context-length 3 \`
- `  --hidden-size 32 \`
- `  --num-layers 2 --num-heads 4 \`
- `  --run-name synthetic-small`

Evaluate offline:

- `./scripts/af evaluate-dt \`
- `  --checkpoint .goalie/dt_model_synthetic-small.pt \`
- `  --eval-dataset-npz .goalie/test_dt_dataset.npz \`
- `  --eval-dataset-jsonl .goalie/test_dt_dataset.jsonl \`
- `  --output-json .goalie/dt_eval_results_synthetic.json`

### 6.2 Medium real dataset (~100–1000 episodes)

- Use `af dt-summary` + `af dt-dataset-summary` on a real
  `.goalie/trajectories.jsonl` slice.
- Start with:
  - `context_length`: `min(max_episode_length, 20)`
  - `hidden_size`: 128
  - `num_layers`: 3
  - `num_heads`: 4 or 8
  - `epochs`: 40
  - `batch_size`: 8–16

Evaluate after each major run with `af evaluate-dt` and track:

- Overall top-1 / top-3 accuracy
- Per-circle accuracy (e.g. analyst vs orchestrator)
- MAE/MSE for key `action_param_*` features

---

## 7. Common Failure Modes

- **Loss not decreasing**
  - Check that `validate-dt` and `dt-dataset-summary` pass; malformed rewards or
    misaligned features can silently degrade training.
  - Lower `learning_rate` and/or `hidden_size`.

- **Overfitting (train loss ↓, eval metrics flat or worse)**
  - Reduce model capacity.
  - Reduce `epochs` or add early stopping based on held-out eval.

- **Poor per-circle accuracy**
  - Ensure enough coverage for each circle in the dataset.
  - Consider rebalancing or weighting episodes from underrepresented circles.

Use `./scripts/af evaluate-dt` as your primary feedback loop: it gives
per-circle and per-action breakdowns aligned with the governance schema, so you
can see *where* the model is underperforming and tune accordingly.

