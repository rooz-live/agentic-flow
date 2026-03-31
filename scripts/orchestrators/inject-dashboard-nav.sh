#!/bin/bash
# scripts/orchestrators/inject-dashboard-nav.sh
# Injects a unified cross-navigation header into all active dashboard HTML files

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Target directories to scan for dashboards
TARGET_DIRS=(
    "/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD"
    "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/reports"
    "/private/tmp"
)

# Shared navigation block to inject immediately after <body>
export NAV_BLOCK='
    <!-- AGENTIC-FLOW CROSS-NAVIGATION HEADER -->
    <nav style="background: rgba(20,20,30,0.9); padding: 15px 30px; border-bottom: 1px solid #333; display: flex; gap: 20px; font-family: system-ui; z-index: 1000; position: top; top: 0; left: 0; right: 0;">
        <span style="color: #888; font-weight: bold; margin-right: 20px;">FLOW UI //</span>
        <a href="file:///Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD/WSJF-LIVE.html" style="color: #4CAF50; text-decoration: none; font-weight: 500;">WSJF Master</a>
        <a href="file:///Users/shahroozbhopti/Documents/code/investing/agentic-flow/reports/dashboard-registry.json" style="color: #2196F3; text-decoration: none; font-weight: 500;">Dashboard Registry</a>
        <a href="file:///private/tmp/mover-emails-enhanced.html" style="color: #FF9800; text-decoration: none; font-weight: 500;">Move Logistics</a>
        <a href="file:///private/tmp/trial-validation-report.html" style="color: #9C27B0; text-decoration: none; font-weight: 500;">Trial Eval</a>
        <a href="file:///private/tmp/thumbtack-outreach-enhanced.html" style="color: #E91E63; text-decoration: none; font-weight: 500;">Supply Chain</a>
    </nav>
'

inject_count=0

# CSQBM Governance Constraint: Bind HTML Dashboard UI injections
[ -f "$PROJECT_ROOT/scripts/validation-core.sh" ] && source "$PROJECT_ROOT/scripts/validation-core.sh" || true

echo "[*] Scanning for HTML dashboards..."

for dir in "${TARGET_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "[-] Skipping missing directory: $dir"
        continue
    fi

    # Find HTML files and modify them
    while IFS= read -r -d '' file; do
        # Skips to idempotency - check if nav is already injected
        if grep -q "AGENTIC-FLOW CROSS-NAVIGATION HEADER" "$file"; then
            echo "[-] Skipping (already injected): $file"
            continue
        fi

        # Verify it has a body tag to mount to
        if grep -qi "<body" "$file"; then
            echo "[+] Injecting NAV into: $file"
            perl -0777 -pi -e 's/(<body[^>]*>)/$1\n$ENV{NAV_BLOCK}/i' "$file"
            ((inject_count++))
        fi
    done < <(find "$dir" -maxdepth 1 -name "*.html" -print0)
done

echo "[*] Injection complete. Upgraded $inject_count dashboards with cross-navigation."
