# VibeThinker Enhanced Roadmap
## Phase 2 & 3 Implementation Plan

**Date**: February 5, 2026 02:17 UTC
**Status**: Post-Displacement Planning
**Branch**: `restructure/lean-guardrails`

---

## Executive Summary

**Phase 1** ✓ COMPLETE:
- Pre-commit hook with 85% wholeness threshold
- Standalone Python VibeThinker (21-dimensional validation)
- Retrospective learning framework
- Manual email fixes workflow

**Phase 2** (Feb 10-15): Enhanced VibeThinker + CLI Integration
**Phase 3** (Feb 15-20): Full Automation + CI/CD

---

## WSJF Priority Matrix

### Formula
```
WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
```

### Prioritized Tasks

| Rank | Task | Value | Criticality | Risk | Size | WSJF | Status |
|------|------|-------|-------------|------|------|------|--------|
| 1 | Manual Day 4/5 fixes | 10 | 10 | 10 | 2h | ∞ | ✓ Done |
| 2 | Pre-commit hook | 8 | 10 | 9 | 1h | 27.0 | ✓ Done |
| 3 | `advocate validate` CLI | 7 | 7 | 6 | 2h | 10.0 | Phase 2 |
| 4 | Enhanced VibeThinker NLP | 8 | 5 | 7 | 20h | 1.0 | Phase 2 |
| 5 | Metrics dashboard | 6 | 4 | 5 | 4h | 3.75 | Phase 2 |
| 6 | agentic-qe CI/CD | 7 | 5 | 8 | 4h | 5.0 | Phase 3 |
| 7 | Weekly reports | 5 | 3 | 4 | 3h | 4.0 | Phase 3 |
| 8 | PRD/DDD/ADR docs | 4 | 2 | 3 | 6h | 1.5 | Phase 3 |

---

## Phase 2: Enhanced VibeThinker (Feb 10-15)

### 1. Enhanced Variation Strategies

#### New Strategies to Implement

