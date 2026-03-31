#!/usr/bin/env python3
"""Offline evaluation for Decision Transformer checkpoints.

This script mirrors the DT training pipeline, loading a saved checkpoint and
an evaluation dataset to compute governance-aware offline metrics.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple


PROJECT_ROOT = Path(__file__).resolve().parents[2]
TRAIN_PATH = Path(__file__).resolve().with_name("train_dt_model.py")
PREPARE_PATH = Path(__file__).resolve().with_name("prepare_dt_dataset.py")


def _load_module(path: Path, name: str):
    if not path.is_file():  # pragma: no cover - defensive
        raise RuntimeError(f"Module file not found: {path}")
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        raise RuntimeError(f"Failed to create spec for {name}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    return module


def parse_args(argv: List[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate Decision Transformer")
    parser.add_argument(
        "--checkpoint",
        type=Path,
        default=Path(".goalie/dt_model.pt"),
        help="Path to trained DT checkpoint (.pt)",
    )
    parser.add_argument(
        "--eval-dataset-npz",
        type=Path,
        default=None,
        help="Evaluation dataset .npz; defaults to training dataset from checkpoint",
    )
    parser.add_argument(
        "--eval-dataset-jsonl",
        type=Path,
        default=None,
        help="Evaluation dataset .jsonl; defaults to training dataset from checkpoint",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=None,
        help="Optional override for evaluation batch size",
    )
    parser.add_argument(
        "--device",
        type=str,
        default=None,
        help="Evaluation device override (e.g. cpu, cuda)",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        default=Path(".goalie/dt_eval_results.json"),
        help="Where to write detailed JSON metrics",
    )
    parser.add_argument(
        "--schema-id",
        type=str,
        default=None,
        help="Optional schema id override for feature validation",
    )
    parser.add_argument(
        "--threshold-config",
        type=Path,
        default=None,
        help=(
            "Optional path to dt_validation_thresholds.yaml for model quality "
            "thresholds; defaults to .goalie/dt_validation_thresholds.yaml when omitted."
        ),
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help=(
            "Compare metrics against model-quality thresholds and exit non-zero "
            "on failure."
        ),
    )
    return parser.parse_args(argv)


def _load_run_ids(jsonl_path: Path, total_steps: int) -> List[str]:
    ids: List[str] = []
    with jsonl_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            ids.append(str(rec.get("run_id") or "unknown"))
    if len(ids) < total_steps:
        ids.extend(["unknown"] * (total_steps - len(ids)))
    return ids[:total_steps]


def _compute_circle_labels(dataset: Any, circles: List[str]) -> List[str]:
    meta = dataset.metadata or {}
    names = meta.get("state_feature_names") or []
    means = meta.get("state_means") or []
    stds = meta.get("state_stds") or []
    n_steps = int(dataset.states.shape[0])
    if "circle_bucket" not in names or not means or not stds:
        return ["unknown"] * n_steps
    idx = names.index("circle_bucket")
    if idx >= len(means) or idx >= len(stds):
        return ["unknown"] * n_steps
    mu = means[idx]
    sigma = stds[idx] or 1.0
    raw = dataset.states[:, idx] * sigma + mu
    labels: List[str] = []
    for v in raw:
        cid = int(round(float(v)))
        if 0 <= cid < len(circles):
            labels.append(str(circles[cid]))
        else:
            labels.append("unknown")
    return labels


def _update_bucket(stats: Dict[str, Dict[str, float]], key: str, ok1: bool, ok3: bool) -> None:
    bucket = stats.setdefault(key, {"total": 0.0, "top1": 0.0, "top3": 0.0})
    bucket["total"] += 1.0
    if ok1:
        bucket["top1"] += 1.0
    if ok3:
        bucket["top3"] += 1.0


def _expected_calibration_error(
    confidences: List[float],
    correct: List[float],
    n_bins: int = 10,
) -> float:
    """Compute Expected Calibration Error (ECE) from confidences and correctness.

    Uses equally spaced bins over [0, 1] and returns 0.0 when no data is available.
    """
    if not confidences or not correct or len(confidences) != len(correct):
        return 0.0

    bin_totals = [0.0] * n_bins
    bin_correct = [0.0] * n_bins
    bin_counts = [0] * n_bins

    for c, y in zip(confidences, correct):
        c = max(0.0, min(1.0, float(c)))
        y = float(y)
        idx = min(n_bins - 1, int(c * n_bins))
        bin_totals[idx] += c
        bin_correct[idx] += y
        bin_counts[idx] += 1

    ece = 0.0
    total = float(len(confidences))
    for total_c, total_y, count in zip(bin_totals, bin_correct, bin_counts):
        if count == 0:
            continue
        avg_conf = total_c / count
        avg_acc = total_y / count
        weight = count / total
        ece += weight * abs(avg_conf - avg_acc)
    return float(ece)


def _percentile(values: List[float], q: float) -> float:
    """Compute a simple percentile (0-100) with linear interpolation."""
    if not values:
        return 0.0
    vals = sorted(values)
    q = max(0.0, min(100.0, q))
    pos = (q / 100.0) * (len(vals) - 1)
    lo = int(pos)
    hi = min(lo + 1, len(vals) - 1)
    if lo == hi:
        return float(vals[lo])
    frac = pos - lo
    return float(vals[lo] + (vals[hi] - vals[lo]) * frac)


def _normalize_model_thresholds(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize raw model-quality threshold mapping into a structured form."""
    thresholds: Dict[str, Any] = {}
    if "min_top1_accuracy" in raw:
        thresholds["min_top1_accuracy"] = float(raw["min_top1_accuracy"])
    if "max_cont_mae" in raw:
        thresholds["max_cont_mae"] = float(raw["max_cont_mae"])

    per_circle: Dict[str, float] = {}
    prefix = "per_circle_min_top1_"
    for key, value in raw.items():
        if key.startswith(prefix):
            circle = key[len(prefix) :]
            try:
                per_circle[circle] = float(value)
            except (TypeError, ValueError):  # pragma: no cover - defensive
                continue
    if per_circle:
        thresholds["per_circle_min_top1"] = per_circle
    return thresholds


