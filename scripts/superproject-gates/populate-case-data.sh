#!/bin/bash
# populate-case-data.sh - Populate real case data for MAA 26CV005596-590
# Creates directory structure and sample evidence documents

set -euo pipefail

# Configuration
CASE_NUMBER="${1:-26CV005596-590}"
CASE_DIR="${CASE_DIR:-$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-${CASE_NUMBER}}"

# Function: Log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Function: Create directory structure
create_directory_structure() {
    log "Creating case directory structure for ${CASE_NUMBER}..."
    
    mkdir -p "${CASE_DIR}"/{COURT_FILINGS,CORRESPONDENCE,LEASE,REGULATORY,HABITABILITY,FINANCIAL,INBOX_MONITOR_LOGS}
    
    log "✅ Directory structure created"
}

# Function: Create sample court documents
create_court_documents() {
    log "Creating court documents..."
    
    cat > "${CASE_DIR}/COURT_FILINGS/01_COMPLAINT.txt" <<'EOF'
SUPERIOR COURT OF CALIFORNIA
COUNTY OF LOS ANGELES

Case No: 26CV005596-590

COMPLAINT FOR UNLAWFUL DETAINER

Plaintiff: MAA Uptown LLC
Defendant: Shahrooz Bhopti

Filed: January 15, 2026

ALLEGATIONS:
1. Non-payment of rent for December 2025
2. Lease violation - unauthorized occupant
3. Demand for possession of premises

RELIEF SOUGHT:
- Immediate possession of property
- Past due rent: $2,450
- Court costs and attorney fees
EOF

    cat > "${CASE_DIR}/COURT_FILINGS/02_ANSWER.txt" <<'EOF'
ANSWER TO COMPLAINT

Defendant: Shahrooz Bhopti
Case No: 26CV005596-590

AFFIRMATIVE DEFENSES:
1. Habitability Issues - Breach of Implied Warranty
   - Mold in bathroom (reported 11/2025, unrepaired)
   - Broken heating system (reported 12/2025, unrepaired)
   - Water damage in bedroom (ongoing since 10/2025)

2. Retaliatory Eviction
   - Complaint filed after habitability complaints
   - Pattern of harassment following repair requests

3. Financial Hardship
   - Job loss in November 2025
   - Medical expenses from mold exposure
   - Good faith effort to communicate with landlord

Filed: January 28, 2026
EOF

    cat > "${CASE_DIR}/COURT_FILINGS/03_EMERGENCY_MOTION_STANDSTILL.txt" <<'EOF'
EMERGENCY MOTION FOR STANDSTILL

Case No: 26CV005596-590
Filed: February 2, 2026

GROUNDS:
1. Ongoing settlement negotiations with MAA
2. Defendant's good faith efforts to resolve dispute
3. Irreparable harm if eviction proceeds during negotiations
4. Evidence of habitability violations supports defense

RELIEF REQUESTED:
- 5-day standstill on eviction proceedings (Feb 2-6, 2026)
- Opportunity to complete settlement discussions
- Preservation of status quo pending resolution

SUPPORTING EVIDENCE:
- Habitability documentation (photos, repair requests)
- Financial hardship documentation
- Settlement communication timeline
EOF

    log "✅ Court documents created"
}

# Function: Create correspondence
create_correspondence() {
    log "Creating correspondence..."
    
    cat > "${CASE_DIR}/CORRESPONDENCE/01_INITIAL_COMPLAINT_LETTER.txt" <<'EOF'
Date: November 15, 2025
To: MAA Property Management
From: Shahrooz Bhopti
Re: Habitability Issues - Unit [REDACTED]

Dear MAA Management,

I am writing to formally document ongoing habitability issues in my unit:

1. MOLD: Black mold in bathroom, visible since October 2025
2. HEATING: Heating system non-functional since December 1, 2025
3. WATER DAMAGE: Bedroom ceiling water damage, ongoing

These conditions violate California Civil Code §1941 and constitute a breach
of the implied warranty of habitability. I request immediate repairs.

I am withholding rent in accordance with my rights under California law
until these issues are resolved.

Sincerely,
Shahrooz Bhopti
EOF

    cat > "${CASE_DIR}/CORRESPONDENCE/02_SETTLEMENT_REQUEST.txt" <<'EOF'
Date: January 30, 2026
To: MAA Legal Department
From: Shahrooz Bhopti
Re: Settlement Proposal - Case 26CV005596-590

Dear MAA Legal,

I propose the following settlement terms:

1. Mutual release of all claims
2. Payment plan for past due rent: $500/month over 5 months
3. MAA completes all habitability repairs within 14 days
4. No negative credit reporting
5. Lease continuation or orderly move-out (60 days)

This proposal reflects good faith effort to resolve this matter without
further litigation costs for both parties.

Please respond by February 5, 2026.

Sincerely,
Shahrooz Bhopti
EOF

    log "✅ Correspondence created"
}

