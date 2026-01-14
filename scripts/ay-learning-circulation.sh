#!/bin/bash
# ay-learning-circulation.sh
# Bridge between learning capture and agentdb persistence
# Reads learned skills from retrospective analysis and stores them durably
#
# Usage: ./scripts/ay-learning-circulation.sh [--circle CIRCLE] [--ceremony CEREMONY] [--iteration N]
#
# Co-Authored-By: Warp <agent@warp.dev>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
CIRCLE="${1:-orchestrator}"
CEREMONY="${2:-standup}"
ITERATION="${3:-$(date +%s)}"
AGENTDB_PATH="${ROOT_DIR}/agentdb.db"
LEARNING_DIR="${ROOT_DIR}/.ay-learning"
CACHE_DIR="${ROOT_DIR}/.cache"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

mkdir -p "$LEARNING_DIR"

# ═══════════════════════════════════════════════════════════════════════════
# FUNCTIONS (defined first so they can be called from main logic)
# ═══════════════════════════════════════════════════════════════════════════

insert_skill() {
    local skill_name="$1"
    local circle="$2"
    local ceremony="$3"
    local confidence="$4"
    
    # Sanitize skill name
    skill_name=$(echo "$skill_name" | sed 's/"//g' | sed "s/'//g")
    
    if [[ -z "$skill_name" ]]; then
        return
    fi
    
    # Check if skill exists
    local existing=$(sqlite3 "$AGENTDB_PATH" \
        "SELECT id FROM skills WHERE skill_name='$skill_name' AND circle='$circle' LIMIT 1;" 2>/dev/null || echo "")
    
    if [[ -n "$existing" ]]; then
        # Update existing skill
        sqlite3 "$AGENTDB_PATH" \
            "UPDATE skills SET proficiency=$confidence, last_used=$(date +%s), usage_count=usage_count+1 WHERE skill_name='$skill_name' AND circle='$circle';" 2>/dev/null || true
        echo -e "${BLUE}  ✓ Updated: $skill_name (confidence: $confidence)${NC}"
    else
        # Insert new skill
        sqlite3 "$AGENTDB_PATH" \
            "INSERT INTO skills (skill_name, circle, ceremony, proficiency, learned_at, last_used, usage_count) VALUES ('$skill_name', '$circle', '$ceremony', $confidence, $(date +%s), $(date +%s), 1);" 2>/dev/null || true
        echo -e "${GREEN}  + Created: $skill_name (confidence: $confidence)${NC}"
    fi
}

retrieve_learned_skills() {
    local circle="$1"
    
    # Query high-confidence skills
    local skills=$(sqlite3 "$AGENTDB_PATH" \
        "SELECT skill_name, proficiency FROM skills WHERE circle='$circle' AND proficiency >= 0.7 ORDER BY proficiency DESC LIMIT 10;" 2>/dev/null || echo "")
    
    if [[ -z "$skills" ]]; then
        echo -e "${YELLOW}  No high-confidence skills available yet${NC}"
        return
    fi
    
    echo -e "${GREEN}High-confidence skills available for $circle:${NC}"
    
    # Create JSON output for context injection
    local skills_json="["
    local first=true
    
    while IFS='|' read -r skill_name proficiency; do
        if [[ -z "$skill_name" ]]; then
            continue
        fi
        
        if [[ "$first" == false ]]; then
            skills_json+=","
        fi
        skills_json+="{\"name\":\"$skill_name\",\"confidence\":$proficiency}"
        first=false
        pct=$(echo "$proficiency * 100" | bc -l 2>/dev/null | cut -d. -f1)
        echo -e "${GREEN}  ✓ $skill_name (${pct}% confidence)${NC}"
    done <<< "$skills"
    
    skills_json+="]"
    
    # Save to file for context injection
    echo "$skills_json" > "$LEARNING_DIR/available-skills-$CIRCLE.json"
    echo -e "${GREEN}✓ Saved to $LEARNING_DIR/available-skills-$CIRCLE.json${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN LOGIC: Process learning outputs and retrieve skills
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}Learning Circulation: Retrospective → AgentDB${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}→${NC} Searching for learning outputs..."

LEARNING_FILES=$(find "$CACHE_DIR" -name "learning-retro-*.json" -type f 2>/dev/null | sort -r | head -5)

if [[ -z "$LEARNING_FILES" ]]; then
    echo -e "${RED}✗ No learning files found in $CACHE_DIR${NC}"
    exit 1
fi

TOTAL_SKILLS=0
TOTAL_CONFIDENCE=0
HIGH_CONFIDENCE_SKILLS=0

while IFS= read -r learning_file; do
    if [[ ! -f "$learning_file" ]]; then
        continue
    fi
    
    echo -e "${BLUE}Processing: $(basename "$learning_file")${NC}"
    
    # Extract skills from learning output
    if jq . "$learning_file" >/dev/null 2>&1; then
        # Try patterns first, then fall back to skills array
        skills=$(jq -r '.patterns[]?.name' "$learning_file" 2>/dev/null | grep -v '^null$' | head -10 || true)
        
        if [[ -z "$skills" ]]; then
            # Fall back to .skills[] array
            skills=$(jq -r '.skills[]?' "$learning_file" 2>/dev/null | grep -v '^null$' | head -10 || true)
        fi
        
        if [[ -n "$skills" ]]; then
            while IFS= read -r skill_name; do
                if [[ -z "$skill_name" ]] || [[ "$skill_name" == "null" ]]; then
                    continue
                fi
                
                # Try to get confidence from patterns, default to 0.8
                confidence=$(jq -r ".patterns[] | select(.name==\"$skill_name\") | .confidence" "$learning_file" 2>/dev/null | grep -v '^null$' | head -1 || echo "0.8")
                if [[ -z "$confidence" ]] || [[ "$confidence" == "null" ]]; then
                    # Query confidence from skills JSON store
                    local skills_store="${PROJECT_ROOT}/reports/skills-store.json"
                    if [[ -f "$skills_store" ]]; then
                        confidence=$(jq -r --arg name "$pattern" '.skills[] | select(.name == $name) | .success_rate // 0.8' "$skills_store" 2>/dev/null || echo "0.8")
                    else
                        confidence="0.8"  # Fallback
                    fi
                fi
                
                # Insert into agentdb (function defined above)
                insert_skill "$skill_name" "$CIRCLE" "$CEREMONY" "$confidence"
                
                ((TOTAL_SKILLS++)) || true
                if (( $(echo "$confidence >= 0.7" | bc -l 2>/dev/null) )); then
                    ((HIGH_CONFIDENCE_SKILLS++)) || true
                fi
                
            done <<< "$skills"
        fi
    fi
done <<< "$LEARNING_FILES"

echo ""
echo -e "${GREEN}✓ Circulation complete${NC}"
echo -e "${GREEN}  Total skills stored: $TOTAL_SKILLS${NC}"
echo -e "${GREEN}  High confidence: $HIGH_CONFIDENCE_SKILLS${NC}"

echo ""
echo -e "${YELLOW}→${NC} Retrieving high-confidence skills for next iteration..."

retrieve_learned_skills "$CIRCLE"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}Circulation cycle complete${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
