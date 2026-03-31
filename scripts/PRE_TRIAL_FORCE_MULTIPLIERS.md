# Pre-Trial Force Multipliers

**Strategy**: Invert thinking to **prepare increasing ROI before trial occurs**, then scale infrastructure after winning.

---

## 🎯 Inverted WSJF Prioritization

| Tier | Build When | WSJF | Focus |
|------|------------|------|-------|
| **1: Trial Outcome Multipliers** | Tonight/Tomorrow | 35-45 | Increase trial win probability |
| **2: Evidence Automation** | This Week | 25-30 | Speed up evidence prep |
| **3: Infrastructure** | After March 10 | 3-5 | Scale for future cases |

---

## ⚡ Tier 1: Trial Outcome Multipliers (BUILD NOW)

### 1. **EXIF Timestamp Validator** (`validate_photo_exif.py`)

**Pre-Trial ROI**: Shifts burden to MAA to prove photo tampering  
**Post-Trial Scale**: Reusable for all tenant photo evidence

**Usage**:
```bash
# Validate single photo
python3 scripts/validate_photo_exif.py ~/Documents/Personal/.../mold_photo_2024-06-15.jpg

# Batch validate all photos
find ~/Documents/Personal/.../05_HABITABILITY_EVIDENCE -type f -name "*.jpg" -exec \
  python3 scripts/validate_photo_exif.py {} \;

# JSON output for programmatic use
python3 scripts/validate_photo_exif.py photo.jpg --json
```

**What it checks**:
- ✓ DateTimeOriginal (camera capture timestamp)
- ✓ GPSInfo (location verification)
- ✓ Software (detects editing tools like Photoshop)
- ✓ File modification vs EXIF creation delta (suspicious if >1 day)
- ✓ Authenticity score (0-5, <4 = potential tampering)

**Output**: Court-ready authenticity report saved as `photo_name_exif_report.txt`

---

### 2. **Timeline Exhibit Generator** (`generate_trial_timeline.py`)

**Pre-Trial ROI**: Judge sees 22-month pattern in 10 seconds  
**Post-Trial Scale**: Reusable for every tenant case

**Usage**:
```bash
# ASCII format (print-ready)
python3 scripts/generate_trial_timeline.py timeline_data.json ascii

# Markdown format (exhibits)
python3 scripts/generate_trial_timeline.py timeline_data.json markdown
```

**Timeline JSON format**:
```json
{
  "title": "MAA Habitability Timeline",
  "subtitle": "26CV005596-590",
  "events": [
    {
      "date": "2024-03-15",
      "label": "First mold complaint",
      "type": "complaint"
    },
    {
      "date": "2026-03-03",
      "label": "Trial #1 - Habitability",
      "type": "trial"
    }
  ],
  "stats": {
    "duration_months": 22,
    "work_orders": 42,
    "rent_paid": "$43,200",
    "damages_claimed": "$113,000"
  }
}
```

**Output**: Visual timeline exhibit saved as `timeline_data_exhibit.txt` or `.md`

---

### 3. **Opening Statement TDD Practice Loop** (`practice_opening_statement.sh`)

**Pre-Trial ROI**: Prevents rambling, ensures key points hit  
**Post-Trial Scale**: Reusable for all trial prep

**Usage**:
```bash
./scripts/practice_opening_statement.sh
```

**What it does**:
1. Loads your opening statement key points from `OPENING_STATEMENT.md`
2. Times your delivery (target: <120 seconds)
3. Tracks self-assessment: key points hit, confidence, eye contact
4. Logs practice attempts to `opening_statement_practice_log.txt`
5. Exit when you hit target time + confidence

**Requirements**: Create `OPENING_STATEMENT.md` first with bullet points:
```markdown
# Opening Statement - Trial #1

- Introduce myself (pro se tenant)
- State claim: MAA failed to maintain habitable premises (N.C.G.S. § 42-42)
- Evidence: 42 work orders, 40+ photos of mold/HVAC failures
- Relief sought: $43K rent withholding + damages
```

---

### 4. **VibeThinker Answer Validation** (Already Built)

**Pre-Trial ROI**: Detects coherence gaps before filing  
**Post-Trial Scale**: Reusable for all legal arguments

