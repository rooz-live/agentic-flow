#!/usr/bin/env python3
"""
Auto-Commit Trust Metrics System

Implements graduated trust-building for code-fix-proposal auto-commit.
Tracks shadow mode performance and recommends when to enable auto-commit.

Trust Levels:
- Level 0: All manual (dry-run only)
- Level 1: Low-risk auto-apply (lint, formatting)
- Level 2: Medium-risk auto-apply (test additions, docs)
- Level 3: High-risk auto-apply (code changes with tests)
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from collections import defaultdict
from typing import Dict, List

PROJECT_ROOT = Path(__file__).parent.parent.parent
PATTERN_METRICS_FILE = PROJECT_ROOT / ".goalie" / "pattern_metrics.jsonl"
TRUST_METRICS_FILE = PROJECT_ROOT / ".goalie" / "autocommit_trust_metrics.json"

# Risk categories for code fix proposals
RISK_CATEGORIES = {
    "low": ["lint", "format", "style", "whitespace", "import_order"],
    "medium": ["test_addition", "documentation", "comments", "type_hints"],
    "high": ["logic_change", "refactor", "api_change"]
}

# Trust thresholds for graduation
GRADUATION_THRESHOLDS = {
    "min_shadow_cycles": 10,      # Minimum clean shadow cycles
    "min_success_rate": 0.95,     # 95% success rate required
    "max_rejection_rate": 0.05,   # Max 5% manual rejection
    "min_confidence": 0.90,        # 90% confidence in predictions
    "lookback_days": 30            # Consider last 30 days
}

class AutoCommitTrustMetrics:
    def __init__(self):
        self.metrics = self._load_metrics()
    
    def _load_metrics(self) -> Dict:
        """Load existing trust metrics or initialize new."""
        if TRUST_METRICS_FILE.exists():
            with open(TRUST_METRICS_FILE, 'r') as f:
                return json.load(f)
        
        return {
            "current_trust_level": 0,
            "shadow_cycles": 0,
            "proposals_by_risk": defaultdict(lambda: {
                "total": 0,
                "accepted": 0,
                "rejected": 0,
                "success_rate": 0.0
            }),
            "recommendations": [],
            "last_updated": None
        }
    
    def _save_metrics(self):
        """Save trust metrics to disk."""
        self.metrics["last_updated"] = datetime.now(timezone.utc).isoformat()
        TRUST_METRICS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(TRUST_METRICS_FILE, 'w') as f:
            json.dump(self.metrics, f, indent=2)
    
    def _load_pattern_events(self, days_back: int = 30) -> List[Dict]:
        """Load code-fix-proposal events from pattern metrics."""
        if not PATTERN_METRICS_FILE.exists():
            return []
        
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
        events = []
        
        with open(PATTERN_METRICS_FILE, 'r') as f:
            for line in f:
                try:
                    event = json.loads(line.strip())
                    if event.get("pattern") == "code-fix-proposal":
                        # Parse timestamp
                        ts_str = event.get("ts") or event.get("timestamp", "")
                        if ts_str:
                            ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                            if ts >= cutoff:
                                events.append(event)
                except (json.JSONDecodeError, ValueError):
                    continue
        
        return events
    
    def _classify_risk(self, proposal_data: Dict) -> str:
        """Classify risk level of a code fix proposal."""
        reason = proposal_data.get("reason", "").lower()
        action = proposal_data.get("action", "").lower()
        
        # Check for risk indicators
        for risk_level, keywords in RISK_CATEGORIES.items():
            for keyword in keywords:
                if keyword in reason or keyword in action:
                    return risk_level
        
        # Default to high risk if uncertain
        return "high"
    
    def analyze_shadow_performance(self) -> Dict:
        """Analyze shadow mode performance and compute trust metrics."""
        events = self._load_pattern_events(GRADUATION_THRESHOLDS["lookback_days"])
        
        if not events:
            return {
                "status": "insufficient_data",
                "message": "No code-fix-proposal events found in lookback period"
            }
        
        # Count shadow cycles (unique correlation_ids with proposals)
        shadow_cycles = len(set(e.get("correlation_id") or e.get("run_id") for e in events))
        
        # Analyze proposals by risk category
        risk_stats = defaultdict(lambda: {"total": 0, "accepted": 0, "rejected": 0})
        
        for event in events:
            data = event.get("data", {})
            risk = self._classify_risk(data)
            
            risk_stats[risk]["total"] += data.get("total_proposals", 0)
            risk_stats[risk]["accepted"] += data.get("auto_apply_count", 0)
            # Rejection = proposals that stayed in dry-run
            risk_stats[risk]["rejected"] += data.get("dry_run_count", 0)
        
        # Calculate success rates
        for risk in risk_stats:
            total = risk_stats[risk]["total"]
            if total > 0:
                risk_stats[risk]["success_rate"] = risk_stats[risk]["accepted"] / total
        
        # Update metrics
        self.metrics["shadow_cycles"] = shadow_cycles
        self.metrics["proposals_by_risk"] = dict(risk_stats)
        
        return {
            "status": "analyzed",
            "shadow_cycles": shadow_cycles,
            "risk_stats": dict(risk_stats)
        }
    
    def compute_trust_level(self) -> int:
        """Compute current trust level based on performance."""
        shadow_cycles = self.metrics.get("shadow_cycles", 0)
        risk_stats = self.metrics.get("proposals_by_risk", {})
        
        # Insufficient data
        if shadow_cycles < GRADUATION_THRESHOLDS["min_shadow_cycles"]:
            return 0
        
        # Check low-risk performance
        low_risk = risk_stats.get("low", {})
        if low_risk.get("success_rate", 0) >= GRADUATION_THRESHOLDS["min_success_rate"]:
            level = 1
        else:
            return 0
        
        # Check medium-risk performance
        medium_risk = risk_stats.get("medium", {})
        if medium_risk.get("success_rate", 0) >= GRADUATION_THRESHOLDS["min_success_rate"]:
            level = 2
        
        # Check high-risk performance (requires very high confidence)
        high_risk = risk_stats.get("high", {})
        if high_risk.get("success_rate", 0) >= GRADUATION_THRESHOLDS["min_confidence"]:
            level = 3
        
        return level
    
    def generate_recommendations(self) -> List[str]:
        """Generate actionable recommendations for trust progression."""
        recommendations = []
        
        shadow_cycles = self.metrics.get("shadow_cycles", 0)
        current_level = self.metrics.get("current_trust_level", 0)
        risk_stats = self.metrics.get("proposals_by_risk", {})
        
        # Recommendation 1: More shadow cycles needed
        min_cycles = GRADUATION_THRESHOLDS["min_shadow_cycles"]
        if shadow_cycles < min_cycles:
            remaining = min_cycles - shadow_cycles
            recommendations.append(
                f"🔄 Run {remaining} more shadow prod-cycles to build trust baseline"
            )
        
        # Recommendation 2: Improve low-risk success rate
        low_risk = risk_stats.get("low", {})
        if low_risk.get("success_rate", 0) < GRADUATION_THRESHOLDS["min_success_rate"]:
            recommendations.append(
                f"⚠️  Low-risk fixes at {low_risk.get('success_rate', 0)*100:.1f}% "
                f"success (need {GRADUATION_THRESHOLDS['min_success_rate']*100}%). "
                f"Review guardrails in code_guardrails.py"
            )
        
        # Recommendation 3: Enable Level 1 (low-risk) auto-commit
        if current_level == 0 and shadow_cycles >= min_cycles:
            if low_risk.get("success_rate", 0) >= GRADUATION_THRESHOLDS["min_success_rate"]:
                recommendations.append(
                    "✅ READY: Enable Level 1 auto-commit for low-risk fixes "
                    "(lint, formatting). Set AF_AUTOCOMMIT_TRUST_LEVEL=1"
                )
        
        # Recommendation 4: Progress to Level 2 (medium-risk)
        if current_level == 1:
            medium_risk = risk_stats.get("medium", {})
            if medium_risk.get("success_rate", 0) >= GRADUATION_THRESHOLDS["min_success_rate"]:
                recommendations.append(
                    "✅ READY: Enable Level 2 auto-commit for medium-risk fixes "
                    "(tests, docs). Set AF_AUTOCOMMIT_TRUST_LEVEL=2"
                )
            else:
                recommendations.append(
                    f"📊 Medium-risk at {medium_risk.get('success_rate', 0)*100:.1f}% "
                    f"success. Collect more data for Level 2 graduation."
                )
        
        # Recommendation 5: Maintain vigilance
        if current_level >= 2:
            recommendations.append(
                "🛡️  Monitor auto-commit actions in .goalie/approval_log.jsonl "
                "for unexpected changes"
            )
        
        return recommendations
    
    def report(self, json_output: bool = False) -> Dict:
        """Generate trust metrics report."""
        # Analyze current performance
        analysis = self.analyze_shadow_performance()
        
        # Compute trust level
        computed_level = self.compute_trust_level()
        self.metrics["current_trust_level"] = computed_level
        
        # Generate recommendations
        recommendations = self.generate_recommendations()
        self.metrics["recommendations"] = recommendations
        
        # Save metrics
        self._save_metrics()
        
        report = {
            "trust_level": computed_level,
            "shadow_cycles": self.metrics.get("shadow_cycles", 0),
            "proposals_by_risk": self.metrics.get("proposals_by_risk", {}),
            "recommendations": recommendations,
            "thresholds": GRADUATION_THRESHOLDS,
            "status": analysis.get("status", "unknown")
        }
        
        if json_output:
            return report
        
        # Human-readable output
        print("\n" + "="*60)
        print("🔒 AUTO-COMMIT TRUST METRICS REPORT")
        print("="*60)
        print(f"\n📊 Current Trust Level: {computed_level}/3")
        print(f"🔄 Shadow Cycles Completed: {report['shadow_cycles']}")
        
        print("\n📈 Performance by Risk Category:")
        for risk, stats in report["proposals_by_risk"].items():
            print(f"  {risk.upper():10s}: {stats['total']:3d} proposals, "
                  f"{stats['success_rate']*100:5.1f}% success")
        
        print("\n💡 Recommendations:")
        for rec in recommendations:
            print(f"  {rec}")
        
        print("\n" + "="*60 + "\n")
        
        return report

def main():
    """Main CLI entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Auto-commit trust metrics analyzer")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    parser.add_argument("--days", type=int, default=30, help="Lookback period in days")
    
    args = parser.parse_args()
    
    # Override lookback period
    GRADUATION_THRESHOLDS["lookback_days"] = args.days
    
    # Generate report
    metrics = AutoCommitTrustMetrics()
    report = metrics.report(json_output=args.json)
    
    if args.json:
        print(json.dumps(report, indent=2))
    
    sys.exit(0)

if __name__ == "__main__":
    main()
