#!/usr/bin/env python3
"""
WSJF Calculator — Canonical Implementation
============================================
Consolidated from 5 prior implementations into one defensible framework.

Anti-Patterns Detected (6):
1. Subjective Manipulation — All inputs bounded [1, 10]
2. Estimation Bias (Anchoring) — Extreme values (1 or 10) flagged
3. HiPPO Effect — Deterministic from inputs, override requires audit trail
4. Gaming via Job Size — >50% at minimum detected
5. Recency Bias / Stale Scores — 96h threshold + time decay
6. Score Clustering — Top-3 spread < 10% warning

Rejection Scenario Defense:
- "These priorities are just opinion" → Bounded inputs + justification for extremes
- "Why is this one higher?" → WSJF = (BV+TC+RR)/JS — deterministic, auditable
- "Job size is always 1" → detect_anti_patterns() catches >50% at minimum
- "Scores haven't been updated" → is_stale() after 96h + with_time_decay()
- "Everything is priority 1" → Clustering detection warns "scoring not meaningful"
- "Who decided to override?" → WsjfOverride logs original, overridden, who, reason, timestamp

Usage:
    python3 -m src.wsjf.calculator --help
    python3 -m src.wsjf.calculator --input items.json --check
    python3 -m src.wsjf.calculator --input items.json --template --output daily.md
    python3 -m src.wsjf.calculator --sample --fire-focus

DoR: Anti-pattern taxonomy defined, bounded inputs [1-10] decided, 96h staleness threshold set
DoD: All 6 anti-patterns detected, input validation enforced, override audit trail,
     time-decay calculation verified, ≥95% test coverage
"""

import json
import argparse
import hashlib
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional, Dict, Tuple
from pathlib import Path


# ============================================================
# Enums
# ============================================================

class RiskLevel(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Horizon(Enum):
    NOW = "NOW"       # WSJF >= 20 or deadline < 48h
    NEXT = "NEXT"     # WSJF >= 10 or deadline < 7d
    LATER = "LATER"   # WSJF < 10


# ============================================================
# Exceptions
# ============================================================

class WsjfError(Exception):
    """Base WSJF calculation error."""
    pass


class InputValidationError(WsjfError):
    """Input outside valid bounds [1, 10]."""
    pass


class AntiPatternDetected(WsjfError):
    """Anti-pattern detected in WSJF calculation."""
    def __init__(self, pattern: str, details: Dict):
        self.pattern = pattern
        self.details = details
        super().__init__(f"Anti-pattern detected: {pattern}")


# ============================================================
# Data Classes
# ============================================================

@dataclass
class WsjfOverride:
    """Audit trail for WSJF overrides (anti-HiPPO).

    @business-context Anti-HiPPO defense: any override of WSJF scores requires
        who/when/why audit trail. Without this, priority decisions degrade to
        authority-based rather than evidence-based ordering.
    @constraint DDD-WSJF: Override must be serializable (to_dict) for
        persistence in ROAM_TRACKER.yaml and enforcement gate reports.
    """
    original_score: float
    overridden_score: float
    overridden_by: str
    reason: str
    timestamp: datetime
    authorization: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            'original_score': self.original_score,
            'overridden_score': self.overridden_score,
            'overridden_by': self.overridden_by,
            'reason': self.reason,
            'timestamp': self.timestamp.isoformat(),
            'authorization': self.authorization,
        }


@dataclass
class ImpactMetrics:
    """Objective anchors for User-Business Value (from coherence calculator).

    @business-context Converts dollar-denominated impacts to bounded [1-10]
        scores, preventing subjective BV manipulation. Revenue, cost savings,
        user count, and strategic alignment are weighted 30/20/20/30.
    @adr ADR-001: Weighting was chosen to balance financial impact with
        strategic alignment — pure revenue optimization would deprioritize
        risk reduction and compliance work.
    """
    revenue_impact: float = 0.0        # $ revenue generated
    cost_savings: float = 0.0          # $ costs saved
    users_affected: int = 0            # Number of users impacted
    strategic_alignment: float = 0.0   # 0-1 scale

    def to_objective_score(self) -> float:
        """Convert dollar metrics to 1-10 score."""
        revenue_score = min(self.revenue_impact / 10_000, 10)
        savings_score = min(self.cost_savings / 5_000, 10)
        user_score = min(self.users_affected / 100, 10)
        strategic_score = self.strategic_alignment * 10
        return round(
            revenue_score * 0.3 + savings_score * 0.2
            + user_score * 0.2 + strategic_score * 0.3,
            2,
        )


