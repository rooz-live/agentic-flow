#!/usr/bin/env python3
"""
Baseline Assessment System
Implements comprehensive baseline measurement for performance, compliance, evidence, and health
"""

import json
import logging
import datetime
import statistics
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class BaselineType(Enum):
    PERFORMANCE = "performance"
    COMPLIANCE = "compliance"
    EVIDENCE = "evidence"
    HEALTH = "health"
    MATURITY = "maturity"


class AssessmentStatus(Enum):
    ESTABLISHED = "established"
    TRACKING = "tracking"
    DRIFTING = "drifting"
    CRITICAL = "critical"


@dataclass
class BaselineMetric:
    name: str
    value: float
    timestamp: datetime.datetime
    source: str
    confidence: float = 1.0


@dataclass
class BaselineThreshold:
    warning_threshold: float
    critical_threshold: float
    trend_direction: str  # "increasing_good", "decreasing_good", "stable"
    tolerance_percent: float = 5.0


@dataclass
class Baseline:
    id: str
    type: BaselineType
    name: str
    description: str
    metrics: List[BaselineMetric]
    thresholds: BaselineThreshold
    established_date: datetime.datetime
    last_updated: datetime.datetime
    status: AssessmentStatus
    trend_analysis: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        if self.trend_analysis is None:
            self.trend_analysis = {}