def load_model_thresholds(config_path: Path | None) -> Dict[str, Any]:
    """Load DT model-quality thresholds from YAML.

    The format mirrors dt_validation_thresholds.yaml and looks like::

        model_quality_thresholds:
          min_top1_accuracy: 0.70
          max_cont_mae: 0.15
          per_circle_min_top1_orchestrator: 0.70

    If the file or section is missing, very lenient defaults are used.
    """

    default_raw: Dict[str, Any] = {"min_top1_accuracy": 0.0}
    path = config_path or (PROJECT_ROOT / ".goalie" / "dt_validation_thresholds.yaml")
    if not path.is_file():
        return _normalize_model_thresholds(default_raw)

    raw: Dict[str, Any] = dict(default_raw)
    current_section: str | None = None
    try:
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                stripped = line.strip()
                if not stripped or stripped.startswith("#"):
                    continue
                if stripped.endswith(":") and ":" not in stripped[:-1]:
                    current_section = stripped[:-1]
                    continue
                if ":" not in stripped:
                    continue
                if current_section not in (None, "model_quality_thresholds"):
                    continue
                key, val = [p.strip() for p in stripped.split(":", 1)]
                if not key:
                    continue
                try:
                    if val.lower() in {"true", "false"}:
                        parsed: Any = val.lower() == "true"
                    elif "." in val:
                        parsed = float(val)
                    else:
                        parsed = int(val)
                except (ValueError, TypeError):
                    try:
                        parsed = float(val)
                    except (ValueError, TypeError):
                        parsed = val
                raw[key] = parsed
    except OSError:  # pragma: no cover - best-effort
        return _normalize_model_thresholds(default_raw)

    return _normalize_model_thresholds(raw)


