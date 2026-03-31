#!/usr/bin/env python3
"""
Break-Glass Audit Logging System
Requires explicit approval for high-risk operations to prevent "checkbox fatigue"

Environment Variables Required:
    AF_BREAK_GLASS=1
    AF_BREAK_GLASS_REASON="reason text"
    AF_CHANGE_TICKET="TICKET-123" (or AF_CAB_APPROVAL_ID)

Usage:
    from break_glass import require_break_glass, BreakGlassOperation
    
    @require_break_glass(operation="install_packages")
    def install_deps():
        subprocess.run(["apt", "install", "..."])
"""

import os
import sys
import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Callable, Any
from functools import wraps
from enum import Enum


class RiskLevel(Enum):
    """Risk levels for operations."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class BreakGlassOperation:
    """High-risk operation classifications."""
    
    # Package management
    INSTALL_PACKAGES = "install_packages"
    REMOVE_PACKAGES = "remove_packages"
    
    # Service management
    RESTART_SERVICE = "restart_service"
    STOP_SERVICE = "stop_service"
    
    # Runtime changes
    CHANGE_RUNTIME = "change_runtime"
    DISABLE_DOCKER = "disable_docker"
    
    # Kubernetes
    MODIFY_KUBELET = "modify_kubelet"
    MODIFY_KUBECONFIG = "modify_kubeconfig"
    DELETE_NAMESPACE = "delete_namespace"
    
    # Database
    DROP_DATABASE = "drop_database"
    MODIFY_SCHEMA = "modify_schema"
    
    # Infrastructure
    MODIFY_FIREWALL = "modify_firewall"
    CHANGE_NETWORK = "change_network"
    
    @classmethod
    def get_risk_level(cls, operation: str) -> RiskLevel:
        """Get risk level for an operation."""
        critical = {
            cls.DROP_DATABASE,
            cls.DELETE_NAMESPACE,
            cls.DISABLE_DOCKER,
        }
        high = {
            cls.INSTALL_PACKAGES,
            cls.REMOVE_PACKAGES,
            cls.RESTART_SERVICE,
            cls.MODIFY_KUBELET,
            cls.MODIFY_KUBECONFIG,
            cls.MODIFY_SCHEMA,
            cls.MODIFY_FIREWALL,
        }
        medium = {
            cls.STOP_SERVICE,
            cls.CHANGE_RUNTIME,
            cls.CHANGE_NETWORK,
        }
        
        if operation in critical:
            return RiskLevel.CRITICAL
        elif operation in high:
            return RiskLevel.HIGH
        elif operation in medium:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW


class BreakGlassAudit:
    """Audit logger for break-glass operations."""
    
    def __init__(self, audit_file: Optional[Path] = None):
        """Initialize audit logger."""
        if audit_file is None:
            # Default to .goalie/break_glass_audit.jsonl
            self.audit_file = Path.cwd() / ".goalie" / "break_glass_audit.jsonl"
        else:
            self.audit_file = audit_file
        
        # Ensure directory exists
        self.audit_file.parent.mkdir(parents=True, exist_ok=True)
    
    def log_attempt(self, operation: str, approved: bool, reason: str = "",
                   ticket: str = "", command: str = "", context: Dict = None) -> None:
        """Log a break-glass attempt."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "operation": operation,
            "risk_level": BreakGlassOperation.get_risk_level(operation).value,
            "approved": approved,
            "reason": reason,
            "ticket": ticket,
            "command": command,
            "user": os.getenv("USER", "unknown"),
            "hostname": os.getenv("HOSTNAME", os.getenv("COMPUTERNAME", "unknown")),
            "cwd": str(Path.cwd()),
            "context": context or {},
            "audit_hash": ""
        }
        
        # Add audit hash for integrity
        entry["audit_hash"] = self._hash_entry(entry)
        
        # Append to audit log
        with open(self.audit_file, "a") as f:
            f.write(json.dumps(entry) + "\n")
    
    def _hash_entry(self, entry: Dict) -> str:
        """Generate hash for audit entry integrity."""
        # Create deterministic string from entry (excluding hash itself)
        data = {k: v for k, v in entry.items() if k != "audit_hash"}
        data_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(data_str.encode()).hexdigest()[:16]
    
    def verify_integrity(self) -> bool:
        """Verify audit log integrity."""
        if not self.audit_file.exists():
            return True
        
        with open(self.audit_file) as f:
            for line_num, line in enumerate(f, 1):
                try:
                    entry = json.loads(line)
                    expected_hash = self._hash_entry(entry)
                    actual_hash = entry.get("audit_hash", "")
                    
                    if expected_hash != actual_hash:
                        print(f"⚠️  Integrity violation at line {line_num}", file=sys.stderr)
                        return False
                except json.JSONDecodeError:
                    print(f"⚠️  Invalid JSON at line {line_num}", file=sys.stderr)
                    return False
        
        return True
    
    def get_recent_operations(self, limit: int = 10) -> list:
        """Get recent operations from audit log."""
        if not self.audit_file.exists():
            return []
        
        operations = []
        with open(self.audit_file) as f:
            for line in f:
                try:
                    operations.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        
        return operations[-limit:]


