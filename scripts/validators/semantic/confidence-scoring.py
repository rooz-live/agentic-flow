#!/usr/bin/env python3
"""
confidence-scoring.py - Semantic Layer 5: Confidence Scoring

Calculates confidence scores (0.0-1.0) for validation checks based on:
- MCP factors (Method, Coverage, Pattern)
- MPP factors (Metrics, Protocol, Performance)
- WSJF/ROAM risk integration
"""

import argparse
import json
import sys
from typing import Dict, List, Optional


class ConfidenceScorer:
    """Calculate confidence scores for validation checks"""

    def __init__(self):
        # MCP weights (Method, Coverage, Pattern)
        self.mcp_weights = {
            "method": 0.4,  # Automated vs manual (higher = more automated)
            "coverage": 0.3,  # % of checks active
            "pattern": 0.3,  # Pattern detection working
        }

        # MPP weights (Metrics, Protocol, Performance)
        self.mpp_weights = {
            "metrics": 0.3,  # Score tracking active
            "protocol": 0.4,  # Validation protocol followed
            "performance": 0.3,  # Fast execution
        }

        # WSJF factors (Weighted Shortest Job First)
        self.wsjf_weights = {
            "user_value": 0.3,
            "time_criticality": 0.3,
            "risk_reduction": 0.2,
            "job_size": 0.2,  # Inverse (smaller = higher priority)
        }

        # ROAM risk categories
        self.roam_impact = {
            "resolved": 0.0,  # No impact on confidence
            "owned": 0.1,  # Minor impact
            "accepted": 0.2,  # Medium impact
            "mitigated": 0.05,  # Small impact (being managed)
        }

    def calculate_mcp_score(
        self, method: float, coverage: float, pattern: float
    ) -> float:
        """
        Calculate MCP (Method, Coverage, Pattern) score

        Args:
            method: Automation level (0.0-1.0)
            coverage: Coverage percentage (0.0-1.0)
            pattern: Pattern detection quality (0.0-1.0)

        Returns:
            Weighted MCP score (0.0-1.0)
        """
        return (
            self.mcp_weights["method"] * method
            + self.mcp_weights["coverage"] * coverage
            + self.mcp_weights["pattern"] * pattern
        )

    def calculate_mpp_score(
        self, metrics: float, protocol: float, performance: float
    ) -> float:
        """
        Calculate MPP (Metrics, Protocol, Performance) score

        Args:
            metrics: Metrics tracking quality (0.0-1.0)
            protocol: Protocol adherence (0.0-1.0)
            performance: Execution performance (0.0-1.0)

        Returns:
            Weighted MPP score (0.0-1.0)
        """
        return (
            self.mpp_weights["metrics"] * metrics
            + self.mpp_weights["protocol"] * protocol
            + self.mpp_weights["performance"] * performance
        )

    def calculate_wsjf_priority(
        self, user_value: int, time_criticality: int, risk_reduction: int, job_size: int
    ) -> float:
        """
        Calculate WSJF (Weighted Shortest Job First) priority

        Args:
            user_value: Business value (1-10)
            time_criticality: Urgency (1-10)
            risk_reduction: Risk mitigation value (1-10)
            job_size: Effort/size (1-10, inverse weight)

        Returns:
            WSJF priority score (higher = higher priority)
        """
        # Normalize to 0-1 scale
        norm_value = user_value / 10.0
        norm_time = time_criticality / 10.0
        norm_risk = risk_reduction / 10.0
        norm_size = (10 - job_size + 1) / 10.0  # Inverse (smaller = higher)

        return (
            self.wsjf_weights["user_value"] * norm_value
            + self.wsjf_weights["time_criticality"] * norm_time
            + self.wsjf_weights["risk_reduction"] * norm_risk
            + self.wsjf_weights["job_size"] * norm_size
        )

    def apply_roam_adjustment(self, base_confidence: float, roam_status: str) -> float:
        """
        Apply ROAM (Resolved, Owned, Accepted, Mitigated) risk adjustment

        Args:
            base_confidence: Base confidence score (0.0-1.0)
            roam_status: ROAM category (resolved/owned/accepted/mitigated)

        Returns:
            Adjusted confidence score (0.0-1.0)
        """
        impact = self.roam_impact.get(roam_status.lower(), 0.0)
        adjusted = base_confidence * (1.0 - impact)
        return max(0.0, min(1.0, adjusted))  # Clamp to [0,1]

    def calculate_validation_confidence(
        self,
        mcp: Dict[str, float],
        mpp: Dict[str, float],
        wsjf: Optional[Dict[str, int]] = None,
        roam: Optional[str] = None,
    ) -> Dict[str, float]:
        """
        Calculate comprehensive validation confidence score

        Args:
            mcp: MCP factors {"method": 0.8, "coverage": 0.75, "pattern": 0.9}
            mpp: MPP factors {"metrics": 0.85, "protocol": 0.7, "performance": 0.95}
            wsjf: Optional WSJF factors (for prioritization)
            roam: Optional ROAM risk status (for adjustment)

        Returns:
            Confidence scores and breakdown
        """
        mcp_score = self.calculate_mcp_score(**mcp)
        mpp_score = self.calculate_mpp_score(**mpp)

        # Combined base confidence (average of MCP and MPP)
        base_confidence = (mcp_score + mpp_score) / 2.0

        # Apply ROAM adjustment if provided
        if roam:
            final_confidence = self.apply_roam_adjustment(base_confidence, roam)
        else:
            final_confidence = base_confidence

        result = {
            "confidence": final_confidence,
            "mcp_score": mcp_score,
            "mpp_score": mpp_score,
            "base_confidence": base_confidence,
        }

        # Add WSJF priority if provided
        if wsjf:
            wsjf_priority = self.calculate_wsjf_priority(**wsjf)
            result["wsjf_priority"] = wsjf_priority

        # Add ROAM impact if provided
        if roam:
            result["roam_status"] = roam
            result["roam_impact"] = self.roam_impact.get(roam.lower(), 0.0)

        return result


