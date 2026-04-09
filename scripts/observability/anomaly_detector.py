#!/usr/bin/env python3
"""
Statistical Anomaly Detection Engine
Performs advanced statistical analysis, anomaly detection, and root cause analysis
"""

import json
import os
import sys
import logging
import statistics
import math
from collections import defaultdict, Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union
import numpy as np

class AnomalyDetector:
    """Statistical anomaly detection and root cause analysis engine"""

    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)
        self.goalie_dir = Path(os.environ.get("PROJECT_ROOT", ".")) / ".goalie"
        self.logger = self._setup_logging()

        # Analysis configuration
        analytics_config = self.config.get("observability", {}).get("advanced_analytics", {})
        self.predictive_model = analytics_config.get("predictive_model", "linear_regression")
        self.forecast_horizon_hours = analytics_config.get("forecast_horizon_hours", 24)
        self.statistical_tests = analytics_config.get("statistical_tests", ["mann_whitney", "kruskal_wallis"])
        self.root_cause_depth = analytics_config.get("root_cause_depth", 3)

        # Anomaly detection settings
        anomaly_config = self.config.get("observability", {}).get("pattern_analysis", {}).get("anomaly_detection", {})
        self.algorithm = anomaly_config.get("algorithm", "isolation_forest")
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
        """Setup logging for anomaly detection"""
        logger = logging.getLogger("anomaly_detector")
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

    def load_telemetry_data(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Load telemetry data for analysis"""
        telemetry_data = []

        telemetry_files = [
            "telemetry_log.jsonl",
            "performance_metrics.jsonl",
            "pattern_metrics.jsonl"
        ]

        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)

        for filename in telemetry_files:
            file_path = self.goalie_dir / filename
            if file_path.exists():
                try:
                    with open(file_path, 'r') as f:
                        for line in f:
                            line = line.strip()
                            if line:
                                try:
                                    data = json.loads(line)
                                    # Check timestamp
                                    ts = self._parse_timestamp(data)
                                    if ts and ts >= cutoff_time:
                                        telemetry_data.append(data)
                                except json.JSONDecodeError:
                                    continue
                except Exception as e:
                    self.logger.error(f"Error loading {filename}: {e}")

        # Sort by timestamp
        telemetry_data.sort(key=lambda x: self._parse_timestamp(x) or datetime.min.replace(tzinfo=timezone.utc))
        return telemetry_data

    def perform_statistical_analysis(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Perform comprehensive statistical analysis"""
        analysis = {
            "descriptive_stats": {},
            "distribution_analysis": {},
            "correlation_analysis": {},
            "trend_analysis": {},
            "time_series_analysis": {}
        }

        # Extract numerical metrics
        metrics_data = self._extract_metrics(data)

        # Descriptive statistics
        analysis["descriptive_stats"] = self._calculate_descriptive_stats(metrics_data)

        # Distribution analysis
        analysis["distribution_analysis"] = self._analyze_distributions(metrics_data)

        # Correlation analysis
        analysis["correlation_analysis"] = self._calculate_correlations(metrics_data)

        # Trend analysis
        analysis["trend_analysis"] = self._analyze_trends(metrics_data)

        # Time series analysis
        analysis["time_series_analysis"] = self._analyze_time_series(metrics_data)

        return analysis

    def _extract_metrics(self, data: List[Dict[str, Any]]) -> Dict[str, List[float]]:
        """Extract numerical metrics from telemetry data"""
        metrics = defaultdict(list)

        for item in data:
            # Extract from metrics field
            if "metrics" in item:
                for key, value in item["metrics"].items():
                    if isinstance(value, (int, float)) and not math.isnan(value):
                        metrics[key].append(value)

            # Extract from system health
            if "sources" in item and "system_health" in item["sources"]:
                system_data = item["sources"]["system_health"]
                if isinstance(system_data, dict):
                    if "cpu" in system_data and "usage_percent" in system_data["cpu"]:
                        metrics["cpu_usage"].append(system_data["cpu"]["usage_percent"])
                    if "memory" in system_data and "usage_percent" in system_data["memory"]:
                        metrics["memory_usage"].append(system_data["memory"]["usage_percent"])

            # Extract pattern metrics
            if "data" in item:
                event_data = item["data"]
                if isinstance(event_data, dict):
                    if "duration_ms" in event_data and event_data["duration_ms"]:
                        metrics["execution_time"].append(event_data["duration_ms"])
                    if "depth" in event_data and event_data["depth"] is not None:
                        metrics["pattern_depth"].append(event_data["depth"])

        return dict(metrics)

    def _calculate_descriptive_stats(self, metrics_data: Dict[str, List[float]]) -> Dict[str, Any]:
        """Calculate descriptive statistics for metrics"""
        stats = {}

        for metric_name, values in metrics_data.items():
            if len(values) < 2:
                continue

            try:
                stats[metric_name] = {
                    "count": len(values),
                    "mean": statistics.mean(values),
                    "median": statistics.median(values),
                    "std_dev": statistics.stdev(values),
                    "min": min(values),
                    "max": max(values),
                    "quartiles": self._calculate_quartiles(values),
                    "skewness": self._calculate_skewness(values),
                    "kurtosis": self._calculate_kurtosis(values)
                }
            except Exception as e:
                self.logger.error(f"Error calculating stats for {metric_name}: {e}")

        return stats

    def _calculate_quartiles(self, values: List[float]) -> Dict[str, float]:
        """Calculate quartiles"""
        sorted_values = sorted(values)
        n = len(sorted_values)

        q1_index = int(n * 0.25)
        q3_index = int(n * 0.75)

        return {
            "q1": sorted_values[q1_index],
            "q2": sorted_values[n // 2],  # median
            "q3": sorted_values[q3_index]
        }

    def _calculate_skewness(self, values: List[float]) -> float:
        """Calculate skewness"""
        if len(values) < 3:
            return 0.0

        mean = statistics.mean(values)
        std_dev = statistics.stdev(values)

        if std_dev == 0:
            return 0.0

        skewness = sum(((x - mean) / std_dev) ** 3 for x in values) / len(values)
        return skewness

    def _calculate_kurtosis(self, values: List[float]) -> float:
        """Calculate kurtosis"""
        if len(values) < 4:
            return 0.0

        mean = statistics.mean(values)
        std_dev = statistics.stdev(values)

        if std_dev == 0:
            return 0.0

        kurtosis = sum(((x - mean) / std_dev) ** 4 for x in values) / len(values) - 3
        return kurtosis

    def _analyze_distributions(self, metrics_data: Dict[str, List[float]]) -> Dict[str, Any]:
        """Analyze distributions of metrics"""
        distribution_analysis = {}

        for metric_name, values in metrics_data.items():
            if len(values) < 10:
                continue

            try:
                # Test for normality (simplified)
                normality_test = self._test_normality(values)

                # Check for outliers
                outliers = self._detect_outliers(values)

                # Distribution shape
                distribution_shape = self._analyze_distribution_shape(values)

                distribution_analysis[metric_name] = {
                    "normality_test": normality_test,
                    "outliers": outliers,
                    "distribution_shape": distribution_shape,
                    "histogram_bins": self._create_histogram(values)
                }
            except Exception as e:
                self.logger.error(f"Error analyzing distribution for {metric_name}: {e}")

        return distribution_analysis

    def _test_normality(self, values: List[float]) -> Dict[str, Any]:
        """Test for normality (simplified Shapiro-Wilk approximation)"""
        if len(values) < 3:
            return {"is_normal": False, "p_value": 1.0}

        # Simplified normality check using skewness and kurtosis
        skewness = self._calculate_skewness(values)
        kurtosis = self._calculate_kurtosis(values)

        # Rough normality criteria
        is_normal = abs(skewness) < 0.5 and abs(kurtosis) < 0.5

        return {
            "is_normal": is_normal,
            "skewness": skewness,
            "kurtosis": kurtosis,
            "p_value": 0.5 if is_normal else 0.01  # Simplified
        }

    def _detect_outliers(self, values: List[float]) -> Dict[str, Any]:
        """Detect outliers using IQR method"""
        if len(values) < 4:
            return {"outlier_count": 0, "outliers": []}

        sorted_values = sorted(values)
        q1 = sorted_values[len(values) // 4]
        q3 = sorted_values[3 * len(values) // 4]
        iqr = q3 - q1

        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        outliers = [v for v in values if v < lower_bound or v > upper_bound]

        return {
            "outlier_count": len(outliers),
            "outliers": outliers[:10],  # Limit to first 10
            "bounds": {"lower": lower_bound, "upper": upper_bound}
        }

    def _analyze_distribution_shape(self, values: List[float]) -> str:
        """Analyze distribution shape"""
        skewness = self._calculate_skewness(values)
        kurtosis = self._calculate_kurtosis(values)

        if abs(skewness) < 0.5 and abs(kurtosis) < 0.5:
            return "normal"
        elif skewness > 1:
            return "right_skewed"
        elif skewness < -1:
            return "left_skewed"
        elif kurtosis > 1:
            return "heavy_tailed"
        elif kurtosis < -1:
            return "light_tailed"
        else:
            return "moderately_skewed"

    def _create_histogram(self, values: List[float], bins: int = 10) -> List[Dict[str, Any]]:
        """Create histogram data"""
        if not values:
            return []

        min_val = min(values)
        max_val = max(values)
        bin_width = (max_val - min_val) / bins

        histogram = []
        for i in range(bins):
            bin_start = min_val + i * bin_width
            bin_end = min_val + (i + 1) * bin_width
            count = sum(1 for v in values if bin_start <= v < bin_end or (i == bins - 1 and v <= bin_end))
            histogram.append({
                "bin_start": bin_start,
                "bin_end": bin_end,
                "count": count
            })

        return histogram

    def _calculate_correlations(self, metrics_data: Dict[str, List[float]]) -> Dict[str, Any]:
        """Calculate correlations between metrics"""
        correlations = {}

        metric_names = list(metrics_data.keys())
        for i, metric1 in enumerate(metric_names):
            for metric2 in metric_names[i+1:]:
                values1 = metrics_data[metric1]
                values2 = metrics_data[metric2]

                # Ensure same length by taking minimum
                min_len = min(len(values1), len(values2))
                if min_len < 2:
                    continue

                try:
                    correlation = self._pearson_correlation(values1[:min_len], values2[:min_len])
                    correlations[f"{metric1}_vs_{metric2}"] = {
                        "correlation": correlation,
                        "strength": self._interpret_correlation(abs(correlation)),
                        "direction": "positive" if correlation > 0 else "negative"
                    }
                except Exception as e:
                    self.logger.error(f"Error calculating correlation between {metric1} and {metric2}: {e}")

        return correlations

    def _pearson_correlation(self, x: List[float], y: List[float]) -> float:
        """Calculate Pearson correlation coefficient"""
        n = len(x)
        if n != len(y) or n < 2:
            return 0.0

        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(xi * yi for xi, yi in zip(x, y))
        sum_x2 = sum(xi ** 2 for xi in x)
        sum_y2 = sum(yi ** 2 for yi in y)

        numerator = n * sum_xy - sum_x * sum_y
        denominator = math.sqrt((n * sum_x2 - sum_x ** 2) * (n * sum_y2 - sum_y ** 2))

        return numerator / denominator if denominator != 0 else 0.0

    def _interpret_correlation(self, correlation: float) -> str:
        """Interpret correlation strength"""
        if correlation >= 0.8:
            return "very_strong"
        elif correlation >= 0.6:
            return "strong"
        elif correlation >= 0.3:
            return "moderate"
        elif correlation >= 0.1:
            return "weak"
        else:
            return "very_weak"

    def _analyze_trends(self, metrics_data: Dict[str, List[float]]) -> Dict[str, Any]:
        """Analyze trends in metrics over time"""
        trends = {}

        for metric_name, values in metrics_data.items():
            if len(values) < 3:
                continue

            try:
                # Linear trend
                trend = self._calculate_linear_trend(values)
                trends[metric_name] = trend
            except Exception as e:
                self.logger.error(f"Error analyzing trend for {metric_name}: {e}")

        return trends

    def _calculate_linear_trend(self, values: List[float]) -> Dict[str, Any]:
        """Calculate linear trend using least squares"""
        n = len(values)
        x = list(range(n))

        sum_x = sum(x)
        sum_y = sum(values)
        sum_xy = sum(xi * yi for xi, yi in zip(x, values))
        sum_x2 = sum(xi ** 2 for xi in x)

        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)
        intercept = (sum_y - slope * sum_x) / n

        # Calculate R-squared
        y_mean = sum_y / n
        ss_tot = sum((yi - y_mean) ** 2 for yi in values)
        ss_res = sum((yi - (slope * xi + intercept)) ** 2 for xi, yi in zip(x, values))
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0

        return {
            "slope": slope,
            "intercept": intercept,
            "r_squared": r_squared,
            "trend_direction": "increasing" if slope > 0.01 else "decreasing" if slope < -0.01 else "stable",
            "trend_strength": "strong" if abs(slope) > 0.1 else "moderate" if abs(slope) > 0.05 else "weak"
        }

    def _analyze_time_series(self, metrics_data: Dict[str, List[float]]) -> Dict[str, Any]:
        """Analyze time series properties"""
        time_series_analysis = {}

        for metric_name, values in metrics_data.items():
            if len(values) < 5:
                continue

            try:
                # Calculate autocorrelation
                autocorr = self._calculate_autocorrelation(values)

                # Check for seasonality (simplified)
                seasonality = self._detect_seasonality(values)

                # Calculate volatility
                volatility = self._calculate_volatility(values)

                time_series_analysis[metric_name] = {
                    "autocorrelation": autocorr,
                    "seasonality": seasonality,
                    "volatility": volatility,
                    "stationarity": self._test_stationarity(values)
                }
            except Exception as e:
                self.logger.error(f"Error in time series analysis for {metric_name}: {e}")

        return time_series_analysis

    def _calculate_autocorrelation(self, values: List[float], lag: int = 1) -> float:
        """Calculate autocorrelation at specified lag"""
        if len(values) <= lag:
            return 0.0

        mean = statistics.mean(values)
        numerator = sum((values[i] - mean) * (values[i + lag] - mean) for i in range(len(values) - lag))
        denominator = sum((v - mean) ** 2 for v in values)

        return numerator / denominator if denominator != 0 else 0.0

    def _detect_seasonality(self, values: List[float]) -> Dict[str, Any]:
        """Detect seasonality (simplified)"""
        if len(values) < 10:
            return {"detected": False}

        # Check for periodic patterns
        period_candidates = [4, 6, 8, 12, 24]  # Common periods
        best_period = None
        best_correlation = 0

        for period in period_candidates:
            if len(values) >= 2 * period:
                corr = abs(self._calculate_autocorrelation(values, period))
                if corr > best_correlation:
                    best_correlation = corr
                    best_period = period

        return {
            "detected": best_correlation > 0.3,
            "period": best_period,
            "correlation": best_correlation
        }

    def _calculate_volatility(self, values: List[float]) -> float:
        """Calculate volatility (standard deviation of changes)"""
        if len(values) < 2:
            return 0.0

        changes = [values[i+1] - values[i] for i in range(len(values) - 1)]
        return statistics.stdev(changes) if len(changes) > 1 else 0.0

    def _test_stationarity(self, values: List[float]) -> Dict[str, Any]:
        """Test for stationarity (simplified)"""
        if len(values) < 10:
            return {"is_stationary": False, "p_value": 1.0}

        # Simplified stationarity test using variance comparison
        half = len(values) // 2
        first_half = values[:half]
        second_half = values[half:]

        if len(first_half) < 2 or len(second_half) < 2:
            return {"is_stationary": False, "p_value": 1.0}

        var1 = statistics.variance(first_half)
        var2 = statistics.variance(second_half)

        # If variances are similar, might be stationary
        var_ratio = max(var1, var2) / min(var1, var2) if min(var1, var2) > 0 else float('inf')

        is_stationary = var_ratio < 2.0  # Simplified threshold

        return {
            "is_stationary": is_stationary,
            "variance_ratio": var_ratio,
            "p_value": 0.05 if is_stationary else 0.95  # Simplified
        }

    def detect_anomalies(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Detect anomalies using statistical methods"""
        anomalies = {
            "point_anomalies": [],
            "contextual_anomalies": [],
            "collective_anomalies": [],
            "anomaly_summary": {}
        }

        metrics_data = self._extract_metrics(data)

        for metric_name, values in metrics_data.items():
            if len(values) < self.min_samples:
                continue

            try:
                # Point anomalies (individual data points)
                point_anomalies = self._detect_point_anomalies(values)
                for anomaly in point_anomalies:
                    anomaly["metric"] = metric_name
                    anomalies["point_anomalies"].append(anomaly)

                # Contextual anomalies (considering context)
                contextual_anomalies = self._detect_contextual_anomalies(values)
                for anomaly in contextual_anomalies:
                    anomaly["metric"] = metric_name
                    anomalies["contextual_anomalies"].append(anomaly)

                # Collective anomalies (sequences)
                collective_anomalies = self._detect_collective_anomalies(values)
                for anomaly in collective_anomalies:
                    anomaly["metric"] = metric_name
                    anomalies["collective_anomalies"].append(anomaly)

            except Exception as e:
                self.logger.error(f"Error detecting anomalies for {metric_name}: {e}")

        # Summary
        anomalies["anomaly_summary"] = {
            "total_point_anomalies": len(anomalies["point_anomalies"]),
            "total_contextual_anomalies": len(anomalies["contextual_anomalies"]),
            "total_collective_anomalies": len(anomalies["collective_anomalies"]),
            "anomaly_score": self._calculate_anomaly_score(anomalies)
        }

        return anomalies

    def _detect_point_anomalies(self, values: List[float]) -> List[Dict[str, Any]]:
        """Detect point anomalies using statistical methods"""
        if len(values) < 3:
            return []

        mean = statistics.mean(values)
        std_dev = statistics.stdev(values)

        anomalies = []
        for i, value in enumerate(values):
            z_score = abs(value - mean) / std_dev if std_dev > 0 else 0
            if z_score > 3:  # 3-sigma rule
                anomalies.append({
                    "index": i,
                    "value": value,
                    "expected_value": mean,
                    "deviation": value - mean,
                    "z_score": z_score,
                    "severity": "high" if z_score > 5 else "medium"
                })

        return anomalies

    def _detect_contextual_anomalies(self, values: List[float]) -> List[Dict[str, Any]]:
        """Detect contextual anomalies considering temporal context"""
        if len(values) < 5:
            return []

        anomalies = []

        # Use moving average for context
        window_size = min(5, len(values) // 3)
        for i in range(window_size, len(values)):
            window = values[i - window_size:i]
            window_mean = statistics.mean(window)
            window_std = statistics.stdev(window) if len(window) > 1 else 0

            value = values[i]
            if window_std > 0:
                z_score = abs(value - window_mean) / window_std
                if z_score > 2.5:  # Stricter threshold for contextual
                    anomalies.append({
                        "index": i,
                        "value": value,
                        "context_mean": window_mean,
                        "context_std": window_std,
                        "z_score": z_score,
                        "severity": "high" if z_score > 4 else "medium"
                    })

        return anomalies

    def _detect_collective_anomalies(self, values: List[float]) -> List[Dict[str, Any]]:
        """Detect collective anomalies (sequences of anomalous points)"""
        if len(values) < 10:
            return []

        # Find sequences where multiple consecutive points are anomalous
        point_anomalies = self._detect_point_anomalies(values)
        anomaly_indices = {a["index"] for a in point_anomalies}

        # Find consecutive sequences
        sequences = []
        current_sequence = []

        for i in range(len(values)):
            if i in anomaly_indices:
                current_sequence.append(i)
            else:
                if len(current_sequence) >= 3:  # At least 3 consecutive anomalies
                    sequences.append(current_sequence)
                current_sequence = []

        if len(current_sequence) >= 3:
            sequences.append(current_sequence)

        collective_anomalies = []
        for sequence in sequences:
            sequence_values = [values[i] for i in sequence]
            collective_anomalies.append({
                "start_index": sequence[0],
                "end_index": sequence[-1],
                "length": len(sequence),
                "values": sequence_values,
                "mean_value": statistics.mean(sequence_values),
                "severity": "critical" if len(sequence) >= 5 else "high"
            })

        return collective_anomalies

    def _calculate_anomaly_score(self, anomalies: Dict[str, List]) -> float:
        """Calculate overall anomaly score"""
        total_anomalies = (
            len(anomalies["point_anomalies"]) +
            len(anomalies["contextual_anomalies"]) +
            len(anomalies["collective_anomalies"])
        )

        # Weight collective anomalies more heavily
        weighted_score = (
            len(anomalies["point_anomalies"]) * 1.0 +
            len(anomalies["contextual_anomalies"]) * 1.5 +
            len(anomalies["collective_anomalies"]) * 3.0
        )

        # Normalize (arbitrary scaling)
        return min(weighted_score / 10.0, 1.0)

    def perform_root_cause_analysis(self, anomalies: Dict[str, Any], data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Perform root cause analysis for detected anomalies"""
        root_cause_analysis = {
            "primary_causes": [],
            "contributing_factors": [],
            "correlation_insights": [],
            "recommended_actions": []
        }

        # Analyze anomaly patterns
        anomaly_patterns = self._analyze_anomaly_patterns(anomalies)
        root_cause_analysis["primary_causes"] = anomaly_patterns.get("primary_causes", [])

        # Find correlations with system metrics
        correlations = self._find_anomaly_correlations(anomalies, data)
        root_cause_analysis["correlation_insights"] = correlations

        # Identify contributing factors
        contributing_factors = self._identify_contributing_factors(anomalies, data)
        root_cause_analysis["contributing_factors"] = contributing_factors

        # Generate recommended actions
        root_cause_analysis["recommended_actions"] = self._generate_recommendations(
            anomaly_patterns, correlations, contributing_factors
        )

        return root_cause_analysis

    def _analyze_anomaly_patterns(self, anomalies: Dict[str, List]) -> Dict[str, Any]:
        """Analyze patterns in detected anomalies"""
        patterns = {
            "primary_causes": [],
            "temporal_patterns": {},
            "severity_distribution": {}
        }

        # Analyze by type and severity
        all_anomalies = (
            anomalies["point_anomalies"] +
            anomalies["contextual_anomalies"] +
            anomalies["collective_anomalies"]
        )

        if not all_anomalies:
            return patterns

        # Severity distribution
        severity_counts = Counter(a.get("severity", "unknown") for a in all_anomalies)
        patterns["severity_distribution"] = dict(severity_counts)

        # Identify primary causes based on frequency and severity
        cause_candidates = defaultdict(lambda: {"count": 0, "severity_score": 0})

        for anomaly in all_anomalies:
            cause_key = f"{anomaly.get('metric', 'unknown')}_{anomaly.get('type', 'unknown')}"
            cause_candidates[cause_key]["count"] += 1
            severity_score = {"high": 3, "medium": 2, "low": 1, "critical": 4}.get(anomaly.get("severity", "low"), 1)
            cause_candidates[cause_key]["severity_score"] += severity_score

        # Sort by combined score
        sorted_causes = sorted(
            cause_candidates.items(),
            key=lambda x: x[1]["count"] * x[1]["severity_score"],
            reverse=True
        )

        for cause, stats in sorted_causes[:self.root_cause_depth]:
            patterns["primary_causes"].append({
                "cause": cause,
                "frequency": stats["count"],
                "severity_score": stats["severity_score"],
                "combined_score": stats["count"] * stats["severity_score"]
            })

        return patterns

    def _find_anomaly_correlations(self, anomalies: Dict[str, List], data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Find correlations between anomalies and system metrics"""
        correlations = []

        # Extract anomaly timestamps (simplified)
        anomaly_times = set()
        for anomaly_list in anomalies.values():
            for anomaly in anomaly_list:
                if "index" in anomaly:
                    anomaly_times.add(anomaly["index"])

        if not anomaly_times:
            return correlations

        # Check correlations with system metrics during anomaly periods
        metrics_data = self._extract_metrics(data)

        for metric_name, values in metrics_data.items():
            if len(values) <= max(anomaly_times):
                continue

            # Compare metric values during anomalies vs normal periods
            anomaly_values = [values[i] for i in anomaly_times if i < len(values)]
            normal_indices = [i for i in range(len(values)) if i not in anomaly_times]
            normal_values = [values[i] for i in normal_indices]

            if len(anomaly_values) >= 3 and len(normal_values) >= 3:
                try:
                    # Perform statistical test (simplified t-test approximation)
                    anomaly_mean = statistics.mean(anomaly_values)
                    normal_mean = statistics.mean(normal_values)

                    if abs(anomaly_mean - normal_mean) > statistics.stdev(values):
                        correlations.append({
                            "metric": metric_name,
                            "anomaly_mean": anomaly_mean,
                            "normal_mean": normal_mean,
                            "difference": anomaly_mean - normal_mean,
                            "correlation_strength": "strong" if abs(anomaly_mean - normal_mean) > 2 * statistics.stdev(values) else "moderate"
                        })
                except Exception as e:
                    self.logger.error(f"Error calculating correlation for {metric_name}: {e}")

        return correlations

    def _identify_contributing_factors(self, anomalies: Dict[str, List], data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify contributing factors to anomalies"""
        factors = []

        # Analyze system resource usage during anomalies
        system_metrics = ["cpu_usage", "memory_usage"]

        for metric in system_metrics:
            metric_data = self._extract_metrics(data).get(metric, [])
            if not metric_data:
                continue

            # Check if anomalies correlate with high resource usage
            anomaly_indices = set()
            for anomaly_list in anomalies.values():
                for anomaly in anomaly_list:
                    if "index" in anomaly and anomaly["index"] < len(metric_data):
                        anomaly_indices.add(anomaly["index"])

            if anomaly_indices:
                anomaly_values = [metric_data[i] for i in anomaly_indices]
                all_values = metric_data

                if anomaly_values and all_values:
                    anomaly_avg = statistics.mean(anomaly_values)
                    overall_avg = statistics.mean(all_values)

                    if anomaly_avg > overall_avg * 1.2:  # 20% higher during anomalies
                        factors.append({
                            "factor": f"high_{metric}",
                            "description": f"Elevated {metric} during anomaly periods",
                            "anomaly_avg": anomaly_avg,
                            "overall_avg": overall_avg,
                            "impact": "high" if anomaly_avg > overall_avg * 1.5 else "medium"
                        })

        return factors

    def _generate_recommendations(self, patterns: Dict, correlations: List, factors: List) -> List[Dict[str, Any]]:
        """Generate recommendations based on analysis"""
        recommendations = []

        # Recommendations based on primary causes
        for cause in patterns.get("primary_causes", []):
            cause_name = cause["cause"]
            if "cpu" in cause_name.lower():
                recommendations.append({
                    "action": "optimize_cpu_usage",
                    "description": "Review and optimize CPU-intensive operations",
                    "priority": "high",
                    "expected_impact": "Reduce CPU-related anomalies"
                })
            elif "memory" in cause_name.lower():
                recommendations.append({
                    "action": "optimize_memory_usage",
                    "description": "Implement memory optimization strategies",
                    "priority": "high",
                    "expected_impact": "Reduce memory-related anomalies"
                })

        # Recommendations based on correlations
        for correlation in correlations:
            if correlation["correlation_strength"] == "strong":
                recommendations.append({
                    "action": "monitor_correlated_metrics",
                    "description": f"Implement monitoring for {correlation['metric']} as early warning indicator",
                    "priority": "medium",
                    "expected_impact": "Enable proactive anomaly detection"
                })

        # Recommendations based on contributing factors
        for factor in factors:
            if factor["impact"] == "high":
                recommendations.append({
                    "action": "resource_optimization",
                    "description": f"Address {factor['factor']} to prevent anomalies",
                    "priority": "high",
                    "expected_impact": "Reduce system-induced anomalies"
                })

        return recommendations

    def _parse_timestamp(self, data: Dict[str, Any]) -> Optional[datetime]:
        """Parse timestamp from data"""
        ts = data.get("timestamp") or data.get("collection_timestamp") or data.get("ts")
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

    def analyze_anomalies(self, hours: int = 24) -> Dict[str, Any]:
        """Main anomaly analysis method"""
        try:
            self.logger.info("Starting anomaly detection and analysis")

            # Load telemetry data
            data = self.load_telemetry_data(hours)

            if not data:
                return {"error": "No telemetry data found for analysis"}

            # Perform statistical analysis
            statistical_analysis = self.perform_statistical_analysis(data)

            # Detect anomalies
            anomalies = self.detect_anomalies(data)

            # Perform root cause analysis
            root_cause_analysis = self.perform_root_cause_analysis(anomalies, data)

            result = {
                "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
                "data_points_analyzed": len(data),
                "time_range_hours": hours,
                "statistical_analysis": statistical_analysis,
                "anomalies": anomalies,
                "root_cause_analysis": root_cause_analysis,
                "insights": self._generate_anomaly_insights(statistical_analysis, anomalies, root_cause_analysis)
            }

            self.logger.info(f"Anomaly analysis completed. Analyzed {len(data)} data points")
            return result

        except Exception as e:
            self.logger.error(f"Error during anomaly analysis: {e}")
            return {
                "error": str(e),
                "error_type": type(e).__name__,
                "analysis_timestamp": datetime.now(timezone.utc).isoformat()
            }

    def _generate_anomaly_insights(self, stats: Dict, anomalies: Dict, root_cause: Dict) -> List[Dict[str, Any]]:
        """Generate insights from anomaly analysis"""
        insights = []

        # Statistical insights
        if "descriptive_stats" in stats:
            for metric, stat in stats["descriptive_stats"].items():
                if stat.get("std_dev", 0) > stat.get("mean", 1) * 0.5:  # High variability
                    insights.append({
                        "type": "high_variability",
                        "metric": metric,
                        "description": f"High variability in {metric} (σ = {stat['std_dev']:.2f})",
                        "severity": "medium"
                    })

        # Anomaly insights
        anomaly_summary = anomalies.get("anomaly_summary", {})
        if anomaly_summary.get("anomaly_score", 0) > 0.7:
            insights.append({
                "type": "high_anomaly_rate",
                "description": f"High anomaly score ({anomaly_summary['anomaly_score']:.2f}) indicates systemic issues",
                "severity": "high"
            })

        # Root cause insights
        primary_causes = root_cause.get("primary_causes", [])
        if primary_causes:
            top_cause = primary_causes[0]
            insights.append({
                "type": "primary_root_cause",
                "description": f"Primary root cause: {top_cause['cause']} (frequency: {top_cause['frequency']})",
                "severity": "high"
            })

        return insights

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Statistical Anomaly Detection")
    parser.add_argument("--config", help="Path to observability config file")
    parser.add_argument("--hours", type=int, default=24, help="Hours of data to analyze")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)

    detector = AnomalyDetector(args.config)
    result = detector.analyze_anomalies(args.hours)

    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print("=" * 80)
        print("STATISTICAL ANOMALY ANALYSIS REPORT")
        print("=" * 80)
        print(f"Analysis Time: {result.get('analysis_timestamp', 'Unknown')}")
        print(f"Data Points: {result.get('data_points_analyzed', 0)}")
        print(f"Time Range: {result.get('time_range_hours', 0)} hours")

        if "error" in result:
            print(f"ERROR: {result['error']}")
            return

        anomalies = result.get("anomalies", {})
        summary = anomalies.get("anomaly_summary", {})
        print("\n📊 Anomaly Summary:")
        print(f"   Point Anomalies: {summary.get('total_point_anomalies', 0)}")
        print(f"   Contextual Anomalies: {summary.get('total_contextual_anomalies', 0)}")
        print(f"   Collective Anomalies: {summary.get('total_collective_anomalies', 0)}")
        print(f"   Anomaly Score: {summary.get('anomaly_score', 0):.2f}")

        root_cause = result.get("root_cause_analysis", {})
        primary_causes = root_cause.get("primary_causes", [])
        if primary_causes:
            print("
🎯 Primary Root Causes:"            for i, cause in enumerate(primary_causes[:3], 1):
                print(f"   {i}. {cause['cause']} (Score: {cause['combined_score']})")

        insights = result.get("insights", [])
        if insights:
            print("
💡 Key Insights:"            for i, insight in enumerate(insights[:3], 1):
                print(f"   {i}. {insight['description']} ({insight['severity']})")

if __name__ == "__main__":
    main()