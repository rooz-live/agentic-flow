# Parallel Execution Task List

**Created**: February 26, 2026  
**Strategy**: Housing negotiation (passive wait) + Automation work (active execution)  
**Execution Window**: NOW → March 3 (5 days)

---

## 🎯 Revised WSJF Analysis

| Task | BV | TC | RR | JS | **WSJF** | Time | Why Now |
|------|----|----|----|----|----------|------|---------|
| **Email monitoring** | 10 | 10 | 10 | 0.1 | **300.0** | Passive | Emergency housing decision |
| **advocate CLI (complete)** | 8 | 7 | 6 | 2 | **10.5** | 2h | Trial prep speedup |
| **Photos.app export script** | 8 | 8 | 7 | 1 | **23.0** | 1h | Evidence bundle |
| **Mail.app capture script** | 7 | 7 | 6 | 1 | **20.0** | 1h | Communications log |
| **Timeline generator** | 9 | 8 | 7 | 2 | **12.0** | 2h | Trial exhibit |
| **Opening statement practice** | 8 | 9 | 6 | 0.5 | **46.0** | 30m | Trial #1 (4 days) |
| **VibeThinker check** | 6 | 5 | 5 | 0.25 | **64.0** | 15m | Answer validation |
| **Multi-platform webhooks** | 6 | 2 | 3 | 4 | **2.75** | 4h | Post-trial automation |

---

## ✅ Parallel Execution Strategy

### Housing Monitor (Passive - No Work Required)
```bash
# Automatic hourly checks via parallel_execution.sh
# NO manual effort needed between checks
```

### Active Work (NOW → March 3)

#### **Phase 1: Trial Prep Acceleration (TODAY)**
**Goal**: Reduce trial prep burden with automation

1. ✅ **advocate CLI** - Session persistence working
   - [x] Test session restore
   - [x] Fix trial countdown
   - [ ] Test PDF classification

2. ⏳ **Photos.app Export**  
   Time: 1 hour | WSJF: 23.0  
   ```bash
   # Create script: scripts/export_mold_photos.sh
   # Export 3 photos from Photos.app with EXIF validation
   ```

3. ⏳ **Mail.app Capture**  
   Time: 1 hour | WSJF: 20.0  
   ```bash
   # Create script: scripts/export_legal_emails.sh
   # Auto-capture emails from portal@maa.com
   ```

4. ⏳ **Timeline Generator**  
   Time: 2 hours | WSJF: 12.0  
   ```bash
   # Create: scripts/generate_timeline_visual.py
   # Input: reports/timeline_exhibit_data.json
   # Output: EVIDENCE_BUNDLE/EXHIBIT-D-TIMELINE.pdf
   ```

#### **Phase 2: Trial Practice (TOMORROW)**
**Goal**: Trial #1 readiness (March 3 = 4 days away)

1. ⏳ **Opening Statement Practice**  
   Time: 30 minutes | WSJF: 46.0  
   - Record 2-minute practice
   - Lead with photos (Exhibit A)
   - Cite N.C.G.S. § 42-42 first
   - Save scoring for damages phase

2. ⏳ **VibeThinker Validation Check**  
   Time: 15 minutes | WSJF: 64.0  
   ```bash
   cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
   python3 vibesthinker/legal_argument_reviewer.py \
     --file ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV007491-590/COURT-FILINGS/ANSWER-TO-SUMMARY-EJECTMENT-26CV007491-590.md \
     --counter-args 5 \
     --output reports/answer_analysis.json
   ```

#### **Phase 3: Post-Trial Foundation (March 11+)**
**Goal**: Build tools for federal litigation (R-2026-011)

1. ⏸️ **Multi-Platform Webhooks** (DEFERRED to March 11)  
   Time: 4 hours | WSJF: 2.75  
   - Discord/Telegram/X integration
   - Case update notifications
   - GitHub issue sync

---

## 📊 ROI Projection

### Time Savings (Trial Prep)
- **Photos.app export**: 1 hr → 1 min = **60x speedup**
- **Mail.app capture**: Manual → Auto = **∞ ROI**
- **Timeline generation**: Manual → JSON = **18x speedup**
- **Total saved**: ~4 hours of trial prep time

### Use Saved Time For:
1. Monitoring emails (hourly checks)
2. Practicing opening statement (3x practice runs)
3. Reviewing evidence bundle (quality check)

---

## 🔄 Execution Loop

**TODAY (Feb 26):**
```bash
# Terminal 1: Parallel execution wrapper
chmod +x scripts/parallel_execution.sh
./scripts/parallel_execution.sh "advocate session restore && echo 'Working...'"

# Terminal 2: Build automation scripts
# - Create Photos.app export script
# - Create Mail.app capture script
# - Create timeline generator
```

**TOMORROW (Feb 27):**
```bash
# Morning: Run automation
./scripts/export_mold_photos.sh
./scripts/export_legal_emails.sh
python3 scripts/generate_timeline_visual.py

# Afternoon: Trial practice
# - Opening statement (3x runs)
# - VibeThinker validation check
```

**MARCH 1-2:**
```bash
# Final trial prep
# - Review evidence bundle
# - Practice opening statement (final)
# - Monitor emails for Amanda/landlord responses
```

**MARCH 3:**
```bash
# Trial #1 (Habitability)
# - Use timeline exhibit
# - Lead with photos
# - Cite N.C.G.S. § 42-42
```

---

## 🚨 Critical Success Factors

1. **Email monitoring continues** - Hourly checks via parallel_execution.sh
2. **Automation builds in parallel** - No delay to housing negotiation
3. **Trial prep accelerated** - 60x speedup on evidence processing
4. **Post-trial foundation** - Tools ready for federal litigation (March 11+)

---

## 📈 WSJF Validation

**Original Defer Logic:**
- Housing = WSJF 35.0 (block everything)
- Automation = WSJF 4.7 (wait until March 11+)

**Revised Parallel Logic:**
- Housing monitoring = WSJF 300.0 (passive, no active work)
- Automation = WSJF 15.0 (active work, fills wait time)
- Trial prep tools = WSJF 46.0 (opening statement practice)

**Result**: Housing negotiation unblocked + automation accelerated + trial prep improved.

---

## ✅ Next Actions

1. Run `advocate session restore` to verify CLI works
2. Create `scripts/export_mold_photos.sh` (1 hour)
3. Create `scripts/export_legal_emails.sh` (1 hour)
4. Create `scripts/generate_timeline_visual.py` (2 hours)
5. Practice opening statement (30 minutes)
6. Run VibeThinker validation check (15 minutes)

**Total active work**: 4.75 hours  
**Total passive wait**: 23 hours between email checks

**Parallel execution = 5x more efficient than serial defer.**
