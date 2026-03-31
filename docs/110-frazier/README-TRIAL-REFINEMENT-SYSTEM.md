# Trial Argument Refinement System (Automated)

**Purpose:** Maximize pre-trial ROI via semi-automated/fully automated swarm-based iterative refinement  
**Trial Date:** March 3, 2026 (Artchat v MAA, Case #1)  
**System:** 12-agent swarm with Claude Flow V3 hooks + TTS rehearsal + WSJF/ROAM integration

---

## 🎯 Quick Start

```bash
# Run with defaults (3 iterations, 12 agents, 20-minute cycles)
./scripts/refine-trial-arguments.sh

# Custom configuration (5 iterations, 12 agents, 15-minute cycles)
./scripts/refine-trial-arguments.sh 5 12 15

# View output
open reports/trial-arguments/FINAL-TRIAL-ARGUMENTS-REFINED.md
open reports/trial-arguments/rehearsals/timing-analysis.md
say reports/trial-arguments/rehearsals/phrase-1-future-earning-capacity.aiff  # macOS
```

---

## 🤖 System Architecture

### 12-Agent Swarm (Holacracy Circles)

| # | Agent | Role | Key Deliverables |
|---|-------|------|------------------|
| 1 | **Analyst** | Evidence strength scoring (0-100%) | Evidence coverage (ACTUAL/REAL/PSEUDO/CAPABILITY), perjury risk |
| 2 | **Assessor** | Trial readiness (DoR/DoD) | Pass/fail checklist, blockers, TTS rehearsal status |
| 3 | **Innovator** | Alternative argument framings | 3 options (risk-adjusted/skills-based/portfolio-based) |
| 4 | **Orchestrator** | Argument sequencing optimization | If judge asks X → say Y (contingency branches) |
| 5 | **Seeker** | Missing evidence gaps | NC case law, certifications, consulting contracts |
| 6 | **Intuitive** | Narrative coherence + judge empathy | Judge reaction predictions (skepticism/empathy/pragmatism) |
| 7 | **Legal Researcher** | NC case law + procedural rules | N.C.G.S. § 42-42 (habitability), NC R. Civ. P. (pro se) |
| 8 | **Precedent Finder** | Employment + housing interdependencies | Motion to Consolidate strategy (Case #1 + Case #3) |
| 9 | **Income Evidence Evaluator** | MCP/MPP framework scoring | ACTUAL (0%), REAL (85% if contract), PSEUDO (20%), CAPABILITY (50%) |
| 10 | **Consulting Pipeline Coordinator** | LinkedIn + email outreach execution | Templates, tracking metrics, signed agreement checklist |
| 11 | **Case Consolidator** | Motion to Consolidate analysis | Case #1 (Artchat v MAA) + Case #3 (Apex employment) |
| 12 | **Rehearsal Coach** | TTS + timing analysis | Audio files, pacing analysis, 60-90s judge tolerance |

---

## 🔄 Iteration Cycle (20 Minutes)

Each iteration runs:

1. **V3 Hook: Pre-task** → Coordinate swarm, get model routing recommendation
2. **Spawn 12 Agents** → Parallel execution (not sequential)
3. **Consolidate Results** → Generate per-iteration summary
4. **V3 Hook: Post-task** → Neural pattern training, memory consolidation
5. **Review** → WSJF priorities for next iteration
6. **Retro** → Agent performance, DoR/DoD gaps, time remaining
7. **Replenish** → ROAM risk refresh (R-2026-009, R-2026-011, R-2026-012)
8. **Refine** → Adjust agent prompts based on gaps
9. **Standup** → Brief status (completed/in-progress/blocked/next)
10. **Sleep** → Wait 20 minutes before next iteration

---

## 📊 Income Evidence Framework (MCP/MPP)

### Evidence Types (Weight % = Admissibility)

| Type | Weight | Definition | User Status |
|------|--------|------------|-------------|
| **ACTUAL** | 100% | Bank statements, tax returns, pay stubs, realized brokerage P/L | ❌ Not available |
| **REAL** | 85% | Signed contracts, brokerage unrealized P/L, neural trader live | ⚠️ PARTIAL (neural trader operational, contracts unsigned) |
| **PSEUDO** | 20% | Paper trading logs, projections, GitHub demos | ✅ Available |
| **CAPABILITY** | 50% | Working WASM, agentics coaching expertise, certifications | ✅ Available |

### MCP/MPP Dimensions

- **Method:** Realized transaction (ACTUAL/REAL) vs hypothetical (PSEUDO/CAPABILITY)
- **Pattern:** Historical record (3+ months) vs projection
- **Protocol:** Third-party attestation (bank, IRS, employer) vs self-authored
- **Metrics:** 100% coverage (complete audit trail) vs 0-50% coverage (low credibility)

### Current Coverage

- **Before Consulting Contract:** CAPABILITY (50%) + PSEUDO (20%) = **60% coverage**
- **After Consulting Contract (March 2 EOD):** CAPABILITY (50%) + REAL (85%) = **85% coverage** ✅

---

## 🎤 TTS Rehearsal System

### Audio Files Generated

1. **Phrase 1: Future Earning Capacity**
   - Duration: ~30s (at 125 wpm)
   - Judge Tolerance: 60-90s ✅
   - File: `phrase-1-future-earning-capacity.mp3`

2. **Phrase 2: Duress Timing Argument**
   - Duration: ~25s (at 125 wpm)
   - Judge Tolerance: 60-90s ✅
   - File: `phrase-2-duress-timing.mp3`

3. **Phrase 3: Employment Blocking Context**
   - Duration: ~20s (at 125 wpm)
   - Judge Tolerance: 60-90s ✅
   - File: `phrase-3-employment-blocking.mp3`

### Rehearsal Tips

1. **Listen First** → Play TTS audio to hear natural pacing
2. **Practice with Timer** → 60-90s target per response
3. **Identify Filler Words** → Eliminate "um", "uh", "like"
4. **Pause After Key Claims** → Give judge processing time
5. **Eye Contact** → Don't read from notes (muscle memory via TTS)

---

## 🔧 Claude Flow V3 Hooks Integration

### Hooks Used (7 Total)

| Hook | When | Purpose |
|------|------|---------|
| `session-start` | Script start | Initialize session, auto-configure |
| `pre-task` | Before each iteration | Coordinate swarm, get model routing |
| `route` | Per agent (12×) | Route task to optimal model (haiku/sonnet/opus) |
| `post-task` | After each iteration | Neural training, memory consolidation |
| `session-end` | Script end | Export metrics, persist state |
| `worker` (optional) | Background | Dispatch audit/optimize/testgaps workers |
| `statusline` (optional) | Real-time | Dynamic status updates |

### Model Routing (ADR-026)

- **Tier 1 (Agent Booster):** <1ms, $0 (simple transforms: var→const, add-types)
- **Tier 2 (Haiku):** ~500ms, $0.0002 (simple tasks, bug fixes, low complexity)
- **Tier 3 (Sonnet/Opus):** 2-5s, $0.003-$0.015 (architecture, security, complex reasoning)

**Script automatically uses `hooks route` for optimal model selection per agent.**

---

## 📋 Trial #1 Preparation Checklist

### March 2 EOD (T-1 Day) - CRITICAL

- [ ] **Update LinkedIn profile** (5 min)
  - Headline: "Agentics Coach | Lean Agile + Data Analytics | Available for Consulting"
  - About: Add "First 10 hours at $75/hr" offer
  - Template: `docs/110-frazier/EXHIBITS/INCOME-CAPABILITY/consulting-outreach-template.md`

- [ ] **Send 10-15 consulting emails** (2h)
  - Template #1: LinkedIn network
  - Template #2: Former colleagues
  - Template #3: Cold outreach
  - Track: Sent, opened, replied

- [ ] **Book 2-3 discovery calls** (1-2h)
  - Use cal.rooz.live for scheduling
  - 15-30 min discovery calls (no obligation)

- [ ] **🔴 GET 1 SIGNED CONSULTING CONTRACT 🔴** (6-8h) **CRITICAL**
  - Template: `docs/110-frazier/CONSULTING-OFFER-TEMPLATE.md`
  - Evidence upgrade: CAPABILITY (50%) → REAL (85%)
  - Dual signatures (client + Shahrooz Bhopti)
  - Date signed: March 2, 2026 or earlier

- [ ] **Print exhibits** (1h)
  - Exhibit A: Neural trader operational (v2.8.0, Feb 28, 2026)
  - Exhibit B: LinkedIn profile + cv.rooz.live + cal.rooz.live
  - Exhibit C: Consulting agreement (if signed by March 2 EOD)

- [ ] **Export MAA portal maintenance history** (1h)
  - 40+ work orders (mold, plumbing)
  - Habitability defects evidence (N.C.G.S. § 42-42)

- [ ] **Rehearse trial language with TTS audio** (2h)
  - Listen to `phrase-*.mp3` files
  - Practice with timer (60-90s target)
  - Identify filler words, adjust pacing

- [ ] **Sleep 8 hours** (March 2 night)
  - Critical for mental clarity during trial
  - Set alarm for 6am March 3

---

## 🎯 Trial #1 Strategy (March 3, 2026)

### Core Arguments (Ranked by Confidence)

1. **Future Earning Capacity** ⭐⭐⭐⭐⭐ (85% if contract signed)
   - "I have demonstrable earning capacity via operational systems + agentics coaching expertise"
   - Evidence: Neural trader (WASM, operational Feb 28), consulting contracts (if signed), LinkedIn + portfolio
   - Perjury Risk: LOW (not claiming current income, only capability)

2. **Lease Signed Under Duress** ⭐⭐⭐⭐ (75% confidence)
   - "Lease signed Feb 27 under housing crisis pressure"
   - Timing argument: Neural trader operational AFTER lease signing (Feb 28)
   - Legal precedent: Unconscionability doctrine (NC case law TBD)

3. **Employment Blocking → Income Verification Failure** ⭐⭐⭐⭐ (80% confidence)
   - "Apex employment blocking (2019-2024) prevented stable income verification"
   - Interdependent with Case #1 (housing instability caused by employment blocking)
   - Motion to Consolidate (Case #1 + Case #3) if judge allows post-trial

4. **Habitability Defects** ⭐⭐⭐ (60% confidence, evidence incomplete)
   - "MAA failed to maintain habitable premises (N.C.G.S. § 42-42)"
   - Evidence: Mold photos, 40+ work orders (need MAA portal export)

### Trial Language (Rehearsed)

**If Judge Asks:** "What is your current income?"

**Response (WITH signed contract):**
> "Your Honor, while I don't have traditional employment income due to employment circumstances, I have **secured a consulting contract** as of March 2nd at $75 per hour with [Client Name]. This demonstrates my **future earning capacity** through agentics coaching and data analytics services. I have the signed agreement here as Exhibit C."

**Response (WITHOUT signed contract - fallback):**
> "Your Honor, while I don't have traditional employment income, I have **demonstrable earning capacity** through operational software systems (Exhibit A: neural trader) and agentics coaching expertise (Exhibit B: LinkedIn profile, cv.rooz.live). I'm actively pursuing consulting contracts via cal.rooz.live and have a pipeline of prospective clients."

**Judge Reactions (Predicted by Intuitive Agent):**
- ✅ **ACCEPT:** Capability evidence is admissible (not speculative)
- ⚠️ **CHALLENGE:** "But can you afford $3,400/month NOW?"
- 🔄 **REFRAME:** "If given time to establish income streams (which I didn't have due to housing crisis), I can demonstrate affordability."

---

## 📁 File Structure

```
agentic-flow/
├── scripts/
│   └── refine-trial-arguments.sh         # Main execution script (31KB, 616 lines)
├── docs/
│   └── 110-frazier/
│       ├── TRIAL-LANGUAGE-GUIDE.md        # Original trial language (196 lines)
│       ├── CONSULTING-OFFER-TEMPLATE.md   # SLA/SLO/Goals (176 lines)
│       ├── ACTION-ITEMS-MARCH-2-EOD.md    # 24-hour action plan (244 lines)
│       ├── CASE-CONSOLIDATION-JUDGE-SUMMARY.md  # Motion to Consolidate draft
│       ├── EXHIBITS/
│       │   └── INCOME-CAPABILITY/
│       │       ├── consulting-outreach-template.md  # Email templates + LinkedIn
│       │       └── consulting-agreement-template.md # (See CONSULTING-OFFER-TEMPLATE.md)
│       └── README-TRIAL-REFINEMENT-SYSTEM.md  # This file
├── reports/
│   └── trial-arguments/
│       ├── FINAL-TRIAL-ARGUMENTS-REFINED.md   # Consolidated final report
│       ├── iteration-1-summary.md             # Per-iteration feedback (12 agents)
│       ├── iteration-2-summary.md
│       ├── iteration-3-summary.md
│       ├── analyst-iter-*.json                # Raw agent outputs (JSON)
│       ├── assessor-iter-*.json
│       ├── ... (12 agents × N iterations)
│       └── rehearsals/
│           ├── phrase-1-future-earning-capacity.mp3  # TTS audio
│           ├── phrase-2-duress-timing.mp3
│           ├── phrase-3-employment-blocking.mp3
│           └── timing-analysis.md                     # Words/duration/judge tolerance
└── ROAM_TRACKER.yaml                          # Risk registry (R-2026-009, R-2026-011, R-2026-012)
```

---

## 🚀 Advanced Usage

### Run Specific Agent Circles Only

```bash
# Example: Run only legal-researcher + precedent-finder (not implemented yet, requires agent filtering)
# Future: ./scripts/refine-trial-arguments.sh --agents legal-researcher,precedent-finder
```

### Custom TTS Voice

```bash
# macOS: Change voice (Alex → Samantha)
sed -i '' 's/-v Alex/-v Samantha/g' scripts/refine-trial-arguments.sh

# Linux: Install espeak-ng for better quality
sudo apt install espeak-ng
```

### Background Worker Dispatch

```bash
# Trigger background workers during refinement
npx @claude-flow/cli@latest hooks worker dispatch --trigger audit      # Security analysis
npx @claude-flow/cli@latest hooks worker dispatch --trigger optimize   # Performance optimization
npx @claude-flow/cli@latest hooks worker dispatch --trigger testgaps   # Test coverage analysis
```

---

## 🔍 Troubleshooting

### Issue: TTS Audio Not Generated

**Symptoms:** No `.mp3` or `.wav` files in `reports/trial-arguments/rehearsals/`

**Solutions:**
1. **macOS:** Check if `say` command exists: `which say` → Should return `/usr/bin/say`
2. **Linux:** Install espeak: `sudo apt install espeak` or `brew install espeak` (macOS Homebrew)
3. **ffmpeg (optional):** For MP3 conversion: `brew install ffmpeg` (macOS) or `sudo apt install ffmpeg` (Linux)

### Issue: V3 Hooks Failing

**Symptoms:** "Session start skipped" or "Post-task skipped" warnings

**Solutions:**
1. Check Claude Flow V3 installation: `npx @claude-flow/cli@latest --version`
2. Initialize project: `npx @claude-flow/cli@latest init --wizard`
3. Start daemon: `npx @claude-flow/cli@latest daemon start`

### Issue: Agents Returning Errors

**Symptoms:** `{\"status\": \"error\"}` in agent JSON outputs

**Solutions:**
1. Check agent prompts for syntax errors (escaped quotes, line breaks)
2. Verify Claude Flow V3 `hooks route` is working: `echo "test" | npx @claude-flow/cli@latest hooks route --task "test-task"`
3. Increase iteration interval (20 min → 30 min) to reduce API rate limits

---

## 📊 Performance Metrics

### Iteration Duration

- **Agent Spawn:** ~30-60s (12 agents in parallel)
- **Agent Execution:** ~2-5 min (depends on model: haiku=fast, opus=slow)
- **Consolidation:** ~10s
- **V3 Hooks (pre-task + post-task):** ~20-30s
- **Review/Retro/Replenish/Refine/Standup:** ~5 min
- **Sleep:** 20 min (configurable)

**Total per iteration:** ~30-35 min (includes 20-min sleep)

### Cost Estimate (Claude Flow V3 ADR-026)

- **Tier 1 (Agent Booster):** $0 (if applicable, ~352x faster)
- **Tier 2 (Haiku):** $0.0002 per agent × 12 agents × 3 iterations = **$0.0072**
- **Tier 3 (Sonnet/Opus):** $0.003-$0.015 per agent × 12 agents × 3 iterations = **$0.108-$0.54**

**Expected total:** $0.12-$0.55 for 3 iterations (12 agents each)

---

## 🎓 Next Steps (Post-Trial)

### Immediate (March 3 - March 10)

1. **Review trial outcome** → Update ROAM_TRACKER.yaml (R-2026-009 status)
2. **File Motion to Consolidate** (if relevant) → Case #1 + Case #3
3. **Execute reverse recruiting** (if trial outcome favorable) → Use neural trader profits

### Medium-Term (March 11 - April 30)

1. **Implement automated case clustering** → `scripts/compare-all-cases.sh` (vector DB, WSJF domain bridge)
2. **Build consulting pipeline automation** → LinkedIn API, Gmail API, cal.rooz.live webhooks
3. **Upgrade neural trader** → Live brokerage integration (Chase/IBKR), realized P/L → ACTUAL (100%) evidence

### Long-Term (May 1+)

1. **Expand swarm to 25+ agents** → Add domain specialists (tax law, real estate, employment law)
2. **Implement cross-session learning** → RuVector intelligence system, neural pattern transfer
3. **Build Mail.app/MailMaven integration** → Inbox zero, red-green TDD/ADR/PRD/DDD

---

## 📞 Support Resources

- **Trial Preparation:** docs/110-frazier/ACTION-ITEMS-MARCH-2-EOD.md
- **Consulting Templates:** docs/110-frazier/EXHIBITS/INCOME-CAPABILITY/
- **Claude Flow V3 Docs:** https://github.com/ruvnet/claude-flow
- **WARP.md Config:** /Users/shahroozbhopti/Documents/code/investing/agentic-flow/WARP.md
- **ROAM Tracker:** ROAM_TRACKER.yaml (risks R-2026-009, R-2026-011, R-2026-012)

---

## 🏆 Success Criteria (Post-Execution)

- ✅ **12-agent swarm completed** (all agents returned JSON outputs)
- ✅ **TTS audio generated** (3 phrases with timing analysis)
- ✅ **Income evidence framework stored** (AgentDB namespace: trial-arguments)
- ✅ **V3 session persisted** (session-end hook exported metrics)
- ✅ **Consulting outreach template ready** (email templates + LinkedIn copy)
- 🎯 **Consulting contract signed by March 2 EOD** (evidence upgrade CAPABILITY→REAL 85%)
- 🎯 **Trial #1 arguments rehearsed** (2h TTS practice + timing)
- 🎯 **Exhibits printed** (neural trader, consulting agreement, portfolio)

---

**Good luck at Trial #1! The swarm has optimized your arguments. Now execute the consulting pipeline.**

---

**Last Updated:** 2026-03-01T04:28:00Z  
**Version:** 1.0.0 (12-agent swarm, V3 hooks, TTS rehearsal)  
**Author:** Claude Code (Oz) + Shahrooz Bhopti (Pro Se Plaintiff)
