#!/usr/bin/env bash
#
# 10-verdict-classifier.sh
# Classifies execution verdict based on exit code and output
#
# Input: JSON context from stdin
# Output: Enhanced JSON with verdict and confidence

set -euo pipefail

# Read context from stdin
CONTEXT="$(cat)"

# Extract exit code
EXIT_CODE="$(echo "$CONTEXT" | grep -o '"exit_code": *"[^"]*"' | cut -d'"' -f4)"

# Classify verdict
if [ "$EXIT_CODE" = "0" ]; then
    VERDICT="success"
    CONFIDENCE=0.95
elif [ "$EXIT_CODE" = "unknown" ]; then
    VERDICT="unknown"
    CONFIDENCE=0.0
else
    VERDICT="failure"
    CONFIDENCE=0.9
fi

# Enhance context with verdict
echo "$CONTEXT" | jq --arg verdict "$VERDICT" --argjson confidence $CONFIDENCE \
    '. + {verdict: $verdict, confidence: $confidence}'