@dataclass
class RiskProfile:
    """ROAM-based risk profile for Risk Reduction scoring."""
    probability: float = 0.0           # 0-1
    impact_cost: float = 0.0           # $ cost if incident
    current_mitigation: float = 0.0    # 0-1
    proposed_mitigation: float = 0.0   # 0-1

    def to_objective_score(self) -> float:
        """Convert risk profile to 1-10 score."""
        current = self.probability * self.impact_cost * (1 - self.current_mitigation)
        future = self.probability * self.impact_cost * (1 - self.proposed_mitigation)
        reduction = current - future
        return round(min(max(reduction / 10_000, 1), 10), 2)


@dataclass
class WsjfItem:
    """Single WSJF prioritization item with full validation.

    @business-context Core prioritization unit. WSJF = (BV+TC+RR)/JS.
        All inputs bounded [1-10]. Extreme values (1 or 10) require written
        justification. Stale scores (>96h) trigger time-decay recalculation.
    @constraint DDD-WSJF: Items must be constructible from JSON for CLI
        and from Python dicts for programmatic use. No external dependencies.
    @planned-change R003: Field 'roam_risk' classification may expand from
        string to enum (RESOLVED/OWNED/ACCEPTED/MITIGATED) when ROAM
        integration with governance council is complete.
    """
    id: str
    title: str
    business_value: float       # 1-10
    time_criticality: float     # 1-10
    risk_reduction: float       # 1-10
    job_size: float             # 1-10
    deadline: Optional[datetime] = None
    calculated_at: datetime = field(default_factory=datetime.now)
    justification: Optional[str] = None
    override: Optional[WsjfOverride] = None

    # Optional objective anchors
    impact_metrics: Optional[ImpactMetrics] = None
    risk_profile: Optional[RiskProfile] = None

    # Evidence for defensible scoring (from robust framework)
    evidence: List[str] = field(default_factory=list)
    confidence: float = 0.8  # 0.0-1.0

    # Anti-pattern detection results
    validation_warnings: List[str] = field(default_factory=list)

    # ROAM risk classification
    roam_risk: Optional[str] = None
    impact_dollars: Optional[int] = None

    def __post_init__(self):
        self._validate_inputs()

    def _validate_inputs(self):
        """Validate all inputs are within bounds [1, 10]."""
        fields = [
            ('business_value', self.business_value),
            ('time_criticality', self.time_criticality),
            ('risk_reduction', self.risk_reduction),
            ('job_size', self.job_size),
        ]
        for name, value in fields:
            if not 1.0 <= value <= 10.0:
                raise InputValidationError(
                    f"{name} must be in [1, 10], got {value}"
                )

        # Extreme values require justification
        extreme_fields = [
            f for f, v in fields
            if v in (1.0, 10.0) and f != 'job_size'
        ]
        if extreme_fields and not self.justification:
            self.validation_warnings.append(
                f"Extreme values in {extreme_fields} require justification"
            )

    def calculate_wsjf(self) -> float:
        """WSJF = (BV + TC + RR) / JS. Override takes precedence."""
        if self.override:
            return self.override.overridden_score
        return (self.business_value + self.time_criticality
                + self.risk_reduction) / self.job_size

    def is_stale(self, threshold_hours: float = 96.0) -> bool:
        """Check if score is stale (older than threshold)."""
        return (datetime.now() - self.calculated_at) > timedelta(hours=threshold_hours)

    def with_time_decay(self) -> 'WsjfItem':
        """Apply time decay to TC as deadline approaches."""
        if not self.deadline:
            return self
        days = (self.deadline - datetime.now()).days
        if days < 0:
            factor = 2.0
        elif days < 1:
            factor = 1.5
        elif days < 7:
            factor = 0.5
        else:
            factor = 0.0
        new_tc = min(10.0, self.time_criticality * (1 + factor))
        return WsjfItem(
            id=self.id, title=self.title,
            business_value=self.business_value,
            time_criticality=new_tc,
            risk_reduction=self.risk_reduction,
            job_size=self.job_size,
            deadline=self.deadline,
            justification=self.justification,
            override=self.override,
            impact_metrics=self.impact_metrics,
            risk_profile=self.risk_profile,
            evidence=self.evidence,
            confidence=self.confidence,
            roam_risk=self.roam_risk,
            impact_dollars=self.impact_dollars,
        )

    @property
    def horizon(self) -> Horizon:
        score = self.calculate_wsjf()
        deadline_hours = None
        if self.deadline:
            deadline_hours = (self.deadline - datetime.now()).total_seconds() / 3600
        if score >= 20.0 or (deadline_hours is not None and deadline_hours < 48):
            return Horizon.NOW
        elif score >= 10.0 or (deadline_hours is not None and deadline_hours < 168):
            return Horizon.NEXT
        return Horizon.LATER

    @property
    def defensible_score(self) -> float:
        """WSJF adjusted for confidence and evidence quality."""
        raw = self.calculate_wsjf()
        factor = 1.0
        if self.confidence < 0.8:
            factor *= 0.9
        if len(self.evidence) < 2:
            factor *= 0.95
        return round(raw * factor, 2)

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'title': self.title,
            'business_value': self.business_value,
            'time_criticality': self.time_criticality,
            'risk_reduction': self.risk_reduction,
            'job_size': self.job_size,
            'wsjf_score': round(self.calculate_wsjf(), 2),
            'defensible_score': self.defensible_score,
            'horizon': self.horizon.value,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'calculated_at': self.calculated_at.isoformat(),
            'is_stale': self.is_stale(),
            'confidence': self.confidence,
            'justification': self.justification,
            'override': self.override.to_dict() if self.override else None,
            'roam_risk': self.roam_risk,
            'impact_dollars': self.impact_dollars,
            'validation_warnings': self.validation_warnings,
        }


