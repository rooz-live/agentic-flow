#!/usr/bin/env python3
"""
Revenue Impact Attribution Engine
Auto-calculates monthly revenue per circle based on business value contribution
"""

import os
import sys
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(PROJECT_ROOT, "scripts"))

GOALIE_DIR = Path(PROJECT_ROOT) / ".goalie"
METRICS_FILE = GOALIE_DIR / "pattern_metrics.jsonl"

# Revenue Impact Attribution Model (monthly USD)
# REBALANCED 2025-12-30: Reduced innovator bias, increased analyst/orchestrator/assessor weights
# Target: Reduce innovator from 71.8% → 50-55%, improve HHI from 0.5565 → <0.40
CIRCLE_REVENUE_IMPACT = {
    'innovator': 4000,      # Reduced from 5000 - new product features, competitive differentiation
    'analyst': 4000,        # Increased from 3500 - strategic insights, data-driven decisions
    'orchestrator': 3500,   # Increased from 2500 - coordination, flow optimization
    'assessor': 3000,       # Increased from 2000 - quality assurance, risk mitigation
    'intuitive': 2000,      # Increased from 1000 - exploratory work, strategic framing
    'seeker': 500,          # Lower - research, horizon scanning
    'testing': 250,         # Lowest - validation, quality checks
    'governance': 1500,     # Compliance, policy enforcement
    'facilitator': 800,     # Meeting efficiency, collaboration
    'scout': 400,           # Discovery, competitive intelligence
    'synthesizer': 600,     # Knowledge consolidation
    'unknown': 0            # Unclassified work
}

TOTAL_MONTHLY_REVENUE = sum(CIRCLE_REVENUE_IMPACT.values())


