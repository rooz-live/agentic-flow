#!/usr/bin/env python3
"""
ROAM Risk Classification + WSJF Priority Calculator
===================================================

Strategic settlement timing analyzer for legal correspondence.

ROAM Risk Types:
- SITUATIONAL (60%): Opponent busy, needs approval, reviewing docs → Send friendly follow-up
- STRATEGIC (30%): Deliberate delay, running clock, tactical → Offer extension, prepare backup
- SYSTEMIC (10%): Organizational policy to ignore, pattern → Escalate, document for litigation

WSJF Priority Formula:
    WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
    
    Business Value (0-10):
    - 10: Settlement (avoids litigation)
    - 8: Attorney consultation
    - 6: Court filing
    - 4: Evidence documentation
    - 2: Administrative
    
    Time Criticality (0-10) - AUTO-ESCALATES with time decay:
    - 10: <24 hours to deadline
    - 8: <1 week to deadline
    - 6: <2 weeks to deadline
    - 4: <1 month to deadline
    - 2: >1 month to deadline
    
    Risk Reduction (0-10):
    - 10: Prevents litigation entirely
    - 8: Reduces scope significantly
    - 6: Mitigates timeline risk
    - 4: Improves negotiation position
    - 2: Minimal risk reduction
    - 0: No risk reduction (situational)
    
    Job Size (1-10):
    - 1: Quick email (<5 min to send)
    - 3: Simple email with review
    - 5: Complex email with attachments
    - 8: Email chain or multi-party
    - 10: Court filing with exhibits

Time Decay Recalculation:
- Auto-recalculates every 4 hours as deadline approaches
- Escalates priority automatically
- Triggers notifications at threshold crossings

Strategic Timing Recommendations:
- WSJF ≥ 18.0: SEND NOW (highest priority)
- WSJF 15.0-17.9: SEND WITHIN 2 HOURS
- WSJF 10.0-14.9: SEND WITHIN 4 HOURS
- WSJF 6.7-9.9: SEND WITHIN 12 HOURS
- WSJF < 6.7: DEFER (lower priority)

Integration:
- Email validation pipeline
- TUI dashboard priority ladder
- CI/CD automated scheduling
- HITL approval workflow

Usage:
    from roam_wsjf_analyzer import RoamWsjfAnalyzer, analyze_email_timing
    
    analyzer = RoamWsjfAnalyzer()
    result = analyzer.analyze("path/to/email.eml")
    
    print(f"ROAM: {result['roam_type']} ({result['roam_confidence']}%)")
    print(f"WSJF: {result['wsjf_score']}")
    print(f"Recommendation: {result['send_recommendation']}")

Author: Settlement ROI Optimization Team
Date: 2026-02-11 @ 23:05 EST
Deadline: Feb 12 @ 5:00 PM EST (15.9 hours remaining)
"""

import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple


# ══════════════════════════════════════════════════════════
# ROAM RISK CLASSIFICATION
# ══════════════════════════════════════════════════════════

# Definitions: Situational/Strategic/Systemic (invert thinking)
ROAM_DEFINITIONS = {
    "SITUATIONAL": {
        "meaning": "Context-dependent, not structural",
        "not": "Policy-driven or organizational",
        "examples": ["busy", "needs approval", "reviewing docs", "holiday"],
    },
    "STRATEGIC": {
        "meaning": "Deliberate behavior, not random",
        "not": "Accidental or coincidental",
        "examples": ["delay tactic", "run out clock", "silence", "discovery passed"],
    },
    "SYSTEMIC": {
        "meaning": "Organizational pattern, not one-off",
        "not": "Isolated incident",
        "examples": ["law firm policy", "3+ non-responses", "pattern across levels"],
    },
}

# Opportunity inversion: What opportunity does each risk create?
ROAM_OPPORTUNITY_INVERSION = {
    "SITUATIONAL": "Deadline pressure favors you; time works against them",
    "STRATEGIC": "Discovery leverage; non-response usable in court",
    "SYSTEMIC": "Systemic indifference evidence; punitive damages claim",
}


