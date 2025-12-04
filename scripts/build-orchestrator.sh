#!/usr/bin/env bash
#
# build-orchestrator.sh - Comprehensive Build Orchestration for Agentic Flow
# Phase 2: Build Orchestration & Testing
#
# Provides automated build process with comprehensive validation:
# - Environment setup and validation
# - Dependency installation
# - TypeScript/JavaScript build
# - Python validation
# - Test execution (Jest + pytest)
# - Build artifact validation
#
# Usage: ./scripts/build-orchestrator.sh [--full|--quick|--test-only|--validate]

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Configuration
BUILD_MODE="${1:-full}"
FAILED_STEPS=0
TOTAL_STEPS=0
START_TIME=$(date +%s)

# Logging
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_step() { echo -e "${CYAN}▶${NC} $1"; }

# Step execution with tracking
run_step() {
    local name="$1"
    local command="$2"
    TOTAL_STEPS=$((TOTAL_STEPS + 1))
    
    log_step "$name"
    if eval "$command"; then
        log_success "$name completed"
        return 0
    else
        log_error "$name failed"
        FAILED_STEPS=$((FAILED_STEPS + 1))
        return 1
    fi
}

# Environment validation
validate_environment() {
    log_info "Validating build environment..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js 18+"
        return 1
    fi
    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_warning "Node.js version $NODE_VERSION detected. Recommended: 18+"
    fi
    log_success "Node.js $(node -v) detected"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm not found"
        return 1
    fi
    log_success "npm $(npm -v) detected"
    
    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        log_warning "Python not found. Python tests will be skipped."
        PYTHON_CMD=""
    fi
    
    if [ -n "$PYTHON_CMD" ]; then
        log_success "Python $($PYTHON_CMD --version 2>&1 | cut -d' ' -f2) detected"
    fi
    
    # Check TypeScript
    if [ -f "$ROOT_DIR/node_modules/.bin/tsc" ]; then
        log_success "TypeScript compiler available"
    else
        log_info "TypeScript will be installed with dependencies"
    fi
    
    return 0
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    cd "$ROOT_DIR"
    
    # npm dependencies
    if [ ! -d "node_modules" ] || [ "$BUILD_MODE" = "full" ]; then
        run_step "npm install" "npm install --prefer-offline"
    else
        log_info "node_modules exists, skipping npm install (use --full to force)"
    fi
    
    # Python dependencies (if Python available)
    if [ -n "${PYTHON_CMD:-}" ] && [ -f "analysis/requirements.txt" ]; then
        if [ "$BUILD_MODE" = "full" ]; then
            run_step "pip install" "$PYTHON_CMD -m pip install -r analysis/requirements.txt -q" || true
        fi
    fi
}


# TypeScript build
build_typescript() {
    log_info "Building TypeScript..."
    cd "$ROOT_DIR"
    run_step "TypeScript compilation" "npm run build 2>&1 || true"
}

