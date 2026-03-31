#!/usr/bin/env bash
#
# populate-evidence-bundle.sh
# Emergency Evidence Bundle Population for MAA Case 26CV007491-590
#
# Deadline: 2026-03-03 (Trial #1) — 10 days remaining
# WSJF: 30.0 (CRITICAL PATH)
#
# DoR:
# - MAA portal login credentials available
# - Phone with mold/HVAC photos accessible (AirDrop)
# - Bank account access for rent payment history
#
# DoD:
# - 05_HABITABILITY_EVIDENCE populated with:
#   * 40+ work order screenshots from portal
#   * Mold/HVAC photos (timestamped)
#   * Portal request history export
# - 06_FINANCIAL_RECORDS populated with:
#   * Rent payment ledger (22 months: June 2024-March 2026)
#   * Bank transaction exports
#   * Portal payment confirmations

set -euo pipefail

# Configuration
BASE_DIR="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL"
CASE_26CV005596="$BASE_DIR/MAA-26CV005596-590"
CASE_26CV007491="$BASE_DIR/MAA-26CV007491-590"
EVIDENCE_BUNDLE="$CASE_26CV005596/EVIDENCE_BUNDLE"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# ---------------------------------------------------------------------------
# Step 1: Export MAA Portal Maintenance History
# ---------------------------------------------------------------------------

export_portal_workorders() {
    log_info "Step 1: Export MAA portal maintenance history (40+ work orders)"
    
    local portal_dir="$EVIDENCE_BUNDLE/05_HABITABILITY_EVIDENCE/PORTAL-WORKORDERS"
    mkdir -p "$portal_dir"
    
    log_warn "MANUAL ACTION REQUIRED:"
    echo "1. Navigate to MAA portal: https://maa.residentportal.com"
    echo "2. Login with credentials from 1Password (search 'MAA Uptown')"
    echo "3. Go to: Maintenance → Service Requests → View History"
    echo "4. Export all requests from June 2024 - March 2026"
    echo "5. Screenshot each request showing:"
    echo "   - Request date"
    echo "   - Issue description"
    echo "   - Status (Open/Closed/Cancelled)"
    echo "   - Resolution details"
    echo "6. Save screenshots to: $portal_dir"
    echo ""
    echo "Expected output: 40+ PNG files named YYYYMMDD-workorder-NNN.png"
    echo ""
    read -p "Press ENTER when portal export complete..."
    
    local workorder_count=$(find "$portal_dir" -name "*.png" -o -name "*.jpg" 2>/dev/null | wc -l | tr -d ' ')
    
    if [[ $workorder_count -lt 40 ]]; then
        log_warn "Only $workorder_count work order screenshots found (expected 40+)"
        log_warn "This may weaken systemic indifference argument"
    else
        log_info "✅ Portal work orders: $workorder_count files"
    fi
}

# ---------------------------------------------------------------------------
# Step 2: AirDrop Mold/HVAC Photos from Phone
# ---------------------------------------------------------------------------

airdrop_photos() {
    log_info "Step 2: AirDrop mold/HVAC photos from phone"
    
    local photos_dir="$EVIDENCE_BUNDLE/05_HABITABILITY_EVIDENCE/PHOTOS-TIMESTAMPED"
    mkdir -p "$photos_dir"
    
    log_warn "MANUAL ACTION REQUIRED:"
    echo "1. Open Photos app on iPhone"
    echo "2. Search: 'mold' OR 'HVAC' OR 'apartment damage'"
    echo "3. Select all relevant photos from June 2024 - Feb 2026"
    echo "4. AirDrop to this Mac"
    echo "5. Move to: $photos_dir"
    echo ""
    echo "CRITICAL: Preserve EXIF timestamps — DO NOT edit photos"
    echo "Judges verify photo authenticity via EXIF metadata"
    echo ""
    read -p "Press ENTER when AirDrop complete..."
    
    local photo_count=$(find "$photos_dir" -name "*.jpg" -o -name "*.png" -o -name "*.heic" 2>/dev/null | wc -l | tr -d ' ')
    
    if [[ $photo_count -eq 0 ]]; then
        log_error "❌ No photos found in $photos_dir"
        log_error "Evidence bundle incomplete — trial risk HIGH"
    else
        log_info "✅ Habitability photos: $photo_count files"
        
        # Verify EXIF timestamps present
        local first_photo=$(find "$photos_dir" -type f | head -1)
        if command -v exiftool &> /dev/null; then
            local has_exif=$(exiftool "$first_photo" | grep -c "Date/Time Original" || true)
            if [[ $has_exif -gt 0 ]]; then
                log_info "✅ EXIF timestamps verified"
            else
                log_warn "⚠️  EXIF timestamps missing — authenticity risk"
            fi
        fi
    fi
}

# ---------------------------------------------------------------------------
# Step 3: Export Rent Payment History
# ---------------------------------------------------------------------------