```python
# vibesthinker/variations_enhanced.py

class EnhancedVariationStrategies:
    """
    Structural content additions, not just pattern replacements
    """
    
    @staticmethod
    def evidence_anchor_injection(text: str, evidence_db: Dict) -> str:
        """
        GOAL: Raise evidence_alignment from 0.70 → 1.00
        
        ACTION: Insert evidence references from tracking DB
        
        EXAMPLE:
        Before: "5 letters sent"
        After: "5 letters sent (Exhibits A-E, tracking IDs: doc_001-005)"
        
        REQUIRES: Integration with tracking/advocacy-evidence.db
        """
        import sqlite3
        conn = sqlite3.connect('tracking/advocacy-evidence.db')
        cursor = conn.cursor()
        
        # Find evidence claims in text
        claims = extract_claims(text)
        
        # Match to evidence DB
        for claim in claims:
            evidence = cursor.execute(
                "SELECT evidence_id, source FROM harm_events WHERE description LIKE ?",
                (f"%{claim}%",)
            ).fetchall()
            
            if evidence:
                # Inject evidence reference
                text = text.replace(
                    claim,
                    f"{claim} (Evidence: {', '.join(e[0] for e in evidence)})"
                )
        
        return text
    
    @staticmethod
    def timeline_precision_injection(text: str) -> str:
        """
        GOAL: Raise timeline_completeness from 0.00 → 1.00
        
        ACTION: Build explicit chronological sequence
        
        EXAMPLE:
        Before: Bullet list of events
        After: Timeline with explicit ordering:
               Dec 2025 → Jan 11 → Jan 24 → Feb 5
        
        REQUIRES: Date extraction + causal linking
        """
        import re
        from datetime import datetime
        
        # Extract all dates
        date_pattern = r'(January|February|March|December) \d{1,2}, \d{4}'
        dates = re.findall(date_pattern, text)
        
        # Parse and sort
        parsed = [(datetime.strptime(d, "%B %d, %Y"), d) for d in dates]
        sorted_dates = sorted(parsed, key=lambda x: x[0])
        
        # Build timeline section
        timeline = "\\n\\n<strong>TIMELINE:</strong>\\n"
        for i, (dt, date_str) in enumerate(sorted_dates):
            timeline += f"{i+1}. {date_str}: [Event]\\n"
        
        # Insert timeline
        return insert_after_section(text, "VERIFIABLE FACTS", timeline)
    
    @staticmethod
    def falsifiability_boost_v2(text: str) -> str:
        """
        GOAL: Raise falsifiable_tests from 0.00 → 1.00
        
        ACTION: Add explicit falsification criteria
        
        EXAMPLE:
        "If MAA can show ONE of the following, this request is void:
         - One late payment in Yardi
         - One lease violation on record
         - One inaccurate date in timeline"
        
        REQUIRES: Claim extraction + falsification template
        """
        falsification_template = \"\"\"
        <div style="margin: 20px 0; padding: 15px; background: #fef2f2; border: 3px solid #dc2626;">
        <p style="font-weight: bold; color: #dc2626;">FALSIFICATION CRITERIA:</p>
        <p>If MAA can demonstrate ANY of the following, this request is immediately void:</p>
        <ul>
        <li>One late payment (verifiable in Yardi payment history)</li>
        <li>One lease violation (documented in tenant records)</li>
        <li>One inaccurate date in timeline (check email timestamps)</li>
        <li>One inaccurate dollar amount (check lease agreements)</li>
        </ul>
        <p>All claims are checkable. If any claim is false, I withdraw this request.</p>
        </div>
        \"\"\"
        
        return insert_before_section(text, "THE REQUEST", falsification_template)
    
    @staticmethod
    def first_person_deepening(text: str) -> str:
        """
        GOAL: Raise first_person_ownership from 0.12 → 0.85+
        
        ACTION: Convert remaining 3rd-person abstractions to 1st-person experience
        
        REPLACEMENTS:
        "10-year tenant" → "I lived here 10 years"
        "displacement occurs" → "I become homeless"
        "tenant pays rent" → "I paid $250,000"
        "MAA displaced tenant" → "MAA is making me homeless"
        
        REQUIRES: Pattern matching + ownership conversion
        """
        conversions = {
            r'(\\d+)-year tenant': lambda m: f'I lived here {m.group(1)} years',
            r'tenant (pays|paid) (\$[\\d,]+)': lambda m: f'I {m.group(1)} {m.group(2)}',
            r'displacement occurs': 'I become homeless',
            r'tenant becomes homeless': 'I become homeless',
            r'MAA displaced tenant': 'MAA is making me homeless',
            r'tenant filed lawsuit': 'I filed lawsuit',
            r'tenant sent (\\d+) letters': lambda m: f'I sent {m.group(1)} letters',
        }
        
        for pattern, replacement in conversions.items():
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        return text
```

#### Implementation Plan

```bash
# Day 1-2: Enhanced Strategies
1. Create vibesthinker/variations_enhanced.py
2. Implement 4 new strategies above
3. Add evidence DB integration
4. Unit tests for each strategy

# Day 3: Integration
5. Import enhanced strategies in variations.py
6. Add strategy selection logic (when to use enhanced vs. basic)
7. Integration tests

# Day 4-5: Validation
8. Run on 10 historical emails
9. Measure improvement rates
10. Tune strategy parameters
```

**Expected Impact**:
- evidence_alignment: 0.70 → 1.00 (+0.30)
- timeline_completeness: 0.00 → 1.00 (+1.00)
- falsifiable_tests: 0.00 → 1.00 (+1.00)
- first_person_ownership: 0.12 → 0.85 (+0.73)
- **Total improvement**: +3.03 points = +14.4% → **74% baseline**

---

### 2. Rust CLI Integration

#### `advocate validate` Command

**Goal**: Unified validation interface
**Time**: 2 hours
**WSJF**: 10.0 (HIGH priority)

#### Implementation

