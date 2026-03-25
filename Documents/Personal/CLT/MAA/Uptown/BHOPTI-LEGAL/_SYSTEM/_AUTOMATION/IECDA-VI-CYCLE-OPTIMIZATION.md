# IECDA-VI Cycle Optimization Framework
**Date:** 2026-03-25 15:03:00  
**Purpose:** Define optimal temporal periodicity and coverage metrics for iterative improvement  
**Pattern:** Investigate → Evidence → Classify → Decide → Act → Verify → Iterate

---

## Issue Type Taxonomy (MCP/MPP/Method/Pattern/Protocol)

### MCP (Model Context Protocol)
**Definition:** External context integration issues  
**Examples:** Memory store read failures, agent context loss, knowledge base staleness  
**Optimal Cycle:** Event-driven + 15min background validation  
**Coverage Metric:** 100% of MCP calls logged with success/failure

### MPP (Multi-Phase Process)
**Definition:** Workflow spanning multiple phases with state transitions  
**Examples:** Swarm orchestration, document pipeline, approval workflows  
**Optimal Cycle:** Per-phase checkpoints + daily retrospectives  
**Coverage Metric:** 100% phases with entry/exit criteria verified

### Method
**Definition:** Implementation technique or algorithm issues  
**Examples:** Spawn without supervision, missing timeout, no PID tracking  
**Optimal Cycle:** Pre-commit validation + weekly audits  
**Coverage Metric:** 80%+ methods covered by automated tests

### Pattern
**Definition:** Architectural or design pattern violations  
**Examples:** Completion theater, zombie accumulation, no feedback loop  
**Optimal Cycle:** Code review gates + monthly pattern audits  
**Coverage Metric:** 90%+ critical patterns enforced via linters

### Protocol
**Definition:** Communication or interface contract issues  
**Examples:** API version mismatch, message format errors, handshake failures  
**Optimal Cycle:** Every deployment + continuous integration tests  
**Coverage Metric:** 100% protocol interactions with contract tests

---

## Temporal Periodicity Matrix

### Real-Time (Event-Driven)
**Trigger:** Incident occurs (e.g., spawn detected, error logged, threshold exceeded)  
**Cycle Time:** <1 minute  
**Use Cases:**
- Critical system failures (zombie spawn velocity >10/min)
- Security breaches (unauthorized access)
- Data corruption (checksum mismatches)

**IECDA-VI Execution:**
1. **Investigate:** Triggered by monitoring alert
2. **Evidence:** Auto-collect from telemetry (logs, metrics, traces)
3. **Classify:** Rule-based triage (P0/P1/P2)
4. **Decide:** Playbook-driven (if X then Y)
5. **Act:** Automated remediation (kill spawner, rollback, failover)
6. **Verify:** 5min observation window
7. **Iterate:** Update alert thresholds, playbook

**Coverage Target:** 100% of P0 incidents auto-detected

---

### High-Frequency (Minutes)
**Periodicity:** Every 1-5 minutes  
**Cycle Time:** 1-5 minutes  
**Use Cases:**
- Resource monitoring (CPU, memory, disk, zombies)
- Health checks (service liveness, agent heartbeats)
- Rate limiting (spawn velocity, API calls)

**IECDA-VI Execution:**
1. **Investigate:** Cron-triggered metric collection
2. **Evidence:** Time-series data (velocity DB, resource usage)
3. **Classify:** Threshold-based (normal/elevated/warning/critical)
4. **Decide:** Adaptive action (1min monitoring vs 15min)
5. **Act:** Semi-auto alerts or full-auto remediation
6. **Verify:** Next measurement cycle
7. **Iterate:** Adjust thresholds based on false positive rate

**Coverage Target:** 95%+ of critical metrics sampled

---

### Medium-Frequency (Hours)
**Periodicity:** Every 6-24 hours  
**Cycle Time:** 30-60 minutes  
**Use Cases:**
- Test suite execution (unit, integration, E2E)
- Legacy script audits (unsupervised spawns)
- Configuration drift detection (ADR compliance)