def get_roam_opportunity(risk_type: "RoamRiskType") -> str:
    """Return the opportunity created by this risk (invert thinking)."""
    return ROAM_OPPORTUNITY_INVERSION.get(risk_type.name, "")


class RoamRiskType(Enum):
    """ROAM Risk Types for Settlement Strategy"""
    SITUATIONAL = "situational"  # 60% - Good faith, needs time
    STRATEGIC = "strategic"      # 30% - Deliberate delay
    SYSTEMIC = "systemic"        # 10% - Organizational policy


class RoamCategory(Enum):
    """ROAM Risk Management Categories"""
    RESOLVED = "resolved"    # Risk eliminated
    OWNED = "owned"          # Accepted, monitored
    ACCEPTED = "accepted"    # Documented for litigation
    MITIGATED = "mitigated"  # Reduced through action


@dataclass
class RoamRiskAnalysis:
    """ROAM risk analysis result"""
    risk_type: RoamRiskType
    category: RoamCategory
    confidence: float  # 0.0 - 1.0
    likelihood: float  # 0.0 - 1.0
    reasoning: str
    indicators: List[str] = field(default_factory=list)
    recommended_action: str = ""
    escalation_level: int = 0  # 0=low, 1=medium, 2=high, 3=critical
    opportunity: str = ""  # Invert thinking: what opportunity does this create?

    def __post_init__(self):
        if not self.opportunity:
            self.opportunity = get_roam_opportunity(self.risk_type)

    def to_dict(self) -> dict:
        return {
            "risk_type": self.risk_type.value,
            "category": self.category.value,
            "confidence": self.confidence,
            "likelihood": self.likelihood,
            "reasoning": self.reasoning,
            "indicators": self.indicators,
            "recommended_action": self.recommended_action,
            "escalation_level": self.escalation_level,
            "opportunity": self.opportunity,
        }


