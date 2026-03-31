#!/usr/bin/env python3
"""
StarlingX / HostBill Integration
Checks integration status with StarlingX and HostBill APIs.
Enforces integration safety gates based on AF_INTEGRATIONS_WRITE_ALLOWED.
Includes quantitative risk assessment for additional validation.
"""

import os
import sys
import json
import subprocess
from datetime import datetime, timezone

def log_integration_event(event_type, details, tags=None):
    """Log integration events for audit trail"""
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "details": details,
        "tags": tags or []
    }
    
    # Write to integration evidence log
    log_dir = ".goalie/integration_evidence"
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, "integration_events.jsonl")
    
    with open(log_file, "a") as f:
        f.write(json.dumps(log_entry) + "\n")

def run_risk_assessment(target_system):
    """Run quantitative risk assessment for integration"""
    try:
        # Set environment for risk assessment
        env = os.environ.copy()
        env["TARGET_SYSTEM"] = target_system
        
        # Get absolute path to risk assessment script
        script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        risk_script = os.path.join(script_dir, "risk", "integration_risk_analytics.py")
        
        # Run risk assessment script
        result = subprocess.run(
            [sys.executable, risk_script],
            capture_output=True,
            text=True,
            env=env
        )
        
        if result.returncode in [0, 1]:  # 0 = allowed, 1 = blocked (both are successful assessments)
            # Parse risk assessment output (simplified)
            lines = result.stdout.strip().split('\n')
            risk_score = None
            risk_level = None
            recommendation = None
            
            for line in lines:
                if "Risk Score:" in line:
                    try:
                        risk_score = float(line.split("Risk Score:")[1].split("/")[0].strip())
                    except:
                        pass
                elif "Risk Level:" in line:
                    risk_level = line.split("Risk Level:")[1].strip()
                elif "Recommendation:" in line:
                    recommendation = line.split("Recommendation:")[1].strip()
            
            return {
                "success": True,
                "risk_score": risk_score,
                "risk_level": risk_level,
                "recommendation": recommendation,
                "blocked": result.returncode == 1,
                "output": result.stdout
            }
        else:
            return {
                "success": False,
                "error": result.stderr,
                "output": result.stdout,
                "returncode": result.returncode
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def check_integrations():
    starlingx_url = os.getenv("STARLINGX_API_URL")
    hostbill_url = os.getenv("HOSTBILL_API_URL")
    
    # Get integration mode and write permissions from environment
    integration_mode = os.getenv("AF_INTEGRATIONS_MODE", "read_only")
    write_allowed = os.getenv("AF_INTEGRATIONS_WRITE_ALLOWED", "0") == "1"
    af_env = os.getenv("AF_ENV", "local")
    
    status = True
    integration_details = {
        "integration_mode": integration_mode,
        "write_allowed": write_allowed,
        "af_env": af_env,
        "starlingx_configured": bool(starlingx_url),
        "hostbill_configured": bool(hostbill_url)
    }

    if not starlingx_url:
        print("⚠️ STARLINGX_API_URL not set.")
        status = False
    else:
        print(f"✅ StarlingX: Configured ({starlingx_url})")

    if not hostbill_url:
        print("⚠️ HOSTBILL_API_URL not set.")
        status = False
    else:
        print(f"✅ HostBill: Configured ({hostbill_url})")

    # Enforce integration gating
    if not write_allowed and integration_mode != "read_only":
        print(f"🚫 INTEGRATION GATE BLOCKED: Write operations not allowed in {af_env}")
        print(f"   Requested mode: {integration_mode}")
        print(f"   Effective mode: read_only")
        
        log_integration_event("integration_gate_blocked", {
            "requested_mode": integration_mode,
            "effective_mode": "read_only",
            "reason": "AF_INTEGRATIONS_WRITE_ALLOWED=0",
            **integration_details
        }, tags=["governance", "integration", "gate"])
        
        return False

    # Run risk assessments for configured systems
    risk_assessments = {}
    
    if starlingx_url:
        print("🔍 Running risk assessment for StarlingX...")
        starlingx_risk = run_risk_assessment("starlingx")
        risk_assessments["starlingx"] = starlingx_risk
        
        if starlingx_risk["success"]:
            print(f"   Risk Score: {starlingx_risk['risk_score']}/100 ({starlingx_risk['risk_level']})")
            print(f"   Recommendation: {starlingx_risk['recommendation']}")
        else:
            print(f"   ⚠️ Risk assessment failed: {starlingx_risk.get('error', 'Unknown error')}")
            if starlingx_risk.get('returncode'):
                print(f"   Exit code: {starlingx_risk['returncode']}")
            if starlingx_risk.get('output'):
                print(f"   Output: {starlingx_risk['output'][:200]}...")
    
    if hostbill_url:
        print("🔍 Running risk assessment for HostBill...")
        hostbill_risk = run_risk_assessment("hostbill")
        risk_assessments["hostbill"] = hostbill_risk
        
        if hostbill_risk["success"]:
            print(f"   Risk Score: {hostbill_risk['risk_score']}/100 ({hostbill_risk['risk_level']})")
            print(f"   Recommendation: {hostbill_risk['recommendation']}")
        else:
            print(f"   ⚠️ Risk assessment failed: {hostbill_risk.get('error', 'Unknown error')}")
            if hostbill_risk.get('returncode'):
                print(f"   Exit code: {hostbill_risk['returncode']}")
            if hostbill_risk.get('output'):
                print(f"   Output: {hostbill_risk['output'][:200]}...")

    # Check for high-risk assessments that might warrant additional review
    high_risk_systems = []
    for system, assessment in risk_assessments.items():
        if assessment["success"] and assessment.get("risk_level") in ["CRITICAL", "HIGH"]:
            high_risk_systems.append(system)
    
    if high_risk_systems:
        print(f"⚠️ HIGH-RISK SYSTEMS DETECTED: {', '.join(high_risk_systems)}")
        print(f"   Additional approval recommended for these systems")
        
        log_integration_event("high_risk_detected", {
            "high_risk_systems": high_risk_systems,
            "risk_assessments": risk_assessments,
            **integration_details
        }, tags=["risk", "integration", "alert"])

    # Log successful integration check with risk assessments
    log_integration_event("integration_check_completed", {
        "status": "success" if status else "partial",
        "risk_assessments": risk_assessments,
        "high_risk_systems": high_risk_systems,
        **integration_details
    }, tags=["integration", "health", "risk"])

    return status

if __name__ == "__main__":
    success = check_integrations()
    sys.exit(0 if success else 1)
