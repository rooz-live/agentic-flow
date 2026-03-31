#!/usr/bin/env python3
"""
Integration Risk Analytics
Integrates risk-analytics repository with agentic-flow integration gating.
Provides quantitative risk scoring for integration decisions.
"""

import os
import sys
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

# Add risk-analytics to path
sys.path.insert(0, '/Users/shahroozbhopti/Documents/code/risk-analytics')

try:
    from risk_analytics.risk_scoring import (
        compute_risk_score, RiskInputs, DEFAULT_WEIGHTS
    )
except ImportError as e:
    print(f"❌ Risk analytics module not available: {e}")
    print(
        "   Ensure risk-analytics repository is cloned and dependencies "
        "installed"
    )
    sys.exit(1)


def log_risk_event(
    event_type: str, details: Dict[str, Any], tags: Optional[List[str]] = None
):
    """Log risk assessment events for audit trail"""
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "details": details,
        "tags": tags or []
    }

    # Write to risk evidence log
    log_dir = ".goalie/risk_evidence"
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, "risk_events.jsonl")

    with open(log_file, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def assess_integration_risk(
    integration_mode: str,
    af_env: str,
    target_system: str,
    write_requested: bool = False,
    ci_green: bool = False,
    break_glass: bool = False
) -> Dict[str, Any]:
    """Assess risk for integration operation using quantitative scoring"""
    
    # Base risk inputs
    risk_inputs = RiskInputs()
    
    # Severity based on environment and write operations
    if af_env == "prod":
        risk_inputs.severity = 3.0 if write_requested else 2.0
    elif af_env == "stg":
        risk_inputs.severity = 2.0 if write_requested else 1.0
    else:  # local/dev
        risk_inputs.severity = 1.0 if write_requested else 0.5

    # Blast radius based on target system
    blast_radius_map = {
        "starlingx": 3.0,  # Infrastructure-wide impact
        "openstack": 3.0,  # Cloud infrastructure
        "hostbill": 2.0,   # Billing system
        "unknown": 1.0     # Unknown system
    }
    risk_inputs.blast = blast_radius_map.get(target_system.lower(), 1.0)

    # Urgency based on integration mode
    urgency_map = {
        "prod_write": 3.0,
        "stg_write": 2.0,
        "sandbox_write": 1.0,
        "read_only": 0.5
    }
    risk_inputs.urgency = urgency_map.get(integration_mode, 0.5)

    # Confidence based on CI status and break-glass
    if break_glass:
        risk_inputs.confidence = 0.3  # Low confidence in break-glass scenarios
    elif ci_green and af_env in ("stg", "prod"):
        risk_inputs.confidence = 0.9  # High confidence with green CI
    elif ci_green:
        risk_inputs.confidence = 0.8
    else:
        risk_inputs.confidence = 0.5

    # Stability debt based on environment and mode
    if af_env == "prod" and write_requested:
        risk_inputs.stability_debt = 0.3
    elif af_env == "stg" and write_requested:
        risk_inputs.stability_debt = 0.2
    else:
        risk_inputs.stability_debt = 0.1

    # Convert to metrics dict for scoring
    metrics = {
        "severity": risk_inputs.severity,
        "blast": risk_inputs.blast,
        "urgency": risk_inputs.urgency,
        "confidence": risk_inputs.confidence,
        "stability_debt": risk_inputs.stability_debt
    }
    
    # Compute risk score
    risk_score = compute_risk_score(metrics, DEFAULT_WEIGHTS)
    
    # Determine risk level and recommendation
    if risk_score >= 80:
        risk_level = "CRITICAL"
        recommendation = "BLOCK"
        allowed = False
    elif risk_score >= 60:
        risk_level = "HIGH"
        recommendation = "REQUIRE_APPROVAL"
        allowed = break_glass  # Only allow with break-glass
    elif risk_score >= 40:
        risk_level = "MEDIUM"
        recommendation = "PROCEED_WITH_CAUTION"
        allowed = ci_green or break_glass
    else:
        risk_level = "LOW"
        recommendation = "PROCEED"
        allowed = True

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "recommendation": recommendation,
        "allowed": allowed,
        "inputs": risk_inputs.__dict__,
        "metrics": metrics
    }


def main():
    """Main integration risk assessment"""
    
    # Get environment variables
    integration_mode = os.getenv("AF_INTEGRATIONS_MODE", "read_only")
    af_env = os.getenv("AF_ENV", "local")
    target_system = os.getenv("TARGET_SYSTEM", "unknown")
    write_allowed = os.getenv("AF_INTEGRATIONS_WRITE_ALLOWED", "0") == "1"
    ci_green = os.getenv("AF_CI_GREEN", "false").lower() == "true"
    break_glass = os.getenv("AF_BREAK_GLASS", "false").lower() == "true"
    
    # Assess risk
    risk_assessment = assess_integration_risk(
        integration_mode=integration_mode,
        af_env=af_env,
        target_system=target_system,
        write_requested=integration_mode != "read_only",
        ci_green=ci_green,
        break_glass=break_glass
    )
    
    # Log assessment
    log_risk_event("integration_risk_assessment", {
        "integration_mode": integration_mode,
        "af_env": af_env,
        "target_system": target_system,
        "write_allowed": write_allowed,
        "risk_assessment": risk_assessment
    }, tags=["risk", "integration", "governance"])
    
    # Print assessment
    print("🔍 Integration Risk Assessment")
    print(f"   Environment: {af_env}")
    print(f"   Mode: {integration_mode}")
    print(f"   Target: {target_system}")
    print(f"   Risk Score: {risk_assessment['risk_score']}/100")
    print(f"   Risk Level: {risk_assessment['risk_level']}")
    print(f"   Recommendation: {risk_assessment['recommendation']}")

    # Check if risk assessment aligns with existing write permissions
    if risk_assessment["allowed"] != write_allowed:
        print("⚠️  RISK MISMATCH:")
        if risk_assessment["allowed"] and not write_allowed:
            print(
                "   Risk assessment allows operation but write permissions "
                "denied"
            )
            print("   Consider updating AF_INTEGRATIONS_WRITE_ALLOWED=1")
        elif not risk_assessment["allowed"] and write_allowed:
            print(
                "   Risk assessment blocks operation but write permissions granted"
            )
            print("   Immediate review recommended")

    # Exit with appropriate code
    if not risk_assessment["allowed"]:
        print("🚫 INTEGRATION BLOCKED BY RISK ASSESSMENT")
        sys.exit(1)
    else:
        print("✅ INTEGRATION PERMITTED BY RISK ASSESSMENT")
        sys.exit(0)

if __name__ == "__main__":
    main()