**IECDA-VI Execution:**
1. **Investigate:** Scheduled scan/audit
2. **Evidence:** Test results, audit reports, diff analysis
3. **Classify:** Pass/fail with severity (blocker/major/minor)
4. **Decide:** Fix immediately vs backlog
5. **Act:** Automated fixes where safe, manual otherwise
6. **Verify:** Re-run tests after fix
7. **Iterate:** Expand test coverage, update audit rules

**Coverage Target:** 80%+ of codebase under continuous validation

---

### Low-Frequency (Days/Weeks)
**Periodicity:** Daily standups, weekly retrospectives  
**Cycle Time:** 1-4 hours  
**Use Cases:**
- Sprint retrospectives (what worked/didn't)
- Technical debt review (zombie patterns, completion theater)
- Capability assessments (features used vs stale)

**IECDA-VI Execution:**
1. **Investigate:** Aggregate metrics from period (velocity trends, incident count)
2. **Evidence:** Retro notes, RCA documents, ROAM risks
3. **Classify:** Systemic vs one-off, root cause vs symptom
4. **Decide:** Process improvements, policy changes, tooling gaps
5. **Act:** Update runbooks, ADRs, spawn governance
6. **Verify:** Track improvement metrics over next period
7. **Iterate:** Refine retro format, add new metrics

**Coverage Target:** 100% of incidents reviewed in retro

---

### Ultra-Low-Frequency (Months/Quarters)
**Periodicity:** Monthly reviews, quarterly planning  
**Cycle Time:** Days  
**Use Cases:**
- Architecture reviews (pattern violations at scale)
- Dependency updates (npm audit, security patches)
- Capability portfolio (retire stale, invest in new)

**IECDA-VI Execution:**
1. **Investigate:** Comprehensive system analysis (architecture, deps, capabilities)
2. **Evidence:** Trend data (3-6 months), usage analytics, survey feedback
3. **Classify:** Strategic vs tactical, invest vs divest
4. **Decide:** Roadmap priorities, deprecation plans
5. **Act:** Multi-sprint execution (refactoring, migrations)
6. **Verify:** Quarterly success metrics (uptime, velocity, satisfaction)
7. **Iterate:** Adjust strategy based on outcomes

**Coverage Target:** 100% of major components reviewed annually

---

## Coverage Metrics by Factor

### Factor 1: Velocity (Speed of Change)
**Metric:** Changes per unit time  
**Measurement:**
- Commit frequency: `git log --since="1 week ago" --oneline | wc -l`
- Spawn velocity: `zombie-velocity.db` growth rate
- Incident rate: Alerts triggered per day

**Optimal Cycle:**
- High velocity (>10 changes/day) → Real-time + hourly
- Medium velocity (1-10 changes/day) → Hourly + daily
- Low velocity (<1 change/day) → Daily + weekly

**Coverage Target:** 90%+ of changes validated within 24h

---

### Factor 2: Blast Radius (Impact Scope)
**Metric:** % of system affected by failure  
**Measurement:**
- User-facing failures: `(downtime / total_time) * 100`
- Data loss risk: `(unprotected_state / total_state) * 100`
- Cascade failures: `(dependent_services / total_services) * 100`

**Optimal Cycle:**
- Critical path (>50% blast radius) → Real-time + 5min verify
- Important (10-50% blast radius) → Hourly + 1h verify
- Isolated (<10% blast radius) → Daily + 24h verify

**Coverage Target:** 100% of critical path monitored real-time

---

### Factor 3: Reversibility (Undo Cost)
**Metric:** Time/effort to revert change  
**Measurement:**
- Automated rollback: `rollback_script_exists ? 0 : INF`
- Manual intervention: Hours of human time
- Data recovery: Checkpoint age + restore duration

**Optimal Cycle:**
- Irreversible (data loss) → Pre-change validation + dry-run
- Expensive (>4h manual) → Staging test + canary deploy
- Cheap (<1h automated) → Deploy + monitor + auto-rollback

**Coverage Target:** 95%+ of changes have rollback plan

---

### Factor 4: Detection Latency (Time to Discover)
**Metric:** Elapsed time from failure to alert  
**Measurement:**
- Mean Time To Detect (MTTD): `alert_timestamp - failure_timestamp`
- False negative rate: `missed_incidents / total_incidents`
- Alert fatigue: `false_positives / total_alerts`

**Optimal Cycle:**
- Silent failures (no user signal) → Active probing every 1-5min
- Noisy failures (user reports) → Passive monitoring + incident channel
- Gradual degradation → Trend analysis every 6h

**Coverage Target:** MTTD <5min for P0, <1h for P1

---

### Factor 5: Fix Complexity (Remediation Effort)
**Metric:** Time/skill required to resolve  
**Measurement:**
- Automated fix: `playbook_exists && tested`
- Expert required: Escalation to on-call specialist
- Unknown: Investigation + RCA + design + implement

**Optimal Cycle:**
- Auto-remediable → Real-time execution + 5min verify
- Known manual → Incident response SLA (15min/1h/4h)
- Unknown → Deep RCA (1-2 days) + design review

**Coverage Target:** 60%+ of incidents auto-remediable, 90%+ have playbook

---

## %/# (Percentage/Count) Coverage Formula

### Overall IECDA-VI Coverage Score

```
Coverage = (
  (Incidents_With_IECDA_VI / Total_Incidents) * 0.30 +        # 30%: Incident coverage
  (Automated_Steps / Total_Steps) * 0.25 +                    # 25%: Automation
  (Verified_Fixes / Total_Fixes) * 0.20 +                     # 20%: Verification
  (Iterated_Processes / Total_Processes) * 0.15 +             # 15%: Iteration
  (Evidence_Complete / Total_Evidence_Required) * 0.10        # 10%: Evidence quality
) * 100
```

### Example Calculation

**Current State:**
- Incidents with IECDA-VI: 5 / 20 = 25%
- Automated steps: 3 / 7 = 43%
- Verified fixes: 2 / 5 = 40%
- Iterated processes: 1 / 5 = 20%
- Evidence complete: 4 / 6 = 67%

**Score:**
```
(0.25 * 0.30) + (0.43 * 0.25) + (0.40 * 0.20) + (0.20 * 0.15) + (0.67 * 0.10)
= 0.075 + 0.1075 + 0.08 + 0.03 + 0.067
= 0.3595 * 100
= 35.95% coverage
```

**Target:** 80%+ coverage for mature process

---

## %.# (Decimal Precision) Metrics

### Velocity Measurement
**Format:** `XX.XX zombies/min`  
**Precision:** 2 decimal places for velocities <10, 1 decimal for ≥10  
**Example:**
- `0.75 zombies/min` (low velocity, needs precision)
- `42.0 zombies/min` (high velocity, precision less critical)

### Coverage Percentages
**Format:** `XX.X%`  
**Precision:** 1 decimal place for coverage metrics  
**Example:**
- `80.5% test coverage` (good precision for tracking progress)
- `100.0% P0 monitoring` (emphasizes completeness)

### Reliability Metrics
**Format:** `X.XXXX` (four nines)  
**Precision:** 4 decimal places for SLOs/SLAs  
**Example:**
- `0.9999 uptime` (99.99% = four nines)
- `0.999 detection rate` (99.9% = three nines)

---

## Optimal Periodicity Decision Tree

```
START: Issue detected
  │
  ├─ Is blast radius >50%? 
  │  ├─ YES → Real-time cycle (<1min)
  │  └─ NO → Continue
  │
  ├─ Is velocity >10/min?
  │  ├─ YES → High-frequency cycle (1-5min)
  │  └─ NO → Continue
  │
  ├─ Is fix auto-remediable?
  │  ├─ YES → High-frequency cycle (1-5min)
  │  └─ NO → Continue
  │
  ├─ Is change irreversible?
  │  ├─ YES → Pre-change validation (one-time)
  │  └─ NO → Continue
  │
  ├─ Is detection latency >1h?
  │  ├─ YES → Medium-frequency cycle (6-24h)
  │  └─ NO → Continue
  │
  └─ Default → Low-frequency cycle (daily/weekly)
```

---

## Implementation: Cycle Scheduler

### Cron-Based Scheduling

```bash
# Real-time (event-driven via monitoring tool)
# Handled by: Prometheus AlertManager, CloudWatch Alarms, etc.

# High-frequency (1min)
*/1 * * * * bash adaptive-sa-fa-cycles.sh monitor

# Medium-frequency (6h)
0 */6 * * * bash sa-fa-verification-loop.sh test

# Low-frequency (daily 9am)
0 9 * * * bash evidence-collection-pre-kill.sh

# Low-frequency (weekly Monday 9am)
0 9 * * 1 bash sa-fa-verification-loop.sh retro

# Ultra-low-frequency (monthly 1st, 9am)
0 9 1 * * bash quarterly-architecture-review.sh
```

### Adaptive Frequency

```bash
# Adjust frequency based on current state
if [[ $ZOMBIE_COUNT -gt 100 ]]; then
  INTERVAL="1m"  # High-frequency
elif [[ $ZOMBIE_COUNT -gt 20 ]]; then
  INTERVAL="5m"  # Medium-frequency
else
  INTERVAL="15m" # Low-frequency
fi

# Update cron dynamically
update_cron_interval "$INTERVAL"
```

---

## Success Metrics

### Cycle Effectiveness
- **MTTR (Mean Time To Remediate):** <30min for P0, <4h for P1
- **Recurrence Rate:** <10% of incidents recur within 30 days
- **Automation Rate:** >60% of incidents auto-remediated

### Coverage Completeness
- **Monitoring Coverage:** 95%+ of critical paths monitored
- **Test Coverage:** 80%+ of code paths tested
- **Audit Coverage:** 100% of spawn scripts validated

### Process Maturity
- **Evidence-Based Decisions:** 90%+ of actions have RCA
- **Verification Rate:** 95%+ of fixes verified with observation window
- **Iteration Rate:** 100% of retrospectives produce action items

---

## Anti-Patterns to Avoid

### Too Frequent (Cycle Thrashing)
- **Symptom:** Constant alerts, no time for deep work
- **Fix:** Increase thresholds, batch non-critical alerts
- **Example:** 1-second zombie monitoring → 1-minute

### Too Infrequent (Detection Lag)
- **Symptom:** Issues discovered after significant impact
- **Fix:** Add real-time alerting for critical paths
- **Example:** Daily zombie check → 1-minute when elevated

### No Adaptation (Fixed Frequency)
- **Symptom:** Same cycle regardless of system state
- **Fix:** Implement adaptive frequency based on metrics
- **Example:** Always 15min → 1min when count >20

### Partial Coverage (Blind Spots)
- **Symptom:** Some issue types never enter IECDA-VI cycle
- **Fix:** Audit for coverage gaps, add missing monitors
- **Example:** Only monitoring zombies → Also monitor spawner parents

---

## Recommended Starting Point

### Tier 0 (Bootstrap)
1. **Real-time:** Critical failures (spawn velocity >20/min)
2. **1-minute:** Zombie monitoring with adaptive frequency
3. **Daily:** Evidence collection and classification
4. **Weekly:** Retrospectives with ROAM risk review

**Target:** 50% coverage within 1 week

### Tier 1 (Mature)
1. **Real-time:** All P0 incidents (auto-remediation)
2. **1-5 minute:** All resource metrics (adaptive)
3. **6-hour:** Test suite + audit scans
4. **Daily:** Pre-kill RCA for all terminations
5. **Weekly:** Process improvements + policy updates

**Target:** 80% coverage within 1 month

### Tier 2 (Optimized)
1. All Tier 1, plus:
2. **Monthly:** Architecture reviews + dependency audits
3. **Quarterly:** Capability portfolio + strategic planning
4. **Continuous:** A/B testing for cycle frequency optimization

**Target:** 95% coverage within 3 months

---

**Summary:** Optimal periodicity depends on 5 factors (velocity, blast radius, reversibility, detection latency, fix complexity). Use adaptive frequency (real-time → weekly) based on system state. Target 80%+ overall IECDA-VI coverage with 2-decimal precision for velocity metrics and 1-decimal for coverage percentages.
