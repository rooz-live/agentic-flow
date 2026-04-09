#!/usr/bin/env python3
"""
ROAM Staleness Checker
Validates that .goalie/ROAM_TRACKER.yaml is updated within max age threshold.
Integrates with CI/CD to enforce TRUTH dimension - direct measurement of system state.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML not installed. Run: pip install pyyaml")
    sys.exit(1)

try:
    from dateutil import parser as date_parser
except ImportError:
    print("ERROR: python-dateutil not installed. Run: pip install python-dateutil")
    sys.exit(1)


class ROAMStalenessChecker:
    """Checks ROAM tracker freshness and identifies stale entries."""
    
    def __init__(self, roam_path: Path, max_age_days: int = 3):
        self.roam_path = roam_path
        self.max_age_days = max_age_days
        self.now = datetime.now(timezone.utc)
        
    def load_roam_tracker(self) -> Optional[Dict]:
        """Load ROAM_TRACKER.yaml file."""
        if not self.roam_path.exists():
            print(f"ERROR: ROAM tracker not found at {self.roam_path}")
            return None
            
        try:
            with open(self.roam_path, 'r') as f:
                data = yaml.safe_load(f)
            return data
        except Exception as e:
            print(f"ERROR: Failed to parse ROAM tracker: {e}")
            return None
            
    def parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string to datetime object."""
        try:
            # Try ISO format first
            dt = date_parser.parse(date_str)
            # Ensure timezone aware
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception as e:
            print(f"WARNING: Could not parse date '{date_str}': {e}")
            return None
            
    def calculate_age_days(self, date_str: str) -> Optional[float]:
        """Calculate age in days from date string to now."""
        dt = self.parse_date(date_str)
        if not dt:
            return None
        delta = self.now - dt
        return delta.total_seconds() / 86400  # Convert to days
        
    def check_metadata_freshness(self, roam_data: Dict) -> Dict:
        """Check if ROAM metadata last_updated is within threshold."""
        metadata = roam_data.get('metadata', {})
        last_updated = metadata.get('last_updated') or roam_data.get('last_updated')
        
        if not last_updated:
            return {
                'fresh': False,
                'age_days': None,
                'last_updated': None,
                'reason': 'No last_updated field in metadata'
            }
            
        age_days = self.calculate_age_days(last_updated)
        
        if age_days is None:
            return {
                'fresh': False,
                'age_days': None,
                'last_updated': last_updated,
                'reason': 'Could not parse last_updated date'
            }
            
        fresh = age_days <= self.max_age_days
        
        return {
            'fresh': fresh,
            'age_days': age_days,
            'last_updated': last_updated,
            'reason': 'Fresh' if fresh else f'Stale: {age_days:.1f} days > {self.max_age_days} days'
        }
        
    def find_stale_entries(self, roam_data: Dict) -> List[Dict]:
        """Find individual ROAM entries that haven't been updated."""
        stale_entries = []
        
        # Check blockers
        for blocker in roam_data.get('blockers', []):
            age = None
            date_field = None
            
            # Check resolution_date for RESOLVED items
            if blocker.get('roam_status') == 'RESOLVED':
                resolution_date = blocker.get('resolution_date')
                if resolution_date:
                    age = self.calculate_age_days(resolution_date)
                    date_field = 'resolution_date'
            
            # Check discovered date if not resolved
            if age is None:
                discovered = blocker.get('discovered')
                if discovered:
                    age = self.calculate_age_days(discovered)
                    date_field = 'discovered'
            
            # Check last_updated if available
            last_updated = blocker.get('last_updated')
            if last_updated:
                update_age = self.calculate_age_days(last_updated)
                if age is None or (update_age is not None and update_age < age):
                    age = update_age
                    date_field = 'last_updated'
            
            # Entry is stale if not updated and status is not RESOLVED
            if age and age > self.max_age_days and blocker.get('roam_status') != 'RESOLVED':
                stale_entries.append({
                    'id': blocker.get('id', 'UNKNOWN'),
                    'title': blocker.get('title', 'No title'),
                    'roam_status': blocker.get('roam_status', 'UNKNOWN'),
                    'owner': blocker.get('owner', 'unassigned'),
                    'age_days': age,
                    'date_field': date_field,
                    'category': 'blocker'
                })
        
        # Check dependencies
        for dep in roam_data.get('dependencies', []):
            discovered = dep.get('discovered')
            if discovered:
                age = self.calculate_age_days(discovered)
                if age and age > self.max_age_days and dep.get('status') != 'resolved':
                    stale_entries.append({
                        'id': dep.get('id', 'UNKNOWN'),
                        'title': dep.get('title', 'No title'),
                        'roam_status': dep.get('status', 'UNKNOWN'),
                        'owner': dep.get('owner', 'unassigned'),
                        'age_days': age,
                        'date_field': 'discovered',
                        'category': 'dependency'
                    })
        
        # Check risks
        for risk in roam_data.get('risks', []):
            discovered = risk.get('discovered')
            if discovered:
                age = self.calculate_age_days(discovered)
                if age and age > self.max_age_days and risk.get('status') not in ['mitigated', 'accepted']:
                    stale_entries.append({
                        'id': risk.get('id', 'UNKNOWN'),
                        'title': risk.get('title', 'No title'),
                        'roam_status': risk.get('status', 'UNKNOWN'),
                        'owner': risk.get('owner', 'unassigned'),
                        'age_days': age,
                        'date_field': 'discovered',
                        'category': 'risk'
                    })
        
        return stale_entries
        
    def check(self) -> Dict:
        """Perform complete ROAM staleness check."""
        roam_data = self.load_roam_tracker()
        
        if not roam_data:
            return {
                'success': False,
                'status': 'ERROR',
                'reason': 'Could not load ROAM tracker',
                'age_days': None,
                'max_age_days': self.max_age_days
            }
            
        freshness = self.check_metadata_freshness(roam_data)
        stale_entries = self.find_stale_entries(roam_data)
        
        success = freshness['fresh'] and len(stale_entries) == 0
        
        return {
            'success': success,
            'status': 'FRESH' if success else 'STALE',
            'age_days': freshness['age_days'],
            'last_updated': freshness['last_updated'],
            'max_age_days': self.max_age_days,
            'reason': freshness['reason'],
            'stale_entries': stale_entries,
            'stale_count': len(stale_entries),
            'checked_at': self.now.isoformat()
        }


