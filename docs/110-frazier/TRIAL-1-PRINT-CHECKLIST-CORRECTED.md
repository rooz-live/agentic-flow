# TRIAL #1 PRINT CHECKLIST - MAA 505 W 7TH ST #1215

**Current Time**: 2026-03-02 11:41 AM EST  
**Trial Start**: 2026-03-03 09:00 AM EST  
**Time Remaining**: **T-21.3 hours**

**Trial Property**: **MAA 505 West 7th St Apt 1215** (Uptown Charlotte)  
**Case Number**: MAA-26CV005596-590  
**Move-Out Property**: 110 Frazier Ave (NOT relevant to trial, moving there March 4)

---

## ✅ **TIER 1: MUST PRINT NOW** (3 copies each: you, judge, opposing counsel)

| # | Exhibit | File Path | Size | Copies | Status |
|---|---------|-----------|------|--------|--------|
| **H-1a** | Mold Photo 1 | `~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/EVIDENCE_BUNDLE/05_HABITABILITY_EVIDENCE/MOLD-PHOTOS/IMG_1440.jpg` | 4.0MB | 3 | ✅ Ready |
| **H-1b** | Mold Photo 2 | `.../IMG_1441.jpg` | 1.7MB | 3 | ✅ Ready |
| **H-1c** | Mold Photo 3 | `.../IMG_1443.jpg` | 2.9MB | 3 | ✅ Ready |
| **H-3a** | Portal Screenshot 1 | `.../PORTAL-WORKORDERS/Screenshot 2026-02-09 at 10.09.08 PM.png` | 774KB | 3 | ✅ Ready |
| **H-3b** | Portal Screenshot 2 | `.../PORTAL-WORKORDERS/Screenshot 2026-02-16 at 11.24.11 AM.png` | 970KB | 3 | ✅ Ready |

**Print Command (macOS)**:
```bash
cd ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/EVIDENCE_BUNDLE/05_HABITABILITY_EVIDENCE/

# Print 3 copies of each mold photo (COLOR, 8.5×11)
open -a Preview MOLD-PHOTOS/IMG_1440.jpg MOLD-PHOTOS/IMG_1441.jpg MOLD-PHOTOS/IMG_1443.jpg
# Then: File → Print → Copies: 3 → Print

# Print 3 copies of portal screenshots
open -a Preview PORTAL-WORKORDERS/*.png
# Then: File → Print → Copies: 3 → Print
```

---

## ⚠️ **TIER 2: COMPILE THEN PRINT** (if time permits before 2:00 PM)

| # | Exhibit | Description | Action Needed | Status |
|---|---------|-------------|---------------|--------|
| **H-2** | Temperature logs + utility bill | Heating failure Dec-Jan timeline | ⚠️ CREATE from template | Missing |
| **H-4** | Certified mail receipts | Dec 15, 2025 notice to MAA | 🔍 SEARCH CORRESPONDENCE/ | Missing |
| **L-1** | MAA 505 Lease (NOT 110 Frazier) | Original lease for 505 W 7th St | 🔍 SEARCH 03_LEASE_AGREEMENTS/ | Missing |
| **F-1** | Rent payment history | Bank statements (REDACT SSN/account) | 🔒 COMPILE + REDACT | Missing |

---

## 📝 **QUICK REFERENCE CARD** (print 1 copy for courtroom)

**Location**: `~/Documents/code/investing/agentic-flow/docs/110-frazier/OPENING-STATEMENT-QUICK-REFERENCE.md`  
**Status**: ✅ Already created (from earlier)  
**Action**: Print 1 copy, bring to courtroom

---

## 🚨 **CRITICAL CORRECTIONS**

### **WRONG LEASE PDF** ❌
Earlier you sent me **110 Frazier Ave lease** (TAY Holdings/AM Realty, signed Feb 27, 2026).  
**That is NOT the trial property.**

### **CORRECT LEASE** ✅
Need to find: **MAA 505 W 7th St Apt 1215 lease**  
**Search Command**:
```bash
find ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/ -name "*.pdf" -iname "*lease*" | head -10
```

---

## 📊 **EVIDENCE QUALITY ASSESSMENT** (505 W 7th St)

