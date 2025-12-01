#!/usr/bin/env python3
"""
User Feedback Collector for Discord Bot Testing (BUFFER-2)

Implements acceptance criteria:
- Collect feedback via form or Discord channel
- Document feedback in logs/user_feedback.jsonl
- Track user testing participation

Usage:
    python3 scripts/user_feedback_collector.py --help
    python3 scripts/user_feedback_collector.py collect --user "user@example.com" --feature "portfolio" --rating 5 --feedback "Great feature!"
    python3 scripts/user_feedback_collector.py list --last 10
    python3 scripts/user_feedback_collector.py report
    python3 scripts/user_feedback_collector.py top-requests --limit 3
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from collections import Counter
from typing import Optional

FEEDBACK_FILE = Path(__file__).parent.parent / "logs" / "user_feedback.jsonl"
FEATURES = ["portfolio", "earnings", "scan", "status", "blockers", "alerts", "analyze", "other"]

def ensure_logs_dir():
    """Ensure logs directory exists."""
    FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)

def collect_feedback(user: str, feature: str, rating: int, feedback: str, 
                     feature_request: Optional[str] = None, bug_report: Optional[str] = None) -> dict:
    """Collect and store user feedback."""
    ensure_logs_dir()
    
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user": user,
        "feature_tested": feature,
        "rating": rating,  # 1-5 scale
        "feedback": feedback,
        "feature_request": feature_request,
        "bug_report": bug_report,
        "session_id": f"test-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    }
    
    with open(FEEDBACK_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")
    
    print(f"✅ Feedback collected from {user} for {feature} (rating: {rating}/5)")
    return entry

def list_feedback(last_n: int = 10) -> list:
    """List recent feedback entries."""
    if not FEEDBACK_FILE.exists():
        print("No feedback collected yet.")
        return []
    
    entries = []
    with open(FEEDBACK_FILE, "r") as f:
        for line in f:
            if line.strip():
                entries.append(json.loads(line))
    
    recent = entries[-last_n:] if last_n else entries
    
    print(f"\n📋 Last {len(recent)} Feedback Entries:")
    print("-" * 60)
    for entry in recent:
        print(f"[{entry['timestamp'][:16]}] {entry['user']}")
        print(f"  Feature: {entry['feature_tested']} | Rating: {'⭐' * entry['rating']}")
        print(f"  Feedback: {entry['feedback'][:80]}...")
        if entry.get('feature_request'):
            print(f"  📝 Request: {entry['feature_request'][:60]}...")
        print()
    
    return recent

def generate_report() -> dict:
    """Generate user testing and feedback report."""
    if not FEEDBACK_FILE.exists():
        print("No feedback collected yet.")
        return {}
    
    entries = []
    with open(FEEDBACK_FILE, "r") as f:
        for line in f:
            if line.strip():
                entries.append(json.loads(line))
    
    unique_users = set(e['user'] for e in entries)
    feature_ratings = Counter()
    feature_counts = Counter()
    requests = []
    bugs = []
    
    for e in entries:
        feature_counts[e['feature_tested']] += 1
        feature_ratings[e['feature_tested']] += e['rating']
        if e.get('feature_request'):
            requests.append(e['feature_request'])
        if e.get('bug_report'):
            bugs.append(e['bug_report'])
    
    avg_ratings = {f: feature_ratings[f] / feature_counts[f] for f in feature_counts}
    
    report = {
        "report_date": datetime.now(timezone.utc).isoformat(),
        "total_feedback_entries": len(entries),
        "unique_users": len(unique_users),
        "users": list(unique_users),
        "features_tested": dict(feature_counts),
        "average_ratings": avg_ratings,
        "overall_avg_rating": sum(e['rating'] for e in entries) / len(entries) if entries else 0,
        "feature_requests": requests,
        "bug_reports": bugs,
        "acceptance_criteria": {
            "min_5_users_tested": len(unique_users) >= 5,
            "feedback_collected": len(entries) > 0,
            "users_count": len(unique_users)
        }
    }
    
    print("\n📊 User Feedback Report")
    print("=" * 60)
    print(f"Total Feedback Entries: {report['total_feedback_entries']}")
    print(f"Unique Users: {report['unique_users']} {'✅' if report['unique_users'] >= 5 else '⚠️ (need 5)'}")
    print(f"Overall Avg Rating: {report['overall_avg_rating']:.1f}/5")
    print(f"\nFeatures Tested:")
    for f, c in feature_counts.most_common():
        print(f"  - {f}: {c} tests (avg rating: {avg_ratings[f]:.1f})")
    print(f"\nFeature Requests: {len(requests)}")
    print(f"Bug Reports: {len(bugs)}")
    
    return report

def top_requests(limit: int = 3) -> list:
    """Get top feature requests for implementation."""
    if not FEEDBACK_FILE.exists():
        print("No feedback collected yet.")
        return []
    
    requests = []
    with open(FEEDBACK_FILE, "r") as f:
        for line in f:
            if line.strip():
                e = json.loads(line)
                if e.get('feature_request'):
                    requests.append(e['feature_request'])
    
    request_counts = Counter(requests)
    top = request_counts.most_common(limit)
    
    print(f"\n🎯 Top {limit} Feature Requests (for implementation):")
    print("-" * 60)
    for i, (req, count) in enumerate(top, 1):
        print(f"{i}. ({count} requests) {req}")
    
    return [req for req, _ in top]

def main():
    parser = argparse.ArgumentParser(
        description="User Feedback Collector for Discord Bot Testing (BUFFER-2)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s collect --user "alice@test.com" --feature portfolio --rating 5 --feedback "Love it!"
  %(prog)s collect --user "bob@test.com" --feature scan --rating 4 --feedback "Good" --request "Add filters"
  %(prog)s list --last 5
  %(prog)s report
  %(prog)s top-requests --limit 3
        """
    )
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    collect_p = subparsers.add_parser("collect", help="Collect user feedback")
    collect_p.add_argument("--user", required=True, help="User email or identifier")
    collect_p.add_argument("--feature", required=True, choices=FEATURES, help="Feature tested")
    collect_p.add_argument("--rating", type=int, required=True, choices=[1,2,3,4,5], help="Rating 1-5")
    collect_p.add_argument("--feedback", required=True, help="Feedback text")
    collect_p.add_argument("--request", help="Feature request (optional)")
    collect_p.add_argument("--bug", help="Bug report (optional)")
    
    list_p = subparsers.add_parser("list", help="List recent feedback")
    list_p.add_argument("--last", type=int, default=10, help="Number of entries to show")
    
    subparsers.add_parser("report", help="Generate feedback report")
    
    top_p = subparsers.add_parser("top-requests", help="Show top feature requests")
    top_p.add_argument("--limit", type=int, default=3, help="Number of requests to show")
    
    args = parser.parse_args()
    
    if args.command == "collect":
        collect_feedback(args.user, args.feature, args.rating, args.feedback, args.request, args.bug)
    elif args.command == "list":
        list_feedback(args.last)
    elif args.command == "report":
        generate_report()
    elif args.command == "top-requests":
        top_requests(args.limit)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()