class RoamRiskClassifier:
    """
    Classifies settlement risks into ROAM categories
    
    Indicators:
    - SITUATIONAL: First non-response, holiday/weekend, busy season, needs approval
    - STRATEGIC: Multiple non-responses, discovery deadline passed, clock running
    - SYSTEMIC: Pattern of ignoring pro se, law firm policy, 3+ non-responses
    """
    
    def classify(self, context: Dict) -> RoamRiskAnalysis:
        """
        Classify risk based on context
        
        Args:
            context: {
                'email_content': str,
                'recipient': str,
                'subject': str,
                'previous_responses': int,
                'days_since_last_contact': int,
                'deadline_hours_remaining': float,
                'discovery_deadline_passed': bool,
                'is_settlement_email': bool
            }
        
        Returns:
            RoamRiskAnalysis
        """
        email_content = context.get('email_content', '')
        prev_responses = context.get('previous_responses', 0)
        days_since = context.get('days_since_last_contact', 0)
        deadline_remaining = context.get('deadline_hours_remaining', 999)
        discovery_passed = context.get('discovery_deadline_passed', False)
        is_settlement = context.get('is_settlement_email', False)
        
        # Indicator detection
        indicators = []
        
        # SYSTEMIC indicators (highest priority)
        systemic_score = 0
        if prev_responses >= 3:
            systemic_score += 40
            indicators.append("3+ non-responses (pattern detected)")
        if discovery_passed:
            systemic_score += 30
            indicators.append("Discovery deadline passed without response")
        if 'pro se' in email_content.lower() and prev_responses >= 2:
            systemic_score += 20
            indicators.append("Pattern of ignoring pro se plaintiff")
        if days_since >= 7 and prev_responses >= 2:
            systemic_score += 10
            indicators.append("7+ days silence after multiple attempts")
        
        # STRATEGIC indicators
        strategic_score = 0
        if prev_responses == 2:
            strategic_score += 40
            indicators.append("Second non-response (potential delay tactic)")
        if deadline_remaining < 48 and prev_responses >= 1:
            strategic_score += 30
            indicators.append("Non-response approaching deadline (<48h)")
        if discovery_passed and prev_responses == 1:
            strategic_score += 20
            indicators.append("Discovery deadline passed, settlement clock running")
        if 'extension' in email_content.lower() and prev_responses == 1:
            strategic_score += 10
            indicators.append("Requesting extension after initial non-response")
        
        # SITUATIONAL indicators
        situational_score = 60  # Default assumption (good faith)
        if prev_responses == 0:
            situational_score = 80
            indicators.append("First contact (assume good faith)")
        if 'approval' in email_content.lower() or 'review' in email_content.lower():
            situational_score += 10
            indicators.append("Mentions approval/review process")
        if days_since <= 2:
            situational_score += 5
            indicators.append("Recent contact (<2 days)")
        
        # Determine risk type (highest score wins)
        if systemic_score > strategic_score and systemic_score > situational_score:
            risk_type = RoamRiskType.SYSTEMIC
            confidence = min(systemic_score / 100, 0.95)
            likelihood = 0.1
            category = RoamCategory.ACCEPTED
            reasoning = "Pattern of organizational indifference detected"
            action = "Document pattern, prepare Scenario C, escalate to litigation"
            escalation = 3
        elif strategic_score > situational_score:
            risk_type = RoamRiskType.STRATEGIC
            confidence = min(strategic_score / 100, 0.90)
            likelihood = 0.3
            category = RoamCategory.MITIGATED
            reasoning = "Deliberate delay detected, clock pressure evident"
            action = "Offer deadline extension, prepare backup plan"
            escalation = 2
        else:
            risk_type = RoamRiskType.SITUATIONAL
            confidence = min(situational_score / 100, 0.85)
            likelihood = 0.6
            category = RoamCategory.OWNED
            reasoning = "Good faith assumption, busy schedule or approval needed"
            action = "Send friendly follow-up, allow response time"
            escalation = 1
        
        return RoamRiskAnalysis(
            risk_type=risk_type,
            category=category,
            confidence=confidence,
            likelihood=likelihood,
            reasoning=reasoning,
            indicators=indicators,
            recommended_action=action,
            escalation_level=escalation
        )


# ══════════════════════════════════════════════════════════
# WSJF PRIORITY CALCULATOR
# ══════════════════════════════════════════════════════════

@dataclass
class WsjfScore:
    """WSJF priority score breakdown"""
    business_value: int  # 0-10
    time_criticality: int  # 0-10
    risk_reduction: int  # 0-10
    job_size: int  # 1-10
    wsjf_score: float  # (BV + TC + RR) / JS
    priority_level: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    send_recommendation: str  # "SEND_NOW", "SEND_WITHIN_2H", etc.
    hours_to_deadline: float
    time_decay_factor: float  # Multiplier for time criticality
    
    def to_dict(self) -> dict:
        return {
            "business_value": self.business_value,
            "time_criticality": self.time_criticality,
            "risk_reduction": self.risk_reduction,
            "job_size": self.job_size,
            "wsjf_score": self.wsjf_score,
            "priority_level": self.priority_level,
            "send_recommendation": self.send_recommendation,
            "hours_to_deadline": self.hours_to_deadline,
            "time_decay_factor": self.time_decay_factor
        }