class BaselineAssessment:
    """
    Comprehensive baseline assessment system for governance monitoring
    """

    def __init__(self, goalie_dir: Path = Path(".goalie")):
        self.goalie_dir = goalie_dir
        self.baselines: Dict[str, Baseline] = {}
        self.baseline_history: Dict[str, List[BaselineMetric]] = {}
        self.assessment_log = goalie_dir / "baseline_assessments.jsonl"

        self.goalie_dir.mkdir(exist_ok=True)
        self._load_existing_baselines()
        self._initialize_default_baselines()

    def _load_existing_baselines(self):
        """Load existing baseline data"""
        baseline_file = self.goalie_dir / "baselines.json"
        if baseline_file.exists():
            try:
                with open(baseline_file, 'r') as f:
                    data = json.load(f)

                for baseline_data in data.get("baselines", []):
                    # Parse datetime strings
                    baseline_data["established_date"] = datetime.datetime.fromisoformat(baseline_data["established_date"])
                    baseline_data["last_updated"] = datetime.datetime.fromisoformat(baseline_data["last_updated"])

                    # Parse metrics
                    metrics = []
                    for metric_data in baseline_data["metrics"]:
                        metric_data["timestamp"] = datetime.datetime.fromisoformat(metric_data["timestamp"])
                        metrics.append(BaselineMetric(**metric_data))
                    baseline_data["metrics"] = metrics

                    # Parse thresholds
                    threshold_data = baseline_data["thresholds"]
                    baseline_data["thresholds"] = BaselineThreshold(**threshold_data)

                    baseline = Baseline(**baseline_data)
                    self.baselines[baseline.id] = baseline
                    self.baseline_history[baseline.id] = baseline.metrics.copy()

                logger.info(f"Loaded {len(self.baselines)} existing baselines")

            except Exception as e:
                logger.error(f"Failed to load existing baselines: {e}")

    def _initialize_default_baselines(self):
        """Initialize default baseline assessments"""

        # Performance Baseline
        performance_baseline = Baseline(
            id="performance-baseline",
            type=BaselineType.PERFORMANCE,
            name="System Performance Baseline",
            description="Tracks system performance metrics including throughput, latency, and resource utilization",
            metrics=[],
            thresholds=BaselineThreshold(
                warning_threshold=0.85,  # 85% of baseline
                critical_threshold=0.7,  # 70% of baseline
                trend_direction="increasing_good"
            ),
            established_date=datetime.datetime.now(),
            last_updated=datetime.datetime.now(),
            status=AssessmentStatus.ESTABLISHED
        )

        # Compliance Baseline
        compliance_baseline = Baseline(
            id="compliance-baseline",
            type=BaselineType.COMPLIANCE,
            name="Governance Compliance Baseline",
            description="Monitors adherence to governance policies and standards",
            metrics=[],
            thresholds=BaselineThreshold(
                warning_threshold=0.9,  # 90% compliance
                critical_threshold=0.75,  # 75% compliance
                trend_direction="increasing_good"
            ),
            established_date=datetime.datetime.now(),
            last_updated=datetime.datetime.now(),
            status=AssessmentStatus.ESTABLISHED
        )

        # Evidence Baseline
        evidence_baseline = Baseline(
            id="evidence-baseline",
            type=BaselineType.EVIDENCE,
            name="Evidence Trail Completeness Baseline",
            description="Ensures complete evidence trails for all governance decisions and actions",
            metrics=[],
            thresholds=BaselineThreshold(
                warning_threshold=0.95,  # 95% completeness
                critical_threshold=0.85,  # 85% completeness
                trend_direction="increasing_good"
            ),
            established_date=datetime.datetime.now(),
            last_updated=datetime.datetime.now(),
            status=AssessmentStatus.ESTABLISHED
        )

        # Health Baseline
        health_baseline = Baseline(
            id="health-baseline",
            type=BaselineType.HEALTH,
            name="System Health Baseline",
            description="Monitors overall system health and component status",
            metrics=[],
            thresholds=BaselineThreshold(
                warning_threshold=0.9,  # 90% health score
                critical_threshold=0.7,  # 70% health score
                trend_direction="increasing_good"
            ),
            established_date=datetime.datetime.now(),
            last_updated=datetime.datetime.now(),
            status=AssessmentStatus.ESTABLISHED
        )

        # Maturity Baseline
        maturity_baseline = Baseline(
            id="maturity-baseline",
            type=BaselineType.MATURITY,
            name="System Maturity Baseline",
            description="Tracks system maturity across governance, automation, and operational excellence",
            metrics=[],
            thresholds=BaselineThreshold(
                warning_threshold=0.8,  # 80% maturity score
                critical_threshold=0.6,  # 60% maturity score
                trend_direction="increasing_good"
            ),
            established_date=datetime.datetime.now(),
            last_updated=datetime.datetime.now(),
            status=AssessmentStatus.ESTABLISHED
        )

        # Add to baselines if not already present
        default_baselines = [
            performance_baseline, compliance_baseline, evidence_baseline,
            health_baseline, maturity_baseline
        ]

        for baseline in default_baselines:
            if baseline.id not in self.baselines:
                self.baselines[baseline.id] = baseline
                self.baseline_history[baseline.id] = []

        logger.info("Initialized default baseline assessments")

    def record_metric(self, baseline_id: str, metric: BaselineMetric):
        """Record a new metric for a baseline"""
        if baseline_id not in self.baselines:
            raise ValueError(f"Baseline {baseline_id} does not exist")

        baseline = self.baselines[baseline_id]
        baseline.metrics.append(metric)
        baseline.last_updated = datetime.datetime.now()

        # Keep history
        if baseline_id not in self.baseline_history:
            self.baseline_history[baseline_id] = []
        self.baseline_history[baseline_id].append(metric)

        # Update trend analysis
        self._update_trend_analysis(baseline)

        # Assess status
        self._assess_baseline_status(baseline)

        logger.info(f"Recorded metric for {baseline_id}: {metric.name} = {metric.value}")

    def _update_trend_analysis(self, baseline: Baseline):
        """Update trend analysis for a baseline"""
        if len(baseline.metrics) < 3:
            baseline.trend_analysis = {"status": "insufficient_data"}
            return

        # Get recent metrics (last 10)
        recent_metrics = sorted(baseline.metrics[-10:], key=lambda m: m.timestamp)
        values = [m.value for m in recent_metrics]

        try:
            # Calculate trend
            slope = self._calculate_trend_slope(values)
            avg_value = statistics.mean(values)
            std_dev = statistics.stdev(values) if len(values) > 1 else 0

            baseline.trend_analysis = {
                "slope": slope,
                "average": avg_value,
                "std_dev": std_dev,
                "trend_direction": "increasing" if slope > 0 else "decreasing" if slope < 0 else "stable",
                "volatility": std_dev / avg_value if avg_value > 0 else 0
            }
        except Exception as e:
            logger.error(f"Failed to calculate trend for {baseline.id}: {e}")
            baseline.trend_analysis = {"status": "calculation_error", "error": str(e)}

    def _calculate_trend_slope(self, values: List[float]) -> float:
        """Calculate the slope of the trend line"""
        if len(values) < 2:
            return 0.0

        n = len(values)
        x = list(range(n))
        y = values

        # Calculate slope using linear regression
        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(xi * yi for xi, yi in zip(x, y))
        sum_xx = sum(xi * xi for xi in x)

        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x)
        return slope

    def _assess_baseline_status(self, baseline: Baseline):
        """Assess the current status of a baseline"""
        if not baseline.metrics:
            baseline.status = AssessmentStatus.ESTABLISHED
            return

        latest_metric = max(baseline.metrics, key=lambda m: m.timestamp)
        current_value = latest_metric.value

        # Get baseline average (first 5 metrics or all if less)
        baseline_period = min(5, len(baseline.metrics))
        baseline_values = [m.value for m in baseline.metrics[:baseline_period]]
        baseline_avg = statistics.mean(baseline_values) if baseline_values else current_value

        # Calculate deviation from baseline
        if baseline_avg == 0:
            deviation_ratio = 0.0
        else:
            deviation_ratio = current_value / baseline_avg

        thresholds = baseline.thresholds

        # Determine status based on trend direction
        if thresholds.trend_direction == "increasing_good":
            if deviation_ratio >= thresholds.critical_threshold:
                baseline.status = AssessmentStatus.ESTABLISHED
            elif deviation_ratio >= thresholds.warning_threshold:
                baseline.status = AssessmentStatus.TRACKING
            else:
                baseline.status = AssessmentStatus.CRITICAL
        elif thresholds.trend_direction == "decreasing_good":
            if deviation_ratio <= (2 - thresholds.critical_threshold):
                baseline.status = AssessmentStatus.ESTABLISHED
            elif deviation_ratio <= (2 - thresholds.warning_threshold):
                baseline.status = AssessmentStatus.TRACKING
            else:
                baseline.status = AssessmentStatus.CRITICAL
        else:  # stable
            tolerance = thresholds.tolerance_percent / 100
            if abs(deviation_ratio - 1) <= tolerance:
                baseline.status = AssessmentStatus.ESTABLISHED
            elif abs(deviation_ratio - 1) <= (tolerance * 2):
                baseline.status = AssessmentStatus.TRACKING
            else:
                baseline.status = AssessmentStatus.DRIFTING

    def assess_performance_baseline(self) -> Dict[str, Any]:
        """Assess current system performance against baseline"""
        baseline = self.baselines.get("performance-baseline")
        if not baseline or not baseline.metrics:
            return {"status": "no_data", "message": "No performance metrics available"}

        # Simulate performance metrics collection
        # In real implementation, this would integrate with actual monitoring systems
        current_metrics = self._collect_performance_metrics()

        assessment: Dict[str, Any] = {
            "timestamp": datetime.datetime.now().isoformat(),
            "baseline_status": baseline.status.value,
            "current_metrics": current_metrics,
            "assessment": {}
        }

        # Compare against baseline
        for metric_name, current_value in current_metrics.items():
            baseline_metric = next((m for m in baseline.metrics if m.name == metric_name), None)
            if baseline_metric:
                ratio = current_value / baseline_metric.value if baseline_metric.value > 0 else 0
                assessment["assessment"][metric_name] = {
                    "current": current_value,
                    "baseline": baseline_metric.value,
                    "ratio": ratio,
                    "status": "good" if ratio >= 0.9 else "warning" if ratio >= 0.7 else "critical"
                }

        return assessment

    def assess_compliance_baseline(self) -> Dict[str, Any]:
        """Assess governance compliance against baseline"""
        baseline = self.baselines.get("compliance-baseline")
        if not baseline:
            return {"status": "no_baseline", "message": "Compliance baseline not established"}

        # Simulate compliance checks
        compliance_checks = self._collect_compliance_metrics()

        assessment = {
            "timestamp": datetime.datetime.now().isoformat(),
            "baseline_status": baseline.status.value,
            "compliance_checks": compliance_checks,
            "overall_compliance": sum(1 for c in compliance_checks.values() if c) / len(compliance_checks)
        }

        return assessment

    def assess_evidence_baseline(self) -> Dict[str, Any]:
        """Assess evidence trail completeness"""
        baseline = self.baselines.get("evidence-baseline")
        if not baseline:
            return {"status": "no_baseline", "message": "Evidence baseline not established"}

        # Check evidence completeness
        evidence_completeness = self._assess_evidence_completeness()

        assessment = {
            "timestamp": datetime.datetime.now().isoformat(),
            "baseline_status": baseline.status.value,
            "evidence_completeness": evidence_completeness,
            "overall_completeness": evidence_completeness.get("overall_score", 0)
        }

        return assessment

    def assess_health_baseline(self) -> Dict[str, Any]:
        """Assess system health against baseline"""
        baseline = self.baselines.get("health-baseline")
        if not baseline:
            return {"status": "no_baseline", "message": "Health baseline not established"}

        # Collect health metrics
        health_metrics = self._collect_health_metrics()

        assessment = {
            "timestamp": datetime.datetime.now().isoformat(),
            "baseline_status": baseline.status.value,
            "health_metrics": health_metrics,
            "overall_health": health_metrics.get("overall_score", 0)
        }

        return assessment

    def assess_maturity_baseline(self) -> Dict[str, Any]:
        """Assess system maturity"""
        baseline = self.baselines.get("maturity-baseline")
        if not baseline:
            return {"status": "no_baseline", "message": "Maturity baseline not established"}

        # Assess maturity across dimensions
        maturity_scores = self._assess_maturity_scores()

        assessment = {
            "timestamp": datetime.datetime.now().isoformat(),
            "baseline_status": baseline.status.value,
            "maturity_scores": maturity_scores,
            "overall_maturity": sum(maturity_scores.values()) / len(maturity_scores)
        }

        return assessment

    def _collect_performance_metrics(self) -> Dict[str, float]:
        """Collect current performance metrics"""
        # In real implementation, integrate with monitoring systems
        # For now, simulate realistic metrics
        import random
        return {
            "cpu_usage": 45 + random.random() * 30,  # 45-75%
            "memory_usage": 60 + random.random() * 25,  # 60-85%
            "disk_usage": 40 + random.random() * 20,  # 40-60%
            "network_latency": 15 + random.random() * 20,  # 15-35ms
            "response_time": 200 + random.random() * 300,  # 200-500ms
            "throughput": 1000 + random.random() * 2000  # 1000-3000 req/min
        }

    def _collect_compliance_metrics(self) -> Dict[str, bool]:
        """Collect compliance check results"""
        # Simulate compliance checks
        return {
            "governance_policies": True,
            "security_standards": True,
            "data_privacy": True,
            "audit_trails": True,
            "access_controls": False,  # Simulate a failure
            "backup_compliance": True
        }

    def _assess_evidence_completeness(self) -> Dict[str, Any]:
        """Assess evidence trail completeness"""
        # Check for evidence files
        evidence_files = [
            ".goalie/unified_evidence.jsonl",
            ".goalie/production_events.jsonl",
            ".goalie/metrics_log.jsonl"
        ]

        completeness_scores = {}
        total_score = 0.0

        for evidence_file in evidence_files:
            file_path = Path(evidence_file)
            if file_path.exists():
                try:
                    with open(file_path, 'r') as f:
                        lines = f.readlines()
                    completeness_scores[evidence_file] = min(1.0, len(lines) / 100)  # Scale to 0-1
                    total_score += completeness_scores[evidence_file]
                except Exception:
                    completeness_scores[evidence_file] = 0.0
            else:
                completeness_scores[evidence_file] = 0.0

        return {
            "file_completeness": completeness_scores,
            "overall_score": total_score / len(evidence_files)
        }

    def _collect_health_metrics(self) -> Dict[str, Any]:
        """Collect system health metrics"""
        # Simulate health checks
        return {
            "orchestration_health": 0.95,
            "agentdb_health": 0.88,
            "mcp_health": 0.92,
            "governance_health": 0.90,
            "monitoring_health": 0.85,
            "overall_score": 0.90
        }

    def _assess_maturity_scores(self) -> Dict[str, float]:
        """Assess maturity across different dimensions"""
        return {
            "governance_maturity": 0.85,
            "automation_maturity": 0.78,
            "operational_maturity": 0.82,
            "security_maturity": 0.88,
            "monitoring_maturity": 0.75
        }

    def get_baseline_report(self) -> Dict[str, Any]:
        """Generate comprehensive baseline assessment report"""
        report: Dict[str, Any] = {
            "timestamp": datetime.datetime.now().isoformat(),
            "baselines": {}
        }

        assessments = {
            "performance": self.assess_performance_baseline(),
            "compliance": self.assess_compliance_baseline(),
            "evidence": self.assess_evidence_baseline(),
            "health": self.assess_health_baseline(),
            "maturity": self.assess_maturity_baseline()
        }

        for baseline_type, assessment in assessments.items():
            baseline_id = f"{baseline_type}-baseline"
            baseline = self.baselines.get(baseline_id)

            report["baselines"][baseline_type] = {
                "status": assessment.get("status", "unknown"),
                "baseline_status": baseline.status.value if baseline else "not_established",
                "assessment": assessment,
                "trend_analysis": baseline.trend_analysis if baseline else None
            }

        return report

    def export_baselines(self, export_path: Path):
        """Export baseline data"""
        export_data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "baselines": [asdict(b) for b in self.baselines.values()],
            "history": {k: [asdict(m) for m in v] for k, v in self.baseline_history.items()}
        }

        with open(export_path, 'w') as f:
            json.dump(export_data, f, indent=2, default=str)

        logger.info(f"Exported baseline data to {export_path}")


