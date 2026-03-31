#!/usr/bin/env python3
"""Evidence emitter for unified CLI telemetry.

Provides standardized emission of evidence events across all CLI commands
with support for the unified schema defined in types.ts.
"""

import json
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path
import uuid

# Import the mapping from emitter_mapping.py
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from emitter_mapping import (
    DEFAULT_EMITTERS,
    OPTIONAL_EMITTERS,
    map_emitter_name,
    map_output_fields
)


@dataclass
class VariantInfo:
    """Variant information for A/B testing."""
    label: str
    iters: int
    reps: int
    baseline: bool = False


@dataclass
class EvidenceEvent:
    """Python representation of the EvidenceEvent schema."""
    timestamp: str
    emitter: str
    run_id: Optional[str] = None
    correlation_id: Optional[str] = None
    circle: Optional[str] = None
    depth: Optional[int] = None
    mode: Optional[str] = None
    fields: Dict[str, Any] = None
    variant: Optional[VariantInfo] = None
    tags: Optional[List[str]] = None
    
    def __post_init__(self):
        if self.fields is None:
            self.fields = {}
        if self.tags is None:
            self.tags = []

class EvidenceEmitter:
    """Unified evidence emitter for CLI commands."""
    
    def __init__(self, project_root: Optional[str] = None):
        self.project_root = project_root or os.environ.get("PROJECT_ROOT", os.getcwd())
        self.output_dir = Path(self.project_root) / ".goalie" / "evidence"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load configuration
        self.config = self._load_config()
        
        # Track emitted events for this session
        self.session_id = str(uuid.uuid4())
        self.emitted_count = 0
        
    def _load_config(self) -> Dict[str, Any]:
        """Load evidence configuration from .goalie/evidence_config.yaml."""
        config_path = Path(self.project_root) / ".goalie" / "evidence_config.yaml"

        if config_path.exists():
            import yaml
            with open(config_path, 'r') as f:
                return yaml.safe_load(f) or {}

        # Default configuration
        return {
            "default_emitters": list(DEFAULT_EMITTERS),
            "emitter_configs": {
                e: {"enabled": True}
                for e in DEFAULT_EMITTERS | OPTIONAL_EMITTERS
            },
            "graduation": {
                "green_streak_required": 3,
                "shadow_cycles_before_recommend": 3,
                "retro_approval_required": True,
                "max_sys_state_err": 0,
                "max_abort": 0,
                "max_autofix_adv_per_cycle": 15,
                "min_stability_score": 0.70,
                "min_ok_rate": 0.95,
            }
        }
    
    def emit(self, 
             emitter: str,
             fields: Dict[str, Any],
             **kwargs) -> None:
        """Emit an evidence event.
        
        Args:
            emitter: The emitter name (will be mapped to unified name)
            fields: Evidence fields specific to the emitter
            **kwargs: Additional event metadata (circle, depth, mode, etc.)
        """
        # Map legacy emitter name to unified name
        unified_emitter = map_emitter_name(emitter)
        
        # Check if emitter is enabled
        emitter_config = self.config.get("emitter_configs", {}).get(
            unified_emitter, {}
        )
        if not emitter_config.get("enabled", True):
            return
        
        # Create event
        event = EvidenceEvent(
            timestamp=datetime.now(timezone.utc).isoformat(),
            emitter=unified_emitter,
            run_id=kwargs.get("run_id") or os.environ.get("AF_RUN_ID"),
            correlation_id=kwargs.get("correlation_id") or os.environ.get("AF_CORRELATION_ID"),
            circle=kwargs.get("circle") or os.environ.get("AF_CIRCLE"),
            depth=kwargs.get("depth"),
            mode=kwargs.get("mode") or os.environ.get("AF_MODE"),
            fields=map_output_fields(unified_emitter, fields),
            variant=kwargs.get("variant"),
            tags=kwargs.get("tags", [])
        )
        
        # Apply sampling if configured
        sampling_rate = emitter_config.get("sampling_rate", 1.0)
        if sampling_rate < 1.0 and (
            hash(event.run_id or "") % 100
        ) / 100 > sampling_rate:
            return
        
        # Write to output
        self._write_event(event)
        self.emitted_count += 1
    
    def _write_event(self, event: EvidenceEvent) -> None:
        """Write event to output file."""
        output_file = self.output_dir / f"evidence_{self.session_id}.jsonl"
        
        with open(output_file, 'a') as f:
            f.write(json.dumps(asdict(event), default=str) + '\n')
    
    def emit_economic_compounding(
        self,
        wsjf_per_h: float,
        energy_cost_usd: float,
        value_per_hour: float,
        **kwargs
    ) -> None:
        """Convenience method for economic compounding emitter."""
        self.emit("revenue-safe", {
            "economic_compounding": {
                "wsjf_per_h": wsjf_per_h,
                "energy_cost_usd": energy_cost_usd,
                "value_per_hour": value_per_hour,
                "profit_dividend_usd": kwargs.get("profit_dividend_usd"),
                "revenue_per_hour": kwargs.get("revenue_per_hour"),
            }
        }, **kwargs)
    
    def emit_maturity_coverage(
        self,
        tier_backlog_cov_pct: float,
        tier_telemetry_cov_pct: float,
        tier_depth_cov_pct: float,
        **kwargs
    ) -> None:
        """Convenience method for maturity coverage emitter."""
        self.emit("tier-depth", {
            "maturity_coverage": {
                "tier_backlog_cov_pct": tier_backlog_cov_pct,
                "tier_telemetry_cov_pct": tier_telemetry_cov_pct,
                "tier_depth_cov_pct": tier_depth_cov_pct,
                "circle_coverage_pct": kwargs.get("circle_coverage_pct"),
                "depth_score": kwargs.get("depth_score"),
            }
        }, **kwargs)
    
    def emit_observability_gaps(
        self,
        gaps: List[Dict[str, Any]],
        gap_count: int,
        not_applicable: List[str],
        **kwargs
    ) -> None:
        """Convenience method for observability gaps emitter."""
        self.emit("gaps", {
            "observability_gaps": {
                "gaps": gaps,
                "gap_count": gap_count,
                "not_applicable": not_applicable,
            }
        }, **kwargs)
    
    def emit_pattern_hit_pct(
        self,
        hit_pct: float,
        patterns_hit: int,
        patterns_total: int,
        required_patterns: List[str],
        pattern_hits: Dict[str, int],
        **kwargs
    ) -> None:
        """Convenience method for pattern hit percentage emitter."""
        self.emit("intent-coverage", {
            "pattern_hit_pct": {
                "hit_pct": hit_pct,
                "patterns_hit": patterns_hit,
                "patterns_total": patterns_total,
                "required_patterns": required_patterns,
                "pattern_hits": pattern_hits,
            }
        }, **kwargs)
    
    def emit_winner_grade(
        self,
        grade: str,
        ok_rate: float,
        rev_per_h: float,
        duration_ok_pct: float,
        abort_count: int,
        contention_mult: float,
        checks_passed: int,
        checks_total: int,
        **kwargs
    ) -> None:
        """Convenience method for winner-grade emitter."""
        self.emit("winner-grade", {
            "prod_cycle_qualification": {
                "grade": grade,
                "ok_rate": ok_rate,
                "rev_per_h": rev_per_h,
                "duration_ok_pct": duration_ok_pct,
                "abort_count": abort_count,
                "contention_mult": contention_mult,
                "checks_passed": checks_passed,
                "checks_total": checks_total,
            }
        }, **kwargs)
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary of emitted evidence for this session."""
        return {
            "session_id": self.session_id,
            "emitted_count": self.emitted_count,
            "output_file": str(
                self.output_dir / f"evidence_{self.session_id}.jsonl"
            ),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# Global emitter instance
_global_emitter: Optional[EvidenceEmitter] = None


def get_emitter(project_root: Optional[str] = None) -> EvidenceEmitter:
    """Get or create the global evidence emitter."""
    global _global_emitter
    if _global_emitter is None:
        _global_emitter = EvidenceEmitter(project_root)
    return _global_emitter


def emit(emitter: str, fields: Dict[str, Any], **kwargs) -> None:
    """Convenience function to emit an event using the global emitter."""
    get_emitter().emit(emitter, fields, **kwargs)
