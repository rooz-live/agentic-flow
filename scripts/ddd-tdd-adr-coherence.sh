#!/bin/bash
# DDD/TDD/ADR Coherence Pipeline
# Date: 2026-02-13
# WSJF: 7.5 (2nd highest priority)
# Purpose: Validate architectural coherence between Domain-Driven Design,
#          Test-Driven Development, and Architecture Decision Records

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "═══════════════════════════════════════════════════════════════"
echo "  DDD/TDD/ADR Coherence Pipeline"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Phase 1: ADR Validation
log_info "Phase 1: Validating Architecture Decision Records..."
python3 src/coherence/adr_validator.py --docs-dir docs/ --output .coherence/adr_validation.json
if [ $? -eq 0 ]; then
    log_success "ADR validation complete"
else
    log_error "ADR validation failed"
    exit 1
fi

echo ""

# Phase 2: DDD Domain Model Mapping
log_info "Phase 2: Mapping DDD domain models..."
python3 src/coherence/ddd_mapper.py --src-dir src/ --rust-dir ../rust/ruvector --output .coherence/ddd_mapping.json
if [ $? -eq 0 ]; then
    log_success "DDD mapping complete"
else
    log_error "DDD mapping failed"
    exit 1
fi

echo ""

# Phase 3: TDD Coverage Analysis
log_info "Phase 3: Analyzing TDD test coverage..."
python3 src/coherence/tdd_coverage.py --tests-dir tests/ --src-dir src/ --output .coherence/tdd_coverage.json
if [ $? -eq 0 ]; then
    log_success "TDD coverage analysis complete"
else
    log_error "TDD coverage analysis failed"
    exit 1
fi

echo ""

# Phase 4: Coherence Validation
log_info "Phase 4: Validating DDD/TDD/ADR coherence..."
python3 src/coherence/coherence_validator.py \
    --adr-report .coherence/adr_validation.json \
    --ddd-report .coherence/ddd_mapping.json \
    --tdd-report .coherence/tdd_coverage.json \
    --output .coherence/coherence_report.json \
    --markdown .coherence/COHERENCE_REPORT.md

if [ $? -eq 0 ]; then
    log_success "Coherence validation complete"
else
    log_error "Coherence validation failed"
    exit 1
fi

echo ""

# Phase 5: Generate Summary
log_info "Phase 5: Generating coherence summary..."
cat .coherence/COHERENCE_REPORT.md

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Coherence Pipeline Complete"
echo "═══════════════════════════════════════════════════════════════"
echo ""
log_info "Reports generated:"
log_info "  - ADR Validation: .coherence/adr_validation.json"
log_info "  - DDD Mapping: .coherence/ddd_mapping.json"
log_info "  - TDD Coverage: .coherence/tdd_coverage.json"
log_info "  - Coherence Report: .coherence/coherence_report.json"
log_info "  - Markdown Summary: .coherence/COHERENCE_REPORT.md"
echo ""

# Check coherence score
COHERENCE_SCORE=$(python3 -c "import json; print(json.load(open('.coherence/coherence_report.json'))['coherence_score'])")
log_info "Overall Coherence Score: ${COHERENCE_SCORE}%"

if (( $(echo "$COHERENCE_SCORE >= 80" | bc -l) )); then
    log_success "✓ Coherence score meets threshold (≥80%)"
    exit 0
elif (( $(echo "$COHERENCE_SCORE >= 60" | bc -l) )); then
    log_warning "⚠ Coherence score below target (60-79%)"
    exit 0
else
    log_error "✗ Coherence score critically low (<60%)"
    exit 1
fi

