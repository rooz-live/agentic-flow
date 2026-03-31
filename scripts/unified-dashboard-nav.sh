#!/usr/bin/env bash
# unified-dashboard-nav.sh
# Creates consistent navigation mesh between all dashboard elements
# Drill-down factors and hierarchical labels

set -euo pipefail

# Dashboard registry - all known dashboards
DASHBOARD_REGISTRY=(
    # Primary WSJF dashboards (hierarchical)
    "/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD/WSJF-LIVE.html:master:root"
    "/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD/WSJF-LIVE-V2-FULL.html:v2:backup"
    "/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD/WSJF-LIVE-V3.html:v3:archive"
    "/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD/WSJF-LIVE-V4-INTERACTIVE.html:v4:interactive"
    
    # Email dashboards
    "/private/tmp/WSJF-COMPREHENSIVE-LIVE.html:email-comprehensive:email"
    "/private/tmp/wsjf-email-dashboard.html:email-dashboard:email"
    
    # Mover/logistics dashboards
    "/private/tmp/mover-emails-complete.html:mover-emails:logistics"
    "/private/tmp/mover-emails-enhanced.html:mover-enhanced:logistics"
    "/private/tmp/mover-emails-FINAL.html:mover-final:logistics"
    "/private/tmp/mover-emails-personalized-v2.html:mover-personalized:logistics"
    "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/reports/MOVER-EMAILS-PERSONALIZED.html:mover-reports:logistics"
    
    # Coordinator dashboards
    "/private/tmp/master-coordinator-status.html:coordinator-status:coordination"
    "/private/tmp/thumbtack-outreach-enhanced.html:thumbtack-outreach:outreach"
)

# Navigation mesh structure
NAV_MESH_CATEGORIES=(
    "master:WSJF Master:primary navigation hub"
    "email:Email Center:email management and validation"
    "logistics:Move Logistics:mover coordination and outreach"
    "coordination:Coordinator Hub:swarm and agent management"
    "outreach:Supply Chain:thumbtack and vendor outreach"
    "archive:Archive:old dashboard versions"
)

# Drill-down factors
DRILL_DOWN_FACTORS=(
    "emails:recipient:role:status:validation-score"
    "movers:company:service:quote-status:availability"
    "wsjf:priority:now-next-later:capability:coherence"
    "agents:type:status:pid:last-check"
)

# Hierarchical mesh labels (%/# $.# format)
HIERARCHY_LABELS=(
    "%/# ROOT.MASTER.DASHBOARD:WSJF-LIVE.html"
    "%/# ROOT.MASTER.INTERACTIVE:WSJF-LIVE-V4-INTERACTIVE.html"
    "%/# ROOT.EMAIL.COMPREHENSIVE:WSJF-COMPREHENSIVE-LIVE.html"
    "%/# ROOT.EMAIL.DASHBOARD:wsjf-email-dashboard.html"
    "%/# ROOT.LOGISTICS.MOVER:MOVER-EMAILS-PERSONALIZED.html"
    "%/# ROOT.LOGISTICS.ENHANCED:mover-emails-enhanced.html"
    "%/# ROOT.COORD.MASTER:master-coordinator-status.html"
    "%/# ROOT.OUTREACH.THUMBTACK:thumbtack-outreach-enhanced.html"
)

# Navigation injection template
NAV_TEMPLATE='<!-- UNIFIED DASHBOARD NAVIGATION -->
<nav id="unified-nav" style="background: linear-gradient(135deg, #161b22 0%, #0d1117 100%); padding: 12px 20px; border-bottom: 2px solid #30363d; font-family: -apple-system, BlinkMacSystemFont, sans-serif; position: sticky; top: 0; z-index: 1000;">
    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <span style="color: #58a6ff; font-weight: 700; font-size: 14px; margin-right: 12px;">🧭 UNIFIED NAV</span>
        
        <!-- Master Section -->
        <div class="nav-section" style="display: flex; gap: 4px; padding: 0 8px; border-right: 1px solid #30363d;">
            <span style="color: #8b949e; font-size: 11px; text-transform: uppercase; margin-right: 8px;">Master</span>
            {{MASTER_LINKS}}
        </div>
        
        <!-- Email Section -->
        <div class="nav-section" style="display: flex; gap: 4px; padding: 0 8px; border-right: 1px solid #30363d;">
            <span style="color: #8b949e; font-size: 11px; text-transform: uppercase; margin-right: 8px;">Email</span>
            {{EMAIL_LINKS}}
        </div>
        
        <!-- Logistics Section -->
        <div class="nav-section" style="display: flex; gap: 4px; padding: 0 8px; border-right: 1px solid #30363d;">
            <span style="color: #8b949e; font-size: 11px; text-transform: uppercase; margin-right: 8px;">Logistics</span>
            {{LOGISTICS_LINKS}}
        </div>
        
        <!-- Coordination Section -->
        <div class="nav-section" style="display: flex; gap: 4px; padding: 0 8px;">
            <span style="color: #8b949e; font-size: 11px; text-transform: uppercase; margin-right: 8px;">Coord</span>
            {{COORD_LINKS}}
        </div>
    </div>
    
    <!-- Drill-down breadcrumbs -->
    <div id="nav-breadcrumbs" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #21262d; font-size: 11px; color: #8b949e;">
        {{BREADCRUMBS}}
    </div>
</nav>'

