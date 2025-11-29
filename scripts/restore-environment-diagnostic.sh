#!/usr/bin/env bash
#
# restore-environment-diagnostic.sh
#
# Diagnostic script to validate restoration completeness
# Identifies missing components and potential data loss scenarios
#

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔍 Environment Restoration Diagnostic Audit"
echo "====================================="
echo ""

# Function to check directory existence and size
check_dir() {
    local dir="$1"
    local description="$2"
    
    if [ -d "$dir" ]; then
        local size=$(du -sh "$dir" 2>/dev/null | cut -f1)
        local files=$(find "$dir" -type f | wc -l)
        echo -e "${GREEN}✓${NC} $description: $dir ($size, $files files)"
        return 0
    else
        echo -e "${RED}✗${NC} $description: $dir (MISSING)"
        return 1
    fi
}

# Function to check critical files
check_file() {
    local file="$1"
    local description="$2"
    
    if [ -f "$file" ]; then
        local size=$(du -h "$file" 2>/dev/null | cut -f1)
        echo -e "${GREEN}✓${NC} $description: $file ($size)"
        return 0
    else
        echo -e "${RED}✗${NC} $description: $file (MISSING)"
        return 1
    fi
}

echo -e "${BLUE}=== Critical Infrastructure Components ===${NC}"
echo ""

# Check .goalie directory completeness
echo "🎯 .goalie Directory Analysis:"
check_dir ".goalie" "Governance tracking directory"

if [ -d ".goalie" ]; then
    echo "  Critical .goalie files:"
    check_file ".goalie/CONSOLIDATED_ACTIONS.yaml" "WSJF prioritized actions"
    check_file ".goalie/KANBAN_BOARD.yaml" "Kanban work tracking"
    check_file ".goalie/metrics_log.jsonl" "Performance metrics log"
    check_file ".goalie/pattern_metrics.jsonl" "Pattern recognition data"
    check_file ".goalie/cycle_log.jsonl" "BML cycle tracking"
    check_file ".goalie/insights_log.jsonl" "Learning insights"
    check_file ".goalie/ROAM_TRACKER.yaml" "Risk assessment"
    check_file ".goalie/OBSERVABILITY_ACTIONS.yaml" "Observability actions"
    
    echo "  Additional .goalie data:"
    yaml_files=$(find .goalie -name "*.yaml" | wc -l)
    jsonl_files=$(find .goalie -name "*.jsonl" | wc -l)
    echo "    YAML files: $yaml_files"
    echo "    JSONL files: $jsonl_files"
fi

echo ""

# Check .agentdb directory completeness
echo "🗄️ AgentDB Analysis:"
check_dir ".agentdb" "Agent database directory"

if [ -d ".agentdb" ]; then
    echo "  Critical AgentDB files:"
    check_file ".agentdb/agentdb.sqlite" "Primary database"
    
    # Check for backup files
    backup_files=$(find .agentdb -name "agentdb.sqlite.backup*" | wc -l)
    if [ $backup_files -gt 0 ]; then
        echo -e "${GREEN}✓${NC} Backup files found: $backup_files"
        find .agentdb -name "agentdb.sqlite.backup*" -exec echo "    {}" \;
    else
        echo -e "${YELLOW}⚠${NC} No backup files found"
    fi
    
    check_file ".agentdb/init_schema.sql" "Database schema"
    check_dir ".agentdb/hooks" "Database hooks"
    check_dir ".agentdb/plugins" "Database plugins"
fi

echo ""

# Check .claude directory
echo "🤖 Claude Configuration:"
check_dir ".claude" "Claude AI configuration"

if [ -d ".claude" ]; then
    echo "  Claude components:"
    check_file ".claude/settings.json" "Claude settings"
    check_dir ".claude/agents" "AI agents"
    check_dir ".claude/commands" "Command definitions"
    check_dir ".claude/skills" "Skill definitions"
fi

echo ""

# Check logs directory completeness
echo "📋 Logs Analysis:"
check_dir "logs" "System logs directory"

if [ -d "logs" ]; then
    echo "  Critical log files:"
    check_file "logs/governor_incidents.jsonl" "Governor incidents"
    check_file "logs/process_tree_snapshot.json" "Process state"
    
    echo "  Additional log directories:"
    check_dir "logs/governor-validation" "Governance validation"
    check_dir "logs/learning" "Learning events"
    check_dir "logs/governance" "Governance logs"
    
    # Count log files
    log_files=$(find logs -name "*.jsonl" | wc -l)
    log_dirs=$(find logs -type d | wc -l)
    echo "    JSONL files: $log_files"
    echo "    Log directories: $log_dirs"
