#!/usr/bin/env python3
"""
Unified Evidence Emitter Implementation
Provides consistent evidence emission for prod-cycle and prod-swarm commands
"""

import json
import datetime
import os
from pathlib import Path
from typing import Dict, Any, Optional
from enum import Enum


class EvidenceType(Enum):
    """Standardized evidence types"""
    CYCLE_START = "cycle_start"
    CYCLE_SUCCESS = "cycle_success"
    CYCLE_ERROR = "cycle_error"
    CYCLE_EXCEPTION = "cycle_exception"
    CYCLE_STEP = "cycle_step"
    
    SWARM_START = "swarm_start"
    SWARM_SUCCESS = "swarm_success"
    SWARM_ERROR = "swarm_error"
    SWARM_EXCEPTION = "swarm_exception"
    SWARM_COMPARISON = "swarm_comparison"
    
    MOCK_DATA_GENERATED = "mock_data_generated"
    
    SYSTEM_HEALTH = "system_health"
    PATTERN_METRICS = "pattern_metrics"
    GOVERNANCE_STATE = "governance_state"
    COMPLIANCE_CHECK = "compliance_check"
    
    PREFLIGHT_CHECK = "preflight_check"
    SNAPSHOT_CREATED = "snapshot_created"
    VALIDATION_RESULT = "validation_result"