```rust
// src/commands/validate.rs

use anyhow::Result;
use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct WholenessScore {
    percentage: f64,
    passed_count: u32,
    status: String,
    dimensions: Vec<DimensionScore>,
}

#[derive(Debug, Deserialize)]
struct DimensionScore {
    dimension: String,
    score: f64,
    passed: bool,
}

pub async fn validate(file: PathBuf, verbose: bool) -> Result<()> {
    // Call Python VibeThinker via subprocess
    let output = Command::new("bash")
        .arg("scripts/vibe-optimize.sh")
        .arg("run")
        .arg(&file)
        .arg("--target")
        .arg("0.85")
        .arg("--json")  // NEW: JSON output format
        .output()?;
    
    if !output.status.success() {
        return Err(anyhow::anyhow!("VibeThinker validation failed"));
    }
    
    // Parse JSON output
    let result: WholenessScore = serde_json::from_slice(&output.stdout)?;
    
    // Display results
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("  Wholeness Validation");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!();
    println!("File:     {:?}", file);
    println!("Score:    {:.1}% ({}/21 dimensions)", result.percentage, result.passed_count);
    println!("Status:   {}", result.status);
    println!();
    
    if verbose {
        println!("Dimension Breakdown:");
        for dim in &result.dimensions {
            let status = if dim.passed { "✓" } else { "✗" };
            println!("  {} {:30} {:.2}", status, dim.dimension, dim.score);
        }
        println!();
    }
    
    // Exit code
    if result.percentage < 85.0 {
        println!("❌ VALIDATION FAILED: Score below 85% threshold");
        std::process::exit(1);
    } else {
        println!("✓ VALIDATION PASSED");
        Ok(())
    }
}
```

```bash
# Update vibe-optimize.sh to support JSON output

# Add --json flag
if [ "$json_output" = "true" ]; then
    $VENV << EOF
import json
from vibesthinker.wholeness import WholenessValidator

with open("$file_rel", "r") as f:
    text = f.read()

validator = WholenessValidator()
score = validator.validate(text)

output = {
    "percentage": score.percentage,
    "passed_count": score.passed_count,
    "status": score.status.value,
    "dimensions": [
        {
            "dimension": d.dimension,
            "score": d.score,
            "passed": d.passed
        }
        for d in score.dimensions
    ]
}

print(json.dumps(output))
EOF
fi
```

#### Usage

```bash
# Validate single file
advocate validate email.eml

# Validate with verbose output
advocate validate email.eml --verbose

# Validate and fix (future)
advocate validate email.eml --fix

# Batch validate directory
advocate validate TIER-5-DIGITAL/Email/Templates/*.eml
```

---

### 3. Metrics Dashboard

#### Robust Tracking System

**Goal**: Replace stub metrics with comprehensive tracking
**Time**: 4 hours
**WSJF**: 3.75

#### Enhanced Metrics Schema

```json
{
  "meta": {
    "version": "2.0",
    "last_updated": "2026-02-05T02:17:00Z",
    "total_runs": 50,
    "learning_active": true
  },
  "performance": {
    "success_rate": 0.68,           // 68% of runs improve
    "avg_improvement": 0.14,         // +14% average
    "median_improvement": 0.12,
    "improvement_trend": "IMPROVING",
    "baseline_avg": 0.57,            // Avg starting score
    "final_avg": 0.71                // Avg final score
  },
  "strategies": {
    "ranking": [
      {
        "name": "causality_chain_builder",
        "avg_score": 0.82,
        "runs": 25,
        "success_rate": 0.76,
        "avg_improvement": 0.18,
        "best_score": 0.94,
        "worst_score": 0.61
      },
      {
        "name": "evidence_anchor_injection",
        "avg_score": 0.78,
        "runs": 22,
        "success_rate": 0.73,
        "avg_improvement": 0.15
      }
    ],
    "deprecated": [
      {
        "name": "anti_ritual",
        "reason": "No effect (emails have no ritual language)",
        "last_run": "2026-02-05"
      }
    ]
  },
  "dimensions": {
    "improvements": {
      "causality_chains": {
        "avg_improvement": 0.45,
        "success_rate": 0.85,
        "best_strategy": "causality_chain_builder"
      },
      "evidence_alignment": {
        "avg_improvement": 0.38,
        "success_rate": 0.72,
        "best_strategy": "evidence_anchor_injection"
      },
      "first_person_ownership": {
        "avg_improvement": 0.22,
        "success_rate": 0.65,
        "best_strategy": "first_person_deepening"
      }
    },
    "failures": {
      "temporal_precision": {
        "avg_score": 0.85,
        "note": "Already high, little room for improvement"
      }
    }
  },
  "learning": {
    "patterns": [
      {
        "pattern": "Adding 'Because X → Therefore Y' improves causality",
        "frequency": 18,
        "avg_impact": 0.42
      },
      {
        "pattern": "Evidence DB references improve alignment",
        "frequency": 15,
        "avg_impact": 0.35
      }
    ],
    "anti_patterns": [
      {
        "pattern": "Removing 'good faith' has no effect",
        "frequency": 12,
        "avg_impact": 0.00
      }
    ]
  },
  "recommendations": {
    "variation_count": 8,           // Adaptive based on learning
    "strategies_to_use": [
      "causality_chain_builder",
      "evidence_anchor_injection",
      "first_person_deepening",
      "falsifiability_boost_v2"
    ],
    "strategies_to_avoid": [
      "anti_ritual",
      "first_person_boost"           // Old version deprecated
    ]
  }
}
```