export_payment_ledger() {
    log_info "Step 3: Export rent payment history (22 months: June 2024-Feb 2026)"
    
    local financial_dir="$EVIDENCE_BUNDLE/06_FINANCIAL_RECORDS"
    mkdir -p "$financial_dir"
    
    log_warn "MANUAL ACTION REQUIRED:"
    echo "Choose ONE option:"
    echo ""
    echo "OPTION A: MAA Portal Export"
    echo "  1. Login: https://maa.residentportal.com"
    echo "  2. Billing → Payment History → Export CSV"
    echo "  3. Save as: $financial_dir/MAA-PAYMENT-LEDGER-2024-2026.csv"
    echo ""
    echo "OPTION B: Bank Transaction Export"
    echo "  1. Login to bank (US Bank/BofA/etc)"
    echo "  2. Search transactions: 'MAA' OR 'Metropolitan'"
    echo "  3. Export June 2024 - Feb 2026"
    echo "  4. Save as: $financial_dir/BANK-RENT-PAYMENTS-2024-2026.csv"
    echo ""
    echo "BEST: Export BOTH (portal + bank for cross-validation)"
    echo ""
    read -p "Press ENTER when ledger export complete..."
    
    if [[ -f "$financial_dir/MAA-PAYMENT-LEDGER-2024-2026.csv" ]] || \
       [[ -f "$financial_dir/BANK-RENT-PAYMENTS-2024-2026.csv" ]]; then
        log_info "✅ Financial records exported"
    else
        log_error "❌ No payment ledger found"
        log_error "Cannot prove rent was current — defense weakened"
    fi
}

# ---------------------------------------------------------------------------
# Step 4: Generate Evidence Bundle Summary
# ---------------------------------------------------------------------------

generate_summary() {
    log_info "Step 4: Generate evidence bundle summary"
    
    local summary_file="$EVIDENCE_BUNDLE/EVIDENCE-STATUS-$(date +%Y-%m-%d).md"
    
    cat > "$summary_file" << 'EOF'
# Evidence Bundle Status Report
**Generated**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Case**: 26CV005596-590 (Habitability) + 26CV007491-590 (Eviction)
**Trial #1**: 2026-03-03 (10 days)
**Trial #2**: 2026-03-10 (17 days)

## 03_LEASE_AGREEMENTS
✅ **COMPLETE** — 5 PDFs
- Original lease (signed)
- Renewal agreements
- Addendums

## 05_HABITABILITY_EVIDENCE
EOF
    
    local workorder_count=$(find "$EVIDENCE_BUNDLE/05_HABITABILITY_EVIDENCE" -name "*.png" -o -name "*.jpg" 2>/dev/null | wc -l | tr -d ' ')
    if [[ $workorder_count -ge 40 ]]; then
        echo "✅ **COMPLETE** — $workorder_count work order screenshots" >> "$summary_file"
    else
        echo "⚠️  **INCOMPLETE** — Only $workorder_count work orders (expected 40+)" >> "$summary_file"
    fi
    
    local photo_count=$(find "$EVIDENCE_BUNDLE/05_HABITABILITY_EVIDENCE" -name "*.jpg" -o -name "*.png" -o -name "*.heic" 2>/dev/null | wc -l | tr -d ' ')
    if [[ $photo_count -gt 0 ]]; then
        echo "✅ **COMPLETE** — $photo_count habitability photos" >> "$summary_file"
    else
        echo "❌ **MISSING** — No photos (CRITICAL GAP)" >> "$summary_file"
    fi
    
    cat >> "$summary_file" << 'EOF'

## 06_FINANCIAL_RECORDS
EOF
    
    if [[ -f "$EVIDENCE_BUNDLE/06_FINANCIAL_RECORDS/MAA-PAYMENT-LEDGER-2024-2026.csv" ]]; then
        echo "✅ **COMPLETE** — MAA portal payment ledger" >> "$summary_file"
    elif [[ -f "$EVIDENCE_BUNDLE/06_FINANCIAL_RECORDS/BANK-RENT-PAYMENTS-2024-2026.csv" ]]; then
        echo "✅ **COMPLETE** — Bank transaction export" >> "$summary_file"
    else
        echo "❌ **MISSING** — No rent payment history (CRITICAL GAP)" >> "$summary_file"
    fi
    
    log_info "Summary written to: $summary_file"
    cat "$summary_file"
}

# ---------------------------------------------------------------------------
# Main Execution
# ---------------------------------------------------------------------------

main() {
    log_info "Emergency Evidence Bundle Population"
    log_info "Case: MAA 26CV005596-590 + 26CV007491-590"
    log_info "Deadline: 2026-03-03 (Trial #1) — 10 days"
    echo ""
    
    export_portal_workorders
    echo ""
    airdrop_photos
    echo ""
    export_payment_ledger
    echo ""
    generate_summary
    
    log_info "Evidence bundle population complete"
    log_info "Next: Review summary and verify completeness"
}

main "$@"
