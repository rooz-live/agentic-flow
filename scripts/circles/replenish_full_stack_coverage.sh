#!/usr/bin/env bash
# Replenish backlog with Full Stack Coverage actions for each circle
# Part of Retro Refinement

set -e

ACTIONS_FILE=".goalie/CONSOLIDATED_ACTIONS.yaml"
BLOCKER_QUERY="BLOCKER"

# Count active blockers (proxy for ROAM risk level)
BLOCKER_COUNT=$(grep -r "$BLOCKER_QUERY" docs/ 2>/dev/null | wc -l || echo 0)

# If AF_CIRCLE is set (e.g. by af prod-cycle), filter replenishment
TARGET_CIRCLE="${AF_CIRCLE:-ALL}"

# Dynamic Risk Adjustment
# If blockers > 5, we prioritize "Risk Reduction" actions over "Expansion"
RISK_MODE="NORMAL"
if [ "$BLOCKER_COUNT" -gt 5 ]; then
    RISK_MODE="HIGH_RISK"
fi

echo "Replenishing Full Stack Coverage Actions (Circle: $TARGET_CIRCLE, Risk Mode: $RISK_MODE)..."

add_action() {
    local title="$1"
    local circle="$2"
    local priority="HIGH"
    
    # Filter by circle if specific circle is requested (case-insensitive)
    if [ "$TARGET_CIRCLE" != "ALL" ]; then
        # Normalize to lower case for comparison (bash 4.0+)
        # Fallback to grep if ${var,,} not available
        if ! echo "$TARGET_CIRCLE" | grep -iq "^$circle$"; then
            return
        fi
    fi

    # Adjust based on risk mode
    if [ "$RISK_MODE" == "HIGH_RISK" ]; then
        # In high risk mode, prioritize Assessor/Analyst/Orchestrator
        if [[ "$circle" == "Innovator" || "$circle" == "Seeker" ]]; then
            priority="MEDIUM" # De-prioritize expansion
        fi
        # Add risk tag
        tags="[full-stack, reliability, retro-refinement, risk-mitigation]"
    else
        tags="[full-stack, reliability, retro-refinement]"
    fi

    if ! grep -q "$title" "$ACTIONS_FILE"; then
        echo "  - title: \"$title\"" >> "$ACTIONS_FILE"
        echo "    circle: $circle" >> "$ACTIONS_FILE"
        echo "    priority: $priority" >> "$ACTIONS_FILE"
        echo "    tags: $tags" >> "$ACTIONS_FILE"
        echo "    status: TODO" >> "$ACTIONS_FILE"
        echo "Added action: $title ($circle) [$priority]"
    else
        # echo "Action already exists: $title"
        :
    fi
}

add_action "Add full-stack observability coverage for API gateway latency" "Analyst"
add_action "Verify safe-degrade patterns in full-stack integration tests" "Assessor"
add_action "Expand iteration budget to include full-stack prototype deployments" "Innovator"
add_action "Map user journey fallbacks for full-stack outages" "Intuitive"
add_action "Visualize full-stack dependency graph in flow metrics" "Orchestrator"
add_action "Scan for full-stack configuration drift in documentation" "Seeker"

echo "Replenishment complete."
