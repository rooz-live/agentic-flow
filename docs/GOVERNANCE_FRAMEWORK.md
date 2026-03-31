# Comprehensive Governance Framework

## Executive Summary
This framework addresses economic model (CapEx→Revenue), execution boundaries (WIP limits, guardrails), specialized agent architecture, observability patterns, and multi-site health monitoring across the interface.tag.ooo domain ecosystem.

## 1. Economic Model: CapEx to Revenue Conversion

### Problem
Current WSJF system treats all work as equal cost without revenue tracking or CapEx→OpEx transition modeling.

### Solution: Budget Replenishment with Revenue Attribution

**Schema Addition** (`CONSOLIDATED_ACTIONS.yaml`):
```yaml
items:
  - id: FLOW-001
    budget_type: CapEx  # or OpEx
    capex_investment: 10000  # Initial investment ($)
    revenue_attribution:
      monthly_recurring: 500   # $/month
      one_time: 2000          # $ at completion
      payback_period_months: 20
      roi_percentage: 140
    iteration_budget:
      max_iterations: 5
      budget_per_iteration: 2000
      spent_iterations: 2
      remaining_budget: 6000
```

**Revenue Tracking** (`scripts/economics/revenue_tracker.py`):
```python
#!/usr/bin/env python3
"""Track CapEx to Revenue conversion and ROI"""

import yaml
from datetime import datetime, timedelta
from typing import Dict, List

class RevenueTracker:
    def __init__(self, actions_file: str):
        with open(actions_file) as f:
            self.data = yaml.safe_load(f)
    
    def calculate_roi(self, item: Dict) -> Dict:
        """Calculate ROI for a CapEx investment"""
        capex = item.get('capex_investment', 0)
        monthly_rev = item.get('revenue_attribution', {}).get('monthly_recurring', 0)
        one_time = item.get('revenue_attribution', {}).get('one_time', 0)
        
        # Simple payback period
        if monthly_rev > 0:
            payback_months = (capex - one_time) / monthly_rev if capex > one_time else 0
        else:
            payback_months = float('inf')
        
        # 12-month revenue projection
        revenue_12mo = (monthly_rev * 12) + one_time
        roi = ((revenue_12mo - capex) / capex * 100) if capex > 0 else 0
        
        return {
            'capex': capex,
            'revenue_12mo': revenue_12mo,
            'roi_pct': roi,
            'payback_months': payback_months,
            'status': 'profitable' if roi > 0 else 'loss'
        }
    
    def capex_to_opex_transition(self, item: Dict) -> str:
        """Determine if CapEx should transition to OpEx"""
        completed = item.get('status') in ['DONE', 'COMPLETE']
        roi_data = self.calculate_roi(item)
        
        if completed and roi_data['payback_months'] < 12:
            return 'TRANSITION_TO_OPEX'
        elif completed and roi_data['payback_months'] < 24:
            return 'MONITOR_REVENUE'
        else:
            return 'REMAIN_CAPEX'
```

**Budget Replenishment Rule**:
```python
def should_replenish_budget(item: Dict) -> bool:
    """Check if iteration budget allows more work"""
    iteration_budget = item.get('iteration_budget', {})
    max_iter = iteration_budget.get('max_iterations', float('inf'))
    spent_iter = iteration_budget.get('spent_iterations', 0)
    
    if spent_iter >= max_iter:
        return False  # Budget exhausted
    
    # Check ROI trajectory
    roi_data = calculate_roi(item)
    if roi_data['roi_pct'] < -50:
        return False  # Failing investment, stop throwing good money after bad
    
    return True
```

## 2. Iteration Budget & Early Stopping

### Problem
"iteration_budget, early stop too early?" - Need smart budget allocation with early stopping that doesn't quit prematurely.

### Solution: Adaptive Iteration Budget with Confidence Intervals

