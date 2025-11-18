#!/usr/bin/env python3
"""suggest_actions.py

Read recent retro insights and suggest candidate actions.

Design goals:
- Read-only helper for `af suggest-actions`.
- No external dependencies.
- Use `.goalie/insights_log.jsonl` as source of retro_insight entries.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import List, Dict, Any
import sys


def load_recent_insights(path: Path, limit: int = 20) -> List[Dict[str, Any]]:
    if not path.exists():
        return []

    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines:
        return []

    recent = lines[-limit:]
    results: List[Dict[str, Any]] = []
    for raw in recent:
        raw = raw.strip()
        if not raw:
            continue
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if obj.get("type") == "retro_insight":
            results.append(obj)
    return results


def infer_roles(text: str) -> List[str]:
    t = text.lower()
    roles: List[str] = ["Analyst", "Assessor", "Orchestrator"]
    if any(k in t for k in ["docs", "document", "pattern", "design"]):
        roles.extend(["Innovator", "Intuitive"])
    if any(k in t for k in ["risk", "incident", "outage", "security"]):
        roles.append("Seeker")

    seen = set()
    deduped: List[str] = []
    for r in roles:
        if r not in seen:
            seen.add(r)
            deduped.append(r)
    return deduped


def main() -> int:
    script_path = Path(__file__).resolve()
    project_root = script_path.parents[2]
    insights_path = project_root / ".goalie" / "insights_log.jsonl"

    insights = load_recent_insights(insights_path)
    if not insights:
        sys.stdout.write("No recent retro insights found.\n")
        return 0

    sys.stdout.write("Suggested actions from recent retro insights (read-only):\n\n")
    for obj in insights:
        ts = obj.get("timestamp", "(no timestamp)")
        text = obj.get("text", "(no text)")
        roles = infer_roles(text)
        roles_str = ", ".join(roles)
        suggested_title = text.strip()
        if len(suggested_title) > 80:
            suggested_title = suggested_title[:77] + "..."

        sys.stdout.write(f"[{ts}] {text}\n")
        sys.stdout.write(f"  suggested_action: {suggested_title}\n")
        sys.stdout.write(f"  suggested_roles: {roles_str}\n\n")

    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

