#!/usr/bin/env python3
"""Render pin literals from config/versions/portfolio.yaml — SA/human [FA] only."""
from __future__ import annotations
import os
import sys
from pathlib import Path

def main() -> int:
    if os.environ.get("VERSION_PIN_APPLY", "0") != "1":
        print("error: VERSION_PIN_APPLY=1 required (SA + cycle pass or human [FA])", file=sys.stderr)
        return 2
    root = Path(__file__).resolve().parents[2]
    probe = root / "scripts/cicd/version_portfolio_probe.py"
    if not probe.is_file():
        print("error: version_portfolio_probe.py missing", file=sys.stderr)
        return 2
    # Phase-1: evidence-only gate; full template render tracked in P1-VERSION-PORTFOLIO-01
    import subprocess
    subprocess.run([sys.executable, str(probe)], check=False)
    print("render_version_pins: probe refreshed; template render not yet automated — manual pin bump + render in P1-VERSION-PORTFOLIO-01 slice 5")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
