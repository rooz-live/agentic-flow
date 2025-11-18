#!/usr/bin/env python3
"""
Metrics Collection Script for Risk Analytics Gates
Collects and analyzes historical data for calibration and baseline establishment.
Includes system metrics and dummy data bootstrapping.

**Version:** 2.0 (Ported & Enhanced)
"""

import json
import sqlite3
import subprocess
import datetime
import argparse
import os
import sys
import random
import psutil
from typing import Dict, List, Tuple, Optional
from pathlib import Path

class MetricsCollector:
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path).resolve()
        # Use the specified path for the database
        self.metrics_dir = self.repo_path / "investing/agentic-flow/metrics"
        self.metrics_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.metrics_dir / "risk_analytics_baseline.db"
        self.correlation_id = "consciousness-1758658960"
        self.init_database()
    
    def init_database(self):
        """Initialize metrics database with proper schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pragmas for reliability and concurrency
        cursor.execute("PRAGMA foreign_keys = ON;")
        cursor.execute("PRAGMA journal_mode = WAL;")
        
        # Create metrics table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pr_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                overall_score REAL,
                risk_level TEXT,
                is_dummy BOOLEAN DEFAULT FALSE,
                correlation_id TEXT
            )
        """)
        
        # Create system metrics table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                cpu_usage REAL,
                memory_usage REAL,
                disk_usage REAL,
                correlation_id TEXT
            )
        """)
        
        conn.commit()
        conn.close()
    
    def collect_system_metrics(self):
        """Collect system metrics (CPU, Memory)"""
        try:
            cpu = psutil.cpu_percent(interval=0.1)
            mem = psutil.virtual_memory().percent
            disk = psutil.disk_usage('/').percent
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO system_metrics (timestamp, cpu_usage, memory_usage, disk_usage, correlation_id)
                VALUES (?, ?, ?, ?, ?)
            """, (datetime.datetime.now().isoformat(), cpu, mem, disk, self.correlation_id))
            conn.commit()
            conn.close()
            
            print(f"   🖥️  System Metrics: CPU={cpu}%, Mem={mem}%, Disk={disk}%")
            
        except Exception as e:
            print(f"   ⚠️ Failed to collect system metrics: {e}")

    def generate_dummy_data(self, count: int = 5) -> List[Dict]:
        """Generate dummy PR data for bootstrapping"""
        print(f"   🎲 Generating {count} dummy PR records for bootstrapping...")
        dummy_data = []
        authors = ["dev-bot", "qa-automation", "integration-test"]
        
        for i in range(count):
            files = random.randint(1, 15)
            added = random.randint(10, 500)
            deleted = random.randint(5, 200)
            
            # Heuristics simulation
            security_score = random.uniform(80, 100)
            quality_score = random.uniform(70, 95)
            test_coverage = random.uniform(60, 90)
            performance_score = random.uniform(85, 100)
            
            overall = (security_score * 0.3) + (quality_score * 0.3) + (test_coverage * 0.2) + (performance_score * 0.2)
            
            if overall >= 90: risk = "P3"
            elif overall >= 75: risk = "P2"
            elif overall >= 60: risk = "P1"
            else: risk = "P0"

            dummy_data.append({
                'commit_hash': f"dummy-{random.randint(100000, 999999)}",
                'timestamp': datetime.datetime.now().isoformat(),
                'author': random.choice(authors),
                'files_changed': files,
                'lines_added': added,
                'lines_deleted': deleted,
                'test_coverage': round(test_coverage, 2),
                'security_score': round(security_score, 2),
                'quality_score': round(quality_score, 2),
                'performance_score': round(performance_score, 2),
                'documentation_score': 0.0,
                'overall_score': round(overall, 2),
                'risk_level': risk,
                'subject': "Bootstrap Dummy Data",
                'is_dummy': True
            })
        return dummy_data

    def collect_git_history(self, days: int = 30, max_prs: int = 20) -> List[Dict]:
        """Collect recent PR history from git log, fallback to dummy data"""
        
        print(f"📊 Collecting git history for last {days} days...")
        
        # Check if git is available
        try:
            subprocess.run(["git", "rev-parse", "--is-inside-work-tree"], 
                         cwd=self.repo_path, capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("   ⚠️ Git not available or not a repo. Falling back to dummy data.")
            return self.generate_dummy_data(max_prs)

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
            
            if not commits:
                return self.generate_dummy_data(max_prs)
                
            return commits[:max_prs]
            
        except subprocess.CalledProcessError as e:
            print(f"   ⚠️ Git history collection failed: {e}")
            return self.generate_dummy_data(max_prs)
    
    def analyze_commit_risk(self, commit: Dict) -> Dict:
        """Analyze individual commit for risk factors"""
        
        if commit.get('is_dummy'):
            return commit

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
                    if '+' in line: lines_added += line.count('+')
                    if '-' in line: lines_deleted += line.count('-')
                        
        except subprocess.CalledProcessError:
            files_changed = lines_added = lines_deleted = 0
        
        # Calculate risk scores based on heuristics
        risk_factors = {
            'file_count': min(files_changed / 10, 1.0),
            'code_churn': min((lines_added + lines_deleted) / 500, 1.0),
            'security_patterns': 0.0, # Placeholder
            'test_patterns': 0.5, # Placeholder
        }
        
        # Calculate component scores
        security_score = max(0, 100 - (risk_factors['security_patterns'] * 50))
        quality_score = max(0, 100 - (risk_factors['file_count'] * 30) - (risk_factors['code_churn'] * 20))
        test_coverage = 85.0 
        performance_score = 90.0
        
        # Calculate overall score
        overall_score = (
            security_score * 0.30 +
            quality_score * 0.25 +
            test_coverage * 0.25 +
            performance_score * 0.20
        )
        
        # Determine risk level
        if overall_score >= 90: risk_level = "P3"
        elif overall_score >= 75: risk_level = "P2"
        elif overall_score >= 60: risk_level = "P1"
        else: risk_level = "P0"
        
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
            'overall_score': overall_score,
            'risk_level': risk_level,
            'subject': commit['subject'],
            'is_dummy': False
        }
    
    def store_metrics(self, metrics: List[Dict]):
        """Store collected metrics in database"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for metric in metrics:
            cursor.execute("""
                INSERT INTO pr_metrics (
                    commit_hash, timestamp, author, files_changed, lines_added, lines_deleted,
                    test_coverage, security_score, quality_score, performance_score,
                    overall_score, risk_level, is_dummy, correlation_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                metric['commit_hash'], metric['timestamp'], metric['author'],
                metric['files_changed'], metric['lines_added'], metric['lines_deleted'],
                metric['test_coverage'], metric['security_score'], metric['quality_score'],
                metric['performance_score'],
                metric['overall_score'], metric['risk_level'], metric['is_dummy'], self.correlation_id
            ))
        
        conn.commit()
        conn.close()
        
        print(f"   ✅ Stored {len(metrics)} metrics records")
    
    def calculate_baseline_metrics(self) -> Dict:
        """Calculate baseline metrics from collected data"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
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
                'P0': row[2], 'P1': row[3], 'P2': row[4], 'P3': row[5]
            },
            'analysis_timestamp': datetime.datetime.now().isoformat()
        }
        
        conn.close()
        return baseline
    
    def export_baseline(self, output_file: str):
        """Export baseline metrics to JSON file"""
        baseline = self.calculate_baseline_metrics()
        
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(baseline, f, indent=2)
        
        print(f"   ✅ Baseline report exported to {output_path}")

def main():
    parser = argparse.ArgumentParser(description="Collect metrics for risk analytics calibration")
    parser.add_argument("--days", type=int, default=30, help="Days of history to analyze")
    parser.add_argument("--max-prs", type=int, default=20, help="Maximum PRs to analyze")
    parser.add_argument("--output", default="metrics/baseline.json", help="Output file for baseline")
    parser.add_argument("--repo-path", default=".", help="Repository path")
    
    args = parser.parse_args()
    
    collector = MetricsCollector(args.repo_path)
    
    print("🔍 Risk Analytics Metrics Collection")
    print("=" * 50)
    
    try:
        # Collect system metrics
        collector.collect_system_metrics()
        
        # Collect git history (or dummy)
        commits = collector.collect_git_history(args.days, args.max_prs)
        
        # Analyze each commit
        print(f"🔬 Analyzing {len(commits)} commits/records...")
        metrics = []
        
        for i, commit in enumerate(commits, 1):
            # print(f"   Analyzing {i}/{len(commits)}: {commit['hash'][:8]}")
            analysis = collector.analyze_commit_risk(commit)
            metrics.append(analysis)
        
        # Store metrics
        print("💾 Storing metrics...")
        collector.store_metrics(metrics)
        
        # Export report
        print("📝 Generating calibration report...")
        collector.export_baseline(args.output)
        
        print("\n✅ Metrics collection complete!")
        return 0
        
    except Exception as e:
        print(f"❌ Collection failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())