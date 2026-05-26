#!/usr/bin/env python3
"""
Break-Glass Hook System for AF CLI

Prevents "checkbox fatigue" (ROAM drift) when executing disruptive operations.
Requires explicit approval via environment variables before executing high-risk commands.

Environment Variables Required:
    AF_BREAK_GLASS=1                    # Explicit opt-in
    AF_BREAK_GLASS_REASON="..."         # Free text explanation
    AF_CHANGE_TICKET="..."              # Change ticket ID (or AF_CAB_APPROVAL_ID)

Optional Environment Variables:
    AF_BREAK_GLASS_TTL=3600             # Time-bounded access window (seconds, default 1hr)
    AF_BREAK_GLASS_SESSION_START=...    # Session start timestamp (auto-set if not provided)
    AF_CAB_APPROVAL_ID="..."            # Alternative to AF_CHANGE_TICKET
    
Notification Environment Variables:
    SLACK_BREAK_GLASS_WEBHOOK="..."     # Slack webhook URL for notifications
    BREAK_GLASS_NOTIFY_EMAIL="..."      # Email address for notifications
    PAGERDUTY_BREAK_GLASS_KEY="..."     # PagerDuty integration key

Usage:
    from break_glass import check_break_glass, get_risk_category, require_break_glass_action
    
    if not check_break_glass(command):
        sys.exit(1)  # Command was blocked
    
    # Or use typed actions:
    result = require_break_glass_action(BreakGlassAction.PACKAGE_INSTALL, "nginx")
"""

import json
import os
import re
import socket
import sys
import time
import getpass
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, List
from enum import Enum


# ============================================================================
# Break Glass Action Enum (Typed Action API)
# ============================================================================

class BreakGlassAction(Enum):
    """Typed action categories for break glass operations."""
    PACKAGE_INSTALL = "package_install"
    PACKAGE_REMOVE = "package_remove"
    SERVICE_CONTROL = "service_control"
    SERVICE_RESTART = "service_restart"  # Alias for service_control
    RUNTIME_CHANGE = "runtime_change"
    DOCKER_DISABLE = "docker_disable"
    KUBELET_MODIFY = "kubelet_modify"
    KUBELET_CONFIG = "kubelet_config"  # Alias for kubelet_modify
    KUBECONFIG_MODIFY = "kubeconfig_modify"
    FIREWALL_MODIFY = "firewall_modify"
    CERTIFICATE_ROTATE = "certificate_rotate"
    CERT_ROTATE = "cert_rotate"  # Alias
    FILE_MODIFY = "file_modify"
    DESTRUCTIVE_RM = "destructive_rm"
    NETWORK_MODIFY = "network_modify"
    NETWORK_CHANGE = "network_change"  # Alias
    SSH_STATE_MODIFY = "ssh_state_modify"
    STORAGE_MODIFY = "storage_modify"
    USER_MODIFY = "user_modify"
    KERNEL_PARAM = "kernel_param"
    REBOOT = "reboot"
    
    @classmethod
    def high_risk_actions(cls) -> List['BreakGlassAction']:
        """Actions that require additional approval (change ticket/CAB)."""
        return [
            cls.PACKAGE_REMOVE,
            cls.RUNTIME_CHANGE,
            cls.DOCKER_DISABLE,
            cls.KUBELET_MODIFY,
            cls.KUBELET_CONFIG,
            cls.KUBECONFIG_MODIFY,
            cls.FIREWALL_MODIFY,
            cls.CERTIFICATE_ROTATE,
            cls.CERT_ROTATE,
            cls.DESTRUCTIVE_RM,
            cls.NETWORK_MODIFY,
            cls.NETWORK_CHANGE,
            cls.KERNEL_PARAM,
            cls.REBOOT,
        ]
    
    @classmethod
    def get_default_ttl(cls, action: 'BreakGlassAction') -> int:
        """Get default TTL (seconds) for an action based on risk level."""
        critical_ttl = 900   # 15 minutes for critical
        high_ttl = 1800      # 30 minutes for high
        standard_ttl = 3600  # 1 hour for standard
        
        critical_actions = [cls.REBOOT, cls.DESTRUCTIVE_RM, cls.KUBELET_CONFIG, cls.KUBECONFIG_MODIFY]
        if action in critical_actions:
            return critical_ttl
        elif action in cls.high_risk_actions():
            return high_ttl
        return standard_ttl
    
    @classmethod
    def from_string(cls, value: str) -> Optional['BreakGlassAction']:
        """Convert string to BreakGlassAction, returns None if invalid."""
        try:
            return cls(value.lower())
        except ValueError:
            return None


# ============================================================================
# Notification System
# ============================================================================