def main():
    """Main entry point for baseline assessment"""
    import argparse

    parser = argparse.ArgumentParser(description="Baseline Assessment System")
    parser.add_argument("--goalie-dir", type=Path, default=Path(".goalie"), help="Goalie directory")
    parser.add_argument("--export", type=Path, help="Export baseline data to file")
    parser.add_argument("--report", action="store_true", help="Generate baseline assessment report")
    parser.add_argument("--performance", action="store_true", help="Assess performance baseline")
    parser.add_argument("--compliance", action="store_true", help="Assess compliance baseline")
    parser.add_argument("--evidence", action="store_true", help="Assess evidence baseline")
    parser.add_argument("--health", action="store_true", help="Assess health baseline")
    parser.add_argument("--maturity", action="store_true", help="Assess maturity baseline")

    args = parser.parse_args()

    assessor = BaselineAssessment(args.goalie_dir)

    if args.export:
        assessor.export_baselines(args.export)
        print(f"Exported baseline data to {args.export}")

    elif args.report:
        report = assessor.get_baseline_report()
        print(json.dumps(report, indent=2))

    elif args.performance:
        assessment = assessor.assess_performance_baseline()
        print(json.dumps(assessment, indent=2))

    elif args.compliance:
        assessment = assessor.assess_compliance_baseline()
        print(json.dumps(assessment, indent=2))

    elif args.evidence:
        assessment = assessor.assess_evidence_baseline()
        print(json.dumps(assessment, indent=2))

    elif args.health:
        assessment = assessor.assess_health_baseline()
        print(json.dumps(assessment, indent=2))

    elif args.maturity:
        assessment = assessor.assess_maturity_baseline()
        print(json.dumps(assessment, indent=2))

    else:
        # Default: show baseline overview
        report = assessor.get_baseline_report()
        print("Baseline Assessment Overview:")
        print(f"Timestamp: {report['timestamp']}")
        print("\nBaselines:")

        for baseline_type, data in report["baselines"].items():
            status = data["status"]
            baseline_status = data["baseline_status"]
            print(f"  {baseline_type.title()}: {status} (baseline: {baseline_status})")


if __name__ == "__main__":
    main()