fi

echo ""

# Check other critical directories
echo -e "${BLUE}=== Additional Infrastructure ===${NC}"
echo ""

check_dir "metrics" "Performance metrics"
check_dir "config" "Configuration files"
check_dir "tools" "Tool configurations"

echo ""

# Check .snapshots directory
echo "📸 Snapshot Analysis:"
check_dir ".snapshots" "Snapshot storage"

if [ -d ".snapshots" ]; then
    snapshots=$(find .snapshots -maxdepth 1 -type d | wc -l)
    echo "  Available snapshots: $snapshots"
    
    # Analyze most recent snapshot
    latest_snapshot=$(find .snapshots -maxdepth 1 -type d -exec stat -c "%Y %n" {} \; | sort -nr | head -1 | cut -d' ' -f2-)
    if [ -n "$latest_snapshot" ] && [ "$latest_snapshot" != ".snapshots" ]; then
        echo "  Latest snapshot: $(basename "$latest_snapshot")"
        
        echo "  Latest snapshot contents:"
        ls -la "$latest_snapshot" | head -10
    fi
fi

echo ""

# Risk Assessment
echo -e "${BLUE}=== Risk Assessment ===${NC}"
echo ""

# Calculate potential data loss risk
risk_score=0
risk_issues=()

if [ ! -d ".goalie" ]; then
    ((risk_score+=30))
    risk_issues+=("Missing entire .goalie governance data")
elif [ ! -f ".goalie/CONSOLIDATED_ACTIONS.yaml" ]; then
    ((risk_score+=15))
    risk_issues+=("Missing WSJF prioritized actions")
fi

if [ ! -d ".agentdb" ]; then
    ((risk_score+=25))
    risk_issues+=("Missing AgentDB database")
elif [ ! -f ".agentdb/agentdb.sqlite" ]; then
    ((risk_score+=20))
    risk_issues+=("Missing primary AgentDB file")
fi

if [ ! -f "logs/governor_incidents.jsonl" ]; then
    ((risk_score+=10))
    risk_issues+=("Missing governor incident log")
fi

if [ ! -d ".claude" ]; then
    ((risk_score+=5))
    risk_issues+=("Missing Claude configuration")
fi

echo "Risk Score: $risk_score/100"

if [ $risk_score -gt 50 ]; then
    echo -e "${RED}🚨 HIGH RISK: Critical data loss potential${NC}"
elif [ $risk_score -gt 25 ]; then
    echo -e "${YELLOW}⚠️ MEDIUM RISK: Significant functionality impact${NC}"
else
    echo -e "${GREEN}✅ LOW RISK: Minor functionality impact${NC}"
fi

if [ ${#risk_issues[@]} -gt 0 ]; then
    echo ""
    echo "Risk factors:"
    for issue in "${risk_issues[@]}"; do
        echo "  - $issue"
    done
fi

echo ""

# Recommendations
echo -e "${BLUE}=== Recommendations ===${NC}"
echo ""

echo "1. Ensure .goalie directory is completely backed up"
echo "2. Include AgentDB backup files in snapshots"
echo "3. Preserve Claude configuration for AI continuity"
echo "4. Backup all log subdirectories"
echo "5. Include metrics and config directories"
echo "6. Validate snapshot integrity before restoration"
echo "7. Test restoration procedures regularly"

echo ""

# Generate summary report
echo -e "${BLUE}=== Diagnostic Summary ===${NC}"
echo ""

echo "This diagnostic identifies critical gaps in environment restoration:"
echo ""
echo "PRIMARY CONCERNS:"
echo "  • Incomplete .goalie directory coverage"
echo "  • Missing AgentDB backup preservation"
echo "  • Insufficient log directory handling"
echo ""
echo "IMPACT ASSESSMENT:"
echo "  • Governance system data loss risk"
echo "  • Learning infrastructure disruption"
echo "  • Configuration drift potential"
echo ""
echo "Run this script before and after restoration to validate completeness."

echo ""
echo -e "${GREEN}Diagnostic complete!${NC}"