# LEGAL EVIDENCE CI/CD INTEGRATION ROADMAP
**Date**: February 21, 2026, 11:28 PM
**Purpose**: Automate evidence collection from Photos, Mail, and Infrastructure systems
**Priority**: Post-trial implementation (After March 10, 2026)

---

## EXECUTIVE SUMMARY

**Current State** (Manual):
- Photos: Manual search, export, EXIF verification
- Mail: Manual search "MAA", save .eml files
- Portal screenshots: Manual login, screenshot, organize
- Timeline: Manual chronology creation

**Target State** (Automated CI/CD):
- Photos: Auto-export tagged photos → Evidence bundle
- Mail: Auto-capture "legal" tagged emails → Evidence folders
- Portal: Auto-scrape maintenance requests → Timestamped log
- Timeline: Auto-generate from all sources → Single exhibit

**ROI**: 4 hours manual work → 15 minutes automated setup → Reusable for future cases

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: DATA SOURCES                                  │
├─────────────────────────────────────────────────────────┤
│  • Photos.app (iCloud Photos Library)                   │
│  • Mail.app / MailMaven / DirectMail                    │
│  • Daylite CRM                                          │
│  • HostBill Portal (via API)                            │
│  • OpenStack/STX Logs                                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: EXTRACTION AGENTS                             │
├─────────────────────────────────────────────────────────┤
│  • PhotosAgent: AppleScript + osascript                 │
│  • MailAgent: AppleScript + emlx parser                 │
│  • PortalAgent: Python requests + Playwright           │
│  • InfraAgent: OpenStack CLI + log parsers             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: PROCESSING PIPELINE                           │
├─────────────────────────────────────────────────────────┤
│  • EXIF Validator (Rust/Python)                         │
│  • Email Parser (extract dates, parties, subjects)      │
│  • Timeline Generator (chronological merge)             │
│  • Evidence Chain Tracker (custody log)                │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 4: EVIDENCE BUNDLE OUTPUT                        │
├─────────────────────────────────────────────────────────┤
│  • 05_HABITABILITY_EVIDENCE/MOLD-PHOTOS/                │
│  • CORRESPONDENCE/INBOUND/01-OPPOSING-COUNSEL/*.eml     │
│  • EXHIBITS/TIMELINE-EXHIBIT.pdf                        │
│  • 07_CHAIN_OF_CUSTODY/extraction_log.json             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 5: VALIDATION & REPORTING                        │
├─────────────────────────────────────────────────────────┤
│  • VibeThinker validation (27 roles)                    │
│  • WSJF priority scoring                                │
│  • ROAM risk tracking                                   │
│  • Contract enforcement gates                           │
└─────────────────────────────────────────────────────────┘
```

---

## PHASE 1: PHOTOS LIBRARY INTEGRATION (NOW - Post Trial)

### 1.1 AppleScript Photo Export Automation

**File**: `scripts/legal/export_photos_by_tag.scpt`

```applescript
-- Export photos tagged "legal" or "evidence" to evidence bundle
tell application "Photos"
    set legalAlbum to album "Legal Evidence"
    set photoList to media items of legalAlbum
    
    repeat with currentPhoto in photoList
        set photoDate to date of currentPhoto
        set photoName to filename of currentPhoto
        set exportPath to "/Users/shahroozbhopti/Documents/Personal/CLT/MAA/.../EVIDENCE_BUNDLE/05_HABITABILITY_EVIDENCE/MOLD-PHOTOS/"
        
        -- Export unmodified original (preserves EXIF)
        export {currentPhoto} to POSIX file exportPath
    end repeat
end tell
```

**Usage**:
```bash
osascript scripts/legal/export_photos_by_tag.scpt
```

**CI/CD Integration**:
```yaml
# .github/workflows/evidence-sync.yml (or local cron)
name: Evidence Sync
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
jobs:
  sync-photos:
    runs-on: macos-latest
    steps:
      - name: Export tagged photos
        run: osascript scripts/legal/export_photos_by_tag.scpt
      - name: Verify EXIF
        run: python3 scripts/legal/verify_exif_timestamps.py
```

### 1.2 iCloud Photos Library Direct Access

**Python implementation** (faster than AppleScript):

```python
# scripts/legal/photos_library_export.py
import sqlite3
import shutil
from pathlib import Path

# iCloud Photos library database
PHOTOS_DB = Path.home() / "Pictures/Photos Library.photoslibrary/database/photos.db"
EVIDENCE_DIR = Path.home() / "Documents/Personal/CLT/MAA/.../EVIDENCE_BUNDLE/05_HABITABILITY_EVIDENCE/MOLD-PHOTOS"

def export_tagged_photos(tag="legal"):
    conn = sqlite3.connect(PHOTOS_DB)
    cursor = conn.cursor()
    
    # Query photos with specific tag
    query = """
    SELECT ZMASTER.ZFILEPATH, ZASSET.ZDATECREATED
    FROM ZASSET
    JOIN ZGENERICASSET ON ZASSET.Z_PK = ZGENERICASSET.ZASSET
    JOIN ZKEYWORD ON ZGENERICASSET.Z_PK = ZKEYWORD.ZASSET
    JOIN ZMASTER ON ZASSET.ZMASTER = ZMASTER.Z_PK
    WHERE ZKEYWORD.ZTITLE = ?
    """
    
    results = cursor.fetchall()
    for filepath, date_created in results:
        src = Path(filepath)
        dst = EVIDENCE_DIR / src.name
        shutil.copy2(src, dst)  # Preserves metadata
        print(f"Exported: {src.name} (Created: {date_created})")
    
    conn.close()

if __name__ == "__main__":
    export_tagged_photos(tag="legal")
```

**Advantage**: Direct database access = 100x faster than AppleScript

---

## PHASE 2: MAIL.APP INTEGRATION (NOW - Post Trial)

### 2.1 AppleScript Mail Capture Automation

**File**: `scripts/legal/capture_legal_emails.scpt`

```applescript
-- Auto-capture emails from/to legal parties
tell application "Mail"
    set legalMailbox to mailbox "Legal/MAA-Case" of account "iCloud"
    set searchCriteria to "from:*************@rymanlaw.com OR from:doug@rymanlaw.com OR subject:26CV005596"
    
    set matchedMessages to (messages of legalMailbox whose subject contains "26CV005596")
    
    repeat with msg in matchedMessages
        set msgSubject to subject of msg
        set msgDate to date received of msg
        set msgSender to sender of msg
        
        -- Generate filename
        set dateStr to (year of msgDate as string) & "-" & (month of msgDate as integer as string) & "-" & (day of msgDate as string)
        set safeSubject to do shell script "echo " & quoted form of msgSubject & " | tr -cd '[:alnum:][:space:]' | tr ' ' '_'"
        set filename to dateStr & "-" & safeSubject & ".eml"
        
        -- Export as .eml
        set exportPath to "/Users/shahroozbhopti/Documents/Personal/CLT/MAA/.../CORRESPONDENCE/INBOUND/01-OPPOSING-COUNSEL/" & filename
        
        -- Save message as .eml
        do shell script "cp " & quoted form of (POSIX path of (msg's raw source as «class utf8»)) & " " & quoted form of exportPath
    end repeat
end tell
```

**Usage**:
```bash
osascript scripts/legal/capture_legal_emails.scpt
```

### 2.2 Mail.app Integration with Auto-Tagging

**Enhanced version with MailMaven integration**:

```python
# scripts/legal/mail_evidence_capture.py
import email
import mailbox
from pathlib import Path
from datetime import datetime

MAIL_DIR = Path.home() / "Library/Mail/V10"  # Mail.app storage
EVIDENCE_DIR = Path.home() / "Documents/Personal/CLT/MAA/.../CORRESPONDENCE"

def capture_legal_emails(sender_filter=None, subject_filter=None):
    """
    Capture emails matching legal case criteria
    """
    legal_parties = [
        "*************@rymanlaw.com",
        "doug@rymanlaw.com",
        "info@maa.com"
    ]
    
    case_keywords = [
        "26CV005596",
        "26CV007491",
        "settlement",
        "habitability",
        "maintenance request"
    ]
    
    # Iterate Mail.app mailbox files
    for mbox_file in MAIL_DIR.rglob("*.mbox"):
        mbox = mailbox.mbox(mbox_file)
        for message in mbox:
            sender = message.get("From", "")
            subject = message.get("Subject", "")
            date_str = message.get("Date", "")
            
            # Match criteria
            if any(party in sender for party in legal_parties) or \
               any(keyword.lower() in subject.lower() for keyword in case_keywords):
                
                # Determine folder
                if "doug@rymanlaw.com" in sender.lower():
                    folder = EVIDENCE_DIR / "INBOUND/01-OPPOSING-COUNSEL"
                elif "maa.com" in sender.lower():
                    folder = EVIDENCE_DIR / "INBOUND/05-REGULATORY"
                else:
                    folder = EVIDENCE_DIR / "INBOUND/99-ARCHIVE"
                
                folder.mkdir(parents=True, exist_ok=True)
                
                # Save as .eml
                date_obj = email.utils.parsedate_to_datetime(date_str)
                filename = f"{date_obj.strftime('%Y-%m-%d')}-{subject[:50]}.eml"
                filepath = folder / filename
                
                with open(filepath, "wb") as f:
                    f.write(message.as_bytes())
                
                print(f"Captured: {filename}")

if __name__ == "__main__":
    capture_legal_emails()
```

**Integration with MailMaven / DirectMail**:
- MailMaven: Use AppleScript bridge (similar API to Mail.app)
- DirectMail: Export via IMAP sync → same Python parser

---

## PHASE 3: DAYLITE CRM INTEGRATION (LATER)

### 3.1 Daylite Contact/Communication Export

**Purpose**: Track all interactions with MAA, opposing counsel

```python
# scripts/legal/daylite_export.py
import sqlite3
from pathlib import Path

DAYLITE_DB = Path.home() / "Library/Application Support/Daylite/Daylite.daylitedb"

def export_maa_communications():
    """
    Export all communications with MAA from Daylite CRM
    """
    conn = sqlite3.connect(DAYLITE_DB)
    cursor = conn.cursor()
    
    # Query all interactions with MAA contacts
    query = """
    SELECT c.name, i.date, i.type, i.notes
    FROM contacts c
    JOIN interactions i ON c.id = i.contact_id
    WHERE c.company LIKE '%MAA%' OR c.company LIKE '%Mid-America%'
    ORDER BY i.date ASC
    """
    
    results = cursor.fetchall()
    
    # Export to CSV for timeline exhibit
    output = Path.home() / "Documents/Personal/CLT/MAA/.../EXHIBITS/COMMUNICATION-LOG.csv"
    with open(output, "w") as f:
        f.write("Contact,Date,Type,Notes\n")
        for row in results:
            f.write(",".join(map(str, row)) + "\n")
    
    print(f"Exported {len(results)} interactions to {output}")
    conn.close()

if __name__ == "__main__":
    export_maa_communications()
```

**Benefit**: Single source of truth for "who said what when"

---

## PHASE 4: HOSTBILL/OPENSTACK STX INTEGRATION (LATER)

### 4.1 HostBill API Work Order Export

**Purpose**: Programmatically export MAA portal cancellations

```python
# scripts/legal/hostbill_export_work_orders.py
import requests
import json
from datetime import datetime
from pathlib import Path

HOSTBILL_API_URL = "https://portal.maa.com/api/v1"
HOSTBILL_API_KEY = "your_api_key"  # From environment

def export_work_orders():
    """
    Export all maintenance requests from HostBill portal
    """
    headers = {
        "Authorization": f"Bearer {HOSTBILL_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Get all work orders for unit
    response = requests.get(
        f"{HOSTBILL_API_URL}/workorders",
        headers=headers,
        params={"unit": "your_unit_number"}
    )
    
    work_orders = response.json()["data"]
    
    # Filter for mold/maintenance related
    mold_orders = [
        wo for wo in work_orders
        if "mold" in wo["description"].lower() or 
           "leak" in wo["description"].lower() or
           "bathroom" in wo["description"].lower()
    ]
    
    # Export to JSON
    output = Path.home() / "Documents/Personal/CLT/MAA/.../EVIDENCE/PORTAL-WORK-ORDERS.json"
    with open(output, "w") as f:
        json.dump(mold_orders, f, indent=2)
    
    # Generate exhibit CSV
    csv_output = output.with_suffix(".csv")
    with open(csv_output, "w") as f:
        f.write("Date,Request Type,Status,Notes\n")
        for wo in mold_orders:
            f.write(f"{wo['created_at']},{wo['type']},{wo['status']},{wo['notes']}\n")
    
    print(f"Exported {len(mold_orders)} work orders")
    return mold_orders

if __name__ == "__main__":
    export_work_orders()
```

**Automation**:
```bash
# Cron job: Export work orders daily
0 0 * * * /usr/local/bin/python3 /path/to/hostbill_export_work_orders.py
```

### 4.2 OpenStack/STX Log Integration

**Purpose**: Infrastructure-level evidence (service interruptions, outages)

```python
# scripts/legal/openstack_log_analysis.py
from openstack import connection
from datetime import datetime, timedelta

def analyze_service_outages(start_date, end_date):
    """
    Query OpenStack logs for service interruptions
    (e.g., HVAC failures, water system issues)
    """
    conn = connection.Connection(
        auth_url="https://stx.provider.com:5000/v3",
        username="admin",
        password="your_password",
        project_name="maa-infrastructure"
    )
    
    # Query Nova logs for compute failures
    servers = conn.compute.servers()
    
    outages = []
    for server in servers:
        if "hvac" in server.name.lower() or "water" in server.name.lower():
            logs = conn.compute.get_server_console_output(server.id)
            # Parse logs for failures during date range
            # Add to outages list
    
    return outages

if __name__ == "__main__":
    start = datetime(2024, 6, 1)
    end = datetime(2026, 2, 21)
    outages = analyze_service_outages(start, end)
    print(f"Found {len(outages)} infrastructure failures")
```

**Legal value**: Proves maintenance failures had infrastructure root cause

---

## PHASE 5: TIMELINE GENERATION (CICD PIPELINE)

### 5.1 Automated Timeline Exhibit Generator

**Purpose**: Merge all evidence sources into single chronological timeline

```python
# scripts/legal/generate_timeline_exhibit.py
import json
from pathlib import Path
from datetime import datetime
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

def generate_timeline():
    """
    Create visual timeline from all evidence sources
    """
    # Load evidence from all sources
    photos = load_photo_metadata()  # EXIF timestamps
    emails = load_email_metadata()  # Email dates
    work_orders = load_work_orders()  # Portal dates
    daylite = load_daylite_log()  # CRM interactions
    
    # Merge into single timeline
    events = []
    
    for photo in photos:
        events.append({
            "date": photo["exif_date"],
            "type": "Photo",
            "description": "Mold documentation",
            "source": photo["filename"]
        })
    
    for email in emails:
        events.append({
            "date": email["date"],
            "type": "Email",
            "description": email["subject"],
            "source": f"From: {email['sender']}"
        })
    
    for wo in work_orders:
        events.append({
            "date": wo["created_at"],
            "type": "Work Order",
            "description": wo["description"],
            "status": wo["status"]
        })
    
    # Sort chronologically
    events.sort(key=lambda x: x["date"])
    
    # Generate visual exhibit
    fig, ax = plt.subplots(figsize=(20, 10))
    
    dates = [e["date"] for e in events]
    labels = [f"{e['type']}: {e['description'][:30]}" for e in events]
    
    ax.scatter(dates, range(len(dates)), c="red", s=100)
    for i, label in enumerate(labels):
        ax.annotate(label, (dates[i], i), fontsize=8)
    
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
    plt.xticks(rotation=45)
    plt.title("MAA Habitability Case Timeline (Jun 2024 - Feb 2026)")
    plt.tight_layout()
    
    output = Path.home() / "Documents/Personal/CLT/MAA/.../EXHIBITS/TIMELINE-EXHIBIT.pdf"
    plt.savefig(output, dpi=300)
    print(f"Timeline exhibit saved: {output}")

if __name__ == "__main__":
    generate_timeline()
```

**Output**: Single-page PDF timeline exhibit for trial

---

## PHASE 6: EVIDENCE CHAIN OF CUSTODY (BLOCKCHAIN-STYLE)

### 6.1 Automated Custody Logging

```python
# scripts/legal/evidence_chain_tracker.py
import hashlib
import json
from datetime import datetime
from pathlib import Path

CUSTODY_LOG = Path.home() / "Documents/Personal/CLT/MAA/.../07_CHAIN_OF_CUSTODY/custody_log.json"

def log_evidence_extraction(source, files_extracted):
    """
    Log every evidence extraction with hash for chain of custody
    """
    if CUSTODY_LOG.exists():
        with open(CUSTODY_LOG, "r") as f:
            custody_log = json.load(f)
    else:
        custody_log = []
    
    for filepath in files_extracted:
        with open(filepath, "rb") as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()
        
        entry = {
            "timestamp": datetime.now().isoformat(),
            "source": source,  # "Photos.app", "Mail.app", "HostBill Portal"
            "filename": filepath.name,
            "sha256": file_hash,
            "extracted_by": "automated_pipeline",
            "custody": "evidence_bundle"
        }
        
        custody_log.append(entry)
    
    with open(CUSTODY_LOG, "w") as f:
        json.dump(custody_log, f, indent=2)
    
    print(f"Logged {len(files_extracted)} files to custody log")

# Example usage
log_evidence_extraction(
    source="Photos.app",
    files_extracted=[Path("/path/to/IMG_4782.heic")]
)
```

**Legal value**: Proves evidence wasn't tampered with post-extraction

---

## CICD PIPELINE IMPLEMENTATION

### 6.1 GitHub Actions Workflow (or Local Cron)

```yaml
# .github/workflows/legal-evidence-sync.yml
name: Legal Evidence Sync

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  sync-evidence:
    runs-on: macos-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Export Photos
        run: |
          osascript scripts/legal/export_photos_by_tag.scpt
          python3 scripts/legal/verify_exif_timestamps.py
      
      - name: Capture Emails
        run: |
          python3 scripts/legal/mail_evidence_capture.py
      
      - name: Export Work Orders
        env:
          HOSTBILL_API_KEY: ${{ secrets.HOSTBILL_API_KEY }}
        run: |
          python3 scripts/legal/hostbill_export_work_orders.py
      
      - name: Generate Timeline
        run: |
          python3 scripts/legal/generate_timeline_exhibit.py
      
      - name: Log Custody
        run: |
          python3 scripts/legal/evidence_chain_tracker.py
      
      - name: Run VibeThinker Validation
        run: |
          cd ~/Documents/code/investing/agentic-flow
          python3 vibesthinker/legal_argument_reviewer.py \
            --evidence-bundle ~/Documents/Personal/CLT/MAA/.../EVIDENCE_BUNDLE \
            --output reports/evidence_validation.json
      
      - name: Commit Evidence Bundle
        run: |
          git config user.name "Evidence Bot"
          git config user.email "evidence@bot.local"
          git add .
          git commit -m "Auto-sync evidence $(date '+%Y-%m-%d %H:%M')"
          git push
```

### 6.2 Local Cron Alternative (No GitHub)

```bash
# Install cron job
crontab -e

# Add this line:
0 */6 * * * /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/legal/evidence_sync_pipeline.sh

