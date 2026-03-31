#!/usr/bin/env python3
"""
Actionable Context Engine with WSJF Protocols
Generates context-rich, execution-ready recommendations with forward/backtesting strategies
and incremental relentless execution patterns
"""

import json
import os
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Tuple
from dataclasses import dataclass, asdict
import statistics


def get_goalie_dir() -> Path:
    """Get .goalie directory path"""
    project_root = os.environ.get("PROJECT_ROOT", ".")
    return Path(project_root) / ".goalie"


def load_recent_events(hours: int = 24, limit: int = 200) -> List[Dict[str, Any]]:
    """Load recent pattern events"""
    metrics_file = get_goalie_dir() / "pattern_metrics.jsonl"
    
    if not metrics_file.exists():
        return []
    
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    events = []
    
    with open(metrics_file, 'r') as f:
        lines = f.readlines()
        # Read last N lines for efficiency
        for line in lines[-limit:]:
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
                # Parse timestamp (handle both 'ts' and 'timestamp' fields)
                ts_str = event.get("timestamp") or event.get("ts", "")
                if ts_str:
                    try:
                        event_time = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                        if event_time > cutoff:
                            events.append(event)
                    except:
                        # Include if timestamp parse fails (assume recent)
                        events.append(event)
            except json.JSONDecodeError:
                continue
    
    return events


