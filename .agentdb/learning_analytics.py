#!/usr/bin/env python3
"""
learning_analytics.py - Analytics for Build-Measure-Learn Cycle

Provides insights from learning events captured by execute_with_lean_learning.py

Usage:
    python3 .agentdb/learning_analytics.py --summary
    python3 .agentdb/learning_analytics.py --command git
    python3 .agentdb/learning_analytics.py --beam-report
"""

import argparse
import json
import sqlite3
from collections import defaultdict
from pathlib import Path
from typing import Dict, List


class LearningAnalytics:
    def __init__(self, repo_root: Path = None):
        if repo_root is None:
            repo_root = Path(__file__).parent.parent
        
        self.agentdb_path = repo_root / ".agentdb" / "agentdb.sqlite"
    
    def get_summary(self) -> Dict:
        """Get overall learning summary."""
        conn = sqlite3.connect(self.agentdb_path)
        cursor = conn.cursor()
        
        # Overall stats
        cursor.execute("""
            SELECT 
                COUNT(*) as total_events,
                SUM(CASE WHEN verdict = 'success' THEN 1 ELSE 0 END) as successes,
                SUM(CASE WHEN verdict = 'failure' THEN 1 ELSE 0 END) as failures,
                AVG(duration_ms) as avg_duration_ms,
                MIN(timestamp) as first_event,
                MAX(timestamp) as last_event
            FROM learning_events
        """)
        
        row = cursor.fetchone()
        
        # Top commands
        cursor.execute("""
            SELECT command, COUNT(*) as count, AVG(duration_ms) as avg_ms
            FROM learning_events
            WHERE command IS NOT NULL
            GROUP BY command
            ORDER BY count DESC
            LIMIT 10
        """)
        
        top_commands = cursor.fetchall()
        
        conn.close()
        
        return {
            "total_events": row[0],
            "successes": row[1],
            "failures": row[2],
            "success_rate": row[1] / row[0] if row[0] > 0 else 0,
            "avg_duration_ms": row[3],
            "first_event": row[4],
            "last_event": row[5],
            "top_commands": [
                {"command": cmd, "count": cnt, "avg_ms": avg}
                for cmd, cnt, avg in top_commands
            ]
        }
    
    def get_command_stats(self, command: str) -> Dict:
        """Get statistics for a specific command."""
        conn = sqlite3.connect(self.agentdb_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN verdict = 'success' THEN 1 ELSE 0 END) as successes,
                AVG(duration_ms) as avg_ms,
                MIN(duration_ms) as min_ms,
                MAX(duration_ms) as max_ms
            FROM learning_events
            WHERE command = ?
        """, (command,))
        
        row = cursor.fetchone()
        
        # Get BEAM tag distribution
        cursor.execute("""
            SELECT beam_tags, COUNT(*) as count
            FROM learning_events
            WHERE command = ?
            GROUP BY beam_tags
            ORDER BY count DESC
        """, (command,))
        
        beam_distribution = cursor.fetchall()
        conn.close()
        
        return {
            "command": command,
            "total_executions": row[0],
            "successes": row[1],
            "success_rate": row[1] / row[0] if row[0] > 0 else 0,
            "avg_duration_ms": row[2],
            "min_duration_ms": row[3],
            "max_duration_ms": row[4],
            "beam_distribution": [
                {"tags": json.loads(tags) if tags else [], "count": cnt}
                for tags, cnt in beam_distribution
            ]
        }
    
    def get_beam_report(self) -> Dict:
        """Generate BEAM dimension report."""
        conn = sqlite3.connect(self.agentdb_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT beam_tags, COUNT(*) as count, 
                   SUM(CASE WHEN verdict = 'success' THEN 1 ELSE 0 END) as successes
            FROM learning_events
            WHERE beam_tags IS NOT NULL
            GROUP BY beam_tags
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        # Aggregate by dimension
        beam_stats = defaultdict(lambda: {"total": 0, "successes": 0})
        
        for tags_json, count, successes in rows:
            tags = json.loads(tags_json) if tags_json else []
            for tag in tags:
                dimension = tag.split(":")[0] if ":" in tag else "unknown"
                beam_stats[dimension]["total"] += count
                beam_stats[dimension]["successes"] += successes
        
        return {
            dimension: {
                "total": stats["total"],
                "successes": stats["successes"],
                "success_rate": stats["successes"] / stats["total"] 
                               if stats["total"] > 0 else 0
            }
            for dimension, stats in beam_stats.items()
        }
    
    def print_summary(self):
        """Print formatted summary."""
        summary = self.get_summary()
        
        print("📊 Learning Analytics Summary")
        print("=" * 60)
        print(f"\n📈 Overall Statistics:")
        print(f"  Total Events: {summary['total_events']}")
        print(f"  Successes: {summary['successes']} "
              f"({summary['success_rate']:.1%})")
        print(f"  Failures: {summary['failures']}")
        print(f"  Avg Duration: {summary['avg_duration_ms']:.0f}ms")
        
        print(f"\n⏱️  Timeline:")
        print(f"  First Event: {summary['first_event']}")
        print(f"  Last Event:  {summary['last_event']}")
        
        if summary['top_commands']:
            print(f"\n🔝 Top Commands:")
            for cmd in summary['top_commands']:
                print(f"  {cmd['command']:15} "
                      f"{cmd['count']:4} executions  "
                      f"({cmd['avg_ms']:.0f}ms avg)")
    
    def print_command_stats(self, command: str):
        """Print formatted command statistics."""
        stats = self.get_command_stats(command)
        
        print(f"📊 Command Statistics: {command}")
        print("=" * 60)
        print(f"\n📈 Execution Statistics:")
        print(f"  Total: {stats['total_executions']}")
        print(f"  Successes: {stats['successes']} "
              f"({stats['success_rate']:.1%})")
        print(f"  Avg Duration: {stats['avg_duration_ms']:.0f}ms")
        print(f"  Min Duration: {stats['min_duration_ms']:.0f}ms")
        print(f"  Max Duration: {stats['max_duration_ms']:.0f}ms")
        
        if stats['beam_distribution']:
            print(f"\n🎯 BEAM Tag Distribution:")
            for item in stats['beam_distribution'][:5]:
                tags_str = ", ".join(item['tags']) if item['tags'] else "none"
                print(f"  {tags_str:40} ({item['count']} times)")
    
    def print_beam_report(self):
        """Print formatted BEAM dimension report."""
        report = self.get_beam_report()
        
        print("🎯 BEAM Dimension Report")
        print("=" * 60)
        print("\nBEAM = Business, Enablement, Architecture, Mitigation")
        print()
        
        for dimension in ["business", "enablement", "architecture", "mitigation"]:
            if dimension in report:
                stats = report[dimension]
                print(f"📌 {dimension.title()}:")
                print(f"   Total Events: {stats['total']}")
                print(f"   Successes: {stats['successes']} "
                      f"({stats['success_rate']:.1%})")
                print()


def main():
    parser = argparse.ArgumentParser(description="Learning Analytics")
    parser.add_argument("--summary", action="store_true", 
                       help="Show overall summary")
    parser.add_argument("--command", help="Show stats for specific command")
    parser.add_argument("--beam-report", action="store_true", 
                       help="Show BEAM dimension report")
    
    args = parser.parse_args()
    
    analytics = LearningAnalytics()
    
    if args.summary:
        analytics.print_summary()
    elif args.command:
        analytics.print_command_stats(args.command)
    elif args.beam_report:
        analytics.print_beam_report()
    else:
        # Default: show summary
        analytics.print_summary()


if __name__ == "__main__":
    main()