class UnifiedEvidenceEmitter:
    """Unified evidence emitter with consistent data structures"""
    
    def __init__(self, goalie_dir: Path, command: str, mode: str = "normal"):
        self.goalie_dir = Path(goalie_dir)
        self.command = command
        self.mode = mode
        self.run_id = self._get_run_id()
        
        # Ensure .goalie directory exists
        self.goalie_dir.mkdir(exist_ok=True)
        
        # Initialize evidence files
        self.unified_evidence_file = self.goalie_dir / "unified_evidence.jsonl"
        self.production_events_file = self.goalie_dir / "production_events.jsonl"
        self.swarm_events_file = self.goalie_dir / "swarm_events.jsonl"
        self.metrics_log_file = self.goalie_dir / "metrics_log.jsonl"
        self.system_health_file = self.goalie_dir / "system_health.json"
        
    def _get_run_id(self) -> str:
        """Get or generate run ID"""
        return os.environ.get("AF_RUN_ID", f"run_{int(datetime.datetime.now().timestamp())}")
    
    def _create_evidence_record(self, evidence_type: EvidenceType, 
                             data: Dict[str, Any]) -> Dict[str, Any]:
        """Create standardized evidence record"""
        return {
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "command": self.command,
            "mode": self.mode,
            "event_type": evidence_type.value,
            "run_id": self.run_id,
            "data": data
        }
    
    def emit(self, evidence_type: EvidenceType, data: Dict[str, Any]):
        """Emit evidence to all relevant log files"""
        record = self._create_evidence_record(evidence_type, data)
        
        # Write to unified evidence log
        with open(self.unified_evidence_file, 'a') as f:
            f.write(json.dumps(record) + '\n')
        
        # Write to specific log files based on evidence type
        if evidence_type in [EvidenceType.CYCLE_START, EvidenceType.CYCLE_SUCCESS, 
                           EvidenceType.CYCLE_ERROR, EvidenceType.CYCLE_EXCEPTION,
                           EvidenceType.CYCLE_STEP, EvidenceType.PREFLIGHT_CHECK,
                           EvidenceType.SNAPSHOT_CREATED, EvidenceType.VALIDATION_RESULT]:
            self._emit_production_event(record)
        elif evidence_type in [EvidenceType.SWARM_START, EvidenceType.SWARM_SUCCESS,
                              EvidenceType.SWARM_ERROR, EvidenceType.SWARM_EXCEPTION,
                              EvidenceType.SWARM_COMPARISON, EvidenceType.MOCK_DATA_GENERATED]:
            self._emit_swarm_event(record)
        elif evidence_type == EvidenceType.SYSTEM_HEALTH:
            self._emit_system_health(data)
        elif evidence_type == EvidenceType.PATTERN_METRICS:
            self._emit_pattern_metrics(data)
        elif evidence_type == EvidenceType.GOVERNANCE_STATE:
            self._emit_governance_state(data)
        elif evidence_type == EvidenceType.COMPLIANCE_CHECK:
            self._emit_compliance_check(data)
    
    def _emit_production_event(self, record: Dict[str, Any]):
        """Emit production-specific events"""
        with open(self.production_events_file, 'a') as f:
            f.write(json.dumps(record) + '\n')
    
    def _emit_swarm_event(self, record: Dict[str, Any]):
        """Emit swarm-specific events"""
        with open(self.swarm_events_file, 'a') as f:
            f.write(json.dumps(record) + '\n')
    
    def _emit_system_health(self, data: Dict[str, Any]):
        """Emit system health metrics"""
        health_record = {
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "type": "system_health",
            "run_id": self.run_id,
            "command": self.command,
            **data
        }
        
        with open(self.metrics_log_file, 'a') as f:
            f.write(json.dumps(health_record) + '\n')
        
        # Also update system health snapshot
        with open(self.system_health_file, 'w') as f:
            json.dump(health_record, f, indent=2)
    
    def _emit_pattern_metrics(self, data: Dict[str, Any]):
        """Emit pattern execution metrics"""
        metrics_record = {
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "type": "pattern_metrics",
            "run_id": self.run_id,
            "command": self.command,
            **data
        }
        
        with open(self.metrics_log_file, 'a') as f:
            f.write(json.dumps(metrics_record) + '\n')
    
    def _emit_governance_state(self, data: Dict[str, Any]):
        """Emit governance state evidence"""
        governance_record = {
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "type": "governance_state",
            "run_id": self.run_id,
            "command": self.command,
            **data
        }
        
        with open(self.metrics_log_file, 'a') as f:
            f.write(json.dumps(governance_record) + '\n')
    
    def _emit_compliance_check(self, data: Dict[str, Any]):
        """Emit compliance check evidence"""
        compliance_record = {
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "type": "compliance_check",
            "run_id": self.run_id,
            "command": self.command,
            **data
        }
        
        with open(self.metrics_log_file, 'a') as f:
            f.write(json.dumps(compliance_record) + '\n')
    
    # Production cycle specific methods
    def emit_cycle_start(self, mode: str = None, safeguards: bool = False, 
                       rollout_strategy: str = "gradual", **kwargs):
        """Emit cycle start evidence"""
        data = {
            "mode": mode or self.mode,
            "safeguards": safeguards,
            "rollout_strategy": rollout_strategy
        }
        data.update(kwargs)
        self.emit(EvidenceType.CYCLE_START, data)
    
    def emit_cycle_success(self, duration: Optional[float] = None, 
                         mutation_count: int = 0, **kwargs):
        """Emit cycle success evidence"""
        data = {
            "duration_seconds": duration,
            "mutation_count": mutation_count
        }
        data.update(kwargs)
        self.emit(EvidenceType.CYCLE_SUCCESS, data)
    
    def emit_cycle_error(self, returncode: int, error: str, **kwargs):
        """Emit cycle error evidence"""
        data = {
            "returncode": returncode,
            "error": error
        }
        data.update(kwargs)
        self.emit(EvidenceType.CYCLE_ERROR, data)
    
    def emit_cycle_exception(self, exception: str, **kwargs):
        """Emit cycle exception evidence"""
        data = {
            "exception": exception
        }
        data.update(kwargs)
        self.emit(EvidenceType.CYCLE_EXCEPTION, data)
    
    def emit_cycle_step(self, step_name: str, status: str, **kwargs):
        """Emit cycle step evidence"""
        data = {
            "step_name": step_name,
            "status": status
        }
        data.update(kwargs)
        self.emit(EvidenceType.CYCLE_STEP, data)
    
    def emit_preflight_check(self, check_type: str, result: bool, 
                          details: Dict[str, Any] = None, **kwargs):
        """Emit preflight check evidence"""
        data = {
            "check_type": check_type,
            "result": result,
            "details": details or {}
        }
        data.update(kwargs)
        self.emit(EvidenceType.PREFLIGHT_CHECK, data)
    
    def emit_snapshot_created(self, snapshot_name: str, **kwargs):
        """Emit snapshot creation evidence"""
        data = {
            "snapshot_name": snapshot_name
        }
        data.update(kwargs)
        self.emit(EvidenceType.SNAPSHOT_CREATED, data)
    
    def emit_validation_result(self, validation_type: str, result: bool, 
                            details: Dict[str, Any] = None, **kwargs):
        """Emit validation result evidence"""
        data = {
            "validation_type": validation_type,
            "result": result,
            "details": details or {}
        }
        data.update(kwargs)
        self.emit(EvidenceType.VALIDATION_RESULT, data)
    
    # Swarm specific methods
    def emit_swarm_start(self, prior: str = None, current: str = None, 
                        auto_ref: str = None, **kwargs):
        """Emit swarm start evidence"""
        data = {
            "prior": prior,
            "current": current,
            "auto_ref": auto_ref
        }
        data.update(kwargs)
        self.emit(EvidenceType.SWARM_START, data)
    
    def emit_swarm_success(self, files_compared: int = 0, output_format: str = "json", 
                          **kwargs):
        """Emit swarm success evidence"""
        data = {
            "files_compared": files_compared,
            "output_format": output_format
        }
        data.update(kwargs)
        self.emit(EvidenceType.SWARM_SUCCESS, data)
    
    def emit_swarm_error(self, returncode: int, error: str, **kwargs):
        """Emit swarm error evidence"""
        data = {
            "returncode": returncode,
            "error": error
        }
        data.update(kwargs)
        self.emit(EvidenceType.SWARM_ERROR, data)
    
    def emit_swarm_exception(self, exception: str, **kwargs):
        """Emit swarm exception evidence"""
        data = {
            "exception": exception
        }
        data.update(kwargs)
        self.emit(EvidenceType.SWARM_EXCEPTION, data)
    
    def emit_swarm_comparison(self, comparison_data: Dict[str, Any], **kwargs):
        """Emit swarm comparison evidence"""
        data = {
            "comparison_data": comparison_data
        }
        data.update(kwargs)
        self.emit(EvidenceType.SWARM_COMPARISON, data)
    
    def emit_mock_data_generated(self, files: Dict[str, str], **kwargs):
        """Emit mock data generation evidence"""
        data = {
            "files": files
        }
        data.update(kwargs)
        self.emit(EvidenceType.MOCK_DATA_GENERATED, data)
    
    # System and metrics methods
    def emit_system_health(self, cpu_usage: float = None, memory_usage: float = None, 
                        disk_usage: float = None, network_latency: float = None, **kwargs):
        """Emit system health metrics"""
        data = {
            "cpu_usage": cpu_usage,
            "memory_usage": memory_usage,
            "disk_usage": disk_usage,
            "network_latency": network_latency
        }
        data.update(kwargs)
        self.emit(EvidenceType.SYSTEM_HEALTH, data)
    
    def emit_pattern_metrics(self, depth: int = None, run_type: str = None, 
                          iteration: int = None, circle: str = None, **kwargs):
        """Emit pattern depth ladder metrics"""
        data = {
            "type": "pattern_depth_ladder",
            "depth": depth,
            "run_type": run_type,
            "iteration": iteration,
            "circle": circle
        }
        data.update(kwargs)
        self.emit(EvidenceType.PATTERN_METRICS, data)
    
    def emit_governance_state(self, status: str = None, mutation_count: int = 0, **kwargs):
        """Emit governance state evidence"""
        data = {
            "status": status,
            "mutation_count": mutation_count
        }
        data.update(kwargs)
        self.emit(EvidenceType.GOVERNANCE_STATE, data)
    
    def emit_compliance_check(self, check_type: str = None, result: bool = None, 
                           details: Dict[str, Any] = None, **kwargs):
        """Emit compliance check evidence"""
        data = {
            "check_type": check_type,
            "result": result,
            "details": details or {}
        }
        data.update(kwargs)
        self.emit(EvidenceType.COMPLIANCE_CHECK, data)


