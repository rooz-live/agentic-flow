# Quick Start: Validation Dashboard & Integration

## Install Dependencies (5 minutes)

```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow/

# Install Python dependencies
pip install textual click telegram-bot-api python-dotenv

# Test TUI dashboard
python validation_dashboard_tui.py
```

## Test Dashboard (1 minute)

```bash
# Run with example data
./validation_dashboard_tui.py

# You should see:
# - 21-role verdict table (green ✓ for pass, red ✗ for fail)
# - Consensus: 20/21 (95.2%) APPROVED
# - ROAM Risk: SITUATIONAL (45/100)
# - WSJF Score: 26.0 (CRITICAL priority)
# - Timestamp: Current time + settlement deadline

# Keyboard shortcuts:
# - q: Quit
# - r: Refresh
# - e: Export results to JSON
```

## Next Actions (WSJF-Ordered)

### NOW (Today - 4 hours)

#### 1. Complete Signature Block Parser (WSJF: 26.0)
**File:** `signature_block_validator.py`
**DoR:** Email samples with multi-line signatures
**DoD:** Detects settlement vs. court signature, suggests corrections

```python
./signature_block_validator.py \
  --file ~/Documents/Personal/CLT/MAA/.../SETTLEMENT-PROPOSAL.eml \
  --type settlement
# Expected: ✓ Signature valid for settlement email
```

#### 2. Integrate Telegram Notifications (WSJF: 22.0)
**File:** `telegram_notifier.py`
**DoR:** Telegram Bot token from @BotFather
**DoD:** Sends notification when validation completes

```bash
# Setup
export TELEGRAM_BOT_TOKEN="your_token_here"
export TELEGRAM_CHAT_ID="@shahrooz"

# Test
python telegram_notifier.py --event "validation_passed" --details "26.0 WSJF score"
# Expected: Message received on Telegram
```

#### 3. Build Mail.app Integration (WSJF: 20.0)
**File:** `mail_integration.py`
**DoR:** Mail.app configured, test .eml file
**DoD:** CLI sends email after validation approval

```bash
# Test send pipeline
./mail_integration.py \
  --draft ~/Documents/Personal/CLT/MAA/.../SETTLEMENT-PROPOSAL.eml \
  --validate \
  --send

# Workflow:
# 1. Validate email (signature, timestamp, SoR)
# 2. Show TUI dashboard for HITL approval
# 3. Send via Mail.app if approved
# 4. Log audit trail to validation_audit.json
```

### NEXT (This Week - 12 hours)

#### 4. Systemic Indifference Analyzer (WSJF: 15.0)
**File:** `systemic_indifference_analyzer.py`
**DoR:** Case files organized by org (MAA, Apex, US Bank, etc.)
**DoD:** Generates SYSTEMIC-INDIFFERENCE-REPORT.md with 6-org scores

```bash
./systemic_indifference_analyzer.py \
  --case-dir ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/ \
  --output SYSTEMIC-INDIFFERENCE-REPORT.md

# Expected output:
# - MAA: 40/40 (LITIGATION-READY)
# - Apex/BofA: 15/40 (SETTLEMENT-ONLY)
# - US Bank: 10/40 (DEFER TO PHASE LATER)
# - T-Mobile: 8/40 (DEFER)
# - Credit Bureaus: 5/40 (DEFER)
# - IRS: 3/40 (NOT SYSTEMIC - isolated event)
```

#### 5. Advocate CLI (WSJF: 12.0)
**File:** `advocate_cli.py`
**DoR:** Click framework installed
**DoD:** 5+ commands working

```bash
# Install
pip install click

# Commands
advocate validate ~/path/to/email.eml --type settlement --min-systemic-score 35
advocate wholeness --deep --file email.eml  # Shows TUI dashboard
advocate audit --adversarial --roles judge,prosecutor,defense
advocate dashboard --realtime --port 8080  # Web dashboard (future)
advocate export --format json --output results.json
```

#### 6. VibeThinker AI Reasoning (WSJF: 18.0)
**File:** `vibethinker_settlement_reasoning.py`
**DoR:** VibeThinker-1.5B model downloaded
**DoD:** AI recommends send timing with 97%+ confidence

```bash
# Download model
huggingface-cli download WeiboAI/VibeThinker-1.5B

# Run AI reasoning
python vibethinker_settlement_reasoning.py \
  --context deadline_hours:5.5,roam_risk:SITUATIONAL,systemic_score:40,doug_response:pending \
  --strategies 10 \
  --output ai_recommendation.json

# Expected:
# - SFT Phase: 10 diverse strategies generated
# - RL Phase: MGPO selects optimal (e.g., "Send friendly follow-up at 5:30 PM")
# - Confidence: 97.8%
# - Alternatives: 3 backup strategies with WSJF scores
```

### LATER (Next Sprint - 10 hours)

#### 7. Meta Platforms Integration
**Files:** `whatsapp_integration.py`, `instagram_dm.py`, `messenger_api.py`
**DoR:** Meta Business accounts, API keys
**DoD:** Multi-channel routing based on WSJF urgency

