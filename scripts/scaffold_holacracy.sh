#!/usr/bin/env bash
# 🦅 Sovereign Swarm: Holacracy Institutional Scaffolding
# Purpose: Physically injects the Holacracy context (purpose, domains, accountabilities, backlog)
# so the headless agents have zero-trust deterministic context boundaries.

BASE_DIR="/Users/shahroozbhopti/Documents/code/projects/investing/agentic-flow/circles"

# Define the circle matrix
declare -A CIRCLES=(
    ["analyst/operational-analyst-roles"]="Analyst Architect Custodian Owner Partner Researcher Steward Synthesizer"
    ["assessor/operational-assessor-roles"]="Assessor Custodian Facilitator Lead Partner Steward Synthesizer"
    ["innovator/operational-innovator-roles"]="AI_Architect:Prototyper Builder Catalyst Lead Owner Partner Researcher Scout Steward Synthesizer"
    ["intuitive/operational-intuitive-roles"]="Facilitator Framer Lead Mapper Partner Scout Steward Synthesizer"
    ["orchestrator/operational-orchestration-roles"]="Coordinator Facilitator Liaison Manager Orchestrator Partner Planner Steward"
    ["seeker/operational-exploration-discovery-roles"]="Explorer Framer Lead Partner Pathfinder Prospector Researcher Scanner Scout"
)

echo "🦅 Initiating Holacracy Physical Scaffold..."

for circle_path in "${!CIRCLES[@]}"; do
    roles=${CIRCLES[$circle_path]}
    for role in $roles; do
        # Handle spaces / colons replaced temporarily in the array
        clean_role=$(echo "$role" | tr '_' ' ')
        target_dir="$BASE_DIR/$circle_path/$clean_role"
        
        mkdir -p "$target_dir"
        
        # Scaffold purpose.md
        if [ ! -f "$target_dir/purpose.md" ]; then
            echo "# Purpose: $clean_role" > "$target_dir/purpose.md"
            echo "To maximize WSJF ROI by enforcing San Gen Shugi facts and decoupling architecture." >> "$target_dir/purpose.md"
        fi
        
        # Scaffold accountabilities.md
        if [ ! -f "$target_dir/accountabilities.md" ]; then
            echo "# Accountabilities: $clean_role" > "$target_dir/accountabilities.md"
            echo "- Execute headless validation loops via one.sh." >> "$target_dir/accountabilities.md"
            echo "- Do not build redundant UI." >> "$target_dir/accountabilities.md"
        fi

        # Scaffold domains.md
        if [ ! -f "$target_dir/domains.md" ]; then
            echo "# Domains: $clean_role" > "$target_dir/domains.md"
            echo "Exclusive architectural control over the $clean_role matrices." >> "$target_dir/domains.md"
        fi

        # Scaffold backlog.md
        if [ ! -f "$target_dir/backlog.md" ]; then
            echo "# Backlog: $clean_role" > "$target_dir/backlog.md"
            echo "Awaiting autonomous ingestion engine synchronization..." >> "$target_dir/backlog.md"
        fi
    done
done

echo "✅ Institutional context successfully scaffolded across all 6 Swarm Circles."
