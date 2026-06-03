#!/usr/bin/env python3
"""
Validate unified heartbeat lines in logs/heartbeats.log.
Accepts both legacy key=value tail and JSON metrics tail.
"""
from __future__ import annotations

import json
import os
import re
import sys
from typing import List

ALLOWED_STATUS = {"OK", "ERROR", "START", "TRIGGERED", "PROMOTE", "CONDITIONAL", "BLOCK"}


def validate_line(line: str, idx: int) -> List[str]:
    errors: List[str] = []
    parts = line.rstrip("\n").split("|")
    if len(parts) < 7:
        errors.append(f"line {idx}: expected >=7 fields, got {len(parts)}")
        return errors

    ts, component, phase, status, elapsed, corr, tail = parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], "|".join(parts[6:])

    # Basic checks
    if not re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$", ts):
        errors.append(f"line {idx}: invalid timestamp: {ts}")

    if status not in ALLOWED_STATUS:
        errors.append(f"line {idx}: status '{status}' not in {sorted(ALLOWED_STATUS)}")

    if not corr:
        errors.append(f"line {idx}: missing correlation id")

    # Tail: JSON or key=value pairs
    tail_ok = False
    tail_str = tail.strip()
    if tail_str.startswith("{"):
        try:
            json.loads(tail_str)
            tail_ok = True
        except Exception as e:
            errors.append(f"line {idx}: invalid JSON metrics: {e}")
    elif tail_str == "" or re.match(r"^[^=,]+=[^=,]+(,[^=,]+=[^=,]+)*$", tail_str):
        tail_ok = True
    else:
        errors.append(f"line {idx}: invalid metrics tail format")

    return errors


def main() -> int:
    repo_root = os.getcwd()
    candidates = [
        os.path.join(repo_root, "logs", "heartbeats.log"),
        os.path.join(repo_root, "legacy engineering", "DevOps", "logs", "heartbeats.log"),
    ]
    path = next((p for p in candidates if os.path.exists(p)), None)
    if not path:
        print("No heartbeats.log found; skipping validation.")
        return 0

    errors: List[str] = []
    with open(path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, start=1):
            if not line.strip():
                continue
            errors.extend(validate_line(line, i))

    if errors:
        print("Heartbeat validation failed:")
        for e in errors[:100]:
            print(" -", e)
        print(f"Total errors: {len(errors)}")
        return 1

    print("Heartbeat validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
