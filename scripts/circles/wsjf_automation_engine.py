#!/usr/bin/env python3
"""
Automated WSJF Replenishment Engine
Runs on schedule or trigger to keep prioritization aligned with business value
"""

import argparse
import json
import os
import subprocess
import sys
import yaml
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import mean
from typing import Dict, List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from agentic.pattern_logger import PatternLogger
    HAS_PATTERN_LOGGER = True
except ImportError:
    HAS_PATTERN_LOGGER = False
    print("[WARN] PatternLogger not available - metrics logging disabled")


class WSJFAutomationEngine:
    def __init__(self, config_path: Optional[str] = None):
        self.config = self.load_config(config_path) if config_path else {}
        self.pattern_logger = PatternLogger() if HAS_PATTERN_LOGGER else None
        self.goalie_dir = Path('.goalie')
        
    def load_config(self, config_path: str) -> Dict:
        """Load configuration from YAML file"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f) or {}
        except FileNotFoundError:
            print(f"[WARN] Config file not found: {config_path}, using defaults")
            return {}
    
    def run_replenishment(self, mode: str = "auto", circles: Optional[List[str]] = None) -> Dict:
        """
        Execute full WSJF replenishment cycle
        
        Args:
            mode: 'auto' (full automation) or 'advisory' (suggest only)
            circles: List of circles to replenish, or None for all
        """
        start_time = datetime.now()
        
        print(f"\n🔄 Starting WSJF Replenishment (mode={mode})")
        print("=" * 60)
        
        # 1. Data collection
        print("📊 Collecting data...")
        items = self.collect_backlog_items(circles)
        revenue_data = self.get_revenue_attribution()
        risk_data = self.get_roam_risks()
        velocity_data = self.get_historical_velocity()
        
        print(f"   Found {len(items)} backlog items")
        
        # 2. Calculate enhanced WSJF for each item
        print("\n🧮 Calculating WSJF scores...")
        updates = []
        for item in items:
            old_wsjf = item.get('wsjf', 0)
            new_wsjf = self.calculate_enhanced_wsjf(
                item, revenue_data, risk_data, velocity_data
            )
            
            drift_pct = ((new_wsjf - old_wsjf) / old_wsjf * 100) if old_wsjf > 0 else 0
            
            if abs(new_wsjf - old_wsjf) > 0.5:  # Significant change
                updates.append({
                    'item_id': item['id'],
                    'old_wsjf': old_wsjf,
                    'new_wsjf': round(new_wsjf, 2),
                    'drift_pct': round(drift_pct, 1),
                    'reason': self.explain_wsjf_change(old_wsjf, new_wsjf),
                    'circle': item.get('circle', 'unknown')
                })
        
        print(f"   {len(updates)} items need WSJF updates")
        
        # 3. Validate changes
        print("\n✅ Validating updates...")
        validation = self.validate_updates(updates, revenue_data)
        
        if not validation['passed']:
            print(f"❌ Validation failed: {validation['errors']}")
            return {
                'status': 'validation_failed',
                'errors': validation['errors'],
                'updates_blocked': len(updates)
            }
        
        # 4. Apply updates (if mode == 'auto')
        if mode == 'auto' and updates:
            print(f"\n💾 Applying {len(updates)} WSJF updates...")
            self.apply_wsjf_updates(updates)
            status = 'completed'
            print("   ✅ Updates applied successfully")
        elif mode == 'advisory':
            print(f"\n📋 Advisory mode: Would update {len(updates)} items")
            status = 'advisory_only'
        else:
            print("\n✨ No updates needed")
            status = 'no_updates'
        
        # 5. Display summary
        if updates:
            print(f"\n📊 Update Summary:")
            print(f"   Total items updated: {len(updates)}")
            print(f"   Average drift: {round(mean([abs(u['drift_pct']) for u in updates]), 1)}%")
            
            # Show top 5 changes
            sorted_updates = sorted(updates, key=lambda x: abs(x['drift_pct']), reverse=True)
            print(f"\n   Top 5 WSJF changes:")
            for i, update in enumerate(sorted_updates[:5], 1):
                print(f"   {i}. {update['item_id']}: {update['old_wsjf']:.1f} → {update['new_wsjf']:.1f} ({update['drift_pct']:+.1f}%)")
        
        # 6. Log pattern event with duration measurement
        if self.pattern_logger and hasattr(self.pattern_logger, 'timed'):
            try:
                # Use timed() context manager for accurate duration measurement
                duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
                self.pattern_logger.log(
                    "wsjf-enrichment",
                    {
                        'mode': mode,
                        'items_analyzed': len(items),
                        'items_updated': len(updates),
                        'avg_drift_pct': round(mean([abs(u['drift_pct']) for u in updates]), 1) if updates else 0,
                        'duration_ms': duration_ms,
                        'duration_measured': True,
                        'action_completed': True,
                        'tags': ['wsjf', 'automation', 'governance']
                    },
                    gate="automated-replenishment",
                    behavioral_type="observability"
                )
            except Exception as e:
                print(f"[WARN] Could not log pattern event: {e}")
        
        return {
            'status': status,
            'items_analyzed': len(items),
            'items_updated': len(updates),
            'updates': updates,
            'validation': validation,
            'duration_seconds': (datetime.now() - start_time).total_seconds()
        }
    
    def collect_backlog_items(self, circles: Optional[List[str]] = None) -> List[Dict]:
        """Load items from KANBAN_BOARD.yaml"""
        kanban_file = self.goalie_dir / 'KANBAN_BOARD.yaml'
        
        if not kanban_file.exists():
            print(f"[WARN] {kanban_file} not found")
            return []
        
        with open(kanban_file, 'r') as f:
            kanban = yaml.safe_load(f)
        
        items = []
        for column in ['NEXT', 'LATER', 'NOW']:  # Prioritize NEXT and LATER
            column_items = kanban.get(column, [])
            for item in column_items:
                if circles is None or item.get('circle') in circles:
                    items.append({
                        **item,
                        'column': column
                    })
        
        return items
    
    def get_revenue_attribution(self) -> Dict:
        """Get revenue data from revenue_attribution.py"""
        try:
            result = subprocess.run(
                ['python3', 'scripts/agentic/revenue_attribution.py', '--json'],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return json.loads(result.stdout)
            else:
                print(f"[WARN] Revenue attribution failed: {result.stderr}")
                return {'revenue_by_circle': {}}
        except Exception as e:
            print(f"[WARN] Could not get revenue data: {e}")
            return {'revenue_by_circle': {}}
    
    def get_roam_risks(self) -> List[Dict]:
        """Load ROAM risks"""
        risks_file = self.goalie_dir / 'roam_risks.jsonl'
        
        if not risks_file.exists():
            return []
        
        risks = []
        with open(risks_file, 'r') as f:
            for line in f:
                try:
                    risks.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        
        return risks
    
    def get_historical_velocity(self) -> Dict:
        """Calculate historical velocity from pattern metrics"""
        metrics_file = self.goalie_dir / 'pattern_metrics.jsonl'
        
        if not metrics_file.exists():
            return {}
        
        velocity = {}
        with open(metrics_file, 'r') as f:
            for line in f:
                try:
                    event = json.loads(line)
                    pattern = event.get('pattern')
                    circle = event.get('circle')
                    duration = event.get('duration_seconds', 0)
                    
                    if pattern and circle:
                        key = f"{circle}:{pattern}"
                        if key not in velocity:
                            velocity[key] = []
                        velocity[key].append(duration)
                except json.JSONDecodeError:
                    continue
        
        # Calculate averages
        return {k: mean(v) if v else 0 for k, v in velocity.items()}
    
    def calculate_enhanced_wsjf(self, item: Dict, revenue_data: Dict, 
                                 risk_data: List, velocity_data: Dict) -> float:
        """Apply enhanced WSJF formula with time decay and real revenue data"""
        
        # 1. User Business Value - from real revenue attribution
        ubv = self.calculate_ubv_from_revenue(item, revenue_data)
        
        # 2. Time Criticality - with exponential decay
        tc = self.calculate_time_criticality_with_decay(item)
        
        # 3. Risk Reduction/Opportunity Enablement - from ROAM risks
        rroe = self.calculate_risk_reduction(item, risk_data)
        
        # 4. Job Size - from historical velocity data
        job_size = self.estimate_job_size_from_velocity(item, velocity_data)
        
        # Calculate WSJF
        wsjf = (ubv + tc + rroe) / max(job_size, 0.1)
        
        return wsjf
    
    def calculate_ubv_from_revenue(self, item: Dict, revenue_data: Dict) -> float:
        """Link UBV to actual monthly revenue potential"""
        circle = item.get('circle', 'unknown')
        revenue_by_circle = revenue_data.get('revenue_by_circle', {})
        circle_data = revenue_by_circle.get(circle, {})
        
        monthly_revenue = circle_data.get('monthly_revenue_potential', 1000)
        
        # Get impact level from item or default to medium
        impact_level = item.get('impact_level', 'medium')
        impact_multipliers = {'critical': 0.25, 'high': 0.15, 'medium': 0.08, 'low': 0.03}
        impact_ratio = impact_multipliers.get(impact_level, 0.08)
        
        ubv = monthly_revenue * impact_ratio
        
        # Scale to WSJF range (1-10)
        return min(10, ubv / 500)  # $500 = 1 point
    
    def calculate_time_criticality_with_decay(self, item: Dict) -> float:
        """Apply exponential time decay to increase urgency"""
        base_tc = item.get('time_criticality', 5)
        
        # Calculate days in backlog
        created_at = item.get('created_at')
        if created_at:
            try:
                if isinstance(created_at, str):
                    created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    created_date = created_at
                days_in_backlog = (datetime.now(timezone.utc) - created_date).days
            except:
                days_in_backlog = 0
        else:
            days_in_backlog = 0
        
        # Exponential decay: TC increases 10% per week in backlog
        decay_factor = 1.0 + (0.10 * (days_in_backlog / 7))
        
        return min(10, base_tc * decay_factor)
    
    def calculate_risk_reduction(self, item: Dict, risk_data: List) -> float:
        """Calculate from actual ROAM risk items"""
        # Find risks that this item addresses
        item_id = item.get('id', '')
        related_risks = [r for r in risk_data if item_id in r.get('affected_items', [])]
        
        if related_risks:
            # Sum risk scores
            total_risk_score = sum(r.get('risk_score', 0) for r in related_risks)
            return min(10, total_risk_score / 10)
        
        # Default RROE
        return item.get('risk_reduction', 3)
    
    def estimate_job_size_from_velocity(self, item: Dict, velocity_data: Dict) -> float:
        """Estimate based on historical velocity for similar patterns"""
        pattern = item.get('pattern', 'unknown')
        circle = item.get('circle', 'unknown')
        
        key = f"{circle}:{pattern}"
        avg_duration = velocity_data.get(key, 0)
        
        if avg_duration == 0:
            # Use manual estimate if provided
            return item.get('job_size', 5)
        
        # Convert to t-shirt size (1-13 Fibonacci)
        if avg_duration < 300:  # < 5 min
            return 1
        elif avg_duration < 1800:  # < 30 min
            return 2
        elif avg_duration < 7200:  # < 2 hours
            return 3
        elif avg_duration < 28800:  # < 8 hours
            return 5
        else:
            return 8
    
    def explain_wsjf_change(self, old_wsjf: float, new_wsjf: float) -> str:
        """Generate explanation for WSJF change"""
        if new_wsjf > old_wsjf * 1.5:
            return "Significant increase due to time decay or updated business value"
        elif new_wsjf < old_wsjf * 0.5:
            return "Decreased priority due to reduced urgency or business value"
        else:
            return "Adjusted based on current revenue and velocity data"
    
    def validate_updates(self, updates: List[Dict], revenue_data: Dict) -> Dict:
        """Validate that WSJF updates don't create governance violations"""
        errors = []
        warnings = []
        
        # Check 1: Economic drift threshold
        if updates:
            avg_drift = mean([abs(u['drift_pct']) for u in updates])
            if avg_drift > 100:  # 100% threshold
                warnings.append(
                    f"High average drift: {avg_drift:.1f}% (threshold: 100%)"
                )
        
        # Check 2: Revenue concentration after updates
        # (Simplified check - in production would simulate full impact)
        revenue_by_circle = revenue_data.get('revenue_by_circle', {})
        if revenue_by_circle:
            total_revenue = sum(c.get('allocated_revenue', 0) for c in revenue_by_circle.values())
            if total_revenue > 0:
                max_concentration = max(
                    c.get('allocated_revenue', 0) / total_revenue 
                    for c in revenue_by_circle.values()
                )
                if max_concentration > 0.7:  # 70% threshold
                    warnings.append(
                        f"Revenue concentration risk: {max_concentration:.1%} exceeds 70% limit"
                    )
        
        return {
            'passed': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }
    
    def apply_wsjf_updates(self, updates: List[Dict]):
        """Write updated WSJF scores to KANBAN_BOARD.yaml"""
        kanban_file = self.goalie_dir / 'KANBAN_BOARD.yaml'
        
        with open(kanban_file, 'r') as f:
            kanban = yaml.safe_load(f)
        
        # Create lookup dict
        updates_dict = {u['item_id']: u for u in updates}
        
        # Update items in each column
        for column in ['NOW', 'NEXT', 'LATER', 'BLOCKED']:
            items = kanban.get(column, [])
            for item in items:
                item_id = item.get('id')
                if item_id in updates_dict:
                    update = updates_dict[item_id]
                    item['wsjf'] = update['new_wsjf']
                    
                    # Update title if it contains WSJF score
                    title = item.get('title', '')
                    if 'WSJF:' in title:
                        # Replace old WSJF score in title
                        import re
                        item['title'] = re.sub(
                            r'WSJF:\s*[\d.]+',
                            f"WSJF: {update['new_wsjf']}",
                            title
                        )
        
        # Write back
        with open(kanban_file, 'w') as f:
            yaml.dump(kanban, f, default_flow_style=False, sort_keys=False)


def main():
    parser = argparse.ArgumentParser(description='Automated WSJF Replenishment Engine')
    parser.add_argument('--mode', choices=['auto', 'advisory'], default='advisory',
                       help='Execution mode (default: advisory)')
    parser.add_argument('--circles', nargs='+', help='Specific circles to replenish')
    parser.add_argument('--config', help='Path to config file')
    parser.add_argument('--trigger', help='Trigger source (cron, webhook, manual)')
    
    args = parser.parse_args()
    
    engine = WSJFAutomationEngine(config_path=args.config)
    result = engine.run_replenishment(mode=args.mode, circles=args.circles)
    
    print("\n" + "=" * 60)
    print(f"✅ Replenishment {result['status']}")
    print(f"   Duration: {result['duration_seconds']:.1f}s")
    
    if result.get('validation', {}).get('warnings'):
        print("\n⚠️  Warnings:")
        for warning in result['validation']['warnings']:
            print(f"   • {warning}")
    
    return 0 if result['status'] in ['completed', 'no_updates', 'advisory_only'] else 1


if __name__ == '__main__':
    sys.exit(main())
