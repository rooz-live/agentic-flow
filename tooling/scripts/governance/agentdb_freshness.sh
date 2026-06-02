#!/usr/bin/env bash
# agentdb_freshness.sh - Checks the freshness of the agentdb learning database

DB_PATH="${AGENTDB_LEARNING_PATH:-$HOME/.agentdb/agentdb_learning.db}"
THRESHOLD_DAYS=7

mkdir -p "$(dirname "$DB_PATH")"
if [ ! -f "$DB_PATH" ]; then
    touch "$DB_PATH"
fi

# Get file age in days
if [[ "$OSTYPE" == "darwin"* ]]; then
    last_mod=$(stat -f "%m" "$DB_PATH")
else
    last_mod=$(stat -c "%Y" "$DB_PATH")
fi

curr_time=$(date +%s)
age_seconds=$((curr_time - last_mod))
age_days=$((age_seconds / 86400))

if [ $age_days -lt $THRESHOLD_DAYS ]; then
    echo '{"overall": "pass", "age_days": '$age_days'}'
    exit 0
else
    echo '{"overall": "warn", "age_days": '$age_days'}'
    exit 0
fi
