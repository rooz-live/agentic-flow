#!/usr/bin/env bash
set -euo pipefail

# Local Security Scanner
# Runs Semgrep (SAST) + OpenSSF Scorecard against the repo
# Usage: scripts/infra/security/scan-local.sh [semgrep|scorecard|all]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

run_semgrep() {
    echo -e "${CYAN}━━━ Semgrep SAST Scan ━━━${NC}"
    echo ""

    if ! command -v semgrep &>/dev/null; then
        echo -e "${RED}semgrep not installed. Run: brew install semgrep${NC}"
        return 1
    fi

    # Run with project config + community security rules
    semgrep scan \
        --config "$REPO_ROOT/.semgrep.yml" \
        --config "p/security-audit" \
        --config "p/secrets" \
        --exclude "node_modules" \
        --exclude ".git" \
        --exclude "archive" \
        --exclude "retiring" \
        --metrics off \
        "$REPO_ROOT/scripts/infra/" \
        "$REPO_ROOT/projects/" 2>&1

    echo ""
    echo -e "${GREEN}Semgrep scan complete${NC}"
}

run_scorecard() {
    echo -e "${CYAN}━━━ OpenSSF Scorecard ━━━${NC}"
    echo ""

    if ! command -v scorecard &>/dev/null; then
        echo -e "${RED}scorecard not installed. Run: brew install scorecard${NC}"
        return 1
    fi

    # Run against the GitHub repo
    local REPO_URL
    REPO_URL=$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null | sed 's/\.git$//')

    if [ -z "$REPO_URL" ]; then
        echo -e "${RED}No git remote found${NC}"
        return 1
    fi

    echo "Repository: $REPO_URL"
    echo ""

    scorecard --repo="$REPO_URL" --format=default 2>&1

    echo ""
    echo -e "${GREEN}Scorecard complete${NC}"
}

show_usage() {
    cat << EOF
Local Security Scanner

Usage: $0 [command]

Commands:
  semgrep     Run Semgrep SAST scan (custom rules + community security packs)
  scorecard   Run OpenSSF Scorecard (repo health assessment)
  all         Run all scans (default)
  help        Show this help

Prerequisites:
  brew install semgrep scorecard
  export GITHUB_AUTH_TOKEN=... (for Scorecard API calls)

EOF
}

case "${1:-all}" in
    semgrep|s)    run_semgrep ;;
    scorecard|sc) run_scorecard ;;
    all|a)        run_semgrep; echo ""; run_scorecard ;;
    help|h)       show_usage ;;
    *)            show_usage ;;
esac
