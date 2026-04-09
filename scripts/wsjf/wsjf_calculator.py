#!/usr/bin/env python3
"""
WSJF Calculator Engine
Comprehensive WSJF (Weighted Shortest Job First) calculation system
"""

import json
import logging
import os
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional
from enum import Enum

class WSJFComponent(Enum):
    """WSJF calculation components"""
    USER_BUSINESS_VALUE = "ubv"
    TIME_CRITICALITY = "tc"
    RISK_REDUCTION = "rr"
    JOB_SIZE = "job_size"

@dataclass
class WSJFInputs:
    """Input parameters for WSJF calculation"""
    user_business_value: float = 0.0
    time_criticality: float = 0.0
    risk_reduction: float = 0.0
    job_size: float = 1.0
    job_id: Optional[str] = None
    circle: Optional[str] = None
    tags: Optional[List[str]] = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = []

@dataclass
class WSJFResult:
    """WSJF calculation result"""
    wsjf_score: float
    cost_of_delay: float
    normalized_score: float
    components: Dict[str, float]
    confidence: float
    timestamp: str
    job_id: Optional[str] = None
    circle: Optional[str] = None
    tags: Optional[List[str]] = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = []

class WSJFCalculator:
    """WSJF calculation engine"""

    def __init__(self, config_path: Optional[str] = None):
        self.logger = logging.getLogger(__name__)
        self.config = self._load_config(config_path)
        self._validate_config()

    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load WSJF configuration"""
        if config_path:
            config_file = Path(config_path)
        else:
            # Default config location
            project_root = os.environ.get("PROJECT_ROOT", ".")
            config_file = Path(project_root) / ".goalie" / "wsjf_config.json"

        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    return json.load(f)
            except json.JSONDecodeError as e:
                self.logger.warning(f"Invalid WSJF config, using defaults: {e}")
                return self._get_default_config()
        else:
            self.logger.info("WSJF config not found, using defaults")
            return self._get_default_config()

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default WSJF configuration"""
        return {
            "weights": {
                "ubv": 1.0,
                "tc": 1.0,
                "rr": 1.0
            },
            "normalization": {
                "ubv_max": 10.0,
                "tc_max": 10.0,
                "rr_max": 10.0,
                "job_size_min": 0.1,
                "job_size_max": 100.0
            },
            "scoring": {
                "min_score": 0.0,
                "max_score": 100.0,
                "confidence_threshold": 0.7
            },
            "validation": {
                "require_job_id": False,
                "require_circle": False
            }
        }

    def _validate_config(self):
        """Validate configuration structure"""
        required_keys = ["weights", "normalization", "scoring", "validation"]
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"Missing required config key: {key}")

        # Validate weights
        weights = self.config["weights"]
        for component in ["ubv", "tc", "rr"]:
            if component not in weights:
                raise ValueError(f"Missing weight for component: {component}")

    def calculate_ubv(self, inputs: WSJFInputs) -> float:
        """Calculate User Business Value component"""
        # UBV is typically provided directly or calculated from business metrics
        # Normalize to configured max
        ubv_max = self.config["normalization"]["ubv_max"]
        weight = self.config["weights"]["ubv"]

        normalized_ubv = min(inputs.user_business_value, ubv_max)
        return normalized_ubv * weight

    def calculate_tc(self, inputs: WSJFInputs) -> float:
        """Calculate Time Criticality component"""
        # TC can be based on deadlines, dependencies, market windows, etc.
        # For now, use provided value, but could be enhanced with temporal analysis
        tc_max = self.config["normalization"]["tc_max"]
        weight = self.config["weights"]["tc"]

        normalized_tc = min(inputs.time_criticality, tc_max)
        return normalized_tc * weight

    def calculate_rr(self, inputs: WSJFInputs) -> float:
        """Calculate Risk Reduction component"""
        # RR represents value from reducing future risks
        # Could include technical debt reduction, security improvements, etc.
        rr_max = self.config["normalization"]["rr_max"]
        weight = self.config["weights"]["rr"]

        normalized_rr = min(inputs.risk_reduction, rr_max)
        return normalized_rr * weight

    def normalize_job_size(self, job_size: float) -> float:
        """Normalize job size to prevent division by zero and extreme values"""
        job_size_min = self.config["normalization"]["job_size_min"]
        job_size_max = self.config["normalization"]["job_size_max"]

        # Clamp job size within bounds
        normalized_size = max(job_size_min, min(job_size, job_size_max))

        # Apply logarithmic scaling for very large jobs to prevent domination
        if normalized_size > 10.0:
            normalized_size = 10.0 + (normalized_size - 10.0) ** 0.5

        return normalized_size

    def calculate_confidence(self, inputs: WSJFInputs) -> float:
        """Calculate confidence in the WSJF score based on input completeness"""
        confidence = 1.0

        # Reduce confidence if key components are zero or very low
        if inputs.user_business_value < 1.0:
            confidence *= 0.8
        if inputs.time_criticality < 1.0:
            confidence *= 0.9  # TC is often subjective
        if inputs.risk_reduction < 1.0:
            confidence *= 0.9  # RR is often subjective
        if inputs.job_size < 0.5:
            confidence *= 0.7  # Very small jobs might be underestimated

        # Boost confidence if job_id and circle are provided
        if inputs.job_id:
            confidence *= 1.1
        if inputs.circle:
            confidence *= 1.05

        return min(confidence, 1.0)

    def calculate_wsjf(self, inputs: WSJFInputs) -> WSJFResult:
        """Calculate complete WSJF score"""
        try:
            # Validate inputs
            self._validate_inputs(inputs)

            # Calculate components
            ubv = self.calculate_ubv(inputs)
            tc = self.calculate_tc(inputs)
            rr = self.calculate_rr(inputs)
            normalized_job_size = self.normalize_job_size(inputs.job_size)

            # Calculate Cost of Delay (CoD)
            cost_of_delay = ubv + tc + rr

            # Calculate WSJF score
            if normalized_job_size == 0:
                wsjf_score = float('inf')  # Infinite priority for zero-size jobs
            else:
                wsjf_score = cost_of_delay / normalized_job_size

            # Normalize final score to configured range
            min_score = self.config["scoring"]["min_score"]
            max_score = self.config["scoring"]["max_score"]
            normalized_score = min(max_score, max(min_score, wsjf_score))

            # Calculate confidence
            confidence = self.calculate_confidence(inputs)

            # Create result
            result = WSJFResult(
                wsjf_score=wsjf_score,
                cost_of_delay=cost_of_delay,
                normalized_score=normalized_score,
                components={
                    "user_business_value": ubv,
                    "time_criticality": tc,
                    "risk_reduction": rr,
                    "job_size": normalized_job_size
                },
                confidence=confidence,
                timestamp=datetime.now(timezone.utc).isoformat(),
                job_id=inputs.job_id,
                circle=inputs.circle,
                tags=inputs.tags.copy()
            )

            self.logger.info(f"Calculated WSJF for job {inputs.job_id}: {wsjf_score:.2f}")
            return result

        except Exception as e:
            self.logger.error(f"Error calculating WSJF: {e}")
            raise

    def _validate_inputs(self, inputs: WSJFInputs):
        """Validate WSJF inputs"""
        if self.config["validation"]["require_job_id"] and not inputs.job_id:
            raise ValueError("job_id is required")

        if self.config["validation"]["require_circle"] and not inputs.circle:
            raise ValueError("circle is required")

        if inputs.job_size < 0:
            raise ValueError("job_size cannot be negative")

        for component in [inputs.user_business_value, inputs.time_criticality, inputs.risk_reduction]:
            if component < 0:
                raise ValueError("Component values cannot be negative")

    def batch_calculate(self, inputs_list: List[WSJFInputs]) -> List[WSJFResult]:
        """Calculate WSJF for multiple jobs"""
        results = []
        for inputs in inputs_list:
            try:
                result = self.calculate_wsjf(inputs)
                results.append(result)
            except Exception as e:
                self.logger.error(f"Failed to calculate WSJF for job {inputs.job_id}: {e}")
                # Create error result
                error_result = WSJFResult(
                    wsjf_score=0.0,
                    cost_of_delay=0.0,
                    normalized_score=0.0,
                    components={},
                    confidence=0.0,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    job_id=inputs.job_id,
                    circle=inputs.circle,
                    tags=["error"]
                )
                results.append(error_result)

        return results

    def get_config(self) -> Dict[str, Any]:
        """Get current configuration"""
        return self.config.copy()

    def update_config(self, updates: Dict[str, Any]):
        """Update configuration (in-memory only)"""
        def update_dict(target, source):
            for key, value in source.items():
                if isinstance(value, dict) and key in target:
                    update_dict(target[key], value)
                else:
                    target[key] = value

        update_dict(self.config, updates)
        self._validate_config()
        self.logger.info("WSJF configuration updated")

