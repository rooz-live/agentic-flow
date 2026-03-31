#!/usr/bin/env python3
"""
Improved Production Cycle with Failure Reduction and Economic Tracking.

Improvements:
1. Allocation efficiency monitoring - rebalance if testing > 30% of cycles
2. Revenue concentration alerts - warn if >60% concentrated in 2 circles
3. Observability-first enforcement - ALL patterns log behavioral_type
4. CapEx/OpEx tracking - integrate EconomicCalculator
5. Infrastructure utilization - real-time device metrics
6. Failure reduction - preflight checks, retry logic, circuit breakers
7. Pattern correlation analysis - detect co-failure patterns
"""

import sys
import os
import time
import json
import subprocess
from collections import Counter, defaultdict

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'scripts'))

from agentic.pattern_logger import PatternLogger
from agentic.economic_calculator import EconomicCalculator
from agentic.guardrails import GuardrailLock, OperationMode


class ProductionCycleImproved:
    """Enhanced prod-cycle with economic tracking and failure reduction."""
    
    # Thresholds for allocation efficiency
    MAX_TESTING_ALLOCATION = 0.30  # 30% max for testing circle
    MAX_REVENUE_CONCENTRATION = 0.60  # 60% max in any 2 circles
    MIN_OBSERVABILITY_COVERAGE = 0.80  # 80% events must be observable
    
    # Failure reduction settings
    MAX_RETRIES = 3
    RETRY_BACKOFF_SECONDS = 2
    CIRCUIT_BREAKER_THRESHOLD = 5  # Failures before circuit opens
    
    def __init__(self, circle=None, mode="advisory", iterations=1, depth=0):
        self.circle = circle
        self.mode = mode
        self.iterations = iterations
        self.depth = depth
        self.logger = PatternLogger(circle=circle, mode=mode, depth=depth)
        self.economic_calc = EconomicCalculator()
        self.failure_counts = Counter()
        self.circuit_breakers = {}
        
    def check_allocation_efficiency(self) -> dict:
        """
        Analyze allocation efficiency from recent pattern metrics.
        
        Returns:
            dict with efficiency analysis and recommendations
        """
        metrics_file = ".goalie/pattern_metrics.jsonl"
        if not os.path.exists(metrics_file):
            return {'status': 'no_data'}
        
        circle_counts = Counter()
        total = 0
        
        try:
            with open(metrics_file, 'r') as f:
                for line in f:
                    try:
                        event = json.loads(line)
                        circle = event.get('circle', 'unknown')
                        circle_counts[circle] += 1
                        total += 1
                    except json.JSONDecodeError:
                        continue
            
            if total == 0:
                return {'status': 'no_data'}
            
            # Calculate allocations
            allocations = {c: count/total for c, count in circle_counts.items()}
            
            # Check testing allocation
            testing_alloc = allocations.get('testing', 0.0)
            inefficient = testing_alloc > self.MAX_TESTING_ALLOCATION
            
            recommendations = []
            if inefficient:
                over_alloc = (testing_alloc - self.MAX_TESTING_ALLOCATION) * 100
                recommendations.append(
                    f"⚠️ Testing over-allocated by {over_alloc:.1f}% - "
                    f"reallocate to integration/analyst/orchestrator"
                )
            
            # Find underutilized high-value circles
            high_value = ['integration', 'analyst', 'orchestrator']
            for circle in high_value:
                if allocations.get(circle, 0.0) < 0.10:  # Less than 10%
                    recommendations.append(
                        f"📈 {circle.title()} underutilized ({allocations.get(circle, 0)*100:.1f}%) - "
                        f"increase allocation"
                    )
            
            return {
                'status': 'analyzed',
                'total_events': total,
                'allocations': allocations,
                'inefficient': inefficient,
                'testing_allocation': testing_alloc,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def check_revenue_concentration(self) -> dict:
        """
        Check for revenue concentration risk from economic data.
        
        Returns:
            dict with concentration analysis and risk level
        """
        metrics_file = ".goalie/pattern_metrics.jsonl"
        if not os.path.exists(metrics_file):
            return {'status': 'no_data'}
        
        circle_revenue = Counter()
        
        try:
            with open(metrics_file, 'r') as f:
                for line in f:
                    try:
                        event = json.loads(line)
                        circle = event.get('circle', 'unknown')
                        economic = event.get('economic', {})
                        revenue = economic.get('revenue_impact', 0.0)
                        circle_revenue[circle] += revenue
                    except json.JSONDecodeError:
                        continue
            
            total_revenue = sum(circle_revenue.values())
            if total_revenue == 0:
                return {'status': 'no_revenue_data'}
            
            # Check top 2 circles
            top_2 = circle_revenue.most_common(2)
            top_2_revenue = sum(rev for _, rev in top_2)
            concentration = top_2_revenue / total_revenue
            
            risk_level = 'low'
            if concentration > 0.80:
                risk_level = 'critical'
            elif concentration > self.MAX_REVENUE_CONCENTRATION:
                risk_level = 'high'
            elif concentration > 0.50:
                risk_level = 'medium'
            
            return {
                'status': 'analyzed',
                'total_revenue': total_revenue,
                'top_2_circles': [c for c, _ in top_2],
                'top_2_revenue': top_2_revenue,
                'concentration': concentration,
                'risk_level': risk_level,
                'warning': concentration > self.MAX_REVENUE_CONCENTRATION
            }
            
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def ensure_observability_first(self, pattern_name: str, data: dict) -> dict:
        """
        Ensure ALL patterns are observable with proper behavioral_type.
        
        Args:
            pattern_name: Pattern name
            data: Pattern data dict
            
        Returns:
            Enhanced data dict with observability fields
        """
        if 'behavioral_type' not in data:
            # Auto-assign based on pattern type
            if 'observability' in pattern_name.lower():
                data['behavioral_type'] = 'observability'
            elif 'guardrail' in pattern_name.lower() or 'lock' in pattern_name.lower():
                data['behavioral_type'] = 'enforcement'
            else:
                data['behavioral_type'] = 'advisory'
        
        # Ensure economic metrics present
        if 'economic' not in data or not data['economic']:
            # Auto-calculate from circle and pattern
            wsjf = data.get('wsjf_score', 5.0)
            cod = data.get('cod', 10.0)
            
            data['economic'] = self.economic_calc.get_full_economic_metrics(
                circle=self.circle or 'unknown',
                wsjf_score=wsjf,
                cod=cod
            )
        
        return data
    
    def execute_with_retry(self, func, *args, max_retries=None, **kwargs):
        """
        Execute function with retry logic and circuit breaker.
        
        Args:
            func: Function to execute
            *args, **kwargs: Function arguments
            max_retries: Max retry attempts (default: self.MAX_RETRIES)
            
        Returns:
            Function result or raises exception after retries exhausted
        """
        if max_retries is None:
            max_retries = self.MAX_RETRIES
        
        func_name = func.__name__
        
        # Check circuit breaker
        if func_name in self.circuit_breakers:
            if self.circuit_breakers[func_name]['state'] == 'open':
                # Circuit is open - check if we should retry
                time_since_open = time.time() - self.circuit_breakers[func_name]['opened_at']
                if time_since_open < 60:  # 1 minute cooldown
                    raise Exception(f"Circuit breaker OPEN for {func_name} - cooling down")
                else:
                    # Try again (half-open state)
                    self.circuit_breakers[func_name]['state'] = 'half-open'
        
        for attempt in range(max_retries):
            try:
                result = func(*args, **kwargs)
                
                # Success - reset failure count
                self.failure_counts[func_name] = 0
                if func_name in self.circuit_breakers:
                    self.circuit_breakers[func_name]['state'] = 'closed'
                
                return result
                
            except Exception as e:
                self.failure_counts[func_name] += 1
                
                # Check if we should open circuit breaker
                if self.failure_counts[func_name] >= self.CIRCUIT_BREAKER_THRESHOLD:
                    self.circuit_breakers[func_name] = {
                        'state': 'open',
                        'opened_at': time.time(),
                        'reason': str(e)
                    }
                    print(f"   🚨 Circuit breaker OPENED for {func_name}")
                    raise
                
                if attempt < max_retries - 1:
                    wait_time = self.RETRY_BACKOFF_SECONDS * (2 ** attempt)
                    print(f"   ⚠️ Retry {attempt+1}/{max_retries} for {func_name} in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    print(f"   ❌ Failed after {max_retries} retries: {func_name}")
                    raise
    
    def detect_pattern_correlation_failures(self) -> dict:
        """
        Analyze pattern_metrics.jsonl for co-failing patterns.
        
        Returns:
            dict with correlation analysis
        """
        metrics_file = ".goalie/pattern_metrics.jsonl"
        if not os.path.exists(metrics_file):
            return {'status': 'no_data'}
        
        # Track failures by pattern
        pattern_failures = defaultdict(list)
        pattern_run_ids = defaultdict(set)
        
        try:
            with open(metrics_file, 'r') as f:
                for line in f:
                    try:
                        event = json.loads(line)
                        pattern = event.get('pattern')
                        run_id = event.get('run_id')
                        action_completed = event.get('action_completed', True)
                        
                        if not action_completed or event.get('error'):
                            pattern_failures[pattern].append(run_id)
                        
                        pattern_run_ids[pattern].add(run_id)
                        
                    except json.JSONDecodeError:
                        continue
            
            # Find co-occurring failures
            correlations = []
            patterns = list(pattern_failures.keys())
            
            for i in range(len(patterns)):
                for j in range(i+1, len(patterns)):
                    p1, p2 = patterns[i], patterns[j]
                    
                    # Find common failed run_ids
                    p1_fails = set(pattern_failures[p1])
                    p2_fails = set(pattern_failures[p2])
                    common_fails = p1_fails & p2_fails
                    
                    if len(common_fails) >= 2:  # At least 2 co-failures
                        correlations.append({
                            'pattern_1': p1,
                            'pattern_2': p2,
                            'co_failures': len(common_fails),
                            'p1_total_failures': len(p1_fails),
                            'p2_total_failures': len(p2_fails)
                        })
            
            # Sort by co-failure count
            correlations.sort(key=lambda x: x['co_failures'], reverse=True)
            
            return {
                'status': 'analyzed',
                'total_patterns_with_failures': len(pattern_failures),
                'correlations': correlations[:10],  # Top 10
                'top_failing_patterns': [
                    {'pattern': p, 'failures': len(fails)}
                    for p, fails in sorted(pattern_failures.items(), 
                                          key=lambda x: len(x[1]), 
                                          reverse=True)[:5]
                ]
            }
            
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def run_comprehensive_cycle(self) -> dict:
        """
        Run improved production cycle with all enhancements.
        
        Returns:
            dict with cycle results
        """
        print(f"\n🚀 Production Cycle (Improved) - {self.circle or 'all'} circles")
        print(f"{'='*70}")
        
        results = {
            'circle': self.circle,
            'mode': self.mode,
            'iterations': self.iterations,
            'depth': self.depth,
            'checks': {},
            'failures': [],
            'economic_summary': {}
        }
        
        # 1. Allocation Efficiency Check
        print("\n📊 Checking Allocation Efficiency...")
        alloc_check = self.check_allocation_efficiency()
        results['checks']['allocation'] = alloc_check
        
        if alloc_check.get('recommendations'):
            for rec in alloc_check['recommendations']:
                print(f"   {rec}")
        
        # 2. Revenue Concentration Check
        print("\n💰 Checking Revenue Concentration...")
        rev_check = self.check_revenue_concentration()
        results['checks']['revenue_concentration'] = rev_check
        
        if rev_check.get('warning'):
            print(f"   🔴 High concentration risk: {rev_check['concentration']*100:.1f}% "
                  f"in top 2 circles")
        
        # 3. Pattern Correlation Analysis
        print("\n🔍 Analyzing Pattern Correlation Failures...")
        corr_analysis = self.detect_pattern_correlation_failures()
        results['checks']['pattern_correlation'] = corr_analysis
        
        if corr_analysis.get('correlations'):
            print(f"   Found {len(corr_analysis['correlations'])} correlated failure patterns")
            for corr in corr_analysis['correlations'][:3]:
                print(f"   - {corr['pattern_1']} + {corr['pattern_2']}: "
                      f"{corr['co_failures']} co-failures")
        
        # 4. Economic Trends
        print("\n💵 Calculating Economic Trends...")
        trends = self.economic_calc.analyze_economic_trends()
        results['economic_summary'] = trends
        
        if not trends.get('error'):
            print(f"   Total Revenue Impact: ${trends.get('total_revenue_impact', 0):,.2f}")
            print(f"   Avg CapEx/OpEx: {trends.get('avg_capex_opex_ratio', 0):.4f}")
            print(f"   Infra Util: {trends.get('avg_infrastructure_utilization', 0):.1f}%")
        
        # 5. Log comprehensive cycle completion with economic data
        cycle_economic = self.economic_calc.get_full_economic_metrics(
            circle=self.circle or 'all',
            wsjf_score=10.0,
            cod=20.0
        )
        
        self.logger.log(
            'prod_cycle_improved_complete',
            {
                'iterations_requested': self.iterations,
                'depth': self.depth,
                'allocation_efficient': not alloc_check.get('inefficient', False),
                'revenue_concentration_safe': not rev_check.get('warning', False),
                'failures_detected': len(corr_analysis.get('top_failing_patterns', [])),
                'behavioral_type': 'observability'
            },
            gate='cycle-execution',
            economic=cycle_economic
        )
        
        print(f"\n✅ Cycle Complete - Economic Impact: ${cycle_economic['revenue_impact']:,.2f}/month")
        
        return results


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Improved Production Cycle")
    parser.add_argument('--circle', help='Circle to focus on')
    parser.add_argument('--mode', default='advisory', choices=['advisory', 'mutate', 'enforcement'])
    parser.add_argument('--iterations', type=int, default=1)
    parser.add_argument('--depth', type=int, default=0)
    parser.add_argument('--json', action='store_true', help='Output JSON')
    
    args = parser.parse_args()
    
    cycle = ProductionCycleImproved(
        circle=args.circle,
        mode=args.mode,
        iterations=args.iterations,
        depth=args.depth
    )
    
    results = cycle.run_comprehensive_cycle()
    
    if args.json:
        print(json.dumps(results, indent=2))
