#!/usr/bin/env python3
"""
Timestamp Integrity Validator
==============================

CRITICAL GAP FIX: Wholeness Framework v1 missed timestamp validation

Problem Discovered: 2026-02-11 @ 22:33 EST
- Email showed "Date: Tue, 11 Feb 2026 15:44:00 -0500" (3:44 PM)
- Actual time was 5:33 PM EST (1h 49min later)
- Wholeness framework reported 0% (missed this critical issue!)

This validator ensures TRUTH-NOW principle:
- Email timestamps must reflect ACTUAL send time
- No backdating (timestamp < now - 5min tolerance)
- No future-dating (timestamp > now + 5min tolerance)
- Litigation integrity: email metadata is evidence

Integrates with:
- Layer 1 (Circles): SEEKER role validates truth-seeking
- Layer 2 (Legal Roles): EXPERT validates evidence integrity
- Layer 4 (Software Patterns): TDD includes timestamp tests

Usage:
    from timestamp_integrity_validator import validate_email_timestamp
    
    result = validate_email_timestamp(
        email_path="/path/to/email.eml",
        tolerance_minutes=5
    )
    
    if not result['passed']:
        print(f"TIMESTAMP VIOLATION: {result['message']}")
"""

import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional
from email.utils import parsedate_to_datetime


def validate_email_timestamp(
    email_path: Path,
    tolerance_minutes: int = 5,
    current_time: Optional[datetime] = None
) -> Dict[str, any]:
    """
    Validate email timestamp integrity
    
    Args:
        email_path: Path to .eml file
        tolerance_minutes: Allowed deviation from current time (default 5 min)
        current_time: Override current time (for testing)
    
    Returns:
        {
            'passed': bool,
            'email_timestamp': datetime,
            'current_time': datetime,
            'deviation_minutes': float,
            'violation_type': str | None,  # 'BACKDATING', 'FUTURE_DATING', or None
            'message': str,
            'severity': str  # 'CRITICAL', 'WARNING', 'INFO'
        }
    """
    content = email_path.read_text(errors='ignore')
    now = current_time or datetime.now()
    
    # Extract email Date header
    date_match = re.search(r'^Date:\s*(.+)$', content, re.MULTILINE | re.IGNORECASE)
    
    if not date_match:
        return {
            'passed': False,
            'email_timestamp': None,
            'current_time': now,
            'deviation_minutes': None,
            'violation_type': 'MISSING_TIMESTAMP',
            'message': 'Email missing Date header',
            'severity': 'CRITICAL'
        }
    
    date_str = date_match.group(1).strip()
    
    try:
        # Parse email timestamp
        email_timestamp = parsedate_to_datetime(date_str)
        
        # Remove timezone awareness for comparison (assume local time)
        if email_timestamp.tzinfo:
            email_timestamp = email_timestamp.replace(tzinfo=None)
        
        # Calculate deviation
        deviation = (now - email_timestamp).total_seconds() / 60  # minutes
        
        # Check for violations
        tolerance_lower = -tolerance_minutes  # Future tolerance
        tolerance_upper = tolerance_minutes   # Past tolerance
        
        if deviation < tolerance_lower:
            # Timestamp is in the future
            return {
                'passed': False,
                'email_timestamp': email_timestamp,
                'current_time': now,
                'deviation_minutes': deviation,
                'violation_type': 'FUTURE_DATING',
                'message': f'Email dated {email_timestamp.strftime("%H:%M")} but current time is {now.strftime("%H:%M")} ({abs(deviation):.1f} min in future)',
                'severity': 'CRITICAL'
            }
        
        elif deviation > tolerance_upper:
            # Timestamp is in the past
            return {
                'passed': False,
                'email_timestamp': email_timestamp,
                'current_time': now,
                'deviation_minutes': deviation,
                'violation_type': 'BACKDATING',
                'message': f'Email dated {email_timestamp.strftime("%H:%M")} but current time is {now.strftime("%H:%M")} ({deviation:.1f} min ago)',
                'severity': 'WARNING' if deviation < 60 else 'CRITICAL'  # <1 hour = warning, >1 hour = critical
            }
        
        else:
            # Within tolerance
            return {
                'passed': True,
                'email_timestamp': email_timestamp,
                'current_time': now,
                'deviation_minutes': deviation,
                'violation_type': None,
                'message': f'Timestamp integrity OK ({email_timestamp.strftime("%H:%M")}, deviation {deviation:.1f} min)',
                'severity': 'INFO'
            }
    
    except Exception as e:
        return {
            'passed': False,
            'email_timestamp': None,
            'current_time': now,
            'deviation_minutes': None,
            'violation_type': 'PARSE_ERROR',
            'message': f'Failed to parse timestamp "{date_str}": {e}',
            'severity': 'CRITICAL'
        }


def fix_email_timestamp(email_path: Path, new_timestamp: Optional[datetime] = None) -> bool:
    """
    Fix email timestamp to current time (or specified time)
    
    Args:
        email_path: Path to .eml file
        new_timestamp: Override timestamp (default: now)
    
    Returns:
        True if fixed successfully
    """
    content = email_path.read_text(errors='ignore')
    timestamp = new_timestamp or datetime.now()
    
    # Format as RFC 2822
    timestamp_str = timestamp.strftime("%a, %d %b %Y %H:%M:%S -0500")  # EST
    
    # Replace Date header
    new_content = re.sub(
        r'^Date:\s*.+$',
        f'Date: {timestamp_str}',
        content,
        count=1,
        flags=re.MULTILINE | re.IGNORECASE
    )
    
    email_path.write_text(new_content)
    return True


# ═══════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Validate email timestamp integrity")
    parser.add_argument("email_path", type=Path, help="Path to .eml file")
    parser.add_argument("--fix", action="store_true", help="Fix timestamp to current time")
    parser.add_argument("--tolerance", type=int, default=5, help="Tolerance in minutes (default 5)")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 80)
    print("TIMESTAMP INTEGRITY VALIDATION")
    print("=" * 80)
    print()
    
    result = validate_email_timestamp(args.email_path, args.tolerance)
    
    print(f"Email:              {args.email_path}")
    print(f"Email Timestamp:    {result['email_timestamp'].strftime('%Y-%m-%d %H:%M:%S') if result['email_timestamp'] else 'N/A'}")
    print(f"Current Time:       {result['current_time'].strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Deviation:          {result['deviation_minutes']:.1f} min" if result['deviation_minutes'] is not None else "N/A")
    print(f"Violation:          {result['violation_type'] or 'None'}")
    print(f"Severity:           {result['severity']}")
    print(f"Status:             {'✅ PASS' if result['passed'] else '❌ FAIL'}")
    print()
    print(f"Message: {result['message']}")
    print()
    
    if not result['passed'] and args.fix:
        print("FIXING timestamp...")
        fix_email_timestamp(args.email_path)
        print("✅ Fixed!")
        
        # Re-validate
        result2 = validate_email_timestamp(args.email_path, args.tolerance)
        print(f"New timestamp: {result2['email_timestamp'].strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Status: {'✅ PASS' if result2['passed'] else '❌ FAIL'}")
    
    elif not result['passed']:
        print("Run with --fix to automatically correct timestamp")
    
    print()


if __name__ == "__main__":
    main()
