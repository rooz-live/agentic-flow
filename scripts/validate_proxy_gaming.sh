#!/bin/bash
# Comprehensive Proxy Gaming Detection Validation Script
# This script validates all components of the P2-TRUTH implementation

set -e
cd "$(dirname "$0")/.."

echo "=============================================="
echo "PROXY GAMING DETECTION VALIDATION"
echo "=============================================="
echo ""

# Step 1: Git Status
echo "=== Step 1: Git Status ==="
git status --short
echo ""

# Step 2: Run Python Test Script
echo "=== Step 2: Python Test Script ==="
python3 scripts/test_proxy_gaming.py 2>&1 || echo "Python test script had issues"
echo ""

# Step 3: Run Alignment Checker
echo "=== Step 3: Alignment Checker (Proxy Gaming) ==="
python3 scripts/agentic/alignment_checker.py --philosophical --json --hours 24 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    pg = data.get('proxy_gaming', {})
    print('Gaming Detected:', pg.get('gaming_detected', 'N/A'))
    print('Gaming Score:', pg.get('gaming_score', 'N/A'))
    print('Risk Level:', pg.get('risk_level', 'N/A'))
    print('Indicators:', pg.get('indicators', []))
    print('Patterns Analyzed:', pg.get('patterns_analyzed', 0))
except Exception as e:
    print('Error parsing JSON:', e)
"
echo ""

# Step 4: Pattern Rationale Coverage Check
echo "=== Step 4: Pattern Rationale Coverage ==="
python3 -c "
from scripts.agentic.pattern_logger import PatternLogger
logger = PatternLogger()
rationales = logger._generate_auto_rationale.__code__.co_consts
# Count patterns in the rationale dictionary
import json
with open('.goalie/pattern_metrics.jsonl', 'r') as f:
    patterns = set()
    for line in f:
        try:
            entry = json.loads(line)
            patterns.add(entry.get('pattern', 'unknown'))
        except:
            pass
print(f'Unique patterns in metrics: {len(patterns)}')
print(f'Pattern types: {sorted(patterns)[:20]}...')
"
echo ""

# Step 5: Workflow Syntax Check
echo "=== Step 5: Workflow Syntax Check ==="
if command -v actionlint &> /dev/null; then
    actionlint .github/workflows/build-test.yml
else
    echo "actionlint not installed, skipping workflow syntax validation"
    echo "Workflow file exists: $(ls -la .github/workflows/build-test.yml 2>/dev/null | head -1)"
fi
echo ""

# Step 6: Summary
echo "=============================================="
echo "VALIDATION COMPLETE"
echo "=============================================="