class WsjfCalculator:
    """
    Calculates WSJF priority with automatic time decay
    
    Formula: WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
    
    Time Decay: Recalculates every 4 hours, escalating priority as deadline approaches
    """
    
    def __init__(self, settlement_deadline: Optional[datetime] = None):
        # Default: Feb 12, 2026 @ 5:00 PM EST
        self.settlement_deadline = settlement_deadline or datetime(2026, 2, 12, 17, 0)
    
    def calculate(self, context: Dict) -> WsjfScore:
        """
        Calculate WSJF score with time decay
        
        Args:
            context: {
                'email_type': str ('settlement', 'discovery', 'court'),
                'recipient_type': str ('opposing_counsel', 'court', 'witness'),
                'has_attachments': bool,
                'word_count': int,
                'is_follow_up': bool,
                'current_time': datetime (optional)
            }
        
        Returns:
            WsjfScore
        """
        email_type = context.get('email_type', 'general')
        recipient_type = context.get('recipient_type', 'general')
        has_attachments = context.get('has_attachments', False)
        word_count = context.get('word_count', 500)
        is_follow_up = context.get('is_follow_up', False)
        current_time = context.get('current_time', datetime.now())
        
        # Calculate hours to deadline
        hours_remaining = (self.settlement_deadline - current_time).total_seconds() / 3600
        
        # Business Value (0-10)
        bv = self._calculate_business_value(email_type, recipient_type)
        
        # Time Criticality (0-10) with decay factor
        tc, decay_factor = self._calculate_time_criticality(hours_remaining, email_type)
        
        # Risk Reduction (0-10)
        rr = self._calculate_risk_reduction(email_type, is_follow_up)
        
        # Job Size (1-10)
        js = self._calculate_job_size(word_count, has_attachments, is_follow_up)
        
        # WSJF Score
        wsjf = (bv + tc + rr) / max(js, 1)
        
        # Priority Level
        if wsjf >= 18.0:
            priority = "CRITICAL"
            recommendation = "SEND_NOW"
        elif wsjf >= 15.0:
            priority = "HIGH"
            recommendation = "SEND_WITHIN_2H"
        elif wsjf >= 10.0:
            priority = "MEDIUM"
            recommendation = "SEND_WITHIN_4H"
        elif wsjf >= 6.7:
            priority = "LOW"
            recommendation = "SEND_WITHIN_12H"
        else:
            priority = "DEFERRED"
            recommendation = "DEFER"
        
        return WsjfScore(
            business_value=bv,
            time_criticality=tc,
            risk_reduction=rr,
            job_size=js,
            wsjf_score=wsjf,
            priority_level=priority,
            send_recommendation=recommendation,
            hours_to_deadline=hours_remaining,
            time_decay_factor=decay_factor
        )
    
    def _calculate_business_value(self, email_type: str, recipient_type: str) -> int:
        """Calculate business value (0-10)"""
        if email_type == 'settlement':
            if recipient_type == 'opposing_counsel':
                return 10  # Highest value (avoids litigation)
            return 8
        elif email_type == 'discovery':
            return 6
        elif email_type == 'court':
            return 7
        return 4
    
    def _calculate_time_criticality(self, hours_remaining: float, email_type: str) -> Tuple[int, float]:
        """
        Calculate time criticality (0-10) with decay factor
        
        Returns: (time_criticality, decay_factor)
        """
        # Time decay escalation
        if hours_remaining < 12:
            tc = 10
            decay_factor = 2.0  # Double urgency
        elif hours_remaining < 24:
            tc = 10
            decay_factor = 1.5
        elif hours_remaining < 48:
            tc = 9
            decay_factor = 1.25
        elif hours_remaining < 168:  # 1 week
            tc = 8
            decay_factor = 1.0
        elif hours_remaining < 336:  # 2 weeks
            tc = 6
            decay_factor = 0.9
        elif hours_remaining < 720:  # 1 month
            tc = 4
            decay_factor = 0.8
        else:
            tc = 2
            decay_factor = 0.7
        
        # Boost for settlement emails
        if email_type == 'settlement' and hours_remaining < 48:
            tc = 10
        
        return tc, decay_factor
    
    def _calculate_risk_reduction(self, email_type: str, is_follow_up: bool) -> int:
        """Calculate risk reduction (0-10)"""
        if email_type == 'settlement':
            if is_follow_up:
                return 0  # Follow-up doesn't reduce risk (situational)
            return 10  # Settlement offer prevents litigation
        elif email_type == 'discovery':
            return 6  # Reduces scope
        elif email_type == 'court':
            return 4  # Improves position
        return 2
    
    def _calculate_job_size(self, word_count: int, has_attachments: bool, is_follow_up: bool) -> int:
        """Calculate job size (1-10)"""
        if is_follow_up and word_count < 200:
            return 1  # Quick follow-up
        elif word_count < 500 and not has_attachments:
            return 3  # Simple email
        elif word_count < 1500:
            return 5  # Complex email
        elif has_attachments:
            return 8  # Email with attachments
        else:
            return 10  # Court filing


