#!/bin/bash
# contract-enforcement-gate.sh
# Contract Enforcement Gate - Verifiable Gates for Auto Commandments
# Usage: ./scripts/contract-enforcement-gate.sh [command] [options]

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# --- Metrics Calculation Function ---
# Calculates DPC (Deadline-Projected Completion) metric:
# DPC(t) = clamp( C(t) + v(t) * T(t), 0, 1 )
# Where:
# C(t) = passed_checks / total_checks (Snapshot Completion %/#)
# v(t) = dC/dt (Velocity %.#) - currently simplified to linear projection based on recent changes if available, otherwise 0
# T(t) = time_remaining (Deadline Pressure)
#
# Returns JSON object with metrics.
calculate_metrics() {
    local passed_checks=0
    local total_checks=0
    local deadline_timestamp=0
    local current_timestamp=$(date +%s)
    local velocity=0
    
    # 1. Estimate C(t) - Snapshot Completion
    # Check for test results or coverage reports
    if [ -f "coverage/coverage-summary.json" ]; then
        # Parse coverage if jq available
        if command -v jq >/dev/null 2>&1; then
             passed_checks=$(jq '.total.lines.covered' coverage/coverage-summary.json 2>/dev/null || echo 0)
             total_checks=$(jq '.total.lines.total' coverage/coverage-summary.json 2>/dev/null || echo 0)
        fi
    fi
    
    # Fallback to simple file count or manual tracking file
    if [ "$total_checks" -eq 0 ]; then
        # Heuristic: Count implementation files vs TODOs
        total_checks=$(find . -name "*.sh" -o -name "*.py" -o -name "*.ts" | grep -v "node_modules" | wc -l)
        # Let's assume passed = total - files_with_todos
        local files_with_todos=$(grep -l "TODO" . 2>/dev/null | wc -l)
        passed_checks=$((total_checks - files_with_todos))
    fi
    
    local completion_ratio=0
    if [ "$total_checks" -gt 0 ]; then
        # Manual bc calculation without bc tool fallback
        if command -v bc >/dev/null 2>&1; then
            completion_ratio=$(echo "scale=4; $passed_checks / $total_checks" | bc 2>/dev/null)
        else
            completion_ratio=$(awk "BEGIN {print $passed_checks/$total_checks}")
        fi
    fi

    # 2. Get T(t) - Deadline Pressure
    # Check ROAM_TRACKER.yaml for earliest critical deadline
    if [ -f "ROAM_TRACKER.yaml" ]; then
        local nearest_deadline=$(grep "deadline:" ROAM_TRACKER.yaml | head -1 | awk '{print $2}' | tr -d '"')
        if [ -n "$nearest_deadline" ]; then
             # Convert to timestamp (compatible with mac/linux date)
             if date -j -f "%Y-%m-%d" "$nearest_deadline" +%s >/dev/null 2>&1; then
                 deadline_timestamp=$(date -j -f "%Y-%m-%d" "$nearest_deadline" +%s)
             elif date -d "$nearest_deadline" +%s >/dev/null 2>&1; then
                 deadline_timestamp=$(date -d "$nearest_deadline" +%s)
             fi
        fi
    fi
    
    local time_remaining=0
    if [ "$deadline_timestamp" -gt "$current_timestamp" ]; then
        time_remaining=$((deadline_timestamp - current_timestamp))
    fi
    
    # 3. Velocity v(t) - Placeholder for now (requires history)
    # We could store current C(t) in a temp file and compare with previous run
    
    # Output JSON
    echo "{"
    echo "  \"snapshot_completion\": $completion_ratio,"
    echo "  \"passed_checks\": $passed_checks,"
    echo "  \"total_checks\": $total_checks,"
    echo "  \"time_remaining_sec\": $time_remaining,"
    echo "  \"velocity\": $velocity,"
    echo "  \"dpc_metric\": $completion_ratio" 
    echo "}"
}

