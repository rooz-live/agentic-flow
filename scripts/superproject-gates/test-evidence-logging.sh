#!/bin/bash

# Evidence Logging Test Script
# Tests the evidence logging system with various scenarios

set -e

echo "=== Evidence Logging System Test ==="
echo "Testing pattern logger and evidence manager integration..."

# Create test directory
TEST_DIR="./test-evidence-$(date +%s)"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Initialize .goalie directory
mkdir -p .goalie/logs

echo "1. Testing evidence CLI with --log-goalie --tier-depth-coverage flags..."

# Test evidence CLI with logging flags
node ../agentic-flow-core/src/evidence/evidence-cli.js test \
  --count 5 \
  --type all \
  --log-goalie \
  --tier-depth-coverage \
  --verbose

echo "2. Testing evidence emit with different types..."

# Test economic compounding
node ../agentic-flow-core/src/evidence/evidence-cli.js emit \
  --type economic_compounding \
  --data '{"energy_cost_usd": 0.05, "value_per_hour": 250}' \
  --log-goalie

# Test maturity coverage
node ../agentic-flow-core/src/evidence/evidence-cli.js emit \
  --type maturity_coverage \
  --data '{"tier_depth": 3, "coverage_pct": 85.2}' \
  --tier-depth-coverage

echo "3. Running evidence assessment..."

# Run evidence assessment
node ../agentic-flow-core/src/evidence/evidence-cli.js assess \
  --type all \
  --threshold 75 \
  --output assessment-results.json

echo "4. Checking evidence status..."

# Check status
node ../agentic-flow-core/src/evidence/evidence-cli.js status --detailed

echo "5. Verifying JSONL files were created..."

# Check if JSONL files exist and have content
echo "Checking learning_evidence.jsonl:"
if [ -f ".goalie/logs/learning_evidence.jsonl" ]; then
    echo "✓ File exists"
    echo "Entries: $(wc -l < .goalie/logs/learning_evidence.jsonl)"
else
    echo "✗ File missing"
fi

echo "Checking compounding_benefits.jsonl:"
if [ -f ".goalie/logs/compounding_benefits.jsonl" ]; then
    echo "✓ File exists"
    echo "Entries: $(wc -l < .goalie/logs/compounding_benefits.jsonl)"
else
    echo "✗ File missing"
fi

echo "Checking tier_depth_coverage.jsonl:"
if [ -f ".goalie/logs/tier_depth_coverage.jsonl" ]; then
    echo "✓ File exists"
    echo "Entries: $(wc -l < .goalie/logs/tier_depth_coverage.jsonl)"
else
    echo "✗ File missing"
fi

echo "6. Testing legacy argument mapping (--rotations to --ab-reps)..."

# Test legacy argument mapping
node ../agentic-flow-core/src/evidence/evidence-cli.js test \
  --count 3 \
  --rotations 10 \
  --verbose 2>&1 | grep -q "deprecated" && echo "✓ Legacy argument mapping working" || echo "✗ Legacy argument mapping failed"

echo "7. Displaying assessment results..."

if [ -f "assessment-results.json" ]; then
    echo "Assessment Results:"
    cat assessment-results.json | jq '.overall'
else
    echo "✗ Assessment results file missing"
fi

echo ""
echo "=== Test Summary ==="
echo "Test directory: $TEST_DIR"
echo "JSONL files created:"
ls -la .goalie/logs/ || echo "No logs directory found"

echo ""
echo "To clean up test files: rm -rf $TEST_DIR"

cd ..