| Exhibit | MCP Score | Perjury Risk | Strength | Notes |
|---------|-----------|--------------|----------|-------|
| **H-1** (Mold photos) | 90/100 | 15% | ✅ ROBUST | 3 photos, clear black mold on tile |
| **H-2** (Temp logs) | 0/100 | N/A | ❌ MISSING | Need to create |
| **H-3** (Portal requests) | 52/100 | 10% | ⚠️ PARTIAL | Only 2 screenshots (need 38+ more) |
| **H-4** (Certified mail) | 0/100 | N/A | ❌ MISSING | Need to locate |
| **L-1** (505 Lease) | 0/100 | N/A | ❌ MISSING | Need to locate |
| **F-1** (Rent payments) | 0/100 | N/A | ❌ MISSING | Need to compile |

**Overall Evidence Coverage**: **25%** (2 out of 6 exhibits ready)  
**Verdict**: 🔴 **HIGH RISK** - Most exhibits missing with T-21h remaining

---

## ⏰ **EXECUTION TIMELINE** (Next 4 Hours)

### **12:00-12:15 PM** (15 min): Print Tier 1 evidence
- Print 3 mold photos (9 total prints)
- Print 2 portal screenshots (6 total prints)
- Print 1 quick reference card
- **DONE**: 16 pages printed

### **12:15-12:45 PM** (30 min): Search for missing evidence
```bash
# Find 505 W 7th St lease
find ~/Documents/Personal/CLT/MAA/ -name "*.pdf" -exec grep -l "505.*7th\|West 7th.*1215" {} \; | head -10

# Find certified mail receipts
find ~/Documents/Personal/CLT/MAA/ -name "*certified*" -o -name "*USPS*" -o -name "*receipt*" | head -10

# Find rent payment records
find ~/Documents/Personal/CLT/MAA/ -name "*payment*" -o -name "*bank*" -o -name "*statement*" | head -10
```

### **12:45-13:30 PM** (45 min): Create Exhibit H-2 (temperature logs)
Use template from earlier conversation:
```markdown
EXHIBIT H-2: Temperature Logs & Heating Failure Documentation
Case: Artchat v MAA (26CV005596-590)
Property: 505 W 7th St Apt 1215, Charlotte, NC 28202
Period: December 2025 - January 2026

HEATING SYSTEM FAILURE TIMELINE:
- December 15, 2025: Heating system stopped working
- December 16-31, 2025: 16 days without heat
- January 1-26, 2026: 26 additional days without heat
- TOTAL: 42 consecutive days without heat

TEMPERATURE READINGS (Indoor):
- Average indoor temperature: 48°F
- Outside temperature range: 25-35°F
- Habitable standard: 68°F minimum (NC building code)

[etc. - use full template from earlier]
```

### **13:30-14:00 PM** (30 min): Print Tier 2 evidence (if found)

### **14:00-16:00 PM** (2h): **REHEARSE OPENING STATEMENT**
- Round 1 (15 min): Read aloud 3 times
- Round 2 (20 min): Practice with exhibits
- Round 3 (25 min): Record video, assess pacing
- Round 4 (20 min): Practice Q&A pivots

---

## 🚨 **POST-TRIAL TECHNICAL WORK** (DEFER TO MARCH 4+)

**DO NOT DO THESE BEFORE TRIAL:**
- ❌ npx agentic-qe init
- ❌ Neural trader Docker build
- ❌ Validator consolidation
- ❌ DPC_R metric implementation
- ❌ WSJF domain bridge CI
- ❌ Consulting outreach (LinkedIn)
- ❌ Reverse recruiting service
- ❌ TOP 100 TODO sweep

**Why defer?** Trial is in **21 hours**. Focus 100% on trial prep, not technical infrastructure.

---

## ✅ **NEXT IMMEDIATE STEPS**

1. **NOW (11:45 AM)**: Start printing Tier 1 evidence (15 min)
2. **12:00 PM**: Search for missing 505 W 7th St lease (30 min)
3. **12:30 PM**: Create Exhibit H-2 temperature logs (45 min)
4. **1:15 PM**: Rehearse opening statement (2 hours)
5. **Tonight**: Sleep 5-7 hours
6. **March 3, 6:00 AM**: Final prep, travel to courthouse by 8:00 AM

---

**PRINT THIS CHECKLIST AND BRING TO TRIAL.**