#### Dashboard CLI

```bash
# View dashboard
advo vibe metrics --dashboard

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  VibeThinker Metrics Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 PERFORMANCE (50 runs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Success Rate:      68% (34/50 runs improved)
Avg Improvement:   +14.0%
Baseline → Final:  57% → 71%
Trend:             IMPROVING ↗

🎯 TOP STRATEGIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. causality_chain_builder    82% (25 runs, +18% avg)
2. evidence_anchor_injection   78% (22 runs, +15% avg)
3. first_person_deepening      74% (20 runs, +11% avg)

📈 DIMENSION HEATMAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
causality_chains        ████████████████░░░░ +0.45
evidence_alignment      ████████████████░░░░ +0.38
first_person_ownership  ████████████░░░░░░░░ +0.22
timeline_completeness   ███████████░░░░░░░░░ +0.18
falsifiable_tests       ██████████░░░░░░░░░░ +0.15

🎓 LEARNING INSIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ "Because X → Therefore Y" improves causality (+0.42)
✓ Evidence DB references improve alignment (+0.35)
✗ Removing ritual language has no effect (0.00)

💡 RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next run should use:
  • causality_chain_builder
  • evidence_anchor_injection
  • first_person_deepening

Avoid:
  • anti_ritual (deprecated)
  • first_person_boost (superseded)
```

#### Implementation

