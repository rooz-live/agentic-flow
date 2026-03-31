#!/usr/bin/env python3
"""
WSJF Framework with Anti-Pattern Detection and Auditability

Implements Weighted Shortest Job First prioritization with robust
anti-manipulation safeguards, rejection scenario defense, and
comprehensive audit trails.

Anti-Patterns Detected:
1. Subjective Manipulation - All inputs bounded [1, 10]
2. Estimation Bias (Anchoring) - Extreme values flagged
3. HiPPO Effect - Deterministic from inputs
4. Gaming via Job Size - >50% at minimum detected
5. Recency Bias / Stale Scores - 96h threshold
6. Score Clustering - Top-3 spread < 10% warning

Rejection Scenario Defense:
- "These priorities are just opinion" → Bounded inputs + justification
- "Why is this one higher?" → Deterministic WSJF formula
- "Job size is always 1 — gaming?" → Anti-pattern detection
- "Scores haven't been updated" → is_stale() + time_decay()
- "Everything is priority 1" → Clustering detection
- "Who decided to override?" → WsjfOverride audit trail

DoR (Definition of Ready):
    - Anti-pattern taxonomy defined (6 patterns)
    - Input bounds agreed [1, 10] per component
    - Staleness threshold set (96h)
DoD (Definition of Done):
    - All inputs validated on creation (__post_init__)
    - Extreme values flagged without justification
    - time_decay applied when deadline < 7 days
    - Anti-pattern detection covers >50% minimum job size gaming
    - Score clustering warns when top-3 spread < 10%
"""

import json
import argparse
import hashlib
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional, Dict, Tuple, Any
from pathlib import Path


class WsjfError(Exception):
    """Base WSJF calculation error"""
    pass


class InputValidationError(WsjfError):
    """Input outside valid bounds"""
    pass


class AntiPatternDetected(WsjfError):
    """Anti-pattern detected in WSJF calculation"""
    def __init__(self, pattern: str, details: Dict):
        self.pattern = pattern
        self.details = details
        super().__init__(f"Anti-pattern detected: {pattern}")


@dataclass
class WsjfOverride:
    """Audit trail for WSJF overrides"""
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
            'authorization': self.authorization
        }