def check_model_quality(
    results: Dict[str, Any], thresholds: Dict[str, Any]
) -> Tuple[bool, List[Tuple[str, bool, str]]]:
    """Compare evaluation metrics against configured thresholds."""

    passed = True
    crits: List[Tuple[str, bool, str]] = []

    top1 = float(results.get("top1_accuracy") or 0.0)
    min_top1 = float(thresholds.get("min_top1_accuracy") or 0.0)
    ok = top1 >= min_top1
    crits.append(
        (
            "min_top1_accuracy",
            ok,
            f"top1_accuracy={top1:.3f} (min={min_top1:.3f})",
        )
    )
    if not ok:
        passed = False

    cont = results.get("cont_overall")
    max_mae = thresholds.get("max_cont_mae")
    if cont is not None and max_mae is not None:
        mae = float(cont.get("mae") or 0.0)
        max_mae_f = float(max_mae)
        ok = mae <= max_mae_f
        crits.append(("max_cont_mae", ok, f"mae={mae:.4f} (max={max_mae_f:.4f})"))
        if not ok:
            passed = False

    per_circle_thresholds = thresholds.get("per_circle_min_top1") or {}
    per_circle_metrics = results.get("per_circle") or {}
    for circle, min_acc in per_circle_thresholds.items():
        stats = per_circle_metrics.get(circle) or {}
        acc = float(stats.get("top1_accuracy") or 0.0)
        min_acc_f = float(min_acc)
        ok = acc >= min_acc_f
        crits.append(
            (
                f"per_circle_min_top1[{circle}]",
                ok,
                f"top1_accuracy={acc:.3f} (min={min_acc_f:.3f})",
            )
        )
        if not ok:
            passed = False

    return passed, crits


def log_evaluation_metrics(results: Dict[str, Any]) -> None:
    """Append a dt_evaluation event to .goalie/metrics_log.jsonl (best-effort)."""

    metrics_path = PROJECT_ROOT / ".goalie" / "metrics_log.jsonl"
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    dataset_info = results.get("dataset") or {}
    per_circle = results.get("per_circle") or {}
    per_circle_top1 = {
        name: float(stats.get("top1_accuracy") or 0.0)
        for name, stats in per_circle.items()
    }

    event: Dict[str, Any] = {
        "timestamp": timestamp,
        "type": "dt_evaluation",
        "checkpoint": results.get("checkpoint"),
        "run_name": results.get("run_name"),
        "dataset": {
            "npz_path": dataset_info.get("npz_path"),
            "jsonl_path": dataset_info.get("jsonl_path"),
        },
        "metrics": {
            "top1_accuracy": float(results.get("top1_accuracy") or 0.0),
            "top3_accuracy": float(results.get("top3_accuracy") or 0.0),
            "total_positions": int(results.get("total_positions") or 0),
            "calibration_error": float(results.get("calibration_error") or 0.0),
            "latency_p50": float(results.get("latency_p50") or 0.0),
            "latency_p95": float(results.get("latency_p95") or 0.0),
            "latency_p99": float(results.get("latency_p99") or 0.0),
        },
        "per_circle_top1": per_circle_top1,
    }

    cont_overall = results.get("cont_overall")
    if cont_overall is not None:
        event["cont_overall"] = {
            "mse": float(cont_overall.get("mse") or 0.0),
            "mae": float(cont_overall.get("mae") or 0.0),
        }

    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    with metrics_path.open("a", encoding="utf-8") as handle:
        json.dump(event, handle, sort_keys=True)
        handle.write("\n")


