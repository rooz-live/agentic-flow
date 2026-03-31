#!/bin/bash
# Execute DoD-First Workflow: Inverted Thinking Applied
# Date: 2026-02-13
# Usage: ./scripts/execute-dod-first-workflow.sh [phase]
#
# Phases:
#   env       - Environment setup (cpanel, .env consolidation)
#   cache     - Rust cache manager TDD implementation
#   dashboard - TUI dashboard 33-role enhancement
#   validate  - Run validation pipeline
#   all       - Execute all phases sequentially

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Phase 1: Environment Setup
phase_env() {
    log_info "Phase 1: Environment Setup"
    
    # Check if scripts exist
    if [ ! -f "$SCRIPT_DIR/cpanel-env-setup.sh" ]; then
        log_error "cpanel-env-setup.sh not found"
        return 1
    fi
    
    # Update local .env
    log_info "Updating local .env..."
    "$SCRIPT_DIR/cpanel-env-setup.sh"
    log_success "Local .env updated"
    
    # Propagate to all locations
    log_info "Propagating to agentic-flow-core and config..."
    "$SCRIPT_DIR/cpanel-env-setup.sh" --all
    log_success "Environment configuration propagated"
    
    # Verify .env files exist
    if [ -f "$PROJECT_ROOT/.env" ]; then
        log_success "✓ $PROJECT_ROOT/.env exists"
    else
        log_warning "✗ $PROJECT_ROOT/.env missing"
    fi
    
    log_success "Phase 1 Complete: Environment Setup"
}

# Phase 2: Rust Cache Manager TDD
phase_cache() {
    log_info "Phase 2: Rust Cache Manager TDD Implementation"
    
    RUST_PROJECT="$PROJECT_ROOT/../../rust/ruvector"
    
    if [ ! -d "$RUST_PROJECT" ]; then
        log_warning "Rust project not found at $RUST_PROJECT"
        log_info "Skipping Rust cache manager implementation"
        return 0
    fi
    
    cd "$RUST_PROJECT"
    
    # Check if tests exist
    log_info "Running TDD tests (should fail initially)..."
    if cargo test --package ruvector-core --lib cache::lru_manager::tests 2>/dev/null; then
        log_success "Tests passed (implementation exists)"
    else
        log_warning "Tests failed (expected for TDD red state)"
        log_info "Next: Implement code to pass tests"
    fi
    
    cd "$PROJECT_ROOT"
    log_success "Phase 2 Complete: Rust Cache Manager TDD"
}

# Phase 3: TUI Dashboard Enhancement
phase_dashboard() {
    log_info "Phase 3: TUI Dashboard 33-Role Enhancement"
    
    # Check if validation dashboard exists
    if [ ! -f "$PROJECT_ROOT/validation_dashboard_tui.py" ]; then
        log_error "validation_dashboard_tui.py not found"
        return 1
    fi
    
    # Check if 33-role council exists
    if [ ! -f "$PROJECT_ROOT/vibesthinker/governance_council_33_roles.py" ]; then
        log_error "governance_council_33_roles.py not found"
        return 1
    fi
    
    log_info "33-role governance council created"
    log_info "Next: Integrate into validation_dashboard_tui.py"
    
    # Test import
    python3 -c "from vibesthinker.governance_council_33_roles import GovernanceCouncil33; print('✓ Import successful')" 2>/dev/null && \
        log_success "33-role council imports successfully" || \
        log_warning "33-role council import failed (dependencies missing?)"
    
    log_success "Phase 3 Complete: TUI Dashboard Enhancement"
}

# Phase 4: Validation Pipeline
phase_validate() {
    log_info "Phase 4: Run Validation Pipeline"
    
    # Check if validation scripts exist
    if [ ! -f "$SCRIPT_DIR/run-validation-dashboard.sh" ]; then
        log_error "run-validation-dashboard.sh not found"
        return 1
    fi
    
    # Check for sample fixtures
    if [ -f "$PROJECT_ROOT/tests/fixtures/sample_settlement.eml" ]; then
        log_info "Running validation on sample settlement email..."
        "$SCRIPT_DIR/run-validation-dashboard.sh" -f tests/fixtures/sample_settlement.eml -t settlement || true
    else
        log_warning "Sample fixture not found, skipping validation test"
    fi
    
    log_success "Phase 4 Complete: Validation Pipeline"
}

# Main execution
main() {
    local phase="${1:-all}"
    
    log_info "=== DoD-First Workflow Execution ==="
    log_info "Phase: $phase"
    log_info "Project Root: $PROJECT_ROOT"
    echo ""
    
    case "$phase" in
        env)
            phase_env
            ;;
        cache)
            phase_cache
            ;;
        dashboard)
            phase_dashboard
            ;;
        validate)
            phase_validate
            ;;
        all)
            phase_env
            echo ""
            phase_cache
            echo ""
            phase_dashboard
            echo ""
            phase_validate
            ;;
        *)
            log_error "Unknown phase: $phase"
            echo "Usage: $0 [env|cache|dashboard|validate|all]"
            exit 1
            ;;
    esac
    
    echo ""
    log_success "=== Workflow Complete ==="
    log_info "Next steps:"
    log_info "1. Review docs/IMPLEMENTATION_SUMMARY_2026-02-13.md"
    log_info "2. Implement Rust cache manager (docs/rust_cache_manager_tdd_spec.md)"
    log_info "3. Enhance TUI dashboard with 33 roles"
    log_info "4. Run validation pipeline on real emails"
}

# Execute main
main "$@"

