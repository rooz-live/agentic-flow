# OODA Loop Retro & Inbox Zero Framework
## Observe-Orient-Decide-Act for Legal Advocacy & Goal Planning

### Current State Analysis

**OODA Loop Implementation Review:**
- ✅ **Observe**: Mail capture, intake parsing, role assignment working
- ✅ **Orient**: 40-role governance council, WSJF scoring, ROAM analysis
- ✅ **Decide**: Consensus validation, strategic diversity (SFT→RL→MGPO)
- ⚠️ **Act**: Execution gaps - deployment blocked (cPanel), some CLI incomplete

**Inbox Zero Status:**
- Current: 58 hours manual effort per email cycle
- Target: 5-10 minutes per email (auto-validation + human review)
- Gap: 348x efficiency improvement needed

---

## RETRO FINDINGS

### What Works Well

| Component | Status | Evidence |
|-----------|--------|----------|
| Mail Capture & Parse | ✅ | `mail-capture-validate.sh` functional |
| 40-Role Validation | ✅ | `governance_council.py` operational |
| WSJF Scoring | ✅ | `vibethinker_pipeline.py` --deadline working |
| Systemic Analysis | ✅ | `systemic_indifference_analyzer.py` scoring 40/40 for MAA |
| Coherence Validation | ✅ | `validate_coherence.py` running (timeout issues) |

### What Needs Improvement

| Component | Issue | Impact |
|-----------|-------|--------|
| **cPanel Deployment** | Missing `CPANEL_API_TOKEN` | Blocking resume deployment |
| **TUI Dashboard** | Lint errors, limited interactivity | Reduced usability |
| **Rust Core Tests** | Compilation slow | Delaying validation |
| **Validation Speed** | Coherence check times out | 10+ min vs target <30 sec |
| **Integration** | Fragmented CLI tools | No unified interface |

### Anti-Patterns Detected

1. **Tool Sprawl**: 15+ separate scripts vs unified `advocate` CLI
2. **Environment Fragmentation**: `.env`, `.env.example`, `.env.template` - naming inconsistency
3. **Blocking Dependencies**: cPanel token blocks 3 downstream tasks
4. **Validation Without Enforcement**: DoD gates exist but not blocking CI/CD

---

## REPLENISHMENT PLAN

### N-1 (Now - This Week)

**Goal:** Unblock critical path, establish fiscal discipline

```bash
# 1. Environment Consolidation (2 hours)
./scripts/cpanel-env-setup.sh        # Once token provided
./scripts/cpanel-env-setup.sh --all # Propagate to all .env files

# 2. Freeze Unvalidated Subscriptions ($2K/mo savings)
./scripts/subscription-audit.sh --cancel-unused

# 3. Coherence Validation Gate (already built, needs fixing)
python3 scripts/validate_coherence.py --fail-below 85

# 4. Settlement Email Pre-Send Gate (already built)
./scripts/mail-capture-validate.sh --file email.eml --strategic --notify

# 5. WSJF as Budget Enforcer
# Auto-defer any task with WSJF < 3.0
```

**Exit Condition:**
- [ ] cPanel API responding
- [ ] $2K/mo subscription savings realized
- [ ] Coherence validation < 30 seconds
- [ ] Settlement email validation passing

### N-2 (Next - This Month)

**Goal:** Operational efficiency, data-driven insights

```bash
# X-1: Automated Spend Dashboard
python3 src/budget_dashboard.py --real-time

# X-2: WSJF-Driven Task Rotation
python3 src/wsjf_rotation.py --auto

# X-3: CV/Resume Deployment Pipeline  
./scripts/cv-deploy-cicd.sh all  # Build + Measure + Learning

# X-4: Advocate CLI 40-Role Integration
advocate validate --file email.eml --deep

# X-5: Telegram Bot Activation
python3 src/telegram_notifier.py --bot-token $TELEGRAM_BOT_TOKEN

# X-6: PRD Documents with Measurable Criteria
# All PRDs must have Gherkin acceptance criteria
```

**Exit Condition:**
- [ ] Budget dashboard live
- [ ] CV auto-deploying on PR merge
- [ ] Advocate CLI handling 80% of validation use cases
- [ ] Telegram notifications for critical alerts

### N-3 (Later - This Quarter)

**Goal:** Predictive capabilities, AI-driven optimization

```bash
# L-1: AI-Driven Spend Anomaly Detection
python3 src/anomaly_detector.py --model ensemble

# L-2: Predictive Budgeting (Monte Carlo)
python3 src/predictive_budget.py --simulations 10000

# L-3: Semi-Auto Patent Application System
# See PATENT_SYSTEM_SPEC.md for architecture

# L-4: React GUI / Electron Dashboard
npm run dev  # Local development

# L-5: Cross-Platform IDE Extensions
# Windsurf/VSCode extension for validation

# L-6: Meta/LinkedIn/X Integrations
# OAuth2 flows, webhook handling

# L-7: STX/OpenStack Infrastructure Optimization
# Cloud cost reduction via autoscaling
```

**Exit Condition:**
- [ ] 95% anomaly detection accuracy
- [ ] ±10% budget forecast accuracy
- [ ] Patent system processing applications
- [ ] GUI dashboard with real-time metrics

---

## OODA LOOP REFINEMENTS

### Observe Phase Improvements

```python
# Enhanced mail observation with metadata extraction
class MailObserver:
    """Improved observation with context preservation"""
    
    def observe(self, email_path: str) -> Observation:
        return Observation(
            # Existing
            sender=self.extract_sender(email_path),
            subject=self.extract_subject(email_path),
            body=self.extract_body(email_path),
            
            # NEW: Contextual metadata
            thread_depth=self.count_thread_depth(email_path),
            response_latency_hours=self.calculate_latency(email_path),
            tone_sentiment=self.analyze_sentiment(email_path),
            legal_deadline=self.extract_deadline(email_path),
            opposing_counsel_pattern=self.detect_counsel_tactics(email_path)
        )
```

