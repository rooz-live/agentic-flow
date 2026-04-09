#!/usr/bin/env python3
"""
Observability Gap Detection System
Identifies blind spots in monitoring coverage and provides remediation recommendations
"""

import json
import os
import sys
import logging
from collections import defaultdict, Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple
import statistics

class ObservabilityGapDetector:
    """Detects gaps in observability coverage"""

    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)
        self.goalie_dir = Path(os.environ.get("PROJECT_ROOT", ".")) / ".goalie"
        self.logger = self._setup_logging()

        # Ensure .goalie directory exists
        try:
            self.goalie_dir.mkdir(parents=True, exist_ok=True)
        except PermissionError as e:
            self.logger.error(f"Permission denied creating .goalie directory: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Error creating .goalie directory: {e}")
            raise

        # Expected telemetry sources from config
        self.expected_sources = set(self.config.get("observability", {}).get("telemetry_sources", []))

        # Gap detection thresholds
        gap_config = self.config.get("observability", {}).get("gap_detection", {})
        self.blind_spot_threshold = gap_config.get("blind_spot_threshold", 0.1)
        self.coverage_check_interval = gap_config.get("coverage_check_interval_minutes", 15)

        # Prioritization weights
        weights = gap_config.get("prioritization_weights", {})
        self.criticality_weight = weights.get("criticality", 0.4)
        self.impact_weight = weights.get("impact", 0.3)
        self.frequency_weight = weights.get("frequency", 0.3)

    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load observability configuration"""
        if config_path:
            config_file = Path(config_path)
        else:
            config_file = Path(os.environ.get("PROJECT_ROOT", ".")) / ".goalie" / "observability_config.json"

        if config_file.exists():
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except json.JSONDecodeError as e:
                self.logger.error(f"Invalid JSON in config file {config_file}: {e}")
                return {}
            except PermissionError as e:
                self.logger.error(f"Permission denied reading config file {config_file}: {e}")
                return {}
            except FileNotFoundError as e:
                self.logger.error(f"Config file not found {config_file}: {e}")
                return {}
            except Exception as e:
                self.logger.error(f"Unexpected error loading config {config_file}: {e}")
                return {}
        else:
            self.logger.warning(f"Config file not found: {config_file}. Using default configuration.")
        return {}

    def _setup_logging(self) -> logging.Logger:
        """Setup logging for gap detection"""
        logger = logging.getLogger("gap_detector")
        logger.setLevel(logging.INFO)

        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

        # File handler if configured
        log_config = self.config.get("logging", {})
        if log_config.get("outputs"):
            for output in log_config["outputs"]:
                if output != "console":
                    file_handler = logging.FileHandler(output)
                    file_handler.setLevel(logging.INFO)
                    file_handler.setFormatter(formatter)
                    logger.addHandler(file_handler)

        return logger

    def load_evidence_files(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load all evidence files for analysis"""
        evidence_files = {
            "unified_evidence": "unified_evidence.jsonl",
            "pattern_metrics": "pattern_metrics.jsonl",
            "telemetry": "telemetry_log.jsonl",
            "performance": "performance_metrics.jsonl",
            "system_health": "system_health.json",
            "observability_gaps": "observability_gaps.jsonl"
        }

        loaded_data = {}

        for key, filename in evidence_files.items():
            file_path = self.goalie_dir / filename
            if file_path.exists():
                try:
                    if filename.endswith('.jsonl'):
                        data = []
                        with open(file_path, 'r') as f:
                            for line in f:
                                line = line.strip()
                                if line:
                                    try:
                                        data.append(json.loads(line))
                                    except json.JSONDecodeError:
                                        continue
                        loaded_data[key] = data
                    elif filename.endswith('.json'):
                        with open(file_path, 'r') as f:
                            loaded_data[key] = json.load(f)
                except Exception as e:
                    self.logger.error(f"Error loading {filename}: {e}")
                    loaded_data[key] = []
            else:
                loaded_data[key] = []

        return loaded_data

    def analyze_coverage_completeness(self, evidence_data: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Analyze completeness of telemetry coverage"""
        coverage_analysis = {
            "source_coverage": {},
            "temporal_coverage": {},
            "data_quality": {},
            "overall_coverage_score": 0.0
        }

        # Analyze source coverage
        for source in self.expected_sources:
            if source in evidence_data:
                events = evidence_data[source]
                coverage_analysis["source_coverage"][source] = {
                    "events_count": len(events),
                    "has_recent_data": self._has_recent_data(events),
                    "data_completeness": self._calculate_data_completeness(events)
                }
            else:
                coverage_analysis["source_coverage"][source] = {
                    "events_count": 0,
                    "has_recent_data": False,
                    "data_completeness": 0.0
                }

        # Analyze temporal coverage
        coverage_analysis["temporal_coverage"] = self._analyze_temporal_coverage(evidence_data)

        # Analyze data quality
        coverage_analysis["data_quality"] = self._analyze_data_quality(evidence_data)

        # Calculate overall coverage score
        coverage_analysis["overall_coverage_score"] = self._calculate_overall_coverage_score(coverage_analysis)

        return coverage_analysis

    def _has_recent_data(self, events: List[Dict[str, Any]], hours: int = 24) -> bool:
        """Check if events have recent data within specified hours"""
        if not events:
            return False

        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        recent_events = [e for e in events if self._parse_timestamp(e) and self._parse_timestamp(e) >= cutoff]
        return len(recent_events) > 0

    def _calculate_data_completeness(self, events: List[Dict[str, Any]]) -> float:
        """Calculate data completeness score (0.0 to 1.0)"""
        if not events:
            return 0.0

        required_fields = ["timestamp", "source", "event_type"]
        total_score = 0.0

        for event in events[:100]:  # Sample first 100 events
            event_score = 0.0
            for field in required_fields:
                if field in event and event[field]:
                    event_score += 1.0
            total_score += event_score / len(required_fields)

        return total_score / len(events[:100]) if events[:100] else 0.0

    def _analyze_temporal_coverage(self, evidence_data: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Analyze temporal gaps in telemetry"""
        temporal_analysis = {
            "time_gaps": [],
            "coverage_intervals": {},
            "missing_periods": []
        }

        # Check for gaps in the last 24 hours
        now = datetime.now(timezone.utc)
        check_period = timedelta(hours=24)
        interval_minutes = self.coverage_check_interval

        for source, events in evidence_data.items():
            if not events:
                continue

            # Sort events by timestamp
            sorted_events = sorted([e for e in events if self._parse_timestamp(e)],
                                 key=lambda x: self._parse_timestamp(x))

            if not sorted_events:
                continue

            # Check for gaps
            expected_intervals = []
            current_time = now - check_period

            while current_time < now:
                expected_intervals.append(current_time)
                current_time += timedelta(minutes=interval_minutes)

            actual_timestamps = [self._parse_timestamp(e) for e in sorted_events
                               if self._parse_timestamp(e) and
                               self._parse_timestamp(e) >= (now - check_period)]

            gaps = []
            for expected in expected_intervals:
                # Check if we have data within interval_minutes of expected time
                has_data = any(abs((ts - expected).total_seconds()) < (interval_minutes * 60)
                             for ts in actual_timestamps)
                if not has_data:
                    gaps.append(expected)

            if gaps:
                temporal_analysis["time_gaps"].append({
                    "source": source,
                    "gaps": [g.isoformat() for g in gaps],
                    "gap_count": len(gaps)
                })

        return temporal_analysis

    def _analyze_data_quality(self, evidence_data: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Analyze data quality across sources"""
        quality_analysis = {
            "field_completeness": {},
            "data_consistency": {},
            "error_rates": {}
        }

        for source, events in evidence_data.items():
            if not events:
                continue

            # Field completeness
            fields_present = Counter()
            total_events = len(events)

            for event in events:
                for key in event.keys():
                    if event[key] is not None:
                        fields_present[key] += 1

            quality_analysis["field_completeness"][source] = {
                field: count / total_events for field, count in fields_present.items()
            }

            # Data consistency (check for schema violations)
            consistency_issues = []
            if events:
                sample_event = events[0]
                expected_keys = set(sample_event.keys())

                for event in events[1:]:
                    if set(event.keys()) != expected_keys:
                        consistency_issues.append({
                            "event_id": event.get("id", "unknown"),
                            "missing_keys": list(expected_keys - set(event.keys())),
                            "extra_keys": list(set(event.keys()) - expected_keys)
                        })

            quality_analysis["data_consistency"][source] = {
                "total_events": total_events,
                "consistency_issues": len(consistency_issues),
                "issues": consistency_issues[:10]  # Limit to first 10 issues
            }

        return quality_analysis

    def _calculate_overall_coverage_score(self, coverage_analysis: Dict[str, Any]) -> float:
        """Calculate overall coverage score"""
        source_scores = []
        for source, data in coverage_analysis["source_coverage"].items():
            score = 0.0
            if data["has_recent_data"]:
                score += 0.4
            score += data["data_completeness"] * 0.6
            source_scores.append(score)

        if source_scores:
            return statistics.mean(source_scores)
        return 0.0

    def identify_blind_spots(self, coverage_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify blind spots in monitoring coverage"""
        blind_spots = []

        # Check for missing sources
        for source in self.expected_sources:
            source_data = coverage_analysis["source_coverage"].get(source, {})
            if source_data.get("events_count", 0) == 0:
                blind_spots.append({
                    "type": "missing_source",
                    "source": source,
                    "severity": "critical",
                    "description": f"No telemetry data from {source}",
                    "impact": "Complete loss of visibility into system component"
                })
            elif not source_data.get("has_recent_data", False):
                blind_spots.append({
                    "type": "stale_data",
                    "source": source,
                    "severity": "high",
                    "description": f"No recent telemetry data from {source}",
                    "impact": "Delayed detection of issues"
                })

        # Check for temporal gaps
        for gap_info in coverage_analysis["temporal_coverage"].get("time_gaps", []):
            if gap_info["gap_count"] > 5:  # More than 5 gaps in 24 hours
                blind_spots.append({
                    "type": "temporal_gap",
                    "source": gap_info["source"],
                    "severity": "medium",
                    "description": f"Significant temporal gaps in {gap_info['source']} telemetry",
                    "gap_count": gap_info["gap_count"],
                    "impact": "Intermittent loss of monitoring visibility"
                })

        # Check data quality issues
        for source, quality in coverage_analysis["data_quality"].get("data_consistency", {}).items():
            if quality.get("consistency_issues", 0) > 10:  # More than 10% consistency issues
                issue_rate = quality["consistency_issues"] / quality["total_events"]
                if issue_rate > 0.1:
                    blind_spots.append({
                        "type": "data_quality_issue",
                        "source": source,
                        "severity": "medium",
                        "description": f"High data consistency issues in {source}",
                        "issue_rate": issue_rate,
                        "impact": "Unreliable monitoring data"
                    })

        return blind_spots

    def prioritize_gaps(self, blind_spots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prioritize gaps based on criticality, impact, and frequency"""
        for spot in blind_spots:
            # Calculate priority score
            criticality_score = {"critical": 1.0, "high": 0.7, "medium": 0.4, "low": 0.1}.get(spot["severity"], 0.1)
            impact_score = 0.8  # Default high impact for monitoring gaps
            frequency_score = spot.get("gap_count", 1) / 10.0  # Normalize gap count

            priority_score = (
                criticality_score * self.criticality_weight +
                impact_score * self.impact_weight +
                min(frequency_score, 1.0) * self.frequency_weight
            )

            spot["priority_score"] = priority_score

        # Sort by priority score descending
        return sorted(blind_spots, key=lambda x: x["priority_score"], reverse=True)

    def generate_remediation_recommendations(self, prioritized_gaps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate remediation recommendations for identified gaps"""
        recommendations = []

        for gap in prioritized_gaps:
            gap_type = gap["type"]
            source = gap.get("source", "unknown")

            if gap_type == "missing_source":
                recommendations.append({
                    "gap_id": f"{gap_type}_{source}",
                    "priority": gap["severity"],
                    "action": "implement_telemetry_collection",
                    "description": f"Implement telemetry collection for {source}",
                    "implementation_steps": [
                        f"Identify data collection points for {source}",
                        f"Implement data collection mechanism",
                        f"Configure data transmission to monitoring system",
                        f"Validate data collection and quality"
                    ],
                    "estimated_effort": "high",
                    "expected_impact": f"Restore full visibility into {source}"
                })
            elif gap_type == "stale_data":
                recommendations.append({
                    "gap_id": f"{gap_type}_{source}",
                    "priority": gap["severity"],
                    "action": "fix_data_collection",
                    "description": f"Fix stale data issue for {source}",
                    "implementation_steps": [
                        f"Investigate why {source} data is not being collected",
                        f"Check data collection service health",
                        f"Fix any connectivity or configuration issues",
                        f"Implement alerting for stale data detection"
                    ],
                    "estimated_effort": "medium",
                    "expected_impact": f"Ensure continuous data flow from {source}"
                })
            elif gap_type == "temporal_gap":
                recommendations.append({
                    "gap_id": f"{gap_type}_{source}",
                    "priority": gap["severity"],
                    "action": "improve_collection_frequency",
                    "description": f"Improve collection frequency for {source}",
                    "implementation_steps": [
                        f"Analyze current collection interval for {source}",
                        f"Increase collection frequency or implement buffering",
                        f"Monitor collection performance impact",
                        f"Implement gap detection alerting"
                    ],
                    "estimated_effort": "medium",
                    "expected_impact": f"Reduce temporal gaps in {source} monitoring"
                })
            elif gap_type == "data_quality_issue":
                recommendations.append({
                    "gap_id": f"{gap_type}_{source}",
                    "priority": gap["severity"],
                    "action": "improve_data_quality",
                    "description": f"Improve data quality for {source}",
                    "implementation_steps": [
                        f"Analyze data consistency issues",
                        f"Implement data validation and sanitization",
                        f"Standardize data schema and format",
                        f"Add data quality monitoring and alerting"
                    ],
                    "estimated_effort": "medium",
                    "expected_impact": f"Ensure reliable and consistent data from {source}"
                })

        return recommendations

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

    def detect_gaps(self) -> Dict[str, Any]:
        """Main gap detection method"""
        try:
            self.logger.info("Starting observability gap detection")

            # Load evidence data
            evidence_data = self.load_evidence_files()

            # Analyze coverage completeness
            coverage_analysis = self.analyze_coverage_completeness(evidence_data)

            # Identify blind spots
            blind_spots = self.identify_blind_spots(coverage_analysis)

            # Prioritize gaps
            prioritized_gaps = self.prioritize_gaps(blind_spots)

            # Generate remediation recommendations
            recommendations = self.generate_remediation_recommendations(prioritized_gaps)

            result = {
                "detection_timestamp": datetime.now(timezone.utc).isoformat(),
                "coverage_analysis": coverage_analysis,
                "blind_spots": blind_spots,
                "prioritized_gaps": prioritized_gaps,
                "remediation_recommendations": recommendations,
                "summary": {
                    "total_sources_expected": len(self.expected_sources),
                    "sources_with_data": len([s for s in coverage_analysis["source_coverage"].values() if s["events_count"] > 0]),
                    "overall_coverage_score": coverage_analysis["overall_coverage_score"],
                    "critical_gaps": len([g for g in prioritized_gaps if g["severity"] == "critical"]),
                    "high_priority_gaps": len([g for g in prioritized_gaps if g["severity"] in ["critical", "high"]])
                }
            }

            self.logger.info(f"Gap detection completed. Found {len(blind_spots)} blind spots")
            return result

        except Exception as e:
            self.logger.error(f"Error during gap detection: {e}")
            return {
                "error": str(e),
                "error_type": type(e).__name__,
                "detection_timestamp": datetime.now(timezone.utc).isoformat()
            }

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Observability Gap Detection")
    parser.add_argument("--config", help="Path to observability config file")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)

    detector = ObservabilityGapDetector(args.config)
    result = detector.detect_gaps()

    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print("=" * 80)
        print("OBSERVABILITY GAP DETECTION REPORT")
        print("=" * 80)
        print(f"Detection Time: {result.get('detection_timestamp', 'Unknown')}")

        if "error" in result:
            print(f"ERROR: {result['error']}")
            return

        summary = result.get("summary", {})
        print("\n📊 Summary:")
        print(f"   Expected Sources: {summary.get('total_sources_expected', 0)}")
        print(f"   Sources with Data: {summary.get('sources_with_data', 0)}")
        print(f"   Overall Coverage: {summary.get('overall_coverage_score', 0):.2%}")
        print(f"   Critical Gaps: {summary.get('critical_gaps', 0)}")
        print(f"   High Priority Gaps: {summary.get('high_priority_gaps', 0)}")

        prioritized_gaps = result.get("prioritized_gaps", [])
        if prioritized_gaps:
            print("\n🚨 Top Priority Gaps:")
            for i, gap in enumerate(prioritized_gaps[:5], 1):
                print(f"   {i}. {gap['description']} (Severity: {gap['severity']})")

        recommendations = result.get("remediation_recommendations", [])
        if recommendations:
            print("\n💡 Key Recommendations:")
            for i, rec in enumerate(recommendations[:3], 1):
                print(f"   {i}. {rec['description']} (Effort: {rec['estimated_effort']})")

if __name__ == "__main__":
    main()