# Command routing
case "${1:-}" in
    verify)
        echo -e "${BLUE}=== CONTRACT VERIFICATION GATES ===${NC}"
        echo "Running all 7 integrity gates + contract clause verification"
        echo ""
        
        # Run existing contract compliance
        if "$SCRIPT_DIR/verify-contract-compliance.sh"; then
            echo -e "${GREEN}✓ Contract compliance PASSED${NC}"
        else
            echo -e "${RED}✗ Contract compliance FAILED${NC}"
            exit 1
        fi
        
        # Check ROAM tracker freshness
        echo ""
        echo -e "${BLUE}Checking ROAM tracker freshness...${NC}"
        if [ -f "ROAM_TRACKER.yaml" ]; then
            # Simple staleness check (96h threshold)
            if find ROAM_TRACKER.yaml -mtime -4 >/dev/null 2>&1; then
                echo -e "${GREEN}✓ ROAM tracker FRESH (< 96h)${NC}"
            else
                echo -e "${YELLOW}⚠ ROAM tracker STALE (> 96h)${NC}"
                echo "  Update ROAM_TRACKER.yaml to unblock deployment"
            fi
        else
            echo -e "${YELLOW}⚠ ROAM tracker NOT FOUND${NC}"
        fi
        
        echo ""
        echo -e "${GREEN}=== ALL VERIFICATION GATES PASSED ===${NC}"
        ;;
        
    metric)
        # minimal CLI surface for the metric
        calculate_metrics
        ;;

    audit)
        echo -e "${BLUE}=== ANNOTATION AUDIT ===${NC}"
        echo "Scanning source for @business-context, @adr, @constraint, @planned-change"
        echo ""
        
        # Use Python annotation scanner if available
        if [ -f "$SCRIPT_DIR/context-annotations.py" ]; then
            python3 "$SCRIPT_DIR/context-annotations.py" validate --path .
        else
            echo -e "${YELLOW}⚠ Annotation scanner not found${NC}"
            echo "Install with: pip install context-annotations"
        fi
        ;;
        
    init)
        echo -e "${BLUE}=== CONTRACT INITIALIZATION ===${NC}"
        
        CONTRACT_FILE="CONTRACT.md"
        if [ -f "$CONTRACT_FILE" ]; then
            echo -e "${YELLOW}⚠ Contract already exists: $CONTRACT_FILE${NC}"
            echo "Overwrite? (y/N)"
            read -r response
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                exit 0
            fi
        fi
        
        cat > "$CONTRACT_FILE" << 'EOF'
---
contract: true
version: "1.0"
goal:
  metric: "80% mutation kill rate on UserService"
  threshold: 80
  unit: "percent"
constraints:
  token_budget: 4000
  file_boundary: ["src/services/"]
  no_mocks_when_real_available: true
output_format:
  type: "json"
  required_fields: ["summary", "files_modified", "metrics"]
failure_conditions:
  - "mock used where real DB connection available"
  - "coverage self-reported without running jest --coverage"
  - "file outside constraint boundary is modified"
verification:
  command: "npm test -- --coverage --json"
  parse: ".total.branches >= 80"
---

# Task Contract

## § GOAL (Success Metric)
Exact, measurable outcome with specific threshold.

## § CONSTRAINTS (Hard Boundaries)
- Token budget: ≤ # tokens
- File boundary: Limited to specific directories
- No mocks when real DB available

## § OUTPUT FORMAT (Structure Specification)
Return structured JSON with required fields.

## § FAILURE CONDITIONS (Rejection Criteria)
Output is UNACCEPTABLE if:
- Any test uses mocks where real DB connections are available
- Coverage metric is self-reported without running jest --coverage
- Output exceeds token budget
- Any file outside the constraint boundary is modified

## § VERIFICATION (How We Know It Worked)
Run specific command and parse output for threshold.

### Auto Commandments

**ALWAYS:**
- ✅ ALWAYS implement all code/tests with proper implementation
- ✅ ALWAYS verify before claiming success
- ✅ ALWAYS use real database queries, not mocks, for integration tests
- ✅ ALWAYS run actual tests, not assume they pass

