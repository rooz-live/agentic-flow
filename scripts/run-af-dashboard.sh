#!/usr/bin/env bash
# Launch the af-dashboard Rust TUI
# Usage: ./scripts/run-af-dashboard.sh
#
# Keybindings:
#   q / Esc  — Quit
#   r        — Force refresh
#   h        — Toggle help

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Build if needed (release for faster health-check runs)
echo "Building af-dashboard..."
cargo build -p agentic-flow-tui --quiet 2>/dev/null || cargo build -p agentic-flow-tui

# Ensure reports directory exists (coherence report)
mkdir -p "${PROJECT_ROOT}/reports"

# Run the dashboard
exec "${PROJECT_ROOT}/target/debug/af-dashboard" --project-root "${PROJECT_ROOT}"