generate_nav_link() {
    local file="$1"
    local name="$2"
    local current="$3"
    
    if [[ "$file" == "$current" ]]; then
        echo "<a href=\"$file\" style=\"background: #238636; color: white; padding: 4px 10px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: 500;\">$name</a>"
    else
        echo "<a href=\"$file\" style=\"background: #21262d; color: #c9d1d9; padding: 4px 10px; border-radius: 4px; text-decoration: none; font-size: 12px;\">$name</a>"
    fi
}

# Function: Inject unified nav into dashboard
inject_unified_nav() {
    local dashboard_file="$1"
    local dashboard_name=$(basename "$dashboard_file")
    
    echo "Processing: $dashboard_name"
    
    # Generate section links
    local master_links=""
    local email_links=""
    local logistics_links=""
    local coord_links=""
    
    for entry in "${DASHBOARD_REGISTRY[@]}"; do
        IFS=: read -r file name category <<< "$entry"
        if [[ -f "$file" ]]; then
            case "$category" in
                root|backup|interactive|archive)
                    master_links="$master_links $(generate_nav_link "$file" "$name" "$dashboard_file")"
                    ;;
                email)
                    email_links="$email_links $(generate_nav_link "$file" "$name" "$dashboard_file")"
                    ;;
                logistics)
                    logistics_links="$logistics_links $(generate_nav_link "$file" "$name" "$dashboard_file")"
                    ;;
                coordination|outreach)
                    coord_links="$coord_links $(generate_nav_link "$file" "$name" "$dashboard_file")"
                    ;;
            esac
        fi
    done
    
    # Generate breadcrumbs based on hierarchy
    local breadcrumbs=""
    for label in "${HIERARCHY_LABELS[@]}"; do
        IFS=: read -r hierarchy path <<< "$label"
        if [[ "$dashboard_file" == *"$path"* ]]; then
            breadcrumbs="<span style=\"color: #58a6ff;\">$hierarchy</span>"
            break
        fi
    done
    [[ -z "$breadcrumbs" ]] && breadcrumbs="<span>%/# ROOT.UNKNOWN</span>"
    
    # Create nav HTML
    local nav_html="$NAV_TEMPLATE"
    nav_html="${nav_html//\{\{MASTER_LINKS\}\}/$master_links}"
    nav_html="${nav_html//\{\{EMAIL_LINKS\}\}/$email_links}"
    nav_html="${nav_html//\{\{LOGISTICS_LINKS\}\}/$logistics_links}"
    nav_html="${nav_html//\{\{COORD_LINKS\}\}/$coord_links}"
    nav_html="${nav_html//\{\{BREADCRUMBS\}\}/$breadcrumbs}"
    
    # Check if already has unified nav
    if grep -q "UNIFIED DASHBOARD NAVIGATION" "$dashboard_file" 2>/dev/null; then
        echo "  ✓ Already has unified nav"
        return 0
    fi
    
    # Inject after <body> tag
    if [[ -f "$dashboard_file" ]]; then
        # Create backup
        cp "$dashboard_file" "${dashboard_file}.nav-backup"
        
        # Use sed to inject after <body>
        awk -v nav="$nav_html" '
            /<body>/ {
                print
                print nav
                next
            }
            { print }
        ' "$dashboard_file" > "${dashboard_file}.tmp"
        
        mv "${dashboard_file}.tmp" "$dashboard_file"
        echo "  ✓ Injected unified navigation"
    fi
}

# Function: Create drill-down view
create_drill_down_view() {
    local category="$1"
    local factor="$2"
    
    echo "Creating drill-down: $category by $factor"
    
    # This would create a filtered view based on the drill-down factor
    # For now, just log the capability
    case "$category:$factor" in
        emails:recipient)
            echo "  Drill-down: Group emails by recipient"
            ;;
        emails:role)
            echo "  Drill-down: Group emails by role (Attorney, ADR, Tenant)"
            ;;
        emails:status)
            echo "  Drill-down: Group emails by status (draft/validated/sent)"
            ;;
        wsjf:priority)
            echo "  Drill-down: Group by WSJF NOW/NEXT/LATER"
            ;;
    esac
}

# Function: Red-Green-Refactor tracker
track_red_green_refactor() {
    local component="$1"
    local status="$2"  # RED, GREEN, REFACTOR
    local test_coverage="$3"
    
    local color
    case "$status" in
        RED) color="#da3633" ;;
        GREEN) color="#3fb950" ;;
        REFACTOR) color="#d29922" ;;
        *) color="#8b949e" ;;
    esac
    
    echo "<div class=\"rgr-tracker\" style=\"display: inline-flex; align-items: center; gap: 6px; background: #21262d; padding: 4px 10px; border-radius: 12px; font-size: 11px;\">" \
         "<span style=\"color: $color; font-weight: bold;\">● $status</span>" \
         "<span style=\"color: #8b949e;\">$component</span>" \
         "<span style=\"color: #58a6ff;\">${test_coverage}%</span>" \
         "</div>"
}

# Main
echo "=== Unified Dashboard Navigation Mesh ==="
echo ""
echo "Injecting consistent navigation into all dashboards..."
echo ""

for entry in "${DASHBOARD_REGISTRY[@]}"; do
    IFS=: read -r file name category <<< "$entry"
    if [[ -f "$file" ]]; then
        inject_unified_nav "$file"
    else
        echo "Missing: $file"
    fi
done

echo ""
echo "=== Navigation Mesh Complete ==="
echo ""
echo "Hierarchical Labels:"
for label in "${HIERARCHY_LABELS[@]}"; do
    echo "  $label"
done
echo ""
echo "Drill-Down Factors:"
for factor in "${DRILL_DOWN_FACTORS[@]}"; do
    echo "  $factor"
done
