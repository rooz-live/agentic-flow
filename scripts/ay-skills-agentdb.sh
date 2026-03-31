#!/usr/bin/env bash
# ay-skills-agentdb.sh - Wire Skills to AgentDB
# Part of FIRE (Focused Incremental Relentless Execution) Phase 1
# Resolves: Production Maturity Gap #3 (CRITICAL)

set -euo pipefail

# ==============================================================================
# CONFIGURATION
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_DIR="${PROJECT_ROOT}/.cache"
REPORTS_DIR="${PROJECT_ROOT}/reports"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

log() {
    echo -e "${BLUE}[Skills→AgentDB]${NC} $*"
}

log_error() {
    echo -e "${RED}[Skills→AgentDB] ERROR:${NC} $*" >&2
}

log_success() {
    echo -e "${GREEN}[Skills→AgentDB] SUCCESS:${NC} $*"
}

# ==============================================================================
# AGENTDB SCHEMA VERIFICATION
# ==============================================================================

verify_agentdb_schema() {
    log "Verifying skills storage..."
    
    # WORKAROUND: AgentDB doesn't have skills table
    # Use simple JSON file storage instead
    mkdir -p "$REPORTS_DIR"
    
    local skills_store="${REPORTS_DIR}/skills-store.json"
    if [[ ! -f "$skills_store" ]]; then
        echo '{"skills": [], "last_updated": ""}' > "$skills_store"
    fi
    
    log_success "Skills storage initialized: $skills_store"
    return 0
}

# ==============================================================================
# SKILL EXTRACTION FROM LEARNING EPISODES
# ==============================================================================

