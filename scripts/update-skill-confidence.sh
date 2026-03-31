#!/usr/bin/env bash
# update-skill-confidence.sh - Update skill confidence based on outcomes
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILLS_STORE="$ROOT_DIR/reports/skills-store.json"

if [[ ! -f "$SKILLS_STORE" ]]; then
  echo "Skills store not found: $SKILLS_STORE"
  exit 1
fi

# Load current skills
SKILLS=$(cat "$SKILLS_STORE")

# Update confidence based on recent outcomes
# Formula: new_confidence = (old_confidence * 0.9) + (success_rate * 0.1)
# This provides exponential moving average

echo "$SKILLS" | jq '
  .skills |= map(
    . + {
      confidence: (
        (.success_rate * 0.1) + 
        ((.confidence // 0.5) * 0.9)
      )
    }
  ) | 
  .last_updated = (now | todate)
' > "$SKILLS_STORE.tmp"

mv "$SKILLS_STORE.tmp" "$SKILLS_STORE"
echo "Confidence updates applied to $SKILLS_STORE"
