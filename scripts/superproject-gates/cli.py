#!/usr/bin/env python3
"""
Unified Remediation CLI - Agentic Flow

Provides a single interface for:
- Platform detection
- Kubelet diagnostics
- Remediation planning
- Execution with break glass integration

Usage:
    ./af remediate detect     - Detect platform and issues
    ./af remediate plan       - Generate remediation plan
    ./af remediate execute    - Execute with break glass
"""

import argparse
import json
import os
import sys
import subprocess
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from package_manager import PackageManagerDetector, PackageManager, RemediationStep
from kubelet_diagnosis import KubeletDiagnostics, KubeletFailureMode


class BreakGlassManager:
    """Manages break glass activation for high-risk operations"""
    
    BREAK_GLASS_SCRIPT = Path(__file__).parent.parent / "break_glass.py"
    BREAK_GLASS_HOOKS = Path(__file__).parent.parent / "break_glass_hooks.sh"
    
    def __init__(self):
        self.activated = False
        self.session_id: Optional[str] = None
        self.audit_log: List[Dict] = []
    
    def check_break_glass_active(self) -> bool:
        """Check if break glass is currently active"""
        # Check environment variable
        if os.environ.get("BREAK_GLASS_ACTIVE") == "true":
            self.activated = True
            self.session_id = os.environ.get("BREAK_GLASS_SESSION_ID")
            return True
        
        # Check break glass state file
        state_file = Path("/tmp/break_glass_state.json")
        if state_file.exists():
            try:
                with open(state_file) as f:
                    state = json.load(f)
                    if state.get("active") and state.get("expires_at"):
                        expires = datetime.fromisoformat(state["expires_at"].replace("Z", "+00:00"))
                        if expires > datetime.now(expires.tzinfo):
                            self.activated = True
                            self.session_id = state.get("session_id")
                            return True
            except Exception:
                pass
        
        return False
    
    def activate_break_glass(self, reason: str, duration_minutes: int = 30) -> bool:
        """Activate break glass mode"""
        print("\n" + "="*60)
        print("⚠️  BREAK GLASS ACTIVATION REQUIRED")
        print("="*60)
        print(f"\nReason: {reason}")
        print(f"Duration: {duration_minutes} minutes")
        print("\nThis will enable high-risk operations on this system.")
        print("All actions will be logged and audited.")
        
        # Require explicit confirmation
        try:
            response = input("\nType 'CONFIRM BREAK GLASS' to proceed: ")
            if response.strip() != "CONFIRM BREAK GLASS":
                print("\n❌ Break glass activation cancelled.")
                return False
        except (EOFError, KeyboardInterrupt):
            print("\n❌ Break glass activation cancelled.")
            return False
        
        # Generate session ID
        import hashlib
        self.session_id = hashlib.sha256(
            f"{datetime.utcnow().isoformat()}{os.getpid()}".encode()
        ).hexdigest()[:16]
        
        # Create state file
        state = {
            "active": True,
            "session_id": self.session_id,
            "activated_at": datetime.utcnow().isoformat() + "Z",
            "expires_at": (
                datetime.utcnow() + 
                __import__('datetime').timedelta(minutes=duration_minutes)
            ).isoformat() + "Z",
            "reason": reason,
            "activated_by": os.environ.get("USER", "unknown")
        }
        
        state_file = Path("/tmp/break_glass_state.json")
        try:
            with open(state_file, 'w') as f:
                json.dump(state, f, indent=2)
        except PermissionError:
            print("\n⚠️  Cannot write break glass state (permission denied)")
            print("Continuing with in-memory activation only...")
        
        # Set environment variable for child processes
        os.environ["BREAK_GLASS_ACTIVE"] = "true"
        os.environ["BREAK_GLASS_SESSION_ID"] = self.session_id
        
        self.activated = True
        
        print(f"\n✅ Break glass activated")
        print(f"   Session ID: {self.session_id}")
        print(f"   Expires: {state['expires_at']}")
        
        self._log_event("break_glass_activated", {
            "session_id": self.session_id,
            "reason": reason,
            "duration_minutes": duration_minutes
        })
        
        return True
    
    def deactivate_break_glass(self):
        """Deactivate break glass mode"""
        state_file = Path("/tmp/break_glass_state.json")
        if state_file.exists():
            try:
                state_file.unlink()
            except Exception:
                pass
        
        os.environ.pop("BREAK_GLASS_ACTIVE", None)
        os.environ.pop("BREAK_GLASS_SESSION_ID", None)
        
        self._log_event("break_glass_deactivated", {
            "session_id": self.session_id
        })
        
        self.activated = False
        self.session_id = None
        print("\n✅ Break glass deactivated")
    
    def _log_event(self, event_type: str, details: Dict):
        """Log an audit event"""
        event = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": event_type,
            "session_id": self.session_id,
            "user": os.environ.get("USER", "unknown"),
            "details": details
        }
        self.audit_log.append(event)
        
        # Write to audit log file
        audit_file = Path("/tmp/break_glass_audit.jsonl")
        try:
            with open(audit_file, 'a') as f:
                f.write(json.dumps(event) + "\n")
        except Exception:
            pass
    
    def execute_with_audit(
        self, 
        command: str, 
        description: str,
        require_break_glass: bool = False
    ) -> tuple[int, str, str]:
        """Execute a command with audit logging"""
        if require_break_glass and not self.activated:
            return -1, "", "Break glass required but not activated"
        
        self._log_event("command_execution_started", {
            "command": command,
            "description": description,
            "requires_break_glass": require_break_glass
        })
        
        start_time = time.time()
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=300
            )
            returncode = result.returncode
            stdout = result.stdout
            stderr = result.stderr
        except subprocess.TimeoutExpired:
            returncode = -1
            stdout = ""
            stderr = "Command timed out"
        except Exception as e:
            returncode = -1
            stdout = ""
            stderr = str(e)
        
        duration = time.time() - start_time
        
        self._log_event("command_execution_completed", {
            "command": command,
            "returncode": returncode,
            "duration_seconds": duration,
            "success": returncode == 0
        })
        
        return returncode, stdout, stderr


