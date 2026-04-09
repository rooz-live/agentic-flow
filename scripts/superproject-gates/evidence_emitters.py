#!/usr/bin/env python3
"""
Unified Evidence Emitters for AF CLI
Provides consistent evidence emission patterns for prod-cycle and prod-swarm
"""

import json
import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from enum import Enum


class EvidenceType(Enum):
    """Standardized evidence types"""
    CYCLE_START = "cycle_start"
    CYCLE_SUCCESS = "cycle_success"
    CYCLE_ERROR = "cycle_error"
    CYCLE_EXCEPTION = "cycle_exception"
    
    SWARM_START = "swarm_start"
    SWARM_SUCCESS = "swarm_success"
    SWARM_ERROR = "swarm_error"
    SWARM_EXCEPTION = "swarm_exception"
    
    MOCK_DATA_GENERATED = "mock_data_generated"
    
    SYSTEM_HEALTH = "system_health"
    PATTERN_METRICS = "pattern_metrics"
    GOVERNANCE_STATE = "governance_state"
    COMPLIANCE_CHECK = "compliance_check"


class EvidenceEmitter:
    """Unified evidence emitter with consistent data structures"""
    
    def __init__(self, goalie_dir: Path, command: str, mode: str):
        self.goalie_dir = goalie_dir
        self.command = command
        self.mode = mode
        self.run_id = self._get_run_id()
        
        # Ensure .goalie directory exists
        self.goalie_dir.mkdir(exist_ok=True)
        
        # Initialize evidence files
        self.unified_evidence_file = self.goalie_dir / "unified_evidence.jsonl"
        self.production_events_file = self.goalie_dir / "production_events.jsonl"
        self.metrics_log_file = self.goalie_dir / "metrics_log.jsonl"
    
    def _get_run_id(self) -> str:
        """Get or generate run ID"""
        import os
        return os.environ.get("AF_RUN_ID", f"run_{int(datetime.datetime.now().timestamp())}")
    
    def _create_evidence_record(self, evidence_type: EvidenceType, 
                             data: Dict[str, Any]) -> Dict[str, Any]:
        """Create standardized evidence record"""
        return {
            "timestamp": datetime.datetime.utcnow().isoformat(),
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
                           EvidenceType.CYCLE_ERROR, EvidenceType.CYCLE_EXCEPTION]:
            self._emit_production_event(record)
        elif evidence_type == EvidenceType.SYSTEM_HEALTH:
            self._emit_system_health(data)
        elif evidence_type == EvidenceType.PATTERN_METRICS:
            self._emit_pattern_metrics(data)
    
    def _emit_production_event(self, record: Dict[str, Any]):
        """Emit production-specific events"""
        with open(self.production_events_file, 'a') as f:
            f.write(json.dumps(record) + '\n')
    
    def _emit_system_health(self, data: Dict[str, Any]):
        """Emit system health metrics"""
        health_record = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "type": "system_health",
            "run_id": self.run_id,
            **data
        }
        
        with open(self.metrics_log_file, 'a') as f:
            f.write(json.dumps(health_record) + '\n')
    
    def _emit_pattern_metrics(self, data: Dict[str, Any]):
        """Emit pattern execution metrics"""
        metrics_record = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "type": "pattern_metrics",
            "run_id": self.run_id,
            **data
        }
        
        with open(self.metrics_log_file, 'a') as f:
            f.write(json.dumps(metrics_record) + '\n')
    
    def emit_cycle_start(self, mode: str, safeguards: bool = False, 
                       rollout_strategy: str = "gradual"):
        """Emit cycle start evidence"""
        self.emit(EvidenceType.CYCLE_START, {
            "mode": mode,
            "safeguards": safeguards,
            "rollout_strategy": rollout_strategy
        })
    
    def emit_cycle_success(self, duration: Optional[str] = None, 
                         mutation_count: int = 0):
        """Emit cycle success evidence"""
        self.emit(EvidenceType.CYCLE_SUCCESS, {
            "duration": duration or "unknown",
            "mutation_count": mutation_count
        })
    
    def emit_cycle_error(self, returncode: int, error: str):
        """Emit cycle error evidence"""
        self.emit(EvidenceType.CYCLE_ERROR, {
            "returncode": returncode,
            "error": error
        })
    
    def emit_cycle_exception(self, exception: str):
        """Emit cycle exception evidence"""
        self.emit(EvidenceType.CYCLE_EXCEPTION, {
            "exception": exception
        })
    
    def emit_swarm_start(self, prior: str, current: str, auto_ref: str):
        """Emit swarm start evidence"""
        self.emit(EvidenceType.SWARM_START, {
            "prior": prior,
            "current": current,
            "auto_ref": auto_ref
        })
    
    def emit_swarm_success(self, files_compared: int, output_format: str):
        """Emit swarm success evidence"""
        self.emit(EvidenceType.SWARM_SUCCESS, {
            "files_compared": files_compared,
            "output_format": output_format
        })
    
    def emit_swarm_error(self, returncode: int, error: str):
        """Emit swarm error evidence"""
        self.emit(EvidenceType.SWARM_ERROR, {
            "returncode": returncode,
            "error": error
        })
    
    def emit_swarm_exception(self, exception: str):
        """Emit swarm exception evidence"""
        self.emit(EvidenceType.SWARM_EXCEPTION, {
            "exception": exception
        })
    
    def emit_mock_data_generated(self, files: Dict[str, str]):
        """Emit mock data generation evidence"""
        self.emit(EvidenceType.MOCK_DATA_GENERATED, {
            "files": files
        })
    
    def emit_system_health(self, cpu_usage: float, memory_usage: float, 
                        disk_usage: float, network_latency: float):
        """Emit system health metrics"""
        self.emit(EvidenceType.SYSTEM_HEALTH, {
            "cpu_usage": cpu_usage,
            "memory_usage": memory_usage,
            "disk_usage": disk_usage,
            "network_latency": network_latency
        })
    
    def emit_pattern_metrics(self, depth: int, run_type: str, iteration: int, 
                          circle: str):
        """Emit pattern depth ladder metrics"""
        self.emit(EvidenceType.PATTERN_METRICS, {
            "type": "pattern_depth_ladder",
            "depth": depth,
            "run": run_type,
            "iteration": iteration,
            "circle": circle
        })
    
    def emit_governance_state(self, status: str, mutation_count: int = 0):
        """Emit governance state evidence"""
        self.emit(EvidenceType.GOVERNANCE_STATE, {
            "status": status,
            "mutation_count": mutation_count
        })
    
    def emit_compliance_check(self, check_type: str, result: bool, 
                           details: Optional[Dict[str, Any]] = None):
        """Emit compliance check evidence"""
        data = {
            "check_type": check_type,
            "result": result
        }
        if details:
            data["details"] = details
        
        self.emit(EvidenceType.COMPLIANCE_CHECK, data)


class DefaultEvidenceEmitters:
    """Factory for default evidence emitters"""
    
    @staticmethod
    def for_prod_cycle(goalie_dir: Path, mode: str = "normal") -> EvidenceEmitter:
        """Create evidence emitter for prod-cycle"""
        return EvidenceEmitter(goalie_dir, "prod-cycle", mode)
    
    @staticmethod
    def for_prod_swarm(goalie_dir: Path, mode: str = "normal") -> EvidenceEmitter:
        """Create evidence emitter for prod-swarm"""
        return EvidenceEmitter(goalie_dir, "prod-swarm", mode)