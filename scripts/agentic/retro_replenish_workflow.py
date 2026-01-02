#!/usr/bin/env python3
"""
Retro-Replenish-Refinement Workflow
Unified workflow that connects retrospective insights to backlog replenishment
with continuous refinement based on pattern metrics.

Workflow:
1. RETRO: Analyze pattern metrics for insights
2. REPLENISH: Generate backlog items from insights
3. REFINE: Prioritize using WSJF and AI reasoning
"""

import os
import sys
import json
import subprocess
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(PROJECT_ROOT, "scripts"))
from agentic.pattern_logger import PatternLogger

GOALIE_DIR = os.path.join(PROJECT_ROOT, ".goalie")
METRICS_FILE = os.path.join(GOALIE_DIR, "pattern_metrics.jsonl")


@dataclass
class RetroInsight:
    """Insight extracted from retrospective analysis."""
    insight_id: str
    category: str  # strategy, integration, governance, testing
    description: str
    source_patterns: List[str]
    severity: str  # high, medium, low
    actionable: bool
    suggested_action: str
    wsjf_estimate: float = 0.0


@dataclass
class ReplenishItem:
    """Item to be added to backlog from insights."""
    item_id: str
    title: str
    description: str
    source_insight: str
    circle: str
    tier: int
    ubv: int  # User Business Value
    tc: int   # Time Criticality
    rr: int   # Risk Reduction
    size: int
    wsjf: float
    status: str = "pending"