def infer_mcp_mpp_from_file(file_path: str) -> tuple:
    """
    Infer MCP/MPP scores from email file content
    
    Args:
        file_path: Path to email file
    
    Returns:
        Tuple of (mcp_dict, mpp_dict, roam_status)
    """
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read().lower()
        
        # Infer MCP (Method, Coverage, Pattern) from content quality
        # Method: automated checks (case numbers, dates) vs manual
        method = 0.8 if any(x in content for x in ['26cv', 'march 3', 'march 10']) else 0.5
        
        # Coverage: presence of required elements
        has_subject = 'subject:' in content or 'from:' in content
        has_body = len(content) > 200
        has_signature = any(x in content for x in ['shahrooz', 'best regards', 'sincerely'])
        coverage = sum([has_subject, has_body, has_signature]) / 3.0
        
        # Pattern: legal/professional language quality
        legal_terms = ['case', 'court', 'trial', 'arbitration', 'attorney', 'judge']
        pattern_count = sum(1 for term in legal_terms if term in content)
        pattern = min(1.0, pattern_count / 4.0)  # Cap at 1.0
        
        # Infer MPP (Metrics, Protocol, Performance) from structure
        # Metrics: structured data present
        year_strings = ['20' + str(y) for y in range(20, 30)]  # ['2020', '2021', ..., '2029']
        metrics = 0.8 if any(x in content for x in ['$', '%', 'date:'] + year_strings) else 0.6
        
        # Protocol: professional email structure
        protocol = 0.9 if all([has_subject, has_body, has_signature]) else 0.6
        
        # Performance: reasonable length (not too short, not too long)
        word_count = len(content.split())
        if 100 <= word_count <= 1000:
            performance = 0.9
        elif 50 <= word_count < 100 or 1000 < word_count <= 2000:
            performance = 0.7
        else:
            performance = 0.5
        
        # Infer ROAM status from content urgency
        roam = None
        if any(x in content for x in ['urgent', 'immediate', 'asap', 'critical']):
            roam = 'owned'  # Active risk management
        elif any(x in content for x in ['blocked', 'issue', 'problem']):
            roam = 'mitigated'  # Being addressed
        
        mcp = {"method": method, "coverage": coverage, "pattern": pattern}
        mpp = {"metrics": metrics, "protocol": protocol, "performance": performance}
        
        return mcp, mpp, roam
    
    except Exception as e:
        # Default fallback scores
        print(f"Warning: Could not read file {file_path}: {e}", file=sys.stderr)
        mcp = {"method": 0.8, "coverage": 0.75, "pattern": 0.9}
        mpp = {"metrics": 0.85, "protocol": 0.7, "performance": 0.95}
        return mcp, mpp, None


