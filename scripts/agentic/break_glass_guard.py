#!/usr/bin/env python3
"""
Break Glass Protocol Guard

Implements multi-layer protection for disruptive remote operations:
- Layer 1: Environment variable requirements (AF_BREAK_GLASS, AF_BREAK_GLASS_REASON, AF_CHANGE_TICKET)
- Layer 2: Optional interactive TTY confirmation
- Audit logging to .goalie/break_glass_audit.jsonl

Prevents "checkbox fatigue" ROAM drift by requiring explicit justification for high-risk operations.
"""

import os
import sys
import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple, List
from dataclasses import dataclass, asdict
from enum import Enum

GOALIE_DIR = Path(__file__).parent.parent.parent / ".goalie"
AUDIT_LOG = GOALIE_DIR / "break_glass_audit.jsonl"


class RiskLevel(Enum):
    LOW = "low"           # Read-only operations
    MEDIUM = "medium"     # Reversible changes
    HIGH = "high"         # Service restarts, config changes
    CRITICAL = "critical" # Package installs, runtime changes, kubelet modifications


@dataclass
class BreakGlassContext:
    """Context for a break glass operation"""
    operation: str
    risk_level: RiskLevel
    command: str
    reason: str
    change_ticket: str
    operator: str
    target_host: str
    environment: str
    timestamp: str
    git_sha: str
    approved: bool
    blocked_reason: Optional[str] = None


# High-risk operation patterns that require break glass
HIGH_RISK_PATTERNS: Dict[str, RiskLevel] = {
    # Package management
    "dnf install": RiskLevel.HIGH,
    "dnf remove": RiskLevel.CRITICAL,
    "apt install": RiskLevel.HIGH,
    "apt remove": RiskLevel.CRITICAL,
    "yum install": RiskLevel.HIGH,
    "pip install": RiskLevel.MEDIUM,
    # Service management
    "systemctl restart": RiskLevel.HIGH,
    "systemctl stop": RiskLevel.CRITICAL,
    "systemctl disable": RiskLevel.CRITICAL,
    "service restart": RiskLevel.HIGH,
    # Container/K8s operations
    "docker stop": RiskLevel.HIGH,
    "docker rm": RiskLevel.HIGH,
    "containerd": RiskLevel.HIGH,
    "kubeadm reset": RiskLevel.CRITICAL,
    "kubeadm init": RiskLevel.HIGH,
    "kubectl delete": RiskLevel.HIGH,
    "kubectl apply": RiskLevel.MEDIUM,
    # Runtime changes
    "swapoff": RiskLevel.HIGH,
    "swapon": RiskLevel.HIGH,
    "modprobe": RiskLevel.HIGH,
    # Configuration
    "/etc/kubernetes": RiskLevel.HIGH,
    "/etc/containerd": RiskLevel.HIGH,
    "/etc/docker": RiskLevel.HIGH,
    "kubeconfig": RiskLevel.HIGH,
    "kubelet": RiskLevel.HIGH,
}


def get_git_sha() -> str:
    """Get current git SHA (last 6 chars)"""
    try:
        import subprocess
        result = subprocess.run(
            ["git", "rev-parse", "--short=6", "HEAD"],
            capture_output=True, text=True, timeout=5
        )
        return result.stdout.strip() if result.returncode == 0 else "unknown"
    except Exception:
        return "unknown"


def detect_risk_level(command: str) -> RiskLevel:
    """Detect risk level based on command patterns"""
    command_lower = command.lower()
    for pattern, level in HIGH_RISK_PATTERNS.items():
        if pattern.lower() in command_lower:
            return level
    return RiskLevel.LOW


def check_break_glass_env() -> Tuple[bool, str, Dict]:
    """
    Check if break glass environment variables are properly set.
    Returns: (allowed, reason, context)
    """
    break_glass = os.environ.get("AF_BREAK_GLASS", "").strip()
    reason = os.environ.get("AF_BREAK_GLASS_REASON", "").strip()
    change_ticket = os.environ.get("AF_CHANGE_TICKET", 
                                    os.environ.get("AF_CAB_APPROVAL_ID", "")).strip()
    
    context = {
        "break_glass_set": break_glass == "1",
        "reason_provided": bool(reason),
        "change_ticket_provided": bool(change_ticket),
        "reason": reason,
        "change_ticket": change_ticket,
    }
    
    if break_glass != "1":
        return False, "AF_BREAK_GLASS=1 not set", context
    
    if not reason:
        return False, "AF_BREAK_GLASS_REASON not set (free text required)", context
    
    if not change_ticket:
        return False, "AF_CHANGE_TICKET or AF_CAB_APPROVAL_ID not set", context
    
    return True, "Break glass requirements satisfied", context


def is_tty() -> bool:
    """Check if stdin is a TTY for interactive confirmation"""
    return sys.stdin.isatty()


