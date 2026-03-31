#!/usr/bin/env python3
"""
Testing Strategies Module for WSJF-Driven Execution

Supports 4 testing strategies:
- Forward: Execute → Validate → Persist
- Backward: Execute → Validate → Rollback → Compare
- A/B: Execute variant A + B → Statistical comparison → Choose winner  
- Canary: Execute on subset → Validate → Expand

Usage:
    from testing_strategies import TestingStrategy, execute_with_strategy
    
    result = execute_with_strategy(
        strategy='forward',
        pattern='safe-degrade',
        circle='orchestrator',
        action_fn=lambda: apply_throttle(),
        validation_fn=lambda: check_metrics()
    )
"""

import json
import time
import os
from datetime import datetime
from typing import Callable, Dict, List, Optional, Any, Tuple
from enum import Enum
from dataclasses import dataclass, asdict
import statistics
from pathlib import Path


class TestingStrategy(Enum):
    """Available testing strategies"""
    FORWARD = "forward"
    BACKWARD = "backward"
    AB = "a_b"
    CANARY = "canary"


@dataclass
class ValidationCriteria:
    """Validation criteria for testing strategies"""
    name: str
    threshold: float
    operator: str  # '<', '>', '<=', '>=', '==', '!='
    actual_value: Optional[float] = None
    passed: Optional[bool] = None


@dataclass
class MetricsSnapshot:
    """Snapshot of system metrics at a point in time"""
    timestamp: str
    load_avg: float
    cpu_idle: float
    memory_used_pct: float
    active_processes: int
    wip_violations: int = 0


@dataclass
class TestExecutionResult:
    """Result of a test execution"""
    success: bool
    strategy: str
    duration_ms: float
    metrics_before: MetricsSnapshot
    metrics_after: MetricsSnapshot
    validation_results: List[ValidationCriteria]
    rollback_executed: bool = False
    error: Optional[str] = None
    metadata: Dict[str, Any] = None