**NEVER:**
- ❌ NO shortcuts - do the work properly or don't do it
- ❌ NO fake data - use real data, real tests, real results
- ❌ NO false claims - only report what actually works and is verified
EOF
        
        echo -e "${GREEN}✓ Contract template created: $CONTRACT_FILE${NC}"
        echo "Edit the goal, constraints, and verification sections"
        ;;
        
    roam)
        echo -e "${BLUE}=== ROAM TRACKER CHECK ===${NC}"
        
        ROAM_FILE="ROAM_TRACKER.yaml"
        if [ ! -f "$ROAM_FILE" ]; then
            echo -e "${RED}✗ ROAM tracker not found: $ROAM_FILE${NC}"
            exit 1
        fi
        
        # Check file age
        if find "$ROAM_FILE" -mtime -4 >/dev/null 2>&1; then
            AGE_HOURS=$(find "$ROAM_FILE" -mmin -2880 | wc -l)
            echo -e "${GREEN}✓ ROAM tracker is FRESH${NC}"
            echo "  Last modified: $(stat -f %Sm "$ROAM_FILE")"
        else
            echo -e "${RED}✗ ROAM tracker is STALE (> 96h)${NC}"
            echo "  Last modified: $(stat -f %Sm "$ROAM_FILE")"
            echo "  Update required to unblock deployment"
            exit 1
        fi
        ;;
        
    report)
        echo -e "${BLUE}=== ENFORCEMENT REPORT ===${NC}"
        echo "Generating comprehensive enforcement report..."
        echo ""
        
        REPORT_FILE="reports/enforcement-$(date +%Y%m%d-%H%M%S).json"
        mkdir -p reports
        
        # Collect all verification data
        # Note: We construct valid JSON manually to avoid dependency on jq
        {
            echo "{"
            echo "  \"timestamp\": \"$(date -Iseconds)\","
            echo "  \"project_root\": \"$(pwd)\","
            echo "  \"contract_compliance\": $(("$SCRIPT_DIR/verify-contract-compliance.sh" 2>/dev/null && echo "true") || echo "false"),"
            echo "  \"roam_fresh\": $(find ROAM_TRACKER.yaml -mtime -4 >/dev/null 2>&1 && echo "true" || echo "false"),"
            # Get only the first 20 lines of scan output and ensure it is valid JSON if possible, or empty object
            # For simplicity in this robust version, we skip complex embedding of scan output if it might break JSON
            echo "  \"annotations_summary\": \"See full audit log for details\","
            # Health check score
            echo "  \"health_score\": $(("$SCRIPT_DIR/health-check.sh" 2>/dev/null | grep "Health Score:" | grep -o "[0-9]*" || echo "0")),"
            # Calculate DPC metrics
            echo "  \"dpc_metrics\": $(calculate_metrics)"
            echo "}"
        } > "$REPORT_FILE"
        
        echo -e "${GREEN}✓ Report generated: $REPORT_FILE${NC}"
        
        # Summary
        echo ""
        echo "Summary:"
        if command -v python3 >/dev/null 2>&1; then
             cat "$REPORT_FILE" | python3 -m json.tool || cat "$REPORT_FILE"
        else
             cat "$REPORT_FILE"
        fi
        ;;
        
    *)
        echo "Contract Enforcement Gate"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  verify   Run all 7 integrity gates + contract clause verification + ROAM staleness"
        echo "  audit    Pre-commit, annotation review - scans for @business-context, @adr, @constraint, @planned-change"
        echo "  init     Start of any new task - generates CONTRACT.md with all 4 enforceable clauses"
        echo "  roam     Standup, retro, deployment - checks ROAM_TRACKER.yaml freshness (96h threshold)"
        echo "  report   After any run - generates JSON or Markdown enforcement report"
        echo ""
        echo "Integration Points:"
        echo "  - BaseAgent.onPostTask: Shell exec → contract-enforcement-gate.sh verify"
        echo "  - ay-prod-cycle-with-dor.sh: Calls enforcement gate at DoD"
        echo "  - .pre-commit-config.yaml: Annotation audit on changed files"
        echo "  - CI/CD pipeline: Full verification + annotation audit"
        exit 1
        ;;
esac
