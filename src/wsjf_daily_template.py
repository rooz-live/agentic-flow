#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WSJF DAILY TEMPLATE GENERATOR
=============================
Generates daily task templates with WSJF prioritization built-in.
Integrates with fire-focused daily routines.

Usage:
    python3 src/wsjf_daily_template.py --today
    python3 src/wsjf_daily_template.py --week
    python3 src/wsjf_daily_template.py --fire-focus
    python3 src/wsjf_daily_template.py --generate >> _WSJF-TRACKER/$(date +%Y-%m-%d)-DAILY.md

Definition of Ready (DoR):
- WSJF task list populated with business_value, time_criticality, risk_reduction, job_size
- Deadline hours and impact dollars provided for NOW-horizon tasks
- ROAM risk identifiers linked where applicable

Definition of Done (DoD):
- Generated template contains all three horizons (NOW / NEXT / LATER)
- Fire-focus mode emits only WSJF ≥ 20.0 or deadline < 48h tasks
- OODA loop section and evening retro section present in output
- Markdown output is valid and appendable to _WSJF-TRACKER directory
"""

import argparse
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List, Optional
from enum import Enum


class Horizon(Enum):
    NOW = "NOW"
    NEXT = "NEXT"
    LATER = "LATER"


@dataclass
class WsjfTask:
    """Single task with WSJF scoring"""
    title: str
    business_value: int  # 1-10
    time_criticality: int  # 1-10
    risk_reduction: int  # 1-10
    job_size: int  # 1-10 (hours / 10, max 10)
    deadline_hours: Optional[float] = None
    impact_dollars: Optional[int] = None
    roam_risk: Optional[str] = None
    
    @property
    def wsjf_score(self) -> float:
        """Calculate WSJF score: (BV + TC + RR) / JS"""
        if self.job_size == 0:
            return float('inf')
        return round((self.business_value + self.time_criticality + self.risk_reduction) / self.job_size, 2)
    
    @property
    def horizon(self) -> Horizon:
        """Assign to horizon based on WSJF score"""
        if self.wsjf_score >= 20.0 or (self.deadline_hours and self.deadline_hours < 48):
            return Horizon.NOW
        elif self.wsjf_score >= 10.0 or (self.deadline_hours and self.deadline_hours < 168):
            return Horizon.NEXT
        else:
            return Horizon.LATER
    
    def to_markdown(self) -> str:
        icon = "🔥" if self.horizon == Horizon.NOW else "📋" if self.horizon == Horizon.NEXT else "📅"
        return f"""
### {icon} {self.title}
- **WSJF Score:** {self.wsjf_score}/10
- **Components:** BV={self.business_value}, TC={self.time_criticality}, RR={self.risk_reduction}, JS={self.job_size}
- **Horizon:** {self.horizon.value}
- **Deadline:** {self.deadline_hours or 'N/A'}h
- **Impact:** ${self.impact_dollars or 'N/A'}
- **ROAM Risk:** {self.roam_risk or 'N/A'}

**Why this priority:**
- Business Value: ________________
- Time Criticality: ________________
- Risk Reduction: ________________
- Job Size Estimate: ________________

**Completion:**
- [ ] Started at: _____
- [ ] Completed at: _____
- [ ] Evidence of completion: ________________
"""


class DailyTemplate:
    """Generates daily WSJF-structured templates"""
    
    def __init__(self, date: Optional[datetime] = None):
        self.date = date or datetime.now()
        self.tasks: List[WsjfTask] = []
    
    def add_task(self, task: WsjfTask):
        self.tasks.append(task)
    
    def generate_fire_focus(self) -> str:
        """Generate fire-focused template (NOW items only)"""
        now_tasks = [t for t in self.tasks if t.horizon == Horizon.NOW]
        now_tasks.sort(key=lambda x: x.wsjf_score, reverse=True)
        
        md = f"""# 🔥 FIRE FOCUS: {self.date.strftime('%Y-%m-%d')}

**Objective:** Complete ONLY NOW items (WSJF ≥ 20.0 or deadline < 48h)  
**Rule:** No context switching. One fire at a time.  
**Exit Condition:** All NOW items complete OR deadline reached.

---