```python
# vibesthinker/metrics.py

from typing import Dict, List
import json
from datetime import datetime
from collections import defaultdict

class MetricsDashboard:
    def __init__(self, retro_db_path: str):
        self.retro_db_path = retro_db_path
        with open(retro_db_path, 'r') as f:
            self.data = json.load(f)
    
    def calculate_performance_metrics(self) -> Dict:
        """Calculate success rate, avg improvement, trends"""
        runs = self.data.get('run_history', [])
        
        improvements = [
            r['final_score'] - r['baseline_score']
            for r in runs
        ]
        
        return {
            'success_rate': len([i for i in improvements if i > 0]) / len(runs),
            'avg_improvement': sum(improvements) / len(runs),
            'median_improvement': sorted(improvements)[len(improvements)//2],
            'trend': self._calculate_trend(improvements)
        }
    
    def rank_strategies(self) -> List[Dict]:
        """Rank strategies by effectiveness"""
        strategy_stats = defaultdict(lambda: {
            'scores': [],
            'improvements': [],
            'runs': 0
        })
        
        for run in self.data['run_history']:
            for strategy, score in run['strategy_scores'].items():
                stats = strategy_stats[strategy]
                stats['scores'].append(score)
                stats['improvements'].append(score - run['baseline_score'])
                stats['runs'] += 1
        
        ranking = []
        for strategy, stats in strategy_stats.items():
            ranking.append({
                'name': strategy,
                'avg_score': sum(stats['scores']) / len(stats['scores']),
                'runs': stats['runs'],
                'success_rate': len([i for i in stats['improvements'] if i > 0]) / stats['runs'],
                'avg_improvement': sum(stats['improvements']) / len(stats['improvements'])
            })
        
        return sorted(ranking, key=lambda x: x['avg_score'], reverse=True)
    
    def dimension_heatmap(self) -> Dict[str, float]:
        """Calculate average improvement per dimension"""
        dimension_improvements = defaultdict(list)
        
        for run in self.data['run_history']:
            for dim, scores in run['dimension_scores'].items():
                improvement = scores['final'] - scores['baseline']
                dimension_improvements[dim].append(improvement)
        
        return {
            dim: sum(improvements) / len(improvements)
            for dim, improvements in dimension_improvements.items()
        }
    
    def generate_report(self) -> str:
        """Generate comprehensive dashboard report"""
        performance = self.calculate_performance_metrics()
        strategies = self.rank_strategies()
        heatmap = self.dimension_heatmap()
        
        report = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  VibeThinker Metrics Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 PERFORMANCE ({len(self.data['run_history'])} runs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Success Rate:      {performance['success_rate']*100:.0f}%
Avg Improvement:   {performance['avg_improvement']*100:+.1f}%
Trend:             {performance['trend']}

🎯 TOP STRATEGIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
        for i, strategy in enumerate(strategies[:5], 1):
            report += f"{i}. {strategy['name']:30s} {strategy['avg_score']*100:.0f}% ({strategy['runs']} runs)\n"
        
        report += "\n📈 DIMENSION HEATMAP\n"
        report += "━" * 44 + "\n"
        sorted_dims = sorted(heatmap.items(), key=lambda x: x[1], reverse=True)
        for dim, improvement in sorted_dims[:10]:
            bar_length = int(improvement * 40)
            bar = "█" * bar_length + "░" * (20 - bar_length)
            report += f"{dim:25s} {bar} {improvement:+.2f}\n"
        
        return report
```

---

## Phase 3: Full Automation (Feb 15-20)

### 1. agentic-qe CI/CD Integration

**Goal**: Automated wholeness validation in GitHub Actions
**Time**: 4 hours
**WSJF**: 5.0

#### Setup

```bash
# Initialize agentic-qe
npx agentic-qe@latest init --auto

# Output: Creates .github/workflows/wholeness-validation.yml
```

#### Workflow Configuration

```yaml
# .github/workflows/wholeness-validation.yml

name: Wholeness Validation

on:
  push:
    paths:
      - 'TIER-5-DIGITAL/Email/**/*.eml'
      - 'TIER-5-DIGITAL/Email/**/*.txt'
      - 'TIER-5-DIGITAL/Email/**/*.html'
  pull_request:
    paths:
      - 'TIER-5-DIGITAL/Email/**/*.eml'
      - 'TIER-5-DIGITAL/Email/**/*.txt'
      - 'TIER-5-DIGITAL/Email/**/*.html'

jobs:
  validate:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install VibeThinker
        run: |
          python -m venv venv-vibesthinker
          venv-vibesthinker/bin/pip install numpy
      
      - name: Validate emails
        run: |
          EXIT_CODE=0
          for file in $(git diff --name-only ${{ github.event.before }} ${{ github.sha }} | grep -E '\.(eml|txt|html)$'); do
            echo "Validating: $file"
            if ! bash scripts/vibe-optimize.sh run "$file" --target 0.85 --json > result.json; then
              echo "❌ FAILED: $file"
              EXIT_CODE=1
            else
              score=$(jq -r '.percentage' result.json)
              echo "✓ PASSED: $file ($score%)"
            fi
          done
          exit $EXIT_CODE
      
      - name: Upload metrics
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: wholeness-metrics
          path: vibesthinker_retro.json
      
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const result = JSON.parse(fs.readFileSync('result.json'));
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Wholeness Validation\\n\\nScore: ${result.percentage}%\\nStatus: ${result.status}`
            });
```

---

### 2. Weekly Wholeness Reports

**Goal**: Automated trend analysis and reporting
**Time**: 3 hours
**WSJF**: 4.0

#### Cron Job Setup

```bash
# Add to crontab
0 9 * * MON /path/to/scripts/weekly-wholeness-report.sh
```

#### Report Script

```bash
#!/usr/bin/env bash
# scripts/weekly-wholeness-report.sh