@dataclass
class WsjfItem:
    """Single WSJF prioritization item"""
    id: str
    title: str
    business_value: float  # 1-10
    time_criticality: float  # 1-10
    risk_reduction: float  # 1-10
    job_size: float  # 1-10
    deadline: Optional[datetime] = None
    calculated_at: datetime = field(default_factory=datetime.now)
    justification: Optional[str] = None
    override: Optional[WsjfOverride] = None
    
    # Anti-pattern detection results
    validation_warnings: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate inputs on creation"""
        self._validate_inputs()
    
    def _validate_inputs(self):
        """Validate all inputs are within bounds [1, 10]"""
        fields = [
            ('business_value', self.business_value),
            ('time_criticality', self.time_criticality),
            ('risk_reduction', self.risk_reduction),
            ('job_size', self.job_size)
        ]
        
        for name, value in fields:
            if not 1.0 <= value <= 10.0:
                raise InputValidationError(
                    f"{name} must be in [1, 10], got {value}"
                )
        
        # Check for extreme values requiring justification
        extreme_fields = [
            f for f, v in fields 
            if v in [1.0, 10.0] and f != 'job_size'
        ]
        
        if extreme_fields and not self.justification:
            self.validation_warnings.append(
                f"Extreme values in {extreme_fields} require justification"
            )
    
    def calculate_wsjf(self) -> float:
        """
        Calculate WSJF score: (BV + TC + RR) / JS
        
        Returns:
            WSJF score (higher = higher priority)
        """
        if self.job_size == 0:
            raise WsjfError("Job size cannot be zero")
        
        if self.override:
            return self.override.overridden_score
        
        return (self.business_value + self.time_criticality + self.risk_reduction) / self.job_size
    
    def is_stale(self, threshold_hours: float = 96.0) -> bool:
        """Check if score is stale (older than threshold)"""
        age = datetime.now() - self.calculated_at
        return age > timedelta(hours=threshold_hours)
    
    def with_time_decay(self) -> 'WsjfItem':
        """
        Apply time decay to time_criticality as deadline approaches.
        
        Formula: TC' = TC * (1 + urgency_factor)
        where urgency_factor = 1 / (days_to_deadline + 1)
        """
        if not self.deadline:
            return self
        
        days_to_deadline = (self.deadline - datetime.now()).days
        
        if days_to_deadline < 0:
            # Past deadline - maximum urgency
            urgency_factor = 2.0
        elif days_to_deadline < 1:
            urgency_factor = 1.5
        elif days_to_deadline < 7:
            urgency_factor = 0.5
        else:
            urgency_factor = 0.0
        
        new_tc = min(10.0, self.time_criticality * (1 + urgency_factor))
        
        return WsjfItem(
            id=self.id,
            title=self.title,
            business_value=self.business_value,
            time_criticality=new_tc,
            risk_reduction=self.risk_reduction,
            job_size=self.job_size,
            deadline=self.deadline,
            justification=self.justification,
            override=self.override
        )
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'title': self.title,
            'business_value': self.business_value,
            'time_criticality': self.time_criticality,
            'risk_reduction': self.risk_reduction,
            'job_size': self.job_size,
            'wsjf_score': round(self.calculate_wsjf(), 2),
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'calculated_at': self.calculated_at.isoformat(),
            'is_stale': self.is_stale(),
            'justification': self.justification,
            'override': self.override.to_dict() if self.override else None,
            'validation_warnings': self.validation_warnings
        }


class WsjfCalculator:
    """WSJF calculator with anti-pattern detection"""
    
    def __init__(self):
        self.items: List[WsjfItem] = []
        self.audit_log: List[Dict] = []
    
    def add_item(self, item: WsjfItem) -> 'WsjfCalculator':
        """Add item to calculator"""
        self.items.append(item)
        return self
    
    def detect_anti_patterns(self) -> List[Dict]:
        """
        Detect anti-patterns across all items.
        
        Returns:
            List of detected anti-patterns with details
        """
        patterns = []
        
        if not self.items:
            return patterns
        
        # Pattern 4: Gaming via Job Size (>50% at minimum)
        min_job_size = sum(1 for i in self.items if i.job_size == 1.0)
        if min_job_size / len(self.items) > 0.5:
            patterns.append({
                'pattern': 'GAMING_JOB_SIZE',
                'severity': 'HIGH',
                'description': f'{min_job_size}/{len(self.items)} items at minimum job size (1.0)',
                'mitigation': 'Require justification for job_size < 3.0'
            })
        
        # Pattern 5: Recency Bias (stale scores)
        stale_count = sum(1 for i in self.items if i.is_stale())
        if stale_count > 0:
            patterns.append({
                'pattern': 'STALE_SCORES',
                'severity': 'MEDIUM',
                'description': f'{stale_count} items have stale scores (>96h old)',
                'mitigation': 'Apply time_decay() or recalculate'
            })
        
        # Pattern 6: Score Clustering (top-3 spread < 10%)
        if len(self.items) >= 3:
            sorted_items = sorted(self.items, key=lambda x: x.calculate_wsjf(), reverse=True)
            top_3_scores = [i.calculate_wsjf() for i in sorted_items[:3]]
            
            if top_3_scores[0] > 0:
                spread = (top_3_scores[0] - top_3_scores[2]) / top_3_scores[0]
                if spread < 0.10:
                    patterns.append({
                        'pattern': 'SCORE_CLUSTERING',
                        'severity': 'MEDIUM',
                        'description': f'Top-3 scores within {spread:.1%} (threshold: 10%)',
                        'mitigation': 'Force finer-grained differentiation or batch together'
                    })
        
        # Pattern 2: Estimation Bias (extreme values without justification)
        extreme_without_justification = [
            i for i in self.items
            if (i.business_value in [1.0, 10.0] or 
                i.time_criticality in [1.0, 10.0] or 
                i.risk_reduction in [1.0, 10.0])
            and not i.justification
        ]
        
        if extreme_without_justification:
            patterns.append({
                'pattern': 'EXTREME_WITHOUT_JUSTIFICATION',
                'severity': 'HIGH',
                'description': f'{len(extreme_without_justification)} items have extreme values without written justification',
                'mitigation': 'Require justification field for values 1.0 or 10.0',
                'items': [i.id for i in extreme_without_justification]
            })
        
        return patterns
    
    def calculate_all(self, apply_decay: bool = True) -> List[Tuple[WsjfItem, float]]:
        """
        Calculate WSJF for all items with optional time decay.
        
        Returns:
            List of (item, score) tuples sorted by score descending
        """
        results = []
        
        for item in self.items:
            # Apply time decay if requested and stale
            if apply_decay and item.is_stale():
                item = item.with_time_decay()
            
            score = item.calculate_wsjf()
            results.append((item, score))
        
        # Sort by score descending
        results.sort(key=lambda x: x[1], reverse=True)
        
        return results
    
    def get_priorities(self, top_n: Optional[int] = None) -> List[Dict]:
        """Get prioritized list with anti-pattern warnings"""
        anti_patterns = self.detect_anti_patterns()
        calculated = self.calculate_all()
        
        priorities = []
        for item, score in calculated:
            priorities.append({
                'item': item.to_dict(),
                'wsjf_score': round(score, 2),
                'rank': len(priorities) + 1
            })
        
        if top_n:
            priorities = priorities[:top_n]
        
        return {
            'priorities': priorities,
            'anti_patterns': anti_patterns,
            'total_items': len(self.items),
            'generated_at': datetime.now().isoformat()
        }
    
    def create_override(self, item_id: str, new_score: float, 
                        overridden_by: str, reason: str,
                        authorization: Optional[str] = None) -> WsjfItem:
        """
        Create an audited override for an item.
        
        Args:
            item_id: ID of item to override
            new_score: New WSJF score
            overridden_by: Person/system making override
            reason: Written justification
            authorization: Optional authorization code
            
        Returns:
            Updated WsjfItem with override
        """
        item = next((i for i in self.items if i.id == item_id), None)
        if not item:
            raise WsjfError(f"Item {item_id} not found")
        
        original_score = item.calculate_wsjf()
        
        override = WsjfOverride(
            original_score=original_score,
            overridden_score=new_score,
            overridden_by=overridden_by,
            reason=reason,
            timestamp=datetime.now(),
            authorization=authorization
        )
        
        # Log the override
        self.audit_log.append({
            'action': 'OVERRIDE',
            'item_id': item_id,
            'override': override.to_dict(),
            'hash': self._calculate_hash(item)
        })
        
        # Create new item with override
        new_item = WsjfItem(
            id=item.id,
            title=item.title,
            business_value=item.business_value,
            time_criticality=item.time_criticality,
            risk_reduction=item.risk_reduction,
            job_size=item.job_size,
            deadline=item.deadline,
            justification=item.justification,
            override=override
        )
        
        # Replace in list
        self.items = [new_item if i.id == item_id else i for i in self.items]
        
        return new_item
    
    def _calculate_hash(self, item: WsjfItem) -> str:
        """Calculate hash for audit verification"""
        data = f"{item.id}:{item.business_value}:{item.time_criticality}:{item.risk_reduction}:{item.job_size}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def generate_daily_template(self, date: Optional[datetime] = None) -> str:
        """Generate daily WSJF template with fire items highlighted"""
        if date is None:
            date = datetime.now()
        
        priorities = self.get_priorities()
        
        # Categorize items
        fire_items = []  # WSJF > 20, deadline < 24h
        now_items = []   # WSJF > 10, deadline < 7 days
        batch_items = [] # WSJF < 10
        
        for p in priorities['priorities']:
            item = p['item']
            score = p['wsjf_score']
            
            deadline = None
            if item.get('deadline'):
                deadline = datetime.fromisoformat(item['deadline'])
            
            hours_to_deadline = None
            if deadline:
                hours_to_deadline = (deadline - datetime.now()).total_seconds() / 3600
            
            if score > 20 and hours_to_deadline is not None and hours_to_deadline < 24:
                fire_items.append(p)
            elif score > 10:
                now_items.append(p)
            else:
                batch_items.append(p)
        
        # Generate markdown
        template = f"""# WSJF Daily Priorities - {date.strftime('%Y-%m-%d')}

