#!/usr/bin/env bash
# scripts/organize-root-files.sh
# Reorganize root folder files into DDD/ADR/PRD/TDD/ROAM structure

set -euo pipefail

ROOT_DIR="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"
DDD_DIR="$ROOT_DIR/docs/ddd"
ADR_DIR="$ROOT_DIR/docs/adr"
PRD_DIR="$ROOT_DIR/docs/prd"
TDD_DIR="$ROOT_DIR/docs/tdd"
ROAM_DIR="$ROOT_DIR/docs/roam"

# Create directories if they don't exist
mkdir -p "$DDD_DIR" "$ADR_DIR" "$PRD_DIR" "$TDD_DIR" "$ROAM_DIR"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Organizing Root Files ===${NC}"

# Move files based on naming patterns
cd "$ROOT_DIR"

# ADR files
for file in ADR-*.md adr-*.md *-adr.md; do
    [[ -f "$file" ]] && echo "Moving $file → docs/adr/" && mv "$file" "$ADR_DIR/"
done

# PRD files
for file in PRD-*.md prd-*.md *-prd.md *-PLAN.md *-SPEC.md; do
    [[ -f "$file" ]] && echo "Moving $file → docs/prd/" && mv "$file" "$PRD_DIR/"
done

# DDD files
for file in DDD-*.md ddd-*.md *-domain.md *-DOMAIN.md *-bounded-context.md; do
    [[ -f "$file" ]] && echo "Moving $file → docs/ddd/" && mv "$file" "$DDD_DIR/"
done

# TDD files
for file in *-test*.md *-TEST.md *-coverage.md *-COVERAGE.md; do
    [[ -f "$file" ]] && echo "Moving $file → docs/tdd/" && mv "$file" "$TDD_DIR/"
done

# ROAM files
for file in *-RISKS.md *-ROAM.md ROAM-*.md *-risk-*.md WSJF-*.md; do
    [[ -f "$file" ]] && echo "Moving $file → docs/roam/" && mv "$file" "$ROAM_DIR/"
done

echo -e "${GREEN}✅ Root file organization complete${NC}"
echo ""
echo "File counts:"
echo "  ADR:  $(ls -1 "$ADR_DIR" 2>/dev/null | wc -l | xargs)"
echo "  PRD:  $(ls -1 "$PRD_DIR" 2>/dev/null | wc -l | xargs)"
echo "  DDD:  $(ls -1 "$DDD_DIR" 2>/dev/null | wc -l | xargs)"
echo "  TDD:  $(ls -1 "$TDD_DIR" 2>/dev/null | wc -l | xargs)"
echo "  ROAM: $(ls -1 "$ROAM_DIR" 2>/dev/null | wc -l | xargs)"