@dataclass
class RefinementResult:
    """Result of refinement pass."""
    items_processed: int
    items_prioritized: int
    top_items: List[Dict]
    ai_enhanced: bool
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class RetroReplenishWorkflow:
    """Unified Retro → Replenish → Refine workflow."""

    def __init__(self):
        self.logger = PatternLogger(
            mode="advisory", circle="workflow",
            run_id=f"rrr-{int(datetime.now().timestamp())}"
        )
        self.insights: List[RetroInsight] = []
        self.replenish_items: List[ReplenishItem] = []

    def run_retro(self) -> List[RetroInsight]:
        """Phase 1: Extract insights from pattern metrics."""
        import time
        start_time = time.time()
        print("📊 RETRO: Analyzing pattern metrics...")

        if not os.path.exists(METRICS_FILE):
            print("   ⚠️  No pattern metrics found")
            return []

        # Read and analyze metrics
        patterns = {}
        failures = []
        integrations = []
        backtests = []

        with open(METRICS_FILE, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    pattern = entry.get("pattern", "unknown")
                    patterns[pattern] = patterns.get(pattern, 0) + 1

                    # Collect failures
                    if entry.get("action_completed") == False or "fail" in pattern.lower():
                        failures.append(entry)

                    # Collect integration events
                    if "integration" in pattern.lower():
                        integrations.append(entry)

                    # Collect backtests
                    if "backtest" in pattern.lower():
                        backtests.append(entry)

                except json.JSONDecodeError:
                    continue

        # Generate insights
        insights = []

        # Failure analysis
        if failures:
            insight = RetroInsight(
                insight_id=f"retro-fail-{len(failures)}",
                category="governance",
                description=f"Detected {len(failures)} failed actions in recent metrics",
                source_patterns=list(set(f.get("pattern", "") for f in failures[:5])),
                severity="high" if len(failures) > 10 else "medium",
                actionable=True,
                suggested_action="Review failed patterns and add guardrails",
                wsjf_estimate=len(failures) * 0.5
            )
            insights.append(insight)

        # Integration health
        if integrations:
            failed_integrations = [i for i in integrations if i.get("status") == "failed"]
            if failed_integrations:
                insight = RetroInsight(
                    insight_id=f"retro-int-{len(failed_integrations)}",
                    category="integration",
                    description=f"{len(failed_integrations)} integration failures detected",
                    source_patterns=["integration_event"],
                    severity="high",
                    actionable=True,
                    suggested_action="Check external system connectivity and API credentials",
                    wsjf_estimate=len(failed_integrations) * 2
                )
                insights.append(insight)

        # Testing strategy insights
        if backtests:
            avg_sharpe = sum(b.get("sharpe_ratio", 0) for b in backtests) / len(backtests) if backtests else 0
            insight = RetroInsight(
                insight_id=f"retro-test-{len(backtests)}",
                category="testing",
                description=f"Analyzed {len(backtests)} backtests, avg Sharpe: {avg_sharpe:.2f}",
                source_patterns=["backtest_result"],
                severity="low",
                actionable=avg_sharpe < 1.0,
                suggested_action="Promote high-Sharpe strategies to forward testing" if avg_sharpe >= 1.0 else "Refine strategy parameters",
                wsjf_estimate=5.0 if avg_sharpe >= 1.5 else 2.0
            )
            insights.append(insight)

        # Pattern coverage insight
        total_patterns = len(patterns)
        insight = RetroInsight(
            insight_id=f"retro-cov-{total_patterns}",
            category="governance",
            description=f"Pattern coverage: {total_patterns} unique patterns tracked",
            source_patterns=list(patterns.keys())[:10],
            severity="low",
            actionable=total_patterns < 5,
            suggested_action="Expand pattern instrumentation" if total_patterns < 5 else "Coverage adequate",
            wsjf_estimate=1.0
        )
        insights.append(insight)

        self.insights = insights

        # Log retro completion with duration
        duration_ms = int((time.time() - start_time) * 1000)
        self.logger.log("retro_complete", {
            "insights_count": len(insights),
            "patterns_analyzed": total_patterns,
            "failures_detected": len(failures),
            "duration_ms": duration_ms,
            "duration_measured": True,
            "tags": ["retro", "analysis", "workflow"]
        }, gate="calibration", behavioral_type="observability")

        print(f"   ✅ Generated {len(insights)} insights from {total_patterns} patterns")
        return insights

    def run_replenish(self, target_circle: str = "innovator") -> List[ReplenishItem]:
        """Phase 2: Convert insights to backlog items."""
        import time
        start_time = time.time()
        print(f"🔄 REPLENISH: Converting insights to backlog for {target_circle}...")

        if not self.insights:
            self.run_retro()

        items = []

        for insight in self.insights:
            if not insight.actionable:
                continue

            # Determine tier based on circle
            tier = 2 if target_circle in ["analyst", "innovator", "seeker"] else 1

            # Calculate WSJF components
            ubv = 8 if insight.severity == "high" else 5 if insight.severity == "medium" else 3
            tc = 7 if insight.category in ["governance", "integration"] else 4
            rr = 6 if insight.actionable else 2
            size = 3 if insight.severity == "low" else 5

            cod = ubv + tc + rr
            wsjf = cod / size

            item = ReplenishItem(
                item_id=f"REP-{insight.insight_id[-8:].upper()}",
                title=insight.suggested_action[:60],
                description=insight.description,
                source_insight=insight.insight_id,
                circle=target_circle,
                tier=tier,
                ubv=ubv,
                tc=tc,
                rr=rr,
                size=size,
                wsjf=wsjf
            )
            items.append(item)

        # Sort by WSJF
        items.sort(key=lambda x: x.wsjf, reverse=True)
        self.replenish_items = items

        # Log replenishment with duration
        duration_ms = int((time.time() - start_time) * 1000)
        self.logger.log("replenish_complete", {
            "items_generated": len(items),
            "target_circle": target_circle,
            "top_wsjf": items[0].wsjf if items else 0,
            "duration_ms": duration_ms,
            "duration_measured": True,
            "tags": ["replenish", "backlog", "workflow"]
        }, gate="governance", behavioral_type="observability")

        print(f"   ✅ Generated {len(items)} backlog items")
        return items

    def run_refine(self, use_ai: bool = True) -> RefinementResult:
        """Phase 3: Refine and prioritize items with optional AI enhancement."""
        import time
        start_time = time.time()
        print("✨ REFINE: Prioritizing with WSJF...")

        if not self.replenish_items:
            self.run_replenish()

        items = self.replenish_items

        # AI enhancement if available
        if use_ai:
            try:
                from agentic.ai_reasoning import AIReasoningEngine, ReasoningMode
                engine = AIReasoningEngine(mode=ReasoningMode.HYBRID)

                for item in items:
                    with self.logger.timed("ai_enhanced_wsjf", gate="integration", behavioral_type="enhancement", run_type="retro-replenish") as payload:
                        payload.update({
                            "item_id": item.item_id,
                            "original_wsjf": item.wsjf
                        })
                        decision = engine.enhance_wsjf({
                            "id": item.item_id,
                            "ubv": item.ubv,
                            "tc": item.tc,
                            "rr": item.rr,
                            "size": item.size
                        })
                        item.wsjf = decision.final_score
                        payload["new_wsjf"] = decision.final_score
                        payload["rationale"] = decision.rationale[:50] if hasattr(decision, 'rationale') else ""

                # Re-sort after AI enhancement
                items.sort(key=lambda x: x.wsjf, reverse=True)
                print("   🤖 AI-enhanced WSJF applied")

            except ImportError:
                use_ai = False
                print("   ⚠️  AI reasoning not available, using standard WSJF")

        result = RefinementResult(
            items_processed=len(items),
            items_prioritized=len([i for i in items if i.wsjf > 3.0]),
            top_items=[{
                "id": i.item_id,
                "title": i.title,
                "wsjf": round(i.wsjf, 2),
                "circle": i.circle
            } for i in items[:5]],
            ai_enhanced=use_ai
        )

        # Log refinement with duration
        duration_ms = int((time.time() - start_time) * 1000)
        self.logger.log("refine_complete", {
            "items_processed": result.items_processed,
            "items_prioritized": result.items_prioritized,
            "ai_enhanced": result.ai_enhanced,
            "duration_ms": duration_ms,
            "duration_measured": True,
            "tags": ["refine", "wsjf", "workflow"]
        }, gate="calibration", behavioral_type="observability",
        economic={"cod": result.items_prioritized * 5, "wsjf_score": items[0].wsjf if items else 0})

        print(f"   ✅ Refined {result.items_processed} items, {result.items_prioritized} high-priority")
        return result

    def run_full_workflow(self, circle: str = "innovator", use_ai: bool = True) -> Dict[str, Any]:
        """Execute complete Retro → Replenish → Refine workflow."""
        print("\n" + "="*60)
        print("🔄 RETRO-REPLENISH-REFINEMENT WORKFLOW")
        print("="*60 + "\n")

        start_time = datetime.now()

        # Phase 1: Retro
        insights = self.run_retro()

        # Phase 2: Replenish
        items = self.run_replenish(target_circle=circle)

        # Phase 3: Refine
        refinement = self.run_refine(use_ai=use_ai)

        duration = (datetime.now() - start_time).total_seconds()

        result = {
            "workflow": "retro-replenish-refine",
            "circle": circle,
            "phases": {
                "retro": {"insights": len(insights)},
                "replenish": {"items": len(items)},
                "refine": {
                    "processed": refinement.items_processed,
                    "prioritized": refinement.items_prioritized,
                    "ai_enhanced": refinement.ai_enhanced
                }
            },
            "top_items": refinement.top_items,
            "duration_seconds": round(duration, 2),
            "timestamp": datetime.now().isoformat()
        }

        print("\n" + "="*60)
        print("✅ WORKFLOW COMPLETE")
        print(f"   Duration: {duration:.2f}s")
        print(f"   Insights: {len(insights)} → Items: {len(items)} → Prioritized: {refinement.items_prioritized}")
        print("="*60 + "\n")

        return result


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Retro-Replenish-Refinement Workflow")
    parser.add_argument("command", nargs="?", default="full",
        choices=["full", "retro", "replenish", "refine"])
    parser.add_argument("--circle", default="innovator")
    parser.add_argument("--no-ai", action="store_true", help="Disable AI enhancement")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    workflow = RetroReplenishWorkflow()

    if args.command == "full":
        result = workflow.run_full_workflow(circle=args.circle, use_ai=not args.no_ai)
    elif args.command == "retro":
        insights = workflow.run_retro()
        result = [{"id": i.insight_id, "category": i.category, "description": i.description,
                  "severity": i.severity, "actionable": i.actionable} for i in insights]
    elif args.command == "replenish":
        items = workflow.run_replenish(target_circle=args.circle)
        result = [{"id": i.item_id, "title": i.title, "wsjf": i.wsjf, "circle": i.circle} for i in items]
    elif args.command == "refine":
        workflow.run_retro()
        workflow.run_replenish(target_circle=args.circle)
        refinement = workflow.run_refine(use_ai=not args.no_ai)
        result = {"processed": refinement.items_processed, "prioritized": refinement.items_prioritized,
                 "top_items": refinement.top_items, "ai_enhanced": refinement.ai_enhanced}
    else:
        result = {"error": "Invalid command"}

    if args.json:
        print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