## 🔥 Fire Items (WSJF > 20, < 24h deadline)
"""
        
        if fire_items:
            for p in fire_items:
                item = p['item']
                template += f"- [ ] **{item['id']}**: {item['title']} | WSJF: {p['wsjf_score']}\n"
        else:
            template += "_No fire items today_\n"
        
        template += f"""
## ⚡ Now Items (WSJF > 10, < 7 days)
"""
        
        if now_items:
            for p in now_items[:5]:  # Top 5
                item = p['item']
                template += f"- [ ] **{item['id']}**: {item['title']} | WSJF: {p['wsjf_score']}\n"
        else:
            template += "_No now items_\n"
        
        template += f"""
## 📦 Batch Items (WSJF < 10)
"""
        
        if batch_items:
            template += f"- {len(batch_items)} items queued for batch processing\n"
        else:
            template += "_No batch items_\n"
        
        # Anti-pattern warnings
        if priorities['anti_patterns']:
            template += f"""
## ⚠️ Anti-Pattern Warnings
"""
            for ap in priorities['anti_patterns']:
                template += f"- **{ap['pattern']}** ({ap['severity']}): {ap['description']}\n"
                template += f"  - Mitigation: {ap['mitigation']}\n"
        
        template += f"""
## Validation Log
- Template generated: {datetime.now().isoformat()}
- Total items: {priorities['total_items']}
- Anti-patterns detected: {len(priorities['anti_patterns'])}
"""
        
        return template


def main():
    parser = argparse.ArgumentParser(
        description='WSJF Framework with Anti-Pattern Detection'
    )
    
    parser.add_argument('--input', '-i', help='JSON file with WSJF items')
    parser.add_argument('--output', '-o', help='Output file for results')
    parser.add_argument('--template', '-t', action='store_true', help='Generate daily template')
    parser.add_argument('--check', '-c', action='store_true', help='Check for anti-patterns')
    parser.add_argument('--top', '-n', type=int, default=10, help='Top N priorities')
    
    args = parser.parse_args()
    
    calculator = WsjfCalculator()
    
    if args.input:
        with open(args.input) as f:
            data = json.load(f)
        
        for item_data in data.get('items', []):
            deadline = None
            if item_data.get('deadline'):
                deadline = datetime.fromisoformat(item_data['deadline'])
            
            try:
                item = WsjfItem(
                    id=item_data['id'],
                    title=item_data['title'],
                    business_value=item_data['business_value'],
                    time_criticality=item_data['time_criticality'],
                    risk_reduction=item_data['risk_reduction'],
                    job_size=item_data['job_size'],
                    deadline=deadline,
                    justification=item_data.get('justification')
                )
                calculator.add_item(item)
            except InputValidationError as e:
                print(f"Error validating {item_data.get('id', 'unknown')}: {e}")
                continue
    
    if args.check:
        patterns = calculator.detect_anti_patterns()
        if patterns:
            print("Anti-patterns detected:")
            for p in patterns:
                print(f"  - {p['pattern']} ({p['severity']}): {p['description']}")
        else:
            print("No anti-patterns detected.")
    
    elif args.template:
        template = calculator.generate_daily_template()
        print(template)
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(template)
            print(f"\nTemplate saved to {args.output}")
    
    else:
        priorities = calculator.get_priorities(top_n=args.top)
        print(json.dumps(priorities, indent=2))
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(priorities, f, indent=2)
            print(f"\nResults saved to {args.output}")


if __name__ == '__main__':
    main()