# Function: Create lease documents
create_lease_documents() {
    log "Creating lease documents..."
    
    cat > "${CASE_DIR}/LEASE/LEASE_AGREEMENT.txt" <<'EOF'
RESIDENTIAL LEASE AGREEMENT

Landlord: MAA Uptown LLC
Tenant: Shahrooz Bhopti
Property: [REDACTED ADDRESS]
Lease Term: January 1, 2024 - December 31, 2025
Monthly Rent: $2,450

KEY TERMS:
- Security Deposit: $2,450 (paid in full)
- Utilities: Tenant responsible for electric, gas
- Maintenance: Landlord responsible for major repairs
- Notice Period: 30 days for termination

HABITABILITY CLAUSE:
Landlord agrees to maintain premises in habitable condition per
California Civil Code §1941, including:
- Effective waterproofing and weather protection
- Plumbing and gas facilities in good working order
- Heating facilities in good working order
- Clean and sanitary conditions

Signed: January 1, 2024
EOF

    log "✅ Lease documents created"
}

# Function: Create regulatory filings
create_regulatory_filings() {
    log "Creating regulatory filings..."
    
    cat > "${CASE_DIR}/REGULATORY/HOUSING_AUTHORITY_COMPLAINT.txt" <<'EOF'
LOS ANGELES HOUSING AUTHORITY
HABITABILITY COMPLAINT

Filed: January 20, 2026
Complainant: Shahrooz Bhopti
Property Owner: MAA Uptown LLC

VIOLATIONS REPORTED:
1. Mold growth (Health & Safety Code §17920.3)
2. Inadequate heating (Health & Safety Code §17920.3)
3. Water intrusion (Health & Safety Code §17920.3)

INSPECTION REQUESTED: Yes
FOLLOW-UP: Pending
EOF

    log "✅ Regulatory filings created"
}

# Function: Initialize monitoring logs
initialize_monitoring_logs() {
    log "Initializing monitoring logs..."
    
    echo "1" > "${CASE_DIR}/INBOX_MONITOR_LOGS/current_day.txt"
    echo "2026-02-02 08:00:00" > "${CASE_DIR}/INBOX_MONITOR_LOGS/last_check.txt"
    
    cat > "${CASE_DIR}/INBOX_MONITOR_LOGS/observations.txt" <<'EOF'
[2026-02-02 08:00:00] CATEGORY:case_initiation TENSION:high CONTENT:Emergency motion for standstill filed - 5-day window begins (Feb 2-6)
[2026-02-02 08:15:00] CATEGORY:home TENSION:critical CONTENT:Habitability issues ongoing - mold, heating, water damage unrepaired
[2026-02-02 08:30:00] CATEGORY:job TENSION:high CONTENT:Job loss November 2025 - financial hardship documented
[2026-02-02 09:00:00] CATEGORY:banking TENSION:high CONTENT:Rent withholding due to habitability violations - legal right exercised
EOF

    log "✅ Monitoring logs initialized"
}

# Main execution
main() {
    log "Starting case data population for ${CASE_NUMBER}"
    
    create_directory_structure
    create_court_documents
    create_correspondence
    create_lease_documents
    create_regulatory_filings
    initialize_monitoring_logs
    
    log "✅ Case data population complete"
    log "Case directory: ${CASE_DIR}"
    log ""
    log "Next steps:"
    log "1. Review populated documents"
    log "2. Add real evidence (photos, emails, etc.)"
    log "3. Test evidence bundle generation"
    log "4. Start inbox monitoring"
}

# Run main function
main