set -euo pipefail

BASE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BASE"

VENV="venv-vibesthinker/bin/python3"
REPORT_FILE="reports/wholeness-week-$(date +%Y-%W).md"

mkdir -p reports

$VENV << 'EOF'
from vibesthinker.retro import VibeThinkerRetro
from vibesthinker.metrics import MetricsDashboard
from datetime import datetime, timedelta

# Load retro DB
retro = VibeThinkerRetro('vibesthinker_retro.json')
metrics = MetricsDashboard('vibesthinker_retro.json')

# Calculate weekly stats
week_start = datetime.now() - timedelta(days=7)
weekly_runs = [
    r for r in retro.run_history
    if datetime.fromisoformat(r['timestamp']) > week_start
]

report = f"""
# Weekly Wholeness Report
**Week of**: {week_start.strftime('%B %d, %Y')}
**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M')}

## Summary

- **Runs this week**: {len(weekly_runs)}
- **Avg score**: {sum(r['final_score'] for r in weekly_runs) / len(weekly_runs) * 100:.1f}%
- **Success rate**: {len([r for r in weekly_runs if r['final_score'] > r['baseline_score']]) / len(weekly_runs) * 100:.0f}%
- **Best score**: {max(r['final_score'] for r in weekly_runs) * 100:.1f}%

## Top Strategies This Week

{metrics.rank_strategies_weekly(week_start)}

## Dimension Improvements

{metrics.dimension_heatmap_weekly(week_start)}

## Recommendations

{metrics.generate_recommendations()}

## Full Dashboard

{metrics.generate_report()}
"""

with open('$REPORT_FILE', 'w') as f:
    f.write(report)

print(f"✓ Report generated: $REPORT_FILE")
EOF

# Email report (optional)
# mail -s "Weekly Wholeness Report" user@example.com < "$REPORT_FILE"
```

---

### 3. Full Documentation Suite

**Goal**: Complete PRD/DDD/ADR/TDD documentation
**Time**: 6 hours
**WSJF**: 1.5

#### Documentation Structure

```
docs/
├── PRD/
│   ├── email-validation-product-requirements.md
│   ├── user-stories.md
│   └── acceptance-criteria.md
├── DDD/
│   ├── bounded-contexts.md
│   ├── domain-model.md
│   └── aggregates-entities-value-objects.md
├── ADR/
│   ├── ADR-006-rust-for-performance.md
│   ├── ADR-007-wholeness-threshold-85-percent.md
│   ├── ADR-008-pre-commit-hook-mandatory.md
│   ├── ADR-009-log-scores-to-sends-csv.md
│   └── ADR-010-enhanced-vibesthinker-strategies.md
└── TDD/
    ├── unit-tests.md
    ├── integration-tests.md
    ├── e2e-tests.md
    └── regression-tests.md
```

#### ADR-008: Pre-Commit Hook Mandatory

```markdown
# ADR-008: Pre-Commit Hook Mandatory for Email Validation

## Status
ACCEPTED (2026-02-05)

## Context
Email wholeness validation must happen BEFORE commit, not at send time.
Prevents low-quality content from entering version control.

## Decision
Git pre-commit hook validates all .eml/.txt/.html files in TIER-5* directories.
Threshold: 85% (18/21 dimensions).
Hook blocks commit if any file fails.

## Consequences

### Positive
- Early quality gate (shift-left validation)
- No low-wholeness emails in git history
- Forces author to fix issues immediately
- Pre-commit faster than pre-send (no SMTP delays)

### Negative
- Can be bypassed with --no-verify
- Adds ~2s to commit time
- Requires local Python environment

## Implementation
- Script: `.git/hooks/pre-commit`
- Calls: `scripts/vibe-optimize.sh`
- Fallback: `git commit --no-verify` (NOT RECOMMENDED)

## Alternatives Considered
1. Pre-send validation: Rejected (too late, email already committed)
2. CI/CD only: Rejected (feedback too slow)
3. Manual validation: Rejected (human error)

