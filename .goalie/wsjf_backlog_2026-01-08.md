# WSJF-Prioritized Feature Backlog
**Generated:** 2026-01-08T21:08:43Z  
**Context:** Comprehensive ay-prod integration and ecosystem expansion

## WSJF Calculation Methodology

```
WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
```

**Scoring (1-10 scale):**
- Business Value: Impact on user workflow, productivity gains
- Time Criticality: Urgency, dependencies blocking other work
- Risk Reduction: Security, stability, compliance improvements  
- Job Size: Effort estimate (1=hours, 5=days, 10=weeks)

---

## 🔥 CRITICAL PATH (WSJF > 7.0)

### 1. **ay yo prod-cycle Integration** (WSJF: 9.2)
**Epic:** Core CLI consolidation  
**User Story:** As a developer, I want a single `ay yo` command that handles all production ceremony workflows

| Metric | Score | Rationale |
|--------|-------|-----------|
| Business Value | 10 | Eliminates context switching, single muscle memory command |
| Time Criticality | 9 | Blocks all downstream integrations |
| Risk Reduction | 8 | Reduces human error in ceremony execution |
| Job Size | 3 | 1-2 days, existing scripts present |
| **WSJF** | **9.2** | **(10+9+8)/3** |

**Acceptance Criteria:**
- `ay yo prod-cycle` runs full convergence workflow
- DoR/DoD budget enforcement integrated
- Convergence reporting to `.goalie/`
- Test coverage >80%

**Dependencies:** None  
**Blockers:** None

---

### 2. **Break-Glass Audit Logging** (WSJF: 8.7)
**Epic:** Production safety guardrails  
**User Story:** As an operator, I need explicit approval gates for destructive operations with full audit trails

| Metric | Score | Rationale |
|--------|-------|-----------|
| Business Value | 9 | Prevents production incidents, accountability |
| Time Criticality | 8 | Needed before STX/AWS operations |
| Risk Reduction | 10 | Critical for compliance, security |
| Job Size | 3 | 1-2 days, pattern defined in request |
| **WSJF** | **9.0** | **(9+8+10)/3** |

**Acceptance Criteria:**
- `AF_BREAK_GLASS=1` required for destructive ops
- `AF_BREAK_GLASS_REASON` and `AF_CHANGE_TICKET` mandatory
- Append to `.goalie/break_glass_audit.jsonl`
- Blocked commands log reason + rerun instructions
- CI-compatible (no interactive deadlocks)

**Implementation Pattern:**
```bash
# Hook in ay-prod-cycle.sh
check_break_glass() {
  local operation="$1"
  if is_destructive "$operation"; then
    if [[ "${AF_BREAK_GLASS:-0}" != "1" ]]; then
      log_audit_denial "$operation"
      echo "BLOCKED: Requires AF_BREAK_GLASS=1"
      echo "Reason: Set AF_BREAK_GLASS_REASON='...'"
      exit 1
    fi
    log_audit_approval "$operation"
  fi
}
```

**Dependencies:** None  
**Blockers:** None

---

### 3. **SSH Probe + STX Health Monitoring** (WSJF: 8.3)
**Epic:** Infrastructure observability  
**User Story:** As an operator, I need automated health checks for STX/AWS/cPanel infrastructure

| Metric | Score | Rationale |
|--------|-------|-----------|
| Business Value | 8 | Real-time infra status, proactive alerts |
| Time Criticality | 9 | Blocks K8s deployment, STX workload management |
| Risk Reduction | 9 | Detects outages before customers |
| Job Size | 4 | 2-3 days, credentials available |
| **WSJF** | **6.5** | **(8+9+9)/4** |

**Acceptance Criteria:**
- `ay yo ssh-probe stx` checks StarlingX health
- `ay yo ssh-probe cpanel` checks cPanel status
- `ay yo inventory` lists all managed hosts
- Auto-recommend probe if last check >1hr old
- Integration with `.goalie/` metrics
- Dashboard widget showing health status

**Target Hosts:**
```bash
export YOLIFE_STX_HOST="**********"
export YOLIFE_STX_PORTS="2222,22"
export YOLIFE_STX_KEY="$HOME/.ssh/starlingx_key"
export YOLIFE_CPANEL_HOST="**************"
export YOLIFE_CPANEL_KEY="$HOME/pem/rooz.pem"
export YOLIFE_GITLAB_HOST="*************"
```

**Dependencies:** Break-glass logging (for disruptive ops)  
**Blockers:** None (credentials available)

---

