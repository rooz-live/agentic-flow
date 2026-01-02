#!/usr/bin/env python3

import argparse
import json
import os
from pathlib import Path
from typing import Any, List, Optional


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
if "PROJECT_ROOT" in os.environ:
    PROJECT_ROOT = Path(os.environ["PROJECT_ROOT"]).resolve()


def _read_tail_lines(path: Path, tail: int) -> List[str]:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except FileNotFoundError:
        return []
    except Exception:
        return []

    if tail <= 0:
        return lines
    return lines[-tail:]


def _load_jsonl_tail(path: Path, tail: int) -> List[Any]:
    items: List[Any] = []
    for line in _read_tail_lines(path, tail):
        s = line.strip()
        if not s:
            continue
        try:
            items.append(json.loads(s))
        except Exception:
            continue
    return items


def main() -> int:
    ap = argparse.ArgumentParser(description="Read-only helper to view .goalie artifacts")
    ap.add_argument("--path", required=True, help="Relative path under PROJECT_ROOT (e.g. .goalie/metrics_log.jsonl)")
    ap.add_argument("--tail", type=int, default=200)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    rel = str(args.path).lstrip("/")
    abs_path = (PROJECT_ROOT / rel).resolve()

    # Guard: prevent reading outside project root
    try:
        abs_path.relative_to(PROJECT_ROOT)
    except Exception:
        print(json.dumps({"error": "path_outside_project_root", "path": str(abs_path)}))
        return 2

    if not abs_path.exists():
        if args.json:
            print(json.dumps({"path": str(rel), "exists": False, "items": []}, indent=2))
        return 0

    if args.json and abs_path.name.endswith(".jsonl"):
        items = _load_jsonl_tail(abs_path, int(args.tail))
        print(json.dumps({"path": str(rel), "exists": True, "items": items}, indent=2))
        return 0

    for line in _read_tail_lines(abs_path, int(args.tail)):
        print(line.rstrip("\n"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
