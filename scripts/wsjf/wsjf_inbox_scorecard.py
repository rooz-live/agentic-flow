#!/usr/bin/env python3
"""Emit cls.wsjf_inbox.v1 scorecard: # staged paths, % FA-free closure per lane."""
from __future__ import annotations
import json, os, time
from pathlib import Path

def _pct(num, den):
    if den <= 0:
        return 100.0 if num == 0 else 0.0
    return round(float(num) * 100.0 / float(den), 1)

def _load_json(path: Path):
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text())
    except Exception:
        return {}

def _substrate_lane(root: Path):
    cap = 25
    manifest = _load_json(root / ".goalie/evidence/learning/index_substrate_manifest.json")
    staged = manifest.get("staged") or manifest.get("paths") or []
    n = len(staged) if isinstance(staged, list) else 0
    would = manifest.get("would_stage", n)
    count = int(would if would is not None else n)
    return {"paths_staged": count, "paths_cap": cap, "pct_of_cap": _pct(min(count, cap), cap)}

def _stabilization_lane(root: Path):
    data = _load_json(root / ".goalie/evidence/mail/stabilization_latest.json")
    if not data:
        return {"checks_pass": 0, "checks_total": 4, "pct": 0.0, "status": "missing"}
    passed = int(data.get("checks_pass", 0))
    total = int(data.get("checks_total", 4))
    return {"checks_pass": passed, "checks_total": total, "pct": _pct(passed, total), "status": data.get("status", "unknown")}

def _trust_lane(root: Path):
    ok = (root / ".goalie/evidence/last_gate_one_pass.json").is_file()
    cache = _load_json(root / ".goalie/trust_cache.json")
    if cache.get("status") == "ALL GREEN":
        ok = True
    return {"pct": 100.0 if ok else 0.0, "trust_ok": ok}

def _autopilot_lane(root: Path):
    pe, ce = os.environ.get("PERCEIVE_EC", ""), os.environ.get("CLS_EC", "")
    perceive_ec = int(pe) if pe.isdigit() else None
    cls_ec = int(ce) if ce.isdigit() else None
    ok = perceive_ec == 0 and cls_ec == 0
    if perceive_ec is None:
        learnings = sorted((root / ".goalie/evidence/learning").glob("learning_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
        if learnings:
            ld = _load_json(learnings[0])
            perceive_ec, cls_ec = ld.get("perceive_ec"), ld.get("cls_ec")
            ok = perceive_ec == 0 and cls_ec == 0
    return {"perceive_ec": perceive_ec, "cls_ec": cls_ec, "pct": 100.0 if ok else 0.0}

def _billing_lane(root: Path):
    ps = _load_json(root / ".goalie/evidence/learning/perceive_state.json")
    checks, passed = 4, 0
    if ps.get("untracked_critical", 1) == 0: passed += 1
    if ps.get("trust_artifact_ok") is True: passed += 1
    if ps.get("public_edge_perceive_ok") is True: passed += 1
    if ps.get("tracked_index_count", 0) > 0: passed += 1
    return {"checks_pass": passed, "checks_total": checks, "pct": _pct(passed, checks)}

def build_scorecard(root=None):
    root = root or Path(__file__).resolve().parents[2]
    lanes = {"billing_perceive": _billing_lane(root), "trust": _trust_lane(root), "autopilot_dag": _autopilot_lane(root), "substrate_index": _substrate_lane(root), "mail_stabilization": _stabilization_lane(root)}
    pcts = [lanes["billing_perceive"]["pct"], lanes["trust"]["pct"], lanes["autopilot_dag"]["pct"]]
    composite = round(sum(pcts) / len(pcts), 1) if pcts else 0.0
    open_critical = []
    try:
        import yaml
        for r in yaml.safe_load((root / ".goalie/ROAM_TRACKER_COG.yaml").read_text()).get("risks", []):
            if r.get("id") in ("R01", "R04") and r.get("status") not in ("mitigated", "closed"):
                open_critical.append(r.get("id"))
    except Exception:
        open_critical = ["R01", "R04"]
    head = os.popen(f"git -C {root} rev-parse HEAD 2>/dev/null").read().strip() or "unknown"
    return {"schema": "cls.wsjf_inbox.v1", "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "head_sha": head, "lanes": lanes, "fa_free_closure_composite_pct": composite, "inbox_zero_target": {"stabilization_pct": lanes["mail_stabilization"]["pct"], "open_roam_critical": open_critical}}

def write_scorecard(root=None):
    root = root or Path(__file__).resolve().parents[2]
    out_dir = root / ".goalie/evidence/learning"
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = build_scorecard(root)
    out = out_dir / f"wsjf_inbox_{time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())}.json"
    out.write_text(json.dumps(doc, indent=2) + "\n")
    (out_dir / "wsjf_inbox_latest.json").write_text(json.dumps({"path": str(out), **doc}, indent=2) + "\n")
    return out

if __name__ == "__main__":
    p = write_scorecard()
    d = json.loads(p.read_text())
    print(f"wsjf_inbox_scorecard={p}")
    print(f"composite_pct={d['fa_free_closure_composite_pct']}")