# ============================================================
# Calculator
# ============================================================

class WsjfCalculator:
    """WSJF calculator with anti-pattern detection and portfolio validation."""

    def __init__(self):
        self.items: List[WsjfItem] = []
        self.audit_log: List[Dict] = []

    def add_item(self, item: WsjfItem) -> 'WsjfCalculator':
        self.items.append(item)
        return self

    # ----------------------------------------------------------
    # Anti-pattern detection (6 patterns)
    # ----------------------------------------------------------

    def detect_anti_patterns(self) -> List[Dict]:
        """Detect anti-patterns across all items."""
        patterns = []
        if not self.items:
            return patterns

        # Pattern 4: Gaming via Job Size (>50% at minimum)
        min_js = sum(1 for i in self.items if i.job_size == 1.0)
        if min_js / len(self.items) > 0.5:
            patterns.append({
                'pattern': 'GAMING_JOB_SIZE',
                'severity': 'HIGH',
                'description': f'{min_js}/{len(self.items)} items at minimum job size',
                'mitigation': 'Require justification for job_size < 3.0',
            })

        # Pattern 5: Recency Bias (stale scores)
        stale = sum(1 for i in self.items if i.is_stale())
        if stale > 0:
            patterns.append({
                'pattern': 'STALE_SCORES',
                'severity': 'MEDIUM',
                'description': f'{stale} items have stale scores (>96h old)',
                'mitigation': 'Apply with_time_decay() or recalculate',
            })

        # Pattern 6: Score Clustering (top-3 spread < 10%)
        if len(self.items) >= 3:
            sorted_items = sorted(
                self.items, key=lambda x: x.calculate_wsjf(), reverse=True
            )
            top3 = [i.calculate_wsjf() for i in sorted_items[:3]]
            if top3[0] > 0:
                spread = (top3[0] - top3[2]) / top3[0]
                if spread < 0.10:
                    patterns.append({
                        'pattern': 'SCORE_CLUSTERING',
                        'severity': 'MEDIUM',
                        'description': f'Top-3 within {spread:.1%} (threshold: 10%)',
                        'mitigation': 'Force finer-grained differentiation',
                    })

        # Pattern 2: Extreme values without justification
        extreme = [
            i for i in self.items
            if (i.business_value in (1.0, 10.0)
                or i.time_criticality in (1.0, 10.0)
                or i.risk_reduction in (1.0, 10.0))
            and not i.justification
        ]
        if extreme:
            patterns.append({
                'pattern': 'EXTREME_WITHOUT_JUSTIFICATION',
                'severity': 'HIGH',
                'description': f'{len(extreme)} items with extreme values lack justification',
                'mitigation': 'Require justification for values 1.0 or 10.0',
                'items': [i.id for i in extreme],
            })

        # Portfolio-level: critical concentration (>20% with TC >= 8)
        critical = sum(1 for i in self.items if i.time_criticality >= 8)
        if len(self.items) > 0 and critical / len(self.items) > 0.2:
            patterns.append({
                'pattern': 'CRITICAL_CONCENTRATION',
                'severity': 'MEDIUM',
                'description': f'{critical}/{len(self.items)} items are critical (TC>=8)',
                'mitigation': 'Review if all urgency is real or manufactured',
            })

        return patterns

    # ----------------------------------------------------------
    # Calculation
    # ----------------------------------------------------------

    def calculate_all(self, apply_decay: bool = True) -> List[Tuple[WsjfItem, float]]:
        """Calculate WSJF for all items, sorted descending."""
        results = []
        for item in self.items:
            effective = item.with_time_decay() if (apply_decay and item.deadline) else item
            results.append((effective, effective.calculate_wsjf()))
        results.sort(key=lambda x: x[1], reverse=True)
        return results

    def get_priorities(self, top_n: Optional[int] = None) -> Dict:
        """Get prioritized list with anti-pattern warnings."""
        anti_patterns = self.detect_anti_patterns()
        calculated = self.calculate_all()

        priorities = []
        for item, score in calculated:
            priorities.append({
                'item': item.to_dict(),
                'wsjf_score': round(score, 2),
                'rank': len(priorities) + 1,
            })

        if top_n:
            priorities = priorities[:top_n]

        return {
            'priorities': priorities,
            'anti_patterns': anti_patterns,
            'total_items': len(self.items),
            'generated_at': datetime.now().isoformat(),
        }

    # ----------------------------------------------------------
    # Overrides with audit trail
    # ----------------------------------------------------------

    def create_override(self, item_id: str, new_score: float,
                        overridden_by: str, reason: str,
                        authorization: Optional[str] = None) -> WsjfItem:
        item = next((i for i in self.items if i.id == item_id), None)
        if not item:
            raise WsjfError(f"Item {item_id} not found")

        original = item.calculate_wsjf()
        override = WsjfOverride(
            original_score=original,
            overridden_score=new_score,
            overridden_by=overridden_by,
            reason=reason,
            timestamp=datetime.now(),
            authorization=authorization,
        )
        self.audit_log.append({
            'action': 'OVERRIDE',
            'item_id': item_id,
            'override': override.to_dict(),
            'hash': self._hash(item),
        })
        new_item = WsjfItem(
            id=item.id, title=item.title,
            business_value=item.business_value,
            time_criticality=item.time_criticality,
            risk_reduction=item.risk_reduction,
            job_size=item.job_size,
            deadline=item.deadline,
            justification=item.justification,
            override=override,
        )
        self.items = [new_item if i.id == item_id else i for i in self.items]
        return new_item

    @staticmethod
    def _hash(item: WsjfItem) -> str:
        data = f"{item.id}:{item.business_value}:{item.time_criticality}:{item.risk_reduction}:{item.job_size}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]

    # ----------------------------------------------------------
    # Template generation
    # ----------------------------------------------------------

    def generate_daily_template(self, date: Optional[datetime] = None) -> str:
        """Generate daily WSJF template (fire / now / batch)."""
        date = date or datetime.now()
        priorities = self.get_priorities()

        fire, now, batch = [], [], []
        for p in priorities['priorities']:
            item = p['item']
            score = p['wsjf_score']
            dl = None
            if item.get('deadline'):
                dl = datetime.fromisoformat(item['deadline'])
            hours = (dl - datetime.now()).total_seconds() / 3600 if dl else None

            if score > 20 and hours is not None and hours < 24:
                fire.append(p)
            elif score > 10:
                now.append(p)
            else:
                batch.append(p)

        lines = [
            f"# WSJF Daily Priorities — {date.strftime('%Y-%m-%d %A')}",
            "",
            "## 🔥 Fire Items (WSJF > 20, < 24h deadline)",
        ]
        if fire:
            for p in fire:
                lines.append(f"- [ ] **{p['item']['id']}**: {p['item']['title']} | WSJF: {p['wsjf_score']}")
        else:
            lines.append("_No fire items today_")

        lines += ["", "## ⚡ Now Items (WSJF > 10)"]
        if now:
            for p in now[:5]:
                lines.append(f"- [ ] **{p['item']['id']}**: {p['item']['title']} | WSJF: {p['wsjf_score']}")
        else:
            lines.append("_No now items_")

        lines += ["", "## 📦 Batch Items (WSJF ≤ 10)"]
        lines.append(f"- {len(batch)} items queued" if batch else "_No batch items_")

        if priorities['anti_patterns']:
            lines += ["", "## ⚠️ Anti-Pattern Warnings"]
            for ap in priorities['anti_patterns']:
                lines.append(f"- **{ap['pattern']}** ({ap['severity']}): {ap['description']}")
                lines.append(f"  - Mitigation: {ap['mitigation']}")

        lines += [
            "", "## Validation Log",
            f"- Generated: {datetime.now().isoformat()}",
            f"- Total items: {priorities['total_items']}",
            f"- Anti-patterns: {len(priorities['anti_patterns'])}",
        ]
        return "\n".join(lines)

    def generate_fire_focus(self, date: Optional[datetime] = None) -> str:
        """Generate fire-focused OODA template."""
        date = date or datetime.now()
        now_items = [i for i in self.items if i.horizon == Horizon.NOW]
        now_items.sort(key=lambda x: x.calculate_wsjf(), reverse=True)

        lines = [
            f"# 🔥 FIRE FOCUS: {date.strftime('%Y-%m-%d')}",
            "",
            f"**Objective:** Complete ONLY NOW items (WSJF ≥ 20 or deadline < 48h)",
            f"**Rule:** No context switching. One fire at a time.",
            f"**Exit Condition:** All NOW items complete OR deadline reached.",
            "",
            "---",
            "",
            "## Morning OODA",
            "",
            "### Observe",
            f"- [ ] {len(now_items)} NOW items identified",
            "- [ ] Inbox cleared",
            "- [ ] Invariant violations checked",
            "",
            "### Orient",
            "- [ ] Hours to deadline: _____",
            "- [ ] Blockers cleared: _____",
            "",
            "### Decide",
        ]
        for i, task in enumerate(now_items[:3], 1):
            lines.append(f"- [ ] Fire #{i}: {task.title} (WSJF {task.calculate_wsjf():.1f})")

        lines += ["", "---", "", "## Today's Fires"]
        for i, task in enumerate(now_items[:5], 1):
            dl = f"{(task.deadline - datetime.now()).total_seconds() / 3600:.0f}h" if task.deadline else "N/A"
            lines += [
                f"",
                f"### Fire #{i}: {task.title}",
                f"WSJF: {task.calculate_wsjf():.1f} | Deadline: {dl} | Impact: ${task.impact_dollars or 'N/A'}",
                f"BV={task.business_value} TC={task.time_criticality} RR={task.risk_reduction} JS={task.job_size}",
                f"- [ ] Started: _____",
                f"- [ ] Completed: _____",
                f"- [ ] Evidence: _____",
            ]

        lines += [
            "", "---", "",
            "## Evening Retro",
            "- What worked: _____",
            "- What didn't: _____",
            "- Tomorrow's prep: _____",
            "",
            f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        ]
        return "\n".join(lines)