class NotificationManager:
    """Handles escalation notifications for break glass events."""
    
    def __init__(self):
        self.slack_webhook = os.environ.get('SLACK_BREAK_GLASS_WEBHOOK', '').strip()
        self.notify_email = os.environ.get('BREAK_GLASS_NOTIFY_EMAIL', '').strip()
        self.pagerduty_key = os.environ.get('PAGERDUTY_BREAK_GLASS_KEY', '').strip()
    
    def has_notifications_configured(self) -> bool:
        """Check if any notification channel is configured."""
        return bool(self.slack_webhook or self.notify_email or self.pagerduty_key)
    
    def send_all_notifications(self, event: Dict[str, Any]) -> Dict[str, bool]:
        """Send notifications to all configured channels."""
        results = {}
        
        if self.slack_webhook:
            results['slack'] = self._send_slack(event)
        
        if self.notify_email:
            results['email'] = self._send_email(event)
        
        if self.pagerduty_key:
            results['pagerduty'] = self._send_pagerduty(event)
        
        return results
    
    def _send_slack(self, event: Dict[str, Any]) -> bool:
        """Send Slack webhook notification."""
        try:
            is_approved = event.get('approved', False)
            emoji = "✅" if is_approved else "🚨"
            status = "APPROVED" if is_approved else "BLOCKED"
            
            message = {
                "text": f"{emoji} Break Glass {status}",
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": f"{emoji} Break Glass {status}",
                            "emoji": True
                        }
                    },
                    {
                        "type": "section",
                        "fields": [
                            {"type": "mrkdwn", "text": f"*Action:*\n{event.get('action', 'N/A')}"},
                            {"type": "mrkdwn", "text": f"*Target:*\n{event.get('target', 'N/A')}"},
                            {"type": "mrkdwn", "text": f"*Operator:*\n{event.get('operator', 'N/A')}"},
                            {"type": "mrkdwn", "text": f"*Hostname:*\n{event.get('hostname', 'N/A')}"},
                        ]
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*Reason:*\n{event.get('reason', 'Not provided')}"
                        }
                    }
                ]
            }
            
            if event.get('change_ticket'):
                message["blocks"].append({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Change Ticket:* {event.get('change_ticket')}"
                    }
                })
            
            data = json.dumps(message).encode('utf-8')
            req = urllib.request.Request(
                self.slack_webhook,
                data=data,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.status == 200
                
        except Exception as e:
            print(f"Warning: Slack notification failed: {e}", file=sys.stderr)
            return False
    
    def _send_email(self, event: Dict[str, Any]) -> bool:
        """Send email notification (placeholder - requires SMTP configuration)."""
        # Email sending would require SMTP configuration
        # This is a placeholder that logs the intent
        print(f"Email notification would be sent to: {self.notify_email}", file=sys.stderr)
        return True
    
    def _send_pagerduty(self, event: Dict[str, Any]) -> bool:
        """Send PagerDuty notification."""
        try:
            is_approved = event.get('approved', False)
            severity = "info" if is_approved else "warning"
            
            payload = {
                "routing_key": self.pagerduty_key,
                "event_action": "trigger",
                "payload": {
                    "summary": f"Break Glass {'Approved' if is_approved else 'Blocked'}: {event.get('action', 'Unknown')} on {event.get('target', 'Unknown')}",
                    "severity": severity,
                    "source": event.get('hostname', 'unknown'),
                    "component": "break-glass-system",
                    "custom_details": event
                }
            }
            
            data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                'https://events.pagerduty.com/v2/enqueue',
                data=data,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.status in (200, 202)
                
        except Exception as e:
            print(f"Warning: PagerDuty notification failed: {e}", file=sys.stderr)
            return False


# ============================================================================
# TTL (Time-Bounded Access) Support
# ============================================================================

def check_session_ttl() -> Tuple[bool, Optional[str]]:
    """
    Check if the break glass session is within TTL bounds.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    ttl = int(os.environ.get('AF_BREAK_GLASS_TTL', '3600'))
    session_start = os.environ.get('AF_BREAK_GLASS_SESSION_START', '')
    
    if not session_start:
        # No session start set, auto-set it now
        os.environ['AF_BREAK_GLASS_SESSION_START'] = str(time.time())
        return True, None
    
    try:
        start_time = float(session_start)
        elapsed = time.time() - start_time
        
        if elapsed > ttl:
            return False, f"Break glass session expired ({int(elapsed)}s elapsed, TTL is {ttl}s)"
        
        remaining = int(ttl - elapsed)
        return True, f"Session valid, {remaining}s remaining"
        
    except ValueError:
        return False, f"Invalid session start timestamp: {session_start}"


def get_session_info() -> Dict[str, Any]:
    """Get current session information."""
    ttl = int(os.environ.get('AF_BREAK_GLASS_TTL', '3600'))
    session_start = os.environ.get('AF_BREAK_GLASS_SESSION_START', '')
    
    info = {
        'ttl_seconds': ttl,
        'session_start': session_start,
        'session_valid': False,
        'remaining_seconds': 0,
    }
    
    if session_start:
        try:
            start_time = float(session_start)
            elapsed = time.time() - start_time
            info['elapsed_seconds'] = int(elapsed)
            info['remaining_seconds'] = max(0, int(ttl - elapsed))
            info['session_valid'] = elapsed <= ttl
        except ValueError:
            pass
    
    return info


# ============================================================================
# Break Glass Validator (Typed Action API)
# ============================================================================

class BreakGlassValidator:
    """Validates break glass invocations and manages audit trail for typed actions."""
    
    AUDIT_FILE = Path(".goalie/break_glass_audit.jsonl")
    REQUIRED_ENV_VARS = ["AF_BREAK_GLASS", "AF_BREAK_GLASS_REASON"]
    
    def __init__(self):
        self.audit_file = get_audit_log_path()
        self.notification_manager = NotificationManager()
    
    def is_enabled(self) -> bool:
        """Check if break glass mode is enabled."""
        return os.environ.get("AF_BREAK_GLASS", "0").lower() in ("1", "true", "yes")
    
    def is_ci_environment(self) -> bool:
        """Detect CI environment to avoid interactive prompts."""
        return is_ci_mode()
    
    def validate(self, action: BreakGlassAction, target: str) -> Dict[str, Any]:
        """
        Validate break glass invocation and return context.
        
        Args:
            action: The typed action being performed
            target: The target resource
            
        Returns:
            Dict containing authorization result and context
        """
        # Check if enabled
        if not self.is_enabled():
            return {
                "authorized": False,
                "error": "AF_BREAK_GLASS=1 not set",
                "hint": "Set AF_BREAK_GLASS=1 AF_BREAK_GLASS_REASON='...' to enable",
                "action": action.value,
                "target": target,
            }
        
        # Check required fields
        reason = os.environ.get("AF_BREAK_GLASS_REASON", "").strip()
        if not reason:
            return {
                "authorized": False,
                "error": "AF_BREAK_GLASS_REASON not set",
                "hint": "Provide justification: AF_BREAK_GLASS_REASON='Emergency: ...'",
                "blocked_command": f"{action.value} on {target}",
                "action": action.value,
                "target": target,
            }
        
        # Check TTL
        ttl_valid, ttl_msg = check_session_ttl()
        if not ttl_valid:
            return {
                "authorized": False,
                "error": ttl_msg,
                "hint": "Start new session with fresh AF_BREAK_GLASS=1",
                "action": action.value,
                "target": target,
            }
        
        # High-risk actions require additional approval
        change_ticket = os.environ.get("AF_CHANGE_TICKET", "").strip()
        cab_approval = os.environ.get("AF_CAB_APPROVAL_ID", "").strip()
        
        if action in BreakGlassAction.high_risk_actions():
            if not change_ticket and not cab_approval:
                return {
                    "authorized": False,
                    "error": f"High-risk action '{action.value}' requires approval reference",
                    "hint": "Set AF_CHANGE_TICKET='CHG...' or AF_CAB_APPROVAL_ID='...'",
                    "blocked_command": f"{action.value} on {target}",
                    "risk_level": "HIGH",
                    "action": action.value,
                    "target": target,
                }
        
        # Get session info
        session_info = get_session_info()
        
        # Build audit context
        context = {
            "authorized": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "operator": getpass.getuser(),
            "hostname": socket.gethostname(),
            "action": action.value,
            "target": target,
            "reason": reason,
            "change_ticket": change_ticket or cab_approval,
            "cab_approval": cab_approval,
            "ttl_seconds": session_info['ttl_seconds'],
            "session_start": session_info['session_start'],
            "remaining_seconds": session_info['remaining_seconds'],
            "risk_level": "HIGH" if action in BreakGlassAction.high_risk_actions() else "STANDARD",
            "ci_mode": self.is_ci_environment(),
        }
        
        # Log audit entry
        self._append_audit(context)
        
        # Send notifications
        if self.notification_manager.has_notifications_configured():
            context['notifications'] = self.notification_manager.send_all_notifications(context)
        
        return context
    
    def _append_audit(self, entry: Dict[str, Any]) -> None:
        """Append audit entry to JSONL file."""
        log_audit_entry(entry)
    
    def get_audit_trail(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve recent audit entries."""
        if not self.audit_file.exists():
            return []
        
        entries = []
        with open(self.audit_file, "r") as f:
            for line in f:
                if line.strip():
                    try:
                        entries.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        
        return entries[-limit:]
    
    def format_blocked_message(self, result: Dict[str, Any]) -> str:
        """Format user-friendly blocked operation message."""
        if result.get("authorized"):
            return ""
        
        msg = [
            "🚫 OPERATION BLOCKED - Break Glass Required",
            "",
            f"Error: {result.get('error', 'Unknown')}",
            f"Hint: {result.get('hint', 'N/A')}",
        ]
        
        if result.get("blocked_command"):
            msg.append(f"Blocked Command: {result['blocked_command']}")
        
        if result.get("risk_level") == "HIGH":
            msg.extend([
                "",
                "⚠️  HIGH-RISK OPERATION",
                "Requires: AF_CHANGE_TICKET or AF_CAB_APPROVAL_ID"
            ])
        
        msg.extend([
            "",
            "Example:",
            "  AF_BREAK_GLASS=1 \\",
            "  AF_BREAK_GLASS_REASON='Emergency: prod incident INC123' \\",
            "  AF_CHANGE_TICKET='CHG456' \\",
            "  ./af prod deploy --force"
        ])
        
        return "\n".join(msg)


def require_break_glass_action(action: BreakGlassAction, target: str) -> Dict[str, Any]:
    """
    Guard function for operations requiring break glass with typed actions.
    
    Args:
        action: The BreakGlassAction being performed
        target: The target resource
        
    Returns:
        Context dict if authorized
        
    Raises:
        SystemExit: If not authorized (exits with code 1)
    """
    validator = BreakGlassValidator()
    result = validator.validate(action, target)
    
    if not result.get("authorized"):
        print(validator.format_blocked_message(result), file=sys.stderr)
        sys.exit(1)
    
    return result


# ============================================================================
# High-risk command patterns with their categories (Pattern-based API)
# ============================================================================

HIGH_RISK_PATTERNS: Dict[str, str] = {
    'package_install': r'(apt|dnf|yum|rpm)\s+(install|upgrade|remove|update)',
    'service_control': r'systemctl\s+(start|stop|restart|enable|disable)',
    'docker_disable': r'(systemctl\s+disable\s+docker|rm\s+-rf\s+/var/lib/docker)',
    'kubelet_modify': r'(kubeadm\s+init|kubeadm\s+reset|kubectl\s+delete)',
    'file_modify': r'(rm\s+-rf|chmod|chown)\s+/etc/(kubernetes|containerd)',
    'ssh_state_modify': r"ssh\s+\S+\s+'[^']*\b(apt|dnf|yum|rpm|systemctl|kubeadm|rm\s+-rf|kubectl\s+delete)\b",
    'destructive_rm': r'rm\s+-rf\s+/(usr|var|etc|opt|home)',
    'network_modify': r'(ip\s+route|iptables|firewall-cmd|ufw)\s+(add|delete|disable|enable)',
}

# Risk explanations for user guidance
RISK_EXPLANATIONS: Dict[str, str] = {
    'package_install': 'Installing/removing system packages can break existing services or create version conflicts',
    'service_control': 'Starting/stopping/restarting services can cause downtime or cascading failures',
    'docker_disable': 'Disabling Docker or removing its data will terminate all containers and workloads',
    'kubelet_modify': 'Kubernetes control plane operations can disrupt cluster state and workloads',
    'file_modify': 'Modifying critical config files can render services inoperable',
    'ssh_state_modify': 'Remote SSH commands that modify state are high-risk and require explicit approval',
    'destructive_rm': 'Recursive deletion of system directories is irreversible and catastrophic',
    'network_modify': 'Network configuration changes can cause connectivity loss',
}

# CI environment detection variables
CI_ENVIRONMENT_VARS = [
    'CI',
    'GITHUB_ACTIONS',
    'GITLAB_CI',
    'JENKINS_URL',
    'TRAVIS',
    'CIRCLECI',
    'BUILDKITE',
    'DRONE',
    'TEAMCITY_VERSION',
    'TF_BUILD',  # Azure DevOps
]


def get_project_root() -> Path:
    """Get the project root directory."""
    # Try to find project root by looking for common markers
    current = Path(__file__).resolve().parent
    while current != current.parent:
        if (current / '.goalie').exists() or (current / 'AGENTS.md').exists():
            return current
        current = current.parent
    # Fallback to scripts parent
    return Path(__file__).resolve().parent.parent.parent


def get_audit_log_path() -> Path:
    """Get the path to the break-glass audit log."""
    project_root = get_project_root()
    goalie_dir = project_root / '.goalie'
    goalie_dir.mkdir(parents=True, exist_ok=True)
    return goalie_dir / 'break_glass_audit.jsonl'


def is_ci_mode() -> bool:
    """
    Detect if running in a CI environment.
    
    Returns:
        True if any CI environment variable is set to a truthy value
    """
    for var in CI_ENVIRONMENT_VARS:
        value = os.environ.get(var, '').lower()
        if value in ('1', 'true', 'yes'):
            return True
    return False


def get_risk_category(command: str) -> Optional[str]:
    """
    Categorize the risk level of a command.
    
    Args:
        command: The command string to analyze
        
    Returns:
        Risk category string if high-risk, None otherwise
    """
    for category, pattern in HIGH_RISK_PATTERNS.items():
        if re.search(pattern, command, re.IGNORECASE):
            return category
    return None


def get_break_glass_env() -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Get break-glass environment variables.
    
    Returns:
        Tuple of (is_enabled, reason, change_ticket)
    """
    enabled = os.environ.get('AF_BREAK_GLASS', '').lower() in ('1', 'true', 'yes')
    reason = os.environ.get('AF_BREAK_GLASS_REASON', '').strip() or None
    
    # Support both AF_CHANGE_TICKET and AF_CAB_APPROVAL_ID
    change_ticket = (
        os.environ.get('AF_CHANGE_TICKET', '').strip() or
        os.environ.get('AF_CAB_APPROVAL_ID', '').strip() or
        None
    )
    
    return enabled, reason, change_ticket


def get_operator() -> str:
    """Get the current operator (user) name."""
    return os.environ.get('USER', os.environ.get('USERNAME', 'unknown'))


def get_hostname() -> str:
    """Get the current hostname."""
    return socket.gethostname()


def log_audit_entry(entry: Dict[str, Any]) -> None:
    """
    Append an audit entry to the break-glass audit log.
    
    Args:
        entry: Dictionary containing audit information
    """
    audit_path = get_audit_log_path()
    
    # Ensure the entry has a timestamp
    if 'timestamp' not in entry:
        entry['timestamp'] = datetime.now(timezone.utc).isoformat()
    
    try:
        with open(audit_path, 'a') as f:
            f.write(json.dumps(entry, default=str) + '\n')
    except Exception as e:
        # Log to stderr but don't fail the operation
        print(f"Warning: Failed to write audit log: {e}", file=sys.stderr)


def print_blocked_message(
    command: str,
    risk_category: str,
    rerun_command: Optional[str] = None
) -> None:
    """
    Print a user-friendly message when a command is blocked.
    
    Args:
        command: The blocked command
        risk_category: The risk category that triggered the block
        rerun_command: Optional suggested rerun command
    """
    explanation = RISK_EXPLANATIONS.get(risk_category, 'This command modifies critical system state')
    
    # Build rerun suggestion
    if rerun_command is None:
        # Try to get the original script invocation
        script_name = os.environ.get('AF_SCRIPT_NAME', './scripts/af')
        script_args = os.environ.get('AF_SCRIPT_ARGS', '')
        rerun_command = f"{script_name} {script_args}".strip()
    
    message = f"""
⛔ BREAK-GLASS REQUIRED

Command Blocked: {command}
Risk Category: {risk_category}
Why High-Risk: {explanation}

To proceed, rerun with:
  AF_BREAK_GLASS=1 \\
  AF_BREAK_GLASS_REASON="<your explanation here>" \\
  AF_CHANGE_TICKET="<change ticket ID>" \\
  {rerun_command}

Required Context:
  - Rollback plan documented in docs/ROLLBACK_PROCEDURE.md
  - Monitoring dashboard: https://grafana.corp.interface.tag.ooo:3006
  - Change ticket or CAB approval ID is required for audit compliance
"""
    print(message, file=sys.stderr)


def print_ci_failure_message(command: str, risk_category: str) -> None:
    """
    Print a CI-specific failure message.
    
    Args:
        command: The blocked command
        risk_category: The risk category that triggered the block
    """
    message = f"""
::error::Break-glass approval required for high-risk command

Command: {command}
Risk Category: {risk_category}

Required environment variables:
  AF_BREAK_GLASS=1
  AF_BREAK_GLASS_REASON="<explanation>"
  AF_CHANGE_TICKET="<ticket ID>"

This is a production safety check. Set these variables in your CI workflow
to explicitly approve this high-risk operation.
"""
    print(message, file=sys.stderr)


def check_break_glass(command: str, rerun_command: Optional[str] = None) -> bool:
    """
    Check if a command requires break-glass approval and if it's been granted.
    
    This function:
    1. Checks if the command matches any high-risk patterns
    2. If high-risk, verifies that required environment variables are set
    3. Logs the audit entry
    4. Returns whether the command should proceed
    
    Args:
        command: The command string to check
        rerun_command: Optional command string to suggest for rerunning with approval
        
    Returns:
        True if the command is approved to proceed, False if blocked
    """
    # Get risk category
    risk_category = get_risk_category(command)
    
    # If not high-risk, allow
    if risk_category is None:
        return True
    
    # Get break-glass environment
    enabled, reason, change_ticket = get_break_glass_env()
    ci_mode = is_ci_mode()
    
    # Build audit entry
    audit_entry = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'command_blocked': command,
        'risk_category': risk_category,
        'reason': reason,
        'change_ticket': change_ticket,
        'operator': get_operator(),
        'hostname': get_hostname(),
        'approved': False,
        'ci_mode': ci_mode,
    }
    
    # Check if all required variables are set
    if enabled and reason and change_ticket:
        # Approved - log and proceed
        audit_entry['approved'] = True
        log_audit_entry(audit_entry)
        
        print(f"✓ Break-glass approved for: {risk_category}", file=sys.stderr)
        print(f"  Reason: {reason}", file=sys.stderr)
        print(f"  Ticket: {change_ticket}", file=sys.stderr)
        
        return True
    
    # Not approved - log the blocked attempt
    log_audit_entry(audit_entry)
    
    # Print appropriate message based on environment
    if ci_mode:
        print_ci_failure_message(command, risk_category)
    else:
        print_blocked_message(command, risk_category, rerun_command)
    
    return False


def validate_command_batch(commands: list[str]) -> Tuple[bool, list[str]]:
    """
    Validate a batch of commands for break-glass requirements.
    
    Args:
        commands: List of command strings to validate
        
    Returns:
        Tuple of (all_approved, list_of_blocked_commands)
    """
    blocked = []
    for cmd in commands:
        if not check_break_glass(cmd):
            blocked.append(cmd)
    
    return len(blocked) == 0, blocked


def require_break_glass(func):
    """
    Decorator to require break-glass approval for a function.
    
    The decorated function should have a 'command' parameter or
    the first argument will be treated as the command.
    
    Usage:
        @require_break_glass
        def execute_remote_command(command: str) -> None:
            ...
    """
    def wrapper(*args, **kwargs):
        # Try to get command from kwargs or first arg
        command = kwargs.get('command') or (args[0] if args else None)
        
        if command and not check_break_glass(str(command)):
            raise PermissionError(f"Break-glass approval required for: {command}")
        
        return func(*args, **kwargs)
    
    return wrapper


# CLI interface for shell integration
def main():
    """
    CLI interface for break-glass checking.
    
    Usage:
        python break_glass.py check "apt install -y nginx"
        python break_glass.py validate --action package_install --target nginx
        python break_glass.py category "systemctl restart docker"
        python break_glass.py audit
        python break_glass.py session --info
    """
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Break-glass hook system for high-risk operations',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s check "apt install -y nginx"
  %(prog)s validate --action package_install --target nginx
  %(prog)s category "systemctl restart docker"
  %(prog)s audit --last 10
  %(prog)s session --info
  %(prog)s actions
  
Exit codes:
  0 - Command approved or not high-risk
  1 - Command blocked (break-glass required)
  2 - Error in processing

Available Actions:
  package_install, service_restart, runtime_change, docker_disable,
  kubelet_modify, kubeconfig_modify, firewall_modify, certificate_rotate,
  file_modify, destructive_rm, network_modify, ssh_state_modify
"""
    )
    
    subparsers = parser.add_subparsers(dest='subcommand', help='Action to perform')
    
    # Check subcommand (pattern-based)
    check_parser = subparsers.add_parser('check', help='Check if a command requires break-glass (pattern-based)')
    check_parser.add_argument('command', help='Command to check')
    check_parser.add_argument('--rerun', help='Suggested rerun command')
    check_parser.add_argument('--json', action='store_true', help='Output JSON')
    
    # Validate subcommand (typed action-based)
    validate_parser = subparsers.add_parser('validate', help='Validate a typed action (enum-based)')
    validate_parser.add_argument('--action', '-a', required=True, help='Action type (e.g., package_install)')
    validate_parser.add_argument('--target', '-t', required=True, help='Target resource')
    validate_parser.add_argument('--json', action='store_true', help='Output JSON')
    
    # Category subcommand
    cat_parser = subparsers.add_parser('category', help='Get risk category for a command')
    cat_parser.add_argument('command', help='Command to categorize')
    cat_parser.add_argument('--json', action='store_true', help='Output JSON')
    
    # Audit subcommand
    audit_parser = subparsers.add_parser('audit', help='View audit log')
    audit_parser.add_argument('--last', type=int, default=10, help='Number of entries to show')
    audit_parser.add_argument('--json', action='store_true', help='Output JSON')
    audit_parser.add_argument('--blocked-only', action='store_true', help='Show only blocked commands')
    
    # Status subcommand
    status_parser = subparsers.add_parser('status', help='Show break-glass configuration status')
    status_parser.add_argument('--json', action='store_true', help='Output JSON')
    
    # Session subcommand (TTL info)
    session_parser = subparsers.add_parser('session', help='Session and TTL information')
    session_parser.add_argument('--info', action='store_true', help='Show session info')
    session_parser.add_argument('--json', action='store_true', help='Output JSON')
    
    # Actions subcommand (list all actions)
    actions_parser = subparsers.add_parser('actions', help='List all available actions')
    actions_parser.add_argument('--json', action='store_true', help='Output JSON')
    
    # Authorize subcommand (explicit pre-authorization for CI/scripts)
    authorize_parser = subparsers.add_parser('authorize',
        help='Pre-authorize a break-glass action (for CI/scripts)',
        description='''
Pre-authorize a break-glass action and log it to the audit trail.
Returns exit code 0 if authorized, 1 if denied.

This is designed for CI pipelines and automated scripts where you want
to validate break-glass requirements before executing commands.

Example CI usage:
  ./scripts/af/break_glass.py authorize runtime_change containerd && \\
    ssh stx-ubuntu "systemctl restart containerd"
''',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    authorize_parser.add_argument('action', help='Action type (e.g., runtime_change, package_install)')
    authorize_parser.add_argument('target', help='Target resource (e.g., containerd, nginx)')
    authorize_parser.add_argument('--rollback-command', '-r', help='Rollback command to include in audit')
    authorize_parser.add_argument('--verify-command', '-v', help='Verification command to include in audit')
    authorize_parser.add_argument('--json', action='store_true', help='Output JSON')
    authorize_parser.add_argument('--quiet', '-q', action='store_true', help='Suppress output on success')
    
    args = parser.parse_args()
    
    if args.subcommand == 'check':
        approved = check_break_glass(args.command, args.rerun)
        
        if args.json:
            result = {
                'command': args.command,
                'risk_category': get_risk_category(args.command),
                'approved': approved,
                'ci_mode': is_ci_mode(),
            }
            print(json.dumps(result))
        
        sys.exit(0 if approved else 1)
    
    elif args.subcommand == 'validate':
        # Typed action validation
        action = BreakGlassAction.from_string(args.action)
        if action is None:
            print(f"Unknown action: {args.action}", file=sys.stderr)
            print(f"Valid actions: {[a.value for a in BreakGlassAction]}", file=sys.stderr)
            sys.exit(2)
        
        validator = BreakGlassValidator()
        result = validator.validate(action, args.target)
        
        if args.json:
            print(json.dumps(result, default=str))
        else:
            if result.get('authorized'):
                print(f"✅ Break glass authorized for {args.action} on {args.target}")
                print(f"  Reason: {result.get('reason')}")
                print(f"  Risk Level: {result.get('risk_level')}")
                if result.get('remaining_seconds'):
                    print(f"  Session: {result['remaining_seconds']}s remaining")
            else:
                print(validator.format_blocked_message(result))
        
        sys.exit(0 if result.get('authorized') else 1)
    
    elif args.subcommand == 'category':
        category = get_risk_category(args.command)
        
        if args.json:
            result = {
                'command': args.command,
                'risk_category': category,
                'is_high_risk': category is not None,
                'explanation': RISK_EXPLANATIONS.get(category) if category else None,
            }
            print(json.dumps(result))
        else:
            if category:
                print(f"Risk Category: {category}")
                print(f"Explanation: {RISK_EXPLANATIONS.get(category, 'N/A')}")
            else:
                print("Command is not classified as high-risk")
        
        sys.exit(0)
    
    elif args.subcommand == 'audit':
        audit_path = get_audit_log_path()
        
        if not audit_path.exists():
            if args.json:
                print(json.dumps({'entries': [], 'total': 0}))
            else:
                print("No audit log entries found")
            sys.exit(0)
        
        # Read and filter entries
        entries = []
        with open(audit_path) as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    if args.blocked_only and entry.get('approved', False):
                        continue
                    entries.append(entry)
                except json.JSONDecodeError:
                    continue
        
        # Get last N entries
        entries = entries[-args.last:]
        
        if args.json:
            print(json.dumps({'entries': entries, 'total': len(entries)}))
        else:
            print(f"=== Break-Glass Audit Log (last {args.last} entries) ===\n")
            for entry in entries:
                status = "✓ APPROVED" if entry.get('approved') else "⛔ BLOCKED"
                print(f"[{entry.get('timestamp', 'N/A')}] {status}")
                print(f"  Command: {entry.get('command_blocked', entry.get('action', 'N/A'))}")
                print(f"  Risk: {entry.get('risk_category', entry.get('risk_level', 'N/A'))}")
                if entry.get('target'):
                    print(f"  Target: {entry.get('target')}")
                if entry.get('reason'):
                    print(f"  Reason: {entry.get('reason')}")
                if entry.get('change_ticket'):
                    print(f"  Ticket: {entry.get('change_ticket')}")
                print(f"  Operator: {entry.get('operator', 'N/A')}@{entry.get('hostname', 'N/A')}")
                print()
        
        sys.exit(0)
    
    elif args.subcommand == 'status':
        enabled, reason, change_ticket = get_break_glass_env()
        ci_mode = is_ci_mode()
        session_info = get_session_info()
        
        status = {
            'break_glass_enabled': enabled,
            'reason_set': reason is not None,
            'reason': reason,
            'change_ticket_set': change_ticket is not None,
            'change_ticket': change_ticket,
            'ci_mode': ci_mode,
            'can_execute_high_risk': enabled and reason and change_ticket,
            'audit_log_path': str(get_audit_log_path()),
            'session': session_info,
        }
        
        if args.json:
            print(json.dumps(status))
        else:
            print("=== Break-Glass Configuration Status ===\n")
            print(f"AF_BREAK_GLASS: {'✓ Enabled' if enabled else '✗ Not set'}")
            print(f"AF_BREAK_GLASS_REASON: {'✓ Set' if reason else '✗ Not set'}")
            if reason:
                print(f"  Value: {reason}")
            print(f"AF_CHANGE_TICKET: {'✓ Set' if change_ticket else '✗ Not set'}")
            if change_ticket:
                print(f"  Value: {change_ticket}")
            print(f"\nCI Mode: {'Yes' if ci_mode else 'No'}")
            print(f"Can Execute High-Risk: {'Yes ✓' if status['can_execute_high_risk'] else 'No ✗'}")
            print(f"\nSession TTL: {session_info['ttl_seconds']}s")
            if session_info.get('session_start'):
                print(f"Session Valid: {'Yes' if session_info['session_valid'] else 'No'}")
                print(f"Time Remaining: {session_info['remaining_seconds']}s")
            print(f"\nAudit Log: {status['audit_log_path']}")
        
        sys.exit(0)
    
    elif args.subcommand == 'session':
        session_info = get_session_info()
        ttl_valid, ttl_msg = check_session_ttl()
        
        session_info['ttl_message'] = ttl_msg
        session_info['is_valid'] = ttl_valid
        
        if args.json:
            print(json.dumps(session_info))
        else:
            print("=== Break-Glass Session Info ===\n")
            print(f"TTL: {session_info['ttl_seconds']}s")
            if session_info.get('session_start'):
                print(f"Session Start: {session_info['session_start']}")
                print(f"Elapsed: {session_info.get('elapsed_seconds', 0)}s")
                print(f"Remaining: {session_info['remaining_seconds']}s")
                print(f"Valid: {'Yes ✓' if session_info['session_valid'] else 'No ✗ (expired)'}")
            else:
                print("No active session (will start on first break-glass call)")
            
            if ttl_msg:
                print(f"\nStatus: {ttl_msg}")
        
        sys.exit(0)
    
    elif args.subcommand == 'actions':
        actions_list = [
            {
                'name': action.value,
                'is_high_risk': action in BreakGlassAction.high_risk_actions(),
            }
            for action in BreakGlassAction
        ]
        
        if args.json:
            print(json.dumps({
                'actions': actions_list,
                'high_risk_actions': [a.value for a in BreakGlassAction.high_risk_actions()],
            }))
        else:
            print("=== Available Break-Glass Actions ===\n")
            print("STANDARD Actions (require AF_BREAK_GLASS + REASON):")
            for action in BreakGlassAction:
                if action not in BreakGlassAction.high_risk_actions():
                    print(f"  • {action.value}")
            
            print("\nHIGH-RISK Actions (additionally require CHANGE_TICKET or CAB_APPROVAL_ID):")
            for action in BreakGlassAction.high_risk_actions():
                print(f"  ⚠️  {action.value}")
        
        sys.exit(0)
    
    elif args.subcommand == 'authorize':
        # Explicit pre-authorization for CI/scripts
        action = BreakGlassAction.from_string(args.action)
        if action is None:
            if not args.quiet:
                print(f"❌ Unknown action: {args.action}", file=sys.stderr)
                print(f"Valid actions: {[a.value for a in BreakGlassAction]}", file=sys.stderr)
            sys.exit(2)
        
        validator = BreakGlassValidator()
        result = validator.validate(action, args.target)
        
        # Add rollback/verification commands to the result if provided
        if args.rollback_command:
            result['rollback_command'] = args.rollback_command
        if args.verify_command:
            result['verification_command'] = args.verify_command
        
        # Generate rerun command for blocked operations
        if not result.get('authorized'):
            reason_placeholder = result.get('reason', '<your explanation here>')
            ticket_placeholder = result.get('change_ticket', 'CHG-YYYY-MMDD-NNN')
            
            rerun_cmd = (
                f"AF_BREAK_GLASS=1 "
                f"AF_BREAK_GLASS_REASON=\"{reason_placeholder}\" "
                f"AF_CHANGE_TICKET=\"{ticket_placeholder}\" "
                f"./scripts/af/break_glass.py authorize {args.action} {args.target}"
            )
            result['rerun_command'] = rerun_cmd
        
        if args.json:
            print(json.dumps(result, default=str))
        else:
            if result.get('authorized'):
                if not args.quiet:
                    print(f"✅ Break glass AUTHORIZED for: {args.action} on {args.target}")
                    print(f"   Reason: {result.get('reason')}")
                    print(f"   Risk Level: {result.get('risk_level')}")
                    print(f"   Ticket: {result.get('change_ticket', 'N/A')}")
                    if result.get('remaining_seconds'):
                        print(f"   Session: {result['remaining_seconds']}s remaining")
                    if args.rollback_command:
                        print(f"   Rollback: {args.rollback_command}")
                    if args.verify_command:
                        print(f"   Verify: {args.verify_command}")
            else:
                # Print detailed blocked message with rerun command
                print(f"🚫 BREAK GLASS DENIED", file=sys.stderr)
                print(f"", file=sys.stderr)
                print(f"Action: {args.action}", file=sys.stderr)
                print(f"Target: {args.target}", file=sys.stderr)
                print(f"Error: {result.get('error', 'Unknown')}", file=sys.stderr)
                print(f"", file=sys.stderr)
                
                if result.get('risk_level') == 'HIGH':
                    print(f"⚠️  HIGH-RISK ACTION - Requires change ticket or CAB approval", file=sys.stderr)
                    print(f"", file=sys.stderr)
                
                print(f"To authorize, rerun with:", file=sys.stderr)
                print(f"", file=sys.stderr)
                print(f"  {result.get('rerun_command', 'AF_BREAK_GLASS=1 ...')}", file=sys.stderr)
                print(f"", file=sys.stderr)
                
                # CI-friendly output
                if is_ci_mode():
                    print(f"::error::Break-glass denied for {args.action} on {args.target}", file=sys.stderr)
        
        sys.exit(0 if result.get('authorized') else 1)
    
    else:
        parser.print_help()
        sys.exit(2)


if __name__ == '__main__':
    main()
