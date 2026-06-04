"""
Circuit Breaker Patterns for Resilient Agentic Flows
Anti-fragile circuit breaker with semantic awareness

Plan: later-phase-support-proxies-migration-019cbe.md
"""

import asyncio
import time
from enum import Enum, auto
from typing import Callable, Any, Optional, Dict, List
from dataclasses import dataclass, field
from functools import wraps
import threading
import os
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"           # Normal operation
    OPEN = "open"               # Failing fast
    HALF_OPEN = "half_open"     # Testing recovery


class CircuitBreakerOpen(Exception):
    """Raised when circuit breaker is open"""
    pass


@dataclass
class CircuitBreakerMetrics:
    """Metrics for circuit breaker monitoring"""
    name: str
    state: CircuitState
    failure_count: int
    success_count: int
    last_failure_time: Optional[float]
    last_success_time: Optional[float]
    total_calls: int = 0
    total_failures: int = 0
    total_successes: int = 0
    open_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "last_failure_time": self.last_failure_time,
            "last_success_time": self.last_success_time,
            "total_calls": self.total_calls,
            "total_failures": self.total_failures,
            "total_successes": self.total_successes,
            "open_count": self.open_count
        }


class CircuitBreaker:
    """
    Anti-fragile circuit breaker with exponential backoff
    and semantic awareness for agentic flows.
    """
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 3,
        success_threshold: int = 2,
        exponential_base: float = 2.0,
        max_recovery_timeout: float = 300.0
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        self.success_threshold = success_threshold
        self.exponential_base = exponential_base
        self.max_recovery_timeout = max_recovery_timeout
        
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[float] = None
        self._last_success_time: Optional[float] = None
        self._consecutive_successes = 0
        self._open_count = 0
        self._lock = threading.RLock()
        
        # Metrics tracking
        self._total_calls = 0
        self._total_failures = 0
        self._total_successes = 0

    def _log_pattern_event(self, action: str, reason: str, details: Optional[Dict] = None):
        """Log a pattern event to .goalie/pattern_metrics.jsonl"""
        try:
            # Find project root (up 3 levels from src/resilience/circuit_breaker.py)
            project_root = Path(__file__).resolve().parent.parent.parent
            goalie_dir = project_root / ".goalie"
            goalie_dir.mkdir(exist_ok=True)
            
            metrics_file = goalie_dir / "pattern_metrics.jsonl"
            
            event = {
                "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "run": "production",
                "run_id": os.environ.get("RUN_ID", str(uuid.uuid4())),
                "iteration": int(os.environ.get("LOOP_TICK_COUNT", "1")),
                "circle": "orchestrator",
                "depth": 3,
                "pattern": "safe-degrade",
                "mode": "enforcement",
                "mutation": True,
                "gate": "resilience-gate",
                "framework": "fastapi",
                "scheduler": "local",
                "tags": ["Observability", "Rust"],
                "economic": {
                    "cod": 15.0,
                    "wsjf_score": 5.0
                },
                "reason": reason,
                "action": action,
                "prod_mode": True,
                "trigger_reason": reason,
                "degraded_to": f"circuit_{self._state.value}",
                "recovery_plan": f"Wait for recovery timeout {self.recovery_timeout}s and attempt reset",
                "incident_threshold": self.failure_threshold,
                "current_value": self._failure_count,
                "breaker_name": self.name,
                "metrics": self.metrics.to_dict()
            }
            if details:
                event.update(details)
                
            with open(metrics_file, 'a') as f:
                f.write(json.dumps(event) + "\n")
        except Exception as e:
            print(f"Failed to log circuit breaker event: {e}")
    
    @property
    def state(self) -> CircuitState:
        with self._lock:
            return self._state
    
    @property
    def metrics(self) -> CircuitBreakerMetrics:
        with self._lock:
            return CircuitBreakerMetrics(
                name=self.name,
                state=self._state,
                failure_count=self._failure_count,
                success_count=self._success_count,
                last_failure_time=self._last_failure_time,
                last_success_time=self._last_success_time,
                total_calls=self._total_calls,
                total_failures=self._total_failures,
                total_successes=self._total_successes,
                open_count=self._open_count
            )
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with circuit breaker protection
        """
        with self._lock:
            self._total_calls += 1
            
            # Check if circuit is open
            if self._state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self._state = CircuitState.HALF_OPEN
                    self._success_count = 0
                    self._consecutive_successes = 0
                else:
                    self._total_failures += 1
                    raise CircuitBreakerOpen(
                        f"Circuit '{self.name}' is OPEN. "
                        f"Retry after {self._get_remaining_timeout():.1f}s"
                    )
            
            # Check half-open limit
            if self._state == CircuitState.HALF_OPEN:
                if self._success_count >= self.half_open_max_calls:
                    self._total_failures += 1
                    raise CircuitBreakerOpen(
                        f"Circuit '{self.name}' HALF_OPEN limit reached"
                    )
        
        # Execute the function
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            self._on_success()
            return result
            
        except Exception as e:
            self._on_failure()
            raise
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to try recovery"""
        if self._last_failure_time is None:
            return True
        
        elapsed = time.time() - self._last_failure_time
        current_timeout = self._get_current_timeout()
        
        return elapsed >= current_timeout
    
    def _get_current_timeout(self) -> float:
        """Calculate current recovery timeout with exponential backoff"""
        if self._open_count == 0:
            return self.recovery_timeout
        
        # Exponential backoff
        timeout = self.recovery_timeout * (self.exponential_base ** (self._open_count - 1))
        return min(timeout, self.max_recovery_timeout)
    
    def _get_remaining_timeout(self) -> float:
        """Get remaining time before next retry attempt"""
        if self._last_failure_time is None:
            return 0.0
        
        elapsed = time.time() - self._last_failure_time
        current_timeout = self._get_current_timeout()
        remaining = current_timeout - elapsed
        
        return max(0.0, remaining)
    
    def _on_success(self):
        """Handle successful call"""
        with self._lock:
            self._last_success_time = time.time()
            self._total_successes += 1
            
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                self._consecutive_successes += 1
                
                # Check if we can close the circuit
                if self._consecutive_successes >= self.success_threshold:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    self._open_count = 0
                    self._consecutive_successes = 0
                    self._log_pattern_event(
                        action="CIRCUIT_CLOSED",
                        reason=f"Success threshold of {self.success_threshold} reached. Circuit fully recovered."
                    )
            else:
                # In closed state, reset failure count
                self._failure_count = 0
                self._consecutive_successes += 1
    
    def _on_failure(self):
        """Handle failed call"""
        with self._lock:
            self._last_failure_time = time.time()
            self._failure_count += 1
            self._total_failures += 1
            self._consecutive_successes = 0
            
            if self._state == CircuitState.HALF_OPEN:
                # Failed during recovery test - open immediately
                self._state = CircuitState.OPEN
                self._open_count += 1
                self._success_count = 0
                self._log_pattern_event(
                    action="CIRCUIT_OPENED_FROM_HALF_OPEN",
                    reason="Failed during HALF_OPEN recovery test"
                )
            elif self._failure_count >= self.failure_threshold:
                # Too many failures - open the circuit
                self._state = CircuitState.OPEN
                self._open_count += 1
                self._log_pattern_event(
                    action="CIRCUIT_OPENED",
                    reason=f"Failure threshold of {self.failure_threshold} reached. Current failures: {self._failure_count}"
                )
    
    def force_open(self):
        """Manually open the circuit (emergency stop)"""
        with self._lock:
            self._state = CircuitState.OPEN
            self._open_count += 1
            self._last_failure_time = time.time()
            self._log_pattern_event(
                action="CIRCUIT_FORCED_OPEN",
                reason="Manual override force open"
            )
    
    def force_close(self):
        """Manually close the circuit (override)"""
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._success_count = 0
            self._consecutive_successes = 0
            self._open_count = 0
            self._log_pattern_event(
                action="CIRCUIT_FORCED_CLOSED",
                reason="Manual override force close"
            )