### 4. **Test Suite Maturity** (WSJF: 8.0)
**Epic:** Production readiness  
**User Story:** As a developer, I need comprehensive test coverage before production deployment

| Metric | Score | Rationale |
|--------|-------|-----------|
| Business Value | 7 | Confidence in deployments, reduced rollbacks |
| Time Criticality | 8 | Blocks production release |
| Risk Reduction | 10 | Prevents regressions, validates integrations |
| Job Size | 4 | 2-3 days based on TEST_STATUS.md |
| **WSJF** | **6.25** | **(7+8+10)/4** |

**Acceptance Criteria:**
- Unit tests: >90% coverage for core modules
- Integration tests: Hook chain execution with context persistence
- E2E tests: Full prod-cycle + BML + governor health
- Performance benchmarks: <50ms hook overhead
- Test reports in `.goalie/test_results.jsonl`
- Zero regressions from baseline comparison

**Dependencies:** None  
**Blockers:** None

---

## 🟡 HIGH PRIORITY (WSJF 5.0-7.0)

### 5. **Discord Bot MVP** (WSJF: 6.8)
**Epic:** Real-time notifications  
**User Story:** As a team member, I need production alerts and ceremony updates in Discord

| Metric | Score | Rationale |
|--------|-------|-----------|
| Business Value | 7 | Team collaboration, async updates |
| Time Criticality | 6 | Nice-to-have, not blocking |
| Risk Reduction | 5 | Improved incident response |
| Job Size | 3 | 1-2 days, config exists |
| **WSJF** | **6.0** | **(7+6+5)/3** |

**Acceptance Criteria:**
- Post ceremony completion to Discord channel
- Alert on convergence score changes
- Health check failures trigger notifications
- `/ay status` slash command
- Deployed via `scripts/deploy_discord_bot.sh`

**Dependencies:** Core ay yo integration  
**Blockers:** Discord Application ID/Public Key setup

---

### 6. **TUI Dashboard Enhancement** (WSJF: 6.5)
**Epic:** Developer experience  
**User Story:** As a developer, I want a rich terminal UI showing real-time metrics

| Metric | Score | Rationale |
|--------|-------|-----------|
| Business Value | 8 | Visual feedback, quick status checks |
| Time Criticality | 5 | Enhancement, not critical path |
| Risk Reduction | 4 | Better observability |
| Job Size | 5 | 3-5 days, framework selection needed |
| **WSJF** | **3.4** | **(8+5+4)/5** |

**Technology Options:**
- **Textual (Python)** - Rich widgets, reactive
- **Urwid (Python)** - Mature, stable
- **Bubbletea (Go)** - Performant, requires Go port
- **Ratatui (Rust)** - Fast, requires Rust port

**Acceptance Criteria:**
- Kanban board view (Now/Next/Later)
- Real-time convergence score
- Circle equity distribution chart
- Hook execution trace
- Integration with `ay yo i` command

**Dependencies:** Core metrics pipeline  
**Blockers:** Framework decision (recommend **Textual**)

---

### 7. **Governance Agent Economics View** (WSJF: 6.2)
**Epic:** Code fix automation  
**User Story:** As a developer, I want AI-driven code fix proposals with economic impact analysis

| Metric | Score | Rationale |
|--------|-------|-----------|
| Business Value | 9 | Automated technical debt reduction |
| Time Criticality | 5 | Nice-to-have optimization |
| Risk Reduction | 6 | Reduces manual review burden |
| Job Size | 6 | 4-5 days, complex integration |
| **WSJF** | **3.3** | **(9+5+6)/6** |

**Acceptance Criteria:**
- Auto-batch apply for low-risk fixes (risk score <0.3)
- Economic impact in `.goalie/governance_economics.json`
- Approval workflow for high-risk changes
- Integration with retro coach metrics
- Risk-based batching (config/test-only auto-apply)

**Dependencies:** Test suite, retro coach integration  
**Blockers:** Policy definition for auto-apply thresholds

---

## 🟢 MEDIUM PRIORITY (WSJF 3.0-5.0)

### 8. **Stripe Sandbox Integration** (WSJF: 4.5)
**Epic:** Payment processing foundations  
**User Story:** As a product owner, I need payment gateway testing infrastructure

| Metric | Score | Rationale |
|--------|-------|-----------|
| Business Value | 8 | Enables monetization features |
| Time Criticality | 3 | Not blocking core dev workflow |
| Risk Reduction | 7 | PCI compliance, fraud prevention |
| Job Size | 8 | 1-2 weeks, compliance review needed |
| **WSJF** | **2.25** | **(8+3+7)/8** |

