#!/usr/bin/env python3
"""
Three-Way Swarm Comparison Automation
Compares prior vs current vs auto-ref swarm outputs with specific metrics and multipliers
Integrates with existing af prod-swarm command and generates comparison reports automatically
"""

import argparse
import csv
import json
import math
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# Extended metrics for richer analysis
EXTENDED_METRICS = [
    "health_ckpt",
    "abort",
    "sys_state_err",
    "autofix_adv",
    "autofix_applied",
    "duration_h",
    "total_actions",
    "actions_per_h",
    "alloc_rev",
    "rev_per_h",
    "rev_per_action",
    "allocation_efficiency_pct",
    "event_count",
    "miss",
    "inv",
    "sentinel",
    "zero",
    "duration_ok_pct",
    "dur_mult",
    "eff_mult",
    "safety_mult",
    "tier_backlog_cov_pct",
    "tier_telemetry_cov_pct",
    "tier_depth_cov_pct",
    # New extended metrics
    "throughput_actions_per_hour",
    "portal_pivot_efficiency",
    "dashboard_pivot_efficiency",
    "contention_multiplier",
    "longrun_stability_score",
    "error_recovery_rate",
    "resource_utilization_pct",
    "pipeline_efficiency_pct",
    "pivot_dashboard_duration",
    "pivot_portal_duration",
    "revenue_attribution_quality",
    "maturity_delta_score",
    "gaps_analysis_score",
    "load_safety_control_score",
    "mean_performance_score",
    "variance_performance_score",
    "contention_score",
]

KEY_FIELDS = ["phase", "profile", "concurrency"]


@dataclass
class SwarmTableInfo:
    """Information about a discovered swarm table file"""
    path: str
    timestamp: int
    label: str
    rows: List[Dict[str, Any]]


@dataclass
class ComparisonMetrics:
    """Detailed comparison metrics between swarm runs"""
    delta_current_vs_prior: Dict[str, float]
    delta_auto_vs_current: Dict[str, float]
    delta_auto_vs_prior: Dict[str, float]
    trend_analysis: Dict[str, str]
    recommendations: List[str]
    risk_assessment: Dict[str, str]
    performance_insights: Dict[str, Any]


def get_project_root() -> str:
    """Get the project root directory"""
    return os.environ.get("PROJECT_ROOT") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def discover_swarm_tables(
    project_root: str, pattern: str = "swarm_table_*.tsv"
) -> List[SwarmTableInfo]:
    """
    Discover swarm table files in .goalie directory
    Returns sorted list by timestamp (newest first)
    """
    goalie_dir = Path(project_root) / ".goalie"
    if not goalie_dir.exists():
        goalie_dir.mkdir(exist_ok=True)
        print(f"Created .goalie directory: {goalie_dir}")
        return []
    
    swarm_files = []
    for file_path in goalie_dir.glob(pattern):
        # Extract timestamp and label from filename
        # Expected format: swarm_table_{label}_{timestamp}.tsv
        match = re.match(r'swarm_table_(.+)_(\d+)\.tsv', file_path.name)
        if match:
            label, timestamp_str = match.groups()
            timestamp = int(timestamp_str)
            
            try:
                rows = read_tsv(str(file_path))
                swarm_files.append(SwarmTableInfo(
                    path=str(file_path),
                    timestamp=timestamp,
                    label=label,
                    rows=rows
                ))
            except Exception as e:
                print(f"Warning: Could not read {file_path}: {e}")
                continue
        else:
            # Try to handle legacy format without timestamp
            if file_path.name.startswith("swarm_table_"):
                try:
                    rows = read_tsv(str(file_path))
                    # Use file modification time as timestamp
                    timestamp = int(file_path.stat().st_mtime)
                    label = file_path.name.replace("swarm_table_", "").replace(".tsv", "")
                    swarm_files.append(SwarmTableInfo(
                        path=str(file_path),
                        timestamp=timestamp,
                        label=label,
                        rows=rows
                    ))
                except Exception as e:
                    print(f"Warning: Could not read legacy format {file_path}: {e}")
                    continue
    
    # Sort by timestamp (newest first)
    swarm_files.sort(key=lambda x: x.timestamp, reverse=True)
    return swarm_files


def generate_swarm_table_path(
    project_root: str,
    label: str,
    timestamp: Optional[int] = None
) -> str:
    """
    Generate standardized path for swarm table files
    """
    if timestamp is None:
        timestamp = int(time.time())
    
    goalie_dir = Path(project_root) / ".goalie"
    goalie_dir.mkdir(exist_ok=True)
    
    filename = f"swarm_table_{label}_{timestamp}.tsv"
    return str(goalie_dir / filename)