class RecommendationEngine:
    """Generate actionable recommendations from pattern analysis with confidence scoring"""
    
    def __init__(self, events: List[Dict[str, Any]]):
        self.events = events
        self.recommendations = []
        self.historical_baselines = self._compute_baselines()
    
    def _compute_baselines(self) -> Dict[str, Any]:
        """Compute historical baselines for comparison"""
        baselines = {
            "avg_cod": 0,
            "avg_wsjf": 0,
            "avg_risk": 0,
            "pattern_counts": Counter(),
            "circle_counts": Counter()
        }
        
        cods = []
        wsjfs = []
        risks = []
        
        for e in self.events:
            # CoD tracking
            cod = e.get("economic", {}).get("cost_of_delay", 0)
            if cod > 0:
                cods.append(cod)
            
            # WSJF tracking
            wsjf = e.get("economic", {}).get("wsjf_score", 0)
            if wsjf > 0:
                wsjfs.append(wsjf)
            
            # Risk tracking
            risk = e.get("risk_score", 0)
            if risk > 0:
                risks.append(risk)
            
            # Pattern and circle counts
            pattern = e.get("pattern", "unknown")
            circle = e.get("circle", "unknown")
            baselines["pattern_counts"][pattern] += 1
            baselines["circle_counts"][circle] += 1
        
        if cods:
            baselines["avg_cod"] = statistics.mean(cods)
        if wsjfs:
            baselines["avg_wsjf"] = statistics.mean(wsjfs)
        if risks:
            baselines["avg_risk"] = statistics.mean(risks)
        
        return baselines
    
    def _calculate_confidence(self, data_points: int, threshold: int = 5) -> float:
        """Calculate confidence score (0-100%) based on data sufficiency"""
        if data_points >= threshold * 2:
            return 95.0
        elif data_points >= threshold:
            return 75.0
        elif data_points >= threshold // 2:
            return 50.0
        else:
            return 25.0
    
    def analyze_all(self):
        """Run all analysis rules (18 total: 6 existing + 8 enhanced + 4 economic)"""
        # Existing rules
        self.detect_repeated_failures()
        self.detect_depth_oscillation()
        self.detect_observability_gaps()
        self.detect_high_cod_patterns()
        self.detect_governance_issues()
        self.detect_low_wsjf_items()
        
        # Enhanced rules
        self.detect_pattern_correlation()
        self.detect_economic_drift()
        self.detect_velocity_stagnation()
        self.detect_flow_bottlenecks()
        self.detect_risk_clustering()
        self.detect_time_decay_anomalies()
        self.detect_circle_misalignment()
        self.detect_execution_phase_skips()
        
        # Economic rules
        self.detect_capex_roi_threshold()
        self.detect_opex_runaway()
        self.detect_infrastructure_underutilization()
        self.detect_revenue_concentration_risk()
        
        # Sort by priority, then confidence
        return sorted(self.recommendations, 
                     key=lambda x: (x["priority"], x.get("confidence", 0)), 
                     reverse=True)
    
    def detect_repeated_failures(self):
        """Detect patterns with repeated failures (excluding metadata events)"""
        # Filter out metadata events (unknown run_kind) - these are not real failures
        failed = [e for e in self.events 
                 if not e.get("action_completed") 
                 and e.get("run_kind", "unknown") != "unknown"]
        
        if len(failed) >= 3:
            failure_patterns = Counter(e.get("pattern") for e in failed)
            for pattern, count in failure_patterns.most_common(2):
                if count >= 2:
                    self.recommendations.append({
                        "priority": 9,
                        "category": "Risk",
                        "title": f"Reduce {pattern} failures ({count} occurrences recently)",
                        "action": f"Investigate root cause in pattern_metrics.jsonl filtered by {pattern}",
                        "impact": f"-{count*10}% CoD, +{count*5}% stability",
                        "command": f"./scripts/af pattern-stats --pattern {pattern}",
                        "auto_fixable": False,
                        "confidence": self._calculate_confidence(count, threshold=2)
                    })
    
    def detect_depth_oscillation(self):
        """Detect frequent depth changes (instability) - only count actual value changes"""
        depth_changes = []
        prev_depth = None
        
        for e in self.events:
            # Only look at observability_first events which track depth
            if e.get("pattern") != "observability_first":
                continue
                
            depth = e.get("metrics", {}).get("final_depth") or e.get("metrics", {}).get("depth", 0)
            if depth and prev_depth is not None and depth != prev_depth:
                depth_changes.append((prev_depth, depth))
            if depth:
                prev_depth = depth
        
        # Only alert if actual oscillation (3+ unique depth values)
        unique_depths = set([d[0] for d in depth_changes] + [d[1] for d in depth_changes])
        if len(unique_depths) >= 3 and len(depth_changes) >= 5:
            self.recommendations.append({
                "priority": 7,
                "category": "Stability",
                "title": f"High depth oscillation detected ({len(unique_depths)} unique depths, {len(depth_changes)} changes)",
                "action": "Review safe_degrade triggers and stabilize depth strategy",
                "impact": f"-15% cycle variance, +10% predictability",
                "command": "./scripts/af pattern-stats --pattern safe_degrade",
                "auto_fixable": False,
                "confidence": self._calculate_confidence(len(depth_changes), threshold=5)
            })
    
    def detect_observability_gaps(self):
        """Detect low observability coverage"""
        obs_events = [e for e in self.events if e.get("pattern") == "observability_first"]
        total_events = len(self.events)
        
        if total_events > 10:
            coverage = len(obs_events) / total_events
            if coverage < 0.05:  # Less than 5%
                self.recommendations.append({
                    "priority": 8,
                    "category": "Observability",
                    "title": f"Low observability coverage ({coverage*100:.1f}%)",
                    "action": "Enable AF_PROD_OBSERVABILITY_FIRST=1 in environment",
                    "impact": f"+{(0.9-coverage)*100:.0f}% coverage, +5 WSJF",
                    "command": "export AF_PROD_OBSERVABILITY_FIRST=1",
                    "auto_fixable": True,
                    "confidence": self._calculate_confidence(total_events, threshold=10)
                })
    
    def detect_high_cod_patterns(self):
        """Detect patterns with high Cost of Delay"""
        cod_by_pattern = defaultdict(list)
        
        for e in self.events:
            pattern = e.get("pattern")
            cod = e.get("economic", {}).get("cost_of_delay", 0)
            if cod > 0:
                cod_by_pattern[pattern].append(cod)
        
        for pattern, cods in cod_by_pattern.items():
            avg_cod = sum(cods) / len(cods)
            if avg_cod > 100:
                self.recommendations.append({
                    "priority": 6,
                    "category": "Economics",
                    "title": f"High CoD in {pattern} pattern (avg: {avg_cod:.1f})",
                    "action": f"Prioritize tasks addressing {pattern} in circle backlogs",
                    "impact": f"-{avg_cod*0.2:.1f} potential CoD savings",
                    "command": f"./scripts/af wsjf-replenish --pattern {pattern}",
                    "auto_fixable": False,
                    "confidence": self._calculate_confidence(len(cods), threshold=5)
                })
                break  # Only show top issue
    
    def detect_governance_issues(self):
        """Detect governance-related issues"""
        preflight_failed = [e for e in self.events 
                          if e.get("pattern") == "preflight_check" 
                          and e.get("data", {}).get("status") == "failed"]
        
        if len(preflight_failed) >= 2:
            self.recommendations.append({
                "priority": 10,  # Highest priority
                "category": "Governance",
                "title": f"Multiple preflight check failures ({len(preflight_failed)})",
                "action": "Review schema compliance and governance risk score",
                "impact": "Critical - blocks prod-cycle execution",
                "command": "./scripts/af prod-cycle --mode advisory",
                "auto_fixable": False,
                "confidence": self._calculate_confidence(len(preflight_failed), threshold=2)
            })
    
    def detect_low_wsjf_items(self):
        """Detect backlog items that need WSJF enrichment"""
        wsjf_events = [e for e in self.events if e.get("pattern") == "wsjf_enrichment"]
        replenish_events = [e for e in self.events if e.get("pattern") == "replenish_circle"]
        
        if len(replenish_events) == 0 and len(self.events) > 20:
            self.recommendations.append({
                "priority": 5,
                "category": "Prioritization",
                "title": "No WSJF replenishment detected recently",
                "action": "Run WSJF replenishment for all circles",
                "impact": "+20% prioritization accuracy",
                "command": "./scripts/circles/replenish_all_circles.sh --auto-calc-wsjf",
                "auto_fixable": True,            })
    
    def detect_pattern_correlation(self):
        """Detect when multiple patterns fail together (correlated failures)"""
        from itertools import combinations
        
        failed_events = [e for e in self.events if not e.get("action_completed")]
        if len(failed_events) < 4:
            return
        
        # Group failures by time window (5 min)
        time_windows = defaultdict(list)
        for e in failed_events:
            ts_str = e.get("timestamp") or e.get("ts", "")
            try:
                event_time = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                window_key = event_time.replace(second=0, microsecond=0, minute=(event_time.minute // 5) * 5)
                time_windows[window_key].append(e.get("pattern"))
            except:
                continue
        
        # Find co-occurring failures
        correlations = Counter()
        for patterns in time_windows.values():
            if len(patterns) >= 2:
                for pair in combinations(sorted(set(patterns)), 2):
                    correlations[pair] += 1
        
        for (p1, p2), count in correlations.most_common(1):
            if count >= 2:
                self.recommendations.append({
                    "priority": 8,
                    "category": "Risk",
                    "title": f"Pattern correlation: {p1} + {p2} fail together ({count}x)",
                    "action": f"Investigate shared dependencies between {p1} and {p2}",
                    "impact": f"-{count*15}% failure cascade risk",
                    "command": f"./scripts/af pattern-stats --patterns {p1},{p2}",
                    "auto_fixable": False,
                    "confidence": self._calculate_confidence(count, threshold=2)
                })
    
    def detect_economic_drift(self):
        """Detect when WSJF scores diverge from historical baselines"""
        if self.historical_baselines["avg_wsjf"] == 0:
            return
        
        recent_wsjfs = []
        for e in self.events[-50:]:  # Last 50 events
            wsjf = e.get("economic", {}).get("wsjf_score", 0)
            if wsjf > 0:
                recent_wsjfs.append(wsjf)
        
        if len(recent_wsjfs) < 10:
            return
        
        recent_avg = statistics.mean(recent_wsjfs)
        baseline_avg = self.historical_baselines["avg_wsjf"]
        drift_pct = abs((recent_avg - baseline_avg) / baseline_avg) * 100
        
        if drift_pct > 30:  # >30% drift
            direction = "increased" if recent_avg > baseline_avg else "decreased"
            self.recommendations.append({
                "priority": 7,
                "category": "Economics",
                "title": f"Economic drift: WSJF {direction} {drift_pct:.1f}% from baseline",
                "action": "Review WSJF calculation parameters and circle weights",
                "impact": f"Realign ~{drift_pct:.0f}% of priorities",
                "command": "./scripts/circles/wsjf_calculator.py --circle all --aggregate",
                "auto_fixable": False,
                "confidence": self._calculate_confidence(len(recent_wsjfs), threshold=10)
            })
    
    def detect_velocity_stagnation(self):
        """Detect circles with declining velocity over 2+ weeks"""
        # Group events by circle and week
        circle_weeks = defaultdict(lambda: defaultdict(int))
        
        for e in self.events:
            circle = e.get("circle", "unknown")
            ts_str = e.get("timestamp") or e.get("ts", "")
            try:
                event_time = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                week_key = event_time.isocalendar()[1]  # Week number
                if e.get("action_completed"):
                    wsjf = e.get("economic", {}).get("wsjf_score", 0)
                    circle_weeks[circle][week_key] += wsjf
            except:
                continue
        
        for circle, weeks in circle_weeks.items():
            if len(weeks) < 2:
                continue
            
            sorted_weeks = sorted(weeks.items())
            if len(sorted_weeks) < 2:
                continue
            
            # Compare last 2 weeks
            prev_velocity = sorted_weeks[-2][1]
            curr_velocity = sorted_weeks[-1][1]
            
            if prev_velocity > 0:
                decline_pct = ((prev_velocity - curr_velocity) / prev_velocity) * 100
                if decline_pct > 20:  # >20% decline
                    self.recommendations.append({
                        "priority": 7,
                        "category": "Performance",
                        "title": f"Velocity stagnation in {circle}: -{decline_pct:.1f}% over 2 weeks",
                        "action": f"Review {circle} backlog and remove blockers",
                        "impact": f"+{decline_pct:.0f}% velocity recovery potential",
                        "command": f"./scripts/af velocity-tracker --circle {circle}",
                        "auto_fixable": False,
                        "confidence": self._calculate_confidence(len(weeks), threshold=2)
                    })
                    break  # One recommendation per analysis
    
    def detect_flow_bottlenecks(self):
        """Detect blocked work items accumulating in specific phases"""
        phase_durations = defaultdict(list)
        
        # Track time in each phase
        for e in self.events:
            phase = e.get("phase", "unknown")
            duration = e.get("duration_ms", 0)
            if duration > 0:
                phase_durations[phase].append(duration)
        
        for phase, durations in phase_durations.items():
            if len(durations) < 5:
                continue
            
            avg_duration = statistics.mean(durations)
            if avg_duration > 5000:  # >5 seconds average
                self.recommendations.append({
                    "priority": 6,
                    "category": "Flow",
                    "title": f"Bottleneck in {phase} phase: {avg_duration/1000:.1f}s avg",
                    "action": f"Optimize {phase} phase execution or increase parallelism",
                    "impact": f"-{(avg_duration-1000)/1000:.1f}s potential time savings",
                    "command": f"./scripts/af flow-efficiency --phase {phase}",
                    "auto_fixable": False,
                    "confidence": self._calculate_confidence(len(durations), threshold=5)
                })
                break
    
    def detect_risk_clustering(self):
        """Detect patterns with repeated high-risk executions"""
        pattern_risks = defaultdict(list)
        
        for e in self.events:
            pattern = e.get("pattern", "unknown")
            risk = e.get("risk_score", 0)
            if risk > 0:
                pattern_risks[pattern].append(risk)
        
        for pattern, risks in pattern_risks.items():
            if len(risks) < 3:
                continue
            
            avg_risk = statistics.mean(risks)
            if avg_risk > 7.0:  # High risk threshold
                self.recommendations.append({
                    "priority": 8,
                    "category": "Risk",
                    "title": f"Risk clustering in {pattern}: {avg_risk:.1f} avg risk score",
                    "action": f"Add guardrails or circuit breakers to {pattern}",
                    "impact": f"-{(avg_risk-5.0):.1f} risk score reduction",
                    "command": f"./scripts/af pattern-stats --pattern {pattern} --show-risk",
                    "auto_fixable": False,
                    "confidence": self._calculate_confidence(len(risks), threshold=3)
                })
                break
    
    def detect_time_decay_anomalies(self):
        """Detect high-WSJF items aging despite priority"""
        # This requires creation_date in events - for now, detect stale high-priority items
        high_wsjf_patterns = defaultdict(int)
        
        for e in self.events:
            wsjf = e.get("economic", {}).get("wsjf_score", 0)
            if wsjf > 15:  # High WSJF
                pattern = e.get("pattern", "unknown")
                high_wsjf_patterns[pattern] += 1
        
        # If same high-WSJF pattern appears many times without resolution
        for pattern, count in high_wsjf_patterns.items():
            if count > 5:
                self.recommendations.append({
                    "priority": 6,
                    "category": "Prioritization",
                    "title": f"Time decay anomaly: {pattern} stuck with high WSJF ({count} occurrences)",
                    "action": f"Investigate why {pattern} not completing despite high priority",
                    "impact": "+50% completion rate for stuck items",
                    "command": f"./scripts/af backlog-analysis --pattern {pattern}",
                    "auto_fixable": False,
                    "confidence": self._calculate_confidence(count, threshold=5)
                })
                break
    
    def detect_circle_misalignment(self):
        """Detect work in wrong circle based on WSJF weights"""
        # Analyze if circles are handling work misaligned with their weights
        circle_patterns = defaultdict(Counter)
        
        for e in self.events:
            circle = e.get("circle", "unknown")
            pattern = e.get("pattern", "unknown")
            circle_patterns[circle][pattern] += 1
        
        # Simple heuristic: if orchestrator has many "learning" patterns, flag it
        orchestrator_patterns = circle_patterns.get("orchestrator", Counter())
        learning_patterns = sum(1 for p in orchestrator_patterns if "experiment" in p or "explore" in p)
        
        if learning_patterns > 3:
            self.recommendations.append({
                "priority": 5,
                "category": "Organization",
                "title": f"Circle misalignment: orchestrator handling {learning_patterns} learning tasks",
                "action": "Consider moving exploratory work to innovator or seeker circles",
                "impact": "+15% circle efficiency through proper work allocation",
                "command": "./scripts/af circle-workload-analysis",
                "auto_fixable": False,
                "confidence": self._calculate_confidence(learning_patterns, threshold=3)
            })
    
    def detect_execution_phase_skips(self):
        """Detect missing phases in incremental execution"""
        expected_phases = ["plan", "prepare", "execute", "validate"]
        pattern_phases = defaultdict(set)
        
        for e in self.events:
            pattern = e.get("pattern", "unknown")
            phase = e.get("phase", "unknown")
            if phase != "unknown":
                pattern_phases[pattern].add(phase)
        
        for pattern, phases in pattern_phases.items():
            if len(phases) < 3:  # Missing at least 2 phases
                missing = set(expected_phases) - phases
                if missing:
                    self.recommendations.append({
                        "priority": 6,
                        "category": "Process",
                        "title": f"Execution phase skips in {pattern}: missing {', '.join(missing)}",
                        "action": f"Ensure {pattern} follows full incremental execution flow",
                        "impact": "+25% execution reliability through complete phases",
                        "command": f"./scripts/af execution-audit --pattern {pattern}",
                        "auto_fixable": False,
                        "confidence": self._calculate_confidence(len(phases), threshold=2)
                    })
                    break
    
    def detect_capex_roi_threshold(self):
        """Detect if CapEx ROI is below 100% annually"""
        # Check for revenue_impact in economic fields
        revenue_impacts = [e.get('economic', {}).get('revenue_impact', 0) for e in self.events]
        total_revenue = sum(r for r in revenue_impacts if r > 0)
        
        # Assume $35,450 CapEx (from plan)
        capex = 35450
        annual_revenue = total_revenue * 365 / (len(self.events) / 24) if len(self.events) > 24 else total_revenue * 365
        roi_pct = (annual_revenue / capex * 100) if capex > 0 else 0
        
        if roi_pct < 100 and roi_pct > 0:
            self.recommendations.append({
                "priority": 8,
                "category": "Economic",
                "title": f"CapEx ROI below threshold: {roi_pct:.1f}% annually",
                "action": "Increase high-value circle activity or reduce infrastructure costs",
                "impact": f"Target: 100%+ ROI, Current: {roi_pct:.1f}%",
                "command": "python3 scripts/agentic/revenue_attribution.py --hours 720",
                "auto_fixable": False,
                "confidence": self._calculate_confidence(len([r for r in revenue_impacts if r > 0]), threshold=10)
            })
    
    def detect_opex_runaway(self):
        """Detect if OpEx is growing >10% month-over-month"""
        # This would need historical OpEx data - for now, check if OpEx > $1,500/mo
        opex_threshold = 1500
        current_opex = 1145  # From plan
        
        if current_opex > opex_threshold:
            growth_pct = ((current_opex - 1000) / 1000) * 100
            self.recommendations.append({
                "priority": 7,
                "category": "Economic",
                "title": f"OpEx approaching threshold: ${current_opex}/mo",
                "action": "Review cloud costs, API usage, and software licenses for optimization",
                "impact": f"Potential savings: ${current_opex - 1000:.0f}/mo",
                "command": "python3 scripts/agentic/economic_attribution.py --opex",
                "auto_fixable": False,
                "confidence": 75.0
            })
    
    def detect_infrastructure_underutilization(self):
        """Detect if infrastructure utilization < 50%"""
        # Check for infrastructure_utilization in economic fields
        utilizations = [e.get('economic', {}).get('infrastructure_utilization', 0) for e in self.events]
        valid_utils = [u for u in utilizations if u > 0]
        
        if valid_utils:
            avg_util = statistics.mean(valid_utils)
            if avg_util < 50:
                self.recommendations.append({
                    "priority": 6,
                    "category": "Economic",
                    "title": f"Infrastructure underutilization: {avg_util:.1f}% average",
                    "action": "Consider rightsizing infrastructure or increasing workload",
                    "impact": f"Potential cost reduction: ${(100 - avg_util) * 2:.0f}/mo",
                    "command": "python3 scripts/agentic/economic_attribution.py --infrastructure",
                    "auto_fixable": False,
                    "confidence": self._calculate_confidence(len(valid_utils), threshold=5)
                })
    
    def detect_revenue_concentration_risk(self):
        """Detect if >60% revenue from one circle"""
        # Group revenue by circle
        circle_revenue = defaultdict(float)
        for e in self.events:
            circle = e.get('circle', 'unknown')
            revenue = e.get('economic', {}).get('revenue_impact', 0)
            if revenue > 0:
                circle_revenue[circle] += revenue
        
        total = sum(circle_revenue.values())
        if total > 0:
            # Check if any single circle > 60%
            for circle, revenue in circle_revenue.items():
                concentration = (revenue / total) * 100
                if concentration > 60:
                    self.recommendations.append({
                        "priority": 5,
                        "category": "Economic",
                        "title": f"Revenue concentration risk: {concentration:.1f}% from {circle}",
                        "action": "Diversify revenue sources across more circles",
                        "impact": "Reduced risk, more balanced portfolio",
                        "command": "python3 scripts/agentic/revenue_attribution.py --json",
                        "auto_fixable": False,
                        "confidence": self._calculate_confidence(len(circle_revenue), threshold=3)
                    })
                    break


def print_recommendations(recommendations: List[Dict[str, Any]], json_output: bool = False):
    """Print recommendations in human-readable or JSON format"""
    if json_output:
        print(json.dumps({"recommendations": recommendations}, indent=2))
        return
    
    if not recommendations:
        print("✅ No critical recommendations - system operating normally")
        return
    
    print("=" * 70)
    print("🎯 ACTIONABLE RECOMMENDATIONS")
    print("=" * 70)
    print(f"\nAnalyzed {len(recommendations)} potential improvements")
    print("Priority: P10 (Critical) → P1 (Low)\n")
    
    for i, rec in enumerate(recommendations, 1):
        priority = rec["priority"]
        category = rec["category"]
        title = rec["title"]
        action = rec["action"]
        impact = rec["impact"]
        command = rec.get("command", "N/A")
        auto_fix = rec.get("auto_fixable", False)
        confidence = rec.get("confidence", 0)
        
        priority_label = "🔴 CRITICAL" if priority >= 9 else "🟡 HIGH" if priority >= 7 else "🟢 MEDIUM"
        auto_label = "🤖 Auto-fixable" if auto_fix else "👤 Manual"
        confidence_label = f"📊 {confidence:.0f}% confidence"
        
        print(f"{i}. {priority_label} [{category}] {title}")
        print(f"   Action: {action}")
        print(f"   Impact: {impact}")
        print(f"   Command: {command}")
        print(f"   {auto_label} | {confidence_label}")
        print()


def export_to_kanban(recommendations: List[Dict[str, Any]], priority_threshold: int = 7):
    """Export high-priority recommendations to KANBAN board"""
    critical_recs = [r for r in recommendations if r["priority"] >= priority_threshold]
    
    if not critical_recs:
        return
    
    kanban_file = get_goalie_dir() / "KANBAN_BOARD.yaml"
    
    # TODO: Implement YAML append logic
    # For now, just print what would be added
    print(f"\n📋 {len(critical_recs)} high-priority items ready for KANBAN:")
    for rec in critical_recs:
        print(f"   • {rec['title']}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Actionable Context Engine")
    parser.add_argument("--hours", type=int, default=24, help="Hours of history to analyze")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--export-kanban", action="store_true", help="Export to KANBAN board")
    parser.add_argument("--auto-fix", action="store_true", help="Automatically apply fixable recommendations")
    
    args = parser.parse_args()
    
    events = load_recent_events(hours=args.hours)
    
    if not events:
        print(f"No pattern events found in last {args.hours} hours", file=sys.stderr)
        sys.exit(1)
    
    # Generate recommendations
    engine = RecommendationEngine(events)
    recommendations = engine.analyze_all()
    
    # Print results
    print_recommendations(recommendations, json_output=args.json)
    
    # Export to KANBAN if requested
    if args.export_kanban:
        export_to_kanban(recommendations)
    
    # Auto-fix if requested (future implementation)
    if args.auto_fix:
        auto_fixable = [r for r in recommendations if r.get("auto_fixable")]
        if auto_fixable:
            print(f"\n🤖 Would auto-fix {len(auto_fixable)} recommendations (not yet implemented)")


if __name__ == "__main__":
    main()
