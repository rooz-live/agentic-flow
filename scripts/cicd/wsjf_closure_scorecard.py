#!/usr/bin/env python3
"""Emit cls.closure_scorecard.v1 — WSJF %/# inbox metrics (read-only artifacts)."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore

SCHEMA = "cls.closure_scorecard.v1"
STOP_CRITICAL = ("R01", "R04")
OPEN_STATUSES = frozenset({"open", "open_fail"})


def repo_root(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit).resolve()
    env = os.environ.get("REPO_ROOT")
    if env:
        return Path(env).resolve()
    here = Path(__file__).resolve().parent
    return (here / "../..").resolve()


def git_head(root: Path) -> str:
    try:
        return subprocess.check_output(
            ["git", "-C", str(root), "rev-parse", "HEAD"], text=True
        ).strip()
    except subprocess.CalledProcessError:
        return "unknown"


def staged_path_count(root: Path) -> int:
    try:
        out = subprocess.check_output(
            ["git", "-C", str(root), "diff", "--cached", "--name-only"], text=True
        )
        return len([ln for ln in out.splitlines() if ln.strip()])
    except subprocess.CalledProcessError:
        return 0


def untracked_counts(root: Path) -> tuple[int, int]:
    script = root / "scripts/cicd/lib/cls_common.sh"
    if script.is_file():
        try:
            out = subprocess.check_output(
                [
                    "bash",
                    "-c",
                    f'source "{script}" && cls_repo_root && cls_untracked_counts',
                ],
                text=True,
                env={**os.environ, "REPO_ROOT": str(root)},
            )
            parts = out.strip().split()
            if len(parts) >= 2:
                return int(parts[0]), int(parts[1])
        except (subprocess.CalledProcessError, ValueError):
            pass
    return 0, 0


def latest_learning(root: Path, override: Path | None) -> dict:
    if override and override.is_file():
        return json.loads(override.read_text())
    learning_dir = root / ".goalie/evidence/learning"
    if not learning_dir.is_dir():
        return {}
    files = sorted(
        learning_dir.glob("learning_*.json"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not files:
        return {}
    return json.loads(files[0].read_text())


def trust_ok(root: Path, learning: dict, head: str) -> bool:
    if learning.get("trust_artifact_ok") is True:
        art_head = learning.get("head_sha") or learning.get("head")
        if art_head and len(head) >= 12 and not str(art_head).startswith(head[:12]):
            return False
        return True
    lat = root / ".goalie/evidence/last_gate_one_pass.json"
    if not lat.is_file():
        return False
    try:
        doc = json.loads(lat.read_text())
        meta = doc.get("head_sha") or doc.get("git_head")
        return bool(meta and str(meta).startswith(head[:12]))
    except (json.JSONDecodeError, OSError):
        return False


def roam_file(root: Path, override: Path | None) -> Path:
    return override if override else root / ".goalie/ROAM_TRACKER_COG.yaml"


def critical_roam_open(path: Path) -> tuple[bool, list[str]]:
    if not path.is_file() or yaml is None:
        return True, list(STOP_CRITICAL)
    data = yaml.safe_load(path.read_text()) or {}
    open_ids: list[str] = []
    for risk in data.get("risks") or []:
        rid = risk.get("id")
        if rid not in STOP_CRITICAL:
            continue
        status = str(risk.get("status", "")).lower()
        if status in OPEN_STATUSES:
            open_ids.append(rid)
        elif status not in ("mitigated", "accepted", ""):
            open_ids.append(rid)
    return len(open_ids) > 0, open_ids


def substrate_indexed_this_slice(root: Path, staged: int) -> int:
    manifest = root / ".goalie/evidence/learning/index_substrate_manifest.json"
    if manifest.is_file():
        try:
            doc = json.loads(manifest.read_text())
            paths = doc.get("paths") or doc.get("indexed_paths") or []
            if paths:
                return len(paths)
            return int(doc.get("count") or doc.get("staged_count") or 0)
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
    return staged


def build_scorecard(
    root: Path,
    *,
    loop_item: str | None = None,
    learning_path: Path | None = None,
    roam_override: Path | None = None,
    max_index_paths: int = 25,
) -> dict:
    head = git_head(root)
    learning = latest_learning(root, learning_path)
    perceive_ec = learning.get("perceive_ec")
    cls_ec = learning.get("cls_ec")
    uc, st = untracked_counts(root)
    if "untracked_critical" in learning:
        uc = int(learning["untracked_critical"])
    if "untracked_substrate_total" in learning:
        st = int(learning["untracked_substrate_total"])

    staged = staged_path_count(root)
    indexed = substrate_indexed_this_slice(root, staged)
    trust = trust_ok(root, learning, head)
    roam_open, open_ids = critical_roam_open(roam_file(root, roam_override))

    if perceive_ec == 0 and uc == 0:
        billing = 100
    elif perceive_ec == 0:
        billing = max(0, 100 - uc * 10)
    else:
        billing = 0

    trust_pct = 100 if trust else 0
    if cls_ec == 0 and perceive_ec == 0:
        autopilot = 100
    elif perceive_ec == 0 or cls_ec == 0:
        autopilot = 50
    else:
        autopilot = 0

    edge = 0 if roam_open else 100
    substrate_pct = min(100, int(indexed / max(max_index_paths, 1) * 100))
    closure = {
        "billing_perceive": billing,
        "trust_spine": trust_pct,
        "autopilot_dag": autopilot,
        "edge_cog_roam": edge,
        "substrate_wsjf": substrate_pct,
    }
    overall = int(round(sum(closure.values()) / len(closure)))
    slices_remaining = (st + max_index_paths - 1) // max_index_paths if st else 0
    honest_gap = (
        f"{','.join(open_ids)} open — CLS green ≠ release"
        if roam_open
        else "R01/R04 mitigated or accepted — edge lane FA-verified only"
    )

    return {
        "schema": SCHEMA,
        "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "head_sha": head,
        "loop_item": loop_item or os.environ.get("LOOP_ITEM", "P1-INDEX-02"),
        "inbox": {
            "staged_paths_hash": staged,
            "substrate_advisory_hash": st,
            "substrate_slices_remaining_hash": slices_remaining,
            "untracked_critical_hash": uc,
        },
        "closure_pct": closure,
        "fa_free_overall_pct": overall,
        "honest_gap": honest_gap,
        "roam_critical_open": roam_open,
        "roam_open_ids": open_ids,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="WSJF closure scorecard")
    parser.add_argument("--root", default=None)
    parser.add_argument("--learning", default=None)
    parser.add_argument("--roam", default=None)
    parser.add_argument("--loop-item", default=None)
    parser.add_argument("--stdout", action="store_true")
    args = parser.parse_args()

    root = repo_root(args.root)
    out_dir = root / ".goalie/evidence/learning"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"closure_scorecard_{time.strftime('%Y%m%dT%H%M%SZ')}.json"
    latest = out_dir / "closure_scorecard_latest.json"

    doc = build_scorecard(
        root,
        loop_item=args.loop_item,
        learning_path=Path(args.learning) if args.learning else None,
        roam_override=Path(args.roam) if args.roam else None,
    )
    payload = json.dumps(doc, indent=2) + "\n"
    out_file.write_text(payload)
    latest.write_text(
        json.dumps(
            {
                "path": str(out_file),
                "head_sha": doc["head_sha"],
                "fa_free_overall_pct": doc["fa_free_overall_pct"],
            },
            indent=2,
        )
        + "\n"
    )
    print(f"closure_scorecard={out_file}")
    if args.stdout:
        print(payload, end="")
    return 0


if __name__ == "__main__":
    sys.exit(main())
