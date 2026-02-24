#!/usr/bin/env python3

import argparse
import csv
import json
import math
import os
import time
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple


KEY_FIELDS = ["phase", "profile", "concurrency"]

# A conservative set of fields we know are emitted by prod_cycle_swarm_runner.py's TSV.
DEFAULT_METRICS = [
    "health_ckpt",
    "abort",
    "sys_state_err",
    "autofix_adv",
    "autofix_applied",
    "duration_h",
    "total_actions",
    "actions_per_h",
    "alloc_rev",
    "rev_per_h",
    "rev_per_action",
    "allocation_efficiency_pct",
    "energy_cost_usd",
    "wsjf_per_h",
    "value_per_energy",
    "profit_dividend",
    "event_count",
    "miss",
    "inv",
    "sentinel",
    "zero",
    "duration_ok_pct",
    "dur_mult",
    "eff_mult",
    "tier_backlog_cov_pct",
    "tier_telemetry_cov_pct",
    "tier_depth_cov_pct",
    "intent_cov_pct",
    "stability_score",
]


def _project_root() -> str:
    return os.environ.get("PROJECT_ROOT") or os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _resolve_path(p: str, project_root: str) -> str:
    s = (p or "").strip()
    if not s:
        return ""
    return s if os.path.isabs(s) else os.path.join(project_root, s)


def _safe_float(v: Any) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.strip()
        if not s:
            return None
        try:
            return float(s)
        except Exception:
            return None
    return None


def _mean(vals: List[float]) -> float:
    if not vals:
        return 0.0
    return sum(vals) / float(len(vals))


def _stdev(vals: List[float]) -> float:
    # sample stdev
    n = len(vals)
    if n <= 1:
        return 0.0
    m = _mean(vals)
    var = sum((x - m) ** 2 for x in vals) / float(n - 1)
    return math.sqrt(var)


@dataclass
class GroupStats:
    n: int
    ok_rate: float
    metrics: Dict[str, Dict[str, float]]  # metric -> {mean, stdev}


def _read_tsv(path: str) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for r in reader:
            if not r:
                continue
            rows.append(r)
    return rows


def _group_stats(rows: List[Dict[str, Any]], metrics: List[str]) -> Dict[Tuple[str, str, str], GroupStats]:
    buckets: Dict[Tuple[str, str, str], List[Dict[str, Any]]] = {}
    for r in rows:
        key = tuple((r.get(k) or "").strip() for k in KEY_FIELDS)
        if len(key) != 3:
            continue
        buckets.setdefault(key, []).append(r)

    out: Dict[Tuple[str, str, str], GroupStats] = {}
    for key, grp in buckets.items():
        oks: List[int] = []
        for r in grp:
            try:
                oks.append(int((r.get("ok") or "0").strip() or "0"))
            except Exception:
                oks.append(0)

        ok_rate = float(sum(oks)) / float(len(oks) or 1)

        mstats: Dict[str, Dict[str, float]] = {}
        for m in metrics:
            vals: List[float] = []
            for r in grp:
                fv = _safe_float(r.get(m))
                if fv is None:
                    continue
                vals.append(float(fv))
            mstats[m] = {
                "mean": _mean(vals),
                "stdev": _stdev(vals),
            }

        out[key] = GroupStats(n=len(grp), ok_rate=ok_rate, metrics=mstats)

    return out


def _delta(a: Optional[float], b: Optional[float]) -> Optional[float]:
    if a is None or b is None:
        return None
    return a - b


def _get_mean(gs: Optional[GroupStats], metric: str) -> Optional[float]:
    if gs is None:
        return None
    return float((gs.metrics.get(metric) or {}).get("mean", 0.0))


def _as_json(
    *,
    prior: Dict[Tuple[str, str, str], GroupStats],
    current: Dict[Tuple[str, str, str], GroupStats],
    auto_ref: Dict[Tuple[str, str, str], GroupStats],
    metrics: List[str],
    meta: Dict[str, Any],
) -> Dict[str, Any]:
    keys = sorted(set(prior.keys()) | set(current.keys()) | set(auto_ref.keys()))

    groups: Dict[str, Any] = {}
    for k in keys:
        kp = "|".join(k)
        p = prior.get(k)
        c = current.get(k)
        a = auto_ref.get(k)

        group_doc: Dict[str, Any] = {
            "key": {"phase": k[0], "profile": k[1], "concurrency": k[2]},
            "prior": None,
            "current": None,
            "auto_ref": None,
            "deltas": {"current_minus_prior": {}, "auto_minus_current": {}, "auto_minus_prior": {}},
        }

        def pack(gs: GroupStats) -> Dict[str, Any]:
            return {
                "n": gs.n,
                "ok_rate": gs.ok_rate,
                "metrics": gs.metrics,
            }

        if p is not None:
            group_doc["prior"] = pack(p)
        if c is not None:
            group_doc["current"] = pack(c)
        if a is not None:
            group_doc["auto_ref"] = pack(a)

        for m in metrics:
            pm = _get_mean(p, m)
            cm = _get_mean(c, m)
            am = _get_mean(a, m)
            group_doc["deltas"]["current_minus_prior"][m] = _delta(cm, pm)
            group_doc["deltas"]["auto_minus_current"][m] = _delta(am, cm)
            group_doc["deltas"]["auto_minus_prior"][m] = _delta(am, pm)

        groups[kp] = group_doc

    return {"meta": meta, "groups": groups}


