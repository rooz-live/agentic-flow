#!/usr/bin/env python3
"""Apply DLQ failure category -> ROAM tracker updates from config/cicd/dlq_roam_mapping.yaml."""
from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    import yaml  # type: ignore
except ImportError:
    yaml = None


def load_mapping(root: Path) -> dict:
    path = root / "config/cicd/dlq_roam_mapping.yaml"
    if not path.is_file() or yaml is None:
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return data.get("failure_to_roam") or {}


def apply_roam(roam_file: Path, category: str, run_id: str, mapping: dict) -> bool:
    target_id = mapping.get(category)
    if not target_id or not roam_file.is_file():
        return False

    lines = roam_file.read_text(encoding="utf-8").splitlines()
    new_lines = []
    in_target = False
    for line in lines:
        if line.strip().startswith("- id:") and target_id in line:
            in_target = True
        elif in_target and line.strip().startswith("- id:"):
            in_target = False

        if in_target:
            if line.strip().startswith("status:"):
                line = re.sub(r"status:\s*\S+", "status: open", line)
            elif line.strip().startswith("last_result:"):
                line = f'    last_result: "dlq_trigger_{category}_run_{run_id}"'
        new_lines.append(line)

    roam_file.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    print(f"Triggered DLQ mapping: {category} -> {target_id} re-opened")
    return True


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: dlq_roam_apply.py <failure_category> <run_id> [repo_root]", file=sys.stderr)
        return 2
    category, run_id = sys.argv[1], sys.argv[2]
    root = Path(sys.argv[3] if len(sys.argv) > 3 else ".").resolve()
    apply_roam(root / ".goalie/ROAM_TRACKER_COG.yaml", category, run_id, load_mapping(root))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