class RevenueAttributor:
    """Attributes revenue impact to circles and patterns."""

    def __init__(self, hours: int = 720, include_run_kinds: List[str] = None, exclude_run_kinds: List[str] = None, correlation_id: str = None):
        self.hours = hours
        self.cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        self.include_run_kinds = include_run_kinds or []
        self.exclude_run_kinds = exclude_run_kinds or []
        self.correlation_id = correlation_id

    def load_events(self) -> List[Dict[str, Any]]:
        """Load recent pattern events."""
        if not METRICS_FILE.exists():
            return []

        events = []
        with open(METRICS_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    event = json.loads(line)
                    run_kind = event.get('run_kind') or event.get('run') or 'unknown'
                    if self.include_run_kinds and run_kind not in self.include_run_kinds:
                        continue
                    if self.exclude_run_kinds and run_kind in self.exclude_run_kinds:
                        continue

                    if self.correlation_id:
                        ev_cid = event.get('correlation_id') or event.get('run_id')
                        if str(ev_cid or '') != str(self.correlation_id):
                            continue

                    ts_str = event.get("timestamp") or event.get("ts", "")
                    if ts_str:
                        try:
                            event_time = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                            if event_time > self.cutoff:
                                event['run_kind'] = run_kind
                                events.append(event)
                        except:
                            pass
                except json.JSONDecodeError:
                    continue

        return events

    def calculate_revenue_by_circle(self, events: List[Dict]) -> Dict[str, Any]:
        """Calculate revenue attribution by circle."""
        circle_actions = defaultdict(int)
        circle_duration = defaultdict(float)
        circle_patterns = defaultdict(set)

        circle_realized_revenue = defaultdict(float)
        circle_wsjf_total = defaultdict(float)

        # Energy/Labor Cost Config
        watts = float(os.environ.get("AF_COST_WATTS", "60"))
        usd_per_kwh = float(os.environ.get("AF_COST_USD_PER_KWH", "0.20"))
        labor_rate = float(os.environ.get("AF_COST_USD_PER_HOUR", "0"))

        circle_energy_kwh = defaultdict(float)
        circle_labor_cost = defaultdict(float)

        revenue_outliers = defaultdict(int)
        duration_missing = defaultdict(int)
        duration_invalid = defaultdict(int)
        duration_sentinel = defaultdict(int)
        duration_zero = defaultdict(int)
        pattern_stats = defaultdict(lambda: {'count': 0, 'circles': set(), 'total_revenue': 0.0, 'duration_hours': 0.0})

        def _extract_duration_info(ev: Dict[str, Any]) -> Dict[str, Any]:
            """Return duration extraction details for calibrated coverage.

            - missing: duration key absent or explicitly null
            - invalid: duration key present but non-numeric
            - sentinel: duration==1 coming from data.duration_ms when duration was not measured
            - zero: duration==0 (explicit anomaly bucket)
            """
            if 'duration_ms' in ev:
                v = ev.get('duration_ms')
                if v is None:
                    return {'duration_ms': 0.0, 'status': 'missing', 'source': 'root'}
                if isinstance(v, (int, float)):
                    fv = float(v)
                    if fv == 0.0:
                        return {'duration_ms': fv, 'status': 'zero', 'source': 'root'}
                    return {'duration_ms': fv, 'status': 'ok', 'source': 'root'}
                return {'duration_ms': 0.0, 'status': 'invalid', 'source': 'root'}

            metrics = ev.get('metrics') if isinstance(ev.get('metrics'), dict) else {}
            if 'duration_ms' in metrics:
                v = metrics.get('duration_ms')
                if v is None:
                    return {'duration_ms': 0.0, 'status': 'missing', 'source': 'metrics'}
                if isinstance(v, (int, float)):
                    fv = float(v)
                    if fv == 0.0:
                        return {'duration_ms': fv, 'status': 'zero', 'source': 'metrics'}
                    return {'duration_ms': fv, 'status': 'ok', 'source': 'metrics'}
                return {'duration_ms': 0.0, 'status': 'invalid', 'source': 'metrics'}

            data = ev.get('data') if isinstance(ev.get('data'), dict) else {}
            if 'duration_ms' in data:
                v = data.get('duration_ms')
                if v is None:
                    return {'duration_ms': 0.0, 'status': 'missing', 'source': 'data'}
                if isinstance(v, (int, float)):
                    fv = float(v)
                    duration_measured = data.get('duration_measured')
                    sentinel = (fv == 1.0) and ('duration_ms' not in ev) and ('duration_ms' not in metrics) and (duration_measured is False or duration_measured is None)
                    if sentinel:
                        return {'duration_ms': fv, 'status': 'sentinel', 'source': 'data'}
                    if fv == 0.0:
                        return {'duration_ms': fv, 'status': 'zero', 'source': 'data'}
                    return {'duration_ms': fv, 'status': 'ok', 'source': 'data'}
                return {'duration_ms': 0.0, 'status': 'invalid', 'source': 'data'}

            return {'duration_ms': 0.0, 'status': 'missing', 'source': 'absent'}

        def _calibrate_revenue_impact(circle: str, raw_value: float) -> float:
            """Clamp revenue_impact to a reasonable range for analytics.

            We treat revenue_impact as an estimate in USD (not audited). To prevent
            a single bad emitter from dominating attribution, clamp to:
              [0, 10x circle monthly potential]
            """
            ceiling = float(CIRCLE_REVENUE_IMPACT.get(circle, 0) or 0) * 10.0
            if ceiling <= 0:
                return 0.0
            if raw_value < 0:
                return 0.0
            if raw_value > ceiling:
                revenue_outliers[circle] += 1
                return ceiling
            return raw_value

        for event in events:
            circle = event.get('circle', 'unknown')
            pattern = event.get('pattern', 'unknown')
            dur = _extract_duration_info(event)
            duration_ms = float(dur.get('duration_ms', 0.0) or 0.0)
            status = str(dur.get('status') or 'missing')
            if status == 'missing':
                duration_missing[circle] += 1
            elif status == 'invalid':
                duration_invalid[circle] += 1
            elif status == 'sentinel':
                duration_sentinel[circle] += 1
            elif status == 'zero':
                duration_zero[circle] += 1

            # Extract WSJF score if present (value proxy)
            wsjf = 0.0
            data = event.get('data') if isinstance(event.get('data'), dict) else {}
            if 'wsjf_score' in data:
                 try: wsjf = float(data['wsjf_score'])
                 except: pass
            elif 'wsjf' in data: # sometimes stored as object or number
                 try: wsjf = float(data['wsjf'])
                 except: pass

            if wsjf > 0:
                circle_wsjf_total[circle] += wsjf

            # Granular Value Accumulation
            # If explicit economic.revenue_impact is present, use it.
            # Else, if it's a "work done" pattern (e.g. action_completed), assign a default proxy value.
            economic = event.get('economic') if isinstance(event.get('economic'), dict) else {}
            explicit_impact = 0.0

            try:
                raw_impact = float(economic.get('revenue_impact', 0.0) or 0.0)
                explicit_impact = _calibrate_revenue_impact(circle, raw_impact)
            except Exception:
                explicit_impact = 0.0

            # Default Proxy Value Logic
            # If no explicit impact, we attribute "Implied Revenue" for verifiable work.
            # Base logic: Monthly Potential / ~1000 actions (heuristic for "one unit of work")
            implied_impact = 0.0
            if explicit_impact == 0 and pattern in ('action_completed', 'backlog_item_scored', 'decision_made', 'code_fix_applied'):
                 monthly = float(CIRCLE_REVENUE_IMPACT.get(circle, 0))
                 if monthly > 0:
                     # A generic "unit of work" is worth ~0.1% of monthly potential?
                     # e.g. Assessor ($2000) -> $2.00 per validated action
                     implied_impact = monthly * 0.001

            # Check for explicit energy cost override
            metrics = event.get('metrics') if isinstance(event.get('metrics'), dict) else {}
            explicit_energy_cost = 0.0
            try:
                if 'energy_cost_usd' in economic:
                    explicit_energy_cost = float(economic['energy_cost_usd'])
                elif 'energy_cost_usd' in metrics:
                    explicit_energy_cost = float(metrics['energy_cost_usd'])
            except: pass

            # If explicit cost provided, back-calculate KWh proxy if needed, or just track cost
            if explicit_energy_cost > 0:
                 # approximate kwh if cost given but kwh not
                 if usd_per_kwh > 0:
                     circle_energy_kwh[circle] += explicit_energy_cost / usd_per_kwh

            realized = explicit_impact + implied_impact
            circle_realized_revenue[circle] += realized

        # CapEx/OpEx tracking (if applicable)
            capex_ratios = []
            infra_utils = []
            try:
                capex = float(economic.get('capex_opex_ratio', 0.0) or 0.0)
                if capex > 0:
                    capex_ratios.append(capex)
            except Exception:
                pass
            try:
                util = float(economic.get('infrastructure_utilization', 0.0) or 0.0)
                if util > 0:
                    infra_utils.append(util)
            except Exception:
                pass

            circle_actions[circle] += 1

            # Pattern Value Accumulation (for granular reporting)
            pattern_stats[pattern]['count'] += 1
            pattern_stats[pattern]['circles'].add(circle)
            pattern_stats[pattern]['total_revenue'] += realized

            # Exclude sentinel durations from rollups (tracked separately)
            pattern_events = circle_patterns[circle]
            pattern_events.add(pattern)

            if status == 'ok' and duration_ms > 0:
                hours = duration_ms / (1000 * 60 * 60)
                circle_duration[circle] += hours
                pattern_stats[pattern]['duration_hours'] += hours

                # Energy Cost: (ms / 3.6e6) * (watts/1000) = kWh
                # Only add if we didn't use explicit cost above (or if explicit cost was 0)
                if explicit_energy_cost <= 0:
                    kwh = (duration_ms / 3600000.0) * (watts / 1000.0)
                    circle_energy_kwh[circle] += kwh

                # Labor Cost (Optional Scenario)
                if labor_rate > 0:
                    circle_labor_cost[circle] += hours * labor_rate

        # Calculate weighted revenue per action
        total_actions = sum(circle_actions.values())

        attribution = {}
        for circle, monthly_potential in CIRCLE_REVENUE_IMPACT.items():
            action_count = circle_actions.get(circle, 0)
            duration_hours = circle_duration.get(circle, 0)
            unique_patterns = len(circle_patterns.get(circle, set()))
            energy_kwh = circle_energy_kwh.get(circle, 0)
            energy_cost = energy_kwh * usd_per_kwh
            labor_cost = circle_labor_cost.get(circle, 0)
            wsjf_total = circle_wsjf_total.get(circle, 0)

            # Revenue per action (if actions exist)
            if total_actions > 0:
                action_ratio = action_count / total_actions
                allocated_revenue = CIRCLE_REVENUE_IMPACT[circle]
            else:
                action_ratio = 0
                allocated_revenue = 0

            realized = circle_realized_revenue.get(circle, 0.0)
            gross_value = realized if realized > 0 else allocated_revenue * action_ratio # fallback to allocated if no realized

            profit_dividend = max(0, gross_value - energy_cost - labor_cost)

            # Derived Metrics (Safe Defaults)
            value_per_hour = gross_value / duration_hours if duration_hours > 0 else 0.0
            wsjf_per_hour = wsjf_total / duration_hours if duration_hours > 0 else 0.0

            attribution[circle] = {
                'monthly_revenue_potential': CIRCLE_REVENUE_IMPACT[circle],
                'action_count': action_count,
                'action_ratio': round(action_ratio * 100, 2),
                'allocated_revenue': round(allocated_revenue * action_ratio, 2),
                'realized_revenue': round(circle_realized_revenue.get(circle, 0.0), 2),
                'duration_hours': round(duration_hours, 3),
                'value_per_hour': round(value_per_hour, 2),
                'wsjf_per_hour': round(wsjf_per_hour, 2),
                'energy_cost_usd': round(energy_cost, 4),
                'labor_cost_usd': round(labor_cost, 2),
                'profit_dividend_usd': round(profit_dividend, 2),
                'revenue_per_hour': round(gross_value / duration_hours, 2) if duration_hours > 0 else 0,
                'value_per_energy_usd': round(gross_value / energy_cost, 2) if energy_cost > 0 else 0,
                'unique_patterns': unique_patterns,
                'utilization_pct': round((action_count / max(circle_actions.values(), default=1)) * 100, 2) if action_count > 0 else 0,
                'revenue_outliers_clamped': revenue_outliers.get(circle, 0),
                'duration_missing_events': duration_missing.get(circle, 0),
                'duration_invalid_events': duration_invalid.get(circle, 0),
                'duration_sentinel_events': duration_sentinel.get(circle, 0),
                'duration_zero_events': duration_zero.get(circle, 0)
            }

        return attribution

    def _calculate_hhi(self, revenue_by_circle: Dict[str, Any]) -> float:
        values = [v.get('allocated_revenue', 0.0) for v in revenue_by_circle.values() if v.get('allocated_revenue', 0.0) > 0]
        total = sum(values)
        if total <= 0:
            return 0.0
        shares = [(v / total) for v in values]
        return round(sum(s * s for s in shares), 4)

    def calculate_revenue_by_pattern(self, events: List[Dict]) -> Dict[str, Any]:
        """Calculate revenue attribution by pattern."""
        pattern_stats = defaultdict(lambda: {
            'count': 0,
            'circles': set(),
            'total_revenue': 0,
            'duration_hours': 0
        })

        def _extract_duration_info(ev: Dict[str, Any]) -> Dict[str, Any]:
            if 'duration_ms' in ev:
                v = ev.get('duration_ms')
                if v is None:
                    return {'duration_ms': 0.0, 'status': 'missing', 'source': 'root'}
                if isinstance(v, (int, float)):
                    fv = float(v)
                    if fv == 0.0:
                        return {'duration_ms': fv, 'status': 'zero', 'source': 'root'}
                    return {'duration_ms': fv, 'status': 'ok', 'source': 'root'}
                return {'duration_ms': 0.0, 'status': 'invalid', 'source': 'root'}

            metrics = ev.get('metrics') if isinstance(ev.get('metrics'), dict) else {}
            if 'duration_ms' in metrics:
                v = metrics.get('duration_ms')
                if v is None:
                    return {'duration_ms': 0.0, 'status': 'missing', 'source': 'metrics'}
                if isinstance(v, (int, float)):
                    fv = float(v)
                    if fv == 0.0:
                        return {'duration_ms': fv, 'status': 'zero', 'source': 'metrics'}
                    return {'duration_ms': fv, 'status': 'ok', 'source': 'metrics'}
                return {'duration_ms': 0.0, 'status': 'invalid', 'source': 'metrics'}

            data = ev.get('data') if isinstance(ev.get('data'), dict) else {}
            if 'duration_ms' in data:
                v = data.get('duration_ms')
                if v is None:
                    return {'duration_ms': 0.0, 'status': 'missing', 'source': 'data'}
                if isinstance(v, (int, float)):
                    fv = float(v)
                    duration_measured = data.get('duration_measured')
                    sentinel = (
                        (fv == 1.0)
                        and ('duration_ms' not in ev)
                        and ('duration_ms' not in metrics)
                        and (duration_measured is False or duration_measured is None)
                    )
                    if sentinel:
                        return {'duration_ms': fv, 'status': 'sentinel', 'source': 'data'}
                    if fv == 0.0:
                        return {'duration_ms': fv, 'status': 'zero', 'source': 'data'}
                    return {'duration_ms': fv, 'status': 'ok', 'source': 'data'}
                return {'duration_ms': 0.0, 'status': 'invalid', 'source': 'data'}

            return {'duration_ms': 0.0, 'status': 'missing', 'source': 'absent'}

        for event in events:
            pattern = event.get('pattern', 'unknown')
            circle = event.get('circle', 'unknown')
            dur = _extract_duration_info(event)
            duration_ms = float(dur.get('duration_ms', 0.0) or 0.0)
            status = str(dur.get('status') or 'missing')

            revenue_impact = CIRCLE_REVENUE_IMPACT.get(circle, 0)

            pattern_stats[pattern]['count'] += 1
            pattern_stats[pattern]['circles'].add(circle)
            pattern_stats[pattern]['total_revenue'] += revenue_impact / 100  # Allocate 1% per action
            if status == 'ok' and duration_ms > 0:
                pattern_stats[pattern]['duration_hours'] += duration_ms / (1000 * 60 * 60)

        # Convert to serializable format
        result = {}
        for pattern, stats in pattern_stats.items():
            result[pattern] = {
                'action_count': stats['count'],
                'circles_used': list(stats['circles']),
                'estimated_revenue_contribution': round(stats['total_revenue'], 2),
                'duration_hours': round(stats['duration_hours'], 2),
                'revenue_per_hour': round(stats['total_revenue'] / stats['duration_hours'], 2) if stats['duration_hours'] > 0 else 0
            }

        return result

    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive revenue attribution report."""
        events = self.load_events()

        if not events:
            return {
                'error': 'No events found',
                'hours_analyzed': self.hours,
                'event_count': 0
            }

        circle_attribution = self.calculate_revenue_by_circle(events)
        pattern_attribution = self.calculate_revenue_by_pattern(events)

        # Calculate totals
        total_allocated = sum(c['allocated_revenue'] for c in circle_attribution.values())
        total_realized = sum(c.get('realized_revenue', 0.0) for c in circle_attribution.values())
        total_actions = sum(c['action_count'] for c in circle_attribution.values())
        total_duration = sum(c['duration_hours'] for c in circle_attribution.values())

        total_wsjf = 0.0
        for c in circle_attribution.values():
            try:
                wsjf_ph = float(c.get('wsjf_per_hour', 0.0) or 0.0)
                dur_h = float(c.get('duration_hours', 0.0) or 0.0)
                total_wsjf += wsjf_ph * dur_h
            except Exception:
                continue

        # New Economic Totals
        total_energy_cost = sum(c.get('energy_cost_usd', 0.0) for c in circle_attribution.values())
        total_labor_cost = sum(c.get('labor_cost_usd', 0.0) for c in circle_attribution.values())
        total_profit_dividend = sum(c.get('profit_dividend_usd', 0.0) for c in circle_attribution.values())

        total_outliers = sum(c.get('revenue_outliers_clamped', 0) for c in circle_attribution.values())
        total_duration_missing = sum(c.get('duration_missing_events', 0) for c in circle_attribution.values())
        total_duration_invalid = sum(c.get('duration_invalid_events', 0) for c in circle_attribution.values())
        total_duration_sentinel = sum(c.get('duration_sentinel_events', 0) for c in circle_attribution.values())
        total_duration_zero = sum(c.get('duration_zero_events', 0) for c in circle_attribution.values())

        hhi = self._calculate_hhi(circle_attribution)

        # Identify top performers
        top_circles_by_revenue = sorted(
            [(c, data['allocated_revenue']) for c, data in circle_attribution.items()],
            key=lambda x: x[1],
            reverse=True
        )[:5]

        top_patterns_by_revenue = sorted(
            [(p, data['estimated_revenue_contribution']) for p, data in pattern_attribution.items()],
            key=lambda x: x[1],
            reverse=True
        )[:10]

        return {
            'summary': {
                'total_monthly_revenue_potential': TOTAL_MONTHLY_REVENUE,
                'allocated_revenue': round(total_allocated, 2),
                'realized_revenue': round(total_realized, 2),
                'allocation_efficiency_pct': round((total_allocated / TOTAL_MONTHLY_REVENUE) * 100, 2),
                'revenue_concentration_hhi': hhi,
                'total_actions': total_actions,
                'total_duration_hours': round(total_duration, 4),
                'total_energy_cost_usd': round(total_energy_cost, 4),
                'total_labor_cost_usd': round(total_labor_cost, 2),
                'total_profit_dividend_usd': round(total_profit_dividend, 2),
                'revenue_per_action': round(total_allocated / total_actions, 2) if total_actions > 0 else 0,
                'revenue_per_hour': round(total_allocated / total_duration, 2) if total_duration > 0 else 0,
                'value_per_energy_usd': round(total_allocated / total_energy_cost, 2) if total_energy_cost > 0 else 0,
                'wsjf_per_hour': round(total_wsjf / total_duration, 2) if total_duration > 0 else 0,
                'revenue_impact_outliers_clamped': int(total_outliers),
                'duration_missing_events': int(total_duration_missing),
                'duration_invalid_events': int(total_duration_invalid),
                'duration_sentinel_events': int(total_duration_sentinel),
                'duration_zero_events': int(total_duration_zero),
                'hours_analyzed': self.hours,
                'event_count': len(events),
                'economic_compounding': round(total_allocated / total_duration, 2) if total_duration > 0 else 0,
                'value_per_hour': round(total_allocated / total_duration, 2) if total_duration > 0 else 0,
                'generated_at': datetime.now(timezone.utc).isoformat()
            },
            'revenue_by_circle': circle_attribution,
            'revenue_by_pattern': pattern_attribution,
            'top_performers': {
                'circles': [{'circle': c, 'revenue': r} for c, r in top_circles_by_revenue],
                'patterns': [{'pattern': p, 'revenue': r} for p, r in top_patterns_by_revenue]
            },
            'recommendations': self._generate_recommendations(circle_attribution, total_allocated)
        }

    def _generate_recommendations(self, circle_attribution: Dict, total_allocated: float) -> List[Dict]:
        """Generate actionable recommendations based on revenue attribution."""
        recommendations = []

        # Check for high-value underutilized circles
        for circle, data in circle_attribution.items():
            potential = data['monthly_revenue_potential']
            allocated = data['allocated_revenue']
            utilization = data['utilization_pct']

            if potential >= 2000 and utilization < 50:
                recommendations.append({
                    'type': 'revenue_opportunity',
                    'priority': 'high',
                    'circle': circle,
                    'action': f'Increase activity in {circle} circle',
                    'current_utilization': f'{utilization}%',
                    'potential_revenue_gain': f'+${round(potential * 0.5, 0)}/mo',
                    'justification': f'{circle} has high revenue potential (${potential}/mo) but low utilization'
                })

        # Check for allocation efficiency
        allocation_efficiency = (total_allocated / TOTAL_MONTHLY_REVENUE) * 100
        if allocation_efficiency < 50:
            recommendations.append({
                'type': 'allocation_efficiency',
                'priority': 'medium',
                'circle': 'all',
                'action': 'Increase overall activity across high-value circles',
                'current_efficiency': f'{round(allocation_efficiency, 1)}%',
                'potential_revenue_gain': f'+${round((TOTAL_MONTHLY_REVENUE - total_allocated) * 0.3, 0)}/mo',
                'justification': 'Low allocation efficiency suggests underutilization of revenue potential'
            })

        # Check for revenue concentration risk
        top_3_revenue = sum(sorted([c['allocated_revenue'] for c in circle_attribution.values()], reverse=True)[:3])
        if total_allocated > 0 and (top_3_revenue / total_allocated) > 0.7:
            recommendations.append({
                'type': 'revenue_diversification',
                'priority': 'low',
                'circle': 'multiple',
                'action': 'Diversify revenue sources across more circles',
                'current_concentration': f'{round((top_3_revenue / total_allocated) * 100, 1)}% in top 3 circles',
                'risk': 'High revenue concentration increases vulnerability',
                'justification': 'More than 70% of revenue from top 3 circles creates concentration risk'
            })

        return recommendations

    def save_to_capex_tracking(self, report: Dict):
        """Save revenue attribution to CapEx tracking file."""
        capex_file = GOALIE_DIR / "capex_revenue_tracking.yaml"

        if not capex_file.exists():
            print(f"CapEx tracking file not found: {capex_file}")
            return

        try:
            import yaml

            with open(capex_file, 'r') as f:
                capex_data = yaml.safe_load(f) or {}

            # Add revenue attribution section
            if 'revenue_attribution' not in capex_data:
                capex_data['revenue_attribution'] = {}

            capex_data['revenue_attribution']['last_updated'] = report['summary']['generated_at']
            capex_data['revenue_attribution']['by_circle'] = {
                circle: {
                    'monthly_potential': CIRCLE_REVENUE_IMPACT[circle],
                    'allocated_revenue': data['allocated_revenue'],
                    'utilization_pct': data['utilization_pct']
                }
                for circle, data in report['revenue_by_circle'].items()
            }
            capex_data['revenue_attribution']['summary'] = {
                'total_potential': report['summary']['total_monthly_revenue_potential'],
                'total_allocated': report['summary']['allocated_revenue'],
                'efficiency_pct': report['summary']['allocation_efficiency_pct']
            }

            with open(capex_file, 'w') as f:
                yaml.dump(capex_data, f, default_flow_style=False, sort_keys=False)

            print(f"✅ Revenue attribution saved to {capex_file}")

        except Exception as e:
            print(f"❌ Error saving to CapEx tracking: {e}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Revenue Impact Attribution Engine')
    parser.add_argument('--hours', type=int, default=720, help='Hours of data to analyze (default: 30 days)')
    parser.add_argument('--json', action='store_true', help='Output JSON format')
    parser.add_argument('--save', action='store_true', help='Save to CapEx tracking file')
    parser.add_argument('--circle', help='Filter by specific circle')
    parser.add_argument('--correlation-id', dest='correlation_id', help='Filter by correlation_id (per-run scoping)')
    parser.add_argument('--include-run-kinds', default='', help='Comma-separated run_kind values to include')
    parser.add_argument('--exclude-run-kinds', default='manual,unknown', help='Comma-separated run_kind values to exclude (default: manual,unknown)')

    args = parser.parse_args()

    include_run_kinds = [v.strip() for v in args.include_run_kinds.split(',') if v.strip()]
    exclude_run_kinds = [v.strip() for v in args.exclude_run_kinds.split(',') if v.strip()]
    attributor = RevenueAttributor(hours=args.hours, include_run_kinds=include_run_kinds, exclude_run_kinds=exclude_run_kinds, correlation_id=args.correlation_id)
    report = attributor.generate_report()

    if args.save:
        attributor.save_to_capex_tracking(report)

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        # Pretty print report
        summary = report['summary']
        print("\n" + "="*70)
        print("💰 REVENUE IMPACT ATTRIBUTION REPORT")
        print("="*70)
        print(f"\n📊 SUMMARY (Last {summary['hours_analyzed']} hours)")
        print(f"   Total Monthly Revenue Potential: ${summary['total_monthly_revenue_potential']:,}")
        print(f"   Allocated Revenue: ${summary['allocated_revenue']:,.2f}")
        print(f"   Allocation Efficiency: {summary['allocation_efficiency_pct']:.1f}%")
        print(f"   Total Actions: {summary['total_actions']:,}")
        print(f"   Revenue per Action: ${summary['revenue_per_action']:.2f}")
        print(f"   Revenue per Hour: ${summary['revenue_per_hour']:.2f}")

        print(f"\n🎯 REVENUE BY CIRCLE")
        print(f"   {'Circle':<15} {'Potential':<12} {'Allocated':<12} {'Actions':<10} {'Utilization':<12}")
        print("   " + "-"*65)

        for circle, data in sorted(report['revenue_by_circle'].items(),
                                   key=lambda x: x[1]['allocated_revenue'], reverse=True):
            if data['action_count'] > 0:
                print(f"   {circle:<15} ${data['monthly_revenue_potential']:<11,} "
                      f"${data['allocated_revenue']:<11,.2f} {data['action_count']:<10,} "
                      f"{data['utilization_pct']:<11.1f}%")

        print(f"\n🔝 TOP PATTERNS BY REVENUE")
        for i, item in enumerate(report['top_performers']['patterns'][:5], 1):
            print(f"   {i}. {item['pattern']}: ${item['revenue']:.2f}")

        if report['recommendations']:
            print(f"\n💡 RECOMMENDATIONS")
            for i, rec in enumerate(report['recommendations'], 1):
                print(f"   {i}. [{rec['priority'].upper()}] {rec['action']}")
                print(f"      Impact: {rec.get('potential_revenue_gain', 'N/A')}")

        print("\n" + "="*70)


if __name__ == '__main__':
    main()