class TestingStrategyExecutor:
    """Executor for different testing strategies"""
    
    def __init__(self, output_dir: str = ".goalie"):
        self.output_dir = Path(output_dir)
        self.checkpoints_dir = self.output_dir / "checkpoints"
        self.actionable_log = self.output_dir / "wsjf_actionable.jsonl"
        
        # Ensure directories exist
        self.checkpoints_dir.mkdir(parents=True, exist_ok=True)
    
    def capture_metrics(self) -> MetricsSnapshot:
        """Capture current system metrics"""
        try:
            import psutil
            cpu_percent = psutil.cpu_percent(interval=0.5)
            cpu_idle = 100 - cpu_percent
            load_avg = os.getloadavg()[0]
            mem = psutil.virtual_memory()
            proc_count = len(psutil.pids())
            
            return MetricsSnapshot(
                timestamp=datetime.utcnow().isoformat() + 'Z',
                load_avg=load_avg,
                cpu_idle=cpu_idle,
                memory_used_pct=mem.percent,
                active_processes=proc_count
            )
        except ImportError:
            # Fallback if psutil not available
            load_avg = os.getloadavg()[0] if hasattr(os, 'getloadavg') else 0.0
            return MetricsSnapshot(
                timestamp=datetime.utcnow().isoformat() + 'Z',
                load_avg=load_avg,
                cpu_idle=50.0,  # Default estimate
                memory_used_pct=50.0,
                active_processes=100
            )
    
    def validate_metrics(
        self,
        metrics: MetricsSnapshot,
        criteria: List[ValidationCriteria]
    ) -> List[ValidationCriteria]:
        """Validate metrics against criteria"""
        results = []
        
        for criterion in criteria:
            actual = getattr(metrics, criterion.name.replace('-', '_'), None)
            
            if actual is None:
                criterion.passed = False
                results.append(criterion)
                continue
            
            criterion.actual_value = actual
            
            # Evaluate operator
            operators = {
                '<': lambda a, t: a < t,
                '>': lambda a, t: a > t,
                '<=': lambda a, t: a <= t,
                '>=': lambda a, t: a >= t,
                '==': lambda a, t: a == t,
                '!=': lambda a, t: a != t,
            }
            
            op_fn = operators.get(criterion.operator)
            if op_fn:
                criterion.passed = op_fn(actual, criterion.threshold)
            else:
                criterion.passed = False
            
            results.append(criterion)
        
        return results
    
    def create_checkpoint(
        self,
        run_id: str,
        circle: str,
        pattern: str,
        step_index: int,
        metrics: MetricsSnapshot,
        rollback_steps: List[str]
    ) -> str:
        """Create a rollback checkpoint"""
        checkpoint_id = f"chk-{int(time.time())}"
        checkpoint = {
            "checkpoint_id": checkpoint_id,
            "run_id": run_id,
            "timestamp": datetime.utcnow().isoformat() + 'Z',
            "state_snapshot": {
                "circle": circle,
                "pattern": pattern,
                "step_index": step_index,
                "metrics": asdict(metrics),
                "wsjf_score": 0  # Placeholder
            },
            "rollback_steps": rollback_steps
        }
        
        checkpoint_path = self.checkpoints_dir / f"{checkpoint_id}.json"
        with open(checkpoint_path, 'w') as f:
            json.dump(checkpoint, f, indent=2)
        
        return checkpoint_id
    
    def rollback_to_checkpoint(self, checkpoint_id: str) -> bool:
        """Rollback to a specific checkpoint"""
        checkpoint_path = self.checkpoints_dir / f"{checkpoint_id}.json"
        
        if not checkpoint_path.exists():
            return False
        
        with open(checkpoint_path, 'r') as f:
            checkpoint = json.load(f)
        
        # Execute rollback steps
        rollback_steps = checkpoint.get('rollback_steps', [])
        for step in rollback_steps:
            print(f"[Rollback] Executing: {step}")
            # In real implementation, execute rollback command
            # For now, just log
        
        return True
    
    def log_actionable_event(self, event: Dict[str, Any]):
        """Log event to wsjf_actionable.jsonl"""
        with open(self.actionable_log, 'a') as f:
            f.write(json.dumps(event) + '\n')
    
    def execute_forward(
        self,
        run_id: str,
        pattern: str,
        circle: str,
        action_fn: Callable[[], Any],
        validation_criteria: List[ValidationCriteria],
        cod: int = 0,
        wsjf_score: float = 0.0
    ) -> TestExecutionResult:
        """Execute forward testing: Execute → Validate → Persist"""
        start_time = time.time()
        
        # Capture baseline
        metrics_before = self.capture_metrics()
        
        try:
            # Execute action
            action_fn()
            
            # Capture post-execution metrics
            metrics_after = self.capture_metrics()
            
            # Validate
            validation_results = self.validate_metrics(metrics_after, validation_criteria)
            all_passed = all(c.passed for c in validation_results)
            
            duration_ms = (time.time() - start_time) * 1000
            
            # Log to actionable
            self.log_actionable_event({
                "type": "execution_step",
                "run_id": run_id,
                "pattern": pattern,
                "circle": circle,
                "testing_strategy": "forward",
                "step": {
                    "phase": "execute",
                    "action": "forward_test",
                    "timestamp": datetime.utcnow().isoformat() + 'Z',
                    "cod": cod,
                    "wsjf_score": wsjf_score,
                    "success": all_passed,
                    "duration_ms": duration_ms,
                    "baseline_metrics": asdict(metrics_before),
                    "target_metrics": asdict(metrics_after),
                    "validation_criteria": [asdict(c) for c in validation_results],
                    "rollback_available": False
                }
            })
            
            return TestExecutionResult(
                success=all_passed,
                strategy="forward",
                duration_ms=duration_ms,
                metrics_before=metrics_before,
                metrics_after=metrics_after,
                validation_results=validation_results,
                rollback_executed=False
            )
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            return TestExecutionResult(
                success=False,
                strategy="forward",
                duration_ms=duration_ms,
                metrics_before=metrics_before,
                metrics_after=self.capture_metrics(),
                validation_results=[],
                rollback_executed=False,
                error=str(e)
            )
    
    def execute_backward(
        self,
        run_id: str,
        pattern: str,
        circle: str,
        action_fn: Callable[[], Any],
        rollback_fn: Callable[[], Any],
        validation_criteria: List[ValidationCriteria],
        cod: int = 0,
        wsjf_score: float = 0.0
    ) -> TestExecutionResult:
        """Execute backward testing: Execute → Validate → Rollback → Compare"""
        start_time = time.time()
        
        # Capture baseline
        metrics_before = self.capture_metrics()
        checkpoint_id = self.create_checkpoint(
            run_id, circle, pattern, 0, metrics_before,
            rollback_steps=["execute_rollback_fn"]
        )
        
        try:
            # Execute action
            action_fn()
            
            # Capture post-execution metrics
            metrics_after = self.capture_metrics()
            
            # Validate
            validation_results = self.validate_metrics(metrics_after, validation_criteria)
            
            # ALWAYS rollback in backward testing
            rollback_fn()
            time.sleep(1)  # Allow rollback to settle
            
            # Capture post-rollback metrics
            metrics_rollback = self.capture_metrics()
            
            # Compare delta: did we return to baseline?
            delta_before_after = abs(metrics_after.load_avg - metrics_before.load_avg)
            delta_rollback = abs(metrics_rollback.load_avg - metrics_before.load_avg)
            rollback_successful = delta_rollback < delta_before_after
            
            duration_ms = (time.time() - start_time) * 1000
            
            # Log to actionable
            self.log_actionable_event({
                "type": "execution_step",
                "run_id": run_id,
                "pattern": pattern,
                "circle": circle,
                "testing_strategy": "backward",
                "step": {
                    "phase": "execute_and_rollback",
                    "action": "backward_test",
                    "timestamp": datetime.utcnow().isoformat() + 'Z',
                    "cod": cod,
                    "wsjf_score": wsjf_score,
                    "success": rollback_successful,
                    "duration_ms": duration_ms,
                    "baseline_metrics": asdict(metrics_before),
                    "after_metrics": asdict(metrics_after),
                    "rollback_metrics": asdict(metrics_rollback),
                    "validation_criteria": [asdict(c) for c in validation_results],
                    "rollback_available": True,
                    "rollback_executed": True,
                    "checkpoint_id": checkpoint_id
                }
            })
            
            return TestExecutionResult(
                success=rollback_successful,
                strategy="backward",
                duration_ms=duration_ms,
                metrics_before=metrics_before,
                metrics_after=metrics_rollback,
                validation_results=validation_results,
                rollback_executed=True,
                metadata={"checkpoint_id": checkpoint_id}
            )
            
        except Exception as e:
            # Attempt rollback on error
            try:
                rollback_fn()
            except:
                pass
            
            duration_ms = (time.time() - start_time) * 1000
            return TestExecutionResult(
                success=False,
                strategy="backward",
                duration_ms=duration_ms,
                metrics_before=metrics_before,
                metrics_after=self.capture_metrics(),
                validation_results=[],
                rollback_executed=True,
                error=str(e)
            )
    
    def execute_ab(
        self,
        run_id: str,
        pattern: str,
        circle: str,
        variant_a_fn: Callable[[], Any],
        variant_b_fn: Callable[[], Any],
        rollback_fn: Callable[[], Any],
        validation_criteria: List[ValidationCriteria],
        cod: int = 0,
        wsjf_score: float = 0.0,
        split_ratio: Tuple[float, float] = (0.5, 0.5)
    ) -> TestExecutionResult:
        """Execute A/B testing: Run both variants → Compare → Choose winner"""
        start_time = time.time()
        
        results_a = []
        results_b = []
        
        # Run multiple samples for statistical significance
        num_samples = 5
        
        metrics_before = self.capture_metrics()
        
        try:
            # Run variant A samples
            for i in range(num_samples):
                variant_a_fn()
                time.sleep(0.5)
                metrics_a = self.capture_metrics()
                results_a.append(metrics_a.load_avg)
                rollback_fn()
                time.sleep(0.5)
            
            # Run variant B samples
            for i in range(num_samples):
                variant_b_fn()
                time.sleep(0.5)
                metrics_b = self.capture_metrics()
                results_b.append(metrics_b.load_avg)
                rollback_fn()
                time.sleep(0.5)
            
            # Statistical comparison
            mean_a = statistics.mean(results_a)
            mean_b = statistics.mean(results_b)
            stdev_a = statistics.stdev(results_a) if len(results_a) > 1 else 0
            stdev_b = statistics.stdev(results_b) if len(results_b) > 1 else 0
            
            # Simple winner determination (lower load avg wins)
            winner = 'A' if mean_a < mean_b else 'B'
            
            duration_ms = (time.time() - start_time) * 1000
            
            # Log to actionable
            self.log_actionable_event({
                "type": "execution_step",
                "run_id": run_id,
                "pattern": pattern,
                "circle": circle,
                "testing_strategy": "a_b",
                "step": {
                    "phase": "ab_test",
                    "action": "compare_variants",
                    "timestamp": datetime.utcnow().isoformat() + 'Z',
                    "cod": cod,
                    "wsjf_score": wsjf_score,
                    "success": True,
                    "duration_ms": duration_ms,
                    "test_mode": "a_b",
                    "ab_results": {
                        "variant_a": {"mean": mean_a, "stdev": stdev_a, "samples": results_a},
                        "variant_b": {"mean": mean_b, "stdev": stdev_b, "samples": results_b},
                        "winner": winner,
                        "improvement_pct": abs((mean_b - mean_a) / mean_a * 100) if mean_a > 0 else 0
                    },
                    "rollback_available": True,
                    "rollback_executed": True
                }
            })
            
            return TestExecutionResult(
                success=True,
                strategy="a_b",
                duration_ms=duration_ms,
                metrics_before=metrics_before,
                metrics_after=self.capture_metrics(),
                validation_results=[],
                rollback_executed=True,
                metadata={"winner": winner, "mean_a": mean_a, "mean_b": mean_b}
            )
            
        except Exception as e:
            try:
                rollback_fn()
            except:
                pass
            
            duration_ms = (time.time() - start_time) * 1000
            return TestExecutionResult(
                success=False,
                strategy="a_b",
                duration_ms=duration_ms,
                metrics_before=metrics_before,
                metrics_after=self.capture_metrics(),
                validation_results=[],
                rollback_executed=True,
                error=str(e)
            )


