#!/usr/bin/env python3
"""
Economic Calculator for CapEx/OpEx Ratio and Infrastructure Utilization Tracking.

Integrates with Device 24460 metrics and circle revenue attribution to provide
comprehensive economic analysis for Method Pattern tracking.

Features:
- Real-time capex_opex_ratio calculation from infrastructure costs
- Infrastructure utilization tracking from device metrics (CPU, Memory, Disk)
- Circle-specific revenue_impact attribution based on business value
- Integration with pattern_metrics.jsonl for economic forensics
"""

import os
import json
import subprocess
import psutil
from datetime import datetime
from typing import Dict, Optional

class EconomicCalculator:
    """
    Calculate economic metrics with infrastructure cost tracking.
    
    Formulas:
    - capex_opex_ratio = CapEx / (CapEx + OpEx)
    - infrastructure_utilization = (CPU% + Memory% + Disk%) / 3
    - revenue_impact = circle_base_revenue * wsjf_multiplier * utilization_factor
    """
    
    # Circle monthly revenue attribution (from PatternLogger)
    CIRCLE_REVENUE_IMPACT = {
        'innovator': 5000.0,      # $5k/month - new features
        'analyst': 4000.0,        # $4k/month - strategic insights (UPGRADED from 3.5k)
        'orchestrator': 3000.0,   # $3k/month - coordination (UPGRADED from 2.5k)
        'assessor': 2500.0,       # $2.5k/month - quality (UPGRADED from 2k)
        'intuitive': 1200.0,      # $1.2k/month - patterns (UPGRADED from 1k)
        'seeker': 800.0,          # $800/month - research (UPGRADED from 500)
        'testing': 500.0          # $500/month - validation (UPGRADED from 250)
    }
    
    # Infrastructure cost assumptions (monthly, per-device)
    INFRASTRUCTURE_COSTS = {
        'device_24460': {
            'capex_monthly_amortization': 500.0,  # $500/month (HW amortized over 36 months)
            'opex_power': 150.0,                   # $150/month electricity
            'opex_network': 100.0,                 # $100/month bandwidth
            'opex_maintenance': 50.0               # $50/month support
        },
        'starlingx_cluster': {
            'capex_monthly_amortization': 2000.0,  # $2k/month (cluster HW)
            'opex_power': 600.0,
            'opex_network': 400.0,
            'opex_maintenance': 200.0
        }
    }
    
    def __init__(self, device_id="24460", environment="production"):
        self.device_id = device_id
        self.environment = environment
        self._cache_metrics = {}
        
    def get_infrastructure_utilization(self) -> float:
        """
        Calculate current infrastructure utilization from device metrics.
        
        Returns:
            float: Utilization percentage (0.0 to 100.0)
        """
        try:
            # Get local system metrics (fallback if device SSH unavailable)
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Average utilization across resources
            utilization = (
                cpu_percent +
                memory.percent +
                disk.percent
            ) / 3.0
            
            self._cache_metrics['utilization'] = utilization
            return round(utilization, 2)
            
        except Exception as e:
            print(f"[WARN] Utilization calculation failed: {str(e)}")
            return 50.0  # Default to 50% if metrics unavailable
    
    def get_device_utilization_ssh(self, host="**********", port=2222, key_path="~/pem/stx-aio-0.pem") -> Optional[Dict]:
        """
        Get device utilization from Device 24460 via SSH/IPMI.
        
        Args:
            host: Device hostname/IP
            port: SSH port
            key_path: Path to SSH private key
            
        Returns:
            Dict with cpu_percent, memory_percent, disk_percent, or None if failed
        """
        try:
            # SSH command to get metrics from remote device
            cmd = [
                'ssh',
                '-i', os.path.expanduser(key_path),
                '-p', str(port),
                '-o', 'StrictHostKeyChecking=no',
                '-o', 'ConnectTimeout=5',
                f'root@{host}',
                'top -bn1 | grep "Cpu(s)" && free -m && df -h /'
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                # Parse output (simplified - real impl would parse actual values)
                lines = result.stdout.strip().split('\n')
                # TODO: Parse actual metrics from output
                return {
                    'cpu_percent': 45.0,  # Placeholder
                    'memory_percent': 60.0,
                    'disk_percent': 40.0
                }
            else:
                print(f"[WARN] SSH metrics failed: {result.stderr[:100]}")
                return None
                
        except subprocess.TimeoutExpired:
            print("[WARN] SSH timeout - using local metrics")
            return None
        except Exception as e:
            print(f"[WARN] SSH error: {str(e)}")
            return None
    
    def calculate_capex_opex_ratio(self, device_key="device_24460") -> float:
        """
        Calculate CapEx/(CapEx+OpEx) ratio for infrastructure cost tracking.
        
        Args:
            device_key: Key in INFRASTRUCTURE_COSTS dict
            
        Returns:
            float: Ratio (0.0 to 1.0) where higher = more CapEx heavy
        """
        costs = self.INFRASTRUCTURE_COSTS.get(device_key, {})
        
        capex = costs.get('capex_monthly_amortization', 0.0)
        opex = sum([
            costs.get('opex_power', 0.0),
            costs.get('opex_network', 0.0),
            costs.get('opex_maintenance', 0.0)
        ])
        
        total = capex + opex
        ratio = capex / total if total > 0 else 0.0
        
        return round(ratio, 4)
    
    def calculate_revenue_impact(self, circle: str, wsjf_score: float, 
                                  utilization: Optional[float] = None) -> float:
        """
        Calculate revenue impact for a specific circle based on business value.
        
        Args:
            circle: Circle name (e.g., 'innovator', 'analyst')
            wsjf_score: WSJF prioritization score
            utilization: Infrastructure utilization (0-100), if None uses current
            
        Returns:
            float: Monthly revenue impact in USD
        """
        base_revenue = self.CIRCLE_REVENUE_IMPACT.get(circle, 0.0)
        
        if base_revenue == 0.0:
            return 0.0
        
        # WSJF multiplier (higher priority = higher impact)
        # Baseline WSJF ~3.0, scale linearly
        wsjf_multiplier = max(wsjf_score / 3.0, 0.1)
        
        # Utilization factor (higher utilization = more value delivered)
        if utilization is None:
            utilization = self.get_infrastructure_utilization()
        utilization_factor = max(utilization / 100.0, 0.5)  # Min 50% credit
        
        # Calculate impact
        revenue_impact = base_revenue * wsjf_multiplier * utilization_factor
        
        return round(revenue_impact, 2)
    
    def get_full_economic_metrics(self, circle: str, wsjf_score: float, 
                                    cod: float, device_key="device_24460") -> Dict:
        """
        Get complete economic metrics for pattern logging.
        
        Args:
            circle: Circle name
            wsjf_score: WSJF score
            cod: Cost of Delay
            device_key: Infrastructure device key
            
        Returns:
            Dict with all economic fields for PatternLogger
        """
        utilization = self.get_infrastructure_utilization()
        
        # Try to get device-specific metrics if available
        device_metrics = self.get_device_utilization_ssh()
        if device_metrics:
            utilization = sum(device_metrics.values()) / 3.0
        
        return {
            'cod': cod,
            'wsjf_score': wsjf_score,
            'capex_opex_ratio': self.calculate_capex_opex_ratio(device_key),
            'infrastructure_utilization': utilization,
            'revenue_impact': self.calculate_revenue_impact(circle, wsjf_score, utilization),
            'device_metrics': device_metrics or {},
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    
    def analyze_economic_trends(self, metrics_file=".goalie/pattern_metrics.jsonl", 
                                 lookback_hours=24) -> Dict:
        """
        Analyze economic trends from pattern_metrics.jsonl.
        
        Args:
            metrics_file: Path to metrics file
            lookback_hours: How far back to analyze
            
        Returns:
            Dict with trend analysis
        """
        if not os.path.exists(metrics_file):
            return {'error': 'metrics_file_not_found'}
        
        from datetime import datetime, timedelta
        cutoff = datetime.utcnow() - timedelta(hours=lookback_hours)
        
        trends = {
            'total_revenue_impact': 0.0,
            'avg_capex_opex_ratio': 0.0,
            'avg_infrastructure_utilization': 0.0,
            'circle_revenue_breakdown': {},
            'high_impact_patterns': []
        }
        
        count = 0
        capex_opex_sum = 0.0
        util_sum = 0.0
        
        try:
            with open(metrics_file, 'r') as f:
                for line in f:
                    try:
                        event = json.loads(line)
                        
                        # Parse timestamp
                        ts_str = event.get('timestamp', event.get('ts', ''))
                        if ts_str:
                            event_time = datetime.fromisoformat(ts_str.rstrip('Z'))
                            if event_time < cutoff:
                                continue
                        
                        economic = event.get('economic', {})
                        circle = event.get('circle', 'unknown')
                        
                        # Accumulate trends
                        revenue_impact = economic.get('revenue_impact', 0.0)
                        trends['total_revenue_impact'] += revenue_impact
                        
                        if circle not in trends['circle_revenue_breakdown']:
                            trends['circle_revenue_breakdown'][circle] = 0.0
                        trends['circle_revenue_breakdown'][circle] += revenue_impact
                        
                        capex_ratio = economic.get('capex_opex_ratio', 0.0)
                        util = economic.get('infrastructure_utilization', 0.0)
                        
                        if capex_ratio > 0:
                            capex_opex_sum += capex_ratio
                            count += 1
                        if util > 0:
                            util_sum += util
                        
                        # Track high-impact patterns
                        if revenue_impact > 1000.0:
                            trends['high_impact_patterns'].append({
                                'pattern': event.get('pattern'),
                                'circle': circle,
                                'revenue_impact': revenue_impact,
                                'wsjf': economic.get('wsjf_score', 0)
                            })
                            
                    except json.JSONDecodeError:
                        continue
            
            # Calculate averages
            if count > 0:
                trends['avg_capex_opex_ratio'] = round(capex_opex_sum / count, 4)
                trends['avg_infrastructure_utilization'] = round(util_sum / count, 2)
            
            # Sort high-impact patterns
            trends['high_impact_patterns'].sort(key=lambda x: x['revenue_impact'], reverse=True)
            trends['high_impact_patterns'] = trends['high_impact_patterns'][:10]
            
            return trends
            
        except Exception as e:
            return {'error': str(e)}


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Calculate economic metrics for pattern logging")
    parser.add_argument('--circle', default='analyst', help='Circle name')
    parser.add_argument('--wsjf', type=float, default=10.0, help='WSJF score')
    parser.add_argument('--cod', type=float, default=15.0, help='Cost of Delay')
    parser.add_argument('--device', default='device_24460', help='Device key')
    parser.add_argument('--analyze-trends', action='store_true', help='Analyze economic trends')
    parser.add_argument('--json', action='store_true', help='Output JSON')
    
    args = parser.parse_args()
    
    calc = EconomicCalculator()
    
    if args.analyze_trends:
        trends = calc.analyze_economic_trends()
        if args.json:
            print(json.dumps(trends, indent=2))
        else:
            print(f"\n📊 Economic Trends (Last 24h)")
            print(f"{'='*60}")
            print(f"Total Revenue Impact: ${trends.get('total_revenue_impact', 0):,.2f}")
            print(f"Avg CapEx/OpEx Ratio: {trends.get('avg_capex_opex_ratio', 0):.4f}")
            print(f"Avg Infra Utilization: {trends.get('avg_infrastructure_utilization', 0):.1f}%")
            print(f"\n💰 Revenue by Circle:")
            for circle, revenue in sorted(trends.get('circle_revenue_breakdown', {}).items(), 
                                          key=lambda x: x[1], reverse=True):
                print(f"  {circle:15} ${revenue:,.2f}")
    else:
        metrics = calc.get_full_economic_metrics(
            circle=args.circle,
            wsjf_score=args.wsjf,
            cod=args.cod,
            device_key=args.device
        )
        
        if args.json:
            print(json.dumps(metrics, indent=2))
        else:
            print(f"\n💵 Economic Metrics for {args.circle}")
            print(f"{'='*60}")
            print(f"WSJF Score: {metrics['wsjf_score']}")
            print(f"Cost of Delay: ${metrics['cod']}")
            print(f"CapEx/OpEx Ratio: {metrics['capex_opex_ratio']:.4f}")
            print(f"Infrastructure Utilization: {metrics['infrastructure_utilization']:.1f}%")
            print(f"Revenue Impact: ${metrics['revenue_impact']:,.2f}/month")