**Pattern Template** (`scripts/patterns/templates/Iteration-Budget.yaml`):
```yaml
pattern: Iteration-Budget
description: Limit cycle iterations with early stopping based on diminishing returns
category: flow

definition_of_ready:
  - criterion: Success criteria defined
    description: Measurable outcomes for each iteration
    validation: Iteration goals documented
    
  - criterion: Budget allocated
    description: Max iterations and cost per iteration set
    validation: iteration_budget populated in action item
    
  - criterion: Early stop threshold
    description: Minimum improvement delta to continue (e.g., 5% gain)
    validation: early_stop_threshold configured

definition_of_done:
  - criterion: Improvement measured
    description: Each iteration's delta vs baseline tracked
    validation: Metrics show convergence or divergence
    command: "python3 scripts/metrics/check_iteration_delta.py --item {{item_id}}"
    blocking: true
    
  - criterion: Budget respected
    description: Stopped before exhausting max iterations if converged
    validation: Stopped early if delta < threshold for 2 consecutive iterations
    
  - criterion: Retrospective completed
    description: Analysis of why budget was sufficient or insufficient
    validation: Retro notes in docs/QUICK_WINS.md

early_stopping_logic:
  min_iterations: 2  # Always run at least 2 iterations
  convergence_window: 2  # Stop if improvement < threshold for N iterations
  improvement_threshold: 0.05  # 5% improvement required
  confidence_level: 0.80  # 80% confidence in convergence
  
  # Don't stop early if:
  - current_iteration < min_iterations
  - improvement_trend == "accelerating"
  - high_variance_in_results  # Unstable, need more data
```

**Implementation** (`scripts/execution/iteration_manager.py`):
```python
class IterationManager:
    def should_continue_iteration(self, item_id: str, iteration: int, 
                                   history: List[float]) -> Dict:
        """Decide if next iteration should run"""
        config = load_iteration_config(item_id)
        
        # Always run minimum iterations
        if iteration < config['min_iterations']:
            return {'continue': True, 'reason': 'below_minimum'}
        
        # Check budget exhaustion
        if iteration >= config['max_iterations']:
            return {'continue': False, 'reason': 'budget_exhausted'}
        
        # Calculate improvement trend
        recent_history = history[-config['convergence_window']:]
        improvements = [
            (recent_history[i] - recent_history[i-1]) / recent_history[i-1]
            for i in range(1, len(recent_history))
        ]
        
        avg_improvement = sum(improvements) / len(improvements)
        
        # Stop if converged
        if avg_improvement < config['improvement_threshold']:
            if self.is_accelerating(improvements):
                return {'continue': True, 'reason': 'accelerating_trend'}
            else:
                return {'continue': False, 'reason': 'converged'}
        
        return {'continue': True, 'reason': 'improving'}
    
    def is_accelerating(self, improvements: List[float]) -> bool:
        """Check if improvement rate is increasing"""
        if len(improvements) < 2:
            return False
        return improvements[-1] > improvements[-2]
```

## 3. Schema Validation Per Tier

### Problem
"Schema validation per tier?" - Need different validation rules for different organizational tiers.

### Solution: Tiered Validation with Circle-Specific Rules

**Tier Configuration** (`config/schema_tiers.yaml`):
```yaml
tiers:
  tier1_strategic:
    circles: [orchestrator]
    required_fields:
      - wsjf_score
      - cost_of_delay
      - revenue_attribution
      - capex_investment
      - stakeholder_approval
    min_wsjf: 15.0
    requires_executive_approval: true
    
  tier2_tactical:
    circles: [analyst, assessor]
    required_fields:
      - wsjf_score
      - cost_of_delay
      - pattern
    min_wsjf: 10.0
    requires_circle_lead_approval: true
    
  tier3_operational:
    circles: [innovator, intuitive, seeker]
    required_fields:
      - wsjf_score
      - pattern
    min_wsjf: 5.0
    requires_team_consensus: true
```

**Validator** (`scripts/validation/tiered_validator.py`):
```python
class TieredValidator:
    def validate_item(self, item: Dict, circle: str) -> Dict:
        """Validate based on circle tier"""
        tier_config = self.get_tier_for_circle(circle)
        
        errors = []
        warnings = []
        
        # Check required fields
        for field in tier_config['required_fields']:
            if field not in item or not item[field]:
                errors.append(f"Missing required field: {field}")
        
        # Check WSJF threshold
        wsjf = item.get('wsjf_score', 0)
        if wsjf < tier_config['min_wsjf']:
            warnings.append(
                f"WSJF {wsjf} below tier minimum {tier_config['min_wsjf']}"
            )
        
        # Check approval requirements
        if tier_config.get('requires_executive_approval'):
            if not item.get('executive_approval'):
                errors.append("Executive approval required for Tier 1")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'tier': tier_config['name']
        }
```

## 4. Specialized Agent Offloading

### Problem
"Offload sensorimotor to specialized agents?" - Separate perception/action from reasoning.

### Solution: Agent Role Specialization

