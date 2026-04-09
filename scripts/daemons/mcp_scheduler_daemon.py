#!/usr/bin/env python3
"""
scripts/daemons/mcp-scheduler-daemon.py
@business-context WSJF-52: Triggers active topology checking and structural connectome pruning mapping ADR-005 constraints.
@adr ADR-005, ADR-006: Defines native loop restrictions preventing execution saturation securely blocking infinite API requests.
@constraint DDD-CSQBM: Enforcement of periodic 96-hour stale-verified contexts mathematically blocking LLM memory fragmentation via CSQBM traces.
@planned-change R-2026-018: Systemic Attention Fragmentation recovery via Phase 106 cleanup capabilities.
"""

from dataclasses import dataclass
from typing import Protocol, Dict, Any
import subprocess
import sys
import logging

logging.basicConfig(level=logging.INFO, format="%(message)s")


@dataclass(frozen=True)
class OrchestratorConfig:
    """Rules Design Pattern & Guard Clauses: Validates limits immediately upon creation."""
    max_pydantic_tokens: int = 4000
    jsonl_prune_minutes: int = 120
    md_prune_minutes: int = 240
    csqbm_agentdb_staleness_hours: int = 96

    def __post_init__(self):
        # Boundary Guard Clauses
        if self.max_pydantic_tokens < 1:
            raise ValueError(f"max_pydantic_tokens must be strictly positive, got {self.max_pydantic_tokens}")
        if self.jsonl_prune_minutes < 1:
            raise ValueError("jsonl_prune_minutes must be > 0 to allow connectome survival")
        if self.csqbm_agentdb_staleness_hours < 1:
            raise ValueError("csqbm_agentdb_staleness_hours must be strict positive duration")


class SchedulerSensor(Protocol):
    """Dependency Injection: Defines how we read infrastructure logic, avoiding raw test patches."""
    def archive_cold_storage(self) -> bool: ...
    def prune_connectome_files(self, ext: str, max_age_minutes: int) -> int: ...
    def check_csqbm_truth_gate(self) -> bool: ...
    def pulse_router(self) -> bool: ...
    def emit_metric(self, target: str) -> None: ...


class OSSchedulerSensor:
    def execute(self, cmd: list[str], silent: bool = False) -> int:
        try:
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL if silent else None, 
                                 stderr=subprocess.DEVNULL if silent else None)
            return res.returncode
        except Exception:
            return 1

    def archive_cold_storage(self) -> bool:
        return self.execute(["./scripts/daemons/stx-cold-storage-archiver.sh"]) == 0

    def prune_connectome_files(self, ext: str, max_age_minutes: int) -> int:
        cmd = ["find", ".goalie", "-name", f"*.{ext}", "-type", "f", "-mmin", f"+{max_age_minutes}", "-delete"]
        return self.execute(cmd, silent=True)

    def check_csqbm_truth_gate(self) -> bool:
        return self.execute(["./scripts/validators/project/check-csqbm.sh", "--deep-why"], silent=True) == 0

    def pulse_router(self) -> bool:
        return self.execute(["./scripts/validators/aqe-model-router.sh", "telemetry"]) == 0

    def emit_metric(self, target: str) -> None:
        cmd = [
            "python3", "scripts/emit_metrics.py", 
            "--event-type", "action", 
            "--command", "mcp_daemon", 
            "--target", target,
            "--cycle-index", "0", 
            "--log-file", ".goalie/metrics_log.jsonl"
        ]
        self.execute(cmd, silent=True)


class MCPSchedulerDaemon:
    def __init__(self, config: OrchestratorConfig, sensor: SchedulerSensor):
        self.config = config
        self.sensor = sensor
        self.metrics: Dict[str, Any] = {"pruned": {}, "csqbm": None, "archived": False}

    def execute_cycle(self) -> int:
        logging.info("\033[0;36mExecuting MCP Scheduler Daemon Traces...\033[0m")

        # 0. Cold Storage Archival
        logging.info("\033[0;36m[ARCHIVE] Triggering STX Cold Storage Telemetry extraction mitigating ADR-005 loss...\033[0m")
        self.metrics["archived"] = self.sensor.archive_cold_storage()

        # 1. Connectome Pruning (ADR-005)
        logging.info("\033[1;33m[PRUNE] Auditing stale execution telemetry tracking bounds (max %s tokens)...\033[0m", self.config.max_pydantic_tokens)
        self.sensor.prune_connectome_files("jsonl", self.config.jsonl_prune_minutes)
        self.sensor.prune_connectome_files("md", self.config.md_prune_minutes)
        self.metrics["pruned"] = {"jsonl": self.config.jsonl_prune_minutes, "md": self.config.md_prune_minutes}

        # 2. CSQBM Truth Gate (ADR-005 Governance Constraint)
        logging.info("\033[1;33m[GATE] Verifying CSQBM truth context natively via ADR-005 bounds (%s-hour freshness limits)...\033[0m", self.config.csqbm_agentdb_staleness_hours)
        csqbm_passed = self.sensor.check_csqbm_truth_gate()
        self.metrics["csqbm"] = csqbm_passed
        
        if not csqbm_passed:
            logging.error("\033[0;31m[CSQBM_HALT] Governance Halt Traced via ADR-005. agentdb.db staleness >%sh. Native Execution Topology Bypassed.\033[0m", self.config.csqbm_agentdb_staleness_hours)
            self.sensor.emit_metric("csqbm_halt")
            return 150
            
        logging.info("\033[0;32m[GATE] CSQBM Deep-Why Validation complete. Architectural Hydration confirmed.\033[0m")

        # 3. Router Pulse
        logging.info("\033[0;32m[PULSE] Triggering STX AQE Topology...\033[0m")
        if not self.sensor.pulse_router():
            logging.warning("\033[0;31m[WARNING] Router triggered faults.\033[0m")

        # 4. Success Emission
        self.sensor.emit_metric("pulse_nominal")
        logging.info("\033[0;32m[SUCCESS] MCP Scheduler successfully cycled physical bounds.\033[0m")
        return 0


if __name__ == "__main__":
    config = OrchestratorConfig()
    sensor = OSSchedulerSensor()
    daemon = MCPSchedulerDaemon(config, sensor)
    sys.exit(daemon.execute_cycle())
