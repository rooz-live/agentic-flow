#!/usr/bin/env python3
"""
Proxy Gaming Detection - Alignment Checker
Detects metrics optimization without corresponding reality improvement (proxy gaming)

This module implements the TRUTH_ALIGNMENT framework for detecting suspicious
metric patterns that may indicate proxy gaming behavior.
"""

import json
import logging
import argparse
import subprocess
import re
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta
from enum import Enum
import uuid

# Try to import pandas and scipy, provide fallback if not available
try:
    import pandas as pd
    import numpy as np
    from scipy import stats
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    logging.warning("pandas/scipy not available. Using fallback implementations.")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class GamingType(Enum):
    """Types of proxy gaming patterns"""
    SUDDEN_JUMP = "sudden_jump"
    METRIC_REALITY_DIVERGENCE = "metric_reality_divergence"
    LOW_CORRELATION = "low_correlation"
    TEMPORAL_INCONSISTENCY = "temporal_inconsistency"
    CONSTANT_METRIC = "constant_metric"
    REVERSE_TREND = "reverse_trend"


class Severity(Enum):
    """Severity levels for gaming events"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class GamingEvent:
    """Represents a detected proxy gaming event"""
    gaming_event_id: str
    timestamp: str
    metric_name: str
    gaming_type: str
    suspicion_score: float
    evidence: List[Dict[str, Any]]
    recommended_action: str
    severity: str
    service: Optional[str] = None
    baseline_value: Optional[float] = None
    current_value: Optional[float] = None
    change_percentage: Optional[float] = None

    def to_jsonl(self) -> str:
        """Convert to JSONL format"""
        return json.dumps(asdict(self))


class MetricsLoader:
    """Loads and processes metrics from various sources"""

    def __init__(self, workspace_root: Path = Path(".")):
        self.workspace_root = workspace_root
        self.evidence_dir = workspace_root / "evidence"
        self.metrics_dir = workspace_root / "metrics"

    def load_pattern_metrics(self) -> List[Dict[str, Any]]:
        """Load metrics from pattern_metrics.jsonl"""
        pattern_metrics_file = self.evidence_dir / "pattern_metrics.jsonl"
        if not pattern_metrics_file.exists():
            logger.warning(f"Pattern metrics file not found: {pattern_metrics_file}")
            return []

        metrics = []
        with open(pattern_metrics_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line:
                    metrics.append(json.loads(line))
        return metrics

    def load_metrics_directory(self) -> Dict[str, Any]:
        """Load all metrics from the metrics directory"""
        metrics_data = {}
        if not self.metrics_dir.exists():
            logger.warning(f"Metrics directory not found: {self.metrics_dir}")
            return metrics_data

        for json_file in self.metrics_dir.rglob("*.json"):
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                    # Use relative path as key
                    key = str(json_file.relative_to(self.metrics_dir))
                    metrics_data[key] = data
            except Exception as e:
                logger.warning(f"Failed to load {json_file}: {e}")

        return metrics_data

    def get_git_commits(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get git commits for the specified time period"""
        try:
            since_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
            cmd = [
                "git", "log",
                f"--since={since_date}",
                "--pretty=format:%H|%ai|%s",
                "--no-merges"
            ]
            result = subprocess.run(
                cmd,
                cwd=self.workspace_root,
                capture_output=True,
                text=True,
                check=False
            )

            commits = []
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line:
                        parts = line.split('|', 2)
                        if len(parts) == 3:
                            commits.append({
                                'hash': parts[0],
                                'timestamp': parts[1],
                                'message': parts[2]
                            })
            return commits
        except Exception as e:
            logger.warning(f"Failed to get git commits: {e}")
            return []