**Architecture**:
```
┌─────────────────────────────────────────────┐
│          Reasoning Layer (Central)          │
│  - WSJF calculation                         │
│  - Priority decisions                       │
│  - Pattern selection                        │
└─────────────────────────────────────────────┘
                    ↓ ↑
        ┌───────────┴───────────┐
        ↓                       ↓
┌───────────────┐       ┌───────────────┐
│ Perception    │       │ Action        │
│ Agents        │       │ Agents        │
├───────────────┤       ├───────────────┤
│ - Metric      │       │ - Deployment  │
│   collectors  │       │   executors   │
│ - Log parsers │       │ - Notification│
│ - Health      │       │   senders     │
│   monitors    │       │ - File        │
│               │       │   writers     │
└───────────────┘       └───────────────┘
```

**Agent Registry** (`scripts/agents/registry.yaml`):
```yaml
agents:
  perception:
    - name: metric_collector
      purpose: Gather telemetry from all services
      endpoints:
        - /api/metrics
        - /health
      output: logs/metrics_collected.jsonl
      
    - name: log_parser
      purpose: Extract patterns from structured logs
      input: logs/*.jsonl
      output: logs/parsed_events.jsonl
      
    - name: health_monitor
      purpose: Track site health across domains
      domains:
        - app.interface.tag.ooo
        - billing.interface.tag.ooo
        - blog.interface.tag.ooo
        - dev.interface.tag.ooo
        - forum.interface.tag.ooo
        - starlingx.interface.tag.ooo
      output: logs/site_health.jsonl
  
  reasoning:
    - name: wsjf_optimizer
      purpose: Calculate and optimize WSJF scores
      inputs:
        - logs/metrics_collected.jsonl
        - .goalie/CONSOLIDATED_ACTIONS.yaml
      output: .goalie/wsjf_recommendations.json
      
    - name: pattern_selector
      purpose: Recommend patterns based on context
      model: WeiboAI/VibeThinker-1.5B
      
  action:
    - name: deployment_executor
      purpose: Execute deployments to StarlingX/AWS
      targets:
        - stx-aio-0.corp.interface.tag.ooo
        - i-097706d9355b9f1b2
      
    - name: notification_sender
      purpose: Send alerts to ops team
      channels:
        - email: ops@interface.tag.ooo
        - slack: #ops-alerts
```

## 5. Guardrail-Lock Enforcement

### Problem
"guardrail_lock enforces boundaries?" - Need automatic safety enforcement.

### Solution: Multi-Level Guardrail System

**Guardrail Configuration** (`config/guardrails/system_locks.yaml`):
```yaml
guardrails:
  wip_limits:
    NOW_column: 3
    IN_PROGRESS_total: 10
    per_circle: 5
    enforcement: hard  # Block vs warn
    
  budget_limits:
    capex_monthly_max: 50000
    opex_monthly_max: 20000
    per_item_max: 10000
    enforcement: hard
    
  health_gates:
    min_uptime_pct: 99.0
    max_error_rate_pct: 1.0
    max_p99_latency_ms: 500
    enforcement: hard
    
  approval_gates:
    tier1_requires: [executive, security_review]
    tier2_requires: [circle_lead]
    tier3_requires: [team_consensus]
    enforcement: hard

lock_triggers:
  - condition: "wip_limits.NOW_column >= 3"
    action: block_new_items
    message: "WIP limit reached. Complete in-progress work before adding more."
    
  - condition: "health_gates.error_rate > 5%"
    action: block_deployments
    message: "Error rate critical. Fix issues before deploying."
    
  - condition: "budget_limits.capex_monthly > 50000"
    action: block_capex_items
    message: "Monthly CapEx budget exhausted. Wait for next cycle."
```

**Enforcement Engine** (`scripts/guardrails/enforcer.py`):
```python
class GuardrailEnforcer:
    def check_guardrails(self, action: str, context: Dict) -> Dict:
        """Check all applicable guardrails"""
        config = load_guardrails()
        violations = []
        
        for guardrail in config['lock_triggers']:
            if self.evaluate_condition(guardrail['condition'], context):
                violations.append({
                    'action': guardrail['action'],
                    'message': guardrail['message'],
                    'enforcement': config['guardrails'].get('enforcement', 'warn')
                })
        
        # Hard enforcement blocks operation
        hard_violations = [v for v in violations if v['enforcement'] == 'hard']
        
        return {
            'allowed': len(hard_violations) == 0,
            'violations': violations,
            'mode': 'blocked' if hard_violations else 'warned'
        }
```

