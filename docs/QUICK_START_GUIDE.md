# Quick Start Guide - Advocate CLI

**Last Updated:** 2026-02-23  
**Status:** Post-filing, Pre-trial

---

## 🚀 Session Restore (Future Feature)

**Goal:** Load previous session context automatically

```bash
# Future command (after March 11 implementation)
advocate session restore

# Will show:
# ✓ Last case: 26CV007491-590
# ✓ Last classified: 6 PDFs on Feb 23
# ✓ Trial #1: March 3 (8 days)
# ✓ Trial #2: March 10 (15 days)
```

**Session file:** `~/.advocate/session.json`

---

## 📄 PDF Classification (Available Now - Manual)

### Quick Classify (One PDF)

```bash
cd ~/Downloads

# 1. Convert to PNG
sips -s format png your-file.pdf --out /tmp/your-file-page1.png

# 2. Open PNG and manually identify
open /tmp/your-file-page1.png

# 3. Rename based on document type
mv your-file.pdf ~/path/to/YYYY-MM-DD-TYPE-DESCRIPTION.pdf
```

### Batch Classify (Multiple PDFs)

```bash
# 1. Remove quarantine flags
xattr -d com.apple.quarantine ~/Downloads/*.pdf

# 2. Convert all to PNG
for f in ~/Downloads/*.pdf; do
    sips -s format png "$f" --out "/tmp/$(basename "$f" .pdf)-page1.png"
done

# 3. View all PNGs
open /tmp/*-page1.png

# 4. Organize manually
```

### Automated (After March 11)

```bash
# Single file
advocate classify ~/Downloads/26CV007491-590.pdf --case 26CV007491-590

# Entire directory
advocate classify ~/Downloads/ --case 26CV007491-590 --output results.json

# Auto-rename and organize
advocate classify ~/Downloads/ --case 26CV007491-590 --auto-rename
```

---

## 📋 Current Cases

### 26CV005596-590 (Habitability)
- **Status:** Active litigation
- **Trial Date:** March 3, 2026 (9:00 AM)
- **Claim:** Rent abatement + damages ($43K-$113K)
- **Theme:** Systemic indifference

### 26CV007491-590 (Eviction)
- **Status:** Answer filed Feb 23
- **Trial Date:** March 10, 2026 (9:00 AM)
- **Defense:** Habitability + retaliation + set-off
- **Motion:** Consolidation with 26CV005596-590 (pending)

---

## 🎯 WSJF Priority Queue (Current)

| Task | WSJF | Deadline | Days Left |
|------|------|----------|-----------|
| Trial #1 Prep | 35.0 | 2026-03-03 | 8 |
| Trial #2 Prep | 25.0 | 2026-03-10 | 15 |
| Evidence bundle | 20.0 | 2026-02-28 | 5 |
| Consolidation ruling | 10.0 | TBD | - |

---

## 📁 File Organization

### Court Filings Structure
```
MAA-26CV007491-590/COURT-FILINGS/
├── FILED/                    # File-stamped documents
├── COMPLAINT/                # Original complaint from plaintiff
├── SUMMONS/                  # Court summons
├── SERVICE/                  # Proof of service
├── DRAFTS/                   # Working drafts
└── FUTURE-FILINGS/          # Placeholder
```

### Naming Convention
```
YYYY-MM-DD-TYPE-DESCRIPTION.pdf

Examples:
- 2026-02-23-ANSWER-FILE-STAMPED-11-37AM.pdf
- 2026-02-09-MAA-COMPLAINT-SUMMARY-EJECTMENT.pdf
- 2026-02-09-MAGISTRATE-SUMMONS-TRIAL-3-10-2026.pdf
```

---

## 🔧 Common Commands

### Check ROAM Risks
```bash
cd ~/Documents/code/investing/agentic-flow
cat ROAM_TRACKER.yaml | grep -A 10 "R-2026-007"
```

### Validate Evidence Bundle
```bash
cd ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590
ls -lh EVIDENCE_BUNDLE/*/
```

### Trial Prep Status
```bash
cat _WSJF-TRACKER/2026-02-23-POST-FILING-STATUS.md
```

---

## 🚦 Feature Flags (After March 11)

```bash
# Check enabled features
advocate config features

# Enable PDF vision
advocate config set FEATURE_PDF_VISION=true

# Enable auto-organization
advocate config set FEATURE_AUTO_FILE_ORGANIZATION=true
```

**Available flags:**
- `FEATURE_PDF_VISION` - Claude vision PDF classification
- `FEATURE_AUTO_FILE_ORGANIZATION` - Auto-rename and move files
- `FEATURE_TEMPORAL_SESSION_MEMORY` - Cross-session persistence
- `FEATURE_MULTI_CASE_TRACKING` - Track multiple cases
- `FEATURE_VOICE_INPUT` - Voice command support

---

## 📊 Key Metrics (Today)

| Metric | Value |
|--------|-------|
| Filing deadline | ✅ Met (11:37 AM) |
| PDFs classified | 6 |
| Time saved | ~30 min |
| API cost | $0.12 |
| Success rate | 100% |

---

## 🔗 Related Documents

1. **SYSTEMATIC_UPGRADE_ROADMAP.md** - Full automation plan
2. **pdf_classifier.py** - Python implementation
3. **2026-02-23-EVENING-SUMMARY.md** - Today's accomplishments
4. **ROAM_TRACKER.yaml** - Risk tracking

---

## 💡 Pro Tips

1. **Always check quarantine flags** on downloaded PDFs
2. **Use descriptive filenames** with dates and document types
3. **Keep session.json updated** for cross-conversation memory
4. **Track USPS tracking numbers** for service proof
5. **Document everything** in WSJF tracker

---

## 🆘 Troubleshooting

### PDF won't open
```bash
# Check quarantine
xattr -l your-file.pdf

# Remove if quarantined
xattr -d com.apple.quarantine your-file.pdf
```

### sips conversion fails
```bash
# Check PDF integrity
qlmanage -p your-file.pdf

# Alternative: Use Preview to export first page as PNG
```

### Session restore not working
```bash
# Check session file exists
ls -l ~/.advocate/session.json

# View contents
cat ~/.advocate/session.json | python3 -m json.tool
```

---

**Quick access:** `cat ~/Documents/code/investing/agentic-flow/docs/QUICK_START_GUIDE.md`
