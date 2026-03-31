#!/usr/bin/env python3
"""code_guardrails.py

Lightweight guardrail helper for af full-cycle code-level autocommit.

Design goals:
- No external dependencies (no PyYAML).
- Read simple key:value config from .goalie/autocommit_policy.yaml.
- Filter a list of changed files (received on stdin) down to the
  subset that is eligible for auto-commit.
- Never write or commit anything itself; it only decides which paths
  are safe. Git operations remain in scripts/af.

Usage (from scripts/af):

    git status --porcelain | awk '{print $2}' \
      | python3 scripts/agentic/code_guardrails.py --filter-code

Exit code is 0 on success. If policy disables code-level autocommit,
this script prints nothing and exits 0 so callers can treat that as
"no eligible files" rather than an error.
"""

from __future__ import annotations

import sys
import os
from pathlib import Path
from typing import Dict, List


def load_flat_policy(path: Path) -> Dict[str, str]:
    """Load a very simple key:value YAML-like file.

    We intentionally avoid full YAML parsing. The expected format is
    a flat mapping of `key: value` pairs, where list-like values are
    represented as comma-separated strings.
    """

    data: Dict[str, str] = {}
    if not path.exists():
        return data

    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip()
    return data


def parse_prefixes(value: str | None) -> List[str]:
    if not value:
        return []
    return [p.strip() for p in value.split(",") if p.strip()]


def filter_code_files(files: List[str], project_root: Path) -> List[str]:
    """Filter changed files according to autocommit_policy.yaml.

    - Only active when:
        mode == "safe_code" and allow_code_autocommit == true
      Otherwise, returns an empty list.
    - Metrics/Goalie/AgentDB/logs paths are excluded (they are handled
      by metrics-only autocommit via cmd_commit in scripts/af).
    - Only files under allowed_code_prefixes are considered, and any
      file under blocked_code_prefixes is excluded.
    """

    policy_path = project_root / ".goalie" / "autocommit_policy.yaml"
    policy = load_flat_policy(policy_path)

    mode = policy.get("mode", "metrics_only").lower()
    policy_allow_code = policy.get("allow_code_autocommit", "false").lower() == "true"

    # Check environment variables
    env_allow_code = os.environ.get("AF_ALLOW_CODE_AUTOCOMMIT", "0") == "1"
    env_full_cycle = os.environ.get("AF_FULL_CYCLE_AUTOCOMMIT", "0") == "1"

    # Require both policy AND environment variable to enable code autocommit
    if mode != "safe_code" or not policy_allow_code:
        return []

    if not (env_allow_code and env_full_cycle):
        return []

    allowed_prefixes = parse_prefixes(policy.get("allowed_code_prefixes"))
    blocked_prefixes = parse_prefixes(policy.get("blocked_code_prefixes"))

    def is_metrics_path(rel: str) -> bool:
        return (
            rel.startswith(".goalie/")
            or rel.startswith(".agentdb/")
            or rel.startswith("logs/")
            or rel.startswith("metrics/")
        )

    safe: List[str] = []
    for rel in files:
        if not rel:
            continue
        # Normalize to forward slashes relative to project root.
        rel = rel.replace("\\", "/")

        # Skip metrics/Goalie/AgentDB/logs; handled elsewhere.
        if is_metrics_path(rel):
            continue

        # Blocked prefixes override everything.
        if blocked_prefixes and any(rel.startswith(b) for b in blocked_prefixes):
            continue

        # If allowed_prefixes is non-empty, require a match.
        if allowed_prefixes and not any(rel.startswith(p) for p in allowed_prefixes):
            continue

        safe.append(rel)

    return safe


def main(argv: list[str]) -> int:
    script_path = Path(__file__).resolve()
    project_root = script_path.parents[2]

    if "--filter-code" in argv:
        # Read file paths from stdin, one per line.
        files = [line.strip() for line in sys.stdin if line.strip()]
        safe = filter_code_files(files, project_root)
        for path in safe:
            print(path)
        return 0

    # Non-filter usage: just report current policy mode to stderr.
    policy_path = project_root / ".goalie" / "autocommit_policy.yaml"
    policy = load_flat_policy(policy_path)
    mode = policy.get("mode", "metrics_only")
    allow_code = policy.get("allow_code_autocommit", "false")
    sys.stderr.write(
        f"code_guardrails.py: mode={mode}, allow_code_autocommit={allow_code}\n"
    )
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main(sys.argv[1:]))