### Orient Phase Improvements

```python
# Faster orientation with cached role profiles
class FastOrientor:
    """Sub-second orientation for inbox zero target"""
    
    def __init__(self):
        # Pre-load role profiles
        self.role_cache = self._load_role_cache()
        self.case_history = self._load_case_history()
    
    def orient(self, observation: Observation) -> Orientation:
        # Parallel role simulation (was sequential)
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {
                executor.submit(self._simulate_role, role, observation): role
                for role in self.role_cache.values()
            }
            
            verdicts = {}
            for future in as_completed(futures):
                role = futures[future]
                verdicts[role.id] = future.result()
        
        return Orientation(
            verdicts=verdicts,
            consensus=self._calculate_consensus(verdicts),
            roam_classification=self._classify_roam(observation),
            wsjf_score=self._calculate_wsjf(observation),
            recommended_action=self._select_action(verdicts)
        )
```

### Decide Phase Improvements

```python
# Confidence-weighted decision with human-in-the-loop
class ConfidenceBasedDecider:
    """Decide with confidence threshold for HITL"""
    
    CONFIDENCE_THRESHOLDS = {
        "auto_execute": 0.95,    # Confidence ≥95%: auto-send
        "human_review": 0.70,    # Confidence 70-95%: review queue
        "full_analysis": 0.50    # Confidence <70%: deep analysis
    }
    
    def decide(self, orientation: Orientation) -> Decision:
        confidence = orientation.consensus.confidence
        
        if confidence >= self.CONFIDENCE_THRESHOLDS["auto_execute"]:
            return Decision(
                action=orientation.recommended_action,
                auto_execute=True,
                human_approval_required=False,
                explanation=f"High confidence ({confidence:.1%}) - auto-executing"
            )
        
        elif confidence >= self.CONFIDENCE_THRESHOLDS["human_review"]:
            return Decision(
                action=orientation.recommended_action,
                auto_execute=False,
                human_approval_required=True,
                review_queue="standard",
                explanation=f"Moderate confidence ({confidence:.1%}) - needs review"
            )
        
        else:
            return Decision(
                action="deep_analysis",
                auto_execute=False,
                human_approval_required=True,
                review_queue="urgent",
                explanation=f"Low confidence ({confidence:.1%}) - requires deep analysis"
            )
```

### Act Phase Improvements

```python
# Reliable action execution with rollback capability
class ReliableActor:
    """Execute with verification and rollback"""
    
    def act(self, decision: Decision) -> ActionResult:
        # Pre-action snapshot
        snapshot = self._create_state_snapshot()
        
        try:
            # Execute with timeout
            result = self._execute_with_timeout(
                decision.action,
                timeout_seconds=30
            )
            
            # Verify outcome
            if not self._verify_outcome(result, decision.expected_outcome):
                raise ActionVerificationError("Outcome mismatch")
            
            # Log success
            self._log_action(decision, result, status="success")
            
            return ActionResult(
                status="success",
                outcome=result,
                verification_passed=True
            )
            
        except Exception as e:
            # Rollback on failure
            self._restore_snapshot(snapshot)
            
            # Log failure
            self._log_action(decision, None, status="failed", error=str(e))
            
            # Escalate
            self._escalate_to_human(decision, e)
            
            return ActionResult(
                status="failed",
                error=str(e),
                rolled_back=True
            )
```

---

## INBOX ZERO TARGET ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INBOX ZERO TARGET (< 5 min/email)                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  OBSERVE (30 sec)          ORIENT (60 sec)          DECIDE (30 sec)      │
│  ┌──────────────┐          ┌──────────────┐          ┌──────────────┐    │
│  │ Mail Parse   │─────────▶│ 40-Role Sim  │─────────▶│ Confidence   │    │
│  │ Metadata Ext │  0.5s    │ (parallel)   │  2.0s    │ Threshold  │    │
│  │ Context Load │          │ WSJF Score   │          │ Route Queue  │    │
│  └──────────────┘          │ ROAM Class   │          └──────────────┘    │
│                            └──────────────┘                             │
│                                                                         │
│  ACT (180 sec) - Conditional                                           │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │ High Confidence (≥95%): Auto-execute (5 sec)                 │      │
│  │ Medium Confidence (70-95%): Human review queue (180 sec)      │      │
│  │ Low Confidence (<70%): Deep analysis → human (defer)          │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                         │
│  TARGET: 5 min/email = 12 emails/hour = 96 emails/day                     │
│  CURRENT: 58 hours/email = 0.017 emails/hour                            │
│  IMPROVEMENT: 348x efficiency gain                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## EXIT CONDITIONS (DoR/DoD)

### Definition of Ready (DoR) for Email Processing

- [ ] Mail parsed with metadata extraction
- [ ] 40-role verdicts cached or computed
- [ ] WSJF score calculated
- [ ] ROAM classification complete
- [ ] Confidence threshold determined

### Definition of Done (DoD) for Email Processing

- [ ] Consensus ≥70% (or HITL approved)
- [ ] Action executed or queued
- [ ] Outcome verified or escalated
- [ ] Audit trail logged
- [ ] Response time <5 minutes

---

## IMMEDIATE ACTIONS (This Session)

1. **Provide CPANEL_API_TOKEN** → Unblocks deployment
2. **Run validation coherence with timeout fix** → Faster feedback
3. **Execute cargo test** → Verify Rust core (running now)
4. **Fix TUI lint errors** → Clean build
5. **Consolidate .env files** → Reduce confusion

**Target State:** All N-1 (Now) items complete by end of week.