def main():
    parser = argparse.ArgumentParser(description="Calculate validation confidence scores")
    
    # NEW: Orchestrator-compatible args (--file, --format)
    parser.add_argument("--file", type=str, help="Email file to analyze (auto-infers MCP/MPP if provided)")
    parser.add_argument("--format", type=str, choices=["json", "text"], default="json", help="Output format")
    
    # Original manual MCP/MPP args (optional, used if --file not provided)
    parser.add_argument("--mcp-method", type=float, default=0.8, help="MCP method factor (0.0-1.0)")
    parser.add_argument("--mcp-coverage", type=float, default=0.75, help="MCP coverage factor (0.0-1.0)")
    parser.add_argument("--mcp-pattern", type=float, default=0.9, help="MCP pattern factor (0.0-1.0)")
    parser.add_argument("--mpp-metrics", type=float, default=0.85, help="MPP metrics factor (0.0-1.0)")
    parser.add_argument("--mpp-protocol", type=float, default=0.7, help="MPP protocol factor (0.0-1.0)")
    parser.add_argument("--mpp-performance", type=float, default=0.95, help="MPP performance factor (0.0-1.0)")
    parser.add_argument(
        "--wsjf-user-value", type=int, help="WSJF user value (1-10, optional)"
    )
    parser.add_argument(
        "--wsjf-time-criticality", type=int, help="WSJF time criticality (1-10, optional)"
    )
    parser.add_argument(
        "--wsjf-risk-reduction", type=int, help="WSJF risk reduction (1-10, optional)"
    )
    parser.add_argument(
        "--wsjf-job-size", type=int, help="WSJF job size (1-10, optional)"
    )
    parser.add_argument(
        "--roam", type=str, choices=["resolved", "owned", "accepted", "mitigated"], help="ROAM risk status"
    )
    parser.add_argument("--json", action="store_true", help="Output JSON format (deprecated, use --format json)")

    args = parser.parse_args()

    scorer = ConfidenceScorer()

    # NEW: If --file provided, infer MCP/MPP from file content
    if args.file:
        mcp, mpp, inferred_roam = infer_mcp_mpp_from_file(args.file)
        # Use inferred ROAM if not explicitly provided
        roam = args.roam if args.roam else inferred_roam
    else:
        # Use manual args
        mcp = {
            "method": args.mcp_method,
            "coverage": args.mcp_coverage,
            "pattern": args.mcp_pattern,
        }

        mpp = {
            "metrics": args.mpp_metrics,
            "protocol": args.mpp_protocol,
            "performance": args.mpp_performance,
        }
        roam = args.roam

    wsjf = None
    if all(
        [
            args.wsjf_user_value,
            args.wsjf_time_criticality,
            args.wsjf_risk_reduction,
            args.wsjf_job_size,
        ]
    ):
        wsjf = {
            "user_value": args.wsjf_user_value,
            "time_criticality": args.wsjf_time_criticality,
            "risk_reduction": args.wsjf_risk_reduction,
            "job_size": args.wsjf_job_size,
        }

    result = scorer.calculate_validation_confidence(mcp, mpp, wsjf, roam)

    # Use --format if provided, else fall back to --json flag
    json_output = (args.format == "json") if hasattr(args, 'format') and args.format else args.json

    if json_output:
        print(json.dumps(result, indent=2))
    else:
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("CONFIDENCE SCORING RESULTS")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"Final Confidence: {result['confidence']:.2f} (0.0-1.0)")
        print(f"  MCP Score: {result['mcp_score']:.2f}")
        print(f"  MPP Score: {result['mpp_score']:.2f}")
        print(f"  Base Confidence: {result['base_confidence']:.2f}")

        if "wsjf_priority" in result:
            print(f"  WSJF Priority: {result['wsjf_priority']:.2f}")

        if "roam_status" in result:
            print(f"  ROAM Status: {result['roam_status']}")
            print(f"  ROAM Impact: {result['roam_impact']:.2f}")

        print()

        # Interpretation
        conf = result["confidence"]
        if conf >= 0.9:
            print("✓ HIGH confidence - email is very likely safe to send")
        elif conf >= 0.75:
            print("⚠ MEDIUM confidence - review warnings before sending")
        elif conf >= 0.6:
            print("⚠ LOW confidence - manual review recommended")
        else:
            print("✗ VERY LOW confidence - DO NOT SEND without fixes")


if __name__ == "__main__":
    main()