**Acceptance Criteria:**
- Sandbox test keys configured
- PCI-DSS checklist validation
- Webhook handler implemented
- Fraud detection configuration
- Test payment flow ($10.00)

**Dependencies:** None  
**Blockers:** Stripe account verification, PCI compliance scope

---

### 9. **Multi-Tenant Affiliate Platform** (WSJF: 3.8)
**Epic:** Revenue operations  
**User Story:** As a business owner, I need affiliate tracking and commission management

| Metric | Score | Rationale |
|--------|-------|-----------|
| Business Value | 9 | Direct revenue generation |
| Time Criticality | 2 | Future roadmap item |
| Risk Reduction | 5 | Proper attribution tracking |
| Job Size | 10 | 4-6 weeks, complex integration |
| **WSJF** | **1.6** | **(9+2+5)/10** |

**Dependencies:** Stripe integration, HostBill API, Symfony/Oro platform  
**Blockers:** Business requirements definition, compliance review

---

### 10. **Neural Trading / Decision Transformers** (WSJF: 3.2)
**Epic:** AI-driven trading  
**User Story:** As a trader, I want ML-based trading signal generation

| Metric | Score | Rationale |
|--------|-------|-----------|
| Business Value | 10 | Potentially high ROI |
| Time Criticality | 1 | Research/experimental |
| Risk Reduction | 3 | Financial risk management |
| Job Size | 10 | 6-8 weeks, requires ML expertise |
| **WSJF** | **1.4** | **(10+1+3)/10** |

**Dependencies:** Securities compliance, risk analytics validation  
**Blockers:** Regulatory approval, backtesting infrastructure

---

## ⚪ LOW PRIORITY / DEFERRED (WSJF < 3.0)

### 11. **CloudKit/iCloud Integration** (WSJF: 2.1)
- Job Size: 10 (requires Swift/iOS development)
- Deferred until mobile client requirements defined

### 12. **Flarum Community Platform** (WSJF: 2.0)
- Job Size: 8 (complex integration)
- Deferred until domain routing stabilized

### 13. **V0.dev + ReactFlow Visualization** (WSJF: 1.8)
- Job Size: 7 (UI/UX redesign)
- Deferred until core functionality stable

### 14. **Portfolio Financial Analysis** (WSJF: 1.5)
- Job Size: 9 (requires real-time market data feeds)
- Deferred pending compliance review

---

## 📊 WSJF Summary by Category

| Category | Count | Avg WSJF | Priority |
|----------|-------|----------|----------|
| Core CLI | 2 | 9.0 | 🔥 Critical |
| Infrastructure | 2 | 7.4 | 🔥 Critical |
| Testing/Quality | 1 | 8.0 | 🔥 Critical |
| Developer Experience | 2 | 6.5 | 🟡 High |
| Business/Revenue | 3 | 3.3 | 🟢 Medium |
| AI/ML Research | 1 | 3.2 | 🟢 Medium |
| Ecosystem Integration | 4 | 1.9 | ⚪ Low |

---

## 🎯 Recommended Execution Sequence

### **Sprint 1 (Week 1):**
1. ay yo prod-cycle integration
2. Break-glass audit logging
3. Test suite maturity (foundation)

### **Sprint 2 (Week 2):**
4. SSH probe + STX health monitoring
5. Discord bot MVP
6. Test suite maturity (completion)

### **Sprint 3 (Week 3):**
7. TUI dashboard enhancement
8. Governance agent economics

### **Future Sprints (Backlog):**
- Stripe sandbox integration
- Multi-tenant affiliate platform
- Neural trading research

---

## 🚨 ROAM Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Scope creep into low-WSJF items | High | High | **Strict adherence to Sprint 1-2 priorities** |
| Missing credentials for integrations | High | Medium | Audit `.env`, use Passbolt for secrets |
| Compliance gaps (PCI, securities) | Critical | Medium | Defer Stripe/trading until legal review |
| Technical debt from rapid iteration | Medium | High | Test-first approach, >80% coverage gate |
| Context loss across 50+ tools | High | High | Focus on 5-7 tools max in Phase 1 |

---

## 📝 Notes

- **WSJF recalculated monthly** based on actual progress and changing priorities
- **Job Size estimates** based on existing codebase inspection
- **Dependencies** explicitly called out to avoid parallel work on dependent items
- **Blockers** identified early to enable proactive resolution

---

**Next Action:** Review and approve Sprint 1 scope before implementation.