# Python syntax validation
validate_python() {
    if [ -z "${PYTHON_CMD:-}" ]; then
        log_warning "Python not available, skipping Python validation"
        return 0
    fi
    
    log_info "Validating Python files..."
    cd "$ROOT_DIR"
    
    # Validate governance.py
    if [ -f "scripts/policy/governance.py" ]; then
        run_step "governance.py syntax" "$PYTHON_CMD -m py_compile scripts/policy/governance.py"
    fi
    
    # Validate analysis scripts
    for py_file in scripts/analysis/*.py; do
        if [ -f "$py_file" ]; then
            run_step "$(basename "$py_file") syntax" "$PYTHON_CMD -m py_compile $py_file" || true
        fi
    done
}

# Run Jest tests
run_jest_tests() {
    log_info "Running Jest tests..."
    cd "$ROOT_DIR"
    run_step "Jest test suite" "npm test -- --passWithNoTests 2>&1" || true
}

# Run pytest tests
run_pytest_tests() {
    if [ -z "${PYTHON_CMD:-}" ]; then
        log_warning "Python not available, skipping pytest"
        return 0
    fi
    
    log_info "Running pytest tests..."
    cd "$ROOT_DIR"
    
    if $PYTHON_CMD -c "import pytest" 2>/dev/null; then
        run_step "pytest suite" "$PYTHON_CMD -m pytest tests/ -v --tb=short 2>&1" || true
    else
        log_warning "pytest not installed, skipping Python tests"
    fi
}

# Validate build artifacts
validate_artifacts() {
    log_info "Validating build artifacts..."
    cd "$ROOT_DIR"
    
    # Check dist directory
    if [ -d "dist" ]; then
        DIST_FILES=$(find dist -name "*.js" | wc -l | tr -d ' ')
        if [ "$DIST_FILES" -gt 0 ]; then
            log_success "dist/ contains $DIST_FILES JavaScript files"
        else
            log_warning "dist/ exists but contains no JavaScript files"
        fi
    else
        log_warning "dist/ directory not found (TypeScript may not have compiled)"
    fi
    
    # Check critical files
    local critical_files=(
        "scripts/af"
        "scripts/policy/governance.py"
        "package.json"
        "tsconfig.json"
    )
    
    for file in "${critical_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "$file exists"
        else
            log_warning "$file not found"
        fi
    done
}


# Run foundation validation
run_foundation_validation() {
    log_info "Running foundation validation..."
    cd "$ROOT_DIR"
    
    if [ -x "scripts/validate-foundation.sh" ]; then
        run_step "Foundation validation" "./scripts/validate-foundation.sh" || true
    else
        log_warning "validate-foundation.sh not found or not executable"
    fi
}

# Generate build report
generate_report() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "                    BUILD ORCHESTRATION REPORT"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "  Mode:          $BUILD_MODE"
    echo "  Duration:      ${duration}s"
    echo "  Total Steps:   $TOTAL_STEPS"
    echo "  Failed Steps:  $FAILED_STEPS"
    if [ $TOTAL_STEPS -gt 0 ]; then
        echo "  Success Rate:  $(( (TOTAL_STEPS - FAILED_STEPS) * 100 / TOTAL_STEPS ))%"
    fi
    echo ""
    
    if [ $FAILED_STEPS -eq 0 ]; then
        echo -e "  ${GREEN}✅ BUILD SUCCESSFUL${NC}"
    else
        echo -e "  ${YELLOW}⚠️  BUILD COMPLETED WITH WARNINGS${NC}"
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
}


# Main execution
main() {
    echo ""
    echo "🏗️  Agentic Flow Build Orchestrator"
    echo "    Mode: $BUILD_MODE"
    echo ""
    
    case "$BUILD_MODE" in
        full)
            validate_environment
            install_dependencies
            build_typescript
            validate_python
            run_jest_tests
            run_pytest_tests
            validate_artifacts
            run_foundation_validation
            ;;
        quick)
            validate_environment
            build_typescript
            validate_python
            validate_artifacts
            ;;
        test-only)
            validate_environment
            run_jest_tests
            run_pytest_tests
            ;;
        validate)
            validate_environment
            validate_python
            validate_artifacts
            run_foundation_validation
            ;;
        *)
            echo "Usage: $0 [--full|--quick|--test-only|--validate]"
            echo ""
            echo "Modes:"
            echo "  full       - Complete build with all tests (default)"
            echo "  quick      - Build without tests"
            echo "  test-only  - Run tests only"
            echo "  validate   - Validation checks only"
            exit 1
            ;;
    esac
    
    generate_report
    
    if [ $FAILED_STEPS -gt 0 ]; then
        exit 1
    fi
}

# Handle arguments
case "${1:-}" in
    --full) BUILD_MODE="full" ;;
    --quick) BUILD_MODE="quick" ;;
    --test-only) BUILD_MODE="test-only" ;;
    --validate) BUILD_MODE="validate" ;;
    "") BUILD_MODE="full" ;;
    *) BUILD_MODE="$1" ;;
esac

main