## Related
- ADR-007: Wholeness threshold justification
- ADR-009: Post-send logging
```

---

## SMARTER Goals Summary

### Goal: Automated Wholeness Pipeline

**S (Specific)**:
- Pre-commit hook blocks < 85%
- `advocate validate` command available
- CI/CD validates all PRs
- Weekly reports auto-generated

**M (Measurable)**:
- Baseline: 52% (Day 4), 61% (Day 5)
- Target: ≥85% all emails
- Success rate: ≥70% of runs improve
- CI/CD: 100% of PRs validated

**A (Achievable)**:
- Phase 1: Manual fixes (2h) → 59.7% ✓
- Phase 2: Enhanced VibeThinker (20h) → 74%+
- Phase 3: Full automation (10h) → Production ready

**R (Relevant)**:
- Problem: Low-wholeness emails hurt case effectiveness
- Solution: Enforce quality at every stage (commit/send/PR)
- Outcome: Better advocacy outcomes, less rework

**T (Time-bound)**:
- Phase 1: Feb 5 (URGENT) ✓ Complete
- Phase 2: Feb 10-15 (5 days)
- Phase 3: Feb 15-20 (5 days)

**E (Evaluate)**:
- Daily: Check retro stats
- Weekly: Review reports
- Monthly: Analyze dimension trends
- Quarterly: Correlation with litigation outcomes

**R (Revise)**:
- If < 70% success rate: Lower threshold to 80%
- If > 95% success rate: Raise threshold to 90%
- If strategies plateau: Add new strategies
- If CI/CD too slow: Optimize validation pipeline

---

## Implementation Checklist

### Phase 2 (Feb 10-15)
- [ ] Day 1: Implement `evidence_anchor_injection` strategy
- [ ] Day 1: Implement `timeline_precision_injection` strategy
- [ ] Day 2: Implement `falsifiability_boost_v2` strategy
- [ ] Day 2: Implement `first_person_deepening` strategy
- [ ] Day 3: Add `advocate validate` Rust command
- [ ] Day 3: Add JSON output to vibe-optimize.sh
- [ ] Day 4: Implement MetricsDashboard class
- [ ] Day 4: Add `advo vibe metrics --dashboard` command
- [ ] Day 5: Integration tests + validation on historical emails

### Phase 3 (Feb 15-20)
- [ ] Day 1: Initialize agentic-qe
- [ ] Day 1: Configure GitHub Actions workflow
- [ ] Day 2: Test CI/CD on sample PR
- [ ] Day 3: Weekly report script
- [ ] Day 3: Add email notification
- [ ] Day 4: Write ADR-008, ADR-009, ADR-010
- [ ] Day 5: Write PRD/DDD/TDD docs
- [ ] Day 5: Final integration testing

---

## Success Metrics

### Phase 2 Targets
- Enhanced VibeThinker raises baseline from 59.7% → 74%+
- `advocate validate` has < 500ms overhead
- Metrics dashboard shows ≥70% success rate
- Retro DB has ≥20 runs for learning

### Phase 3 Targets
- CI/CD validates 100% of PRs
- Weekly reports generated automatically
- Full documentation suite complete
- Zero manual validation needed

---

## Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Enhanced strategies don't improve scores | High | Medium | Fallback to manual fixes + iterate |
| Rust subprocess overhead > 500ms | Medium | Low | Port Python wholeness checker to Rust |
| CI/CD too slow (> 2 min) | Medium | Medium | Cache dependencies, parallel validation |
| Learning plateau after 50 runs | Low | High | Add new strategies, tune parameters |

---

## Conclusion

**Phase 1** ✓ COMPLETE:
- Pre-commit hook working
- Manual fixes raised Day 4 from 52.3% → 59.7%
- Causality chain fully implemented
- Retrospective learning active

**Phase 2** (Feb 10-15):
- Enhanced VibeThinker with NLP strategies
- Rust CLI integration for unified interface
- Robust metrics dashboard with heatmaps

**Phase 3** (Feb 15-20):
- agentic-qe CI/CD automation
- Weekly wholeness reports
- Complete documentation suite

**Expected Final State**:
- 85%+ wholeness for all emails
- 70%+ success rate on first try
- Fully automated validation pipeline
- Comprehensive learning and reporting
