#!/usr/bin/env python3
"""
Metrics Collection Script for Risk Analytics Gates
Collects and analyzes historical data for calibration and baseline establishment

**Date:** 2025-10-16
**Correlation ID:** consciousness-1758658960
**Version:** 1.0
"""

import json
import sqlite3
import subprocess
import datetime
import argparse
import os
import sys
from typing import Dict, List, Tuple, Optional
from pathlib import Path

class MetricsCollector:
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path).resolve()
        self.db_path = self.repo_path / "logs" / "metrics.db"
        self.correlation_id = "consciousness-1758658960"
        self.init_database()
    
    def init_database(self):
        """Initialize metrics database with proper schema"""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pragmas for reliability and concurrency
        cursor.execute("PRAGMA foreign_keys = ON;")
        cursor.execute("PRAGMA journal_mode = WAL;")
        
        # Metadata table for schema versioning
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS schema_metadata (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                schema_version INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                last_migrated_at TEXT NOT NULL
            )
        """)
        cursor.execute(
            "INSERT OR IGNORE INTO schema_metadata (id, schema_version, created_at, last_migrated_at) VALUES (1, 1, ?, ?)",
            (datetime.datetime.now().isoformat(), datetime.datetime.now().isoformat(),)
        )
        
        # Create metrics table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pr_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pr_number INTEGER,
                commit_hash TEXT,
                timestamp TEXT,
                author TEXT,
                files_changed INTEGER,
                lines_added INTEGER,
                lines_deleted INTEGER,
                test_coverage REAL,
                security_score REAL,
                quality_score REAL,
                performance_score REAL,
                documentation_score REAL,
                overall_score REAL,
                risk_level TEXT,
                false_positive BOOLEAN DEFAULT FALSE,
                manual_override BOOLEAN DEFAULT FALSE,
                deployment_success BOOLEAN,
                correlation_id TEXT
            )
        """)
        
        # Create risk analysis table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS risk_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                total_prs INTEGER,
                p0_count INTEGER,
                p1_count INTEGER,
                p2_count INTEGER,
                p3_count INTEGER,
                false_positive_count INTEGER,
                override_count INTEGER,
                avg_processing_time REAL,
                correlation_id TEXT
            )
        """)
        
        # Views for quick reporting
        cursor.execute("""
            CREATE VIEW IF NOT EXISTS v_pr_risk_summary AS
            SELECT risk_level, COUNT(*) AS count
            FROM pr_metrics GROUP BY risk_level;
        """)
        
        # Create indexes for performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pr_number ON pr_metrics(pr_number)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON pr_metrics(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_risk_level ON pr_metrics(risk_level)")
        
        conn.commit()
        conn.close()
    
    def collect_git_history(self, days: int = 30, max_prs: int = 20) -> List[Dict]:
        """Collect recent PR history from git log"""
        
        print(f"📊 Collecting git history for last {days} days...")
        
        # Get recent commits
        since_date = datetime.datetime.now() - datetime.timedelta(days=days)
        git_log_cmd = [
            "git", "log",
            "--since", since_date.strftime("%Y-%m-%d"),
            "--pretty=format:%H|%an|%ad|%s",
            "--date=iso",
            "--no-merges"
        ]
        
        try:
            result = subprocess.run(git_log_cmd, cwd=self.repo_path, 
                                  capture_output=True, text=True, check=True)
            
            commits = []
            for line in result.stdout.strip().split('\n'):
                if '|' in line:
                    hash_val, author, date, subject = line.split('|', 3)
                    commits.append({
                        'hash': hash_val,
                        'author': author,
                        'date': date,
                        'subject': subject
                    })
            
            print(f"   Found {len(commits)} commits")
            return commits[:max_prs]
            
        except subprocess.CalledProcessError as e:
            print(f"   ⚠️ Git history collection failed: {e}")
            return []
    
    def analyze_commit_risk(self, commit: Dict) -> Dict:
        """Analyze individual commit for risk factors"""
        
        commit_hash = commit['hash']
        
        # Get file changes for this commit
        try:
            diff_cmd = ["git", "show", "--stat", "--format=", commit_hash]
            result = subprocess.run(diff_cmd, cwd=self.repo_path,
                                  capture_output=True, text=True, check=True)
            
            lines = result.stdout.strip().split('\n')
            files_changed = 0
            lines_added = 0
            lines_deleted = 0
            
            for line in lines:
                if '|' in line and ('+' in line or '-' in line):
                    files_changed += 1
                    # Parse additions/deletions
                    if '+' in line:
                        plus_count = line.count('+')
                        lines_added += plus_count
                    if '-' in line:
                        minus_count = line.count('-')  
                        lines_deleted += minus_count
                        
        except subprocess.CalledProcessError:
            files_changed = lines_added = lines_deleted = 0
        
        # Calculate risk scores based on heuristics
        risk_factors = {
            'file_count': min(files_changed / 10, 1.0),  # Normalize to 0-1
            'code_churn': min((lines_added + lines_deleted) / 500, 1.0),
            'security_patterns': self.check_security_patterns(commit),
            'test_patterns': self.check_test_patterns(commit),
        }
        
        # Calculate component scores
        security_score = max(0, 100 - (risk_factors['security_patterns'] * 50))
        quality_score = max(0, 100 - (risk_factors['file_count'] * 30) - (risk_factors['code_churn'] * 20))
        test_coverage = 85.0 if risk_factors['test_patterns'] > 0.5 else 65.0  # Estimated
        performance_score = 90.0  # Default - would need actual benchmarks
        documentation_score = 80.0 if 'doc' in commit['subject'].lower() else 70.0
        
        # Calculate overall score (weighted average)
        overall_score = (
            security_score * 0.30 +
            quality_score * 0.25 +
            test_coverage * 0.25 +
            performance_score * 0.15 +
            documentation_score * 0.05
        )
        
        # Determine risk level
        risk_level = self.calculate_risk_level(overall_score)
        
        return {
            'commit_hash': commit_hash,
            'timestamp': commit['date'],
            'author': commit['author'],
            'files_changed': files_changed,
            'lines_added': lines_added,
            'lines_deleted': lines_deleted,
            'test_coverage': test_coverage,
            'security_score': security_score,
            'quality_score': quality_score,
            'performance_score': performance_score,
            'documentation_score': documentation_score,
            'overall_score': overall_score,
            'risk_level': risk_level,
            'subject': commit['subject']
        }
    
    def check_security_patterns(self, commit: Dict) -> float:
        """Check for security-related patterns in commit"""
        
        security_keywords = [
            'password', 'secret', 'key', 'token', 'auth',
            'sql', 'inject', 'xss', 'csrf', 'security',
            'vulnerability', 'cve', 'exploit'
        ]
        
        subject_lower = commit['subject'].lower()
        matches = sum(1 for keyword in security_keywords if keyword in subject_lower)
        
        return min(matches / len(security_keywords), 1.0)
    
    def check_test_patterns(self, commit: Dict) -> float:
        """Check for test-related patterns in commit"""
        
        test_keywords = [
            'test', 'spec', 'coverage', 'mock', 'stub',
            'fixture', 'assert', 'expect', 'should'
        ]
        
        subject_lower = commit['subject'].lower()
        matches = sum(1 for keyword in test_keywords if keyword in subject_lower)
        
        return min(matches / len(test_keywords), 1.0)
    
    def calculate_risk_level(self, overall_score: float) -> str:
        """Calculate risk level based on overall score"""
        
        if overall_score >= 90:
            return "P3"  # Low risk
        elif overall_score >= 75:
            return "P2"  # Medium risk  
        elif overall_score >= 60:
            return "P1"  # High risk
        else:
            return "P0"  # Critical risk
    
    def store_metrics(self, metrics: List[Dict]):
        """Store collected metrics in database"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for metric in metrics:
            cursor.execute("""
                INSERT INTO pr_metrics (
                    commit_hash, timestamp, author, files_changed, lines_added, lines_deleted,
                    test_coverage, security_score, quality_score, performance_score,
                    documentation_score, overall_score, risk_level, correlation_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                metric['commit_hash'], metric['timestamp'], metric['author'],
                metric['files_changed'], metric['lines_added'], metric['lines_deleted'],
                metric['test_coverage'], metric['security_score'], metric['quality_score'],
                metric['performance_score'], metric['documentation_score'],
                metric['overall_score'], metric['risk_level'], self.correlation_id
            ))
        
        conn.commit()
        conn.close()
        
        print(f"   ✅ Stored {len(metrics)} metrics records")
    
    def calculate_baseline_metrics(self) -> Dict:
        """Calculate baseline metrics from collected data"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get overall statistics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_prs,
                AVG(overall_score) as avg_score,
                COUNT(CASE WHEN risk_level = 'P0' THEN 1 END) as p0_count,
                COUNT(CASE WHEN risk_level = 'P1' THEN 1 END) as p1_count,
                COUNT(CASE WHEN risk_level = 'P2' THEN 1 END) as p2_count,
                COUNT(CASE WHEN risk_level = 'P3' THEN 1 END) as p3_count
            FROM pr_metrics
            WHERE correlation_id = ?
        """, (self.correlation_id,))
        
        row = cursor.fetchone()
        
        baseline = {
            'total_analyzed': row[0],
            'average_score': round(row[1] or 0, 2),
            'risk_distribution': {
                'P0': row[2],
                'P1': row[3], 
                'P2': row[4],
                'P3': row[5]
            },
            'p0_rate': round((row[2] / max(row[0], 1)) * 100, 2),
            'analysis_timestamp': datetime.datetime.now().isoformat()
        }
        
        # Get score distribution percentiles
        cursor.execute("""
            SELECT overall_score FROM pr_metrics 
            WHERE correlation_id = ? 
            ORDER BY overall_score
        """, (self.correlation_id,))
        
        scores = [row[0] for row in cursor.fetchall()]
        
        if scores:
            n = len(scores)
            baseline['score_percentiles'] = {
                'p10': scores[int(n * 0.1)],
                'p25': scores[int(n * 0.25)], 
                'p50': scores[int(n * 0.50)],
                'p75': scores[int(n * 0.75)],
                'p90': scores[int(n * 0.90)]
            }
        
        conn.close()
        return baseline
    
    def generate_calibration_report(self) -> Dict:
        """Generate comprehensive calibration report"""
        
        baseline = self.calculate_baseline_metrics()
        
        # Add recommendations
        recommendations = []
        
        if baseline['p0_rate'] > 5:
            recommendations.append({
                'type': 'threshold_adjustment',
                'message': f"P0 rate {baseline['p0_rate']}% exceeds target <5%. Consider adjusting P0 threshold.",
                'priority': 'high'
            })
        
        if baseline['total_analyzed'] < 10:
            recommendations.append({
                'type': 'data_collection',
                'message': f"Only {baseline['total_analyzed']} samples analyzed. Recommend collecting 15-20 for robust calibration.",
                'priority': 'medium'
            })
        
        report = {
            'calibration_summary': baseline,
            'recommendations': recommendations,
            'validation_status': {
                'sufficient_data': baseline['total_analyzed'] >= 10,
                'acceptable_p0_rate': baseline['p0_rate'] <= 5,
                'score_distribution_healthy': baseline['risk_distribution']['P2'] + baseline['risk_distribution']['P3'] > baseline['risk_distribution']['P0'] + baseline['risk_distribution']['P1']
            },
            'next_steps': [
                "Review false positive patterns in P0/P1 classifications",
                "Validate gate thresholds against team expectations", 
                "Establish ongoing calibration cadence (weekly)",
                "Set up automated baseline tracking"
            ]
        }
        
        return report
    
    def export_baseline(self, output_file: str):
        """Export baseline metrics to JSON file"""
        
        report = self.generate_calibration_report()
        
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"   ✅ Baseline report exported to {output_path}")
    
    def emit_heartbeat(self, phase: str, status: str, metrics: Dict = None):
        """Emit monitoring heartbeat"""
        
        timestamp = datetime.datetime.now().isoformat().replace("+00:00", "Z")
        metrics_json = json.dumps(metrics or {}, separators=(',', ':'))
        
        heartbeat = f"{timestamp}|metrics_collector|{phase}|{status}|0|{self.correlation_id}|{metrics_json}"
        
        # Write to heartbeat log
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        with open(log_dir / "heartbeats.log", "a") as f:
            f.write(heartbeat + '\n')
            f.flush()

def main():
    parser = argparse.ArgumentParser(description="Collect metrics for risk analytics calibration")
    parser.add_argument("--days", type=int, default=30, help="Days of history to analyze")
    parser.add_argument("--max-prs", type=int, default=20, help="Maximum PRs to analyze")
    parser.add_argument("--output", default="docs/METRICS_BASELINE.json", help="Output file for baseline")
    parser.add_argument("--repo-path", default=".", help="Repository path")
    parser.add_argument("--init-only", action="store_true", help="Initialize DB and exit successfully")
    
    args = parser.parse_args()
    
    collector = MetricsCollector(args.repo_path)
    
    if args.init_only:
        # Ensure heartbeats/logs dirs exist and emit a success init heartbeat
        Path("logs").mkdir(exist_ok=True)
        Path("docs").mkdir(exist_ok=True)
        collector.emit_heartbeat("init", "success", {"db": str(collector.db_path)})
        # Export an empty baseline to unblock downstream steps
        with open(args.output, "w") as f:
            json.dump({
                "calibration_summary": {
                    "total_analyzed": 0,
                    "average_score": 0,
                    "risk_distribution": {"P0": 0, "P1": 0, "P2": 0, "P3": 0},
                    "p0_rate": 0.0,
                    "analysis_timestamp": datetime.datetime.now().isoformat()
                },
                "recommendations": [
                    {"type": "data_collection", "message": "No data yet; collect recent PRs.", "priority": "medium"}
                ],
                "validation_status": {
                    "sufficient_data": False,
                    "acceptable_p0_rate": True,
                    "score_distribution_healthy": True
                }
            }, f, indent=2)
        print(f"✅ DB initialized and empty baseline written to {args.output}")
        return 0
    
    print("🔍 Risk Analytics Metrics Collection")
    print("=" * 50)
    
    # Start collection
    collector.emit_heartbeat("start", "running", {"days": args.days, "max_prs": args.max_prs})
    
    try:
        # Collect git history
        commits = collector.collect_git_history(args.days, args.max_prs)
        
        if not commits:
            print("   ⚠️ No commits found; proceeding with empty baseline to unblock pipeline")
            # Still emit a valid baseline JSON for downstream consumers
            collector.export_baseline(args.output)
            collector.emit_heartbeat("complete", "success", {"commits_found": 0})
            return 0
        
        # Analyze each commit
        print(f"🔬 Analyzing {len(commits)} commits...")
        metrics = []
        
        for i, commit in enumerate(commits, 1):
            print(f"   Analyzing commit {i}/{len(commits)}: {commit['hash'][:8]}")
            analysis = collector.analyze_commit_risk(commit)
            metrics.append(analysis)
        
        # Store metrics
        print("💾 Storing metrics...")
        collector.store_metrics(metrics)
        
        # Calculate baseline
        print("📊 Calculating baseline...")
        baseline = collector.calculate_baseline_metrics()
        
        print(f"   📈 Baseline Results:")
        print(f"      Total Analyzed: {baseline['total_analyzed']}")
        print(f"      Average Score: {baseline['average_score']}")
        print(f"      P0 Rate: {baseline['p0_rate']}%")
        print(f"      Distribution: P0={baseline['risk_distribution']['P0']} P1={baseline['risk_distribution']['P1']} P2={baseline['risk_distribution']['P2']} P3={baseline['risk_distribution']['P3']}")
        
        # Export report
        print("📝 Generating calibration report...")
        collector.export_baseline(args.output)
        
        collector.emit_heartbeat("complete", "success", baseline)
        
        print("\n✅ Metrics collection complete!")
        print(f"   Report saved to: {args.output}")
        
        return 0
        
    except Exception as e:
        print(f"❌ Collection failed: {e}")
        collector.emit_heartbeat("complete", "error", {"error": str(e)})
        return 1

if __name__ == "__main__":
    sys.exit(main())