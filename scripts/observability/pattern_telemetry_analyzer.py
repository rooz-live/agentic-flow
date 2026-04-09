#!/usr/bin/env python3
"""
Pattern Telemetry Analysis System
Analyzes pattern execution telemetry, identifies performance patterns, and detects anomalies
"""

import json
import os
import sys
import logging
import statistics
from collections import defaultdict, Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Set
import math

class PatternTelemetryAnalyzer:
    """Analyzes pattern execution telemetry and identifies performance patterns"""

    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)
        self.goalie_dir = Path(os.environ.get("PROJECT_ROOT", ".")) / ".goalie"
        self.logger = self._setup_logging()

        # Analysis configuration
        pattern_config = self.config.get("observability", {}).get("pattern_analysis", {})
        self.correlation_window_hours = pattern_config.get("correlation_window_hours", 24)
        self.trend_analysis_period_days = pattern_config.get("trend_analysis_period_days", 7)

        # Anomaly detection settings
        anomaly_config = pattern_config.get("anomaly_detection", {})
        self.anomaly_algorithm = anomaly_config.get("algorithm", "isolation_forest")
        self.contamination = anomaly_config.get("contamination", 0.1)
        self.min_samples = anomaly_config.get("min_samples", 100)

    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load observability configuration"""
        if config_path:
            config_file = Path(config_path)
        else:
            config_file = Path(os.environ.get("PROJECT_ROOT", ".")) / ".goalie" / "observability_config.json"

        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    return json.load(f)
            except json.JSONDecodeError as e:
                print(f"Error loading config: {e}", file=sys.stderr)
                return {}
        return {}

    def _setup_logging(self) -> logging.Logger:
        """Setup logging for pattern analysis"""
        logger = logging.getLogger("pattern_analyzer")
        logger.setLevel(logging.INFO)

        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

        log_config = self.config.get("logging", {})
        if log_config.get("outputs"):
            for output in log_config["outputs"]:
                if output != "console":
                    file_handler = logging.FileHandler(output)
                    file_handler.setLevel(logging.INFO)
                    file_handler.setFormatter(formatter)
                    logger.addHandler(file_handler)

        return logger

    def load_pattern_events(self) -> List[Dict[str, Any]]:
        """Load pattern events from telemetry sources"""
        pattern_files = [
            "pattern_metrics.jsonl",
            "unified_evidence.jsonl",
            "telemetry_log.jsonl"
        ]

        all_events = []

        for filename in pattern_files:
            file_path = self.goalie_dir / filename
            if file_path.exists():
                try:
                    if filename.endswith('.jsonl'):
                        with open(file_path, 'r') as f:
                            for line in f:
                                line = line.strip()
                                if line:
                                    try:
                                        event = json.loads(line)
                                        if self._is_pattern_event(event):
                                            all_events.append(event)
                                    except json.JSONDecodeError:
                                        continue
                except Exception as e:
                    self.logger.error(f"Error loading {filename}: {e}")

        # Sort by timestamp
        all_events.sort(key=lambda x: self._parse_timestamp(x) or datetime.min.replace(tzinfo=timezone.utc))
        return all_events

    def _is_pattern_event(self, event: Dict[str, Any]) -> bool:
        """Check if event is related to pattern execution"""
        # Check for pattern-related fields
        pattern_indicators = [
            'pattern', 'pattern_type', 'pattern_execution',
            'wsjf_score', 'cost_of_delay', 'job_size',
            'circle', 'depth', 'tier'
        ]

        return any(indicator in event for indicator in pattern_indicators) or \
               event.get('category') == 'pattern' or \
               'pattern' in event.get('event_type', '').lower()

    def analyze_pattern_execution_telemetry(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze pattern execution telemetry"""
        if not events:
            return {"error": "No pattern events found for analysis"}

        analysis = {
            "execution_summary": {},
            "performance_patterns": {},
            "temporal_patterns": {},
            "success_failure_analysis": {},
            "resource_utilization": {}
        }

        # Execution summary
        analysis["execution_summary"] = self._analyze_execution_summary(events)

        # Performance patterns
        analysis["performance_patterns"] = self._analyze_performance_patterns(events)

        # Temporal patterns
        analysis["temporal_patterns"] = self._analyze_temporal_patterns(events)

        # Success/failure analysis
        analysis["success_failure_analysis"] = self._analyze_success_failure_patterns(events)

        # Resource utilization
        analysis["resource_utilization"] = self._analyze_resource_utilization(events)

        return analysis

    def _analyze_execution_summary(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze overall pattern execution summary"""
        total_executions = len(events)
        patterns_executed = set()

        execution_times = []
        depths = []
        circles = Counter()
        statuses = Counter()

        for event in events:
            pattern = event.get('pattern', event.get('pattern_type', 'unknown'))
            patterns_executed.add(pattern)

            if event.get('duration_ms'):
                execution_times.append(event['duration_ms'])
            if event.get('depth') is not None:
                depths.append(event['depth'])

            circle = event.get('circle', 'unknown')
            circles[circle] += 1

            status = event.get('status', event.get('outcome', 'unknown'))
            statuses[status] += 1

        return {
            "total_executions": total_executions,
            "unique_patterns": len(patterns_executed),
            "patterns_list": list(patterns_executed),
            "avg_execution_time_ms": statistics.mean(execution_times) if execution_times else None,
            "median_execution_time_ms": statistics.median(execution_times) if execution_times else None,
            "avg_depth": statistics.mean(depths) if depths else None,
            "execution_times": execution_times,
            "circles_distribution": dict(circles),
            "status_distribution": dict(statuses)
        }

    def _analyze_performance_patterns(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze performance patterns across different dimensions"""
        performance_analysis = {
            "by_pattern_type": {},
            "by_circle": {},
            "by_depth": {},
            "efficiency_trends": {}
        }

        # Group by pattern type
        pattern_groups = defaultdict(list)
        for event in events:
            pattern = event.get('pattern', event.get('pattern_type', 'unknown'))
            pattern_groups[pattern].append(event)

        for pattern, pattern_events in pattern_groups.items():
            if len(pattern_events) >= 3:  # Need minimum samples
                execution_times = [e.get('duration_ms', 0) for e in pattern_events if e.get('duration_ms')]
                success_rate = sum(1 for e in pattern_events if e.get('status') == 'completed') / len(pattern_events)

                performance_analysis["by_pattern_type"][pattern] = {
                    "execution_count": len(pattern_events),
                    "avg_execution_time": statistics.mean(execution_times) if execution_times else None,
                    "success_rate": success_rate,
                    "performance_score": self._calculate_performance_score(pattern_events)
                }

        # Group by circle
        circle_groups = defaultdict(list)
        for event in events:
            circle = event.get('circle', 'unknown')
            circle_groups[circle].append(event)

        for circle, circle_events in circle_groups.items():
            performance_analysis["by_circle"][circle] = {
                "execution_count": len(circle_events),
                "avg_execution_time": statistics.mean([e.get('duration_ms', 0) for e in circle_events if e.get('duration_ms')]),
                "success_rate": sum(1 for e in circle_events if e.get('status') == 'completed') / len(circle_events),
                "performance_trend": self._calculate_trend([e.get('duration_ms', 0) for e in circle_events if e.get('duration_ms')])
            }

        # Group by depth
        depth_groups = defaultdict(list)
        for event in events:
            depth = event.get('depth', 0)
            depth_groups[depth].append(event)

        for depth, depth_events in depth_groups.items():
            performance_analysis["by_depth"][depth] = {
                "execution_count": len(depth_events),
                "avg_execution_time": statistics.mean([e.get('duration_ms', 0) for e in depth_events if e.get('duration_ms')]),
                "complexity_score": self._calculate_complexity_score(depth_events)
            }

        return performance_analysis

    def _analyze_temporal_patterns(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze temporal patterns in pattern execution"""
        temporal_analysis = {
            "hourly_distribution": {},
            "daily_distribution": {},
            "weekly_patterns": {},
            "peak_execution_times": {}
        }

        hourly_counts = Counter()
        daily_counts = Counter()
        weekly_patterns = defaultdict(list)

        for event in events:
            ts = self._parse_timestamp(event)
            if ts:
                hourly_counts[ts.hour] += 1
                daily_counts[ts.strftime('%A')] += 1
                week_key = ts.strftime('%Y-%W')
                weekly_patterns[week_key].append(ts)

        temporal_analysis["hourly_distribution"] = dict(hourly_counts)
        temporal_analysis["daily_distribution"] = dict(daily_counts)

        # Find peak hours
        if hourly_counts:
            peak_hour = hourly_counts.most_common(1)[0][0]
            temporal_analysis["peak_execution_times"]["peak_hour"] = peak_hour
            temporal_analysis["peak_execution_times"]["peak_hour_count"] = hourly_counts[peak_hour]

        # Weekly patterns
        for week, timestamps in weekly_patterns.items():
            if timestamps:
                temporal_analysis["weekly_patterns"][week] = {
                    "execution_count": len(timestamps),
                    "avg_daily_executions": len(timestamps) / 7
                }

        return temporal_analysis

    def _analyze_success_failure_patterns(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze success and failure patterns"""
        success_failure_analysis = {
            "overall_success_rate": 0.0,
            "failure_patterns": {},
            "success_factors": {},
            "risk_indicators": {}
        }

        total_events = len(events)
        successful_events = [e for e in events if e.get('status') == 'completed']
        failed_events = [e for e in events if e.get('status') == 'failed']

        success_rate = len(successful_events) / total_events if total_events > 0 else 0
        success_failure_analysis["overall_success_rate"] = success_rate

        # Analyze failure patterns
        if failed_events:
            failure_reasons = Counter()
            failure_contexts = defaultdict(list)

            for event in failed_events:
                reason = event.get('error', event.get('failure_reason', 'unknown'))
                failure_reasons[reason] += 1

                # Context analysis
                context = {
                    'pattern': event.get('pattern', 'unknown'),
                    'circle': event.get('circle', 'unknown'),
                    'depth': event.get('depth', 0),
                    'duration_ms': event.get('duration_ms', 0)
                }
                failure_contexts[reason].append(context)

            success_failure_analysis["failure_patterns"] = {
                "common_reasons": dict(failure_reasons.most_common(5)),
                "failure_contexts": dict(failure_contexts)
            }

        # Analyze success factors
        if successful_events:
            success_patterns = Counter()
            for event in successful_events:
                # Identify patterns common to successful executions
                pattern = event.get('pattern', 'unknown')
                circle = event.get('circle', 'unknown')
                success_patterns[f"{pattern}_{circle}"] += 1

            success_failure_analysis["success_factors"] = {
                "successful_patterns": dict(success_patterns.most_common(5))
            }

        # Risk indicators
        risk_indicators = []
        if success_rate < 0.8:
            risk_indicators.append({
                "type": "low_success_rate",
                "severity": "high",
                "description": f"Overall success rate is {success_rate:.1%}, below acceptable threshold"
            })

        if failed_events and len(failed_events) > total_events * 0.2:
            risk_indicators.append({
                "type": "high_failure_rate",
                "severity": "medium",
                "description": f"Failure rate is {(len(failed_events)/total_events):.1%}, indicating systemic issues"
            })

        success_failure_analysis["risk_indicators"] = risk_indicators

        return success_failure_analysis

    def _analyze_resource_utilization(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze resource utilization patterns"""
        resource_analysis = {
            "cpu_utilization": {},
            "memory_utilization": {},
            "resource_efficiency": {},
            "bottlenecks": []
        }

        # Extract resource metrics
        cpu_usage = []
        memory_usage = []

        for event in events:
            system_info = event.get('system_info', {})
            if 'cpu_usage' in system_info:
                cpu_usage.append(system_info['cpu_usage'])
            if 'memory_usage' in system_info:
                memory_usage.append(system_info['memory_usage'])

        if cpu_usage:
            resource_analysis["cpu_utilization"] = {
                "avg_cpu": statistics.mean(cpu_usage),
                "max_cpu": max(cpu_usage),
                "cpu_variance": statistics.variance(cpu_usage) if len(cpu_usage) > 1 else 0
            }

        if memory_usage:
            resource_analysis["memory_utilization"] = {
                "avg_memory_mb": statistics.mean(memory_usage),
                "max_memory_mb": max(memory_usage),
                "memory_variance": statistics.variance(memory_usage) if len(memory_usage) > 1 else 0
            }

        # Identify potential bottlenecks
        bottlenecks = []
        if cpu_usage and statistics.mean(cpu_usage) > 80:
            bottlenecks.append({
                "type": "cpu_bottleneck",
                "severity": "high",
                "description": f"Average CPU usage is {statistics.mean(cpu_usage):.1f}%, indicating potential CPU bottleneck"
            })

        if memory_usage and statistics.mean(memory_usage) > 80:
            bottlenecks.append({
                "type": "memory_bottleneck",
                "severity": "high",
                "description": f"Average memory usage is {statistics.mean(memory_usage):.1f}MB, indicating potential memory bottleneck"
            })

        resource_analysis["bottlenecks"] = bottlenecks

        return resource_analysis

    def detect_pattern_anomalies(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Detect anomalies in pattern behavior"""
        anomaly_analysis = {
            "execution_time_anomalies": [],
            "frequency_anomalies": [],
            "failure_anomalies": [],
            "resource_anomalies": []
        }

        if len(events) < self.min_samples:
            return {"error": f"Insufficient data for anomaly detection. Need at least {self.min_samples} events"}

        # Execution time anomalies
        execution_times = [e.get('duration_ms', 0) for e in events if e.get('duration_ms') is not None]
        if execution_times:
            mean_time = statistics.mean(execution_times)
            std_time = statistics.stdev(execution_times) if len(execution_times) > 1 else 0

            for i, event in enumerate(events):
                if event.get('duration_ms'):
                    time_diff = abs(event['duration_ms'] - mean_time)
                    if std_time > 0 and time_diff > 3 * std_time:  # 3-sigma rule
                        anomaly_analysis["execution_time_anomalies"].append({
                            "event_index": i,
                            "pattern": event.get('pattern', 'unknown'),
                            "duration_ms": event['duration_ms'],
                            "deviation_sigma": time_diff / std_time,
                            "severity": "high" if time_diff > 5 * std_time else "medium"
                        })

        # Frequency anomalies (unusual execution patterns)
        recent_events = [e for e in events if self._is_recent_event(e, hours=24)]
        if recent_events:
            hourly_counts = Counter()
            for event in recent_events:
                ts = self._parse_timestamp(event)
                if ts:
                    hourly_counts[ts.hour] += 1

            avg_hourly = statistics.mean(hourly_counts.values())
            std_hourly = statistics.stdev(hourly_counts.values()) if len(hourly_counts) > 1 else 0

            for hour, count in hourly_counts.items():
                if std_hourly > 0 and abs(count - avg_hourly) > 2 * std_hourly:
                    anomaly_analysis["frequency_anomalies"].append({
                        "hour": hour,
                        "actual_count": count,
                        "expected_count": avg_hourly,
                        "deviation": abs(count - avg_hourly) / std_hourly,
                        "type": "high" if count > avg_hourly else "low"
                    })

        # Failure rate anomalies
        pattern_failures = defaultdict(lambda: {"total": 0, "failed": 0})
        for event in events:
            pattern = event.get('pattern', 'unknown')
            pattern_failures[pattern]["total"] += 1
            if event.get('status') == 'failed':
                pattern_failures[pattern]["failed"] += 1

        for pattern, data in pattern_failures.items():
            if data["total"] >= 10:  # Minimum sample size
                failure_rate = data["failed"] / data["total"]
                if failure_rate > 0.5:  # High failure rate
                    anomaly_analysis["failure_anomalies"].append({
                        "pattern": pattern,
                        "failure_rate": failure_rate,
                        "total_executions": data["total"],
                        "severity": "critical" if failure_rate > 0.8 else "high"
                    })

        return anomaly_analysis

    def analyze_pattern_correlations(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze correlations and dependencies between patterns"""
        correlation_analysis = {
            "pattern_dependencies": {},
            "execution_sequences": {},
            "cooccurrence_patterns": {},
            "causal_relationships": []
        }

        if len(events) < 10:
            return {"error": "Insufficient data for correlation analysis"}

        # Analyze execution sequences
        sorted_events = sorted([e for e in events if self._parse_timestamp(e)],
                              key=lambda x: self._parse_timestamp(x))

        # Find patterns that tend to execute together
        pattern_sequences = []
        current_sequence = []

        for event in sorted_events:
            ts = self._parse_timestamp(event)
            pattern = event.get('pattern', 'unknown')

            if not current_sequence:
                current_sequence.append((pattern, ts))
            else:
                time_diff = (ts - current_sequence[-1][1]).total_seconds() / 60  # minutes
                if time_diff < 30:  # Within 30 minutes
                    current_sequence.append((pattern, ts))
                else:
                    if len(current_sequence) > 1:
                        pattern_sequences.append([p for p, _ in current_sequence])
                    current_sequence = [(pattern, ts)]

        if current_sequence and len(current_sequence) > 1:
            pattern_sequences.append([p for p, _ in current_sequence])

        # Analyze co-occurrence
        cooccurrence = defaultdict(lambda: defaultdict(int))
        for sequence in pattern_sequences:
            for i, pattern1 in enumerate(sequence):
                for pattern2 in sequence[i+1:]:
                    cooccurrence[pattern1][pattern2] += 1
                    cooccurrence[pattern2][pattern1] += 1

        correlation_analysis["cooccurrence_patterns"] = dict(cooccurrence)

        # Identify potential dependencies
        dependencies = []
        for pattern1, related_patterns in cooccurrence.items():
            for pattern2, count in related_patterns.items():
                if count >= 3:  # Minimum co-occurrence threshold
                    dependencies.append({
                        "pattern_a": pattern1,
                        "pattern_b": pattern2,
                        "cooccurrence_count": count,
                        "strength": count / len(pattern_sequences)
                    })

        correlation_analysis["pattern_dependencies"] = dependencies

        # Analyze causal relationships (simplified)
        causal_relationships = []
        for dep in dependencies:
            # Check if pattern_b tends to fail when pattern_a fails
            pattern_a_events = [e for e in events if e.get('pattern') == dep['pattern_a']]
            pattern_b_events = [e for e in events if e.get('pattern') == dep['pattern_b']]

            a_failure_rate = sum(1 for e in pattern_a_events if e.get('status') == 'failed') / len(pattern_a_events)
            b_failure_rate = sum(1 for e in pattern_b_events if e.get('status') == 'failed') / len(pattern_b_events)

            if abs(a_failure_rate - b_failure_rate) < 0.1:  # Similar failure rates
                causal_relationships.append({
                    "cause_pattern": dep['pattern_a'],
                    "effect_pattern": dep['pattern_b'],
                    "correlation_strength": dep['strength'],
                    "evidence": "similar_failure_rates"
                })

        correlation_analysis["causal_relationships"] = causal_relationships

        return correlation_analysis

    def _calculate_performance_score(self, events: List[Dict[str, Any]]) -> float:
        """Calculate performance score for a set of events"""
        if not events:
            return 0.0

        success_rate = sum(1 for e in events if e.get('status') == 'completed') / len(events)
        avg_time = statistics.mean([e.get('duration_ms', 0) for e in events if e.get('duration_ms')])

        # Normalize time (lower is better, but we want higher score)
        time_score = max(0, 1 - (avg_time / 60000))  # Assume 1 minute is baseline

        return (success_rate * 0.7) + (time_score * 0.3)

    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction"""
        if len(values) < 3:
            return "insufficient_data"

        # Simple linear trend
        n = len(values)
        x = list(range(n))
        slope = statistics.linear_regression(x, values)[0]

        if slope > 0.1:
            return "increasing"
        elif slope < -0.1:
            return "decreasing"
        else:
            return "stable"

    def _calculate_complexity_score(self, events: List[Dict[str, Any]]) -> float:
        """Calculate complexity score based on various factors"""
        if not events:
            return 0.0

        avg_depth = statistics.mean([e.get('depth', 0) for e in events])
        avg_time = statistics.mean([e.get('duration_ms', 0) for e in events if e.get('duration_ms')])

        # Complexity factors
        depth_factor = min(avg_depth / 5, 1.0)  # Normalize depth
        time_factor = min(avg_time / 300000, 1.0)  # Normalize time (5 minutes)

        return (depth_factor * 0.6) + (time_factor * 0.4)

    def _is_recent_event(self, event: Dict[str, Any], hours: int = 24) -> bool:
        """Check if event is within recent time window"""
        ts = self._parse_timestamp(event)
        if not ts:
            return False

        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        return ts >= cutoff

    def _parse_timestamp(self, event: Dict[str, Any]) -> Optional[datetime]:
        """Parse timestamp from event"""
        ts = event.get("timestamp") or event.get("ts")
        if not ts:
            return None

        try:
            if 'T' in ts:
                dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            else:
                dt = datetime.fromisoformat(ts)

            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except (ValueError, TypeError):
            return None

    def analyze_patterns(self) -> Dict[str, Any]:
        """Main pattern analysis method"""
        try:
            self.logger.info("Starting pattern telemetry analysis")

            # Load pattern events
            events = self.load_pattern_events()

            if not events:
                return {"error": "No pattern events found for analysis"}

            # Analyze pattern execution telemetry
            telemetry_analysis = self.analyze_pattern_execution_telemetry(events)

            # Detect anomalies
            anomaly_analysis = self.detect_pattern_anomalies(events)

            # Analyze correlations
            correlation_analysis = self.analyze_pattern_correlations(events)

            result = {
                "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
                "total_events_analyzed": len(events),
                "telemetry_analysis": telemetry_analysis,
                "anomaly_analysis": anomaly_analysis,
                "correlation_analysis": correlation_analysis,
                "insights": self._generate_insights(telemetry_analysis, anomaly_analysis, correlation_analysis)
            }

            self.logger.info(f"Pattern analysis completed. Analyzed {len(events)} events")
            return result

        except Exception as e:
            self.logger.error(f"Error during pattern analysis: {e}")
            return {
                "error": str(e),
                "error_type": type(e).__name__,
                "analysis_timestamp": datetime.now(timezone.utc).isoformat()
            }

    def _generate_insights(self, telemetry: Dict, anomalies: Dict, correlations: Dict) -> List[Dict[str, Any]]:
        """Generate actionable insights from analysis"""
        insights = []

        # Performance insights
        if "performance_patterns" in telemetry:
            perf_patterns = telemetry["performance_patterns"]
            if "by_pattern_type" in perf_patterns:
                for pattern, data in perf_patterns["by_pattern_type"].items():
                    if data.get("success_rate", 0) < 0.7:
                        insights.append({
                            "type": "performance_issue",
                            "severity": "high",
                            "pattern": pattern,
                            "description": f"Pattern '{pattern}' has low success rate ({data['success_rate']:.1%})",
                            "recommendation": "Review and optimize pattern implementation"
                        })

        # Anomaly insights
        if "execution_time_anomalies" in anomalies and anomalies["execution_time_anomalies"]:
            insights.append({
                "type": "execution_anomaly",
                "severity": "medium",
                "description": f"Detected {len(anomalies['execution_time_anomalies'])} execution time anomalies",
                "recommendation": "Investigate unusual execution times"
            })

        # Correlation insights
        if "causal_relationships" in correlations and correlations["causal_relationships"]:
            insights.append({
                "type": "correlation_discovery",
                "severity": "low",
                "description": f"Found {len(correlations['causal_relationships'])} potential causal relationships",
                "recommendation": "Analyze pattern dependencies for optimization"
            })

        return insights

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Pattern Telemetry Analysis")
    parser.add_argument("--config", help="Path to observability config file")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    parser.add_argument("--hours", type=int, help="Limit analysis to last N hours")

    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)

    analyzer = PatternTelemetryAnalyzer(args.config)
    result = analyzer.analyze_patterns()

    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print("=" * 80)
        print("PATTERN TELEMETRY ANALYSIS REPORT")
        print("=" * 80)
        print(f"Analysis Time: {result.get('analysis_timestamp', 'Unknown')}")
        print(f"Events Analyzed: {result.get('total_events_analyzed', 0)}")

        if "error" in result:
            print(f"ERROR: {result['error']}")
            return

        telemetry = result.get("telemetry_analysis", {})
        if "execution_summary" in telemetry:
            summary = telemetry["execution_summary"]
            print("\n📊 Execution Summary:")
            print(f"   Total Executions: {summary.get('total_executions', 0)}")
            print(f"   Unique Patterns: {summary.get('unique_patterns', 0)}")
            print(f"   Success Rate: {summary.get('status_distribution', {}).get('completed', 0) / summary.get('total_executions', 1):.1%}")

        anomalies = result.get("anomaly_analysis", {})
        if "execution_time_anomalies" in anomalies and anomalies["execution_time_anomalies"]:
            print(f"\n⚠️  Anomalies Detected: {len(anomalies['execution_time_anomalies'])} execution time anomalies")

        insights = result.get("insights", [])
        if insights:
            print("\n💡 Key Insights:")
            for i, insight in enumerate(insights[:3], 1):
                print(f"   {i}. {insight['description']} ({insight['severity']})")

if __name__ == "__main__":
    main()