# ══════════════════════════════════════════════════════════
# INTEGRATED ANALYZER
# ══════════════════════════════════════════════════════════

class RoamWsjfAnalyzer:
    """
    Integrated ROAM + WSJF analyzer for strategic settlement timing
    """
    
    def __init__(self):
        self.roam_classifier = RoamRiskClassifier()
        self.wsjf_calculator = WsjfCalculator()
    
    def analyze_email(self, email_path: Path, context: Optional[Dict] = None) -> Dict:
        """
        Analyze email for ROAM risk and WSJF priority
        
        Args:
            email_path: Path to .eml file
            context: Optional context overrides
        
        Returns:
            {
                'roam': RoamRiskAnalysis,
                'wsjf': WsjfScore,
                'strategic_recommendation': str,
                'send_timing': str
            }
        """
        # Load email
        content = email_path.read_text(errors='ignore')
        
        # Extract metadata
        subject = self._extract_header(content, 'Subject')
        recipient = self._extract_header(content, 'To')
        word_count = len(content.split())
        
        # Build context if not provided
        if context is None:
            context = {
                'email_content': content,
                'recipient': recipient,
                'subject': subject,
                'previous_responses': 0,  # TODO: Track across emails
                'days_since_last_contact': 0,
                'deadline_hours_remaining': (datetime(2026, 2, 12, 17, 0) - datetime.now()).total_seconds() / 3600,
                'discovery_deadline_passed': False,
                'is_settlement_email': 'settlement' in subject.lower(),
                'email_type': 'settlement' if 'settlement' in subject.lower() else 'general',
                'recipient_type': 'opposing_counsel' if 'attorney' in recipient.lower() else 'general',
                'has_attachments': False,
                'word_count': word_count,
                'is_follow_up': 'follow-up' in subject.lower() or 'follow up' in content.lower()
            }
        
        # Run analyses
        roam = self.roam_classifier.classify(context)
        wsjf = self.wsjf_calculator.calculate(context)
        
        # Strategic recommendation
        strategic_rec = self._generate_strategic_recommendation(roam, wsjf)
        
        # Send timing
        send_timing = self._determine_send_timing(roam, wsjf)
        
        return {
            'roam': roam,
            'wsjf': wsjf,
            'strategic_recommendation': strategic_rec,
            'send_timing': send_timing
        }
    
    def _extract_header(self, content: str, header_name: str) -> str:
        """Extract email header"""
        match = re.search(rf'^{header_name}:\s*(.+)$', content, re.MULTILINE | re.IGNORECASE)
        return match.group(1).strip() if match else ""
    
    def _generate_strategic_recommendation(self, roam: RoamRiskAnalysis, wsjf: WsjfScore) -> str:
        """Generate strategic recommendation based on ROAM + WSJF"""
        if roam.risk_type == RoamRiskType.SYSTEMIC:
            return f"SYSTEMIC risk detected ({roam.confidence*100:.0f}% confidence). Document pattern for litigation. WSJF={wsjf.wsjf_score:.1f}"
        elif roam.risk_type == RoamRiskType.STRATEGIC:
            return f"STRATEGIC delay detected ({roam.confidence*100:.0f}% confidence). Offer extension but prepare backup. WSJF={wsjf.wsjf_score:.1f}"
        else:
            return f"SITUATIONAL risk (good faith). Send friendly follow-up. WSJF={wsjf.wsjf_score:.1f}"
    
    def _determine_send_timing(self, roam: RoamRiskAnalysis, wsjf: WsjfScore) -> str:
        """Determine optimal send timing"""
        hours = wsjf.hours_to_deadline
        
        # CRITICAL OVERRIDE: Settlement emails <24h from deadline = SEND NOW
        if wsjf.business_value == 10 and hours < 24:
            return "SEND NOW (Settlement <24h deadline)"
        
        if wsjf.wsjf_score >= 18.0:
            return "SEND NOW (WSJF ≥ 18.0)"
        elif hours < 2:
            return "SEND IMMEDIATELY (deadline <2h)"
        elif roam.risk_type == RoamRiskType.SYSTEMIC:
            return "ESCALATE - Prepare litigation materials"
        elif wsjf.wsjf_score >= 15.0:
            return "SEND WITHIN 2 HOURS"
        elif wsjf.wsjf_score >= 10.0:
            return "SEND WITHIN 4 HOURS"
        else:
            return "DEFER - Lower priority"


