#!/usr/bin/env python3
"""
WSJF (Weighted Shortest Job First) Adjuster for Pattern Analysis

This module provides WSJF enrichment capabilities for pattern analysis,
including code-fix-proposal pattern detection and 72-hour correlation analysis.
"""

import json
import os
import re
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
from collections import defaultdict
import statistics
import math

# Add the parent directory to the path to import existing modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from cmd_wsjf import calculate_wsjf, get_wsjf_config
    from cmd_pattern_stats import get_pattern_metrics, analyze_patterns
except ImportError:
    print("Warning: Could not import existing modules. Using fallback implementations.")
    
    def calculate_wsjf(user_business_value, time_criticality, risk_reduction, job_size):
        """Fallback WSJF calculation"""
        if job_size == 0:
            return 0
        return (user_business_value + time_criticality + risk_reduction) / job_size
    
    def get_wsjf_config():
        """Fallback WSJF config"""
        return {
            'user_business_value_weight': 1.0,
            'time_criticality_weight': 1.0,
            'risk_reduction_weight': 1.0,
            'job_size_weight': 1.0
        }
    
    def get_pattern_metrics():
        """Fallback pattern metrics"""
        return []
    
    def analyze_patterns(patterns):
        """Fallback pattern analysis"""
        return {}

class WSJFEnricher:
    """WSJF enrichment engine for pattern analysis"""
    
    def __init__(self, config_path: Optional[str] = None):
        """Initialize the WSJF enricher with configuration"""
        self.config = get_wsjf_config()
        self.pattern_multipliers = self._load_pattern_multipliers(config_path)
        self.code_fix_patterns = self._load_code_fix_patterns(config_path)
        
    def _load_pattern_multipliers(self, config_path: Optional[str]) -> Dict[str, float]:
        """Load pattern-specific WSJF multipliers"""
        default_multipliers = {
            'code-fix': 1.5,           # Higher priority for code fixes
            'bug-fix': 1.3,            # High priority for bug fixes
            'performance-optimization': 1.2,  # Medium-high for performance
            'security-fix': 1.8,       # Highest priority for security
            'feature-addition': 1.0,    # Standard priority for features
            'refactoring': 0.9,        # Lower priority for refactoring
            'documentation': 0.7,      # Lowest priority for documentation
            'testing': 0.8,            # Low-medium priority for testing
            'code-review': 0.6         # Low priority for code review
        }
        
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    custom_config = json.load(f)
                    if 'pattern_multipliers' in custom_config:
                        default_multipliers.update(custom_config['pattern_multipliers'])
            except Exception as e:
                print(f"Warning: Could not load custom config: {e}")
        
        return default_multipliers
    
    def _load_code_fix_patterns(self, config_path: Optional[str]) -> List[str]:
        """Load code-fix pattern identifiers"""
        default_patterns = [
            'code-fix', 'bug-fix', 'error-fix', 'issue-fix', 'problem-fix',
            'fix-code', 'fix-bug', 'fix-error', 'fix-issue', 'fix-problem',
            'code-repair', 'bug-repair', 'error-repair', 'issue-repair',
            'code-correction', 'bug-correction', 'error-correction'
        ]
        
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    custom_config = json.load(f)
                    if 'code_fix_patterns' in custom_config:
                        default_patterns.extend(custom_config['code_fix_patterns'])
            except Exception as e:
                print(f"Warning: Could not load custom code fix patterns: {e}")
        
        return default_patterns
    
    def _is_code_fix_pattern(self, pattern_name: str) -> bool:
        """Check if a pattern is a code-fix pattern"""
        pattern_lower = pattern_name.lower()
        return any(code_fix in pattern_lower for code_fix in self.code_fix_patterns)
    
    def _get_pattern_multiplier(self, pattern_name: str) -> float:
        """Get WSJF multiplier for a pattern"""
        pattern_lower = pattern_name.lower()
        
        # Check for exact matches first
        if pattern_lower in self.pattern_multipliers:
            return self.pattern_multipliers[pattern_lower]
        
        # Check for partial matches
        for pattern, multiplier in self.pattern_multipliers.items():
            if pattern in pattern_lower or pattern_lower in pattern:
                return multiplier
        
        return 1.0  # Default multiplier
    
    def _assess_severity(self, pattern_name: str, wsjf_score: float) -> str:
        """Assess severity of a code-fix pattern"""
        if wsjf_score >= 15:
            return "high"
        elif wsjf_score >= 8:
            return "medium"
        else:
            return "low"
    
    def _assess_complexity(self, pattern_name: str, depth: int, tags: List[str]) -> str:
        """Assess complexity of a code-fix pattern"""
        # Base complexity on depth
        if depth >= 4:
            base_complexity = "high"
        elif depth >= 2:
            base_complexity = "medium"
        else:
            base_complexity = "low"
        
        # Adjust based on tags
        high_complexity_tags = ['security', 'performance', 'integration', 'architecture']
        medium_complexity_tags = ['ui', 'api', 'database', 'testing']
        
        for tag in tags:
            tag_lower = tag.lower()
            if tag_lower in high_complexity_tags:
                return "high"
            elif tag_lower in medium_complexity_tags and base_complexity == "low":
                base_complexity = "medium"
        
        return base_complexity
    
    def enrich_pattern_with_wsjf(self, pattern: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich a single pattern with WSJF calculations"""
        # Extract base WSJF components or use defaults
        user_business_value = pattern.get('user_business_value', 5)
        time_criticality = pattern.get('time_criticality', 5)
        risk_reduction = pattern.get('risk_reduction', 5)
        job_size = pattern.get('job_size', 1)
        
        # Calculate base WSJF
        base_wsjf = calculate_wsjf(user_business_value, time_criticality, risk_reduction, job_size)
        
        # Get pattern multiplier
        pattern_multiplier = self._get_pattern_multiplier(pattern.get('name', ''))
        
        # Calculate enriched WSJF
        enriched_wsjf = base_wsjf * pattern_multiplier
        
        # Determine if it's a code-fix pattern
        is_code_fix = self._is_code_fix_pattern(pattern.get('name', ''))
        
        # Assess severity and complexity for code-fix patterns
        severity = None
        complexity = None
        if is_code_fix:
            severity = self._assess_severity(pattern.get('name', ''), enriched_wsjf)
            complexity = self._assess_complexity(
                pattern.get('name', ''),
                pattern.get('depth', 0),
                pattern.get('tags', [])
            )
        
        # Create enriched pattern
        enriched_pattern = pattern.copy()
        enriched_pattern.update({
            'base_wsjf': base_wsjf,
            'wsjf_multiplier': pattern_multiplier,
            'enriched_wsjf': enriched_wsjf,
            'is_code_fix_proposal': is_code_fix,
            'code_fix_severity': severity,
            'code_fix_complexity': complexity
        })
        
        return enriched_pattern
    
    def enrich_patterns(self, patterns: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enrich multiple patterns with WSJF calculations"""
        return [self.enrich_pattern_with_wsjf(pattern) for pattern in patterns]
    
    def calculate_correlation(self, patterns: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate correlation between WSJF scores and completion rates"""
        if len(patterns) < 2:
            return {"pearson": 0.0, "spearman": 0.0, "sample_size": 0}
        
        # Extract WSJF scores and completion rates
        wsjf_scores = []
        completion_rates = []
        
        for pattern in patterns:
            wsjf = pattern.get('enriched_wsjf', 0)
            completion_rate = pattern.get('completion_rate', 0)
            
            if wsjf > 0 and completion_rate >= 0:
                wsjf_scores.append(wsjf)
                completion_rates.append(completion_rate)
        
        if len(wsjf_scores) < 2:
            return {"pearson": 0.0, "spearman": 0.0, "sample_size": len(wsjf_scores)}
        
        # Calculate Pearson correlation
        pearson = self._calculate_pearson_correlation(wsjf_scores, completion_rates)
        
        # Calculate Spearman correlation (rank-based)
        spearman = self._calculate_spearman_correlation(wsjf_scores, completion_rates)
        
        return {
            "pearson": pearson,
            "spearman": spearman,
            "sample_size": len(wsjf_scores)
        }
    
    def _calculate_pearson_correlation(self, x: List[float], y: List[float]) -> float:
        """Calculate Pearson correlation coefficient"""
        n = len(x)
        if n < 2:
            return 0.0
        
        mean_x = sum(x) / n
        mean_y = sum(y) / n
        
        sum_xy = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
        sum_x2 = sum((x[i] - mean_x) ** 2 for i in range(n))
        sum_y2 = sum((y[i] - mean_y) ** 2 for i in range(n))
        
        if sum_x2 == 0 or sum_y2 == 0:
            return 0.0
        
        return sum_xy / math.sqrt(sum_x2 * sum_y2)
    
    def _calculate_spearman_correlation(self, x: List[float], y: List[float]) -> float:
        """Calculate Spearman rank correlation coefficient"""
        n = len(x)
        if n < 2:
            return 0.0
        
        # Get ranks
        x_ranks = self._get_ranks(x)
        y_ranks = self._get_ranks(y)
        
        # Calculate Pearson correlation on ranks
        return self._calculate_pearson_correlation(x_ranks, y_ranks)
    
    def _get_ranks(self, values: List[float]) -> List[float]:
        """Get ranks of values (handle ties)"""
        sorted_values = sorted((value, index) for index, value in enumerate(values))
        ranks = [0] * len(values)
        
        i = 0
        while i < len(sorted_values):
            # Handle ties
            tie_values = [sorted_values[i][0]]
            tie_indices = [sorted_values[i][1]]
            
            j = i + 1
            while j < len(sorted_values) and sorted_values[j][0] == sorted_values[i][0]:
                tie_values.append(sorted_values[j][0])
                tie_indices.append(sorted_values[j][1])
                j += 1
            
            # Assign average rank to all tied values
            avg_rank = (i + 1 + j) / 2
            for index in tie_indices:
                ranks[index] = avg_rank
            
            i = j
        
        return ranks
    
    def analyze_72hour_correlation(self, patterns: List[Dict[str, Any]], 
                                  hours: int = 72) -> Dict[str, Any]:
        """Analyze correlation over the last N hours"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Filter patterns by time
        recent_patterns = []
        for pattern in patterns:
            pattern_time = pattern.get('timestamp')
            if pattern_time:
                try:
                    if isinstance(pattern_time, str):
                        pattern_time = datetime.fromisoformat(pattern_time.replace('Z', '+00:00'))
                    elif isinstance(pattern_time, (int, float)):
                        pattern_time = datetime.fromtimestamp(pattern_time)
                    
                    if pattern_time >= cutoff_time:
                        recent_patterns.append(pattern)
                except (ValueError, TypeError):
                    # Skip patterns with invalid timestamps
                    continue
        
        # Calculate correlation for recent patterns
        correlation = self.calculate_correlation(recent_patterns)
        
        # Analyze trends by pattern type
        pattern_type_correlations = {}
        pattern_types = set(p.get('pattern_type', 'unknown') for p in recent_patterns)
        
        for pattern_type in pattern_types:
            type_patterns = [p for p in recent_patterns if p.get('pattern_type') == pattern_type]
            if len(type_patterns) >= 2:
                pattern_type_correlations[pattern_type] = self.calculate_correlation(type_patterns)
        
        # Analyze code-fix patterns specifically
        code_fix_patterns = [p for p in recent_patterns if p.get('is_code_fix_proposal', False)]
        code_fix_correlation = self.calculate_correlation(code_fix_patterns)
        
        return {
            'timeframe_hours': hours,
            'total_patterns': len(patterns),
            'recent_patterns': len(recent_patterns),
            'overall_correlation': correlation,
            'pattern_type_correlations': pattern_type_correlations,
            'code_fix_correlation': code_fix_correlation,
            'analysis_timestamp': datetime.now().isoformat()
        }
    
    def generate_recommendations(self, patterns: List[Dict[str, Any]], 
                               correlation_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate recommendations based on WSJF and correlation analysis"""
        recommendations = []
        
        # High-priority code-fix patterns
        code_fix_patterns = [p for p in patterns if p.get('is_code_fix_proposal', False)]
        high_priority_code_fixes = [
            p for p in code_fix_patterns 
            if p.get('code_fix_severity') == 'high' or p.get('enriched_wsjf', 0) > 15
        ]
        
        if high_priority_code_fixes:
            recommendations.append({
                'type': 'high_priority_code_fixes',
                'priority': 'high',
                'title': f'Address {len(high_priority_code_fixes)} High-Priority Code-Fix Patterns',
                'description': 'Focus on high-severity code-fix patterns with high WSJF scores',
                'patterns': [p.get('name', 'Unknown') for p in high_priority_code_fixes[:5]],
                'actionable': True
            })
        
        # Low WSJF, high completion patterns
        low_wsjf_high_completion = [
            p for p in patterns 
            if p.get('enriched_wsjf', 0) < 5 and p.get('completion_rate', 0) > 0.8
        ]
        
        if low_wsjf_high_completion:
            recommendations.append({
                'type': 'low_wsjf_high_completion',
                'priority': 'medium',
                'title': f'Review {len(low_wsjf_high_completion)} Low-WSJF, High-Completion Patterns',
                'description': 'These patterns complete successfully but have low WSJF scores - consider if they need higher priority',
                'patterns': [p.get('name', 'Unknown') for p in low_wsjf_high_completion[:5]],
                'actionable': True
            })
        
        # Correlation-based recommendations
        overall_corr = correlation_analysis.get('overall_correlation', {}).get('pearson', 0)
        if abs(overall_corr) > 0.5:
            direction = "positive" if overall_corr > 0 else "negative"
            recommendations.append({
                'type': 'correlation_insight',
                'priority': 'medium',
                'title': f'Strong {direction.capitalize()} WSJF-Completion Correlation ({overall_corr:.2f})',
                'description': f'{"Higher" if overall_corr > 0 else "Lower"} WSJF scores correlate with {"higher" if overall_corr > 0 else "lower"} completion rates',
                'actionable': False
            })
        
        # Pattern-specific recommendations
        pattern_type_corrs = correlation_analysis.get('pattern_type_correlations', {})
        for pattern_type, corr_data in pattern_type_corrs.items():
            pearson = corr_data.get('pearson', 0)
            if abs(pearson) > 0.7:
                direction = "positive" if pearson > 0 else "negative"
                recommendations.append({
                    'type': 'pattern_type_correlation',
                    'priority': 'low',
                    'title': f'{pattern_type.title()} Patterns: Strong {direction.capitalize()} Correlation ({pearson:.2f})',
                    'description': f'Consider {"prioritizing" if pearson > 0 else "reviewing"} {pattern_type} patterns based on WSJF scores',
                    'actionable': True
                })
        
        return recommendations


def load_pattern_metrics_from_file(file_path: str) -> List[Dict[str, Any]]:
    """Load pattern metrics from a JSONL file"""
    patterns = []
    
    if not os.path.exists(file_path):
        print(f"Warning: Pattern metrics file not found: {file_path}")
        return patterns
    
    try:
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        pattern = json.loads(line)
                        patterns.append(pattern)
                    except json.JSONDecodeError:
                        continue
    except Exception as e:
        print(f"Error reading pattern metrics file: {e}")
    
    return patterns


def main():
    """Main function for WSJF enrichment and analysis"""
    import argparse
    
    parser = argparse.ArgumentParser(description='WSJF Enrichment for Pattern Analysis')
    parser.add_argument('--input', '-i', default='.goalie/pattern_metrics.jsonl',
                        help='Input pattern metrics file (default: .goalie/pattern_metrics.jsonl)')
    parser.add_argument('--output', '-o', default='.goalie/wsjf_enriched_patterns.json',
                        help='Output file for enriched patterns (default: .goalie/wsjf_enriched_patterns.json)')
    parser.add_argument('--config', '-c', help='Configuration file for WSJF multipliers')
    parser.add_argument('--hours', type=int, default=72,
                        help='Time window for correlation analysis in hours (default: 72)')
    parser.add_argument('--json', action='store_true',
                        help='Output results in JSON format')
    
    args = parser.parse_args()
    
    # Initialize WSJF enricher
    enricher = WSJFEnricher(args.config)
    
    # Load pattern metrics
    patterns = load_pattern_metrics_from_file(args.input)
    if not patterns:
        print("No patterns found for analysis")
        return 1
    
    # Enrich patterns with WSJF
    enriched_patterns = enricher.enrich_patterns(patterns)
    
    # Perform 72-hour correlation analysis
    correlation_analysis = enricher.analyze_72hour_correlation(enriched_patterns, args.hours)
    
    # Generate recommendations
    recommendations = enricher.generate_recommendations(enriched_patterns, correlation_analysis)
    
    # Prepare results
    results = {
        'analysis_timestamp': datetime.now().isoformat(),
        'input_file': args.input,
        'timeframe_hours': args.hours,
        'total_patterns': len(patterns),
        'correlation_analysis': correlation_analysis,
        'recommendations': recommendations,
        'patterns': enriched_patterns
    }
    
    # Save results
    try:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved to: {args.output}")
    except Exception as e:
        print(f"Error saving results: {e}")
    
    # Output results
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"\nWSJF Enrichment Analysis Results")
        print(f"=================================")
        print(f"Total Patterns: {len(patterns)}")
        print(f"Time Window: {args.hours} hours")
        
        corr = correlation_analysis.get('overall_correlation', {})
        print(f"Overall WSJF-Completion Correlation: {corr.get('pearson', 0):.3f}")
        
        code_fix_corr = correlation_analysis.get('code_fix_correlation', {})
        print(f"Code-Fix Pattern Correlation: {code_fix_corr.get('pearson', 0):.3f}")
        
        print(f"\nRecommendations:")
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec['title']}")
            print(f"   Priority: {rec['priority']}")
            print(f"   {rec['description']}")
        
        # Summary statistics
        code_fix_count = sum(1 for p in enriched_patterns if p.get('is_code_fix_proposal', False))
        high_severity_count = sum(1 for p in enriched_patterns if p.get('code_fix_severity') == 'high')
        
        print(f"\nCode-Fix Pattern Summary:")
        print(f"Total Code-Fix Patterns: {code_fix_count}")
        print(f"High Severity: {high_severity_count}")
        print(f"Medium Severity: {sum(1 for p in enriched_patterns if p.get('code_fix_severity') == 'medium')}")
        print(f"Low Severity: {sum(1 for p in enriched_patterns if p.get('code_fix_severity') == 'low')}")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())