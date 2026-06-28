#!/usr/bin/env bash
# Contract: single WSJF owner on tick path; agentic-flow retains shim only.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TICK_OWNER="$ROOT/scripts/cicd/update_lnnnl.py"
AF_SHIM="$ROOT/projects/investing/agentic-flow/scripts/wsjf/wsjf_calculator.py"
AF_REDIRECT="$ROOT/projects/investing/agentic-flow/scripts/wsjf/_canonical_redirect.py"
AF_MARKER="$ROOT/projects/investing/agentic-flow/scripts/wsjf/CANONICAL_OWNER"

test -f "$TICK_OWNER" || { echo "FAIL: missing update_lnnnl.py"; exit 1; }
grep -q 'from src.wsjf.calculator import' "$TICK_OWNER" || {
  echo "FAIL: tick WSJF owner must import src.wsjf.calculator"; exit 1; }

test -f "$AF_MARKER" || { echo "FAIL: missing agentic-flow CANONICAL_OWNER marker"; exit 1; }
grep -q 'src/wsjf/calculator.py' "$AF_MARKER" || {
  echo "FAIL: CANONICAL_OWNER must point at src/wsjf/calculator.py"; exit 1; }

test -f "$AF_REDIRECT" || { echo "FAIL: missing _canonical_redirect.py"; exit 1; }
grep -q 'CANONICAL_WSJF_MODULE' "$AF_REDIRECT" || {
  echo "FAIL: redirect module must declare CANONICAL_WSJF_MODULE"; exit 1; }

test -f "$AF_SHIM" || { echo "FAIL: missing agentic-flow wsjf_calculator shim"; exit 1; }
grep -q 'canonical_wsjf_score' "$AF_SHIM" || {
  echo "FAIL: agentic-flow wsjf_calculator must delegate to canonical_wsjf_score"; exit 1; }

echo "PASS wsjf_canonical_owner"
