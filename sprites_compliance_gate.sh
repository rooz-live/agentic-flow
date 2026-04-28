#!/bin/bash
# =========================================================================
# SPRITES / CODER COMPLIANCE GATE (Skill-Ship Task)
# =========================================================================
# This script simulates the execution boundary of an ephemeral Coder instance.
# It runs the strictly isolated TDD unit tests for the Agentic Beads.
# No bypass logic. No filesystem/network mocks. Pure state validation.
# =========================================================================

set -e

echo "🚀 [SPRITES CI] Initializing Ephemeral Coder Compliance Gate..."
echo "---------------------------------------------------------------------"

export PYTHONPATH=$(pwd)

echo "🧪 Running Phase 1/2: Inbox Zero & Mailjet TDD..."
python3 -m unittest discover -s tests/unit -p "test_*.py"

echo "🧪 Running Phase 3: Infrastructure Embedding TDD..."
python3 -m unittest discover -s tests/unit_infra -p "test_*.py"

echo "🧪 Running Phase 4: Autonomous Finance (OpenBadges) TDD..."
python3 -m unittest discover -s tests/unit_finance -p "test_*.py"

echo "---------------------------------------------------------------------"
echo "✅ [COMPLIANCE VERIFIED] All Beads passed clean-room execution."
echo "✅ [COMMIT AUTHORIZED] Ready for Git commit."