class RemediationCLI:
    """Main CLI for remediation operations"""
    
    def __init__(self):
        self.pkg_detector = PackageManagerDetector()
        self.kubelet_diag = KubeletDiagnostics()
        self.break_glass = BreakGlassManager()
    
    def detect(self, args) -> int:
        """Detect platform and issues"""
        print("\n" + "="*60)
        print("         REMEDIATION SYSTEM - DETECTION")
        print("="*60)
        
        # Detect package manager
        print("\n📦 Package Manager Detection")
        print("-"*40)
        pm = self.pkg_detector.detect()
        os_info = self.pkg_detector.get_os_info()
        
        print(f"Detected: {pm.value}")
        if os_info.get("PRETTY_NAME"):
            print(f"OS: {os_info['PRETTY_NAME']}")
        elif os_info.get("ProductName"):
            print(f"OS: {os_info['ProductName']} {os_info.get('ProductVersion', '')}")
        
        commands = self.pkg_detector.get_commands()
        if commands:
            print(f"\nPackage Commands:")
            print(f"  Install: {commands.install}")
            print(f"  Remove:  {commands.remove}")
            print(f"  Update:  {commands.update}")
        
        # Run kubelet diagnostics
        print("\n🔍 Kubelet Diagnostics")
        print("-"*40)
        
        results = self.kubelet_diag.run_full_diagnosis()
        plan = self.kubelet_diag.generate_remediation_plan()
        
        if plan['status'] == 'healthy':
            print("✅ All checks passed")
        else:
            summary = plan['summary']
            print(f"Issues Found: {summary['total_issues']}")
            print(f"  🔴 Critical: {summary['critical']}")
            print(f"  🟠 High:     {summary['high']}")
            print(f"  🟡 Medium:   {summary['medium']}")
            print(f"  🟢 Low:      {summary['low']}")
        
        if args.json:
            output = {
                "package_manager": {
                    "detected": pm.value,
                    "os_info": os_info,
                    "commands": commands.to_dict() if commands else None
                },
                "kubelet_diagnosis": plan
            }
            print("\n" + json.dumps(output, indent=2))
        
        return 0 if plan['status'] == 'healthy' else 1
    
    def plan(self, args) -> int:
        """Generate remediation plan"""
        print("\n" + "="*60)
        print("         REMEDIATION PLAN")
        print("="*60)
        
        # Run diagnostics
        self.kubelet_diag.run_full_diagnosis()
        plan = self.kubelet_diag.generate_remediation_plan()
        
        if plan['status'] == 'healthy':
            print("\n✅ No issues detected. System appears healthy.")
            if args.json:
                print(json.dumps(plan, indent=2))
            return 0
        
        # Add package manager context to plan
        pm = self.pkg_detector.detect()
        plan['package_manager'] = pm.value
        
        if args.json:
            print(json.dumps(plan, indent=2))
            return 0
        
        # Pretty print the plan
        summary = plan['summary']
        print(f"\nGenerated: {plan.get('timestamp', 'N/A')}")
        print(f"Package Manager: {pm.value}")
        print(f"\nSummary:")
        print(f"  Total Issues: {summary['total_issues']}")
        print(f"  Critical:     {summary['critical']}")
        print(f"  High:         {summary['high']}")
        print(f"  Break Glass:  {'Required' if summary['break_glass_required'] else 'Not Required'}")
        
        print("\n" + "-"*60)
        print("                    ISSUES")
        print("-"*60)
        
        for i, issue in enumerate(plan['issues'], 1):
            severity_colors = {
                "critical": "🔴",
                "high": "🟠",
                "medium": "🟡",
                "low": "🟢"
            }
            icon = severity_colors.get(issue['severity'], "⚪")
            
            print(f"\n{i}. {icon} [{issue['severity'].upper()}] {issue['failure_mode']}")
            print(f"   {issue['description']}")
            
            print("\n   Steps:")
            for step in issue['remediation_steps']:
                bg_icon = " 🔐" if step['requires_break_glass'] else ""
                print(f"   {step['order']}. {step['description']}{bg_icon}")
                print(f"      $ {step['command']}")
                if step['rollback']:
                    print(f"      ↩ {step['rollback']}")
                print(f"      ⏱  {step['duration']}")
        
        print("\n" + "="*60)
        print("\nTo execute this plan, run:")
        print("  ./af remediate execute")
        if summary['break_glass_required']:
            print("\n⚠️  Break glass activation will be required")
        
        # Save plan to file for execution
        plan_file = Path("/tmp/remediation_plan.json")
        with open(plan_file, 'w') as f:
            json.dump(plan, f, indent=2)
        print(f"\nPlan saved to: {plan_file}")
        
        return 0
    
    def execute(self, args) -> int:
        """Execute remediation plan with break glass"""
        print("\n" + "="*60)
        print("         REMEDIATION EXECUTION")
        print("="*60)
        
        # Load plan
        plan_file = Path("/tmp/remediation_plan.json")
        if not plan_file.exists():
            # Generate fresh plan
            print("\nNo saved plan found. Generating new plan...")
            self.kubelet_diag.run_full_diagnosis()
            plan = self.kubelet_diag.generate_remediation_plan()
        else:
            with open(plan_file) as f:
                plan = json.load(f)
        
        if plan['status'] == 'healthy':
            print("\n✅ No issues to remediate.")
            return 0
        
        summary = plan['summary']
        
        # Show what we're about to do
        print(f"\nAbout to execute remediation for {summary['total_issues']} issue(s)")
        print(f"  Critical: {summary['critical']}")
        print(f"  High:     {summary['high']}")
        
        if args.dry_run:
            print("\n[DRY RUN] Would execute the following commands:\n")
            for issue in plan['issues']:
                print(f"Issue: {issue['failure_mode']}")
                for step in issue['remediation_steps']:
                    bg = " [REQUIRES BREAK GLASS]" if step['requires_break_glass'] else ""
                    print(f"  {step['order']}. {step['command']}{bg}")
                print()
            return 0
        
        # Check if break glass is needed
        if summary['break_glass_required']:
            if not self.break_glass.check_break_glass_active():
                print("\n⚠️  This plan requires break glass activation.")
                if not self.break_glass.activate_break_glass(
                    reason=f"Remediation execution for {summary['total_issues']} issues",
                    duration_minutes=args.break_glass_duration
                ):
                    return 1
        
        # Execute each step
        success_count = 0
        fail_count = 0
        skipped_count = 0
        
        for issue in plan['issues']:
            print(f"\n{'='*50}")
            print(f"Remediating: {issue['failure_mode']}")
            print(f"{'='*50}")
            
            for step in issue['remediation_steps']:
                print(f"\nStep {step['order']}: {step['description']}")
                print(f"Command: {step['command']}")
                
                if step['requires_break_glass'] and not self.break_glass.activated:
                    print("⏭️  Skipped (requires break glass)")
                    skipped_count += 1
                    continue
                
                if not args.yes:
                    try:
                        response = input("Execute? [y/N/s(kip)/q(uit)]: ").strip().lower()
                        if response == 'q':
                            print("\n❌ Execution cancelled by user")
                            break
                        if response == 's':
                            print("⏭️  Skipped by user")
                            skipped_count += 1
                            continue
                        if response not in ['y', 'yes']:
                            print("⏭️  Skipped")
                            skipped_count += 1
                            continue
                    except (EOFError, KeyboardInterrupt):
                        print("\n❌ Execution cancelled")
                        break
                
                # Execute the command
                print(f"Executing...")
                returncode, stdout, stderr = self.break_glass.execute_with_audit(
                    step['command'],
                    step['description'],
                    step['requires_break_glass']
                )
                
                if returncode == 0:
                    print("✅ Success")
                    if stdout:
                        print(f"Output:\n{stdout[:500]}")
                    success_count += 1
                else:
                    print(f"❌ Failed (exit code: {returncode})")
                    if stderr:
                        print(f"Error:\n{stderr[:500]}")
                    fail_count += 1
                    
                    # Ask about rollback
                    if step['rollback']:
                        print(f"\nRollback available: {step['rollback']}")
                        if not args.yes:
                            try:
                                response = input("Execute rollback? [y/N]: ").strip().lower()
                                if response in ['y', 'yes']:
                                    print("Rolling back...")
                                    rb_ret, rb_out, rb_err = self.break_glass.execute_with_audit(
                                        step['rollback'],
                                        f"Rollback: {step['description']}",
                                        step['requires_break_glass']
                                    )
                                    if rb_ret == 0:
                                        print("✅ Rollback successful")
                                    else:
                                        print(f"❌ Rollback failed: {rb_err}")
                            except (EOFError, KeyboardInterrupt):
                                pass
                    
                    if not args.continue_on_error:
                        print("\n⛔ Stopping execution due to error")
                        print("Use --continue-on-error to continue despite failures")
                        break
        
        # Summary
        print("\n" + "="*60)
        print("         EXECUTION SUMMARY")
        print("="*60)
        print(f"\n✅ Successful: {success_count}")
        print(f"❌ Failed:     {fail_count}")
        print(f"⏭️  Skipped:   {skipped_count}")
        
        # Deactivate break glass if we activated it
        if self.break_glass.activated and not args.keep_break_glass:
            self.break_glass.deactivate_break_glass()
        
        # Clean up plan file
        if plan_file.exists() and not args.keep_plan:
            plan_file.unlink()
        
        return 0 if fail_count == 0 else 1
    
    def rollback(self, args) -> int:
        """Execute rollback for a specific issue"""
        print("\n" + "="*60)
        print("         REMEDIATION ROLLBACK")
        print("="*60)
        
        # Load plan
        plan_file = Path("/tmp/remediation_plan.json")
        if not plan_file.exists():
            print("\n❌ No remediation plan found. Generate one first with 'plan' command.")
            return 1
        
        with open(plan_file) as f:
            plan = json.load(f)
        
        # Find the issue to rollback
        target_issue = None
        for issue in plan['issues']:
            if issue['failure_mode'] == args.issue or args.issue in issue['description']:
                target_issue = issue
                break
        
        if not target_issue:
            print(f"\n❌ Issue not found: {args.issue}")
            print("\nAvailable issues:")
            for issue in plan['issues']:
                print(f"  - {issue['failure_mode']}")
            return 1
        
        print(f"\nRolling back: {target_issue['failure_mode']}")
        
        # Execute rollback commands in reverse order
        steps_with_rollback = [
            s for s in target_issue['remediation_steps'] 
            if s['rollback']
        ]
        
        if not steps_with_rollback:
            print("\n⚠️  No rollback commands available for this issue")
            return 1
        
        for step in reversed(steps_with_rollback):
            print(f"\nRollback: {step['description']}")
            print(f"Command: {step['rollback']}")
            
            if not args.yes:
                try:
                    response = input("Execute? [y/N]: ").strip().lower()
                    if response not in ['y', 'yes']:
                        print("⏭️  Skipped")
                        continue
                except (EOFError, KeyboardInterrupt):
                    print("\n❌ Rollback cancelled")
                    return 1
            
            returncode, stdout, stderr = self.break_glass.execute_with_audit(
                step['rollback'],
                f"Rollback: {step['description']}",
                step['requires_break_glass']
            )
            
            if returncode == 0:
                print("✅ Success")
            else:
                print(f"❌ Failed: {stderr}")
        
        print("\n✅ Rollback complete")
        return 0
    
    def status(self, args) -> int:
        """Show current remediation status"""
        print("\n" + "="*60)
        print("         REMEDIATION STATUS")
        print("="*60)
        
        # Check break glass status
        print("\n🔐 Break Glass Status")
        print("-"*40)
        if self.break_glass.check_break_glass_active():
            print(f"Status: ACTIVE")
            print(f"Session: {self.break_glass.session_id}")
            
            # Show expiry
            state_file = Path("/tmp/break_glass_state.json")
            if state_file.exists():
                with open(state_file) as f:
                    state = json.load(f)
                    print(f"Expires: {state.get('expires_at', 'Unknown')}")
                    print(f"Reason: {state.get('reason', 'Unknown')}")
        else:
            print("Status: INACTIVE")
        
        # Check for existing plan
        print("\n📋 Remediation Plan")
        print("-"*40)
        plan_file = Path("/tmp/remediation_plan.json")
        if plan_file.exists():
            with open(plan_file) as f:
                plan = json.load(f)
            print(f"Status: PENDING")
            print(f"Generated: {plan.get('timestamp', 'Unknown')}")
            print(f"Issues: {plan['summary']['total_issues']}")
        else:
            print("Status: No pending plan")
        
        # Quick health check
        print("\n🏥 Quick Health Check")
        print("-"*40)
        self.kubelet_diag.run_full_diagnosis()
        plan = self.kubelet_diag.generate_remediation_plan()
        
        if plan['status'] == 'healthy':
            print("System: HEALTHY ✅")
        else:
            print(f"System: NEEDS ATTENTION ⚠️")
            print(f"Issues: {plan['summary']['total_issues']}")
        
        # Audit log
        print("\n📝 Recent Audit Events")
        print("-"*40)
        audit_file = Path("/tmp/break_glass_audit.jsonl")
        if audit_file.exists():
            with open(audit_file) as f:
                lines = f.readlines()
                for line in lines[-5:]:
                    try:
                        event = json.loads(line)
                        print(f"  {event['timestamp']}: {event['event_type']}")
                    except json.JSONDecodeError:
                        pass
        else:
            print("  No audit events recorded")
        
        if args.json:
            output = {
                "break_glass": {
                    "active": self.break_glass.activated,
                    "session_id": self.break_glass.session_id
                },
                "pending_plan": plan_file.exists(),
                "health": plan
            }
            print("\n" + json.dumps(output, indent=2))
        
        return 0


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Agentic Flow Remediation System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s detect              # Detect platform and issues
  %(prog)s detect --json       # Output as JSON
  %(prog)s plan                # Generate remediation plan
  %(prog)s plan --json         # Output plan as JSON
  %(prog)s execute             # Execute plan interactively
  %(prog)s execute -y          # Execute without prompts
  %(prog)s execute --dry-run   # Show what would be executed
  %(prog)s rollback <issue>    # Rollback a specific issue
  %(prog)s status              # Show current status
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Detect command
    detect_parser = subparsers.add_parser(
        "detect",
        help="Detect platform and issues"
    )
    detect_parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON"
    )
    
    # Plan command
    plan_parser = subparsers.add_parser(
        "plan",
        help="Generate remediation plan"
    )
    plan_parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON"
    )
    plan_parser.add_argument(
        "--severity",
        choices=["critical", "high", "medium", "low"],
        help="Filter by minimum severity"
    )
    
    # Execute command
    execute_parser = subparsers.add_parser(
        "execute",
        help="Execute remediation plan"
    )
    execute_parser.add_argument(
        "-y", "--yes",
        action="store_true",
        help="Auto-confirm all prompts"
    )
    execute_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be executed without running"
    )
    execute_parser.add_argument(
        "--continue-on-error",
        action="store_true",
        help="Continue execution even if a step fails"
    )
    execute_parser.add_argument(
        "--break-glass-duration",
        type=int,
        default=30,
        help="Break glass duration in minutes (default: 30)"
    )
    execute_parser.add_argument(
        "--keep-break-glass",
        action="store_true",
        help="Don't deactivate break glass after execution"
    )
    execute_parser.add_argument(
        "--keep-plan",
        action="store_true",
        help="Keep plan file after execution"
    )
    
    # Rollback command
    rollback_parser = subparsers.add_parser(
        "rollback",
        help="Rollback remediation for an issue"
    )
    rollback_parser.add_argument(
        "issue",
        help="Issue identifier or description to rollback"
    )
    rollback_parser.add_argument(
        "-y", "--yes",
        action="store_true",
        help="Auto-confirm all prompts"
    )
    
    # Status command
    status_parser = subparsers.add_parser(
        "status",
        help="Show current remediation status"
    )
    status_parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON"
    )
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    cli = RemediationCLI()
    
    command_map = {
        "detect": cli.detect,
        "plan": cli.plan,
        "execute": cli.execute,
        "rollback": cli.rollback,
        "status": cli.status
    }
    
    try:
        return command_map[args.command](args)
    except KeyboardInterrupt:
        print("\n\n❌ Operation cancelled by user")
        return 130
    except Exception as e:
        print(f"\n❌ Error: {e}")
        if os.environ.get("DEBUG"):
            import traceback
            traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
