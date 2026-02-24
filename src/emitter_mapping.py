#!/usr/bin/env python3
"""Unified emitter mapping for af CLI commands.

Maps legacy emitter names to unified conventions and provides
configuration for default/optional emitters.

Definition of Ready (DoR):
- Legacy emitter names documented in EMITTER_MAPPING dictionary
- Default and optional emitter sets defined
- Field mappings for JSON output configured per emitter

Definition of Done (DoD):
- map_emitter_name resolves all legacy names to unified names
- Unmapped names pass through unchanged
- AF_DEFAULT_EMITTERS env var overrides default set when present
- map_output_fields preserves unmapped fields in output
- load_emitter_config reads from .goalie/evidence_config.yaml
"""

from typing import Dict, List, Optional, Set
import os
import yaml

# Legacy → Unified name mapping
EMITTER_MAPPING: Dict[str, str] = {
    # Economic metrics
    "revenue-safe": "economic_compounding",
    "economic": "economic_metrics",
    "wsjf": "economic_metrics",
    
    # Coverage metrics
    "tier-depth": "maturity_coverage",
    "depth-ladder": "phase_progression",
    
    # Gap analysis
    "gaps": "observability_gaps",
    "detect-gaps": "observability_gaps",
    
    # Intent analysis
    "intent-coverage": "pattern_hit_pct",
    "pattern-coverage": "pattern_hit_pct",
    
    # Qualification
    "winner-grade": "prod_cycle_qualification",
    "qualification": "prod_cycle_qualification",
    
    # Security
    "security-audit": "security_audit_gaps",
    "sec-audit": "security_audit_gaps",
    
    # Circle perspectives
    "circle-perspectives": "decision_lens_telemetry",
    "perspectives": "decision_lens_telemetry",
}

# Default emitter set for --default-emitters flag
DEFAULT_EMITTERS: Set[str] = {
    "economic_compounding",
    "maturity_coverage", 
    "observability_gaps",
    "pattern_hit_pct",
    "prod_cycle_qualification",
}

# Optional emitters (user-enabled)
OPTIONAL_EMITTERS: Set[str] = {
    "economic_metrics",
    "phase_progression",
    "security_audit_gaps",
    "decision_lens_telemetry",
    "contention_analysis",
    "variant_analysis",
}

# JSON field mappings for output
FIELD_MAPPINGS: Dict[str, Dict[str, str]] = {
    "economic_compounding": {
        "revenue_per_hour": "rev_per_h",
        "energy_cost_usd": "energy_cost_usd",
        "profit_dividend_usd": "profit_dividend",
        "wsjf_per_h": "wsjf_per_h",
        "value_per_energy": "value_per_energy",
    },
    "maturity_coverage": {
        "tier_backlog_cov_pct": "tier_backlog_cov_pct",
        "tier_telemetry_cov_pct": "tier_telemetry_cov_pct",
        "tier_depth_cov_pct": "tier_depth_cov_pct",
    },
    "observability_gaps": {
        "gaps": "observability_gaps",
        "gap_count": "gap_count",
    },
    "pattern_hit_pct": {
        "hit_pct": "intent_cov_pct",
        "patterns_hit": "patterns_hit",
        "patterns_total": "patterns_total",
    },
    "prod_cycle_qualification": {
        "winner_grade": "winner_grade",
        "ok_rate": "ok_rate",
        "stability_score": "stability_score",
    },
}

def map_emitter_name(legacy_name: str) -> str:
    """Map legacy emitter name to unified name."""
    return EMITTER_MAPPING.get(legacy_name, legacy_name)

def get_default_emitters() -> List[str]:
    """Get list of default emitters."""
    # Check for environment overrides
    env_default = os.environ.get("AF_DEFAULT_EMITTERS")
    if env_default:
        return [e.strip() for e in env_default.split(",")]
    return list(DEFAULT_EMITTERS)

def get_all_emitters() -> List[str]:
    """Get all available emitters."""
    return list(DEFAULT_EMITTERS | OPTIONAL_EMITTERS)

def is_default_emitter(emitter: str) -> bool:
    """Check if emitter is in default set."""
    return emitter in DEFAULT_EMITTERS

def map_output_fields(emitter: str, data: Dict) -> Dict:
    """Map output fields according to emitter configuration."""
    if emitter not in FIELD_MAPPINGS:
        return data
    
    mapped = {}
    mapping = FIELD_MAPPINGS[emitter]
    
    for old_key, new_key in mapping.items():
        if old_key in data:
            mapped[new_key] = data[old_key]
    
    # Include unmapped fields
    for key, value in data.items():
        if key not in mapping:
            mapped[key] = value
    
    return mapped

def load_emitter_config() -> Dict:
    """Load emitter configuration from .goalie/evidence_config.yaml."""
    config_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        ".goalie",
        "evidence_config.yaml"
    )
    
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            return yaml.safe_load(f) or {}
    
    return {}