def evaluate(args: argparse.Namespace) -> Dict[str, Any]:
    train_mod = _load_module(TRAIN_PATH, "dt_train")
    torch = getattr(train_mod, "torch", None)
    DataLoader = getattr(train_mod, "DataLoader", None)
    if torch is None or DataLoader is None:
        raise RuntimeError("PyTorch is required for evaluation but is not available")

    ckpt_path = args.checkpoint
    if not ckpt_path.is_file():
        raise RuntimeError(f"Checkpoint not found: {ckpt_path}")
    ckpt = torch.load(ckpt_path, map_location="cpu")
    if not isinstance(ckpt, dict) or "model_state_dict" not in ckpt:
        raise RuntimeError("Checkpoint is missing model_state_dict")

    ck_args = ckpt.get("args") or {}
    ds_npz = args.eval_dataset_npz or ck_args.get("dataset_npz") or Path(".goalie/dt_dataset.npz")
    ds_jsonl = args.eval_dataset_jsonl or ck_args.get("dataset_jsonl") or Path(".goalie/dt_dataset.jsonl")
    dataset = train_mod.load_dt_dataset(Path(ds_npz), Path(ds_jsonl))

    schema_id = args.schema_id or ckpt.get("schema_id") or "dt-schema-v1"
    train_mod.validate_dataset_schema(dataset, schema_id=schema_id)

    action_cfg = train_mod.build_action_feature_config(dataset.metadata or {})
    context_length = int(ck_args.get("context_length", 20))
    seq_dataset = train_mod.SequenceDataset(dataset, context_length=context_length)
    batch_size = int(args.batch_size or ck_args.get("batch_size", 32))
    collate = lambda b: train_mod.collate_batch(b, context_length, action_cfg)
    loader = DataLoader(seq_dataset, batch_size=batch_size, shuffle=False, collate_fn=collate)

    state_dim = int(dataset.states.shape[1])
    action_dim = int(dataset.actions.shape[1])
    cont_dim = len(action_cfg.cont_indices)
    hidden = int(ck_args.get("hidden_size", 128))
    num_layers = int(ck_args.get("num_layers", 3))
    num_heads = int(ck_args.get("num_heads", 8))
    dropout = float(ck_args.get("dropout", 0.1))

    model = train_mod.DecisionTransformer(
        state_dim=state_dim,
        action_dim=action_dim,
        hidden_size=hidden,
        num_layers=num_layers,
        num_heads=num_heads,
        context_length=context_length,
        vocab_size=action_cfg.vocab_size,
        cont_action_dim=cont_dim,
        dropout=dropout,
    )
    model.load_state_dict(ckpt["model_state_dict"])
    device_str = args.device or ck_args.get("device") or "cpu"
    device = torch.device(device_str)
    model.to(device)
    model.eval()

    prepare_mod = _load_module(PREPARE_PATH, "prepare_dt")
    circles = list(getattr(prepare_mod, "CIRCLES", []))
    circle_labels = _compute_circle_labels(dataset, circles)
    run_ids = _load_run_ids(Path(ds_jsonl), int(dataset.states.shape[0]))

    meta = dataset.metadata or {}
    action_names = meta.get("action_feature_names") or []
    cont_indices = action_cfg.cont_indices
    param_names = [action_names[i] for i in cont_indices] if cont_indices else []
    action_vocab = meta.get("action_vocab") or {}
    id_to_name = {int(v): str(k) for k, v in action_vocab.items()}

    total = correct1 = correct3 = 0.0
    per_circle: Dict[str, Dict[str, float]] = {}
    per_action: Dict[str, Dict[str, float]] = {}
    episodes: Dict[str, Dict[str, float]] = {}
    cont_sum_sq = cont_sum_abs = 0.0
    cont_count = 0.0
    per_param: Dict[str, Dict[str, float]] = {}
    latencies: List[float] = []
    ece_confidences: List[float] = []
    ece_correct: List[float] = []

    with torch.no_grad():
        for raw_batch in loader:
            batch = {
                k: (v.to(device) if hasattr(v, "to") else v) for k, v in raw_batch.items()
            }
            states = batch["states"]
            prev_actions = batch["prev_actions"]
            rtgs = batch["rtgs"]
            timesteps = batch["timesteps"]
            mask = batch["mask"].bool()
            target_ids = batch["target_action_ids"].long()
            target_cont = batch["target_action_cont"]
            idx_tensor = raw_batch["indices"].long()

            start_time = time.perf_counter()
            logits_id, cont_pred = model(states, prev_actions, rtgs, timesteps, mask)
            end_time = time.perf_counter()
            latencies.append(max(0.0, float(end_time - start_time)))

            probs = torch.softmax(logits_id, dim=-1)
            top1 = probs.argmax(dim=-1)
            k = min(3, probs.shape[-1])
            topk = probs.topk(k=k, dim=-1).indices

            B, T = target_ids.shape
            for b in range(B):
                for t in range(T):
                    if not mask[b, t]:
                        continue
                    idx = int(idx_tensor[b, t].item())
                    if idx < 0 or idx >= len(run_ids):
                        continue
                    tgt = int(target_ids[b, t].item())
                    p1 = int(top1[b, t].item())
                    topk_set = {int(x.item()) for x in topk[b, t]}
                    ok1 = tgt == p1
                    ok3 = tgt in topk_set
                    total += 1.0
                    if ok1:
                        correct1 += 1.0
                    if ok3:
                        correct3 += 1.0

                    conf = float(probs[b, t, p1].item())
                    ece_confidences.append(conf)
                    ece_correct.append(1.0 if ok1 else 0.0)

                    circle = circle_labels[idx] if circle_labels else "unknown"
                    _update_bucket(per_circle, circle, ok1, ok3)
                    label = id_to_name.get(tgt, f"id_{tgt}")
                    _update_bucket(per_action, label, ok1, ok3)

                    run_id = run_ids[idx]
                    ep = episodes.setdefault(run_id, {"total": 0.0, "correct": 0.0})
                    ep["total"] += 1.0
                    if ok1:
                        ep["correct"] += 1.0

                    if cont_dim and cont_pred.numel() and target_cont.numel():
                        diff = (cont_pred[b, t, :cont_dim] - target_cont[b, t, :cont_dim]).cpu()
                        cont_sum_sq += float((diff ** 2).sum().item())
                        cont_sum_abs += float(diff.abs().sum().item())
                        cont_count += float(cont_dim)
                        for j, name in enumerate(param_names):
                            d = float(diff[j].item())
                            st = per_param.setdefault(
                                name,
                                {"sum_sq": 0.0, "sum_abs": 0.0, "count": 0.0},
                            )
                            st["sum_sq"] += d * d
                            st["sum_abs"] += abs(d)
                            st["count"] += 1.0

    top1_acc = correct1 / total if total else 0.0
    top3_acc = correct3 / total if total else 0.0
    calibration_error = _expected_calibration_error(ece_confidences, ece_correct)
    latency_p50 = _percentile(latencies, 50.0)
    latency_p95 = _percentile(latencies, 95.0)
    latency_p99 = _percentile(latencies, 99.0)

    def _norm_acc(b: Dict[str, float]) -> Dict[str, float]:
        n = b.get("total", 0.0) or 1.0
        return {
            "total": float(b.get("total", 0.0)),
            "top1_accuracy": float(b.get("top1", 0.0) / n),
            "top3_accuracy": float(b.get("top3", 0.0) / n),
        }

    per_circle_out = {k: _norm_acc(v) for k, v in per_circle.items()}
    per_action_out = {k: _norm_acc(v) for k, v in per_action.items()}

    episode_metrics: Dict[str, Dict[str, float]] = {}
    for run_id, st in episodes.items():
        n = st.get("total", 0.0) or 1.0
        episode_metrics[run_id] = {
            "total": float(st.get("total", 0.0)),
            "top1_accuracy": float(st.get("correct", 0.0) / n),
        }
    if episode_metrics:
        sorted_eps = sorted(
            episode_metrics.items(), key=lambda kv: kv[1]["top1_accuracy"]
        )
        worst_ep = {"run_id": sorted_eps[0][0], **sorted_eps[0][1]}
        best_ep = {"run_id": sorted_eps[-1][0], **sorted_eps[-1][1]}
    else:
        best_ep = worst_ep = None

    cont_overall = None
    if cont_count:
        cont_overall = {
            "mse": cont_sum_sq / cont_count,
            "mae": cont_sum_abs / cont_count,
        }
    cont_by_param: Dict[str, Dict[str, float]] = {}
    for name, st in per_param.items():
        n = st.get("count", 0.0) or 1.0
        cont_by_param[name] = {
            "mse": st["sum_sq"] / n,
            "mae": st["sum_abs"] / n,
        }

    return {
        "total_positions": int(total),
        "top1_accuracy": top1_acc,
        "top3_accuracy": top3_acc,
        "calibration_error": calibration_error,
        "latency_p50": latency_p50,
        "latency_p95": latency_p95,
        "latency_p99": latency_p99,
        "per_circle": per_circle_out,
        "per_action": per_action_out,
        "cont_overall": cont_overall,
        "cont_by_param": cont_by_param,
        "episodes": {
            "per_episode": episode_metrics,
            "best_episode": best_ep,
            "worst_episode": worst_ep,
        },
        "checkpoint": str(ckpt_path),
        "run_name": ck_args.get("run_name"),
        "dataset": {
            "npz_path": str(Path(ds_npz)),
            "jsonl_path": str(Path(ds_jsonl)),
        },
    }


