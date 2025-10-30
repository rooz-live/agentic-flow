#!/bin/bash
# Batch Calibration Collection Script
# Safely collect 10,000+ PRs in batches to avoid database corruption

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo "===================================================================="
echo "Batch Calibration Collection - BLOCKER-001 Resolution"
echo "===================================================================="
echo ""

# Configuration
BATCH_SIZE=500
REPOS=(
    "kubernetes/kubernetes:3500"
    "facebook/react:2500"
    "microsoft/vscode:2000"
    "nodejs/node:1500"
    "tensorflow/tensorflow:500"
)

total_target=0
for repo_spec in "${REPOS[@]}"; do
    target="${repo_spec##*:}"
    total_target=$((total_target + target))
done

echo "Collection Strategy:"
echo "  Batch size: $BATCH_SIZE PRs per iteration"
echo "  Total target: $total_target PRs"
echo "  Repositories: ${#REPOS[@]}"
echo ""

# Function to collect from repository in batches
collect_repo() {
    local repo_spec="$1"
    local repo="${repo_spec%%:*}"
    local target="${repo_spec##*:}"
    
    echo ""
    echo "========================================"
    echo "Repository: $repo"
    echo "Target: $target PRs"
    echo "========================================"
    
    local collected=0
    local iteration=1
    
    while [ $collected -lt $target ]; do
        local batch_target=$BATCH_SIZE
        local remaining=$((target - collected))
        
        if [ $remaining -lt $BATCH_SIZE ]; then
            batch_target=$remaining
        fi
        
        echo ""
        echo "  Iteration $iteration: collecting $batch_target PRs (total: $collected/$target)"
        
        if python3 scripts/ci/enhanced_calibration_pipeline.py \
            --repository "$repo" \
            --target-per-repo "$batch_target" 2>&1 | tee -a logs/batch_collection_${repo//\//_}.log; then
            
            collected=$((collected + batch_target))
            iteration=$((iteration + 1))
            
            # Check current database count
            current_count=$(sqlite3 .agentdb/agentdb.sqlite \
                "SELECT COUNT(*) FROM calibration_prs WHERE repository='$repo'" 2>/dev/null || echo "0")
            echo "  ✓ Database count for $repo: $current_count"
            
            # Brief pause between batches
            sleep 2
        else
            echo "  ⚠ Batch failed, retrying in 10 seconds..."
            sleep 10
        fi
    done
    
    echo "  ✓ Completed $repo: $collected/$target PRs"
}

# Create logs directory
mkdir -p logs

# Collect from each repository
for repo_spec in "${REPOS[@]}"; do
    collect_repo "$repo_spec"
done

echo ""
echo "===================================================================="
echo "Collection Complete - Running Final Validation"
echo "===================================================================="
echo ""

# Run validation
python3 scripts/ci/enhanced_calibration_pipeline.py --validate-only

echo ""
echo "===================================================================="
echo "Database Statistics"
echo "===================================================================="

sqlite3 .agentdb/agentdb.sqlite << EOF
.mode column
.headers on

SELECT 
    repository,
    COUNT(*) as pr_count,
    ROUND(AVG(risk_score), 3) as avg_risk,
    ROUND(AVG(complexity_score), 3) as avg_complexity,
    ROUND(AVG(success_prediction), 3) as avg_success
FROM calibration_prs
GROUP BY repository
ORDER BY pr_count DESC;

SELECT '' as separator;

SELECT 'TOTAL' as repository, COUNT(*) as pr_count FROM calibration_prs;
EOF

echo ""
echo "===================================================================="
echo "Next Steps"
echo "===================================================================="
echo ""
echo "If accuracy ≥90%:"
echo "  Phase 1C: Deploy TDD Metrics Framework"
echo "  Phase 1C: Deploy BEAM Dimension Mapper"
echo ""