**Usage** (from plan):
```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
python3 vibesthinker/legal_argument_reviewer.py \
  --file ~/Documents/Personal/.../ANSWER-TO-SUMMARY-EJECTMENT-26CV007491-590.md \
  --counter-args 5 \
  --output reports/answer_analysis_final.json
```

**Checks**:
- COH-006: Legal claims → Evidence citations
- COH-007: Unsupported factual claims
- COH-008: Date inconsistencies
- COH-009: Damages calculation errors
- COH-010: Formatting/signature issues

**Target**: Overall strength >70/100, Systemic score >30/40

---

## 🔧 Unified Pre-Trial Validation Runner

**Run all force multipliers at once**:

```bash
./scripts/pre_trial_validation.sh
```

**Validates**:
1. ✅ EXIF photo timestamps (sample 3 photos)
2. ✅ Timeline exhibit generation (ASCII + Markdown)
3. ✅ VibeThinker answer strength (>70/100 target)
4. ✅ Opening statement readiness (practice log <120s)

**Exit codes**:
- `0`: Trial ready, all validations passed
- `1`: Validation incomplete, address issues

---

## 📊 Tier 2: Evidence Automation (BUILD THIS WEEK)

**Defer to Week of Feb 25-Mar 2**:

### 1. **Photos.app EXIF Batch Extractor**
Extract all mold photos from iPhone with timestamps intact.

### 2. **Mail.app Legal Email Capture**
Auto-archive MAA portal cancellation emails.

### 3. **Rent Ledger Parser**
Bank of America PDF → structured JSON timeline.

---

## 🏗️ Tier 3: Infrastructure (BUILD AFTER MARCH 10)

**Defer to Post-Trial PI Sync** (after both trials):

- MCP/OpenStack/HostBill integration (multi-tenant SaaS)
- Multi-provider LLM fallback (cost optimization at scale)
- NAPI-RS Rust bindings for EXIF validation (10-100x speedup)
- Cross-org SoR analysis (Apex, T-Mobile, US Bank)
- 2,500+ automation workflows

---

## 🎯 Trial Timeline

| Date | Trial | Case # | Focus |
|------|-------|--------|-------|
| **March 3** (7 days) | Trial #1 | 26CV005596-590 | Habitability ($43K-$113K+) |
| **March 10** (14 days) | Trial #2 | 26CV007491-590 | Eviction defense |

**Immediate action**: Run `./scripts/pre_trial_validation.sh` to check readiness.

---

## 📝 Success Metrics

### Pre-Trial (Now → March 2)
- ✅ All photos have EXIF validation reports
- ✅ Timeline exhibit generated (ASCII + Markdown)
- ✅ Opening statement practiced to <120s delivery
- ✅ VibeThinker answer strength >70/100

### Trial Outcome (March 3-10)
- 🎯 Win habitability case (rent withholding + damages)
- 🎯 Win eviction defense (stay in apartment)
- 🎯 Establish systemic pattern for future cases

### Post-Trial (After March 10)
- 📈 Scale evidence automation to 100+ tenant cases
- 📈 Deploy MCP/OpenStack/HostBill integration
- 📈 Build 2,500+ workflow automation library

---

## 🚀 Quick Start

```bash
# 1. Validate trial readiness
./scripts/pre_trial_validation.sh

# 2. Practice opening statement
./scripts/practice_opening_statement.sh

# 3. Validate photo EXIF (example)
python3 scripts/validate_photo_exif.py ~/Documents/Personal/.../mold_photo.jpg

# 4. Generate timeline exhibit
python3 scripts/generate_trial_timeline.py timeline_data.json ascii

# 5. Run VibeThinker (if not done)
python3 vibesthinker/legal_argument_reviewer.py \
  --file ~/Documents/Personal/.../ANSWER.txt \
  --counter-args 5 \
  --output reports/answer_validation.json
```

---

## 📖 Philosophy

**Old thinking**: Build comprehensive infrastructure, then apply to trial  
**New thinking**: Build trial force multipliers NOW, scale infrastructure AFTER winning

**Why it works**:
1. **Pre-trial tools increase win probability** (VibeThinker detects gaps, EXIF proves authenticity)
2. **Trial tools scale post-victory** (Timeline generator works for 100+ cases)
3. **Infrastructure deferred to post-trial** (Focus = winning $43K-$113K+ first)

**Result**: 7 days to trial, 4 force multipliers ready, comprehensive infrastructure deferred to post-victory scaling.