# ============================================================
# Sample data
# ============================================================

def get_sample_items() -> List[WsjfItem]:
    """Return sample items for testing."""
    return [
        WsjfItem(
            id="WSJF-001",
            title="Settlement Response — Counter-Offer",
            business_value=10, time_criticality=10, risk_reduction=8, job_size=2,
            deadline=datetime.now() + timedelta(hours=21),
            justification="Court deadline, asymmetric claim ($363 vs habitability damages)",
            impact_dollars=85000, roam_risk="SITUATIONAL",
            evidence=["Court filing 26CV007491", "22-month evidence chain"],
            confidence=0.95,
        ),
        WsjfItem(
            id="WSJF-002",
            title="Evidence Bundle — Medical Records",
            business_value=8, time_criticality=7, risk_reduction=9, job_size=3,
            deadline=datetime.now() + timedelta(hours=48),
            justification="Supports habitability defense, mold exposure documented",
            roam_risk="MITIGATED",
            evidence=["40+ work orders", "Medical records", "Portal screenshots"],
            confidence=0.9,
        ),
        WsjfItem(
            id="WSJF-003",
            title="Invariant Validator Implementation",
            business_value=6, time_criticality=5, risk_reduction=10, job_size=5,
            justification="Prevents regression in validation pipeline",
            roam_risk="ACCEPTED",
            evidence=["coherence gate spec", "existing test suite"],
            confidence=0.85,
        ),
        WsjfItem(
            id="WSJF-004",
            title="Rust TUI Dashboard",
            business_value=7, time_criticality=4, risk_reduction=7, job_size=6,
            roam_risk="RESOLVED",
        ),
        WsjfItem(
            id="WSJF-005",
            title="CV Deploy Pipeline — cPanel",
            business_value=5, time_criticality=3, risk_reduction=5, job_size=4,
            roam_risk="ACCEPTED",
        ),
    ]


