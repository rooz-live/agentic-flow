#!/usr/bin/env python3
"""
WSJF Actionable Context Protocol
=================================

Enhanced Method Pattern protocols with:
- Forward/backward testing strategies
- Incremental execution tracking
- Real-time actionable recommendations
- Admin/user panel data structures

Usage:
    from wsjf_actionable_context import WSJFContext, generate_recommendations
    
    context = WSJFContext(pattern="safe-degrade", circle="orchestrator")
    context.log_execution_step("throttle_applied", cod=150, wsjf=75)
    recommendations = context.get_actionable_recommendations()
"""

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ACTIONABLE_LOG = PROJECT_ROOT / ".goalie" / "wsjf_actionable.jsonl"


class TestingStrategy(Enum):
    """Testing strategy types for pattern validation."""
    FORWARD = "forward"  # Test with future data
    BACKWARD = "backward"  # Validate against historical data
    SHADOW = "shadow"  # Run in parallel without applying
    AB_TEST = "ab_test"  # Compare two approaches


class ExecutionPhase(Enum):
    """Incremental execution phases."""
    PLAN = "plan"
    PREPARE = "prepare"
    EXECUTE = "execute"
    VALIDATE = "validate"
    COMMIT = "commit"
    ROLLBACK = "rollback"


@dataclass
class ExecutionStep:
    """Single step in incremental execution."""
    phase: str
    action: str
    timestamp: str
    cod: float
    wsjf_score: float
    risk_score: float
    success: bool
    duration_ms: float
    metadata: Dict[str, Any]


@dataclass
class ActionableRecommendation:
    """Actionable recommendation for users/admins."""
    priority: str  # HIGH, MEDIUM, LOW
    category: str  # performance, reliability, cost, risk
    title: str
    description: str
    impact_cod: float  # Expected COD reduction
    impact_wsjf: float  # Expected WSJF improvement
    estimated_effort_hours: float
    testing_strategy: str
    actionable_steps: List[str]
    success_criteria: List[str]
    ui_display: Dict[str, Any]  # UI/UX rendering hints


