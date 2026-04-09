#!/usr/bin/env python3
"""
Correlation Analysis Tool for 72-hour Pattern Metrics
Analyzes patterns, metrics, and relationships over the past 72 hours with JSON output functionality
"""

import sys
import os
import json
import argparse
import statistics
import math
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Set
from pathlib import Path
from collections import defaultdict, Counter
import re

# Add investing/agentic-flow/scripts directory to Python path
script_dir = Path(__file__).parent
investing_scripts_dir = script_dir.parent.parent / "investing" / "agentic-flow" / "scripts"
sys.path.insert(0, str(investing_scripts_dir))

# Try to import existing modules
try:
    from agentic.pattern_logger import PatternLogger
    PATTERN_LOGGER_AVAILABLE = True
except ImportError:
    PATTERN_LOGGER_AVAILABLE = False


class CorrelationAnalysis:
    """Main correlation analysis class for 72-hour pattern metrics"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.goalie_dir = project_root / ".goalie"
        self.pattern_metrics_file = self.goalie_dir / "pattern_metrics.jsonl"
        self.economics_dir = project_root / "agentic-flow-core" / "src" / "economics"
        self.wsjf_dir = project_root / "agentic-flow-core" / "src" / "wsjf"
        
        # Analysis time window (72 hours)
        self.time_window_hours = 72
        self.now = datetime.now()
        
        # Data storage
        self.pattern_metrics = []
        self.economic_metrics = []
        self.wsjf_data = []
        
        # Analysis results
        self.correlation_results = {}
        self.trend_analysis = {}
        self.co_occurrence_data = {}
        self.lead_lag_relationships = {}
        self.anomalies = []
        self.insights = []
        
    def load_data(self) -> bool:
        """Load all required data sources"""
        success = True
        
        # Load pattern metrics
        if not self._load_pattern_metrics():
            success = False
            
        # Load economic metrics if available
        self._load_economic_metrics()
        
        # Load WSJF data if available
        self._load_wsjf_data()
        
        return success
    
    def _load_pattern_metrics(self) -> bool:
        """Load pattern metrics from JSONL file"""
        if not self.pattern_metrics_file.exists():
            print(f"Warning: Pattern metrics file not found: {self.pattern_metrics_file}")
            return False
            
        try:
            with open(self.pattern_metrics_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            entry = json.loads(line)
                            # Normalize timestamp field names
                            if 'timestamp' in entry:
                                entry['normalized_timestamp'] = entry['timestamp']
                            elif 'ts' in entry:
                                entry['normalized_timestamp'] = entry['ts']
                            else:
                                continue
                                
                            self.pattern_metrics.append(entry)
                        except json.JSONDecodeError:
                            continue
                            
            print(f"Loaded {len(self.pattern_metrics)} pattern metrics entries")
            return True
            
        except Exception as e:
            print(f"Error loading pattern metrics: {e}")
            return False
    
    def _load_economic_metrics(self):
        """Load economic metrics from various sources"""
        # Try to load from economic tracker files
        economic_files = [
            self.economics_dir / "economic-tracker.ts",
            self.economics_dir / "types.ts"
        ]
        
        for file_path in economic_files:
            if file_path.exists():
                try:
                    # For now, we'll create mock economic data based on pattern metrics
                    # In a real implementation, this would parse the actual economic files
                    pass
                except Exception as e:
                    print(f"Warning: Could not load economic metrics from {file_path}: {e}")
    
    def _load_wsjf_data(self):
        """Load WSJF scoring data"""
        # Try to load from WSJF files
        wsjf_files = [
            self.wsjf_dir / "calculator.ts",
            self.wsjf_dir / "types.ts"
        ]
        
        for file_path in wsjf_files:
            if file_path.exists():
                try:
                    # For now, we'll extract WSJF data from pattern metrics
                    # In a real implementation, this would parse the actual WSJF files
                    pass
                except Exception as e:
                    print(f"Warning: Could not load WSJF data from {file_path}: {e}")
    
    def filter_data_by_time_window(self, data: List[Dict], hours: int = 72) -> List[Dict]:
        """Filter data to include only entries within the specified time window"""
        cutoff_time = self.now - timedelta(hours=hours)
        filtered_data = []
        
        for entry in data:
            timestamp_str = entry.get('normalized_timestamp', '')
            if not timestamp_str:
                continue
                
            try:
                # Handle different timestamp formats
                if 'T' in timestamp_str:
                    if '.' in timestamp_str:
                        timestamp = datetime.strptime(timestamp_str.split('.')[0], '%Y-%m-%dT%H:%M:%S')
                    else:
                        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%dT%H:%M:%S')
                else:
                    timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                    
                if timestamp >= cutoff_time:
                    entry['parsed_timestamp'] = timestamp
                    filtered_data.append(entry)
                    
            except ValueError:
                continue
                
        return filtered_data
    
    def calculate_pearson_correlation(self, x: List[float], y: List[float]) -> Tuple[float, float]:
        """Calculate Pearson correlation coefficient and p-value"""
        if len(x) != len(y) or len(x) < 2:
            return 0.0, 1.0
            
        n = len(x)
        mean_x = statistics.mean(x)
        mean_y = statistics.mean(y)
        
        # Calculate covariance and standard deviations
        covariance = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
        std_x = math.sqrt(sum((x[i] - mean_x) ** 2 for i in range(n)))
        std_y = math.sqrt(sum((y[i] - mean_y) ** 2 for i in range(n)))
        
        if std_x == 0 or std_y == 0:
            return 0.0, 1.0
            
        correlation = covariance / (std_x * std_y)
        
        # Calculate t-statistic and p-value (simplified)
        if abs(correlation) == 1.0:
            p_value = 0.0
        else:
            t_stat = correlation * math.sqrt((n - 2) / (1 - correlation ** 2))
            # Simplified p-value calculation (would normally use t-distribution)
            p_value = 2 * (1 - self._t_cdf(abs(t_stat), n - 2))
            
        return correlation, p_value
    
    def calculate_spearman_correlation(self, x: List[float], y: List[float]) -> Tuple[float, float]:
        """Calculate Spearman rank correlation coefficient and p-value"""
        if len(x) != len(y) or len(x) < 2:
            return 0.0, 1.0
            
        # Get ranks
        rank_x = self._get_ranks(x)
        rank_y = self._get_ranks(y)
        
        # Calculate Pearson correlation on ranks
        return self.calculate_pearson_correlation(rank_x, rank_y)
    
    def _get_ranks(self, values: List[float]) -> List[float]:
        """Get ranks for a list of values"""
        sorted_values = sorted(enumerate(values), key=lambda x: x[1])
        ranks = [0] * len(values)
        
        for rank, (original_index, value) in enumerate(sorted_values):
            ranks[original_index] = rank + 1
            
        return ranks
    
    def _t_cdf(self, t: float, df: int) -> float:
        """Simplified t-distribution CDF (would normally use scipy.stats)"""
        # This is a simplified approximation
        if df <= 0:
            return 0.5
            
        # For large degrees of freedom, approximate with normal distribution
        if df > 30:
            return 0.5 * (1 + math.erf(t / math.sqrt(2)))
        
        # For smaller df, use a rough approximation
        return 0.5 + 0.5 * math.tanh(t * math.sqrt(df / (df - 2)))
    
    def analyze_pattern_correlations(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze correlations between different patterns"""
        correlations = {}
        
        # Extract numeric metrics
        patterns_by_name = defaultdict(list)
        
        for entry in data:
            pattern_name = entry.get('pattern', '')
            if not pattern_name:
                continue
                
            # Extract WSJF scores
            if 'economic' in entry and isinstance(entry['economic'], dict):
                wsjf_score = entry['economic'].get('wsjf_score', 0)
                patterns_by_name[pattern_name].append(wsjf_score)
            elif 'wsjf_score' in entry:
                patterns_by_name[pattern_name].append(entry['wsjf_score'])
        
        # Calculate correlations between pattern pairs
        pattern_names = list(patterns_by_name.keys())
        
        for i, pattern1 in enumerate(pattern_names):
            for j, pattern2 in enumerate(pattern_names[i+1:], i+1):
                values1 = patterns_by_name[pattern1]
                values2 = patterns_by_name[pattern2]
                
                if len(values1) >= 2 and len(values2) >= 2:
                    # Align data by time if possible
                    aligned_data = self._align_time_series(data, pattern1, pattern2)
                    if aligned_data:
                        x_values, y_values = zip(*aligned_data)
                        
                        pearson_corr, pearson_p = self.calculate_pearson_correlation(list(x_values), list(y_values))
                        spearman_corr, spearman_p = self.calculate_spearman_correlation(list(x_values), list(y_values))
                        
                        correlation_key = f"{pattern1}_vs_{pattern2}"
                        correlations[correlation_key] = {
                            'pattern1': pattern1,
                            'pattern2': pattern2,
                            'pearson_correlation': pearson_corr,
                            'pearson_p_value': pearson_p,
                            'spearman_correlation': spearman_corr,
                            'spearman_p_value': spearman_p,
                            'sample_size': len(aligned_data),
                            'significant': pearson_p < 0.05 or spearman_p < 0.05
                        }
        
        return correlations
    
    def _align_time_series(self, data: List[Dict], pattern1: str, pattern2: str) -> List[Tuple[float, float]]:
        """Align time series data for two patterns"""
        pattern1_data = []
        pattern2_data = []
        
        for entry in data:
            if entry.get('pattern') == pattern1:
                value = self._extract_numeric_value(entry)
                if value is not None:
                    pattern1_data.append((entry.get('parsed_timestamp'), value))
            elif entry.get('pattern') == pattern2:
                value = self._extract_numeric_value(entry)
                if value is not None:
                    pattern2_data.append((entry.get('parsed_timestamp'), value))
        
        # Sort by timestamp
        pattern1_data.sort()
        pattern2_data.sort()
        
        # Find overlapping time periods
        aligned_data = []
        i = j = 0
        
        while i < len(pattern1_data) and j < len(pattern2_data):
            time1, value1 = pattern1_data[i]
            time2, value2 = pattern2_data[j]
            
            # If timestamps are close (within 1 hour), align them
            if abs((time1 - time2).total_seconds()) < 3600:
                aligned_data.append((value1, value2))
                i += 1
                j += 1
            elif time1 < time2:
                i += 1
            else:
                j += 1
                
        return aligned_data
    
    def _extract_numeric_value(self, entry: Dict) -> Optional[float]:
        """Extract numeric value from pattern entry"""
        # Try WSJF score first
        if 'economic' in entry and isinstance(entry['economic'], dict):
            wsjf_score = entry['economic'].get('wsjf_score')
            if wsjf_score is not None:
                return float(wsjf_score)
        
        if 'wsjf_score' in entry:
            return float(entry['wsjf_score'])
        
        # Try other numeric fields
        for field in ['cost_of_delay', 'user_business_value', 'job_duration']:
            if 'economic' in entry and isinstance(entry['economic'], dict):
                value = entry['economic'].get(field)
                if value is not None:
                    return float(value)
            elif field in entry:
                return float(entry[field])
        
        return None
    
    def analyze_temporal_trends(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze temporal trends in the data"""
        trends = {}
        
        # Group data by pattern
        patterns_by_name = defaultdict(list)
        
        for entry in data:
            pattern_name = entry.get('pattern', '')
            if pattern_name and 'parsed_timestamp' in entry:
                value = self._extract_numeric_value(entry)
                if value is not None:
                    patterns_by_name[pattern_name].append((entry['parsed_timestamp'], value))
        
        # Analyze trends for each pattern
        for pattern_name, time_series in patterns_by_name.items():
            if len(time_series) < 3:
                continue
                
            # Sort by timestamp
            time_series.sort()
            timestamps, values = zip(*time_series)
            
            # Convert timestamps to numeric values (hours since start)
            start_time = timestamps[0]
            numeric_times = [(t - start_time).total_seconds() / 3600 for t in timestamps]
            
            # Calculate linear trend
            trend_slope, trend_intercept, r_squared = self._calculate_linear_trend(numeric_times, list(values))
            
            # Detect trend direction
            if abs(trend_slope) < 0.01:
                trend_direction = "stable"
            elif trend_slope > 0:
                trend_direction = "increasing"
            else:
                trend_direction = "decreasing"
            
            # Calculate volatility
            volatility = statistics.stdev(values) if len(values) > 1 else 0
            
            trends[pattern_name] = {
                'trend_slope': trend_slope,
                'trend_intercept': trend_intercept,
                'r_squared': r_squared,
                'trend_direction': trend_direction,
                'volatility': volatility,
                'data_points': len(time_series),
                'time_span_hours': (timestamps[-1] - timestamps[0]).total_seconds() / 3600
            }
        
        return trends
    
    def _calculate_linear_trend(self, x: List[float], y: List[float]) -> Tuple[float, float, float]:
        """Calculate linear trend (slope, intercept, R-squared)"""
        if len(x) != len(y) or len(x) < 2:
            return 0.0, 0.0, 0.0
            
        n = len(x)
        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(x[i] * y[i] for i in range(n))
        sum_x2 = sum(x[i] ** 2 for i in range(n))
        sum_y2 = sum(y[i] ** 2 for i in range(n))
        
        # Calculate slope and intercept
        denominator = n * sum_x2 - sum_x ** 2
        if denominator == 0:
            return 0.0, statistics.mean(y), 0.0
            
        slope = (n * sum_xy - sum_x * sum_y) / denominator
        intercept = (sum_y - slope * sum_x) / n
        
        # Calculate R-squared
        y_mean = statistics.mean(y)
        ss_tot = sum((y[i] - y_mean) ** 2 for i in range(n))
        ss_res = sum((y[i] - (slope * x[i] + intercept)) ** 2 for i in range(n))
        
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        
        return slope, intercept, r_squared
    
    def analyze_pattern_co_occurrence(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze pattern co-occurrence within time windows"""
        co_occurrence = defaultdict(lambda: defaultdict(int))
        pattern_counts = Counter()
        
        # Group entries by time windows (1-hour windows)
        time_windows = defaultdict(list)
        
        for entry in data:
            if 'parsed_timestamp' not in entry:
                continue
                
            pattern = entry.get('pattern', '')
            if not pattern:
                continue
                
            # Round timestamp to nearest hour
            timestamp = entry['parsed_timestamp']
            window_key = timestamp.replace(minute=0, second=0, microsecond=0)
            
            time_windows[window_key].append(pattern)
            pattern_counts[pattern] += 1
        
        # Calculate co-occurrence matrix
        for window_patterns in time_windows.values():
            unique_patterns = list(set(window_patterns))
            
            for i, pattern1 in enumerate(unique_patterns):
                for j, pattern2 in enumerate(unique_patterns[i+1:], i+1):
                    co_occurrence[pattern1][pattern2] += 1
                    co_occurrence[pattern2][pattern1] += 1
        
        # Calculate co-occurrence probabilities
        co_occurrence_probs = {}
        total_windows = len(time_windows)
        
        for pattern1 in co_occurrence:
            co_occurrence_probs[pattern1] = {}
            for pattern2 in co_occurrence[pattern1]:
                # Probability of pattern2 given pattern1
                prob = co_occurrence[pattern1][pattern2] / pattern_counts[pattern1]
                co_occurrence_probs[pattern1][pattern2] = {
                    'count': co_occurrence[pattern1][pattern2],
                    'probability': prob,
                    'joint_probability': co_occurrence[pattern1][pattern2] / total_windows
                }
        
        return {
            'co_occurrence_matrix': dict(co_occurrence_probs),
            'pattern_counts': dict(pattern_counts),
            'total_time_windows': total_windows
        }
    
    def detect_lead_lag_relationships(self, data: List[Dict]) -> Dict[str, Any]:
        """Detect lead-lag relationships between patterns"""
        lead_lag = {}
        
        # Group data by pattern
        patterns_by_name = defaultdict(list)
        
        for entry in data:
            pattern_name = entry.get('pattern', '')
            if pattern_name and 'parsed_timestamp' in entry:
                value = self._extract_numeric_value(entry)
                if value is not None:
                    patterns_by_name[pattern_name].append((entry['parsed_timestamp'], value))
        
        # Sort time series for each pattern
        for pattern_name in patterns_by_name:
            patterns_by_name[pattern_name].sort()
        
        pattern_names = list(patterns_by_name.keys())
        
        # Test lead-lag relationships for each pair
        for i, pattern1 in enumerate(pattern_names):
            for j, pattern2 in enumerate(pattern_names):
                if i == j:
                    continue
                    
                series1 = patterns_by_name[pattern1]
                series2 = patterns_by_name[pattern2]
                
                if len(series1) < 3 or len(series2) < 3:
                    continue
                
                # Test different lag values (0 to 12 hours)
                best_correlation = 0
                best_lag = 0
                best_p_value = 1.0
                
                for lag_hours in range(0, 13):
                    correlation, p_value = self._calculate_lagged_correlation(series1, series2, lag_hours)
                    
                    if abs(correlation) > abs(best_correlation) or (
                        abs(correlation) == abs(best_correlation) and p_value < best_p_value
                    ):
                        best_correlation = correlation
                        best_lag = lag_hours
                        best_p_value = p_value
                
                if best_lag > 0 and best_p_value < 0.1:  # Only include significant relationships
                    relationship_key = f"{pattern1}_leads_{pattern2}"
                    lead_lag[relationship_key] = {
                        'leader_pattern': pattern1,
                        'follower_pattern': pattern2,
                        'lag_hours': best_lag,
                        'correlation': best_correlation,
                        'p_value': best_p_value,
                        'significant': best_p_value < 0.05
                    }
        
        return lead_lag
    
    def _calculate_lagged_correlation(self, series1: List[Tuple[datetime, float]], 
                                   series2: List[Tuple[datetime, float]], 
                                   lag_hours: int) -> Tuple[float, float]:
        """Calculate correlation between series1 and lagged series2"""
        if lag_hours == 0:
            aligned_data = self._align_time_series(
                [{'pattern': '', 'parsed_timestamp': t[0], 'economic': {'wsjf_score': t[1]}} for t in series1],
                '', ''
            )
            # For zero lag, use direct alignment
            aligned_data = []
            i = j = 0
            while i < len(series1) and j < len(series2):
                time1, value1 = series1[i]
                time2, value2 = series2[j]
                
                if abs((time1 - time2).total_seconds()) < 3600:
                    aligned_data.append((value1, value2))
                    i += 1
                    j += 1
                elif time1 < time2:
                    i += 1
                else:
                    j += 1
        else:
            # Apply lag to series2
            lagged_series2 = []
            lag_delta = timedelta(hours=lag_hours)
            
            for timestamp, value in series2:
                lagged_timestamp = timestamp + lag_delta
                lagged_series2.append((lagged_timestamp, value))
            
            # Align series1 with lagged series2
            aligned_data = []
            i = j = 0
            while i < len(series1) and j < len(lagged_series2):
                time1, value1 = series1[i]
                time2, value2 = lagged_series2[j]
                
                if abs((time1 - time2).total_seconds()) < 3600:
                    aligned_data.append((value1, value2))
                    i += 1
                    j += 1
                elif time1 < time2:
                    i += 1
                else:
                    j += 1
        
        if len(aligned_data) < 2:
            return 0.0, 1.0
        
        x_values, y_values = zip(*aligned_data)
        return self.calculate_pearson_correlation(list(x_values), list(y_values))
    
    def detect_correlation_anomalies(self, correlations: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect anomalies in correlation patterns"""
        anomalies = []
        
        if not correlations:
            return anomalies
        
        # Extract correlation values
        correlation_values = []
        for key, corr_data in correlations.items():
            if isinstance(corr_data, dict) and 'pearson_correlation' in corr_data:
                correlation_values.append(abs(corr_data['pearson_correlation']))
        
        if not correlation_values:
            return anomalies
        
        # Calculate statistics
        mean_corr = statistics.mean(correlation_values)
        std_corr = statistics.stdev(correlation_values) if len(correlation_values) > 1 else 0
        
        # Identify anomalies (correlations > 2 standard deviations from mean)
        threshold = mean_corr + 2 * std_corr
        
        for key, corr_data in correlations.items():
            if isinstance(corr_data, dict) and 'pearson_correlation' in corr_data:
                corr_value = abs(corr_data['pearson_correlation'])
                
                if corr_value > threshold:
                    anomalies.append({
                        'type': 'high_correlation',
                        'correlation_key': key,
                        'correlation_value': corr_value,
                        'threshold': threshold,
                        'pattern1': corr_data.get('pattern1', ''),
                        'pattern2': corr_data.get('pattern2', ''),
                        'p_value': corr_data.get('pearson_p_value', 1.0),
                        'severity': 'high' if corr_value > mean_corr + 3 * std_corr else 'medium'
                    })
        
        return anomalies
    
    def generate_insights(self, correlations: Dict[str, Any], trends: Dict[str, Any], 
                        co_occurrence: Dict[str, Any], lead_lag: Dict[str, Any],
                        anomalies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate automated insights and recommendations"""
        insights = []
        
        # Insight 1: Strong correlations
        strong_correlations = [
            (key, data) for key, data in correlations.items()
            if isinstance(data, dict) and data.get('significant', False) and abs(data.get('pearson_correlation', 0)) > 0.7
        ]
        
        if strong_correlations:
            insights.append({
                'type': 'strong_correlations',
                'title': 'Strong Pattern Correlations Detected',
                'description': f"Found {len(strong_correlations)} strong correlations between patterns",
                'details': strong_correlations[:5],  # Top 5
                'recommendation': 'Investigate these patterns for potential optimization opportunities'
            })
        
        # Insight 2: Trending patterns
        increasing_patterns = [
            (pattern, data) for pattern, data in trends.items()
            if data.get('trend_direction') == 'increasing' and data.get('r_squared', 0) > 0.5
        ]
        
        if increasing_patterns:
            insights.append({
                'type': 'increasing_trends',
                'title': 'Patterns with Increasing Trends',
                'description': f"Found {len(increasing_patterns)} patterns with significant increasing trends",
                'details': increasing_patterns[:5],  # Top 5
                'recommendation': 'Monitor these patterns for capacity planning'
            })
        
        # Insight 3: Lead-lag relationships
        significant_lead_lag = [
            (key, data) for key, data in lead_lag.items()
            if isinstance(data, dict) and data.get('significant', False)
        ]
        
        if significant_lead_lag:
            insights.append({
                'type': 'lead_lag_relationships',
                'title': 'Significant Lead-Lag Relationships',
                'description': f"Found {len(significant_lead_lag)} significant lead-lag relationships",
                'details': significant_lead_lag[:5],  # Top 5
                'recommendation': 'Use these relationships for predictive planning'
            })
        
        # Insight 4: Anomalies
        if anomalies:
            insights.append({
                'type': 'correlation_anomalies',
                'title': 'Correlation Anomalies Detected',
                'description': f"Found {len(anomalies)} correlation anomalies",
                'details': anomalies,
                'recommendation': 'Investigate anomalous correlations for potential issues or opportunities'
            })
        
        # Insight 5: High co-occurrence patterns
        if 'co_occurrence_matrix' in co_occurrence:
            high_co_occurrence = []
            for pattern1, pattern_data in co_occurrence['co_occurrence_matrix'].items():
                for pattern2, co_data in pattern_data.items():
                    if co_data.get('probability', 0) > 0.7:  # High co-occurrence probability
                        high_co_occurrence.append({
                            'pattern1': pattern1,
                            'pattern2': pattern2,
                            'probability': co_data['probability']
                        })
            
            if high_co_occurrence:
                insights.append({
                    'type': 'high_co_occurrence',
                    'title': 'High Co-occurrence Patterns',
                    'description': f"Found {len(high_co_occurrence)} pattern pairs with high co-occurrence",
                    'details': high_co_occurrence[:5],  # Top 5
                    'recommendation': 'Consider batching or coordinating these patterns'
                })
        
        return insights
    
    def generate_visualization_data(self, correlations: Dict[str, Any], trends: Dict[str, Any],
                                 co_occurrence: Dict[str, Any], lead_lag: Dict[str, Any]) -> Dict[str, Any]:
        """Generate data for visualization"""
        viz_data = {
            'correlation_heatmap': [],
            'trend_charts': [],
            'co_occurrence_network': [],
            'lead_lag_diagram': []
        }
        
        # Correlation heatmap data
        patterns = set()
        for key, data in correlations.items():
            if isinstance(data, dict):
                patterns.add(data.get('pattern1', ''))
                patterns.add(data.get('pattern2', ''))
        
        patterns = list(patterns)
        correlation_matrix = [[0.0] * len(patterns) for _ in range(len(patterns))]
        
        for i, pattern1 in enumerate(patterns):
            for j, pattern2 in enumerate(patterns):
                if i == j:
                    correlation_matrix[i][j] = 1.0
                else:
                    # Find correlation data
                    for key, data in correlations.items():
                        if isinstance(data, dict):
                            if (data.get('pattern1') == pattern1 and data.get('pattern2') == pattern2) or \
                               (data.get('pattern1') == pattern2 and data.get('pattern2') == pattern1):
                                correlation_matrix[i][j] = data.get('pearson_correlation', 0)
                                break
        
        viz_data['correlation_heatmap'] = {
            'patterns': patterns,
            'matrix': correlation_matrix
        }
        
        # Trend charts data
        for pattern, trend_data in trends.items():
            viz_data['trend_charts'].append({
                'pattern': pattern,
                'trend_slope': trend_data.get('trend_slope', 0),
                'trend_direction': trend_data.get('trend_direction', 'stable'),
                'r_squared': trend_data.get('r_squared', 0),
                'volatility': trend_data.get('volatility', 0)
            })
        
        # Co-occurrence network data
        if 'co_occurrence_matrix' in co_occurrence:
            nodes = []
            edges = []
            
            for pattern1, pattern_data in co_occurrence['co_occurrence_matrix'].items():
                for pattern2, co_data in pattern_data.items():
                    if co_data.get('probability', 0) > 0.3:  # Only include significant connections
                        edges.append({
                            'source': pattern1,
                            'target': pattern2,
                            'weight': co_data['probability'],
                            'count': co_data['count']
                        })
            
            # Get unique nodes
            all_patterns = set()
            for edge in edges:
                all_patterns.add(edge['source'])
                all_patterns.add(edge['target'])
            
            for pattern in all_patterns:
                nodes.append({'id': pattern, 'label': pattern})
            
            viz_data['co_occurrence_network'] = {
                'nodes': nodes,
                'edges': edges
            }
        
        # Lead-lag diagram data
        for key, data in lead_lag.items():
            if isinstance(data, dict) and data.get('significant', False):
                viz_data['lead_lag_diagram'].append({
                    'leader': data.get('leader_pattern', ''),
                    'follower': data.get('follower_pattern', ''),
                    'lag_hours': data.get('lag_hours', 0),
                    'correlation': data.get('correlation', 0)
                })
        
        return viz_data
    
    def run_analysis(self, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Run complete correlation analysis"""
        print("Starting correlation analysis...")
        
        # Load data
        if not self.load_data():
            return {'error': 'Failed to load required data'}
        
        # Filter data by time window
        filtered_data = self.filter_data_by_time_window(self.pattern_metrics, self.time_window_hours)
        print(f"Analyzing {len(filtered_data)} entries from past {self.time_window_hours} hours")
        
        # Apply additional filters
        if filters:
            filtered_data = self._apply_filters(filtered_data, filters)
        
        if len(filtered_data) < 2:
            return {'error': 'Insufficient data for analysis'}
        
        # Run analyses
        print("Analyzing pattern correlations...")
        self.correlation_results = self.analyze_pattern_correlations(filtered_data)
        
        print("Analyzing temporal trends...")
        self.trend_analysis = self.analyze_temporal_trends(filtered_data)
        
        print("Analyzing pattern co-occurrence...")
        self.co_occurrence_data = self.analyze_pattern_co_occurrence(filtered_data)
        
        print("Detecting lead-lag relationships...")
        self.lead_lag_relationships = self.detect_lead_lag_relationships(filtered_data)
        
        print("Detecting correlation anomalies...")
        self.anomalies = self.detect_correlation_anomalies(self.correlation_results)
        
        print("Generating insights...")
        self.insights = self.generate_insights(
            self.correlation_results, self.trend_analysis,
            self.co_occurrence_data, self.lead_lag_relationships, self.anomalies
        )
        
        print("Generating visualization data...")
        viz_data = self.generate_visualization_data(
            self.correlation_results, self.trend_analysis,
            self.co_occurrence_data, self.lead_lag_relationships
        )
        
        # Compile results
        results = {
            'metadata': {
                'analysis_timestamp': self.now.isoformat(),
                'time_window_hours': self.time_window_hours,
                'data_points_analyzed': len(filtered_data),
                'filters_applied': filters or {}
            },
            'correlations': self.correlation_results,
            'trends': self.trend_analysis,
            'co_occurrence': self.co_occurrence_data,
            'lead_lag_relationships': self.lead_lag_relationships,
            'anomalies': self.anomalies,
            'insights': self.insights,
            'visualization_data': viz_data,
            'summary': {
                'total_correlations': len(self.correlation_results),
                'significant_correlations': len([c for c in self.correlation_results.values() 
                                            if isinstance(c, dict) and c.get('significant', False)]),
                'patterns_with_trends': len(self.trend_analysis),
                'lead_lag_relationships': len(self.lead_lag_relationships),
                'anomalies_detected': len(self.anomalies),
                'insights_generated': len(self.insights)
            }
        }
        
        print("Analysis complete!")
        return results
    
    def _apply_filters(self, data: List[Dict], filters: Dict[str, Any]) -> List[Dict]:
        """Apply filters to the data"""
        filtered_data = data.copy()
        
        # Filter by circle
        if 'circle' in filters:
            circle_filter = filters['circle']
            if isinstance(circle_filter, str):
                circle_filter = [circle_filter]
            filtered_data = [entry for entry in filtered_data 
                           if entry.get('circle') in circle_filter]
        
        # Filter by pattern type
        if 'pattern_type' in filters:
            pattern_type_filter = filters['pattern_type']
            if isinstance(pattern_type_filter, str):
                pattern_type_filter = [pattern_type_filter]
            filtered_data = [entry for entry in filtered_data 
                           if entry.get('run_kind') in pattern_type_filter]
        
        # Filter by pattern names
        if 'patterns' in filters:
            pattern_filter = filters['patterns']
            if isinstance(pattern_filter, str):
                pattern_filter = [pattern_filter]
            filtered_data = [entry for entry in filtered_data 
                           if entry.get('pattern') in pattern_filter]
        
        # Filter by time range
        if 'start_time' in filters:
            start_time = filters['start_time']
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            filtered_data = [entry for entry in filtered_data 
                           if entry.get('parsed_timestamp') >= start_time]
        
        if 'end_time' in filters:
            end_time = filters['end_time']
            if isinstance(end_time, str):
                end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            filtered_data = [entry for entry in filtered_data 
                           if entry.get('parsed_timestamp') <= end_time]
        
        return filtered_data


def main():
    """Main entry point for correlation analysis"""
    parser = argparse.ArgumentParser(
        description="Correlation Analysis for 72-hour Pattern Metrics",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run basic analysis
  python3 correlation_analysis.py
  
  # Run with filters
  python3 correlation_analysis.py --circle ui,core --pattern-type feature
  
  # Output to file
  python3 correlation_analysis.py --output results.json
  
  # Include visualization data
  python3 correlation_analysis.py --include-viz --output results.json
        """
    )
    
    parser.add_argument('--circle', help='Filter by circle(s) (comma-separated)')
    parser.add_argument('--pattern-type', help='Filter by pattern type(s) (comma-separated)')
    parser.add_argument('--patterns', help='Filter by pattern names (comma-separated)')
    parser.add_argument('--start-time', help='Start time (ISO format)')
    parser.add_argument('--end-time', help='End time (ISO format)')
    parser.add_argument('--time-window', type=int, default=72, 
                       help='Time window in hours (default: 72)')
    parser.add_argument('--output', help='Output file path (JSON format)')
    parser.add_argument('--include-viz', action='store_true', 
                       help='Include visualization data in output')
    parser.add_argument('--json', action='store_true', 
                       help='Output JSON format to stdout')
    
    args = parser.parse_args()
    
    # Get project root
    project_root = Path(os.environ.get("PROJECT_ROOT", Path.cwd()))
    
    # Build filters
    filters = {}
    if args.circle:
        filters['circle'] = [c.strip() for c in args.circle.split(',')]
    if args.pattern_type:
        filters['pattern_type'] = [p.strip() for p in args.pattern_type.split(',')]
    if args.patterns:
        filters['patterns'] = [p.strip() for p in args.patterns.split(',')]
    if args.start_time:
        filters['start_time'] = args.start_time
    if args.end_time:
        filters['end_time'] = args.end_time
    
    # Run analysis
    analyzer = CorrelationAnalysis(project_root)
    analyzer.time_window_hours = args.time_window
    
    results = analyzer.run_analysis(filters)
    
    # Remove visualization data if not requested
    if not args.include_viz and 'visualization_data' in results:
        del results['visualization_data']
    
    # Output results
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"Results saved to {args.output}")
    elif args.json:
        print(json.dumps(results, indent=2, default=str))
    else:
        # Human-readable output
        print("\n" + "="*60)
        print("CORRELATION ANALYSIS RESULTS")
        print("="*60)
        
        if 'error' in results:
            print(f"Error: {results['error']}")
            return 1
        
        metadata = results.get('metadata', {})
        print(f"Analysis Time: {metadata.get('analysis_timestamp', 'Unknown')}")
        print(f"Time Window: {metadata.get('time_window_hours', 72)} hours")
        print(f"Data Points: {metadata.get('data_points_analyzed', 0)}")
        
        summary = results.get('summary', {})
        print(f"\nSUMMARY:")
        print(f"  Total Correlations: {summary.get('total_correlations', 0)}")
        print(f"  Significant Correlations: {summary.get('significant_correlations', 0)}")
        print(f"  Patterns with Trends: {summary.get('patterns_with_trends', 0)}")
        print(f"  Lead-Lag Relationships: {summary.get('lead_lag_relationships', 0)}")
        print(f"  Anomalies Detected: {summary.get('anomalies_detected', 0)}")
        print(f"  Insights Generated: {summary.get('insights_generated', 0)}")
        
        # Show top insights
        insights = results.get('insights', [])
        if insights:
            print(f"\nTOP INSIGHTS:")
            for i, insight in enumerate(insights[:3], 1):
                print(f"  {i}. {insight.get('title', 'Unknown')}")
                print(f"     {insight.get('description', 'No description')}")
                print(f"     Recommendation: {insight.get('recommendation', 'No recommendation')}")
                print()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())