## 6. WIP Limits & Unbounded Growth Prevention

### Problem
"WIP limits prevent unbounded growth?" - Need strict WIP enforcement.

### Solution: Kanban WIP with Automated Enforcement

**WIP Monitor** (`scripts/execution/wip_monitor.py`):
```python
class WIPMonitor:
    def check_wip_violations(self) -> Dict:
        """Check current WIP against limits"""
        kanban = load_kanban_board()
        config = load_guardrails()['wip_limits']
        
        violations = []
        
        # Check NOW column
        now_count = len(kanban['columns']['NOW']['items'])
        if now_count >= config['NOW_column']:
            violations.append({
                'column': 'NOW',
                'current': now_count,
                'limit': config['NOW_column'],
                'severity': 'critical'
            })
        
        # Check per-circle limits
        circle_counts = self.count_by_circle(kanban)
        for circle, count in circle_counts.items():
            if count >= config['per_circle']:
                violations.append({
                    'circle': circle,
                    'current': count,
                    'limit': config['per_circle'],
                    'severity': 'high'
                })
        
        return {
            'within_limits': len(violations) == 0,
            'violations': violations,
            'total_wip': self.count_total_wip(kanban)
        }
    
    def auto_enforce(self):
        """Automatically enforce WIP limits"""
        status = self.check_wip_violations()
        
        if not status['within_limits']:
            # Block new items from entering IN_PROGRESS
            self.set_guardrail_lock('wip_exceeded', True)
            
            # Send notifications
            self.notify_team({
                'message': 'WIP limit exceeded. Complete work before starting new items.',
                'violations': status['violations']
            })
```

## 7. Advisory Mode for Non-Mutating Analysis

### Problem
"advisory mode for non-mutating analysis where necessary?" - Need read-only mode.

### Solution: Mode-Based Execution

**Mode Configuration** (`config/execution_modes.yaml`):
```yaml
modes:
  mutate:
    description: "Full execution with state changes"
    permissions:
      - read
      - write
      - deploy
      - modify_kanban
    requires_approval: true
    audit_log: required
    
  advisory:
    description: "Read-only analysis and recommendations"
    permissions:
      - read
      - analyze
      - recommend
    requires_approval: false
    audit_log: optional
    
  dryrun:
    description: "Simulate execution without changes"
    permissions:
      - read
      - simulate
    requires_approval: false
    audit_log: optional
```

**Mode Enforcement** (`scripts/execution/mode_manager.py`):
```python
class ModeManager:
    def __init__(self, mode: str = 'advisory'):
        self.mode = mode
        self.config = load_execution_modes()[mode]
    
    def can_execute(self, operation: str) -> bool:
        """Check if operation allowed in current mode"""
        return operation in self.config['permissions']
    
    def execute_with_mode(self, operation: str, func, *args):
        """Execute function respecting mode constraints"""
        if not self.can_execute(operation):
            return {
                'executed': False,
                'reason': f'Operation {operation} not allowed in {self.mode} mode',
                'recommendation': self.get_recommendation(func, args)
            }
        
        # Audit log if required
        if self.config['audit_log'] == 'required':
            self.log_execution(operation, args)
        
        # Execute
        result = func(*args)
        
        return {
            'executed': True,
            'mode': self.mode,
            'result': result
        }
```

## 8. Explicit Visibility via Pattern Metrics

### Problem
"Explicit visibility via pattern metrics?" - Need transparent telemetry.

### Solution: Pattern Metric Dashboard

**Metrics Schema** (`.goalie/pattern_metrics.jsonl`):
```json
{
  "timestamp": "2025-12-11T22:38:26Z",
  "pattern": "Safe-Degrade",
  "item_id": "FLOW-001",
  "mode": "mutate",
  "visibility": "public",
  "metrics": {
    "execution_time_ms": 1250,
    "success": true,
    "degradation_triggered": false,
    "cost_usd": 0.15
  },
  "context": {
    "circle": "orchestrator",
    "tier": "tier1_strategic",
    "wip_at_start": 3
  }
}
```

