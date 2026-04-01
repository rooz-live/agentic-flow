#!/usr/bin/env python3
"""
Retro approval command for autocommit graduation.

@business-context WSJF-1
@adr ADR-005
@constraint R-2026-016
@planned-change R-2026-018
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional


def load_approval_log() -> Dict[str, Any]:
    """Load the approval log from .goalie/approval_log.jsonl."""
    approval_file = Path(".goalie/approval_log.jsonl")
    approvals = []
    
    if approval_file.exists():
        with open(approval_file, 'r') as f:
            for line in f:
                if line.strip():
                    approvals.append(json.loads(line))
    
    return {"approvals": approvals}


def save_approval(approval_type: str, run_id: str, approver: str, comment: str = "") -> None:
    """Save an approval to the approval log."""
    approval_file = Path(".goalie/approval_log.jsonl")
    approval_file.parent.mkdir(exist_ok=True)
    
    approval = {
        "timestamp": datetime.now().isoformat(),
        "type": approval_type,
        "run_id": run_id,
        "approver": approver,
        "comment": comment,
        "status": "approved"
    }
    
    with open(approval_file, 'a') as f:
        f.write(json.dumps(approval) + '\n')
    
    print(f"✅ Approval recorded: {approval_type} for run {run_id}")


def check_approval(approval_type: str, run_id: Optional[str] = None) -> bool:
    """Check if an approval exists."""
    log = load_approval_log()
    
    for approval in log["approvals"]:
        if approval["type"] == approval_type:
            if run_id is None or approval.get("run_id") == run_id:
                return True
    
    return False


def list_approvals(approval_type: Optional[str] = None) -> None:
    """List all approvals or filter by type."""
    log = load_approval_log()
    
    if not log["approvals"]:
        print("No approvals found.")
        return
    
    print("\n" + "=" * 80)
    print("RETRO APPROVALS")
    print("=" * 80)
    
    for approval in log["approvals"]:
        if approval_type and approval["type"] != approval_type:
            continue
        
        print(f"\nType: {approval['type']}")
        print(f"Run ID: {approval.get('run_id', 'N/A')}")
        print(f"Approver: {approval['approver']}")
        print(f"Timestamp: {approval['timestamp']}")
        print(f"Comment: {approval.get('comment', 'None')}")
        print(f"Status: {approval['status']}")


def main():
    parser = argparse.ArgumentParser(description="Retro approval management")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Approve command
    approve_parser = subparsers.add_parser('approve', help='Approve a retro item')
    approve_parser.add_argument('type', help='Approval type (e.g., autocommit)')
    approve_parser.add_argument('--run-id', help='Associated run ID')
    approve_parser.add_argument('--approver', default='user', help='Approver name')
    approve_parser.add_argument('--comment', default='', help='Approval comment')
    
    # Check command
    check_parser = subparsers.add_parser('check', help='Check if approval exists')
    check_parser.add_argument('type', help='Approval type to check')
    check_parser.add_argument('--run-id', help='Specific run ID to check')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List approvals')
    list_parser.add_argument('--type', help='Filter by approval type')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    if args.command == 'approve':
        save_approval(args.type, args.run_id or '', args.approver, args.comment)
    
    elif args.command == 'check':
        approved = check_approval(args.type, args.run_id)
        if approved:
            print(f"✅ Approval found for {args.type}")
            sys.exit(0)
        else:
            print(f"❌ No approval found for {args.type}")
            sys.exit(1)
    
    elif args.command == 'list':
        list_approvals(getattr(args, 'type', None))


if __name__ == "__main__":
    main()