class BreakGlassError(Exception):
    """Exception raised when break-glass check fails."""
    pass


def check_break_glass(operation: str, command: str = "", 
                     context: Dict = None, audit_file: Optional[Path] = None) -> None:
    """
    Check break-glass requirements for high-risk operation.
    
    Raises BreakGlassError if requirements not met.
    
    Args:
        operation: Operation identifier (use BreakGlassOperation constants)
        command: Actual command being blocked
        context: Additional context (dict)
        audit_file: Custom audit file path
    """
    audit = BreakGlassAudit(audit_file)
    
    # Check environment variables
    break_glass = os.getenv("AF_BREAK_GLASS", "0")
    reason = os.getenv("AF_BREAK_GLASS_REASON", "")
    ticket = os.getenv("AF_CHANGE_TICKET", os.getenv("AF_CAB_APPROVAL_ID", ""))
    
    # Determine if approved
    approved = break_glass == "1" and len(reason) > 0 and len(ticket) > 0
    
    # Log attempt
    audit.log_attempt(
        operation=operation,
        approved=approved,
        reason=reason,
        ticket=ticket,
        command=command,
        context=context
    )
    
    if not approved:
        risk_level = BreakGlassOperation.get_risk_level(operation)
        error_msg = _format_error_message(operation, command, risk_level)
        raise BreakGlassError(error_msg)


def _format_error_message(operation: str, command: str, risk_level: RiskLevel) -> str:
    """Format break-glass error message."""
    msg = [
        f"\n{'='*70}",
        f"🚨 BREAK-GLASS REQUIRED: High-Risk Operation Blocked",
        f"{'='*70}",
        f"",
        f"Operation: {operation}",
        f"Risk Level: {risk_level.value.upper()}",
        f"",
    ]
    
    if command:
        msg.extend([
            f"Command Blocked:",
            f"  {command}",
            f"",
        ])
    
    msg.extend([
        f"Why it's blocked:",
        f"  This operation can cause system instability, data loss,",
        f"  or service disruption if executed improperly.",
        f"",
        f"To proceed, set these environment variables:",
        f"",
        f"  export AF_BREAK_GLASS=1",
        f"  export AF_BREAK_GLASS_REASON=\"<your reason>\"",
        f"  export AF_CHANGE_TICKET=\"TICKET-123\"",
        f"",
        f"Example:",
        f"  AF_BREAK_GLASS=1 \\",
        f"  AF_BREAK_GLASS_REASON=\"Emergency fix for prod outage\" \\",
        f"  AF_CHANGE_TICKET=\"INC-2024-001\" \\",
        f"  {command or 'your-command'}",
        f"",
        f"All attempts are logged to .goalie/break_glass_audit.jsonl",
        f"{'='*70}",
    ])
    
    return "\n".join(msg)


def require_break_glass(operation: str, command: str = ""):
    """
    Decorator to require break-glass for a function.
    
    Usage:
        @require_break_glass(operation=BreakGlassOperation.INSTALL_PACKAGES)
        def install_packages():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Extract command if not provided
            cmd = command or f"{func.__module__}.{func.__name__}"
            
            # Check break-glass
            check_break_glass(operation=operation, command=cmd)
            
            # Execute original function
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def main():
    """CLI for break-glass audit management."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Break-Glass Audit Management",
        epilog="Example: python break_glass.py --verify"
    )
    parser.add_argument("--verify", action="store_true",
                       help="Verify audit log integrity")
    parser.add_argument("--recent", type=int, default=10,
                       help="Show recent operations (default: 10)")
    parser.add_argument("--audit-file", type=Path,
                       help="Custom audit file path")
    
    args = parser.parse_args()
    
    audit = BreakGlassAudit(args.audit_file)
    
    if args.verify:
        print("🔍 Verifying audit log integrity...")
        if audit.verify_integrity():
            print("✅ Audit log integrity verified")
            sys.exit(0)
        else:
            print("❌ Audit log integrity check failed")
            sys.exit(1)
    
    # Show recent operations
    operations = audit.get_recent_operations(args.recent)
    
    if not operations:
        print("No operations in audit log")
        sys.exit(0)
    
    print(f"\n📋 Recent Operations (last {len(operations)}):\n")
    
    for op in operations:
        timestamp = op.get("timestamp", "")
        operation = op.get("operation", "")
        approved = op.get("approved", False)
        risk = op.get("risk_level", "")
        reason = op.get("reason", "")
        ticket = op.get("ticket", "")
        
        status_icon = "✅" if approved else "❌"
        
        print(f"{status_icon} {timestamp}")
        print(f"   Operation: {operation} (Risk: {risk.upper()})")
        if approved:
            print(f"   Reason: {reason}")
            print(f"   Ticket: {ticket}")
        else:
            print(f"   Status: BLOCKED")
        print()


if __name__ == "__main__":
    main()