def print_summary(results: Dict[str, Any]) -> None:
    print("DT Evaluation Summary")
    print(f"Total positions: {results['total_positions']}")
    print(
        f"Top-1 accuracy: {results['top1_accuracy']:.3f}, "
        f"Top-3 accuracy: {results['top3_accuracy']:.3f}"
    )
    if results.get("cont_overall"):
        co = results["cont_overall"]
        print(f"Continuous params: MSE={co['mse']:.4f}, MAE={co['mae']:.4f}")
    circles = results.get("per_circle") or {}
    if circles:
        print("Per-circle accuracy:")
        for name, st in sorted(circles.items()):
            print(
                f"  {name}: top1={st['top1_accuracy']:.3f}, "
                f"top3={st['top3_accuracy']:.3f} (n={st['total']:.0f})"
            )
    actions = results.get("per_action") or {}
    if actions:
        print("Per-action-type accuracy:")
        for name, st in sorted(actions.items()):
            print(
                f"  {name}: top1={st['top1_accuracy']:.3f}, "
                f"top3={st['top3_accuracy']:.3f} (n={st['total']:.0f})"
            )
    eps = results.get("episodes") or {}
    best = eps.get("best_episode")
    worst = eps.get("worst_episode")
    if best or worst:
        print("Episode-level stats:")
        if best:
            print(
                f"  Best episode {best['run_id']}: "
                f"acc={best['top1_accuracy']:.3f} (n={best['total']:.0f})"
            )
        if worst:
            print(
                f"  Worst episode {worst['run_id']}: "
                f"acc={worst['top1_accuracy']:.3f} (n={worst['total']:.0f})"
            )


