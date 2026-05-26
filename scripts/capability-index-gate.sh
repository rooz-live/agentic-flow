#!/usr/bin/env bash
# Reject staged new primitives under src/ without test or contract home in index.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
python3 - <<'PY'
import subprocess, sys, os
indexed_tests = set(subprocess.check_output(["git", "ls-files", "tests/"], text=True).splitlines())
staged = subprocess.check_output(["git", "diff", "--cached", "--name-only", "--diff-filter=A"], text=True).splitlines()
bad = []
for path in staged:
    if not path.startswith("src/") or not path.endswith(".py"):
        continue
    base = os.path.splitext(os.path.basename(path))[0]
    module_dir = os.path.dirname(path).replace("src/", "tests/", 1)
    candidates = {
        f"tests/{base}_test.py", f"tests/test_{base}.py",
        f"{module_dir}/test_{base}.py", f"tests/billing/test_{base}.py",
    }
    has_test = bool(candidates & indexed_tests) or any(base in t for t in indexed_tests)
    if not has_test:
        bad.append(path)
if bad:
    print("Capability index gate: new src/ without indexed test home:")
    for p in bad:
        print(f"  {p}")
    sys.exit(1)
print("Capability index gate: pass")
PY
