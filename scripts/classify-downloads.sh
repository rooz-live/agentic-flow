#!/usr/bin/env bash
# Quick batch classification of court filing PDFs
# Usage: ./scripts/classify-downloads.sh

set -euo pipefail

echo "📋 Classifying 6 court filing PDFs in ~/Downloads/"
echo ""

cd ~/Downloads

count=0
for f in 26CV007491-590*.pdf; do
    count=$((count + 1))
    echo "[$count/6] Classifying: $f"
    
    # Run classification and extract key info
    result=$(python3 ~/Documents/code/investing/agentic-flow/scripts/pdf_classifier_multi_provider.py "$PWD/$f" 2>&1)
    
    # Extract type and confidence
    type=$(echo "$result" | grep "📄 Type:" | sed 's/.*Type: //')
    confidence=$(echo "$result" | grep "✓ Confidence:" | sed 's/.*Confidence: //')
    provider=$(echo "$result" | grep "🤖 Provider:" | sed 's/.*Provider: //')
    
    echo "   Type: $type | Confidence: $confidence | Provider: $provider"
    echo ""
done

echo "✅ All 6 PDFs classified"
echo ""
echo "Next: Run 'advocate session restore' to see updated stats"
