#!/usr/bin/env python3
"""suggest_team.py

Read the Kanban board and suggest circle roles for NOW items.

Design goals:
- Read-only helper for `af suggest-team`.
- No external dependencies (no PyYAML).
- Best-effort parsing of `.goalie/KANBAN_BOARD.yaml` focused on the NOW lane.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import List, Dict, Any


def load_now_items(board_path: Path) -> List[Dict[str, Any]]:
    if not board_path.exists():
        return []

    lines = board_path.read_text(encoding="utf-8").splitlines()

    in_now = False
    now_block: List[str] = []

    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith("NOW:"):
            in_now = True
            now_block.append(line)
            continue
        if in_now and stripped.startswith("NEXT:"):
            break
        if in_now:
            now_block.append(line)

    items: List[Dict[str, Any]] = []
    current: Dict[str, Any] | None = None
    reading_metrics = False

    for raw in now_block:
        line = raw.strip()
        if line.startswith("- id:"):
            if current is not None:
                items.append(current)
            current = {"id": line.split(":", 1)[1].strip(), "metrics": []}
            reading_metrics = False
        elif current and line.startswith("title:"):
            current["title"] = line.split(":", 1)[1].strip()
        elif current and line.startswith("metrics:"):
            reading_metrics = True
        elif current and reading_metrics and line.startswith("-"):
            metric = line.lstrip("-").strip()
            if metric:
                current["metrics"].append(metric)
        elif reading_metrics and line and not line.startswith("-"):
            reading_metrics = False

    if current is not None:
        items.append(current)

    return items


def metrics_to_roles(metrics: List[str]) -> List[str]:
    mapping = {
        "process": ["Assessor", "Orchestrator", "Analyst"],
        "flow": ["Analyst", "Orchestrator"],
        "learning": ["Innovator", "Intuitive", "Seeker"],
    }
    roles: List[str] = []
    for m in metrics:
        roles.extend(mapping.get(m.lower(), []))
    if not roles:
        roles = ["Analyst", "Assessor", "Orchestrator"]
    # Deduplicate while preserving order
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
    board_path = project_root / ".goalie" / "KANBAN_BOARD.yaml"

    # Depth-aware context from AF
    circle = os.getenv("AF_CIRCLE", "").strip()
    try:
        depth_level = int(os.getenv("AF_DEPTH_LEVEL", "0"))
    except ValueError:
        depth_level = 0

    depth_labels = {0: "core", 1: "analysis", 2: "circle", 3: "devops", 4: "deploy"}
    depth_label = depth_labels.get(depth_level, "core")

    items = load_now_items(board_path)
    if not items:
        sys.stdout.write("No NOW items found on the Kanban board or board missing.\n")
        return 0

    sys.stdout.write(
        f"Suggested circle teams for NOW items (read-only; depth={depth_level} ({depth_label}), circle={circle or '<none>'}):\n\n"
    )

    for item in items:
        item_id = item.get("id", "UNKNOWN")
        title = item.get("title", "(no title)")
        metrics = item.get("metrics", [])
        roles = metrics_to_roles(metrics)

        # Circle perspective can bias ordering
        if circle and circle in roles:
            roles = [circle] + [r for r in roles if r != circle]

        metrics_str = ", ".join(metrics) if metrics else "(none)"
        roles_str = ", ".join(roles)

        # Depth-aware focus tags
        focus_tags: List[str] = []
        if depth_level >= 1:
            focus_tags.append("analysis")
        if depth_level >= 2:
            focus_tags.extend(["review", "retro", "refinement", "replenishment"])
        if depth_level >= 3:
            focus_tags.append("technical-radar")
        if depth_level >= 4:
            focus_tags.append("deploy-readiness")

        # Deduplicate focus tags
        seen = set()
        deduped_focus = []
        for tag in focus_tags:
            if tag not in seen:
                seen.add(tag)
                deduped_focus.append(tag)

        sys.stdout.write(f"{item_id} - {title}\n")
        sys.stdout.write(f"  metrics: {metrics_str}\n")
        if deduped_focus:
            sys.stdout.write(f"  depth_focus: {', '.join(deduped_focus)}\n")
        sys.stdout.write(f"  suggested_roles: {roles_str}\n\n")

    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