def _fmt(v: Optional[float]) -> str:
    if v is None:
        return ""
    try:
        return f"{float(v):.6g}"
    except Exception:
        return ""


def _emit_tsv(
    *,
    prior: Dict[Tuple[str, str, str], GroupStats],
    current: Dict[Tuple[str, str, str], GroupStats],
    auto_ref: Dict[Tuple[str, str, str], GroupStats],
    metrics: List[str],
) -> str:
    keys = sorted(set(prior.keys()) | set(current.keys()) | set(auto_ref.keys()))

    # Keep TSV width reasonable: output mean for all metrics, and also ok_rate + n.
    header = KEY_FIELDS + [
        "prior_n",
        "prior_ok_rate",
        "current_n",
        "current_ok_rate",
        "auto_ref_n",
        "auto_ref_ok_rate",
    ]

    for m in metrics:
        header += [
            f"prior_{m}_mean",
            f"current_{m}_mean",
            f"auto_ref_{m}_mean",
            f"delta_current_prior_{m}",
            f"delta_auto_current_{m}",
            f"delta_auto_prior_{m}",
        ]

    lines: List[str] = ["\t".join(header)]

    for k in keys:
        p = prior.get(k)
        c = current.get(k)
        a = auto_ref.get(k)

        row = [k[0], k[1], k[2]]
        row += [
            str(p.n) if p is not None else "0",
            _fmt(p.ok_rate) if p is not None else "",
            str(c.n) if c is not None else "0",
            _fmt(c.ok_rate) if c is not None else "",
            str(a.n) if a is not None else "0",
            _fmt(a.ok_rate) if a is not None else "",
        ]

        for m in metrics:
            pm = _get_mean(p, m)
            cm = _get_mean(c, m)
            am = _get_mean(a, m)
            row += [
                _fmt(pm),
                _fmt(cm),
                _fmt(am),
                _fmt(_delta(cm, pm)),
                _fmt(_delta(am, cm)),
                _fmt(_delta(am, pm)),
            ]

        lines.append("\t".join(row))

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare three prod-swarm TSV tables (prior/current/auto-ref) with group mean/stdev + deltas")
    parser.add_argument("--prior", required=True)
    parser.add_argument("--current", required=True)
    parser.add_argument("--auto-ref", required=True, dest="auto_ref")
    parser.add_argument("--out", default="json", choices=["json", "tsv"])
    parser.add_argument("--save", default="")
    args = parser.parse_args()

    project_root = _project_root()
    prior_path = _resolve_path(args.prior, project_root)
    current_path = _resolve_path(args.current, project_root)
    auto_path = _resolve_path(args.auto_ref, project_root)

    for p in [prior_path, current_path, auto_path]:
        if not p or not os.path.exists(p):
            raise SystemExit(f"missing input: {p!r}")

    metrics = list(DEFAULT_METRICS)

    prior_rows = _read_tsv(prior_path)
    current_rows = _read_tsv(current_path)
    auto_rows = _read_tsv(auto_path)

    prior_stats = _group_stats(prior_rows, metrics)
    current_stats = _group_stats(current_rows, metrics)
    auto_stats = _group_stats(auto_rows, metrics)

    meta = {
        "prior": prior_path,
        "current": current_path,
        "auto_ref": auto_path,
        "generated_ts": int(time.time()),
    }

    out_text: str
    if args.out == "tsv":
        out_text = _emit_tsv(prior=prior_stats, current=current_stats, auto_ref=auto_stats, metrics=metrics)
    else:
        doc = _as_json(prior=prior_stats, current=current_stats, auto_ref=auto_stats, metrics=metrics, meta=meta)
        out_text = json.dumps(doc, indent=2, sort_keys=True) + "\n"

    save_path = _resolve_path(str(args.save), project_root) if str(args.save).strip() else ""
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        with open(save_path, "w", encoding="utf-8") as f:
            f.write(out_text)

    print(out_text, end="")
    if save_path:
        print(f"SWARM_COMPARE_SAVED path={save_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
