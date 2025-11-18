#!/usr/bin/env bash
set -euo pipefail

# Daily Upstream Update Checker
# Reviews updates from critical dependencies and repositories
# Can be scheduled via cron: 0 9 * * * /path/to/check_upstream_updates.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_FILE="${PROJECT_ROOT}/logs/upstream_updates_$(date +%Y%m%d).md"
SUMMARY_FILE="${PROJECT_ROOT}/logs/upstream_updates_latest.md"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')]${NC} $1"
}

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << EOF
# Upstream Updates Report
**Generated:** $(date -u +'%Y-%m-%d %H:%M:%S UTC')

## Summary

EOF
}

# Check npm package updates
check_npm_updates() {
    log "Checking npm package updates..."
    
    cd "$PROJECT_ROOT"
    
    if [ ! -f "package.json" ]; then
        warn "No package.json found"
        return
    fi
    
    echo "### NPM Packages" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Check for outdated packages
    if command -v npm &> /dev/null; then
        npm outdated --json > /tmp/npm_outdated.json 2>/dev/null || true
        
        if [ -s /tmp/npm_outdated.json ]; then
            local updates=$(cat /tmp/npm_outdated.json | jq -r 'to_entries | length')
            
            if [ "$updates" -gt 0 ]; then
                warn "Found $updates outdated npm packages"
                echo "**Status:** 🟡 $updates packages have updates available" >> "$REPORT_FILE"
                echo "" >> "$REPORT_FILE"
                echo "| Package | Current | Latest | Type |" >> "$REPORT_FILE"
                echo "|---------|---------|--------|------|" >> "$REPORT_FILE"
                
                cat /tmp/npm_outdated.json | jq -r 'to_entries[] | "| \(.key) | \(.value.current) | \(.value.latest) | \(if .value.wanted != .value.latest then "major" else "minor" end) |"' >> "$REPORT_FILE"
                
                echo "" >> "$REPORT_FILE"
                echo "**Action:** Run \`npm update\` for minor/patch, \`npm install <pkg>@latest\` for major" >> "$REPORT_FILE"
            else
                log "All npm packages up to date"
                echo "**Status:** ✅ All packages up to date" >> "$REPORT_FILE"
            fi
        else
            log "All npm packages up to date"
            echo "**Status:** ✅ All packages up to date" >> "$REPORT_FILE"
        fi
    else
        warn "npm not available"
        echo "**Status:** ⚠️ npm not available" >> "$REPORT_FILE"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Check Python package updates
check_python_updates() {
    log "Checking Python package updates..."
    
    cd "$PROJECT_ROOT"
    
    if [ ! -f "requirements.txt" ]; then
        warn "No requirements.txt found"
        return
    fi
    
    echo "### Python Packages" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Use pip list --outdated if available
    if command -v pip3 &> /dev/null; then
        local outdated=$(pip3 list --outdated --format=json 2>/dev/null || echo "[]")
        local count=$(echo "$outdated" | jq '. | length')
        
        if [ "$count" -gt 0 ]; then
            warn "Found $count outdated Python packages"
            echo "**Status:** 🟡 $count packages have updates available" >> "$REPORT_FILE"
            echo "" >> "$REPORT_FILE"
            echo "| Package | Current | Latest |" >> "$REPORT_FILE"
            echo "|---------|---------|--------|" >> "$REPORT_FILE"
            
            echo "$outdated" | jq -r '.[] | "| \(.name) | \(.version) | \(.latest_version) |"' >> "$REPORT_FILE"
            
            echo "" >> "$REPORT_FILE"
            echo "**Action:** Run \`pip3 install --upgrade <package>\`" >> "$REPORT_FILE"
        else
            log "All Python packages up to date"
            echo "**Status:** ✅ All packages up to date" >> "$REPORT_FILE"
        fi
    else
        warn "pip3 not available"
        echo "**Status:** ⚠️ pip3 not available" >> "$REPORT_FILE"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Check git upstream updates for tracked repos
check_git_upstream() {
    log "Checking git upstream updates..."
    
    echo "### Git Repositories" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    cd "$PROJECT_ROOT"
    
    # Check if current repo has upstream
    if git remote | grep -q upstream; then
        log "Fetching upstream..."
        git fetch upstream --quiet 2>/dev/null || warn "Failed to fetch upstream"
        
        # Get current branch
        local current_branch=$(git rev-parse --abbrev-ref HEAD)
        local upstream_branch="upstream/$current_branch"
        
        if git rev-parse "$upstream_branch" &>/dev/null; then
            local behind=$(git rev-list --count HEAD.."$upstream_branch" 2>/dev/null || echo "0")
            
            if [ "$behind" -gt 0 ]; then
                warn "Current repo is $behind commits behind upstream"
                echo "**Status:** 🟡 Behind upstream by $behind commits" >> "$REPORT_FILE"
                echo "" >> "$REPORT_FILE"
                
                # List commits
                echo "**Recent upstream commits:**" >> "$REPORT_FILE"
                echo '```' >> "$REPORT_FILE"
                git log --oneline HEAD.."$upstream_branch" --max-count=10 >> "$REPORT_FILE" 2>/dev/null || true
                echo '```' >> "$REPORT_FILE"
                
                echo "" >> "$REPORT_FILE"
                echo "**Action:** Review commits and run \`git pull upstream $current_branch\`" >> "$REPORT_FILE"
            else
                log "Current repo is up to date with upstream"
                echo "**Status:** ✅ Up to date with upstream" >> "$REPORT_FILE"
            fi
        else
            warn "Upstream branch not found"
            echo "**Status:** ⚠️ Upstream branch not configured" >> "$REPORT_FILE"
        fi
    else
        log "No upstream remote configured"
        echo "**Status:** ℹ️ No upstream remote configured" >> "$REPORT_FILE"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Check for security vulnerabilities
check_security() {
    log "Checking for security vulnerabilities..."
    
    echo "### Security Vulnerabilities" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    cd "$PROJECT_ROOT"
    
    # npm audit
    if [ -f "package.json" ] && command -v npm &> /dev/null; then
        log "Running npm audit..."
        
        if npm audit --json > /tmp/npm_audit.json 2>/dev/null; then
            local vulnerabilities=$(cat /tmp/npm_audit.json | jq '.metadata.vulnerabilities | (.info + .low + .moderate + .high + .critical)')
            
            if [ "$vulnerabilities" -gt 0 ]; then
                local critical=$(cat /tmp/npm_audit.json | jq '.metadata.vulnerabilities.critical')
                local high=$(cat /tmp/npm_audit.json | jq '.metadata.vulnerabilities.high')
                
                if [ "$critical" -gt 0 ] || [ "$high" -gt 0 ]; then
                    error "Found $critical critical and $high high severity vulnerabilities"
                    echo "**Status:** 🔴 **CRITICAL** - $vulnerabilities vulnerabilities found" >> "$REPORT_FILE"
                else
                    warn "Found $vulnerabilities low/moderate vulnerabilities"
                    echo "**Status:** 🟡 $vulnerabilities vulnerabilities found" >> "$REPORT_FILE"
                fi
                
                echo "" >> "$REPORT_FILE"
                echo "**Breakdown:**" >> "$REPORT_FILE"
                cat /tmp/npm_audit.json | jq -r '.metadata.vulnerabilities | "- Critical: \(.critical)\n- High: \(.high)\n- Moderate: \(.moderate)\n- Low: \(.low)"' >> "$REPORT_FILE"
                
                echo "" >> "$REPORT_FILE"
                echo "**Action:** Run \`npm audit fix\` or review with \`npm audit\`" >> "$REPORT_FILE"
            else
                log "No npm vulnerabilities found"
                echo "**Status:** ✅ No vulnerabilities found" >> "$REPORT_FILE"
            fi
        else
            # npm audit returns non-zero if vulnerabilities found
            local audit_exit=$?
            if [ $audit_exit -eq 1 ]; then
                warn "npm audit found issues (likely vulnerabilities)"
                echo "**Status:** 🟡 Vulnerabilities detected - run \`npm audit\` for details" >> "$REPORT_FILE"
            fi
        fi
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Check GitHub Actions updates
check_github_actions() {
    log "Checking GitHub Actions updates..."
    
    echo "### GitHub Actions" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    local workflows_dir="${PROJECT_ROOT}/.github/workflows"
    
    if [ -d "$workflows_dir" ]; then
        local outdated_actions=()
        
        # Scan workflow files for action versions
        while IFS= read -r workflow; do
            # Look for actions using @v* versions
            local actions=$(grep -o '[^/]*/[^@]*@v[0-9]*' "$workflow" 2>/dev/null || true)
            
            if [ -n "$actions" ]; then
                while IFS= read -r action; do
                    outdated_actions+=("$action (in $(basename "$workflow"))")
                done <<< "$actions"
            fi
        done < <(find "$workflows_dir" -name "*.yml" -o -name "*.yaml")
        
        if [ ${#outdated_actions[@]} -gt 0 ]; then
            warn "Found ${#outdated_actions[@]} GitHub Actions to review"
            echo "**Status:** ℹ️ ${#outdated_actions[@]} actions found (manual review recommended)" >> "$REPORT_FILE"
            echo "" >> "$REPORT_FILE"
            
            for action in "${outdated_actions[@]}"; do
                echo "- $action" >> "$REPORT_FILE"
            done
            
            echo "" >> "$REPORT_FILE"
            echo "**Action:** Check latest versions at https://github.com/<org>/<repo>/releases" >> "$REPORT_FILE"
        else
            log "No GitHub Actions workflows found or all use latest versions"
            echo "**Status:** ✅ No outdated actions detected" >> "$REPORT_FILE"
        fi
    else
        echo "**Status:** ℹ️ No .github/workflows directory" >> "$REPORT_FILE"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Generate summary
generate_summary() {
    log "Generating summary..."
    
    echo "## Recommendations" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "1. Review all 🔴 critical and 🟡 high-priority updates immediately" >> "$REPORT_FILE"
    echo "2. Schedule maintenance window for major version upgrades" >> "$REPORT_FILE"
    echo "3. Test updates in development/staging before production" >> "$REPORT_FILE"
    echo "4. Subscribe to security advisories for critical dependencies" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "---" >> "$REPORT_FILE"
    echo "*Next check: $(date -v+1d +'%Y-%m-%d' 2>/dev/null || date -d '+1 day' +'%Y-%m-%d' 2>/dev/null || echo 'tomorrow')*" >> "$REPORT_FILE"
    
    # Copy to latest
    cp "$REPORT_FILE" "$SUMMARY_FILE"
    
    log "Report saved: $REPORT_FILE"
    log "Latest summary: $SUMMARY_FILE"
}

# Send notification (optional)
send_notification() {
    local critical_found=false
    
    # Check if there are critical issues
    if grep -q "🔴" "$REPORT_FILE"; then
        critical_found=true
    fi
    
    if [ "$critical_found" = true ]; then
        error "CRITICAL UPDATES REQUIRED - Review $REPORT_FILE"
        
        # If using mail command (optional)
        if command -v mail &> /dev/null && [ -n "${UPSTREAM_CHECK_EMAIL:-}" ]; then
            log "Sending email notification to $UPSTREAM_CHECK_EMAIL"
            mail -s "CRITICAL: Upstream Updates Required" "$UPSTREAM_CHECK_EMAIL" < "$REPORT_FILE"
        fi
    fi
}

# Main execution
main() {
    log "Starting daily upstream update check..."
    
    # Create logs directory
    mkdir -p "${PROJECT_ROOT}/logs"
    
    # Initialize report
    init_report
    
    # Run all checks
    check_npm_updates
    check_python_updates
    check_git_upstream
    check_security
    check_github_actions
    
    # Generate summary
    generate_summary
    
    # Send notification if needed
    send_notification
    
    log "Update check complete!"
    
    # Display summary
    echo ""
    echo "=================================="
    cat "$SUMMARY_FILE"
    echo "=================================="
}

# Handle arguments
case "${1:-run}" in
    run)
        main
        ;;
    report)
        cat "$SUMMARY_FILE" 2>/dev/null || echo "No report available. Run: $0"
        ;;
    install-cron)
        # Install daily cron job at 9 AM
        (crontab -l 2>/dev/null | grep -v check_upstream_updates.sh; echo "0 9 * * * $SCRIPT_DIR/check_upstream_updates.sh > /dev/null 2>&1") | crontab -
        log "Installed daily cron job (9 AM)"
        ;;
    *)
        echo "Usage: $0 {run|report|install-cron}"
        exit 1
        ;;
esac