def interactive_confirmation(operation: str, risk_level: RiskLevel, git_sha: str) -> Tuple[bool, str]:
    """
    Layer 2: Optional interactive TTY confirmation.
    Only prompts if stdin is a TTY to avoid CI deadlocks.
    """
    if not is_tty():
        return True, "Non-TTY mode, skipping interactive confirmation"

    print(f"\n{'='*60}")
    print(f"⚠️  BREAK GLASS CONFIRMATION REQUIRED")
    print(f"{'='*60}")
    print(f"Operation: {operation}")
    print(f"Risk Level: {risk_level.value.upper()}")
    print(f"Git SHA: {git_sha}")
    print(f"{'='*60}")

    if risk_level == RiskLevel.CRITICAL:
        print(f"\nType the last 6 chars of git SHA to confirm: ", end="")
        response = input().strip()
        if response != git_sha:
            return False, f"SHA mismatch: expected {git_sha}, got {response}"
    else:
        print(f"\nType 'PROD' to continue: ", end="")
        response = input().strip()
        if response != "PROD":
            return False, f"Expected 'PROD', got '{response}'"

    return True, "Interactive confirmation received"


def emit_audit_log(context: BreakGlassContext) -> None:
    """Append to break glass audit log"""
    GOALIE_DIR.mkdir(parents=True, exist_ok=True)
    with open(AUDIT_LOG, "a") as f:
        f.write(json.dumps(asdict(context)) + "\n")


def guard_operation(
    operation: str,
    command: str,
    target_host: str = "localhost",
    require_interactive: bool = True
) -> Tuple[bool, str, BreakGlassContext]:
    """
    Main entry point for break glass protection.

    Args:
        operation: Human-readable operation description
        command: The actual command to be executed
        target_host: Target host for the operation
        require_interactive: Whether to require TTY confirmation (default True)

    Returns:
        (allowed, reason, context)
    """
    risk_level = detect_risk_level(command)
    git_sha = get_git_sha()
    environment = os.environ.get("AF_ENV", "local")
    operator = os.environ.get("USER", os.environ.get("USERNAME", "unknown"))

    # Create context
    context = BreakGlassContext(
        operation=operation,
        risk_level=risk_level,
        command=command,
        reason="",
        change_ticket="",
        operator=operator,
        target_host=target_host,
        environment=environment,
        timestamp=datetime.now().isoformat() + "Z",
        git_sha=git_sha,
        approved=False,
    )

    # Low risk operations pass through
    if risk_level == RiskLevel.LOW:
        context.approved = True
        context.reason = "Low risk operation, no break glass required"
        emit_audit_log(context)
        return True, "Low risk operation", context

    # Layer 1: Environment variable check
    env_allowed, env_reason, env_context = check_break_glass_env()
    if not env_allowed:
        context.blocked_reason = env_reason
        context.reason = env_context.get("reason", "")
        context.change_ticket = env_context.get("change_ticket", "")
        emit_audit_log(context)

        # Provide helpful error message
        print(f"\n{'='*60}")
        print(f"🚫 BREAK GLASS REQUIRED FOR HIGH-RISK OPERATION")
        print(f"{'='*60}")
        print(f"Operation: {operation}")
        print(f"Command: {command}")
        print(f"Risk Level: {risk_level.value.upper()}")
        print(f"Blocked: {env_reason}")
        print(f"\nTo proceed, set these environment variables:")
        print(f"  export AF_BREAK_GLASS=1")
        print(f"  export AF_BREAK_GLASS_REASON=\"<your justification>\"")
        print(f"  export AF_CHANGE_TICKET=\"<ticket or CAB ID>\"")
        print(f"\nThen rerun:")
        print(f"  {command}")
        print(f"{'='*60}\n")

        return False, env_reason, context

    context.reason = env_context["reason"]
    context.change_ticket = env_context["change_ticket"]

    # Layer 2: Interactive confirmation (if TTY)
    if require_interactive and is_tty():
        interactive_allowed, interactive_reason = interactive_confirmation(
            operation, risk_level, git_sha
        )
        if not interactive_allowed:
            context.blocked_reason = interactive_reason
            emit_audit_log(context)
            return False, interactive_reason, context

    # All checks passed
    context.approved = True
    emit_audit_log(context)

    print(f"✅ Break glass approved: {operation}")
    print(f"   Reason: {context.reason}")
    print(f"   Ticket: {context.change_ticket}")

    return True, "Break glass approved", context


# Command-line interface
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Break Glass Guard")
    parser.add_argument("--operation", required=True, help="Operation description")
    parser.add_argument("--command", required=True, help="Command to execute")
    parser.add_argument("--host", default="localhost", help="Target host")
    parser.add_argument("--no-interactive", action="store_true", help="Skip interactive")
    parser.add_argument("--check-only", action="store_true", help="Check without logging")
    args = parser.parse_args()

    allowed, reason, ctx = guard_operation(
        args.operation, args.command, args.host, not args.no_interactive
    )

    if args.check_only:
        print(json.dumps({"allowed": allowed, "reason": reason, "risk_level": ctx.risk_level.value}))

    sys.exit(0 if allowed else 1)