## Morning OODA (Complete before Fire #1)

### Observe
- [ ] Inbox cleared (0 new)
- [ ] Retry queue reviewed ({len(now_tasks)} NOW items identified)
- [ ] Invariant violations checked

### Orient  
- [ ] Position relative to deadline: _____ hours remaining
- [ ] Evidence gaps identified: _____
- [ ] Blockers cleared: _____

### Decide
- [ ] Fire #1 selected: _________________________________
- [ ] Fire #2 selected: _________________________________
- [ ] Fire #3 selected: _________________________________

---

## Today's Fires (NOW Queue)

"""
        
        for i, task in enumerate(now_tasks[:5], 1):
            md += f"""
### Fire #{i}: {task.title}
**WSJF:** {task.wsjf_score} | **Deadline:** {task.deadline_hours or 'N/A'}h | **Impact:** ${task.impact_dollars or 'N/A'}

```wsjf
Business Value:    {task.business_value}/10  |  Why urgent? ________________
Time Criticality:  {task.time_criticality}/10  |  Deadline? ________________
Risk Reduction:    {task.risk_reduction}/10  |  What fails if delayed? ________________
Job Size:          {task.job_size}/10     |  Hours to complete? ________________
────────────────────────────────────────────────────────────────
WSJF Score:        {task.wsjf_score}
```

- [ ] **Started:** _____
- [ ] **Completed:** _____
- [ ] **Evidence:** _____

**Blockers:**
- _________________________________
- _________________________________

"""
        
        md += """
---

## Evening Retro (Complete after Fire #3)

### Wins
- [ ] Fire #1 completed: _____
- [ ] Fire #2 completed: _____
- [ ] Fire #3 completed: _____

### Learnings
- What worked: _________________________________
- What didn't: _________________________________
- What to change: _________________________________

### Tomorrow's Prep
- [ ] NEXT items reviewed
- [ ] Evidence gathered for: _____
- [ ] WSJF scores updated

---

**Template Generated:** {now}
**Next Fire Drill:** Tomorrow 08:00
""".format(now=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        
        return md
    
    def generate_full_day(self) -> str:
        """Generate full daily template with all horizons"""
        now_tasks = [t for t in self.tasks if t.horizon == Horizon.NOW]
        next_tasks = [t for t in self.tasks if t.horizon == Horizon.NEXT]
        later_tasks = [t for t in self.tasks if t.horizon == Horizon.LATER]
        
        now_tasks.sort(key=lambda x: x.wsjf_score, reverse=True)
        next_tasks.sort(key=lambda x: x.wsjf_score, reverse=True)
        
        md = f"""# 📅 WSJF Daily Template: {self.date.strftime('%Y-%m-%d %A')}

## Morning Standup

**Yesterday's completion rate:** _____%  
**Today's fire count:** {len(now_tasks)} NOW items  
**Blockers:** _____

---

## 🔥 NOW (WSJF ≥ 20.0 | Deadline < 48h)

**Focus:** Complete these before ANY other work.

"""
        for task in now_tasks[:3]:
            md += task.to_markdown()
        
        md += f"""
---

## 📋 NEXT (WSJF 10-20 | Strategic Queue)

**Focus:** These become NOW if completed early or deadline approaches.

"""
        for task in next_tasks[:3]:
            md += task.to_markdown()
        
        md += f"""
---

## 📅 LATER (WSJF < 10 | Horizon Watch)

**Focus:** No action required. Monitor for status changes.

| Task | WSJF | Watch Condition |
|------|------|-----------------|
"""
        for task in later_tasks[:5]:
            md += f"| {task.title[:30]}... | {task.wsjf_score} | Deadline approaching |\n"
        
        md += """
---

## 🔄 Cancelled Retry Queue

**Today's retry targets:**
- [ ] Review yesterday's cancellations
- [ ] Gather missing evidence bundles
- [ ] Attempt reclassification for WSJF > 10

---

## 📊 End-of-Day Metrics

```
Tasks Completed:     _____/_____ (_____%)
NOW Items Done:      _____/_____
WSJF Score Updated:  [ ] Yes  [ ] No
Invariant Violations: _____
Evidence Gaps Closed: _____
Retry Success Rate:  _____%
```