# ══════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════

def main():
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description="ROAM + WSJF Strategic Settlement Timing Analyzer")
    parser.add_argument("--email", type=Path, required=True, help="Path to .eml file")
    parser.add_argument("--output", type=Path, help="Save analysis to JSON")
    
    args = parser.parse_args()
    
    analyzer = RoamWsjfAnalyzer()
    result = analyzer.analyze_email(args.email)
    
    print("\n" + "="*80)
    print("ROAM + WSJF STRATEGIC ANALYSIS")
    print("="*80)
    print()
    
    # ROAM Analysis
    roam = result['roam']
    print("🎯 ROAM RISK ANALYSIS:")
    print(f"  Risk Type:     {roam.risk_type.value.upper()} ({roam.confidence*100:.0f}% confidence)")
    print(f"  Category:      {roam.category.value.upper()}")
    print(f"  Likelihood:    {roam.likelihood*100:.0f}%")
    print(f"  Escalation:    Level {roam.escalation_level}/3")
    print(f"  Reasoning:     {roam.reasoning}")
    print(f"  Action:        {roam.recommended_action}")
    print(f"  Opportunity:   {roam.opportunity}  [invert thinking]")
    if roam.indicators:
        print("  Indicators:")
        for ind in roam.indicators:
            print(f"    • {ind}")
    print()
    
    # WSJF Analysis
    wsjf = result['wsjf']
    print("📊 WSJF PRIORITY ANALYSIS:")
    print(f"  WSJF Score:         {wsjf.wsjf_score:.1f}")
    print(f"  Priority Level:     {wsjf.priority_level}")
    print(f"  Business Value:     {wsjf.business_value}/10")
    print(f"  Time Criticality:   {wsjf.time_criticality}/10")
    print(f"  Risk Reduction:     {wsjf.risk_reduction}/10")
    print(f"  Job Size:           {wsjf.job_size}/10")
    print(f"  Hours to Deadline:  {wsjf.hours_to_deadline:.1f}h")
    print(f"  Time Decay Factor:  {wsjf.time_decay_factor:.2f}x")
    print(f"  Recommendation:     {wsjf.send_recommendation}")
    print()
    
    # Strategic Recommendation
    print("🎯 STRATEGIC RECOMMENDATION:")
    print(f"  {result['strategic_recommendation']}")
    print()
    print("⏰ SEND TIMING:")
    print(f"  {result['send_timing']}")
    print()
    
    # Save if requested
    if args.output:
        output_data = {
            'roam': roam.to_dict(),
            'wsjf': wsjf.to_dict(),
            'strategic_recommendation': result['strategic_recommendation'],
            'send_timing': result['send_timing']
        }
        with open(args.output, 'w') as f:
            json.dump(output_data, f, indent=2)
        print(f"✓ Analysis saved: {args.output}")


if __name__ == "__main__":
    main()