def save_swarm_table(
    project_root: str,
    rows: List[Dict[str, Any]],
    label: str,
    timestamp: Optional[int] = None,
    enhance_metrics: bool = True
) -> str:
    """
    Save swarm table with enhanced metrics and standardized naming
    """
    if timestamp is None:
        timestamp = int(time.time())
    
    # Enhance metrics if requested
    if enhance_metrics:
        rows = calculate_extended_metrics(rows)
    
    # Generate path
    file_path = generate_swarm_table_path(project_root, label, timestamp)
    
    # Ensure all extended metrics are present in headers
    if rows:
        all_headers = set()
        for row in rows:
            all_headers.update(row.keys())
        
        # Add any missing extended metrics with default values
        for metric in EXTENDED_METRICS:
            if metric not in all_headers:
                for row in rows:
                    row[metric] = 0.0
    
    # Write TSV file
    with open(file_path, "w", encoding="utf-8", newline="") as f:
        if rows:
            fieldnames = list(rows[0].keys())
            writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter="\t", extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
    
    print(f"Saved swarm table: {file_path}")
    return file_path


def validate_swarm_table(file_path: str) -> Dict[str, Any]:
    """
    Validate swarm table format and content
    """
    validation_result = {
        "valid": False,
        "errors": [],
        "warnings": [],
        "row_count": 0,
        "missing_metrics": [],
        "format_issues": []
    }
    
    try:
        rows = read_tsv(file_path)
        validation_result["row_count"] = len(rows)
        
        if not rows:
            validation_result["errors"].append("File is empty")
            return validation_result
        
        # Check required fields
        required_fields = KEY_FIELDS + ["ok"]
        headers = set(rows[0].keys()) if rows else set()
        
        for field in required_fields:
            if field not in headers:
                validation_result["errors"].append(f"Missing required field: {field}")
        
        # Check for extended metrics
        missing_metrics = []
        for metric in EXTENDED_METRICS:
            if metric not in headers:
                missing_metrics.append(metric)
        
        if missing_metrics:
            validation_result["missing_metrics"] = missing_metrics
            validation_result["warnings"].append(f"Missing extended metrics: {', '.join(missing_metrics)}")
        
        # Check data types and ranges
        for i, row in enumerate(rows[:10]):  # Sample first 10 rows
            for metric in ["duration_h", "total_actions", "rev_per_h", "alloc_rev"]:
                if metric in row:
                    try:
                        val = safe_float(row[metric])
                        if val is not None and val < 0:
                            validation_result["warnings"].append(f"Row {i+1}: {metric} has negative value")
                    except Exception:
                        validation_result["format_issues"].append(f"Row {i+1}: {metric} has invalid format")
        
        validation_result["valid"] = len(validation_result["errors"]) == 0
        
    except Exception as e:
        validation_result["errors"].append(f"Failed to read file: {str(e)}")
    
    return validation_result


def find_most_recent_table(
    project_root: str, label_pattern: str = "current"
) -> Optional[SwarmTableInfo]:
    """Find the most recent swarm table matching a label pattern"""
    swarm_files = discover_swarm_tables(project_root)
    
    for swarm_file in swarm_files:
        if label_pattern in swarm_file.label.lower():
            return swarm_file
    
    return None


def read_tsv(path: str) -> List[Dict[str, Any]]:
    """Read TSV file and return list of dictionaries"""
    rows = []
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f, delimiter="\t")
            for row in reader:
                if row:
                    rows.append(row)
    except Exception as e:
        raise Exception(f"Failed to read TSV {path}: {e}")
    return rows


def safe_float(value: Any) -> Optional[float]:
    """Safely convert value to float"""
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        try:
            return float(s)
        except Exception:
            return None
    return None


def safe_int(value: Any) -> Optional[int]:
    """Safely convert value to int"""
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        try:
            return int(s)
        except Exception:
            return None
    return None


def mean(values: List[float]) -> float:
    """Calculate mean of values"""
    if not values:
        return 0.0
    return sum(values) / len(values)


def stdev(values: List[float]) -> float:
    """Calculate sample standard deviation"""
    n = len(values)
    if n <= 1:
        return 0.0
    m = mean(values)
    var = sum((x - m) ** 2 for x in values) / (n - 1)
    return math.sqrt(var)


