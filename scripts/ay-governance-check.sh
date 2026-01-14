#!/bin/bash
# AY Governance Check - Wire governance compliance to verdict registry
# P0 Fix #3: Populate governance_flags in audit trails

set -euo pipefail

PROJECT_ROOT="${1:-.}"
GOALIE_DIR="$PROJECT_ROOT/.goalie"
REGISTRY_FILE="$PROJECT_ROOT/.ay-verdicts/registry.json"

# Check if governance system exists
if [[ ! -f "$PROJECT_ROOT/src/governance/core/governance_system.ts" ]]; then
    echo "❌ Governance system not found" >&2
    exit 1
fi

# Check if verdict registry exists
if [[ ! -f "$REGISTRY_FILE" ]]; then
    echo "❌ Verdict registry not found: $REGISTRY_FILE" >&2
    exit 1
fi

# Run governance compliance check via Node
check_governance_compliance() {
    node -e "
const fs = require('fs');
const path = require('path');

// Dynamically load governance system
async function checkCompliance() {
    try {
        // Try to import compiled JS
        const govModule = await import('$PROJECT_ROOT/dist/governance/core/governance_system.js').catch(() => null);
        
        if (!govModule) {
            // Fallback: use ts-node if available
            require('ts-node/register');
            const { GovernanceSystem } = require('$PROJECT_ROOT/src/governance/core/governance_system.ts');
            const gov = new GovernanceSystem({ goalieDir: '$GOALIE_DIR' });
            await gov.initialize();
            
            // Run compliance checks
            const checks = await gov.checkCompliance();
            const dimensionalViolations = await gov.checkDimensionalCompliance();
            
            return {
                checks,
                dimensionalViolations,
                timestamp: new Date().toISOString()
            };
        } else {
            const { GovernanceSystem } = govModule;
            const gov = new GovernanceSystem({ goalieDir: '$GOALIE_DIR' });
            await gov.initialize();
            
            const checks = await gov.checkCompliance();
            const dimensionalViolations = await gov.checkDimensionalCompliance();
            
            return {
                checks,
                dimensionalViolations,
                timestamp: new Date().toISOString()
            };
        }
    } catch (error) {
        console.error('Governance check failed:', error.message);
        return {
            checks: [],
            dimensionalViolations: [],
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

checkCompliance().then(result => {
    console.log(JSON.stringify(result, null, 2));
}).catch(error => {
    console.error(JSON.stringify({ error: error.message, checks: [], dimensionalViolations: [] }));
    process.exit(1);
});
" 2>/dev/null
}

# Extract governance flags from compliance result
extract_governance_flags() {
    local compliance_json="$1"
    
    # Extract violations and map to flags
    echo "$compliance_json" | jq -c '[
        (.checks[]?.violations[]? | select(. != null) | {
            type: "policy_violation",
            severity: .severity,
            rule_id: .ruleId,
            pattern: .pattern,
            message: .message
        }),
        (.dimensionalViolations[]? | select(. != null) | {
            type: ("dimensional_" + (.type | ascii_downcase)),
            severity: (if .status == "CRITICAL" then "critical" elif .status == "WARNING" then "high" else "medium" end),
            dimension: .dimension,
            message: .message,
            current_value: .currentValue,
            target_value: .targetValue
        })
    ] | unique' 2>/dev/null || echo "[]"
}

# Main execution
echo "🔍 Running governance compliance check..." >&2

# Get compliance result
compliance_result=$(check_governance_compliance)

if [[ -z "$compliance_result" ]] || [[ "$compliance_result" == "null" ]]; then
    echo "⚠️  No compliance data returned (governance system may not be built)" >&2
    echo "[]"
    exit 0
fi

# Check for errors
if echo "$compliance_result" | jq -e '.error' >/dev/null 2>&1; then
    error_msg=$(echo "$compliance_result" | jq -r '.error')
    echo "⚠️  Governance check error: $error_msg" >&2
    echo "[]"
    exit 0
fi

# Extract governance flags
governance_flags=$(extract_governance_flags "$compliance_result")

# Count violations
violation_count=$(echo "$governance_flags" | jq 'length')

if [[ $violation_count -eq 0 ]]; then
    echo "✅ No governance violations detected" >&2
else
    echo "⚠️  Found $violation_count governance violation(s)" >&2
    echo "$governance_flags" | jq -r '.[] | "  - [\(.severity | ascii_upcase)] \(.message)"' >&2
fi

# Output flags as JSON
echo "$governance_flags"