**Dashboard Endpoint** (`/api/metrics/visibility`):
```python
@app.route('/api/metrics/visibility')
def pattern_visibility():
    """Public dashboard of all pattern executions"""
    metrics = load_pattern_metrics()
    
    return jsonify({
        'total_executions': len(metrics),
        'by_pattern': group_by(metrics, 'pattern'),
        'by_circle': group_by(metrics, 'context.circle'),
        'success_rate': calculate_success_rate(metrics),
        'avg_execution_time_ms': calculate_avg(metrics, 'execution_time_ms'),
        'total_cost_usd': sum([m['metrics']['cost_usd'] for m in metrics])
    })
```

## 9. Curriculum Learning with Baselines

### Problem
"Curriculum learning with baselines?" - Progressive difficulty with baseline tracking.

### Solution: Staged Learning with Baseline Comparison

**Curriculum** (`scripts/learning/curriculum.yaml`):
```yaml
stages:
  stage1_foundation:
    focus: Basic WSJF calculation
    baseline_required: true
    success_criteria:
      accuracy: 0.80
      speed_ms: 100
    duration_days: 7
    
  stage2_patterns:
    focus: Pattern-specific WSJF optimization
    baseline_required: true
    success_criteria:
      accuracy: 0.85
      pattern_coverage: 0.90
    duration_days: 14
    prerequisites: [stage1_foundation]
    
  stage3_multi_tenant:
    focus: Multi-tenant WSJF with domain routing
    baseline_required: true
    success_criteria:
      accuracy: 0.90
      tenant_isolation: 1.00
    duration_days: 21
    prerequisites: [stage2_patterns]
```

## 10. Productivity Metrics (Not Just Output)

### Problem
"Track productivity metrics (not just output)?" - Measure effectiveness, not just quantity.

### Solution: Comprehensive Productivity Dashboard

**Metrics** (`logs/productivity_metrics.jsonl`):
```json
{
  "timestamp": "2025-12-11T22:38:26Z",
  "period": "week",
  "metrics": {
    "output": {
      "items_completed": 12,
      "story_points": 34
    },
    "productivity": {
      "cycle_time_avg_hours": 18.5,
      "lead_time_avg_hours": 72.3,
      "flow_efficiency": 0.26,
      "rework_rate": 0.08
    },
    "quality": {
      "defect_rate": 0.03,
      "test_coverage_pct": 87,
      "code_review_time_hours": 4.2
    },
    "economic": {
      "revenue_generated": 15000,
      "cost_spent": 8000,
      "roi": 1.875
    }
  }
}
```

## 11. Multi-Site Health Monitoring

### Problem
Monitor health across all interface.tag.ooo domains.

### Solution: Unified Health Dashboard

**Health Monitor** (`scripts/monitoring/site_health_monitor.py`):
```python
import requests
from typing import Dict, List

SITES = [
    'app.interface.tag.ooo',
    'billing.interface.tag.ooo',
    'blog.interface.tag.ooo',
    'dev.interface.tag.ooo',
    'forum.interface.tag.ooo',
    'starlingx.interface.tag.ooo'
]

class SiteHealthMonitor:
    def check_all_sites(self) -> Dict:
        """Check health of all sites"""
        results = {}
        
        for site in SITES:
            results[site] = self.check_site_health(site)
        
        return {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'sites': results,
            'overall_health': self.calculate_overall_health(results)
        }
    
    def check_site_health(self, site: str) -> Dict:
        """Check individual site health"""
        try:
            response = requests.get(f'https://{site}/health', timeout=5)
            
            return {
                'status': 'healthy' if response.status_code == 200 else 'degraded',
                'response_time_ms': response.elapsed.total_seconds() * 1000,
                'status_code': response.status_code
            }
        except Exception as e:
            return {
                'status': 'critical',
                'error': str(e)
            }
```

**Health API Endpoint** (`/api/health/sites`):
```python
@app.route('/api/health/sites')
def get_site_health():
    """Return health status of all sites"""
    monitor = SiteHealthMonitor()
    health = monitor.check_all_sites()
    
    return jsonify(health)
```

## Implementation Priority

1. **NOW** (This week):
   - WIP limits enforcement
   - Advisory mode toggle
   - Pattern metrics visibility

2. **NEXT** (Next 2 weeks):
   - CapEx→Revenue tracking
   - Iteration budget with early stopping
   - Site health monitoring

3. **LATER** (Month 2):
   - Specialized agent offloading
   - Curriculum learning
   - Full productivity dashboard

---

**Status**: Framework Documented  
**Next Action**: Implement WIP monitor with guardrail enforcement  
**Domains**: app|billing|blog|dev|forum|starlingx.interface.tag.ooo