def calculate_extended_metrics(
    rows: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Calculate extended metrics for each row"""
    enhanced_rows = []
    
    for row in rows:
        enhanced_row = row.copy()
        
        # Extract base values
        duration_h = safe_float(row.get("duration_h", 0)) or 0.0
        total_actions = safe_int(row.get("total_actions", 0)) or 0
        rev_per_h = safe_float(row.get("rev_per_h", 0)) or 0.0
        alloc_rev = safe_float(row.get("alloc_rev", 0)) or 0.0
        event_count = safe_int(row.get("event_count", 0)) or 0
        miss = safe_int(row.get("miss", 0)) or 0
        inv = safe_int(row.get("inv", 0)) or 0
        sentinel = safe_int(row.get("sentinel", 0)) or 0
        zero = safe_int(row.get("zero", 0)) or 0
        abort = safe_int(row.get("abort", 0)) or 0
        autofix_applied = safe_int(row.get("autofix_applied", 0)) or 0
        sys_state_err = safe_int(row.get("sys_state_err", 0)) or 0
        dur_mult = safe_float(row.get("dur_mult", 1.0)) or 1.0
        eff_mult = safe_float(row.get("eff_mult", 1.0)) or 1.0
        
        # Calculate extended metrics
        # Throughput actions per hour (already available but ensure calculation)
        throughput = (float(total_actions) / duration_h) if (duration_h > 0 and total_actions > 0) else 0.0
        enhanced_row["throughput_actions_per_hour"] = throughput
        
        # Portal pivot efficiency (based on allocation efficiency and revenue)
        portal_efficiency = (float(alloc_rev) / rev_per_h) if (rev_per_h > 0 and alloc_rev > 0) else 0.0
        enhanced_row["portal_pivot_efficiency"] = portal_efficiency
        
        # Dashboard pivot efficiency (based on event coverage and success rate)
        success_events = max(0, event_count - (miss + inv + sentinel + zero))
        dashboard_efficiency = (float(success_events) / event_count * 100.0) if event_count > 0 else 0.0
        enhanced_row["dashboard_pivot_efficiency"] = dashboard_efficiency
        
        # Safety multiplier (based on error rates and system stability)
        total_errors = abort + sys_state_err
        error_rate = (float(total_errors) / event_count) if event_count > 0 else 0.0
        safety_mult = max(0.1, 1.0 - (error_rate * 2.0))  # Penalize high error rates
        enhanced_row["safety_mult"] = safety_mult
        
        # Contention multiplier (based on concurrency effects)
        concurrency = row.get("concurrency", "sequential")
        if "concurrent" in concurrency.lower():
            # Estimate contention based on efficiency degradation
            base_efficiency = safe_float(row.get("allocation_efficiency_pct", 100)) or 100.0
            contention_mult = max(0.1, 1.0 - (base_efficiency / 100.0) * 0.5)
        else:
            contention_mult = 1.0
        enhanced_row["contention_multiplier"] = contention_mult
        
        # Longrun stability score (based on error rates and recovery)
        recovery_rate = (float(autofix_applied) / total_errors) if total_errors > 0 else 1.0
        stability_score = max(0.0, 100.0 - (error_rate * 100.0) + (recovery_rate * 20.0))
        enhanced_row["longrun_stability_score"] = stability_score
        
        # Error recovery rate
        enhanced_row["error_recovery_rate"] = recovery_rate
        
        # Resource utilization (based on tier coverage)
        backlog_cov = safe_float(row.get("tier_backlog_cov_pct", 0)) or 0.0
        telem_cov = safe_float(row.get("tier_telemetry_cov_pct", 0)) or 0.0
        depth_cov = safe_float(row.get("tier_depth_cov_pct", 0)) or 0.0
        resource_util = (backlog_cov + telem_cov + depth_cov) / 3.0
        enhanced_row["resource_utilization_pct"] = resource_util
        
        # Pipeline efficiency (combination of multiple factors)
        pipeline_eff = (dashboard_efficiency + resource_util + stability_score) / 3.0
        enhanced_row["pipeline_efficiency_pct"] = pipeline_eff
        
        # Pivot dashboard duration (estimated based on total actions and efficiency)
        pivot_dashboard_duration = (duration_h * 60.0) / dashboard_efficiency if dashboard_efficiency > 0 else duration_h * 60.0
        enhanced_row["pivot_dashboard_duration"] = pivot_dashboard_duration
        
        # Pivot portal duration (estimated based on revenue efficiency)
        pivot_portal_duration = (duration_h * 60.0) / portal_efficiency if portal_efficiency > 0 else duration_h * 60.0
        enhanced_row["pivot_portal_duration"] = pivot_portal_duration
        
        # Revenue attributional quality (based on revenue consistency and efficiency)
        rev_per_action = safe_float(row.get("rev_per_action", 0)) or 0.0
        revenue_quality = min(100.0, (rev_per_action * eff_mult * safety_mult * 10.0))
        enhanced_row["revenue_attribution_quality"] = revenue_quality
        
        # Maturity delta score (based on system maturity indicators)
        maturity_indicators = [
            min(100.0, stability_score),
            min(100.0, recovery_rate * 100.0),
            min(100.0, (1.0 - error_rate) * 100.0),
            min(100.0, resource_util)
        ]
        maturity_delta_score = sum(maturity_indicators) / len(maturity_indicators)
        enhanced_row["maturity_delta_score"] = maturity_delta_score
        
        # Gaps analysis score (based on coverage gaps and error patterns)
        coverage_gaps = 100.0 - resource_util
        error_gaps = error_rate * 100.0
        gaps_score = max(0.0, 100.0 - (coverage_gaps + error_gaps) / 2.0)
        enhanced_row["gaps_analysis_score"] = gaps_score
        
        # Load safety control score (based on system performance under load)
        load_factor = min(1.0, total_actions / 1000.0)  # Normalize to 0-1 range
        performance_under_load = (eff_mult * safety_mult) / (1.0 + load_factor * 0.1)
        load_safety_score = min(100.0, performance_under_load * 100.0)
        enhanced_row["load_safety_control_score"] = load_safety_score
        
        # Mean performance score (overall performance average)
        mean_performance = (
            throughput * 0.2 +
            portal_efficiency * 0.2 +
            dashboard_efficiency * 0.2 +
            stability_score * 0.2 +
            pipeline_eff * 0.2
        )
        enhanced_row["mean_performance_score"] = mean_performance
        
        # Variance performance score (consistency measure)
        performance_factors = [throughput, portal_efficiency, dashboard_efficiency, stability_score, pipeline_eff]
        if len(performance_factors) > 1:
            variance = sum((x - mean_performance) ** 2 for x in performance_factors) / len(performance_factors)
            variance_score = max(0.0, 100.0 - variance * 10.0)  # Lower variance = higher score
        else:
            variance_score = 50.0
        enhanced_row["variance_performance_score"] = variance_score
        
        # Contention score (overall contention impact)
        concurrency_impact = 1.0 - contention_mult if "concurrent" in concurrency.lower() else 0.0
        contention_score = max(0.0, 100.0 - (concurrency_impact * 100.0))
        enhanced_row["contention_score"] = contention_score
        
        enhanced_rows.append(enhanced_row)
    
    return enhanced_rows


def group_by_key(
    rows: List[Dict[str, Any]]
) -> Dict[Tuple[str, str, str], List[Dict[str, Any]]]:
    """Group rows by phase, profile, concurrency key"""
    groups: Dict[Tuple[str, str, str], List[Dict[str, Any]]] = {}
    for row in rows:
        key = tuple((row.get(k) or "").strip() for k in KEY_FIELDS)
        if len(key) == 3:
            groups.setdefault(key, []).append(row)
    return groups


def calculate_group_statistics(
    group: List[Dict[str, Any]], metrics: List[str]
) -> Dict[str, Dict[str, float]]:
    """Calculate statistics for a group of rows"""
    stats = {}
    
    for metric in metrics:
        values = []
        for row in group:
            val = safe_float(row.get(metric))
            if val is not None:
                values.append(val)
        
        stats[metric] = {
            "mean": mean(values),
            "stdev": stdev(values),
            "count": len(values),
            "min": min(values) if values else 0.0,
            "max": max(values) if values else 0.0
        }
    
    return stats


def analyze_trends(
    prior_val: Optional[float],
    current_val: Optional[float],
    auto_val: Optional[float],
    metric: str,
) -> Dict[str, Any]:
    """Analyze trends for a specific metric"""
    trend_info = {
        "direction": "stable",
        "magnitude": 0.0,
        "confidence": "low",
        "significance": "minor"
    }
    
    if prior_val is None or current_val is None:
        return trend_info
    
    # Calculate deltas
    delta_current = (current_val - prior_val) / prior_val if prior_val and prior_val != 0 else 0.0
    if current_val and current_val != 0 and auto_val is not None:
        delta_auto = (auto_val - current_val) / current_val
    else:
        delta_auto = 0.0
    
    # Determine trend direction
    if abs(delta_current) < 0.05:  # Less than 5% change
        trend_info["direction"] = "stable"
    elif delta_current > 0:
        trend_info["direction"] = "improving"
    else:
        trend_info["direction"] = "degrading"
    
    # Determine magnitude
    trend_info["magnitude"] = abs(delta_current)
    
    # Determine confidence based on consistency
    if auto_val is not None:
        auto_delta = (auto_val - prior_val) / prior_val if prior_val and prior_val != 0 else 0.0
        if abs(delta_current - auto_delta) < 0.1:  # Consistent trends
            trend_info["confidence"] = "high"
        elif abs(delta_current - auto_delta) < 0.2:
            trend_info["confidence"] = "medium"
    
    # Determine significance based on metric type and magnitude
    if metric in ["dur_mult", "eff_mult", "rev_per_h", "actions_per_h"]:
        if abs(delta_current) > 0.15:
            trend_info["significance"] = "major"
        elif abs(delta_current) > 0.08:
            trend_info["significance"] = "moderate"
    elif metric in ["abort", "sys_state_err", "miss", "inv"]:
        if abs(delta_current) > 0.2:
            trend_info["significance"] = "major"
        elif abs(delta_current) > 0.1:
            trend_info["significance"] = "moderate"
    
    trend_info["delta_current_percent"] = delta_current * 100
    trend_info["delta_auto_percent"] = delta_auto * 100
    
    return trend_info


def generate_recommendations(comparison_data: Dict[str, Any]) -> List[str]:
    """Generate actionable recommendations based on comparison data"""
    recommendations = []
    
    # Analyze performance trends
    for key, group_data in comparison_data.get("groups", {}).items():
        trends = group_data.get("trend_analysis", {})
        
        # Duration multiplier trends
        dur_trend = trends.get("dur_mult", {})
        if dur_trend.get("direction") == "degrading" and dur_trend.get("significance") in ["moderate", "major"]:
            recommendations.append(
                f"⚠️  Performance degradation detected for {key}: "
                f"Duration increased by {dur_trend.get('delta_current_percent', 0):.1f}%. "
                "Consider investigating bottlenecks and optimizing critical path."
            )
        
        # Efficiency multiplier trends
        eff_trend = trends.get("eff_mult", {})
        if eff_trend.get("direction") == "degrading" and eff_trend.get("significance") in ["moderate", "major"]:
            recommendations.append(
                f"📉 Efficiency loss detected for {key}: "
                f"Revenue efficiency decreased by {abs(eff_trend.get('delta_current_percent', 0)):.1f}%. "
                "Review resource allocation and revenue optimization strategies."
            )
        
        # Error rate trends
        abort_trend = trends.get("abort", {})
        if abort_trend.get("direction") == "improving" and abort_trend.get("significance") in ["moderate", "major"]:
            recommendations.append(
                f"✅ Error reduction achieved for {key}: "
                f"Abort rate improved by {abort_trend.get('delta_current_percent', 0):.1f}%. "
                "Current error handling strategies are effective."
            )
        
        # System state errors
        sys_err_trend = trends.get("sys_state_err", {})
        if sys_err_trend.get("direction") == "degrading":
            recommendations.append(
                f"🚨 System stability concern for {key}: "
                f"System state errors increased by {abs(sys_err_trend.get('delta_current_percent', 0)):.1f}%. "
                "Investigate system health checks and error recovery mechanisms."
            )
    
    # Add general recommendations
    if not recommendations:
        recommendations.append("✅ System performance appears stable across all metrics.")
    
    recommendations.extend([
        "📊 Continue monitoring key performance indicators (KPIs): duration_mult, eff_mult, abort_rate",
        "🔧 Regular performance reviews recommended to maintain optimal system health",
        "📈 Consider automated alerting for significant performance deviations (>15%)"
    ])
    
    return recommendations


def assess_risks(comparison_data: Dict[str, Any]) -> Dict[str, str]:
    """Assess risks based on comparison data"""
    risk_levels = {}
    
    for key, group_data in comparison_data.get("groups", {}).items():
        risk_score = 0
        risk_factors = []
        
        trends = group_data.get("trend_analysis", {})
        
        # Check for performance degradation
        dur_trend = trends.get("dur_mult", {})
        if dur_trend.get("direction") == "degrading":
            risk_score += dur_trend.get("magnitude", 0) * 10
            risk_factors.append("performance_degradation")
        
        # Check for efficiency loss
        eff_trend = trends.get("eff_mult", {})
        if eff_trend.get("direction") == "degrading":
            risk_score += eff_trend.get("magnitude", 0) * 15
            risk_factors.append("efficiency_loss")
        
        # Check for error rate increases
        abort_trend = trends.get("abort", {})
        if abort_trend.get("direction") == "degrading":
            risk_score += abort_trend.get("magnitude", 0) * 20
            risk_factors.append("error_rate_increase")
        
        # Check for system instability
        sys_err_trend = trends.get("sys_state_err", {})
        if sys_err_trend.get("direction") == "degrading":
            risk_score += sys_err_trend.get("magnitude", 0) * 25
            risk_factors.append("system_instability")
        
        # Determine risk level
        if risk_score >= 30:
            risk_level = "HIGH"
        elif risk_score >= 15:
            risk_level = "MEDIUM"
        elif risk_score >= 5:
            risk_level = "LOW"
        else:
            risk_level = "MINIMAL"
        
        risk_levels[key] = risk_level
    
    return risk_levels


def compare_three_way(prior_table: SwarmTableInfo, current_table: SwarmTableInfo,
                    auto_ref_table: SwarmTableInfo) -> Dict[str, Any]:
    """Perform three-way comparison of swarm tables"""
    
    # Validate input tables
    for table, name in [(prior_table, "prior"), (current_table, "current"), (auto_ref_table, "auto_ref")]:
        validation = validate_swarm_table(table.path)
        if not validation["valid"]:
            raise ValueError(f"Invalid {name} table: {', '.join(validation['errors'])}")
    
    # Enhance all tables with extended metrics
    prior_enhanced = calculate_extended_metrics(prior_table.rows)
    current_enhanced = calculate_extended_metrics(current_table.rows)
    auto_enhanced = calculate_extended_metrics(auto_ref_table.rows)
    
    # Group by key fields
    prior_groups = group_by_key(prior_enhanced)
    current_groups = group_by_key(current_enhanced)
    auto_groups = group_by_key(auto_enhanced)
    
    # Get all unique keys
    all_keys = set(prior_groups.keys()) | set(current_groups.keys()) | set(auto_groups.keys())
    
    comparison_result = {
        "meta": {
            "prior_file": prior_table.path,
            "current_file": current_table.path,
            "auto_ref_file": auto_ref_table.path,
            "prior_label": prior_table.label,
            "current_label": current_table.label,
            "auto_ref_label": auto_ref_table.label,
            "generated_ts": int(time.time()),
            "comparison_type": "three_way",
            "extended_metrics_count": len(EXTENDED_METRICS),
            "validation_summary": {
                "prior": validate_swarm_table(prior_table.path),
                "current": validate_swarm_table(current_table.path),
                "auto_ref": validate_swarm_table(auto_ref_table.path)
            }
        },
        "groups": {},
        "summary_statistics": {},
        "performance_insights": {}
    }
    
    # Analyze each group
    for key in all_keys:
        key_str = "|".join(key)
        
        prior_group = prior_groups.get(key, [])
        current_group = current_groups.get(key, [])
        auto_group = auto_groups.get(key, [])
        
        # Calculate statistics
        prior_stats = calculate_group_statistics(prior_group, EXTENDED_METRICS)
        current_stats = calculate_group_statistics(current_group, EXTENDED_METRICS)
        auto_stats = calculate_group_statistics(auto_group, EXTENDED_METRICS)
        
        # Analyze trends for each metric
        trend_analysis = {}
        for metric in EXTENDED_METRICS:
            prior_val = prior_stats.get(metric, {}).get("mean")
            current_val = current_stats.get(metric, {}).get("mean")
            auto_val = auto_stats.get(metric, {}).get("mean")
            
            trend_analysis[metric] = analyze_trends(prior_val, current_val, auto_val, metric)
        
        # Calculate deltas
        deltas = {
            "current_vs_prior": {},
            "auto_vs_current": {},
            "auto_vs_prior": {}
        }
        
        for metric in EXTENDED_METRICS:
            prior_val = prior_stats.get(metric, {}).get("mean", 0)
            current_val = current_stats.get(metric, {}).get("mean", 0)
            auto_val = auto_stats.get(metric, {}).get("mean", 0)
            
            deltas["current_vs_prior"][metric] = current_val - prior_val
            deltas["auto_vs_current"][metric] = auto_val - current_val
            deltas["auto_vs_prior"][metric] = auto_val - prior_val
        
        comparison_result["groups"][key_str] = {
            "key": {"phase": key[0], "profile": key[1], "concurrency": key[2]},
            "prior": {"stats": prior_stats, "count": len(prior_group)},
            "current": {"stats": current_stats, "count": len(current_group)},
            "auto_ref": {"stats": auto_stats, "count": len(auto_group)},
            "trend_analysis": trend_analysis,
            "deltas": deltas
        }
    
    # Generate summary statistics
    comparison_result["summary_statistics"] = generate_summary_statistics(comparison_result["groups"])
    
    # Generate performance insights
    comparison_result["performance_insights"] = generate_performance_insights(comparison_result["groups"])
    
    # Generate recommendations and risk assessment
    comparison_result["recommendations"] = generate_recommendations(comparison_result)
    comparison_result["risk_assessment"] = assess_risks(comparison_result)
    
    return comparison_result


def generate_summary_statistics(groups: Dict[str, Any]) -> Dict[str, Any]:
    """Generate overall summary statistics across all groups"""
    summary = {
        "total_groups": len(groups),
        "key_metrics_summary": {},
        "trend_distribution": {"improving": 0, "degrading": 0, "stable": 0},
        "risk_distribution": {"HIGH": 0, "MEDIUM": 0, "LOW": 0, "MINIMAL": 0}
    }
    
    # Aggregate key metrics across all groups
    key_metrics = ["dur_mult", "eff_mult", "safety_mult", "rev_per_h", "longrun_stability_score"]
    for metric in key_metrics:
        values = []
        for group_data in groups.values():
            current_val = group_data.get("current", {}).get("stats", {}).get(metric, {}).get("mean", 0)
            if current_val is not None:
                values.append(current_val)
        
        if values:
            summary["key_metrics_summary"][metric] = {
                "mean": mean(values),
                "stdev": stdev(values),
                "min": min(values),
                "max": max(values),
                "count": len(values)
            }
    
    # Count trends
    for group_data in groups.values():
        trends = group_data.get("trend_analysis", {})
        for metric, trend_info in trends.items():
            direction = trend_info.get("direction", "stable")
            if direction in summary["trend_distribution"]:
                summary["trend_distribution"][direction] += 1
    
    return summary


def generate_performance_insights(groups: Dict[str, Any]) -> Dict[str, Any]:
    """Generate detailed performance insights"""
    insights = {
        "top_performers": {},
        "areas_of_concern": {},
        "efficiency_analysis": {},
        "stability_analysis": {},
        "contention_analysis": {}
    }
    
    # Find top performers and areas of concern
    for metric in ["rev_per_h", "longrun_stability_score", "pipeline_efficiency_pct"]:
        values = []
        for key, group_data in groups.items():
            current_val = group_data.get("current", {}).get("stats", {}).get(metric, {}).get("mean", 0)
            if current_val is not None:
                values.append((key, current_val))
        
        if values:
            values.sort(key=lambda x: x[1], reverse=True)
            insights["top_performers"][metric] = {
                "best": values[0] if values else None,
                "worst": values[-1] if values else None
            }
    
    # Analyze efficiency patterns
    efficiency_patterns = []
    for key, group_data in groups.items():
        deltas = group_data.get("deltas", {}).get("current_vs_prior", {})
        eff_delta = deltas.get("eff_mult", 0)
        safety_delta = deltas.get("safety_mult", 0)
        
        if eff_delta < -0.1 or safety_delta < -0.1:
            efficiency_patterns.append((key, eff_delta, safety_delta))
    
    insights["efficiency_analysis"]["degrading_groups"] = efficiency_patterns
    
    # Analyze stability patterns
    stability_patterns = []
    for key, group_data in groups.items():
        stability_score = group_data.get("current", {}).get("stats", {}).get("longrun_stability_score", {}).get("mean", 0)
        if stability_score < 70:  # Low stability threshold
            stability_patterns.append((key, stability_score))
    
    insights["stability_analysis"]["low_stability_groups"] = stability_patterns
    
    # Analyze contention patterns
    contention_patterns = []
    for key, group_data in groups.items():
        concurrency = group_data.get("key", {}).get("concurrency", "")
        if "concurrent" in concurrency.lower():
            contention_score = group_data.get("current", {}).get("stats", {}).get("contention_score", {}).get("mean", 0)
            if contention_score < 50:  # High contention threshold
                contention_patterns.append((key, contention_score))
    
    insights["contention_analysis"]["high_contention_groups"] = contention_patterns
    
    return insights


def trigger_automated_comparison(project_root: str, current_table_path: str) -> Dict[str, Any]:
    """
    Trigger automated three-way comparison after prod-swarm run
    """
    try:
        # Discover available tables
        swarm_files = discover_swarm_tables(project_root)
        
        if len(swarm_files) < 3:
            return {
                "success": False,
                "error": f"Need at least 3 swarm tables for comparison, found {len(swarm_files)}",
                "available_files": [f.path for f in swarm_files]
            }
        
        # Find the current table
        current_table = None
        for swarm_file in swarm_files:
            if swarm_file.path == current_table_path:
                current_table = swarm_file
                break
        
        if not current_table:
            return {
                "success": False,
                "error": f"Current table {current_table_path} not found in discovered files"
            }
        
        # Select prior and auto-ref tables (excluding current)
        available_tables = [f for f in swarm_files if f.path != current_table_path]
        
        if len(available_tables) >= 2:
            # Use most recent as auto-ref, oldest as prior
            auto_ref_table = available_tables[0]
            prior_table = available_tables[-1]
        else:
            return {
                "success": False,
                "error": "Need at least 2 additional tables for three-way comparison"
            }
        
        # Perform comparison
        comparison_result = compare_three_way(prior_table, current_table, auto_ref_table)
        
        # Save comparison results
        timestamp = int(time.time())
        comparison_path = generate_swarm_table_path(project_root, f"comparison_{current_table.label}", timestamp)
        comparison_path = comparison_path.replace(".tsv", ".json")
        
        with open(comparison_path, "w", encoding="utf-8") as f:
            json.dump(comparison_result, f, indent=2, sort_keys=True)
        
        return {
            "success": True,
            "comparison_path": comparison_path,
            "prior_table": prior_table.path,
            "current_table": current_table.path,
            "auto_ref_table": auto_ref_table.path,
            "groups_analyzed": len(comparison_result.get("groups", {})),
            "recommendations": len(comparison_result.get("recommendations", []))
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Automated comparison failed: {str(e)}"
        }


def save_comparison_results(comparison_data: Dict[str, Any], output_path: str, format_type: str = "json") -> None:
    """Save comparison results to file"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    if format_type.lower() == "json":
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(comparison_data, f, indent=2, sort_keys=True)
    elif format_type.lower() == "tsv":
        # Generate TSV format for key metrics
        with open(output_path, "w", encoding="utf-8") as f:
            writer = csv.writer(f, delimiter="\t")
            
            # Header
            header = ["key", "phase", "profile", "concurrency"]
            for metric in ["dur_mult", "eff_mult", "rev_per_h", "abort", "sys_state_err"]:
                header.extend([
                    f"prior_{metric}",
                    f"current_{metric}", 
                    f"auto_{metric}",
                    f"delta_current_prior_{metric}",
                    f"delta_auto_current_{metric}"
                ])
            writer.writerow(header)
            
            # Data rows
            for key_str, group_data in comparison_data.get("groups", {}).items():
                key = group_data.get("key", {})
                row = [
                    key_str,
                    key.get("phase", ""),
                    key.get("profile", ""),
                    key.get("concurrency", "")
                ]
                
                for metric in ["dur_mult", "eff_mult", "rev_per_h", "abort", "sys_state_err"]:
                    prior_val = group_data.get("prior", {}).get("stats", {}).get(metric, {}).get("mean", 0)
                    current_val = group_data.get("current", {}).get("stats", {}).get(metric, {}).get("mean", 0)
                    auto_val = group_data.get("auto_ref", {}).get("stats", {}).get(metric, {}).get("mean", 0)
                    delta_current = group_data.get("deltas", {}).get("current_vs_prior", {}).get(metric, 0)
                    delta_auto = group_data.get("deltas", {}).get("auto_vs_current", {}).get(metric, 0)
                    
                    row.extend([prior_val, current_val, auto_val, delta_current, delta_auto])
                
                writer.writerow(row)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Three-Way Swarm Comparison Automation")
    
    # Core inputs
    parser.add_argument("--prior", help="Path to prior swarm TSV file")
    parser.add_argument("--current", help="Path to current swarm TSV file")
    parser.add_argument("--auto-ref", help="Path to auto-ref swarm TSV file")
    
    # Operation modes
    parser.add_argument("--discover", action="store_true",
                       help="Auto-discover swarm tables in .goalie directory")
    parser.add_argument("--auto-compare", action="store_true",
                       help="Trigger automated comparison after prod-swarm run")
    parser.add_argument("--save-table", action="store_true",
                       help="Save current swarm table to .goalie directory")
    parser.add_argument("--table-label", default="current",
                       help="Label for saved swarm table")
    parser.add_argument("--validate-only", action="store_true",
                       help="Only validate swarm table files")
    
    # Output control
    parser.add_argument("--out", choices=["json", "tsv"], default="json",
                       help="Output format")
    parser.add_argument("--save", help="Save output to file")
    parser.add_argument("--json", action="store_true", help="Force JSON output (legacy support)")
    
    # Context
    parser.add_argument("--project-root", help="Project root directory")
    parser.add_argument("--correlation-id", help="Trace ID for logging")
    
    args = parser.parse_args()
    
    # Handle --json flag
    if args.json:
        args.out = "json"
    
    project_root = args.project_root or get_project_root()
    
    # Handle validation-only mode
    if args.validate_only:
        if args.current:
            validation = validate_swarm_table(args.current)
            print(f"Validation for {args.current}:")
            print(f"  Valid: {validation['valid']}")
            if validation['errors']:
                print(f"  Errors: {', '.join(validation['errors'])}")
            if validation['warnings']:
                print(f"  Warnings: {', '.join(validation['warnings'])}")
            return 0 if validation['valid'] else 1
        else:
            print("Error: --current required for validation")
            return 1
    
    # Handle save-table mode
    if args.save_table:
        if args.current:
            try:
                rows = read_tsv(args.current)
                saved_path = save_swarm_table(project_root, rows, args.table_label)
                print(f"Table saved with enhanced metrics: {saved_path}")
                
                # Trigger automated comparison if requested
                if args.auto_compare:
                    auto_result = trigger_automated_comparison(project_root, saved_path)
                    if auto_result["success"]:
                        print(f"Automated comparison completed: {auto_result['comparison_path']}")
                        print(f"Groups analyzed: {auto_result['groups_analyzed']}")
                        print(f"Recommendations generated: {auto_result['recommendations']}")
                    else:
                        print(f"Automated comparison failed: {auto_result['error']}")
                
                return 0
            except Exception as e:
                print(f"Error saving table: {e}")
                return 1
        else:
            print("Error: --current required for save-table mode")
            return 1
    
    # Handle auto-compare mode
    if args.auto_compare and not args.save_table:
        if args.current:
            auto_result = trigger_automated_comparison(project_root, args.current)
            if auto_result["success"]:
                print(f"Automated comparison completed: {auto_result['comparison_path']}")
                print(f"Groups analyzed: {auto_result['groups_analyzed']}")
                print(f"Recommendations generated: {auto_result['recommendations']}")
            else:
                print(f"Automated comparison failed: {auto_result['error']}")
            return 0 if auto_result["success"] else 1
        else:
            print("Error: --current required for auto-compare mode")
            return 1
    
    # Discover files if requested
    if args.discover:
        swarm_files = discover_swarm_tables(project_root)
        
        if len(swarm_files) < 3:
            print("Error: Need at least 3 swarm table files for three-way comparison")
            return 1
        
        # Use the three most recent files
        prior_table = swarm_files[2]  # Third most recent
        current_table = swarm_files[0]  # Most recent
        auto_ref_table = swarm_files[1]  # Second most recent
        
        print(f"Auto-discovered files:")
        print(f"  Prior: {prior_table.path} ({prior_table.label})")
        print(f"  Current: {current_table.path} ({current_table.label})")
        print(f"  Auto-ref: {auto_ref_table.path} ({auto_ref_table.label})")
    
    else:
        # Use provided file paths
        if not all([args.prior, args.current, args.auto_ref]):
            print("Error: --prior, --current, and --auto-ref are required when not using --discover")
            return 1
        
        prior_table = SwarmTableInfo(
            path=args.prior,
            timestamp=0,
            label="prior",
            rows=read_tsv(args.prior)
        )
        current_table = SwarmTableInfo(
            path=args.current,
            timestamp=0,
            label="current",
            rows=read_tsv(args.current)
        )
        auto_ref_table = SwarmTableInfo(
            path=args.auto_ref,
            timestamp=0,
            label="auto_ref",
            rows=read_tsv(args.auto_ref)
        )
    
    # Perform comparison
    try:
        comparison_data = compare_three_way(prior_table, current_table, auto_ref_table)
        
        # Output results
        if args.out == "json":
            output = json.dumps(comparison_data, indent=2, sort_keys=True)
        else:
            # For TSV, we'll save to file and print summary
            output = f"Three-way swarm comparison completed.\n"
            output += f"Groups analyzed: {len(comparison_data.get('groups', {}))}\n"
            output += f"Recommendations: {len(comparison_data.get('recommendations', []))}\n"
            output += f"Risk levels: {set(comparison_data.get('risk_assessment', {}).values())}\n"
        
        print(output)
        
        # Save if requested
        if args.save:
            save_comparison_results(comparison_data, args.save, args.out)
            print(f"Results saved to: {args.save}")
        
        return 0
        
    except Exception as e:
        print(f"Error during comparison: {e}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())