# Team Approval Checklist (CFA/CIPM-Aligned)

## Framework Principles

This approval system follows **CFA Institute Level I-III curriculum** principles:
- **Quantitative Analysis**: NPV, IRR, WSJF scoring
- **Risk Management** (CIPM): Operational, market, strategic risk assessment
- **Ethics & Professional Standards**: Code of Ethics compliance
- **Governance**: Fiduciary duty, conflicts of interest management

---

## Auto-Approval Thresholds

### **Tier 1: INSTANT AUTO-APPROVAL** ✅
**Criteria**: WSJF ≥ 12.0 AND Risk ≤ LOW

**Applies To**:
- Documentation updates (append-only to approved .md files)
- Metrics collection (`.goalie/*.jsonl`, `.goalie/*.yaml`)
- Test additions (no production code changes)
- Baseline data seeding
- Local-only execution scripts

**Governance**: Single-reviewer post-commit audit within 24h

**Examples**:
- WSJF-SOT-1 (14.0): CONSOLIDATED_ACTIONS.yaml as single source of truth
- GOVERNANCE-1 (14.5): Risk control framework documentation
- DOC-UPDATE-1 (18.0): Status delta appends
- GATE-1 (30.0): Go/No-Go gate evaluation

---

### **Tier 2: FAST-TRACK APPROVAL** 🟡
**Criteria**: WSJF 8.0-11.9 AND Risk ≤ MEDIUM

**Applies To**:
- Infrastructure tuning (Process Governor, rate limiting)
- Learning system patches (auto-DB initialization)
- Non-breaking API changes
- Performance optimizations

**Governance**: Async approval (1 reviewer, 4-hour SLA)

**Examples**:
- PHASE-A-1 (9.0): Baseline metrics seeding
- TOOLING-1 (9.0): Tooling validation
- BML-1 (8.7): Build-Measure-Learn instrumentation
- VALIDATE-1 (8.0): Test suite execution

---

### **Tier 3: STANDARD APPROVAL** 🟠
**Criteria**: WSJF 5.0-7.9 OR Risk = HIGH

**Applies To**:
- Production database schema changes
- External integrations (IPMI, SSH, APIs)
- Deployment scripts
- Multi-system coordination changes

**Governance**: Sync review (2 reviewers, 1 business day SLA)

**Examples**:
- PHASE-B-2 (7.3): IPMI connectivity validation
- PHASE-A-3 (7.0): Populate AgentDB with calibration data
- PHASE-B-1 (6.5): Calibration dataset resume
- PHASE-B-3 (5.8): Governor performance retrofit

---

### **Tier 4: EXECUTIVE APPROVAL** 🔴
**Criteria**: WSJF < 5.0 OR Risk = PROHIBITED OR Budget > $1000

**Applies To**:
- Production data deletion
- Security-critical changes
- Compliance-impacting modifications
- Cost center changes (cloud spending)

**Governance**: Full board review (3+ reviewers, 2 business day SLA)

**Examples**:
- Production database migration (Cost: $5000, Risk: HIGH)
- External API key rotation (Risk: PROHIBITED without SOC2)
- Multi-region deployment (Cost: $10000/month)

---

## Risk Classification (CIPM Framework)

### **LOW Risk**
- Read-only operations
- Local development only
- Fully reversible via git
- No external dependencies
- No cost implications

### **MEDIUM Risk**
- Modifies non-production systems
- SSH/IPMI connectivity tests
- Performance tuning with fallbacks
- < $100 cost per change

### **HIGH Risk**
- Production system changes
- External API integrations
- Schema migrations
- Cost: $100-$1000

### **PROHIBITED Without Safeguards**
- Production data deletion
- Security credential changes without audit trail
- Compliance policy modifications
- Cost: > $1000

---

## WSJF Calculation (Scaled Agile)

```
WSJF = (User Value + Time Criticality + Risk Reduction) / Job Size
```

**Components**:
- **User Value**: 1-10 (business impact)
- **Time Criticality**: 1-10 (urgency, cost of delay)
- **Risk Reduction**: 1-10 (mitigates technical/business risk)
- **Job Size**: 1-10 (effort estimate in hours/days)

**Interpretation**:
- WSJF ≥ 12.0: Critical priority (execute immediately)
- WSJF 8.0-11.9: High priority (within 1 day)
- WSJF 5.0-7.9: Medium priority (within 1 week)
- WSJF < 5.0: Low priority (backlog)

---

## Refinement & Measurement (Tribal Agentic Workflow)

### **Pre-Approval Checklist**

**For Proposer**:
- [ ] WSJF score calculated with justification
- [ ] Risk classification assigned (LOW/MEDIUM/HIGH/PROHIBITED)
- [ ] Cost estimate provided (if applicable)
- [ ] Rollback plan documented
- [ ] Test coverage ≥ 80% (for code changes)
- [ ] Constraint adherence validated:
  - [ ] No new .md files (use `.goalie/*.jsonl` instead)
  - [ ] Local-only execution (unless approved for remote)
  - [ ] Git checkpoint available for rollback

**For Reviewer**:
- [ ] WSJF scoring independently verified
- [ ] Risk assessment cross-checked
- [ ] Rollback plan tested (dry-run)
- [ ] Conflicts of interest disclosed
- [ ] Code of Ethics compliance (CFA Standards I-VII)