class CircuitBreakerRegistry:
    """
    Registry for managing multiple circuit breakers
    """
    
    def __init__(self):
        self._breakers: Dict[str, CircuitBreaker] = {}
        self._lock = threading.RLock()
    
    def register(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        **kwargs
    ) -> CircuitBreaker:
        """Register a new circuit breaker"""
        with self._lock:
            if name not in self._breakers:
                self._breakers[name] = CircuitBreaker(
                    name=name,
                    failure_threshold=failure_threshold,
                    recovery_timeout=recovery_timeout,
                    **kwargs
                )
            return self._breakers[name]
    
    def get(self, name: str) -> Optional[CircuitBreaker]:
        """Get circuit breaker by name"""
        with self._lock:
            return self._breakers.get(name)
    
    def is_open(self, name: str) -> bool:
        """Check if circuit breaker is open"""
        breaker = self.get(name)
        if breaker:
            return breaker.state == CircuitState.OPEN
        return False
    
    def all_metrics(self) -> List[CircuitBreakerMetrics]:
        """Get metrics for all circuit breakers"""
        with self._lock:
            return [cb.metrics for cb in self._breakers.values()]
    
    def health_report(self) -> Dict[str, Any]:
        """Generate health report for all circuits"""
        metrics = self.all_metrics()
        
        open_circuits = [m for m in metrics if m.state == CircuitState.OPEN]
        half_open_circuits = [m for m in metrics if m.state == CircuitState.HALF_OPEN]
        
        return {
            "total_circuits": len(metrics),
            "open_circuits": len(open_circuits),
            "half_open_circuits": len(half_open_circuits),
            "healthy_circuits": len(metrics) - len(open_circuits) - len(half_open_circuits),
            "circuits": [m.to_dict() for m in metrics],
            "degraded": len(open_circuits) > 0
        }


def circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    recovery_timeout: float = 30.0,
    registry: Optional[CircuitBreakerRegistry] = None
):
    """
    Decorator for adding circuit breaker protection to functions
    """
    def decorator(func: Callable):
        cb_registry = registry or _global_registry
        breaker = cb_registry.register(
            name=name,
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout
        )
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await breaker.call(func, *args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # For sync functions, we need to handle differently
            if breaker.state == CircuitState.OPEN:
                if not breaker._should_attempt_reset():
                    raise CircuitBreakerOpen(f"Circuit '{name}' is OPEN")
            
            try:
                result = func(*args, **kwargs)
                breaker._on_success()
                return result
            except Exception:
                breaker._on_failure()
                raise
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


# Global registry for convenience
_global_registry = CircuitBreakerRegistry()


def get_global_registry() -> CircuitBreakerRegistry:
    """Get the global circuit breaker registry"""
    return _global_registry


# Example usage and testing
if __name__ == "__main__":
    import random
    
    async def test_circuit_breaker():
        """Test circuit breaker behavior"""
        registry = CircuitBreakerRegistry()
        
        # Create a circuit breaker for a flaky service
        cb = registry.register(
            name="test_service",
            failure_threshold=3,
            recovery_timeout=5.0
        )
        
        async def flaky_service():
            """Simulates a service that fails randomly"""
            if random.random() < 0.7:  # 70% failure rate
                raise Exception("Service error")
            return "Success"
        
        print("Testing Circuit Breaker:")
        print(f"Initial state: {cb.state.value}")
        print()
        
        # Make calls until circuit opens
        for i in range(10):
            try:
                result = await cb.call(flaky_service)
                print(f"Call {i+1}: {result} ({cb.state.value})")
            except CircuitBreakerOpen:
                print(f"Call {i+1}: CIRCUIT OPEN - failing fast ({cb.state.value})")
            except Exception as e:
                print(f"Call {i+1}: Error - {e} ({cb.state.value})")
            
            await asyncio.sleep(0.1)
        
        print()
        print("Final metrics:")
        metrics = cb.metrics
        print(f"  State: {metrics.state.value}")
        print(f"  Total calls: {metrics.total_calls}")
        print(f"  Failures: {metrics.total_failures}")
        print(f"  Successes: {metrics.total_successes}")
        print(f"  Open count: {metrics.open_count}")
    
    # Run test
    asyncio.run(test_circuit_breaker())