def main():
    """CLI interface for WSJF calculator"""
    import argparse

    parser = argparse.ArgumentParser(description="WSJF Calculator")
    parser.add_argument("--job-id", required=True, help="Job identifier")
    parser.add_argument("--ubv", type=float, default=0.0, help="User Business Value (0-10)")
    parser.add_argument("--tc", type=float, default=0.0, help="Time Criticality (0-10)")
    parser.add_argument("--rr", type=float, default=0.0, help="Risk Reduction (0-10)")
    parser.add_argument("--job-size", type=float, default=1.0, help="Job Size (story points)")
    parser.add_argument("--circle", help="Circle name")
    parser.add_argument("--tags", nargs="*", default=[], help="Tags")
    parser.add_argument("--config", help="WSJF config file path")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(level=logging.INFO)

    try:
        # Create calculator
        calculator = WSJFCalculator(args.config)

        # Create inputs
        inputs = WSJFInputs(
            user_business_value=args.ubv,
            time_criticality=args.tc,
            risk_reduction=args.rr,
            job_size=args.job_size,
            job_id=args.job_id,
            circle=args.circle,
            tags=args.tags
        )

        # Calculate WSJF
        result = calculator.calculate_wsjf(inputs)

        if args.json:
            print(json.dumps(asdict(result), indent=2))
        else:
            print(f"WSJF Calculation for Job: {result.job_id}")
            print(f"WSJF Score: {result.wsjf_score:.2f}")
            print(f"Cost of Delay: {result.cost_of_delay:.2f}")
            print(f"Normalized Score: {result.normalized_score:.2f}")
            print(f"Confidence: {result.confidence:.2f}")
            print("Components:")
            for comp, value in result.components.items():
                print(f"  {comp}: {value:.2f}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()