### **Post-Approval Measurement**

**Metrics to Track** (`.goalie/approval_log.jsonl`):
```json
{
  "timestamp": "2025-11-14T23:45:00Z",
  "item_id": "PHASE-A-1",
  "wsjf_score": 9.0,
  "risk_level": "LOW",
  "approval_tier": "fast-track",
  "approver": "automated",
  "execution_time_min": 18,
  "outcome": "success",
  "value_delivered": "baseline_metrics_seeded"
}
```

**Retro Actions** (Monthly Review):
1. **False Positives**: Auto-approvals that should have been manual
2. **False Negatives**: Manual reviews that could have been automated
3. **WSJF Calibration**: Adjust scoring thresholds based on outcomes
4. **Cost Analysis**: Compare estimated vs actual costs

---

## Ethics & Conflicts of Interest (CFA Code)

**Standard I: Professionalism**
- A. Knowledge of Law: Comply with repository policies
- B. Independence and Objectivity: Reviewers must be independent
- C. Misrepresentation: Accurate WSJF scoring required
- D. Misconduct: Report approval process violations

**Standard III: Duties to Clients (Internal Stakeholders)**
- A. Loyalty, Prudence, and Care: Act in best interest of project
- B. Fair Dealing: No preferential treatment for pet features
- C. Suitability: Only approve changes aligned with project goals

**Standard VI: Conflicts of Interest**
- A. Disclosure: Reviewers must disclose financial interests
- B. Priority of Transactions: Project needs > personal needs
- C. Referral Fees: No quid pro quo approvals

---

## Automation Integration

### **Script Interface**

```bash
#!/bin/bash
# scripts/approval/initiate_team_approval.sh

ITEM_ID="$1"
WSJF_SCORE="$2"
RISK_LEVEL="$3"

# Auto-determine tier
if (( $(echo "$WSJF_SCORE >= 12.0" | bc -l) )) && [ "$RISK_LEVEL" = "LOW" ]; then
    echo "✅ INSTANT AUTO-APPROVAL: WSJF=$WSJF_SCORE, Risk=$RISK_LEVEL"
    ./scripts/approval/execute_auto_approved.sh "$ITEM_ID"
elif (( $(echo "$WSJF_SCORE >= 8.0" | bc -l) )) && [ "$RISK_LEVEL" != "HIGH" ]; then
    echo "🟡 FAST-TRACK: Requesting async approval (4h SLA)"
    ./scripts/approval/request_async_review.sh "$ITEM_ID" "$WSJF_SCORE" "$RISK_LEVEL"
else
    echo "🟠 STANDARD: Requesting sync review (1 day SLA)"
    ./scripts/approval/request_sync_review.sh "$ITEM_ID" "$WSJF_SCORE" "$RISK_LEVEL"
fi
```

### **Tribal Agentic Workflow Hooks**

**Pre-commit Hook** (`.agentdb/hooks/pre_command.sh`):
- Validate WSJF score in commit message
- Check risk classification in `.goalie/risk_register.yaml`
- Enforce constraint adherence (no new .md files)

**Post-commit Hook** (`.agentdb/hooks/post_command.sh`):
- Log approval decision to `.goalie/approval_log.jsonl`
- Update metrics dashboard
- Trigger async review notification (if fast-track)

---

## Example Approval Flows

### **Example 1: PHASE-A-1 (WSJF 9.0, LOW Risk)**
```
1. Developer: ./scripts/approval/initiate_team_approval.sh PHASE-A-1 9.0 LOW
2. System: ✅ FAST-TRACK AUTO-APPROVAL (Tier 2)
3. System: Executes python3 scripts/agentic/bootstrap_local_metrics.py
4. System: Logs to .goalie/approval_log.jsonl
5. Post-commit: Async reviewer notified for 24h audit
```

### **Example 2: PHASE-B-2 (WSJF 7.3, MEDIUM Risk)**
```
1. Developer: ./scripts/approval/initiate_team_approval.sh PHASE-B-2 7.3 MEDIUM
2. System: 🟠 STANDARD APPROVAL REQUIRED (Tier 3)
3. System: Creates GitHub issue with approval request
4. Reviewer 1: Reviews IPMI test plan, approves
5. Reviewer 2: Reviews SSH fallback, approves
6. System: Executes ./scripts/ci/test_device_24460_ssh_ipmi_enhanced.py
7. Post-commit: Logs outcome to .goalie/approval_log.jsonl
```

---

## Continuous Improvement

**Monthly Retro Questions**:
1. What % of auto-approvals succeeded without issues? (Target: >95%)
2. What % of manual reviews could have been automated? (Target: <10%)
3. Average approval latency by tier? (Target: T1=0min, T2=4h, T3=1day)
4. Cost variance: Estimated vs actual? (Target: <20% variance)

**Threshold Adjustments**:
- If false positive rate > 5%: Lower auto-approval WSJF threshold
- If false negative rate > 10%: Raise auto-approval WSJF threshold
- If Tier 2 approval latency > 6h: Increase reviewer capacity

---

**Version**: 1.0  
**Last Updated**: 2025-11-14T23:45:00Z  
**Next Review**: 2025-12-14  
**Owned By**: Engineering + Finance (CFA/CIPM alignment)