class WSJFContext:
    """
    Context manager for WSJF-driven execution with actionable tracking.
    
    Tracks incremental execution, generates recommendations, and provides
    data structures for admin/user panel visualization.
    """
    
    def __init__(
        self,
        pattern: str,
        circle: str,
        run_id: Optional[str] = None,
        testing_strategy: TestingStrategy = TestingStrategy.FORWARD
    ):
        self.pattern = pattern
        self.circle = circle
        self.run_id = run_id or f"wsjf-{int(time.time())}"
        self.testing_strategy = testing_strategy
        
        self.execution_steps: List[ExecutionStep] = []
        self.baseline_cod = 0.0
        self.baseline_wsjf = 0.0
        self.current_phase = ExecutionPhase.PLAN
        self.start_time = time.time()
    
    def set_baseline(self, cod: float, wsjf_score: float):
        """Set baseline metrics for comparison."""
        self.baseline_cod = cod
        self.baseline_wsjf = wsjf_score
    
    def log_execution_step(
        self,
        action: str,
        cod: float,
        wsjf: float,
        risk: float = 0.0,
        success: bool = True,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log incremental execution step."""
        step = ExecutionStep(
            phase=self.current_phase.value,
            action=action,
            timestamp=datetime.utcnow().isoformat() + "Z",
            cod=cod,
            wsjf_score=wsjf,
            risk_score=risk,
            success=success,
            duration_ms=(time.time() - self.start_time) * 1000,
            metadata=metadata or {}
        )
        self.execution_steps.append(step)
        
        # Log to actionable file
        self._write_log({
            "type": "execution_step",
            "run_id": self.run_id,
            "pattern": self.pattern,
            "circle": self.circle,
            "testing_strategy": self.testing_strategy.value,
            "step": asdict(step)
        })
    
    def advance_phase(self, next_phase: ExecutionPhase):
        """Advance to next execution phase."""
        self.current_phase = next_phase
        self._write_log({
            "type": "phase_transition",
            "run_id": self.run_id,
            "from_phase": self.current_phase.value,
            "to_phase": next_phase.value,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
    
    def get_actionable_recommendations(self) -> List[ActionableRecommendation]:
        """
        Generate actionable recommendations based on execution history.
        
        Returns prioritized recommendations for users and admins.
        """
        recommendations = []
        
        # Analyze execution steps
        if not self.execution_steps:
            return recommendations
        
        # Calculate metrics
        total_cod = sum(s.cod for s in self.execution_steps)
        total_wsjf = sum(s.wsjf_score for s in self.execution_steps)
        avg_risk = sum(s.risk_score for s in self.execution_steps) / len(self.execution_steps)
        failure_rate = sum(1 for s in self.execution_steps if not s.success) / len(self.execution_steps)
        
        # Recommendation 1: High COD pattern
        if total_cod > 1000:
            recommendations.append(ActionableRecommendation(
                priority="HIGH",
                category="cost",
                title="Optimize High-COD Pattern Execution",
                description=f"Pattern '{self.pattern}' accumulated {total_cod:.0f} COD. "
                           f"Consider throttling or safe-degrade strategies.",
                impact_cod=-total_cod * 0.3,  # Expected 30% reduction
                impact_wsjf=total_wsjf * 0.2,  # 20% WSJF improvement
                estimated_effort_hours=2.0,
                testing_strategy=TestingStrategy.SHADOW.value,
                actionable_steps=[
                    "Enable adaptive-throttling for this pattern",
                    "Set iteration-budget limit to 80% of current",
                    "Shadow test for 1 week before committing"
                ],
                success_criteria=[
                    "COD reduced by >25%",
                    "No increase in failure rate",
                    "WSJF improvement visible"
                ],
                ui_display={
                    "chart_type": "line",
                    "highlight": "cod_trend",
                    "color": "red"
                }
            ))
        
        # Recommendation 2: Failure rate alert
        if failure_rate > 0.1:
            recommendations.append(ActionableRecommendation(
                priority="HIGH",
                category="reliability",
                title="Address Elevated Failure Rate",
                description=f"Failure rate at {failure_rate:.1%}. Investigate root causes.",
                impact_cod=-200,
                impact_wsjf=50,
                estimated_effort_hours=4.0,
                testing_strategy=TestingStrategy.BACKWARD.value,
                actionable_steps=[
                    "Run backward test on last 100 successful executions",
                    "Identify common failure patterns",
                    "Implement fault-tolerance circuit breaker"
                ],
                success_criteria=[
                    "Failure rate < 5%",
                    "Mean time to recovery < 30s"
                ],
                ui_display={
                    "chart_type": "gauge",
                    "threshold": 0.1,
                    "color": "orange"
                }
            ))
        
        # Recommendation 3: Risk optimization
        if avg_risk > 5.0:
            recommendations.append(ActionableRecommendation(
                priority="MEDIUM",
                category="risk",
                title="Reduce Risk Exposure",
                description=f"Average risk score {avg_risk:.1f} exceeds threshold.",
                impact_cod=-100,
                impact_wsjf=30,
                estimated_effort_hours=3.0,
                testing_strategy=TestingStrategy.AB_TEST.value,
                actionable_steps=[
                    "A/B test: current strategy vs guardrail-lock enforcement",
                    "Measure impact on COD and WSJF for 24 hours",
                    "Apply winning strategy"
                ],
                success_criteria=[
                    "Risk score < 5.0",
                    "No negative impact on WSJF"
                ],
                ui_display={
                    "chart_type": "bar",
                    "comparison": "ab_test",
                    "color": "yellow"
                }
            ))
        
        # Recommendation 4: WSJF improvement opportunity
        if total_wsjf < 500 and len(self.execution_steps) > 10:
            recommendations.append(ActionableRecommendation(
                priority="MEDIUM",
                category="performance",
                title="Boost WSJF Score with Batch Optimization",
                description="Low WSJF accumulation. Consider batching operations.",
                impact_cod=-50,
                impact_wsjf=200,
                estimated_effort_hours=1.5,
                testing_strategy=TestingStrategy.FORWARD.value,
                actionable_steps=[
                    "Group similar pattern executions",
                    "Apply bulk economic calculations",
                    "Forward test on next 50 operations"
                ],
                success_criteria=[
                    "WSJF increased by >30%",
                    "No increase in latency"
                ],
                ui_display={
                    "chart_type": "area",
                    "forecast": True,
                    "color": "green"
                }
            ))
        
        # Sort by priority and impact
        priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        recommendations.sort(key=lambda r: (priority_order[r.priority], -r.impact_cod))
        
        return recommendations
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """
        Generate dashboard data structure for admin/user panel.
        
        Returns JSON-serializable dict for UI/UX rendering.
        """
        recommendations = self.get_actionable_recommendations()
        
        # Calculate trends
        recent_steps = self.execution_steps[-20:] if len(self.execution_steps) > 20 else self.execution_steps
        
        cod_trend = [s.cod for s in recent_steps]
        wsjf_trend = [s.wsjf_score for s in recent_steps]
        risk_trend = [s.risk_score for s in recent_steps]
        
        # Phase distribution
        phase_counts = {}
        for step in self.execution_steps:
            phase_counts[step.phase] = phase_counts.get(step.phase, 0) + 1
        
        return {
            "overview": {
                "run_id": self.run_id,
                "pattern": self.pattern,
                "circle": self.circle,
                "testing_strategy": self.testing_strategy.value,
                "current_phase": self.current_phase.value,
                "total_steps": len(self.execution_steps),
                "runtime_seconds": time.time() - self.start_time
            },
            "metrics": {
                "cumulative_cod": sum(s.cod for s in self.execution_steps),
                "cumulative_wsjf": sum(s.wsjf_score for s in self.execution_steps),
                "avg_risk": sum(s.risk_score for s in self.execution_steps) / len(self.execution_steps) if self.execution_steps else 0,
                "success_rate": sum(1 for s in self.execution_steps if s.success) / len(self.execution_steps) if self.execution_steps else 1.0,
                "cod_delta_from_baseline": sum(s.cod for s in self.execution_steps) - self.baseline_cod,
                "wsjf_delta_from_baseline": sum(s.wsjf_score for s in self.execution_steps) - self.baseline_wsjf
            },
            "trends": {
                "cod": cod_trend,
                "wsjf": wsjf_trend,
                "risk": risk_trend
            },
            "phase_distribution": phase_counts,
            "recommendations": [
                {
                    "priority": r.priority,
                    "category": r.category,
                    "title": r.title,
                    "description": r.description,
                    "impact": {
                        "cod_reduction": r.impact_cod,
                        "wsjf_improvement": r.impact_wsjf
                    },
                    "effort_hours": r.estimated_effort_hours,
                    "testing_strategy": r.testing_strategy,
                    "actionable_steps": r.actionable_steps,
                    "success_criteria": r.success_criteria,
                    "ui_display": r.ui_display
                }
                for r in recommendations
            ],
            "recent_steps": [
                {
                    "phase": s.phase,
                    "action": s.action,
                    "timestamp": s.timestamp,
                    "cod": s.cod,
                    "wsjf": s.wsjf_score,
                    "risk": s.risk_score,
                    "success": s.success
                }
                for s in recent_steps
            ]
        }
    
    def _write_log(self, entry: Dict[str, Any]):
        """Write entry to actionable log."""
        ACTIONABLE_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(ACTIONABLE_LOG, "a") as f:
            f.write(json.dumps(entry) + "\n")


def run_forward_test(
    pattern: str,
    circle: str,
    test_data: List[Dict[str, Any]],
    prediction_fn: callable
) -> Dict[str, Any]:
    """
    Run forward testing strategy on future data.
    
    Args:
        pattern: Pattern name
        circle: Circle name
        test_data: Future data points to test against
        prediction_fn: Function that predicts outcomes
    
    Returns:
        Test results with accuracy metrics
    """
    context = WSJFContext(pattern, circle, testing_strategy=TestingStrategy.FORWARD)
    
    correct = 0
    total = len(test_data)
    
    for data_point in test_data:
        prediction = prediction_fn(data_point)
        actual = data_point.get("actual_outcome")
        
        success = prediction == actual
        if success:
            correct += 1
        
        context.log_execution_step(
            action="forward_test_prediction",
            cod=data_point.get("cod", 0),
            wsjf=data_point.get("wsjf", 0),
            success=success,
            metadata={"prediction": prediction, "actual": actual}
        )
    
    accuracy = correct / total if total > 0 else 0
    
    return {
        "strategy": "forward",
        "accuracy": accuracy,
        "total_tests": total,
        "correct_predictions": correct,
        "dashboard_data": context.get_dashboard_data()
    }


def run_backward_test(
    pattern: str,
    circle: str,
    historical_data: List[Dict[str, Any]],
    validation_fn: callable
) -> Dict[str, Any]:
    """
    Run backward testing strategy on historical data.
    
    Validates that current approach would have worked on past data.
    """
    context = WSJFContext(pattern, circle, testing_strategy=TestingStrategy.BACKWARD)
    
    valid = 0
    total = len(historical_data)
    
    for data_point in historical_data:
        is_valid = validation_fn(data_point)
        if is_valid:
            valid += 1
        
        context.log_execution_step(
            action="backward_test_validation",
            cod=data_point.get("cod", 0),
            wsjf=data_point.get("wsjf", 0),
            success=is_valid,
            metadata={"data_point": data_point}
        )
    
    validation_rate = valid / total if total > 0 else 0
    
    return {
        "strategy": "backward",
        "validation_rate": validation_rate,
        "total_tests": total,
        "valid_points": valid,
        "dashboard_data": context.get_dashboard_data()
    }


if __name__ == "__main__":
    # Example usage
    context = WSJFContext("safe-degrade", "orchestrator")
    context.set_baseline(cod=1000, wsjf_score=500)
    
    # Simulate incremental execution
    context.advance_phase(ExecutionPhase.PREPARE)
    context.log_execution_step("validate_health", cod=50, wsjf=25, risk=2.0)
    
    context.advance_phase(ExecutionPhase.EXECUTE)
    context.log_execution_step("apply_throttle", cod=150, wsjf=75, risk=3.0)
    context.log_execution_step("monitor_metrics", cod=10, wsjf=5, risk=1.0)
    
    context.advance_phase(ExecutionPhase.VALIDATE)
    context.log_execution_step("check_success", cod=20, wsjf=10, risk=1.0, success=True)
    
    # Get recommendations
    recommendations = context.get_actionable_recommendations()
    print(f"Generated {len(recommendations)} recommendations")
    
    # Get dashboard data
    dashboard = context.get_dashboard_data()
    print(json.dumps(dashboard, indent=2))
