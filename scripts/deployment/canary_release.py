#!/usr/bin/env python3
"""Canary Release Pipeline for StarlingX STX.11 Upgrade.

Progressive deployment strategy with:
- Monitoring gates at each stage
- Auto-rollback on failure
- ROAM-integrated risk assessment

Reference: Phase 4 P2-2 Canary Release Pipeline Design
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[2]
GOALIE_DIR = PROJECT_ROOT / ".goalie"


class CanaryStage(Enum):
    """Canary deployment stages."""
    BASELINE = "baseline"
    CANARY_5 = "canary_5_percent"
    CANARY_25 = "canary_25_percent"
    CANARY_50 = "canary_50_percent"
    FULL_ROLLOUT = "full_rollout"
    ROLLBACK = "rollback"


@dataclass
class MonitoringGate:
    """Monitoring gate for canary progression."""
    name: str
    metric: str
    threshold: float
    operator: str = "lt"  # lt, gt, eq
    duration_minutes: int = 5
    
    def check(self, current_value: float) -> bool:
        """Check if gate passes."""
        if self.operator == "lt":
            return current_value < self.threshold
        elif self.operator == "gt":
            return current_value > self.threshold
        return current_value == self.threshold


@dataclass 
class CanaryConfig:
    """Configuration for canary release."""
    name: str
    target_version: str
    current_version: str
    
    # Stage durations in minutes
    stage_durations: Dict[str, int] = field(default_factory=lambda: {
        "canary_5_percent": 15,
        "canary_25_percent": 30,
        "canary_50_percent": 60,
        "full_rollout": 0,  # Final stage
    })
    
    # Monitoring gates
    gates: List[MonitoringGate] = field(default_factory=lambda: [
        MonitoringGate("error_rate", "http_error_rate", 0.01, "lt"),
        MonitoringGate("latency_p99", "api_latency_p99_ms", 500, "lt"),
        MonitoringGate("pod_restarts", "pod_restart_count_5m", 3, "lt"),
        MonitoringGate("node_ready", "node_ready_ratio", 1.0, "eq"),
    ])
    
    # Auto-rollback settings
    auto_rollback: bool = True
    rollback_on_gate_failure: bool = True
    max_rollback_attempts: int = 3


class CanaryRelease:
    """Manages canary release workflow."""
    
    def __init__(self, config: CanaryConfig):
        self.config = config
        self.current_stage = CanaryStage.BASELINE
        self.stage_history: List[Dict[str, Any]] = []
        self.rollback_count = 0
        self.started_at: Optional[str] = None
    
    def start(self) -> Dict[str, Any]:
        """Start canary release."""
        self.started_at = datetime.now(timezone.utc).isoformat()
        self.current_stage = CanaryStage.CANARY_5
        self._log_stage_transition(CanaryStage.BASELINE, CanaryStage.CANARY_5)
        return self.status()
    
    def check_gates(self, metrics: Dict[str, float]) -> tuple[bool, List[str]]:
        """Check all monitoring gates. Returns (all_passed, failed_gates)."""
        failed = []
        for gate in self.config.gates:
            value = metrics.get(gate.metric, 0)
            if not gate.check(value):
                failed.append(f"{gate.name}: {value} vs threshold {gate.threshold}")
        return len(failed) == 0, failed
    
    def progress(self, metrics: Dict[str, float]) -> Dict[str, Any]:
        """Progress to next stage if gates pass."""
        passed, failed = self.check_gates(metrics)
        
        if not passed:
            if self.config.rollback_on_gate_failure:
                return self.rollback(f"Gate failures: {', '.join(failed)}")
            return {"action": "hold", "reason": failed, "stage": self.current_stage.value}
        
        # Progress to next stage
        next_stage = self._next_stage()
        if next_stage:
            self._log_stage_transition(self.current_stage, next_stage)
            self.current_stage = next_stage
        
        return self.status()
    
    def rollback(self, reason: str) -> Dict[str, Any]:
        """Trigger rollback."""
        self.rollback_count += 1
        self._log_stage_transition(self.current_stage, CanaryStage.ROLLBACK, reason)
        self.current_stage = CanaryStage.ROLLBACK
        
        return {
            "action": "rollback",
            "reason": reason,
            "rollback_count": self.rollback_count,
            "target_version": self.config.current_version,
        }
    
    def _next_stage(self) -> Optional[CanaryStage]:
        """Get next canary stage."""
        progression = [
            CanaryStage.CANARY_5,
            CanaryStage.CANARY_25,
            CanaryStage.CANARY_50,
            CanaryStage.FULL_ROLLOUT,
        ]
        try:
            idx = progression.index(self.current_stage)
            return progression[idx + 1] if idx + 1 < len(progression) else None
        except ValueError:
            return None
    
    def _log_stage_transition(self, from_stage: CanaryStage, to_stage: CanaryStage, reason: str = "") -> None:
        """Log stage transition."""
        self.stage_history.append({
            "from": from_stage.value,
            "to": to_stage.value,
            "at": datetime.now(timezone.utc).isoformat(),
            "reason": reason,
        })
    
    def status(self) -> Dict[str, Any]:
        """Get current canary status."""
        return {
            "name": self.config.name,
            "current_stage": self.current_stage.value,
            "target_version": self.config.target_version,
            "started_at": self.started_at,
            "rollback_count": self.rollback_count,
            "history": self.stage_history,
        }
    
    def save_state(self, path: Optional[Path] = None) -> None:
        """Persist canary state."""
        path = path or (GOALIE_DIR / "canary_release_state.json")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.status(), indent=2))

