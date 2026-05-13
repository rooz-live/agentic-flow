#!/bin/bash
# ==============================================================================
# Sovereign Swarm: Holacracy Institutional Context Scaffolding
# Purpose: Physically scaffold the circles/ directory for headless agents
# ==============================================================================

ROOT_DIR="projects/investing/agentic-flow/circles"
CIRCLES=("analyst" "assessor" "innovator" "intuitive" "orchestrator" "seeker")

echo "🦅 Scaffolding Holacracy Institutional Context..."

for circle in "${CIRCLES[@]}"; do
    mkdir -p "$ROOT_DIR/$circle/operational-$circle-roles"
    
    # Generic context for the circle
    cat <<EOF > "$ROOT_DIR/$circle/purpose.md"
# $circle Circle Purpose
Doctrine: Structural Sovereignty over Completion Velocity.
Primary Directive: Implement Genchi Genbutsu (Go and See) to verify actual facts, not simulated artifacts.
EOF

    # Generic backlog for the circle
    cat <<EOF > "$ROOT_DIR/$circle/backlog.md"
# $circle WSJF Capability Backlog
- [ ] INVERT THINKING: Deep why RCA.
- [ ] Clarity, Credibility, Proof, Presence execution.
EOF

    echo "✅ Scaffolded $circle circle context."
done

# Analyst Sub-roles
mkdir -p "$ROOT_DIR/analyst/operational-analyst-roles/Analyst"
touch "$ROOT_DIR/analyst/operational-analyst-roles/Analyst/backlog.md"

# Assessor Sub-roles
mkdir -p "$ROOT_DIR/assessor/operational-assessor-roles/Assessor"
touch "$ROOT_DIR/assessor/operational-assessor-roles/Assessor/backlog.md"

# Innovator Sub-roles
mkdir -p "$ROOT_DIR/innovator/operational-innovator-roles/AI Architect:Prototyper"
touch "$ROOT_DIR/innovator/operational-innovator-roles/purpose.md"

# Intuitive Sub-roles
mkdir -p "$ROOT_DIR/intuitive/operational-intuitive-roles/Facilitator"
touch "$ROOT_DIR/intuitive/operational-intuitive-roles/purpose.md"

# Orchestrator Sub-roles
mkdir -p "$ROOT_DIR/orchestrator/operational-orchestration-roles/Orchestrator"
touch "$ROOT_DIR/orchestrator/operational-orchestration-roles/backlog.md"

# Seeker Sub-roles
mkdir -p "$ROOT_DIR/seeker/operational-exploration-discovery-roles/Explorer"
touch "$ROOT_DIR/seeker/operational-exploration-discovery-roles/purpose.md"

echo "✅ Institutional Holacracy memory instantiated."
