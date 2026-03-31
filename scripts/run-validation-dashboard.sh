#!/bin/bash
# Launcher for Real-Time Validation Dashboard
# Ensures virtual environment is used
#
# Usage:
#   ./scripts/run-validation-dashboard.sh                    # Demo mode (example results)
#   ./scripts/run-validation-dashboard.sh -f path/to/email.eml  # Validate .eml
#   ./scripts/run-validation-dashboard.sh -f lease.pdf -t settlement  # PDF/Word supported
#   ./scripts/run-validation-dashboard.sh -f email.eml -t settlement
#   ./scripts/run-validation-dashboard.sh --file tests/fixtures/sample_settlement.eml -t settlement
#
# Keys: q=quit r=refresh v=validate n=next file t=doc type f=focus(L4) e=export

SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Use .venv python if available, else system python3
if [ -f ".venv/bin/python" ]; then
    PYTHON=".venv/bin/python"
else
    PYTHON="python3"
fi

# Ensure textual is installed
$PYTHON -c "import textual" 2>/dev/null || $PYTHON -m pip install textual

# Ensure reports directory exists
mkdir -p "$PROJECT_ROOT/reports"

# Run full validation dashboard (PRD/DDD/ADR/TDD robustness, systemic scores, event log)
$PYTHON src/validation_dashboard_tui.py "$@"