class GamingDetector:
    """Detects proxy gaming patterns in metrics"""

    def __init__(self, metrics_loader: MetricsLoader):
        self.loader = metrics_loader
        self.gaming_events: List[GamingEvent] = []

    def detect_sudden_jump(self, metric_name: str, values: List[float],
                          timestamps: List[str], threshold: float = 3.0) -> Optional[GamingEvent]:
        """
        Detect sudden, unrealistic jumps in metrics

        Uses statistical z-score to identify outliers beyond threshold standard deviations
        """
        if len(values) < 5:
            return None

        if PANDAS_AVAILABLE:
            # Use pandas for statistical analysis
            arr = np.array(values)
            mean = np.mean(arr[:-1])  # Exclude last value for comparison
            std = np.std(arr[:-1])
            last_value = arr[-1]

            if std == 0:
                return None

            z_score = abs((last_value - mean) / std)
            if z_score > threshold:
                change_pct = ((last_value - mean) / mean) * 100 if mean != 0 else 0
                evidence = [
                    {"type": "statistical_anomaly", "z_score": round(z_score, 2)},
                    {"type": "baseline_mean", "value": round(mean, 4)},
                    {"type": "baseline_std", "value": round(std, 4)},
                    {"type": "current_value", "value": round(last_value, 4)},
                    {"type": "change_percentage", "value": round(change_pct, 2)}
                ]
                return GamingEvent(
                    gaming_event_id=str(uuid.uuid4()),
                    timestamp=datetime.now().isoformat(),
                    metric_name=metric_name,
                    gaming_type=GamingType.SUDDEN_JUMP.value,
                    suspicion_score=min(z_score / threshold, 1.0),
                    evidence=evidence,
                    recommended_action=self._get_sudden_jump_recommendation(z_score),
                    severity=self._get_severity_from_score(z_score / threshold),
                    baseline_value=round(mean, 4),
                    current_value=round(last_value, 4),
                    change_percentage=round(change_pct, 2)
                )
        else:
            # Fallback implementation
            mean = sum(values[:-1]) / (len(values) - 1)
            variance = sum((x - mean) ** 2 for x in values[:-1]) / (len(values) - 1)
            std = variance ** 0.5
            last_value = values[-1]

            if std == 0:
                return None

            z_score = abs((last_value - mean) / std)
            if z_score > threshold:
                change_pct = ((last_value - mean) / mean) * 100 if mean != 0 else 0
                evidence = [
                    {"type": "statistical_anomaly", "z_score": round(z_score, 2)},
                    {"type": "baseline_mean", "value": round(mean, 4)},
                    {"type": "baseline_std", "value": round(std, 4)},
                    {"type": "current_value", "value": round(last_value, 4)},
                    {"type": "change_percentage", "value": round(change_pct, 2)}
                ]
                return GamingEvent(
                    gaming_event_id=str(uuid.uuid4()),
                    timestamp=datetime.now().isoformat(),
                    metric_name=metric_name,
                    gaming_type=GamingType.SUDDEN_JUMP.value,
                    suspicion_score=min(z_score / threshold, 1.0),
                    evidence=evidence,
                    recommended_action=self._get_sudden_jump_recommendation(z_score),
                    severity=self._get_severity_from_score(z_score / threshold),
                    baseline_value=round(mean, 4),
                    current_value=round(last_value, 4),
                    change_percentage=round(change_pct, 2)
                )
        return None

    def detect_metric_reality_divergence(self, metric_name: str, metric_values: List[float],
                                       reality_values: List[float]) -> Optional[GamingEvent]:
        """
        Detect divergence between metric improvements and actual system behavior

        Compares metric trends with related reality indicators to detect gaming
        """
        if len(metric_values) < 5 or len(reality_values) < 5:
            return None

        if PANDAS_AVAILABLE:
            # Calculate correlation between metric and reality
            correlation = np.corrcoef(metric_values, reality_values)[0, 1]

            # Check for negative correlation or low positive correlation
            if correlation < 0.3:
                metric_trend = (metric_values[-1] - metric_values[0]) / metric_values[0] if metric_values[0] != 0 else 0
                reality_trend = (reality_values[-1] - reality_values[0]) / reality_values[0] if reality_values[0] != 0 else 0

                evidence = [
                    {"type": "correlation", "value": round(correlation, 4)},
                    {"type": "metric_trend", "value": round(metric_trend, 4)},
                    {"type": "reality_trend", "value": round(reality_trend, 4)},
                    {"type": "divergence_detected", "value": True}
                ]
                return GamingEvent(
                    gaming_event_id=str(uuid.uuid4()),
                    timestamp=datetime.now().isoformat(),
                    metric_name=metric_name,
                    gaming_type=GamingType.METRIC_REALITY_DIVERGENCE.value,
                    suspicion_score=1.0 - max(correlation, 0),
                    evidence=evidence,
                    recommended_action=self._get_divergence_recommendation(correlation),
                    severity=self._get_severity_from_correlation(correlation)
                )
        else:
            # Fallback implementation
            n = min(len(metric_values), len(reality_values))
            mean_metric = sum(metric_values[:n]) / n
            mean_reality = sum(reality_values[:n]) / n

            cov = sum((metric_values[i] - mean_metric) * (reality_values[i] - mean_reality) for i in range(n)) / n
            std_metric = (sum((x - mean_metric) ** 2 for x in metric_values[:n]) / n) ** 0.5
            std_reality = (sum((x - mean_reality) ** 2 for x in reality_values[:n]) / n) ** 0.5

            correlation = cov / (std_metric * std_reality) if std_metric * std_reality != 0 else 0

            if correlation < 0.3:
                metric_trend = (metric_values[-1] - metric_values[0]) / metric_values[0] if metric_values[0] != 0 else 0
                reality_trend = (reality_values[-1] - reality_values[0]) / reality_values[0] if reality_values[0] != 0 else 0

                evidence = [
                    {"type": "correlation", "value": round(correlation, 4)},
                    {"type": "metric_trend", "value": round(metric_trend, 4)},
                    {"type": "reality_trend", "value": round(reality_trend, 4)},
                    {"type": "divergence_detected", "value": True}
                ]
                return GamingEvent(
                    gaming_event_id=str(uuid.uuid4()),
                    timestamp=datetime.now().isoformat(),
                    metric_name=metric_name,
                    gaming_type=GamingType.METRIC_REALITY_DIVERGENCE.value,
                    suspicion_score=1.0 - max(correlation, 0),
                    evidence=evidence,
                    recommended_action=self._get_divergence_recommendation(correlation),
                    severity=self._get_severity_from_correlation(correlation)
                )
        return None

    def detect_low_correlation_with_code_changes(self, metric_name: str, metric_values: List[float],
                                            timestamps: List[str], commits: List[Dict[str, Any]]) -> Optional[GamingEvent]:
        """
        Detect if metric improvements don't correlate with code changes

        Checks if metrics improve without corresponding code changes
        """
        if len(metric_values) < 3 or len(commits) == 0:
            return None

        # Calculate metric improvement
        if metric_values[-1] <= metric_values[0]:
            return None  # No improvement to check

        improvement = (metric_values[-1] - metric_values[0]) / metric_values[0] if metric_values[0] != 0 else 0

        # Count commits in the metric time window
        if timestamps:
            start_time = datetime.fromisoformat(timestamps[0].replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(timestamps[-1].replace('Z', '+00:00'))
            relevant_commits = [
                c for c in commits
                if start_time <= datetime.fromisoformat(c['timestamp'].replace('Z', '+00:00')) <= end_time
            ]
        else:
            relevant_commits = commits

        # Low improvement with no commits is suspicious
        if improvement > 0.1 and len(relevant_commits) == 0:
            evidence = [
                {"type": "metric_improvement", "value": round(improvement * 100, 2)},
                {"type": "code_changes_count", "value": len(relevant_commits)},
                {"type": "improvement_without_code", "value": True}
            ]
            return GamingEvent(
                gaming_event_id=str(uuid.uuid4()),
                timestamp=datetime.now().isoformat(),
                metric_name=metric_name,
                gaming_type=GamingType.LOW_CORRELATION.value,
                suspicion_score=0.8,
                evidence=evidence,
                recommended_action="Investigate metric calculation logic; verify if improvement is genuine or due to data manipulation",
                severity=Severity.HIGH.value
            )

        return None

    def detect_temporal_inconsistency(self, metric_name: str, values: List[float],
                                     timestamps: List[str]) -> Optional[GamingEvent]:
        """
        Detect if improvements are not sustained over time

        Checks for temporary spikes that revert quickly
        """
        if len(values) < 10:
            return None

        # Find the maximum value and its position
        max_idx = values.index(max(values))
        max_value = values[max_idx]

        # Check if values after the peak drop significantly
        if max_idx < len(values) - 3:
            post_peak_values = values[max_idx + 1:]
            post_peak_avg = sum(post_peak_values) / len(post_peak_values)

            # If post-peak average is significantly lower than peak
            if post_peak_avg < max_value * 0.7:
                drop_pct = ((max_value - post_peak_avg) / max_value) * 100
                evidence = [
                    {"type": "peak_value", "value": round(max_value, 4)},
                    {"type": "post_peak_average", "value": round(post_peak_avg, 4)},
                    {"type": "drop_percentage", "value": round(drop_pct, 2)},
                    {"type": "peak_position", "value": max_idx},
                    {"type": "unsustained_improvement", "value": True}
                ]
                return GamingEvent(
                    gaming_event_id=str(uuid.uuid4()),
                    timestamp=datetime.now().isoformat(),
                    metric_name=metric_name,
                    gaming_type=GamingType.TEMPORAL_INCONSISTENCY.value,
                    suspicion_score=0.7,
                    evidence=evidence,
                    recommended_action="Metric improvement is not sustained; investigate if peak was artificially inflated",
                    severity=Severity.MEDIUM.value
                )

        return None

    def detect_constant_metric(self, metric_name: str, values: List[float],
                            threshold: float = 0.01) -> Optional[GamingEvent]:
        """
        Detect metrics that remain suspiciously constant

        Natural metrics should have some variation
        """
        if len(values) < 5:
            return None

        if PANDAS_AVAILABLE:
            arr = np.array(values)
            std = np.std(arr)
            mean = np.mean(arr)

            # Check if standard deviation is extremely low
            if std < threshold and mean > 0:
                cv = (std / mean) * 100  # Coefficient of variation
                evidence = [
                    {"type": "standard_deviation", "value": round(std, 6)},
                    {"type": "mean", "value": round(mean, 4)},
                    {"type": "coefficient_of_variation", "value": round(cv, 4)},
                    {"type": "suspiciously_constant", "value": True}
                ]
                return GamingEvent(
                    gaming_event_id=str(uuid.uuid4()),
                    timestamp=datetime.now().isoformat(),
                    metric_name=metric_name,
                    gaming_type=GamingType.CONSTANT_METRIC.value,
                    suspicion_score=0.9,
                    evidence=evidence,
                    recommended_action="Metric shows suspiciously low variation; verify data collection and calculation logic",
                    severity=Severity.HIGH.value
                )
        else:
            mean = sum(values) / len(values)
            variance = sum((x - mean) ** 2 for x in values) / len(values)
            std = variance ** 0.5

            if std < threshold and mean > 0:
                cv = (std / mean) * 100
                evidence = [
                    {"type": "standard_deviation", "value": round(std, 6)},
                    {"type": "mean", "value": round(mean, 4)},
                    {"type": "coefficient_of_variation", "value": round(cv, 4)},
                    {"type": "suspiciously_constant", "value": True}
                ]
                return GamingEvent(
                    gaming_event_id=str(uuid.uuid4()),
                    timestamp=datetime.now().isoformat(),
                    metric_name=metric_name,
                    gaming_type=GamingType.CONSTANT_METRIC.value,
                    suspicion_score=0.9,
                    evidence=evidence,
                    recommended_action="Metric shows suspiciously low variation; verify data collection and calculation logic",
                    severity=Severity.HIGH.value
                )
        return None

    def _get_sudden_jump_recommendation(self, z_score: float) -> str:
        """Get recommendation based on z-score severity"""
        if z_score > 5:
            return "CRITICAL: Immediate investigation required. Verify data integrity and audit metric calculation pipeline."
        elif z_score > 4:
            return "HIGH: Investigate sudden metric change. Check for data manipulation or calculation errors."
        elif z_score > 3:
            return "MEDIUM: Review metric change. Verify corresponding system changes exist."
        else:
            return "LOW: Monitor metric for sustained improvement."

    def _get_divergence_recommendation(self, correlation: float) -> str:
        """Get recommendation based on correlation"""
        if correlation < 0:
            return "CRITICAL: Metric shows inverse relationship with reality. Immediate audit required."
        elif correlation < 0.2:
            return "HIGH: Metric improvement not reflected in system behavior. Investigate calculation logic."
        elif correlation < 0.3:
            return "MEDIUM: Weak correlation between metric and reality. Review metric definition."
        else:
            return "LOW: Monitor correlation trend."

    def _get_severity_from_score(self, score: float) -> str:
        """Convert suspicion score to severity level"""
        if score >= 0.8:
            return Severity.CRITICAL.value
        elif score >= 0.6:
            return Severity.HIGH.value
        elif score >= 0.4:
            return Severity.MEDIUM.value
        else:
            return Severity.LOW.value

    def _get_severity_from_correlation(self, correlation: float) -> str:
        """Convert correlation to severity level"""
        if correlation < 0:
            return Severity.CRITICAL.value
        elif correlation < 0.2:
            return Severity.HIGH.value
        elif correlation < 0.3:
            return Severity.MEDIUM.value
        else:
            return Severity.LOW.value


class AlignmentChecker:
    """Main alignment checker orchestrator"""

    def __init__(self, workspace_root: Path = Path(".")):
        self.workspace_root = workspace_root
        self.loader = MetricsLoader(workspace_root)
        self.detector = GamingDetector(self.loader)
        self.gaming_events_file = workspace_root / "evidence" / "gaming_events.jsonl"

    def run_detection(self, lookback_days: int = 7) -> List[GamingEvent]:
        """
        Run all gaming detection algorithms

        Args:
            lookback_days: Number of days to look back for git commits

        Returns:
            List of detected gaming events
        """
        logger.info("Starting proxy gaming detection...")

        # Load metrics
        pattern_metrics = self.loader.load_pattern_metrics()
        metrics_dir_data = self.loader.load_metrics_directory()
        commits = self.loader.get_git_commits(lookback_days)

        logger.info(f"Loaded {len(pattern_metrics)} pattern metrics")
        logger.info(f"Loaded {len(metrics_dir_data)} metrics directory files")
        logger.info(f"Found {len(commits)} git commits in last {lookback_days} days")

        gaming_events = []

        # Process pattern metrics
        if pattern_metrics:
            # Group by metric name
            metrics_by_name = {}
            for m in pattern_metrics:
                for key, value in m.items():
                    if key not in ['timestamp', 'service', 'pattern_type', 'was_false_positive'] and isinstance(value, (int, float)):
                        if key not in metrics_by_name:
                            metrics_by_name[key] = []
                        metrics_by_name[key].append({
                            'value': value,
                            'timestamp': m.get('timestamp'),
                            'service': m.get('service')
                        })

            # Run detection on each metric
            for metric_name, data_points in metrics_by_name.items():
                if len(data_points) < 3:
                    continue

                values = [d['value'] for d in data_points]
                timestamps = [d['timestamp'] for d in data_points]
                service = data_points[0].get('service')

                # Sudden jump detection
                event = self.detector.detect_sudden_jump(metric_name, values, timestamps)
                if event:
                    event.service = service
                    gaming_events.append(event)

                # Temporal inconsistency detection
                event = self.detector.detect_temporal_inconsistency(metric_name, values, timestamps)
                if event:
                    event.service = service
                    gaming_events.append(event)

                # Constant metric detection
                event = self.detector.detect_constant_metric(metric_name, values)
                if event:
                    event.service = service
                    gaming_events.append(event)

                # Low correlation with code changes
                event = self.detector.detect_low_correlation_with_code_changes(
                    metric_name, values, timestamps, commits
                )
                if event:
                    event.service = service
                    gaming_events.append(event)

                # Metric-reality divergence (use failure_rate vs failure_count as proxy)
                if 'failure_rate' in metrics_by_name and 'failure_count' in metrics_by_name:
                    rate_values = [d['value'] for d in metrics_by_name['failure_rate']]
                    count_values = [d['value'] for d in metrics_by_name['failure_count']]
                    min_len = min(len(rate_values), len(count_values))
                    if min_len >= 5:
                        event = self.detector.detect_metric_reality_divergence(
                            'failure_rate', rate_values[:min_len], count_values[:min_len]
                        )
                        if event:
                            gaming_events.append(event)

        logger.info(f"Detected {len(gaming_events)} potential gaming events")
        return gaming_events

    def save_gaming_events(self, events: List[GamingEvent]):
        """Save gaming events to JSONL file"""
        self.gaming_events_file.parent.mkdir(parents=True, exist_ok=True)

        with open(self.gaming_events_file, 'a') as f:
            for event in events:
                f.write(event.to_jsonl() + '\n')

        logger.info(f"Saved {len(events)} gaming events to {self.gaming_events_file}")

    def load_gaming_history(self, limit: int = 100) -> List[GamingEvent]:
        """Load gaming event history"""
        if not self.gaming_events_file.exists():
            return []

        events = []
        with open(self.gaming_events_file, 'r') as f:
            for i, line in enumerate(f):
                if i >= limit:
                    break
                line = line.strip()
                if line:
                    data = json.loads(line)
                    events.append(GamingEvent(**data))

        # Return in reverse chronological order
        return events[::-1]

    def generate_report(self, events: List[GamingEvent]) -> Dict[str, Any]:
        """Generate a comprehensive gaming detection report"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "total_events": len(events),
            "by_severity": {},
            "by_type": {},
            "by_metric": {},
            "events": [asdict(e) for e in events]
        }

        # Aggregate by severity
        for event in events:
            report["by_severity"][event.severity] = report["by_severity"].get(event.severity, 0) + 1

        # Aggregate by type
        for event in events:
            report["by_type"][event.gaming_type] = report["by_type"].get(event.gaming_type, 0) + 1

        # Aggregate by metric
        for event in events:
            report["by_metric"][event.metric_name] = report["by_metric"].get(event.metric_name, 0) + 1

        return report

    def print_report(self, report: Dict[str, Any]):
        """Print a formatted report"""
        print("\n" + "=" * 70)
        print("PROXY GAMING DETECTION REPORT")
        print("=" * 70)
        print(f"Generated: {report['timestamp']}")
        print(f"Total Events: {report['total_events']}")
        print()

        if report['total_events'] == 0:
            print("✅ No proxy gaming events detected.")
            return

        print("By Severity:")
        for severity, count in sorted(report['by_severity'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {severity.upper()}: {count}")
        print()

        print("By Gaming Type:")
        for gtype, count in sorted(report['by_type'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {gtype}: {count}")
        print()

        print("By Metric:")
        for metric, count in sorted(report['by_metric'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {metric}: {count}")
        print()

        print("Recent Events:")
        for event in report['events'][:10]:
            print(f"\n  [{event['severity'].upper()}] {event['metric_name']}")
            print(f"    Type: {event['gaming_type']}")
            print(f"    Score: {event['suspicion_score']:.2f}")
            print(f"    Action: {event['recommended_action']}")
            if event.get('service'):
                print(f"    Service: {event['service']}")
            if event.get('change_percentage') is not None:
                print(f"    Change: {event['change_percentage']:.2f}%")

        if len(report['events']) > 10:
            print(f"\n  ... and {len(report['events']) - 10} more events")

        print("\n" + "=" * 70)


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Proxy Gaming Detection - Alignment Checker",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/governance/alignment_checker.py check
  python scripts/governance/alignment_checker.py check --days 14
  python scripts/governance/alignment_checker.py report
  python scripts/governance/alignment_checker.py history --limit 50
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # Check command
    check_parser = subparsers.add_parser('check', help='Run gaming detection')
    check_parser.add_argument('--days', type=int, default=7,
                          help='Days to look back for git commits (default: 7)')
    check_parser.add_argument('--save', action='store_true',
                          help='Save detected events to gaming_events.jsonl')

    # Report command
    report_parser = subparsers.add_parser('report', help='Generate gaming report')
    report_parser.add_argument('--input', type=Path,
                            help='Input JSONL file with gaming events (default: evidence/gaming_events.jsonl)')

    # History command
    history_parser = subparsers.add_parser('history', help='Show gaming history')
    history_parser.add_argument('--limit', type=int, default=100,
                            help='Number of events to show (default: 100)')
    history_parser.add_argument('--all', action='store_true',
                            help='Show all events without limit')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    checker = AlignmentChecker()

    if args.command == 'check':
        logger.info(f"Running gaming detection with {args.days} day lookback")
        events = checker.run_detection(args.days)

        if events:
            report = checker.generate_report(events)
            checker.print_report(report)

            if args.save:
                checker.save_gaming_events(events)
                print(f"\n💾 Events saved to {checker.gaming_events_file}")
        else:
            print("\n✅ No proxy gaming events detected.")

    elif args.command == 'report':
        input_file = args.input if args.input else checker.gaming_events_file

        if not input_file.exists():
            print(f"❌ Gaming events file not found: {input_file}")
            print("   Run 'check' command first to generate events.")
            return

        # Load events from file
        events = []
        with open(input_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line:
                    data = json.loads(line)
                    events.append(GamingEvent(**data))

        report = checker.generate_report(events)
        checker.print_report(report)

    elif args.command == 'history':
        limit = None if args.all else args.limit
        events = checker.load_gaming_history(limit)

        if not events:
            print("No gaming history found.")
            print("Run 'check' command to generate events.")
            return

        print(f"\n{'=' * 70}")
        print("GAMING EVENT HISTORY")
        print(f"{'=' * 70}")
        print(f"Showing {len(events)} events\n")

        for event in events:
            print(f"[{event.timestamp}]")
            print(f"  Metric: {event.metric_name}")
            print(f"  Type: {event.gaming_type}")
            print(f"  Severity: {event.severity.upper()}")
            print(f"  Score: {event.suspicion_score:.2f}")
            if event.service:
                print(f"  Service: {event.service}")
            print(f"  Action: {event.recommended_action}")
            print()

        print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