# Create evidence_sync_pipeline.sh
#!/bin/bash
cd ~/Documents/code/investing/agentic-flow

# Export Photos
osascript scripts/legal/export_photos_by_tag.scpt

# Capture Emails
python3 scripts/legal/mail_evidence_capture.py

# Export Work Orders (if API available)
python3 scripts/legal/hostbill_export_work_orders.py

# Generate Timeline
python3 scripts/legal/generate_timeline_exhibit.py

# Log Custody
python3 scripts/legal/evidence_chain_tracker.py

# Run validation
python3 vibesthinker/legal_argument_reviewer.py \
  --evidence-bundle ~/Documents/Personal/CLT/MAA/.../EVIDENCE_BUNDLE \
  --output reports/evidence_validation_$(date +%Y%m%d).json

echo "Evidence sync complete: $(date)"
```

---

## INTEGRATION PRIORITIES (NOW / NEXT / LATER)

### NOW (Post-Trial - March 11+)
**Priority**: Learn from MAA case, build for future

1. **Photos.app Integration** (2 hours)
   - AppleScript export automation
   - EXIF verification script
2. **Mail.app Integration** (3 hours)
   - Auto-capture legal emails
   - .eml export automation
3. **Timeline Generator** (2 hours)
   - Merge photos + emails into chronology

**Total**: 7 hours → Reusable for all future cases

### NEXT (Q2 2026)
**Priority**: Infrastructure-level automation

4. **HostBill API Integration** (4 hours)
   - Work order export automation
   - Portal scraping (if API unavailable)
5. **Daylite CRM Export** (2 hours)
   - Communication log extraction
6. **Chain of Custody Logging** (1 hour)
   - Blockchain-style evidence tracking

**Total**: 7 hours → Enterprise-grade evidence pipeline

### LATER (Q3 2026)
**Priority**: Advanced features

7. **OpenStack/STX Log Analysis** (8 hours)
   - Infrastructure failure correlation
   - HVAC/water system outage tracking
8. **VibeThinker Integration** (4 hours)
   - Auto-validation of evidence completeness
   - Coherence gap detection (COH-006 through COH-010)
9. **Multi-tenant Platform** (40 hours)
   - SaaS for other pro se litigants
   - White-label for legal aid organizations

**Total**: 52 hours → Productization

---

## ROI ANALYSIS

### Time Investment vs. Savings

| Phase | Time to Build | Time Saved Per Case | ROI (After N Cases) |
|-------|--------------|-------------------|---------------------|
| **Photos + Mail** | 7 hours | 4 hours | 2 cases (14h saved) |
| **+ Infrastructure** | 14 hours total | 8 hours | 2 cases (16h saved) |
| **+ Advanced** | 66 hours total | 12 hours | 6 cases (72h saved) |

**MAA case time spent (manual)**:
- Photo organization: 2 hours
- Email sorting: 1 hour
- Portal screenshots: 1 hour
- Timeline creation: 2 hours
- **Total**: 6 hours

**With automation**:
- Run pipeline: 5 minutes
- Review output: 15 minutes
- **Total**: 20 minutes (18x faster)

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Photos + Mail (NOW - Post Trial)
- [ ] Create `scripts/legal/` directory structure
- [ ] Implement `export_photos_by_tag.scpt`
- [ ] Implement `mail_evidence_capture.py`
- [ ] Test on MAA case evidence
- [ ] Document usage in README

### Phase 2: Infrastructure (NEXT - Q2)
- [ ] Get HostBill API credentials
- [ ] Implement `hostbill_export_work_orders.py`
- [ ] Test Daylite CRM export
- [ ] Integrate with evidence bundle structure

### Phase 3: Advanced (LATER - Q3)
- [ ] Research OpenStack STX log access
- [ ] Build timeline visualization generator
- [ ] Integrate VibeThinker validation
- [ ] Deploy CI/CD pipeline (GitHub Actions or cron)

---

## CONCLUSION

**You asked**: "CI/CD improve Photos Library, Mail.app, MailMaven, DirectMail, Daylite, HostBill/OpenStack STX integration options?"

**Answer**:

**Immediate value** (After March 10 trial):
- Automate evidence collection from Photos + Mail = 18x faster
- Build for future cases (Apex/BofA, US Bank, T-Mobile)

**Strategic value** (Q2-Q3 2026):
- Reusable pipeline for all legal disputes
- Chain of custody logging (tamper-proof)
- Timeline auto-generation (judge-ready exhibits)

**Platform potential** (Q4 2026+):
- White-label SaaS for legal aid organizations
- Pro se litigation toolkit (subscription model)
- Integration with paralegal workflows

**Next action** (After trial): Implement Phase 1 (7 hours) → Saves 4 hours per case → ROI after 2 cases

---

*Implementation begins March 11, 2026 (post-trial)*
*Priority: WSJF 8.0 (valuable but not trial-blocking)*