def main(argv: List[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        results = evaluate(args)
    except Exception as exc:  # pragma: no cover - CLI safety
        print(f"[evaluate-dt] Error: {exc}", file=sys.stderr)
        return 1

    print_summary(results)
    try:
        if args.output_json is not None:
            args.output_json.parent.mkdir(parents=True, exist_ok=True)
            with args.output_json.open("w", encoding="utf-8") as handle:
                json.dump(results, handle, indent=2, sort_keys=True)
    except Exception as exc:  # pragma: no cover - non-fatal
        print(f"[evaluate-dt] Warning: could not write JSON: {exc}", file=sys.stderr)

    # Append evaluation record to metrics log (best-effort).
    try:
        log_evaluation_metrics(results)
    except Exception as exc:  # pragma: no cover - non-fatal
        print(
            f"[evaluate-dt] Warning: could not append to metrics_log.jsonl: {exc}",
            file=sys.stderr,
        )

    if args.validate_only:
        try:
            thresholds = load_model_thresholds(args.threshold_config)
        except Exception as exc:  # pragma: no cover - config safety
            print(f"[validate-dt-model] Error loading thresholds: {exc}", file=sys.stderr)
            return 1

        passed, criteria = check_model_quality(results, thresholds)
        print("[validate-dt-model] Threshold evaluation:")
        for name, ok, msg in criteria:
            status = "OK" if ok else "FAIL"
            print(f"  [{status}] {name}: {msg}")

        if passed:
            print("[validate-dt-model] All criteria passed.")
            return 0

        print("[validate-dt-model] One or more criteria failed.")
        return 1

    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry
    raise SystemExit(main())