#### 8. GUI Dashboard (React/Electron)
**Files:** `frontend/`, `electron_main.js`
**DoR:** Node.js, npm installed
**DoD:** Web-based dashboard with real-time updates

#### 9. Fastcase API Integration
**File:** `legal_research_automation.py`
**DoR:** Fastcase API key (free with NC Bar membership?)
**DoD:** Automated case law validation

---

## Success Metrics

### Technical DoD
- [ ] TUI dashboard shows 21 roles with color-coded verdicts ✅ (DONE)
- [ ] Signature validator detects settlement vs. court format
- [ ] Telegram sends notifications for 5+ events
- [ ] Mail.app integration sends validated emails
- [ ] Systemic analyzer scores 6 orgs on 40-point scale
- [ ] Advocate CLI has 5+ functional commands
- [ ] VibeThinker generates 10+ strategies with MGPO selection

### Strategic DoD
- [ ] Email validation time: <5 min (vs. 58 hours manual)
- [ ] ROAM classification accuracy: 95%+
- [ ] WSJF auto-recalculation: Every 4 hours
- [ ] Cross-org pattern detection: 80%+ cases
- [ ] Telegram delivery: 100% for critical events

---

## Automation Levels

| Level | Description | Effort | MAA Case |
|-------|-------------|--------|----------|
| 0: Manual | 58 hours per email | Baseline | ❌ Unsustainable |
| 1: Detection | Flags issues, human fixes | 30 min | ⚠️ Current |
| 2: Application | Auto-fixes, human reviews | 5 min | ✅ RECOMMENDED |
| 3: With Review | Auto-fixes + validation | 10 min | 🎯 Target |
| 4: Fully Auto | No human in loop | 2 min | ⚠️ Risky |
| 5: Semi-Auto | HITL approval only | 5 min | ✅ Best balance |

**Recommendation:** Level 3 (With Review) = 10 minutes total
- Auto-validation: 2 min
- TUI dashboard review: 3 min
- HITL approval: 5 min
- **Total ROI:** 58 hours → 10 minutes = 348x improvement

---

## Budget & Timeline

### CapEx (One-time)
- Development time: 40 hours @ $0 (your time)
- API setup: $50 (Telegram Bot, Meta Business)
- **Total:** $50

### OpEx (Monthly)
- Telegram Bot: Free tier
- Meta Business API: $0-50/month
- Server hosting (optional): $20-50/month
- **Total:** $20-100/month

### Time Investment
| Phase | Hours | When |
|-------|-------|------|
| TUI Dashboard | 2-4 | ✅ TODAY (DONE) |
| Signature Parser | 1-2 | TODAY |
| Telegram | 1 | TODAY |
| Mail Integration | 2-3 | TODAY |
| Systemic Analyzer | 4-6 | THIS WEEK |
| Advocate CLI | 3-4 | THIS WEEK |
| VibeThinker AI | 4-6 | THIS WEEK |
| **TOTAL** | **17-26 hours** | |

---

## Next Command (Run Now!)

```bash
# Test the TUI dashboard you just created
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow/
python validation_dashboard_tui.py

# Then move to TODO #2 (Signature Parser)
```

---

## Questions?

1. **Do I need to install VibeThinker model?**
   - Not immediately. It's 1.5B params (6GB). Download only when ready for Phase 6.

2. **Can I use this for other legal cases?**
   - Yes! The wholeness framework is generic. Just adjust validation rules.

3. **What if Doug responds after 5 PM?**
   - Telegram will notify you. Dashboard auto-recalculates WSJF every 4 hours.

4. **Should I CC purpose@yo.life?**
   - No, unless it's a specific person you know with relevance to the case.

5. **How do I add more circles/roles?**
   - Edit `validation_dashboard_tui.py` lines 122-143. Add to layer1/2/3/4 lists.

---

## Troubleshooting

### "ModuleNotFoundError: textual"
```bash
pip install textual
```

### "Telegram bot not sending messages"
```bash
# Verify token
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"

# Check chat ID
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates"
```

### "Mail.app not sending emails"
```bash
# Check Mail.app preferences
open -a Mail
# Preferences → Accounts → Verify SMTP settings
```

---

## Where Error Hides

From your Zarathustra essay: **"Error does not disappear; it is deferred, managed, and increasingly absorbed into precedent."**

In legal case validation:
- **Divergent induction** (exploratory) → Validates 21 roles independently
- **Convergent induction** (institutional) → Builds precedent (case law, NC statutes)
- **Pragmatic long-term** (scientific) → Learns from past validation failures
- **Dogmatic long-term** → Bureaucratic sclerosis (e.g., LRS referral loop)

The wholeness framework prevents error from hiding by:
1. **Surface early:** 21-role adversarial review catches issues pre-send
2. **Multiple perspectives:** Judge/Prosecutor/Defense simulate opposition
3. **Temporal validation:** Catches "Friday, Feb 14" (actually Saturday) errors
4. **Systemic analysis:** Identifies org-wide patterns (not isolated incidents)

**Key insight:** Systems fail when "learning becomes too expensive." The TUI dashboard makes learning cheap (5 min validation vs. 58 hours manual review).

---

Ready to test the TUI dashboard?