class EvidenceEmitterFactory:
    """Factory for creating evidence emitters"""
    
    @staticmethod
    def for_prod_cycle(goalie_dir: Path, mode: str = "normal") -> UnifiedEvidenceEmitter:
        """Create evidence emitter for prod-cycle"""
        return UnifiedEvidenceEmitter(goalie_dir, "prod-cycle", mode)
    
    @staticmethod
    def for_prod_swarm(goalie_dir: Path, mode: str = "normal") -> UnifiedEvidenceEmitter:
        """Create evidence emitter for prod-swarm"""
        return UnifiedEvidenceEmitter(goalie_dir, "prod-swarm", mode)
    
    @staticmethod
    def for_command(goalie_dir: Path, command: str, mode: str = "normal") -> UnifiedEvidenceEmitter:
        """Create evidence emitter for any command"""
        return UnifiedEvidenceEmitter(goalie_dir, command, mode)


def validate_evidence_event(event: Dict[str, Any]) -> bool:
    """Validate evidence event against unified schema"""
    required_fields = ["timestamp", "command", "mode", "event_type", "run_id", "data"]
    
    for field in required_fields:
        if field not in event:
            return False
    
    # Validate command
    if event["command"] not in ["prod-cycle", "prod-swarm"]:
        return False
    
    # Validate timestamp format
    try:
        timestamp_str = event["timestamp"].replace('Z', '+00:00')
        datetime.datetime.fromisoformat(timestamp_str)
    except ValueError:
        return False
    
    # Validate mode
    valid_modes = ["mutate", "normal", "advisory", "enforcement"]
    if event["mode"] not in valid_modes:
        return False
    
    return True


if __name__ == "__main__":
    # Test the evidence emitter
    import tempfile
    
    with tempfile.TemporaryDirectory() as temp_dir:
        emitter = EvidenceEmitterFactory.for_prod_cycle(Path(temp_dir), "mutate")
        
        # Test various emission methods
        emitter.emit_cycle_start(safeguards=True, rollout_strategy="gradual")
        emitter.emit_cycle_step("preflight_checks", "completed")
        emitter.emit_system_health(cpu_usage=45.2, memory_usage=67.8)
        emitter.emit_cycle_success(duration=120.5, mutation_count=3)
        
        print("Test evidence emitted successfully")
        print(f"Check {temp_dir}/.goalie/unified_evidence.jsonl for results")