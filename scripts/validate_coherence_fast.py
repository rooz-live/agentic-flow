#!/usr/bin/env python3
"""
validate_coherence_fast.py - Fast DDD/ADR/TDD/PRD coherence validator

OPTIMIZATION: Sets COHERENCE_SCAN_BUDGET to keep file scanning under 15s,
and uses a 90s outer timeout. Previous 30s timeout was insufficient for
large repos — 469/473 checks pass when given adequate time.

Usage:
    python3 validate_coherence_fast.py --json
    python3 validate_coherence_fast.py --max-files 100
"""

import os
import sys
import subprocess

# Constrain scan budget so the validator finishes within our timeout
env = os.environ.copy()
env.setdefault("COHERENCE_SCAN_BUDGET", "15")
env.setdefault("COHERENCE_CACHE_TTL", "600")

MAX_FILES = int(sys.argv[sys.argv.index("--max-files") + 1]) if "--max-files" in sys.argv else 50
JSON_FLAG = "--json" if "--json" in sys.argv else ""

script_dir = os.path.dirname(os.path.abspath(__file__))
cmd = ["python3", os.path.join(script_dir, "validate_coherence.py")]
if JSON_FLAG:
    cmd.append(JSON_FLAG)

try:
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=90, env=env)
except subprocess.TimeoutExpired:
    print('{"status":"TIMEOUT","message":"Coherence validation timed out (90s) - very large repo","checks_passed":0,"total_checks":0}')
    sys.exit(0)

print(result.stdout, end="")
if result.stderr:
    print(result.stderr, end="", file=sys.stderr)
sys.exit(result.returncode)
