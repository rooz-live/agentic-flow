#!/bin/bash
# Test: Identify dependencies on untracked gate scripts
# Following TDD red-green-refactor pattern

set -euo pipefail

echo "Testing gate script dependencies..."

# RED: Test should reveal dependencies on untracked scripts
test_gate_script_dependencies() {
    echo "  RED: Checking for untracked gate script dependencies"
    
    local failed=0
    
    # Check CSQBM dependencies
    echo "    Checking CSQBM dependencies..."
    if grep -r "scripts/ci/hostbill-sync-agent.py" . --include="*.sh" --include="*.py" --include="*.yaml" --include="*.md" >/dev/null 2>&1; then
        echo "    ✗ Found references to untracked: scripts/ci/hostbill-sync-agent.py"
        failed=1
    fi
    
    # Check monitoring dependencies
    echo "    Checking monitoring dependencies..."
    if grep -r "site_health_monitor.py" . --include="*.sh" --include="*.py" --include="*.yaml" >/dev/null 2>&1; then
        echo "    ✗ Found references to untracked: site_health_monitor.py"
        failed=1
    fi
    
    # Check TLD dependencies
    echo "    Checking TLD dependencies..."
    if grep -r "_SYSTEM/_AUTOMATION/tld-server-config.sh" . --include="*.sh" --include="*.py" >/dev/null 2>&1; then
        echo "    ✗ Found references to untracked: _SYSTEM/_AUTOMATION/tld-server-config.sh"
        failed=1
    fi
    
    # Check dashboard dependencies
    echo "    Checking dashboard dependencies..."
    if grep -r "monitoring_dashboard.py" . --include="*.sh" --include="*.py" --include="*.yaml" >/dev/null 2>&1; then
        echo "    ✗ Found references to untracked: monitoring_dashboard.py"
        failed=1
    fi
    
    if [ $failed -eq 1 ]; then
        echo "  ✗ RED: Found dependencies on untracked scripts"
        return 1
    else
        echo "  ✓ GREEN: No dependencies on untracked scripts found"
        return 0
    fi
}

# Identify critical untracked scripts
identify_critical_untracked() {
    echo "  Identifying critical untracked scripts..."
    
    local critical_count=0
    
    # Look for scripts referenced in workflows
    echo "    Checking GitHub workflows..."
    for workflow in .github/workflows/*.yml; do
        if [[ -f "$workflow" ]]; then
            while IFS= read -r script; do
                if [[ ! -f "$script" && "$script" == *.sh ]]; then
                    echo "    ✗ Workflow references missing: $script"
                    ((critical_count++))
                fi
            done < <(grep -oE '\b[^/]+\.sh\b' "$workflow" 2>/dev/null || true)
        fi
    done
    
    # Look for scripts in documentation
    echo "    Checking documentation..."
    for doc in docs/*.md; do
        if [[ -f "$doc" ]]; then
            while IFS= read -r script; do
                if [[ ! -f "$script" && "$script" == scripts/* ]]; then
                    echo "    ✗ Documentation references missing: $script"
                    ((critical_count++))
                fi
            done < <(grep -oE 'scripts/[^`)]+\.sh' "$doc" 2>/dev/null || true)
        fi
    done
    
    if [ $critical_count -gt 0 ]; then
        echo "  ✗ Found $critical_count critical missing scripts"
        return 1
    else
        echo "  ✓ No critical missing scripts found"
        return 0
    fi
}

# Execute tests
echo "Running RED phase tests..."
if test_gate_script_dependencies && identify_critical_untracked; then
    echo "✅ All tests passed - no untracked dependencies"
    exit 0
else
    echo "❌ Tests failed - untracked script dependencies exist"
    exit 1
fi
