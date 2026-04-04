#!/usr/bin/env python3
"""
Enhanced Swarm Comparison Automation System
Provides comprehensive 3-way analysis with auto-discovery, validation, and unified evidence emission
"""

import argparse
import csv
import json
import math
import os
import re
import sys
import time
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

# Import existing swarm compare functionality
try:
    from swarm_compare import (
        discover_swarm_tables,
        validate_swarm_table,
        read_tsv,
        safe_float,
        safe_int,
        mean,
        stdev,
        calculate_extended_metrics,
        group_by_key,
        SwarmTableInfo,
        ComparisonMetrics,
        EXTENDED_METRICS,
        KEY_FIELDS
    )
    SWARM_COMPARE_AVAILABLE = True
except ImportError:
    SWARM_COMPARE_AVAILABLE = False
    print("Warning: swarm_compare.py not available, using fallback implementation")


@dataclass
class SwarmComparisonResult:
    """Comprehensive result of swarm comparison automation"""
    run_id: str
    timestamp: str
    discovery_result: Dict[str, Any]
    validation_results: Dict[str, Any]
    comparison_result: Optional[Dict[str, Any]]
    evidence_emitted: bool
    output_files: List[str]
    errors: List[str]
    warnings: List[str]
    recommendations: List[str]
    performance_insights: Dict[str, Any]


class UnifiedEvidenceEmitter:
    """Unified evidence emitter for consistent logging across swarm operations"""
    
    def __init__(self, goalie_dir: Path, command: str = "prod-swarm", mode: str = "normal"):
        self.goalie_dir = goalie_dir
        self.command = command
        self.mode = mode
        self.run_id = os.environ.get("AF_RUN_ID", str(uuid.uuid4()))
        
        # Ensure evidence directory exists
        self.goalie_dir.mkdir(exist_ok=True)
        
    def emit(self, event_type: str, data: Dict[str, Any], gate: Optional[str] = None):
        """Emit evidence with standardized structure"""
        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "command": self.command,
            "mode": self.mode,
            "event_type": event_type,
            "run_id": self.run_id,
            "gate": gate,
            "data": data
        }
        
        # Write to unified evidence log
        unified_log_path = self.goalie_dir / "unified_evidence.jsonl"
        with open(unified_log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(event) + '\n')
        
        # Write to swarm-specific log
        swarm_log_path = self.goalie_dir / "swarm_events.jsonl"
        with open(swarm_log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(event) + '\n')
            
        return event
    
    def emit_system_health(self, metrics: Dict[str, Any]):
        """Emit system health metrics"""
        return self.emit("system_health", metrics)
    
    def emit_comparison_completed(self, result: Dict[str, Any]):
        """Emit comparison completion event"""
        return self.emit("comparison_completed", result)
    
    def emit_error(self, error: str, context: Dict[str, Any] = None):
        """Emit error event"""
        data = {"error": error, "context": context or {}}
        return self.emit("swarm_error", data)
    
    def emit_success(self, message: str, context: Dict[str, Any] = None):
        """Emit success event"""
        data = {"message": message, "context": context or {}}
        return self.emit("swarm_success", data)