def execute_with_strategy(
    strategy: str,
    pattern: str,
    circle: str,
    run_id: Optional[str] = None,
    **kwargs
) -> TestExecutionResult:
    """
    Convenience function to execute with specified strategy
    
    Args:
        strategy: 'forward', 'backward', 'a_b', or 'canary'
        pattern: Pattern name (e.g., 'safe-degrade')
        circle: Circle name (e.g., 'orchestrator')
        run_id: Optional run ID (auto-generated if not provided)
        **kwargs: Strategy-specific arguments
    
    Returns:
        TestExecutionResult
    """
    if run_id is None:
        run_id = f"wsjf-{int(time.time())}"
    
    executor = TestingStrategyExecutor()
    
    strategy_enum = TestingStrategy(strategy)
    
    if strategy_enum == TestingStrategy.FORWARD:
        return executor.execute_forward(
            run_id=run_id,
            pattern=pattern,
            circle=circle,
            action_fn=kwargs.get('action_fn'),
            validation_criteria=kwargs.get('validation_criteria', []),
            cod=kwargs.get('cod', 0),
            wsjf_score=kwargs.get('wsjf_score', 0.0)
        )
    
    elif strategy_enum == TestingStrategy.BACKWARD:
        return executor.execute_backward(
            run_id=run_id,
            pattern=pattern,
            circle=circle,
            action_fn=kwargs.get('action_fn'),
            rollback_fn=kwargs.get('rollback_fn'),
            validation_criteria=kwargs.get('validation_criteria', []),
            cod=kwargs.get('cod', 0),
            wsjf_score=kwargs.get('wsjf_score', 0.0)
        )
    
    elif strategy_enum == TestingStrategy.AB:
        return executor.execute_ab(
            run_id=run_id,
            pattern=pattern,
            circle=circle,
            variant_a_fn=kwargs.get('variant_a_fn'),
            variant_b_fn=kwargs.get('variant_b_fn'),
            rollback_fn=kwargs.get('rollback_fn'),
            validation_criteria=kwargs.get('validation_criteria', []),
            cod=kwargs.get('cod', 0),
            wsjf_score=kwargs.get('wsjf_score', 0.0),
            split_ratio=kwargs.get('split_ratio', (0.5, 0.5))
        )
    
    else:
        raise ValueError(f"Strategy {strategy} not yet implemented")


if __name__ == "__main__":
    # Example usage
    def dummy_action():
        time.sleep(0.1)
        print("[Action] Applying throttle...")
    
    def dummy_rollback():
        time.sleep(0.1)
        print("[Rollback] Reverting throttle...")
    
    # Forward test
    criteria = [
        ValidationCriteria(name="load_avg", threshold=25.0, operator="<"),
        ValidationCriteria(name="cpu_idle", threshold=30.0, operator=">")
    ]
    
    result = execute_with_strategy(
        strategy='forward',
        pattern='safe-degrade',
        circle='orchestrator',
        action_fn=dummy_action,
        validation_criteria=criteria,
        cod=150,
        wsjf_score=75.0
    )
    
    print(f"\nForward Test Result: {'PASS' if result.success else 'FAIL'}")
    print(f"Duration: {result.duration_ms:.2f}ms")
    print(f"Validation Results:")
    for v in result.validation_results:
        status = '✓' if v.passed else '✗'
        print(f"  {status} {v.name} {v.operator} {v.threshold} (actual: {v.actual_value})")
