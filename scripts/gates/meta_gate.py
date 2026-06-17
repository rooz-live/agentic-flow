#!/usr/bin/env python3
# meta_gate.py - referenced-script existence gate
# MPP: method=meta_gate | pattern=verifiable_gate | protocol=exit_code
# AISP: Safety (fail closed), Precision (exact path resolution), Transparency (lists offenders)
#
# PURPOSE: A "verifiable gate" is worthless if it points at scripts that do not
# exist. This gate scans CI + pre-commit configs and fails if any referenced
# scripts/*.sh|.py (or code/tooling/scripts/...) is absent on disk.
# Closes ROAM R-2026-020 (config references non-existent scripts).
#
# EXIT: 0 = all referenced scripts exist, 1 = missing references, 2 = usage error

import argparse
import glob
import os
import re
import sys
from typing import Optional

# Matches paths like scripts/one.sh, scripts/hooks/run-commit-gates.sh,
# scripts/gates/scorecard_gate.py, code/tooling/scripts/foo.sh
SCRIPT_RE = re.compile(
    r"(?:\./)?((?:scripts|code/tooling/scripts)/[A-Za-z0-9_./-]+\.(?:sh|py))"
)


def config_paths(root: str = ".", scan_all: bool = False) -> list:
    """Gate-relevant config files. Default: ci.yml + pre-commit. --all: every workflow."""
    paths = []
    if scan_all:
        paths += sorted(glob.glob(os.path.join(root, ".github/workflows/*.yml")))
        paths += sorted(glob.glob(os.path.join(root, ".github/workflows/*.yaml")))
    else:
        ci = os.path.join(root, ".github/workflows/ci.yml")
        if os.path.exists(ci):
            paths.append(ci)
    pc = os.path.join(root, ".pre-commit-config.yaml")
    if os.path.exists(pc):
        paths.append(pc)
    return paths


def referenced_scripts(paths: list) -> dict:
    """Map referenced script path -> set of config files that reference it."""
    refs: dict = {}
    for p in paths:
        try:
            with open(p, "r", encoding="utf-8") as fh:
                text = fh.read()
        except OSError:
            continue
        for match in SCRIPT_RE.findall(text):
            refs.setdefault(match, set()).add(p)
    return refs


def find_missing(root: str = ".", scan_all: bool = False) -> dict:
    """Return {script_path: [config files]} for referenced scripts that don't exist."""
    refs = referenced_scripts(config_paths(root, scan_all))
    missing: dict = {}
    for script, sources in sorted(refs.items()):
        if not os.path.exists(os.path.join(root, script)):
            missing[script] = sorted(sources)
    return missing


def main(argv: Optional[list] = None) -> int:
    parser = argparse.ArgumentParser(description="Referenced-script existence gate")
    parser.add_argument("--root", default=".", help="repo root (default: cwd)")
    parser.add_argument(
        "--all", dest="scan_all", action="store_true",
        help="scan every .github/workflows/* (default: ci.yml + pre-commit only)",
    )
    args = parser.parse_args(argv)

    missing = find_missing(args.root, args.scan_all)
    if missing:
        print("META-GATE FAIL: CI/pre-commit reference scripts that do not exist:")
        for script, sources in missing.items():
            srcs = ", ".join(os.path.relpath(s, args.root) for s in sources)
            print(f"  - {script}  (referenced by: {srcs})")
        return 1
    print("meta-gate OK: all referenced scripts exist")
    return 0


if __name__ == "__main__":
    sys.exit(main())