---

**Generated by:** wsjf_daily_template.py  
**Fire Drill Status:** {'READY' if now_tasks else 'NO FIRES'}
"""
        
        return md
    
    def generate_weekly(self) -> str:
        """Generate weekly planning template"""
        week_start = self.date - timedelta(days=self.date.weekday())
        
        md = f"""# 📆 Weekly WSJF Plan: Week of {week_start.strftime('%Y-%m-%d')}

## Week Objectives

**Primary Goal:** _________________________________  
**Success Metric:** _________________________________  
**Risk to Monitor:** _________________________________

---

## Daily Fire Allocation

| Day | Fire Focus | WSJF Target | Deadline Pressure |
|-----|------------|-------------|-------------------|
| Mon | _____ | _____ | _____ |
| Tue | _____ | _____ | _____ |
| Wed | _____ | _____ | _____ |
| Thu | _____ | _____ | _____ |
| Fri | _____ | _____ | _____ |

---

## Strategic Initiatives (NEXT/LATER)

### This Week (MOVE to NOW if bandwidth)
- [ ] _________________________________
- [ ] _________________________________

### Next Week (Stay in NEXT)
- [ ] _________________________________
- [ ] _________________________________

### Future (Monitor in LATER)
- [ ] _________________________________
- [ ] _________________________________

---

## Weekly Retro Template

### What Went Well
1. _________________________________
2. _________________________________

### What Didn't
1. _________________________________
2. _________________________________

### WSJF Calibration
- [ ] Score accuracy: _____% correct prioritization
- [ ] Time estimates: _____% accurate
- [ ] Job size drift: _____ hours average

### Next Week Adjustments
- Strategy change: _________________________________
- Process improvement: _________________________________
- Tooling needed: _________________________________

---

**Plan Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
"""
        return md


def get_sample_tasks() -> List[WsjfTask]:
    """Return sample tasks for demonstration"""
    return [
        WsjfTask(
            title="Doug Settlement Response - Counter-Offer",
            business_value=10,
            time_criticality=10,
            risk_reduction=8,
            job_size=2,
            deadline_hours=21.5,
            impact_dollars=85000,
            roam_risk="SITUATIONAL"
        ),
        WsjfTask(
            title="Evidence Bundle - Medical Records",
            business_value=8,
            time_criticality=7,
            risk_reduction=9,
            job_size=3,
            deadline_hours=48,
            roam_risk="MITIGATED"
        ),
        WsjfTask(
            title="Invariant Validator Implementation",
            business_value=6,
            time_criticality=5,
            risk_reduction=10,
            job_size=5,
            roam_risk="ACCEPTED"
        ),
        WsjfTask(
            title="NAPI-RS FFI Production Deployment",
            business_value=7,
            time_criticality=4,
            risk_reduction=7,
            job_size=6,
            roam_risk="RESOLVED"
        ),
        WsjfTask(
            title="CV Deployment Pipeline cPanel Integration",
            business_value=5,
            time_criticality=3,
            risk_reduction=5,
            job_size=4,
            roam_risk="ACCEPTED"
        ),
    ]


def main():
    parser = argparse.ArgumentParser(description='WSJF Daily Template Generator')
    parser.add_argument('--today', action='store_true', help='Generate today\'s fire-focus template')
    parser.add_argument('--week', action='store_true', help='Generate weekly planning template')
    parser.add_argument('--fire-focus', action='store_true', help='Generate fire-focused template')
    parser.add_argument('--generate', action='store_true', help='Generate full template (for piping)')
    parser.add_argument('--with-samples', action='store_true', help='Include sample tasks')
    
    args = parser.parse_args()
    
    template = DailyTemplate()
    
    if args.with_samples:
        for task in get_sample_tasks():
            template.add_task(task)
    
    if args.fire_focus or args.today:
        print(template.generate_fire_focus())
    elif args.week:
        print(template.generate_weekly())
    elif args.generate:
        print(template.generate_full_day())
    else:
        # Default: fire focus with samples
        for task in get_sample_tasks():
            template.add_task(task)
        print(template.generate_fire_focus())


if __name__ == '__main__':
    main()