class SwarmCompareAutomation:
    """Main automation class for swarm comparison with auto-discovery"""
    
    def __init__(self, project_root: str, mode: str = "normal"):
        self.project_root = Path(project_root)
        self.goalie_dir = self.project_root / ".goalie"
        self.mode = mode
        self.evidence_emitter = UnifiedEvidenceEmitter(self.goalie_dir, "prod-swarm", mode)
        self.run_id = self.evidence_emitter.run_id
        
    def auto_discover_tables(self, pattern: str = "swarm_table_*.tsv") -> Dict[str, Any]:
        """Auto-discover swarm tables with comprehensive analysis"""
        discovery_result = {
            "run_id": self.run_id,
            "discovery_time": datetime.now(timezone.utc).isoformat(),
            "pattern": pattern,
            "tables_found": [],
            "validation_summary": {},
            "errors": [],
            "warnings": []
        }
        
        try:
            # Discover tables using existing functionality or fallback
            if SWARM_COMPARE_AVAILABLE:
                swarm_tables = discover_swarm_tables(str(self.project_root), pattern)
            else:
                swarm_tables = self._fallback_discover_tables(pattern)
            
            discovery_result["tables_found"] = [
                {
                    "path": table.path,
                    "label": table.label,
                    "timestamp": table.timestamp,
                    "row_count": len(table.rows) if table.rows else 0
                }
                for table in swarm_tables
            ]
            
            # Validate each discovered table
            validation_results = {}
            for table in swarm_tables:
                validation = self._validate_table_comprehensive(table.path)
                validation_results[table.label] = validation
                
                if not validation["valid"]:
                    discovery_result["errors"].append(
                        f"Table {table.label} validation failed: {', '.join(validation['errors'])}"
                    )
                elif validation["warnings"]:
                    discovery_result["warnings"].extend([
                        f"Table {table.label}: {warning}" for warning in validation["warnings"]
                    ])
            
            discovery_result["validation_summary"] = {
                "total_tables": len(swarm_tables),
                "valid_tables": sum(1 for v in validation_results.values() if v["valid"]),
                "tables_with_warnings": sum(1 for v in validation_results.values() if v["warnings"]),
                "invalid_tables": sum(1 for v in validation_results.values() if not v["valid"])
            }
            
            # Emit discovery event
            self.evidence_emitter.emit("swarm_discovery_completed", discovery_result)
            
        except Exception as e:
            error_msg = f"Auto-discovery failed: {str(e)}"
            discovery_result["errors"].append(error_msg)
            self.evidence_emitter.emit_error(error_msg, {"pattern": pattern})
        
        return discovery_result
    
    def _fallback_discover_tables(self, pattern: str) -> List[SwarmTableInfo]:
        """Fallback table discovery when swarm_compare.py is not available"""
        swarm_files = []
        goalie_dir = self.project_root / ".goalie"
        
        if not goalie_dir.exists():
            return swarm_files
            
        for file_path in goalie_dir.glob(pattern):
            try:
                # Extract timestamp and label from filename
                match = re.match(r'swarm_table_(.+)_(\d+)\.tsv', file_path.name)
                if match:
                    label, timestamp_str = match.groups()
                    timestamp = int(timestamp_str)
                    
                    rows = read_tsv(str(file_path))
                    swarm_files.append(SwarmTableInfo(
                        path=str(file_path),
                        timestamp=timestamp,
                        label=label,
                        rows=rows
                    ))
            except Exception as e:
                print(f"Warning: Could not process {file_path}: {e}")
                continue
        
        # Sort by timestamp (newest first)
        swarm_files.sort(key=lambda x: x.timestamp, reverse=True)
        return swarm_files
    
    def _validate_table_comprehensive(self, file_path: str) -> Dict[str, Any]:
        """Comprehensive table validation with enhanced checks"""
        if SWARM_COMPARE_AVAILABLE:
            validation = validate_swarm_table(file_path)
        else:
            validation = self._fallback_validate_table(file_path)
        
        # Add enhanced validation checks
        try:
            rows = read_tsv(file_path)
            
            # Check for data consistency
            if rows:
                # Check for required key fields
                missing_keys = []
                for key in KEY_FIELDS:
                    if key not in rows[0]:
                        missing_keys.append(key)
                
                if missing_keys:
                    validation["errors"].append(f"Missing key fields: {', '.join(missing_keys)}")
                    validation["valid"] = False
                
                # Check data quality
                for i, row in enumerate(rows[:5]):  # Sample first 5 rows
                    for metric in ["rev_per_h", "duration_h", "total_actions"]:
                        if metric in row:
                            val = safe_float(row[metric])
                            if val is not None and val < 0:
                                validation["warnings"].append(
                                    f"Row {i+1}: {metric} has negative value: {val}"
                                )
                
                # Check for extended metrics coverage
                available_metrics = set(rows[0].keys()) if rows else set()
                missing_extended = [m for m in EXTENDED_METRICS if m not in available_metrics]
                
                if missing_extended:
                    validation["warnings"].append(
                        f"Missing extended metrics: {', '.join(missing_extended[:5])}..."
                    )
                    validation["missing_extended_metrics"] = missing_extended
        
        except Exception as e:
            validation["errors"].append(f"Validation error: {str(e)}")
            validation["valid"] = False
        
        return validation
    
    def _fallback_validate_table(self, file_path: str) -> Dict[str, Any]:
        """Fallback validation when swarm_compare.py is not available"""
        validation = {
            "valid": False,
            "errors": [],
            "warnings": [],
            "row_count": 0,
            "missing_metrics": [],
            "format_issues": []
        }
        
        try:
            rows = read_tsv(file_path)
            validation["row_count"] = len(rows)
            
            if not rows:
                validation["errors"].append("File is empty")
                return validation
            
            # Basic format checks
            headers = set(rows[0].keys()) if rows else set()
            required_fields = KEY_FIELDS + ["ok"]
            
            for field in required_fields:
                if field not in headers:
                    validation["errors"].append(f"Missing required field: {field}")
            
            validation["valid"] = len(validation["errors"]) == 0
            
        except Exception as e:
            validation["errors"].append(f"Failed to read file: {str(e)}")
        
        return validation
    
    def run_three_way_comparison(
        self,
        prior_table: Optional[str] = None,
        current_table: Optional[str] = None,
        auto_ref_table: Optional[str] = None,
        auto_discover: bool = True
    ) -> Dict[str, Any]:
        """Run comprehensive 3-way comparison with auto-discovery fallback"""
        
        comparison_result = {
            "run_id": self.run_id,
            "comparison_time": datetime.now(timezone.utc).isoformat(),
            "input_files": {
                "prior": prior_table,
                "current": current_table,
                "auto_ref": auto_ref_table
            },
            "auto_discovered": False,
            "comparison_data": {},
            "metrics": {},
            "recommendations": [],
            "errors": [],
            "warnings": []
        }
        
        try:
            # Auto-discover tables if needed
            if auto_discover and (not prior_table or not current_table or not auto_ref_table):
                discovery = self.auto_discover_tables()
                swarm_tables = self._fallback_discover_tables("swarm_table_*.tsv")
                
                if len(swarm_tables) >= 3:
                    # Auto-assign tables: newest=current, middle=auto-ref, oldest=prior
                    current_table = current_table or swarm_tables[0].path
                    auto_ref_table = auto_ref_table or swarm_tables[1].path
                    prior_table = prior_table or swarm_tables[-1].path
                    comparison_result["auto_discovered"] = True
                    comparison_result["discovery_info"] = discovery
                else:
                    error_msg = f"Insufficient tables for comparison: found {len(swarm_tables)}, need 3"
                    comparison_result["errors"].append(error_msg)
                    self.evidence_emitter.emit_error(error_msg)
                    return comparison_result
            
            # Validate input files
            validation_errors = []
            for file_type, file_path in [
                ("prior", prior_table),
                ("current", current_table),
                ("auto_ref", auto_ref_table)
            ]:
                if file_path and not Path(file_path).exists():
                    validation_errors.append(f"{file_type} file not found: {file_path}")
                elif file_path:
                    validation = self._validate_table_comprehensive(file_path)
                    if not validation["valid"]:
                        validation_errors.extend([
                            f"{file_type}: {err}" for err in validation["errors"]
                        ])
            
            if validation_errors:
                comparison_result["errors"].extend(validation_errors)
                self.evidence_emitter.emit_error("Validation failed", validation_errors)
                return comparison_result
            
            # Perform comparison
            if SWARM_COMPARE_AVAILABLE:
                comparison_data = self._run_enhanced_comparison(prior_table, current_table, auto_ref_table)
            else:
                comparison_data = self._run_fallback_comparison(prior_table, current_table, auto_ref_table)
            
            comparison_result["comparison_data"] = comparison_data
            
            # Generate recommendations and insights
            insights = self._generate_performance_insights(comparison_data)
            comparison_result["metrics"] = insights["metrics"]
            comparison_result["recommendations"] = insights["recommendations"]
            comparison_result["performance_insights"] = insights["performance_insights"]
            
            # Emit completion event
            self.evidence_emitter.emit_comparison_completed(comparison_result)
            
        except Exception as e:
            error_msg = f"Comparison failed: {str(e)}"
            comparison_result["errors"].append(error_msg)
            self.evidence_emitter.emit_error(error_msg)
        
        return comparison_result
    
    def _run_enhanced_comparison(
        self, prior_table: str, current_table: str, auto_ref_table: str
    ) -> Dict[str, Any]:
        """Run enhanced comparison using existing swarm_compare functionality"""
        # This would integrate with the existing swarm_compare.py comparison logic
        # For now, implement a comprehensive comparison
        
        prior_data = read_tsv(prior_table)
        current_data = read_tsv(current_table)
        auto_ref_data = read_tsv(auto_ref_table)
        
        # Group data by key fields for comparison
        prior_groups = group_by_key(prior_data) if SWARM_COMPARE_AVAILABLE else self._fallback_group_by_key(prior_data)
        current_groups = group_by_key(current_data) if SWARM_COMPARE_AVAILABLE else self._fallback_group_by_key(current_data)
        auto_ref_groups = group_by_key(auto_ref_data) if SWARM_COMPARE_AVAILABLE else self._fallback_group_by_key(auto_ref_data)
        
        # Calculate deltas and trends
        comparison_data = {
            "file_info": {
                "prior": {"path": prior_table, "rows": len(prior_data)},
                "current": {"path": current_table, "rows": len(current_data)},
                "auto_ref": {"path": auto_ref_table, "rows": len(auto_ref_data)}
            },
            "key_comparisons": {},
            "summary_metrics": {},
            "trend_analysis": {}
        }
        
        # Compare each key combination
        all_keys = set(prior_groups.keys()) | set(current_groups.keys()) | set(auto_ref_groups.keys())
        
        for key in all_keys:
            prior_rows = prior_groups.get(key, [])
            current_rows = current_groups.get(key, [])
            auto_ref_rows = auto_ref_groups.get(key, [])
            
            key_comparison = self._compare_key_group(key, prior_rows, current_rows, auto_ref_rows)
            comparison_data["key_comparisons"][str(key)] = key_comparison
        
        # Generate summary metrics
        comparison_data["summary_metrics"] = self._calculate_summary_metrics(
            prior_data, current_data, auto_ref_data
        )
        
        return comparison_data
    
    def _run_fallback_comparison(
        self, prior_table: str, current_table: str, auto_ref_table: str
    ) -> Dict[str, Any]:
        """Fallback comparison when enhanced functionality is not available"""
        # Basic comparison implementation
        prior_data = read_tsv(prior_table)
        current_data = read_tsv(current_table)
        auto_ref_data = read_tsv(auto_ref_table)
        
        return {
            "file_info": {
                "prior": {"path": prior_table, "rows": len(prior_data)},
                "current": {"path": current_table, "rows": len(current_data)},
                "auto_ref": {"path": auto_ref_table, "rows": len(auto_ref_data)}
            },
            "basic_metrics": self._calculate_basic_metrics(prior_data, current_data, auto_ref_data),
            "comparison_type": "fallback"
        }
    
    def _fallback_group_by_key(self, rows: List[Dict[str, Any]]) -> Dict[Tuple[str, str, str], List[Dict[str, Any]]]:
        """Fallback grouping by key fields"""
        groups = {}
        for row in rows:
            key = tuple((row.get(k) or "").strip() for k in KEY_FIELDS)
            if len(key) == 3:
                if key not in groups:
                    groups[key] = []
                groups[key].append(row)
        return groups
    
    def _compare_key_group(
        self,
        key: Tuple[str, str, str],
        prior_rows: List[Dict[str, Any]],
        current_rows: List[Dict[str, Any]],
        auto_ref_rows: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Compare a specific key group across three datasets"""
        
        def calculate_metrics(rows: List[Dict[str, Any]]) -> Dict[str, float]:
            if not rows:
                return {}
            
            metrics = {}
            for metric in ["rev_per_h", "duration_h", "total_actions", "allocation_efficiency_pct"]:
                values = [safe_float(row.get(metric, 0)) or 0.0 for row in rows]
                if values:
                    metrics[f"{metric}_mean"] = mean(values)
                    metrics[f"{metric}_stdev"] = stdev(values)
            
            return metrics
        
        prior_metrics = calculate_metrics(prior_rows)
        current_metrics = calculate_metrics(current_rows)
        auto_ref_metrics = calculate_metrics(auto_ref_rows)
        
        # Calculate deltas
        deltas = {}
        for metric in prior_metrics:
            base_val = prior_metrics[metric]
            current_val = current_metrics.get(metric, 0)
            auto_ref_val = auto_ref_metrics.get(metric, 0)
            
            if base_val != 0:
                deltas[f"delta_current_vs_prior_{metric}"] = ((current_val - base_val) / base_val) * 100
                deltas[f"delta_auto_vs_prior_{metric}"] = ((auto_ref_val - base_val) / base_val) * 100
                deltas[f"delta_auto_vs_current_{metric}"] = ((auto_ref_val - current_val) / current_val) * 100 if current_val != 0 else 0
        
        return {
            "key": key,
            "row_counts": {
                "prior": len(prior_rows),
                "current": len(current_rows),
                "auto_ref": len(auto_ref_rows)
            },
            "metrics": {
                "prior": prior_metrics,
                "current": current_metrics,
                "auto_ref": auto_ref_metrics
            },
            "deltas": deltas
        }
    
    def _calculate_summary_metrics(
        self, prior_data: List[Dict[str, Any]], current_data: List[Dict[str, Any]], auto_ref_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate summary metrics across all data"""
        
        def extract_metric(data: List[Dict[str, Any]], metric: str) -> List[float]:
            return [safe_float(row.get(metric, 0)) or 0.0 for row in data]
        
        summary = {}
        
        for metric in ["rev_per_h", "duration_h", "total_actions", "allocation_efficiency_pct"]:
            prior_vals = extract_metric(prior_data, metric)
            current_vals = extract_metric(current_data, metric)
            auto_ref_vals = extract_metric(auto_ref_data, metric)
            
            summary[metric] = {
                "prior": {"mean": mean(prior_vals), "stdev": stdev(prior_vals)},
                "current": {"mean": mean(current_vals), "stdev": stdev(current_vals)},
                "auto_ref": {"mean": mean(auto_ref_vals), "stdev": stdev(auto_ref_vals)}
            }
            
            # Calculate percentage changes
            prior_mean = summary[metric]["prior"]["mean"]
            if prior_mean != 0:
                current_change = ((summary[metric]["current"]["mean"] - prior_mean) / prior_mean) * 100
                auto_change = ((summary[metric]["auto_ref"]["mean"] - prior_mean) / prior_mean) * 100
                summary[metric]["percent_change"] = {
                    "current_vs_prior": current_change,
                    "auto_ref_vs_prior": auto_change,
                    "auto_ref_vs_current": ((summary[metric]["auto_ref"]["mean"] - summary[metric]["current"]["mean"]) / summary[metric]["current"]["mean"]) * 100 if summary[metric]["current"]["mean"] != 0 else 0
                }
        
        return summary
    
    def _calculate_basic_metrics(
        self, prior_data: List[Dict[str, Any]], current_data: List[Dict[str, Any]], auto_ref_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate basic metrics for fallback comparison"""
        return {
            "row_counts": {
                "prior": len(prior_data),
                "current": len(current_data),
                "auto_ref": len(auto_ref_data)
            },
            "data_quality": {
                "prior": self._assess_data_quality(prior_data),
                "current": self._assess_data_quality(current_data),
                "auto_ref": self._assess_data_quality(auto_ref_data)
            }
        }
    
    def _assess_data_quality(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess data quality metrics"""
        if not data:
            return {"complete": False, "issues": ["No data"]}
        
        issues = []
        headers = set(data[0].keys()) if data else set()
        
        # Check for required fields
        for field in KEY_FIELDS + ["ok"]:
            if field not in headers:
                issues.append(f"Missing required field: {field}")
        
        # Check for empty values
        empty_counts = {}
        for field in ["rev_per_h", "duration_h", "total_actions"]:
            if field in headers:
                empty = sum(1 for row in data if not row.get(field))
                if empty > 0:
                    empty_counts[field] = empty
        
        if empty_counts:
            issues.append(f"Empty values: {empty_counts}")
        
        return {
            "complete": len(issues) == 0,
            "issues": issues,
            "total_rows": len(data),
            "fields_present": len(headers)
        }
    
    def _generate_performance_insights(self, comparison_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate performance insights and recommendations"""
        insights = {
            "metrics": {},
            "recommendations": [],
            "performance_insights": {}
        }
        
        try:
            # Extract summary metrics if available
            summary_metrics = comparison_data.get("summary_metrics", {})
            
            if summary_metrics:
                # Analyze revenue trends
                if "rev_per_h" in summary_metrics:
                    rev_data = summary_metrics["rev_per_h"]
                    current_change = rev_data.get("percent_change", {}).get("current_vs_prior", 0)
                    auto_change = rev_data.get("percent_change", {}).get("auto_ref_vs_prior", 0)
                    
                    insights["metrics"]["revenue_trend"] = {
                        "current_vs_prior": current_change,
                        "auto_ref_vs_prior": auto_change,
                        "trend": "improving" if current_change > 0 else "declining" if current_change < 0 else "stable"
                    }
                    
                    # Generate revenue recommendations
                    if current_change < -5:
                        insights["recommendations"].append(
                            "Revenue has decreased significantly. Review configuration changes."
                        )
                    elif auto_change > current_change + 10:
                        insights["recommendations"].append(
                            "Auto-ref configuration shows significant revenue improvement. Consider adopting."
                        )
                
                # Analyze efficiency trends
                if "allocation_efficiency_pct" in summary_metrics:
                    eff_data = summary_metrics["allocation_efficiency_pct"]
                    eff_change = eff_data.get("percent_change", {}).get("current_vs_prior", 0)
                    
                    insights["metrics"]["efficiency_trend"] = {
                        "current_vs_prior": eff_change,
                        "trend": "improving" if eff_change > 0 else "declining" if eff_change < 0 else "stable"
                    }
                    
                    if eff_change < -10:
                        insights["recommendations"].append(
                            "Efficiency has degraded significantly. Investigate bottlenecks."
                        )
                
                # Analyze duration trends
                if "duration_h" in summary_metrics:
                    dur_data = summary_metrics["duration_h"]
                    dur_change = dur_data.get("percent_change", {}).get("current_vs_prior", 0)
                    
                    insights["metrics"]["duration_trend"] = {
                        "current_vs_prior": dur_change,
                        "trend": "improving" if dur_change < 0 else "declining" if dur_change > 0 else "stable"
                    }
                    
                    if dur_change > 20:
                        insights["recommendations"].append(
                            "Duration has increased significantly. Check for performance regressions."
                        )
            
            # Generate overall performance insights
            insights["performance_insights"] = {
                "overall_trend": self._determine_overall_trend(insights["metrics"]),
                "key_issues": self._identify_key_issues(comparison_data),
                "optimization_opportunities": self._identify_opportunities(comparison_data)
            }
            
            # Add general recommendations if none generated
            if not insights["recommendations"]:
                insights["recommendations"].append(
                    "Performance appears stable. Continue monitoring trends."
                )
        
        except Exception as e:
            insights["recommendations"].append(f"Insight generation error: {str(e)}")
        
        return insights
    
    def _determine_overall_trend(self, metrics: Dict[str, Any]) -> str:
        """Determine overall performance trend"""
        trends = []
        
        for metric_name, metric_data in metrics.items():
            if isinstance(metric_data, dict) and "trend" in metric_data:
                trends.append(metric_data["trend"])
        
        if not trends:
            return "unknown"
        
        improving_count = trends.count("improving")
        declining_count = trends.count("declining")
        
        if improving_count > declining_count:
            return "positive"
        elif declining_count > improving_count:
            return "negative"
        else:
            return "neutral"
    
    def _identify_key_issues(self, comparison_data: Dict[str, Any]) -> List[str]:
        """Identify key performance issues"""
        issues = []
        
        # Check for validation issues
        if "errors" in comparison_data and comparison_data["errors"]:
            issues.append("Comparison validation errors detected")
        
        # Check for significant performance degradation
        summary_metrics = comparison_data.get("summary_metrics", {})
        for metric_name, metric_data in summary_metrics.items():
            percent_change = metric_data.get("percent_change", {})
            current_change = percent_change.get("current_vs_prior", 0)
            
            if metric_name == "duration_h" and current_change > 30:
                issues.append("Significant duration increase detected")
            elif metric_name == "allocation_efficiency_pct" and current_change < -20:
                issues.append("Significant efficiency degradation detected")
            elif metric_name == "rev_per_h" and current_change < -15:
                issues.append("Significant revenue decrease detected")
        
        return issues
    
    def _identify_opportunities(self, comparison_data: Dict[str, Any]) -> List[str]:
        """Identify optimization opportunities"""
        opportunities = []
        
        summary_metrics = comparison_data.get("summary_metrics", {})
        for metric_name, metric_data in summary_metrics.items():
            percent_change = metric_data.get("percent_change", {})
            auto_change = percent_change.get("auto_ref_vs_prior", 0)
            current_change = percent_change.get("current_vs_prior", 0)
            
            # Check if auto-ref shows significant improvement
            if auto_change > current_change + 15:
                if metric_name == "rev_per_h":
                    opportunities.append("Auto-ref shows significant revenue improvement potential")
                elif metric_name == "allocation_efficiency_pct":
                    opportunities.append("Auto-ref shows significant efficiency improvement potential")
                elif metric_name == "duration_h" and auto_change < current_change - 15:
                    opportunities.append("Auto-ref shows significant duration reduction potential")
        
        return opportunities
    
    def save_comparison_results(
        self, 
        comparison_result: Dict[str, Any], 
        output_format: str = "json",
        save_path: Optional[str] = None
    ) -> str:
        """Save comparison results with enhanced formatting"""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if save_path:
            output_path = Path(save_path)
        else:
            output_path = self.goalie_dir / f"swarm_comparison_{self.run_id}_{timestamp}.{output_format}"
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        if output_format.lower() == "json":
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(comparison_result, f, indent=2, default=str)
        elif output_format.lower() == "tsv":
            self._save_as_tsv(comparison_result, output_path)
        else:
            raise ValueError(f"Unsupported output format: {output_format}")
        
        # Emit save event
        self.evidence_emitter.emit("comparison_saved", {
            "output_path": str(output_path),
            "format": output_format,
            "size_bytes": output_path.stat().st_size
        })
        
        return str(output_path)
    
    def _save_as_tsv(self, comparison_result: Dict[str, Any], output_path: Path):
        """Save comparison results as TSV format"""
        # Create a simplified TSV format for key metrics
        with open(output_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f, delimiter='\t')
            
            # Write header
            writer.writerow([
                "metric", "prior_mean", "current_mean", "auto_ref_mean",
                "current_vs_prior_pct", "auto_ref_vs_prior_pct", "trend"
            ])
            
            # Write summary metrics
            summary_metrics = comparison_result.get("comparison_data", {}).get("summary_metrics", {})
            
            for metric_name, metric_data in summary_metrics.items():
                prior_mean = metric_data.get("prior", {}).get("mean", 0)
                current_mean = metric_data.get("current", {}).get("mean", 0)
                auto_ref_mean = metric_data.get("auto_ref", {}).get("mean", 0)
                current_change = metric_data.get("percent_change", {}).get("current_vs_prior", 0)
                auto_change = metric_data.get("percent_change", {}).get("auto_ref_vs_prior", 0)
                
                # Determine trend
                if current_change > 5:
                    trend = "improving"
                elif current_change < -5:
                    trend = "declining"
                else:
                    trend = "stable"
                
                writer.writerow([
                    metric_name, prior_mean, current_mean, auto_ref_mean,
                    current_change, auto_change, trend
                ])


def main():
    """Main entry point for swarm comparison automation"""
    parser = argparse.ArgumentParser(
        description="Enhanced Swarm Comparison Automation with Auto-Discovery"
    )
    
    # Core arguments
    parser.add_argument("--project-root", help="Project root directory")
    parser.add_argument("--mode", choices=["mutate", "normal", "advisory", "enforcement"], 
                       default="normal", help="Execution mode")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    
    # Discovery arguments
    parser.add_argument("--discover", action="store_true", 
                       help="Auto-discover swarm tables in .goalie directory")
    parser.add_argument("--pattern", default="swarm_table_*.tsv",
                       help="File pattern for discovery")
    
    # Comparison arguments
    parser.add_argument("--prior", help="Prior swarm TSV file")
    parser.add_argument("--current", help="Current swarm TSV file")
    parser.add_argument("--auto-ref", help="Auto-reference swarm TSV file")
    parser.add_argument("--no-auto-discover", action="store_true",
                       help="Disable auto-discovery fallback")
    
    # Output arguments
    parser.add_argument("--out", choices=["json", "tsv"], default="json",
                       help="Output format")
    parser.add_argument("--save", help="Save output to file")
    parser.add_argument("--validate-only", action="store_true",
                       help="Only validate discovered tables")
    
    args = parser.parse_args()
    
    # Determine project root
    if args.project_root:
        project_root = args.project_root
    else:
        project_root = os.environ.get("PROJECT_ROOT", str(Path.cwd()))
    
    # Initialize automation
    automation = SwarmCompareAutomation(project_root, args.mode)
    
    if args.discover or args.validate_only:
        # Run discovery
        discovery_result = automation.auto_discover_tables(args.pattern)
        
        if args.json:
            print(json.dumps(discovery_result, indent=2, default=str))
        else:
            print(f"Discovery completed: {discovery_result['validation_summary']['total_tables']} tables found")
            print(f"Valid tables: {discovery_result['validation_summary']['valid_tables']}")
            if discovery_result['warnings']:
                print("Warnings:")
                for warning in discovery_result['warnings']:
                    print(f"  - {warning}")
            if discovery_result['errors']:
                print("Errors:")
                for error in discovery_result['errors']:
                    print(f"  - {error}")
        
        if args.validate_only:
            return 0
    
    # Run comparison
    comparison_result = automation.run_three_way_comparison(
        prior_table=args.prior,
        current_table=args.current,
        auto_ref_table=args.auto_ref,
        auto_discover=not args.no_auto_discover
    )
    
    # Handle output
    if args.json:
        print(json.dumps(comparison_result, indent=2, default=str))
    else:
        if comparison_result.get("errors"):
            print("Comparison completed with errors:")
            for error in comparison_result["errors"]:
                print(f"  - {error}")
        else:
            print("✅ Comparison completed successfully")
        
        if comparison_result.get("recommendations"):
            print("\nRecommendations:")
            for rec in comparison_result["recommendations"]:
                print(f"  - {rec}")
    
    # Save results if requested
    if args.save or not args.json:
        output_path = automation.save_comparison_results(
            comparison_result, 
            args.out, 
            args.save
        )
        if args.verbose:
            print(f"Results saved to: {output_path}")
    
    # Exit with error code if comparison failed
    if comparison_result.get("errors"):
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())