# ============================================================
# CLI
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description='WSJF Calculator — Anti-pattern detection & defensible prioritization'
    )
    parser.add_argument('--input', '-i', help='JSON file with WSJF items')
    parser.add_argument('--output', '-o', help='Output file')
    parser.add_argument('--check', '-c', action='store_true', help='Check for anti-patterns')
    parser.add_argument('--template', '-t', action='store_true', help='Generate daily template')
    parser.add_argument('--fire-focus', action='store_true', help='Generate fire-focused OODA template')
    parser.add_argument('--sample', action='store_true', help='Use sample data')
    parser.add_argument('--top', '-n', type=int, default=10, help='Top N priorities')
    parser.add_argument('--json', action='store_true', help='Output as JSON')

    args = parser.parse_args()
    calc = WsjfCalculator()

    # Load items
    if args.input:
        with open(args.input) as f:
            data = json.load(f)
        for d in data.get('items', []):
            deadline = datetime.fromisoformat(d['deadline']) if d.get('deadline') else None
            try:
                calc.add_item(WsjfItem(
                    id=d['id'], title=d['title'],
                    business_value=d['business_value'],
                    time_criticality=d['time_criticality'],
                    risk_reduction=d['risk_reduction'],
                    job_size=d['job_size'],
                    deadline=deadline,
                    justification=d.get('justification'),
                    evidence=d.get('evidence', []),
                    confidence=d.get('confidence', 0.8),
                    roam_risk=d.get('roam_risk'),
                    impact_dollars=d.get('impact_dollars'),
                ))
            except InputValidationError as e:
                print(f"⚠️  Skipping {d.get('id', '?')}: {e}")

    if args.sample:
        for item in get_sample_items():
            calc.add_item(item)

    # Execute command
    if args.check:
        patterns = calc.detect_anti_patterns()
        if patterns:
            print("Anti-patterns detected:")
            for p in patterns:
                print(f"  🔴 {p['pattern']} ({p['severity']}): {p['description']}")
                print(f"     → {p['mitigation']}")
        else:
            print("✅ No anti-patterns detected.")

    elif args.fire_focus:
        output = calc.generate_fire_focus()
        print(output)
        if args.output:
            Path(args.output).write_text(output)

    elif args.template:
        output = calc.generate_daily_template()
        print(output)
        if args.output:
            Path(args.output).write_text(output)

    elif args.json:
        priorities = calc.get_priorities(top_n=args.top)
        output = json.dumps(priorities, indent=2, default=str)
        print(output)
        if args.output:
            Path(args.output).write_text(output)

    else:
        # Default: print prioritized list
        priorities = calc.get_priorities(top_n=args.top)
        print(f"\n{'='*60}")
        print(f" WSJF PRIORITIES ({len(priorities['priorities'])} items)")
        print(f"{'='*60}\n")
        for p in priorities['priorities']:
            item = p['item']
            icon = {"NOW": "🔥", "NEXT": "📋", "LATER": "📅"}.get(item['horizon'], "❓")
            stale = " [STALE]" if item['is_stale'] else ""
            print(f"  {p['rank']}. {icon} {item['title']}")
            print(f"     WSJF: {p['wsjf_score']} | BV={item['business_value']} TC={item['time_criticality']} RR={item['risk_reduction']} JS={item['job_size']}{stale}")
            if item.get('validation_warnings'):
                for w in item['validation_warnings']:
                    print(f"     ⚠️  {w}")
            print()

        if priorities['anti_patterns']:
            print(f"{'─'*60}")
            print("ANTI-PATTERN WARNINGS:")
            for ap in priorities['anti_patterns']:
                print(f"  🔴 {ap['pattern']} ({ap['severity']}): {ap['description']}")
        print()

        if args.output:
            with open(args.output, 'w') as f:
                json.dump(priorities, f, indent=2, default=str)
            print(f"Saved to {args.output}")


if __name__ == '__main__':
    main()