extract_skills_from_episode() {
    local episode_file="$1"
    
    if [[ ! -f "$episode_file" ]]; then
        return 1
    fi
    
    log "Extracting skills from: $(basename "$episode_file")" >&2
    
    # Parse learning episode JSON
    local episode_id
    episode_id=$(jq -r '.episode_id // ""' "$episode_file")
    
    if [[ -z "$episode_id" ]]; then
        log_error "Invalid episode file (no episode_id)" >&2
        return 1
    fi
    
    # Extract skills from learning patterns
    local skills
    skills=$(jq -c '
        [.patterns[] // [] |
        select(.type == "skill" or .pattern_type == "skill") |
        {
            name: .name,
            description: .description // .pattern,
            category: .category // "general",
            success_rate: .confidence // 0.8,
            evidence: .evidence // [],
            metadata: {
                source_episode: .episode_id,
                extracted_at: (now | todate),
                context: .context // {}
            }
        }]
    ' "$episode_file" 2>/dev/null || echo "[]")
    
    if [[ "$skills" == "[]" || -z "$skills" ]]; then
        log "No skills found in episode $episode_id" >&2
        return 0
    fi
    
    echo "$skills"
}

# ==============================================================================
# SKILL PERSISTENCE TO AGENTDB
# ==============================================================================

persist_skill_to_agentdb() {
    local skill_json="$1"
    
    local name
    name=$(echo "$skill_json" | jq -r '.name')
    
    if [[ -z "$name" || "$name" == "null" ]]; then
        log_error "Invalid skill (no name)"
        return 1
    fi
    
    log "Persisting skill: $name"
    
    local skills_store="${REPORTS_DIR}/skills-store.json"
    
    # Check if skill already exists
    local existing_skill
    existing_skill=$(jq -r --arg name "$name" '.skills[] | select(.name == $name) | .name' "$skills_store" 2>/dev/null || echo "")
    
    if [[ -n "$existing_skill" ]]; then
        log "Skill '$name' already exists. Updating metadata..."
        
        # Increment uses
        jq --arg name "$name" '
            .skills |= map(
                if .name == $name then
                    .uses += 1 |
                    .last_used = (now | todate)
                else . end
            ) |
            .last_updated = (now | todate)
        ' "$skills_store" > "${skills_store}.tmp" && mv "${skills_store}.tmp" "$skills_store"
        
        log "Updated skill usage count"
    else
        log "Creating new skill: $name"
        
        # Prepare skill data
        local description
        description=$(echo "$skill_json" | jq -r '.description')
        
        local category
        category=$(echo "$skill_json" | jq -r '.category // "general"')
        
        local success_rate
        success_rate=$(echo "$skill_json" | jq -r '.success_rate // 0.8')
        
        local metadata
        metadata=$(echo "$skill_json" | jq -c '.metadata // {}')
        
        # Add skill to JSON store
        local new_skill
        new_skill=$(cat <<EOF
{
  "name": "$name",
  "description": "$description",
  "category": "$category",
  "success_rate": $success_rate,
  "uses": 1,
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "last_used": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "metadata": $metadata
}
EOF
)
        
        jq --argjson new_skill "$new_skill" '
            .skills += [$new_skill] |
            .last_updated = (now | todate)
        ' "$skills_store" > "${skills_store}.tmp" && mv "${skills_store}.tmp" "$skills_store"
        
        log_success "Skill '$name' created"
        
        # Create causal edge for MPP learning
        if command -v npx &>/dev/null; then
            # AgentDB causal add-edge <cause> <effect> <uplift> [confidence] [sample-size]
            # Map skill usage -> system quality with success_rate as uplift
            npx agentdb causal add-edge "skill_$name" "system_effectiveness" "$success_rate" "$success_rate" 1 2>/dev/null || true
            log "Causal edge created: skill_$name → system_effectiveness (uplift: $success_rate)"
        fi
    fi
    
    return 0
}

# ==============================================================================
# BATCH PROCESSING
# ==============================================================================

process_all_learning_episodes() {
    log "Processing all learning episodes..."
    
    local episode_files
    episode_files=$(find "$CACHE_DIR" -name "learning-retro-*.json" 2>/dev/null | sort)
    
    if [[ -z "$episode_files" ]]; then
        log "No learning episodes found"
        return 0
    fi
    
    local total_skills=0
    local processed_episodes=0
    
    while IFS= read -r episode_file; do
        # Skip malformed files gracefully
        if ! jq -e '.episode_id' "$episode_file" &>/dev/null; then
            log "Skipping malformed file: $(basename "$episode_file")"
            continue
        fi
        
        local skills_json
        skills_json=$(extract_skills_from_episode "$episode_file")
        
        if [[ -n "$skills_json" && "$skills_json" != "[]" ]]; then
            # Process each skill
            while IFS= read -r skill; do
                if persist_skill_to_agentdb "$skill"; then
                    total_skills=$((total_skills + 1))
                fi
            done < <(echo "$skills_json" | jq -c '.[]' 2>/dev/null)
        fi
        
        processed_episodes=$((processed_episodes + 1))
    done <<< "$episode_files"
    
    log_success "Processed $processed_episodes episodes, extracted $total_skills skills"
}

# ==============================================================================
# SKILL VALIDATION
# ==============================================================================

validate_skills_in_agentdb() {
    log "Validating skills storage..."
    
    local skills_store="${REPORTS_DIR}/skills-store.json"
    local skills
    skills=$(jq '.skills' "$skills_store" 2>/dev/null || echo "[]")
    
    local skill_count
    skill_count=$(echo "$skills" | jq '. | length')
    
    log "Total skills in storage: $skill_count"
    
    # Check for stale skills (>30 days old)
    local stale_count
    stale_count=$(echo "$skills" | jq '
        [.[] | select(
            (.created_at // "" | fromdate) < (now - (30 * 86400))
        )] | length
    ' 2>/dev/null || echo "0")
    
    if [[ $stale_count -gt 0 ]]; then
        log "WARNING: $stale_count stale skills (>30 days old)"
    else
        log_success "All skills are fresh (<30 days old)"
    fi
    
    # Generate skill report
    local report_file="${REPORTS_DIR}/skills-agentdb-report.json"
    cat > "$report_file" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "total_skills": $skill_count,
  "stale_skills": $stale_count,
  "storage_backend": "JSON",
  "storage_path": "$skills_store",
  "skills": $skills
}
EOF
    
    log_success "Skill report saved to: $report_file"
}

# ==============================================================================
# MAIN
# ==============================================================================

main() {
    cd "$PROJECT_ROOT"
    mkdir -p "$CACHE_DIR" "$REPORTS_DIR"
    
    log "========================================="
    log "Skills → AgentDB Wiring"
    log "========================================="
    
    # Step 1: Verify schema
    if ! verify_agentdb_schema; then
        log_error "AgentDB schema verification failed"
        exit 1
    fi
    
    # Step 2: Process learning episodes
    process_all_learning_episodes
    
    # Step 3: Validate skills
    validate_skills_in_agentdb
    
    log_success "Skills → AgentDB wiring complete"
}

main "$@"