def main():
    parser = argparse.ArgumentParser(
        description='Check ROAM tracker staleness for CI/CD enforcement'
    )
    parser.add_argument(
        '--roam-path',
        default='.goalie/ROAM_TRACKER.yaml',
        help='Path to ROAM tracker file (default: .goalie/ROAM_TRACKER.yaml)'
    )
    parser.add_argument(
        '--max-age-days',
        type=int,
        default=3,
        help='Maximum age in days before ROAM is considered stale (default: 3)'
    )
    parser.add_argument(
        '--output',
        choices=['text', 'json', 'github'],
        default='text',
        help='Output format (default: text)'
    )
    parser.add_argument(
        '--report-file',
        default='.goalie/roam_staleness_report.json',
        help='Path to write JSON report for GitHub Actions (default: .goalie/roam_staleness_report.json)'
    )
    
    args = parser.parse_args()
    
    roam_path = Path(args.roam_path)
    checker = ROAMStalenessChecker(roam_path, args.max_age_days)
    result = checker.check()
    
    # Write report file for GitHub Actions
    if args.output == 'github':
        report_path = Path(args.report_file)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        with open(report_path, 'w') as f:
            json.dump(result, f, indent=2)
    
    # Output results
    if args.output == 'json':
        print(json.dumps(result, indent=2))
    elif args.output == 'github':
        # GitHub Actions format
        if result['success']:
            print(f"✅ ROAM tracker is FRESH")
            print(f"   Last updated: {result['last_updated']}")
            print(f"   Age: {result['age_days']:.1f} days (max: {result['max_age_days']})")
        else:
            print(f"❌ ROAM tracker is STALE")
            print(f"   Last updated: {result['last_updated']}")
            print(f"   Age: {result['age_days']:.1f} days (max: {result['max_age_days']})")
            if result['stale_entries']:
                print(f"   Stale entries: {result['stale_count']}")
                for entry in result['stale_entries'][:5]:  # Show first 5
                    print(f"     - {entry['id']}: {entry['title']} ({entry['age_days']:.1f} days)")
    else:
        # Text format
        print("=" * 70)
        print("ROAM STALENESS CHECK")
        print("=" * 70)
        print(f"Status: {result['status']}")
        print(f"Last Updated: {result.get('last_updated', 'N/A')}")
        if result.get('age_days') is not None:
            print(f"Age: {result['age_days']:.1f} days")
        print(f"Max Age: {result.get('max_age_days', 3)} days")
        print(f"Reason: {result.get('reason', 'unknown')}")
        
        if result.get('stale_entries'):
            print(f"\nStale Entries ({result['stale_count']}):")
            for entry in result['stale_entries']:
                print(f"  - {entry['id']}: {entry['title']}")
                print(f"    Status: {entry['roam_status']}, Age: {entry['age_days']:.1f} days")
                print(f"    Owner: {entry['owner']}, Category: {entry['category']}")
        
        print("\n" + "=" * 70)
        if result['success']:
            print("✅ ROAM tracker is fresh and up to date")
        else:
            print("❌ ROAM tracker requires updates")
        print("=" * 70)
    
    # Exit with appropriate code
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
