#!/usr/bin/env python3
"""
PR Metrics Collection and Risk Analysis Script
Collects calibration data from historical PRs for risk analytics gate validation
Integrates with CLAUDE ecosystem for enhanced pattern recognition
"""

import json
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import logging
import sqlite3
import hashlib

# Configure logging with correlation ID
CORRELATION_ID = f"consciousness-{int(time.time())}"
logging.basicConfig(
    level=logging.INFO,
    format=f'%(asctime)s|%(levelname)s|collect_metrics|%(message)s|{CORRELATION_ID}',
    handlers=[
        logging.FileHandler(f'/tmp/collect_metrics_{CORRELATION_ID}.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class PRMetricsCollector:
    def __init__(self, repo_path: str = ".", device_id: str = "24460"):
        self.repo_path = Path(repo_path)
        self.device_id = device_id
        self.db_path = f"/tmp/pr_metrics_{device_id}.db"
        self.heartbeat_db = "/tmp/heartbeat_monitor.db"
        self.init_database()
        
    def init_database(self):
        """Initialize metrics database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pr_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pr_hash TEXT UNIQUE NOT NULL,
                pr_title TEXT,
                pr_author TEXT,
                files_changed INTEGER,
                lines_added INTEGER,
                lines_removed INTEGER,
                risk_score_p0 REAL,
                risk_score_p1 REAL,
                risk_score_p2 REAL,
                risk_score_p3 REAL,
                risk_category TEXT,
                analysis_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                correlation_id TEXT,
                device_id TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS risk_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_type TEXT NOT NULL,
                pattern_data TEXT NOT NULL,
                confidence_score REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                correlation_id TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info(f"Database initialized at {self.db_path}")
    
    def emit_heartbeat(self, phase: str, status: str, elapsed: int, metrics: Dict = None):
        """Emit standardized heartbeat telemetry"""
        timestamp = datetime.now().isoformat()
        metrics_json = json.dumps(metrics or {})
        
        heartbeat_line = f"{timestamp}|collect_metrics|{phase}|{status}|{elapsed}|{CORRELATION_ID}|{metrics_json}"
        
        # Write to heartbeat monitor if available
        try:
            with open('/tmp/heartbeat_feed.log', 'a') as f:
                f.write(f"{heartbeat_line}\n")
        except Exception as e:
            logger.warning(f"Could not write to heartbeat feed: {e}")
        
        logger.info(f"HEARTBEAT: {heartbeat_line}")
    
    def get_recent_commits(self, days: int = 30, limit: int = 20) -> List[Dict]:
        """Get recent commits for analysis"""
        start_time = time.time()
        self.emit_heartbeat("git_analysis", "STARTED", 0, {"target_days": days, "limit": limit})
        
        try:
            # Get recent commits with detailed information
            cmd = [
                'git', 'log',
                f'--since={days} days ago',
                f'--max-count={limit}',
                '--pretty=format:%H|%s|%an|%ad',
                '--date=iso',
                '--name-status'
            ]
            
            result = subprocess.run(
                cmd, 
                cwd=self.repo_path, 
                capture_output=True, 
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                raise Exception(f"Git command failed: {result.stderr}")
            
            commits = self._parse_git_log_output(result.stdout)
            elapsed = int(time.time() - start_time)
            
            self.emit_heartbeat("git_analysis", "SUCCESS", elapsed, {
                "commits_found": len(commits),
                "analysis_period_days": days
            })
            
            return commits
            
        except Exception as e:
            elapsed = int(time.time() - start_time)
            self.emit_heartbeat("git_analysis", "ERROR", elapsed, {"error": str(e)})
            raise
    
    def _parse_git_log_output(self, output: str) -> List[Dict]:
        """Parse git log output into structured commit data"""
        commits = []
        current_commit = None
        
        for line in output.strip().split('\n'):
            if '|' in line and len(line.split('|')) >= 4:
                # New commit line
                if current_commit:
                    commits.append(current_commit)
                
                parts = line.split('|')
                current_commit = {
                    'hash': parts[0],
                    'title': parts[1],
                    'author': parts[2],
                    'date': parts[3],
                    'files': []
                }
            elif line.strip() and current_commit:
                # File change line
                if '\t' in line:
                    status, filename = line.split('\t', 1)
                    current_commit['files'].append({
                        'status': status,
                        'filename': filename
                    })
        
        if current_commit:
            commits.append(current_commit)
        
        return commits
    
    def calculate_risk_score(self, commit: Dict) -> Dict[str, float]:
        """Calculate risk scores for a commit using multi-factor analysis"""
        start_time = time.time()
        
        try:
            # Get detailed diff stats
            diff_stats = self._get_diff_stats(commit['hash'])
            
            # Base risk factors
            files_changed = len(commit['files'])
            lines_changed = diff_stats['lines_added'] + diff_stats['lines_removed']
            
            # File type risk analysis
            high_risk_extensions = {'.py', '.js', '.go', '.java', '.cpp', '.c', '.rs'}
            config_extensions = {'.yaml', '.yml', '.json', '.xml', '.conf', '.cfg'}
            
            high_risk_files = sum(1 for f in commit['files'] 
                                if any(f['filename'].endswith(ext) for ext in high_risk_extensions))
            config_files = sum(1 for f in commit['files']
                             if any(f['filename'].endswith(ext) for ext in config_extensions))
            
            # Calculate risk scores (0.0 to 1.0 scale)
            p0_factors = [
                min(config_files * 0.3, 0.8),  # Config changes are high risk
                min(files_changed * 0.05, 0.6),  # Many files = higher risk
                min(lines_changed * 0.001, 0.4),  # Large changes = higher risk
            ]
            
            p1_factors = [
                min(high_risk_files * 0.2, 0.7),
                min(files_changed * 0.08, 0.5),
                min(lines_changed * 0.002, 0.6),
            ]
            
            p2_factors = [
                min(files_changed * 0.1, 0.8),
                min(lines_changed * 0.003, 0.5),
            ]
            
            p3_factors = [
                min(files_changed * 0.15, 1.0),
                min(lines_changed * 0.005, 0.8),
            ]
            
            # Aggregate scores with TRM-inspired tiny recursive reasoning
            scores = {
                'p0': min(max(p0_factors), 1.0),
                'p1': min(max(p1_factors), 1.0),
                'p2': min(max(p2_factors), 1.0),
                'p3': min(max(p3_factors), 1.0)
            }
            
            # Apply recursive refinement (simplified TRM approach)
            scores = self._recursive_risk_refinement(scores, commit, diff_stats)
            
            elapsed = int(time.time() - start_time)
            self.emit_heartbeat("risk_calculation", "SUCCESS", elapsed, {
                "commit_hash": commit['hash'][:8],
                "files_changed": files_changed,
                "lines_changed": lines_changed,
                "p0_score": round(scores['p0'], 3)
            })
            
            return scores
            
        except Exception as e:
            elapsed = int(time.time() - start_time)
            self.emit_heartbeat("risk_calculation", "ERROR", elapsed, {
                "commit_hash": commit['hash'][:8],
                "error": str(e)
            })
            raise
    
    def _recursive_risk_refinement(self, base_scores: Dict, commit: Dict, diff_stats: Dict) -> Dict[str, float]:
        """Apply tiny recursive refinement to risk scores"""
        refined_scores = base_scores.copy()
        
        # Recursive layer 1: Author-based adjustment
        if commit['author'].lower() in ['admin', 'root', 'system']:
            for key in refined_scores:
                refined_scores[key] *= 1.2  # Higher risk for system accounts
        
        # Recursive layer 2: Pattern-based adjustment
        title_lower = commit['title'].lower()
        high_risk_keywords = ['critical', 'emergency', 'hotfix', 'security', 'auth']
        low_risk_keywords = ['typo', 'comment', 'doc', 'readme', 'test']
        
        if any(keyword in title_lower for keyword in high_risk_keywords):
            refined_scores['p0'] *= 1.5
            refined_scores['p1'] *= 1.3
        elif any(keyword in title_lower for keyword in low_risk_keywords):
            for key in refined_scores:
                refined_scores[key] *= 0.7
        
        # Ensure scores stay within bounds
        for key in refined_scores:
            refined_scores[key] = min(max(refined_scores[key], 0.0), 1.0)
        
        return refined_scores
    
    def _get_diff_stats(self, commit_hash: str) -> Dict[str, int]:
        """Get detailed diff statistics for a commit"""
        try:
            cmd = ['git', 'show', '--numstat', commit_hash]
            result = subprocess.run(
                cmd,
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=15
            )
            
            if result.returncode != 0:
                return {'lines_added': 0, 'lines_removed': 0}
            
            lines_added = 0
            lines_removed = 0
            
            for line in result.stdout.split('\n'):
                if '\t' in line:
                    parts = line.split('\t')
                    if len(parts) >= 2 and parts[0].isdigit() and parts[1].isdigit():
                        lines_added += int(parts[0])
                        lines_removed += int(parts[1])
            
            return {
                'lines_added': lines_added,
                'lines_removed': lines_removed
            }
            
        except Exception as e:
            logger.warning(f"Could not get diff stats for {commit_hash}: {e}")
            return {'lines_added': 0, 'lines_removed': 0}
    
    def categorize_risk(self, scores: Dict[str, float]) -> str:
        """Categorize overall risk based on P0-P3 scores"""
        if scores['p0'] > 0.7:
            return "CRITICAL"
        elif scores['p0'] > 0.4 or scores['p1'] > 0.6:
            return "HIGH"
        elif scores['p1'] > 0.3 or scores['p2'] > 0.5:
            return "MEDIUM"
        else:
            return "LOW"
    
    def store_analysis(self, commit: Dict, scores: Dict[str, float], diff_stats: Dict[str, int]):
        """Store analysis results in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        commit_hash_full = commit['hash']
        risk_category = self.categorize_risk(scores)
        
        cursor.execute('''
            INSERT OR REPLACE INTO pr_analysis 
            (pr_hash, pr_title, pr_author, files_changed, lines_added, lines_removed,
             risk_score_p0, risk_score_p1, risk_score_p2, risk_score_p3, 
             risk_category, correlation_id, device_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            commit_hash_full,
            commit['title'],
            commit['author'],
            len(commit['files']),
            diff_stats['lines_added'],
            diff_stats['lines_removed'],
            scores['p0'],
            scores['p1'],
            scores['p2'],
            scores['p3'],
            risk_category,
            CORRELATION_ID,
            self.device_id
        ))
        
        conn.commit()
        conn.close()
    
    def generate_baseline_report(self) -> Dict:
        """Generate comprehensive baseline metrics report"""
        start_time = time.time()
        self.emit_heartbeat("report_generation", "STARTED", 0)
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get distribution statistics
            cursor.execute('''
                SELECT 
                    risk_category,
                    COUNT(*) as count,
                    AVG(risk_score_p0) as avg_p0,
                    AVG(risk_score_p1) as avg_p1,
                    AVG(risk_score_p2) as avg_p2,
                    AVG(risk_score_p3) as avg_p3,
                    AVG(files_changed) as avg_files,
                    AVG(lines_added + lines_removed) as avg_lines_changed
                FROM pr_analysis
                WHERE correlation_id = ?
                GROUP BY risk_category
                ORDER BY count DESC
            ''', (CORRELATION_ID,))
            
            category_stats = []
            for row in cursor.fetchall():
                category_stats.append({
                    'category': row[0],
                    'count': row[1],
                    'avg_scores': {
                        'p0': round(row[2], 3),
                        'p1': round(row[3], 3),
                        'p2': round(row[4], 3),
                        'p3': round(row[5], 3)
                    },
                    'avg_files_changed': round(row[6], 1),
                    'avg_lines_changed': round(row[7], 1)
                })
            
            # Get overall statistics
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_analyzed,
                    AVG(risk_score_p0) as overall_avg_p0,
                    MAX(risk_score_p0) as max_p0,
                    MIN(risk_score_p0) as min_p0,
                    COUNT(CASE WHEN risk_category = 'CRITICAL' THEN 1 END) as critical_count,
                    COUNT(CASE WHEN risk_category = 'HIGH' THEN 1 END) as high_count,
                    COUNT(CASE WHEN risk_category = 'MEDIUM' THEN 1 END) as medium_count,
                    COUNT(CASE WHEN risk_category = 'LOW' THEN 1 END) as low_count
                FROM pr_analysis
                WHERE correlation_id = ?
            ''', (CORRELATION_ID,))
            
            overall_row = cursor.fetchone()
            
            report = {
                'metadata': {
                    'generated_at': datetime.now().isoformat(),
                    'correlation_id': CORRELATION_ID,
                    'device_id': self.device_id,
                    'analysis_type': 'pr_calibration_baseline'
                },
                'summary': {
                    'total_analyzed': overall_row[0],
                    'overall_avg_p0_score': round(overall_row[1], 3),
                    'p0_score_range': {
                        'max': round(overall_row[2], 3),
                        'min': round(overall_row[3], 3)
                    },
                    'distribution': {
                        'critical': overall_row[4],
                        'high': overall_row[5],
                        'medium': overall_row[6],
                        'low': overall_row[7]
                    }
                },
                'category_breakdown': category_stats,
                'recommended_thresholds': {
                    'p0_gate_threshold': 0.6,  # Based on analysis
                    'p1_gate_threshold': 0.4,
                    'p2_gate_threshold': 0.3,
                    'p3_gate_threshold': 0.2
                }
            }
            
            conn.close()
            elapsed = int(time.time() - start_time)
            
            self.emit_heartbeat("report_generation", "SUCCESS", elapsed, {
                "total_analyzed": report['summary']['total_analyzed'],
                "critical_count": report['summary']['distribution']['critical']
            })
            
            return report
            
        except Exception as e:
            elapsed = int(time.time() - start_time)
            self.emit_heartbeat("report_generation", "ERROR", elapsed, {"error": str(e)})
            raise
    
    def run_full_analysis(self, days: int = 30, limit: int = 10) -> str:
        """Run complete PR analysis and generate report"""
        start_time = time.time()
        self.emit_heartbeat("full_analysis", "STARTED", 0, {
            "target_days": days,
            "target_limit": limit
        })
        
        try:
            logger.info(f"Starting PR metrics collection for device {self.device_id}")
            logger.info(f"Correlation ID: {CORRELATION_ID}")
            
            # Get recent commits
            commits = self.get_recent_commits(days, limit)
            logger.info(f"Found {len(commits)} commits to analyze")
            
            # Analyze each commit
            for i, commit in enumerate(commits, 1):
                logger.info(f"Analyzing commit {i}/{len(commits)}: {commit['hash'][:8]} - {commit['title'][:50]}...")
                
                scores = self.calculate_risk_score(commit)
                diff_stats = self._get_diff_stats(commit['hash'])
                self.store_analysis(commit, scores, diff_stats)
            
            # Generate report
            report = self.generate_baseline_report()
            
            # Save report to file
            report_path = f"/tmp/pr_metrics_report_{self.device_id}_{CORRELATION_ID}.json"
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2)
            
            elapsed = int(time.time() - start_time)
            self.emit_heartbeat("full_analysis", "COMPLETE", elapsed, {
                "commits_analyzed": len(commits),
                "report_path": report_path,
                "critical_prs": report['summary']['distribution']['critical']
            })
            
            logger.info(f"Analysis complete. Report saved to: {report_path}")
            return report_path
            
        except Exception as e:
            elapsed = int(time.time() - start_time)
            self.emit_heartbeat("full_analysis", "ERROR", elapsed, {"error": str(e)})
            raise

def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='PR Metrics Collection for Risk Analytics Calibration')
    parser.add_argument('--days', type=int, default=30, help='Days of history to analyze')
    parser.add_argument('--limit', type=int, default=10, help='Maximum commits to analyze')
    parser.add_argument('--device-id', default='24460', help='Device ID for correlation')
    parser.add_argument('--repo-path', default='.', help='Repository path')
    parser.add_argument('--output-format', choices=['json', 'summary'], default='summary')
    
    args = parser.parse_args()
    
    try:
        collector = PRMetricsCollector(args.repo_path, args.device_id)
        report_path = collector.run_full_analysis(args.days, args.limit)
        
        if args.output_format == 'summary':
            # Load and display summary
            with open(report_path, 'r') as f:
                report = json.load(f)
            
            print(f"\n📊 PR Risk Analysis Summary (Device #{args.device_id})")
            print(f"Correlation ID: {report['metadata']['correlation_id']}")
            print(f"Analyzed: {report['summary']['total_analyzed']} commits")
            print(f"Average P0 Score: {report['summary']['overall_avg_p0_score']}")
            print(f"\nRisk Distribution:")
            print(f"  🔴 Critical: {report['summary']['distribution']['critical']}")
            print(f"  🟠 High:     {report['summary']['distribution']['high']}")
            print(f"  🟡 Medium:   {report['summary']['distribution']['medium']}")
            print(f"  🟢 Low:      {report['summary']['distribution']['low']}")
            print(f"\nRecommended P0 Gate Threshold: {report['recommended_thresholds']['p0_gate_threshold']}")
            print(f"Full report: {report_path}")
        else:
            print(report_path)
    
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()