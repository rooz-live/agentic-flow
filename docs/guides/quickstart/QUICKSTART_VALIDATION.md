# Wholeness Validation Framework - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites
```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow/

# Ensure all validator files are present
ls -1 wholeness_*.py validate_*.py
# Should show:
# - wholeness_validation_framework.py
# - wholeness_validator_extended.py
# - wholeness_validator_legal_patterns.py
# - validate_legal_patterns_cli.py
```

### Basic Usage

#### 1. Validate a Single File
```bash
./validate_legal_patterns_cli.py \
  --file /path/to/SETTLEMENT-PROPOSAL.eml \
  --type settlement \
  --report summary
```

**Output**:
```
================================================================================
LEGAL PATTERN VALIDATION SUMMARY
================================================================================
File: SETTLEMENT-PROPOSAL.eml
Size: 15234 bytes

OVERALL ASSESSMENT
--------------------------------------------------------------------------------
Wholeness Score:     91.2%
Consensus Rating:    4.5/5.0
Recommendation:      APPROVE
Status:              PASS

LEGAL PATTERNS
--------------------------------------------------------------------------------
✅ Systemic Indifference: 40/40 - Strong systemic pattern
✅ ROAM Risk Coverage: All 4 categories present
✅ SoR Quality: Timeline + Evidence chain complete
✅ Signature Block: Settlement format validated
✅ Punitive Damages Foundation: NC § 1D-15 elements present

================================================================================
```

#### 2. Validate with Detailed Report
```bash
./validate_legal_patterns_cli.py \
  --file /path/to/document.eml \
  --report detailed \
  --verbose
```

**Includes**:
- Circle perspectives (analyst, assessor, innovator, etc.)
- Legal role perspectives (judge, prosecutor, defense)
- Government counsel reviews (county attorney, state AG, HUD)
- Detailed pattern analysis with evidence

#### 3. Batch Validate Directory
```bash
./validate_legal_patterns_cli.py \
  --batch /Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND/ \
  --recursive \
  --filter "*.eml" \
  --report summary \
  --verbose
```

**Output**:
```
Found 52 files to validate
  [PASS] SETTLEMENT-PROPOSAL-SCENARIO-A.eml
  [PASS] SETTLEMENT-PROPOSAL-SCENARIO-B.eml
  [PASS] SETTLEMENT-PROPOSAL-SCENARIO-C.eml
  [WARNING] LEASE-DISCOVERY-REQUEST.eml
  [PASS] ATTORNEY-GARY-FOCUSED-EMAIL.eml
  ...

================================================================================
BATCH VALIDATION SUMMARY
================================================================================
Total Files:    52
✅ Passed:      45
⚠️  Warnings:    5
❌ Failed:      2
🚨 Errors:      0

Pass Rate:      86.5%
================================================================================
```

#### 4. Save Report to JSON
```bash
./validate_legal_patterns_cli.py \
  --file document.eml \
  --report json \
  --output validation_report.json
```

---

## 🎯 Common Use Cases

### Use Case 1: Pre-Send Email Validation (Settlement)
```bash
# Validate before sending to opposing counsel
./validate_legal_patterns_cli.py \
  --file SETTLEMENT-PROPOSAL.eml \
  --type settlement \
  --min-wholeness 90.0 \
  --min-systemic-score 35 \
  --report summary

# Exit codes:
# 0 = PASS (safe to send)
# 1 = WARNING (review recommendations)
# 2 = FAIL (do not send)
```

**What It Checks**:
- ✅ Systemic indifference score ≥35/40
- ✅ Signature block uses settlement format (with methodology)
- ✅ Cross-org patterns minimal (focus on MAA only)
- ✅ ROAM risk mitigation present
- ✅ SoR quality with evidence chain
- ✅ Punitive damages foundation (NC Gen. Stat. § 1D-15)

### Use Case 2: Court Filing Validation
```bash
./validate_legal_patterns_cli.py \
  --file DISCOVERY-REQUEST.eml \
  --type court \
  --min-wholeness 85.0 \
  --report detailed
```

**What It Checks**:
- ✅ Signature block uses court format (no methodology)
- ✅ Cross-org patterns appropriate (analytical competency)
- ✅ Legal citations present
- ✅ Evidence chain with exhibit references
- ✅ Professional tone and formatting

### Use Case 3: Weekly Batch Validation (Quality Assurance)
```bash
# Run on all outbound correspondence weekly
./validate_legal_patterns_cli.py \
  --batch ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND/ \
  --recursive \
  --filter "*.eml" \
  --report json \
  --output weekly_validation_$(date +%Y%m%d).json \
  --verbose

# Then generate summary report
jq '.[] | select(.status != "PASS") | {file: .file, status: .status, score: .overall.wholeness_score}' \
  weekly_validation_20260211.json
```

### Use Case 4: CI/CD Integration (Pre-Commit Hook)
```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
set -e

# Validate all modified .eml files
git diff --cached --name-only --diff-filter=ACM | grep '.eml$' | while read file; do
  echo "Validating: $file"
  ./validate_legal_patterns_cli.py \
    --file "$file" \
    --type settlement \
    --min-wholeness 85.0 \
    --report summary || exit 1
done

echo "All files validated successfully"
```

---

## 📊 Understanding Validation Scores

### Wholeness Score (0-100%)
Composite score across 3 layers:

1. **Circle Perspectives** (40% weight)
   - Analyst: Data-driven analysis
   - Assessor: Risk evaluation
   - Innovator: Creative solutions
   - Intuitive: Gut-check validation
   - Orchestrator: Holistic coherence
   - Seeker: Truth-finding focus

2. **Legal Role Perspectives** (35% weight)
   - Judge: Impartiality and legal merit
   - Prosecutor: Strength of claims
   - Defense: Counter-argument assessment
   - Expert Witness: Technical accuracy
   - Jury: Clarity and persuasiveness
   - Mediator: Settlement potential

3. **Government Counsel Reviews** (25% weight)
   - County Attorney: Local jurisdiction
   - State AG Consumer Protection: Consumer rights
   - HUD Regional Counsel: Housing law compliance
   - Legal Aid: Pro se litigant support
   - Appellate Specialist: Appeal-proofing

**Score Interpretation**:
- **95-100%**: Exceptional - Ready for immediate use
- **90-94%**: Strong - Minor refinements suggested
- **85-89%**: Good - Review recommendations carefully
- **80-84%**: Acceptable - Address critical issues
- **<80%**: Needs Revision - Significant improvements required

### Consensus Rating (0.0-5.0)
Average agreement across all validators:
- **4.5-5.0**: Universal approval
- **4.0-4.4**: Strong consensus with minor concerns
- **3.5-3.9**: Mixed opinions - deeper review needed
- **3.0-3.4**: Significant disagreement - major revisions
- **<3.0**: Critical issues - do not proceed

### Systemic Indifference Score (0-40 points)
Legal pattern scoring based on NC case law:

**Temporal (0-10 points)**:
- 10 pts: ≥18 months duration with explicit mention
- 7-9 pts: 12-17 months or implied long duration
- 4-6 pts: 6-11 months
- 1-3 pts: <6 months
- 0 pts: No temporal evidence

**Hierarchical (0-10 points)**:
- 10 pts: 4+ organizational levels documented
- 7-9 pts: 3 levels (maintenance → manager → regional)
- 4-6 pts: 2 levels
- 1-3 pts: 1 level
- 0 pts: No hierarchy evidence

**Recurring (0-10 points)**:
- 10 pts: Same issues 4+ times with evidence
- 7-9 pts: 3 recurrences
- 4-6 pts: 2 recurrences
- 1-3 pts: Pattern suggested but not proven
- 0 pts: No recurrence

**Deliberate (0-10 points)**:
- 10 pts: Clear evidence of intentional avoidance (40+ cancellations)
- 7-9 pts: Strong pattern of avoidance (20-39)
- 4-6 pts: Moderate pattern (10-19)
- 1-3 pts: Some avoidance (5-9)
- 0 pts: No deliberate pattern

**Total Interpretation**:
- **35-40**: PROVEN systemic indifference (litigation-ready)
- **28-34**: Strong pattern (settlement leverage)
- **20-27**: Pattern suggested (needs more evidence)
- **<20**: Insufficient evidence (gather more data)

---

## 🛠️ CLI Options Reference

### Input Options
```bash
--file FILE, -f FILE          # Single file to validate
--batch DIR, -b DIR           # Directory for batch validation
```

### Document Type
```bash
--type TYPE, -t TYPE          # settlement, court, discovery, correspondence
```

### Report Format
```bash
--report FORMAT, -r FORMAT    # summary (default), detailed, json
--output FILE, -o FILE        # Output file (default: stdout)
```

### Batch Options
```bash
--recursive                   # Recursively search directories
--filter PATTERN              # File pattern (default: *.eml)
```

### Validation Thresholds
```bash
--min-systemic-score SCORE    # Minimum systemic score (default: 28/40)
--min-wholeness PERCENT       # Minimum wholeness % (default: 80.0)
```

### Misc
```bash
--verbose, -v                 # Verbose output with progress
--help, -h                    # Show help message
```

---

## 🚨 Exit Codes

- **0**: PASS - All validations passed
- **1**: WARNING - Some concerns but acceptable
- **2**: FAIL - Critical issues, do not proceed
- **3**: ERROR - Technical error during validation

**Usage in Scripts**:
```bash
if ./validate_legal_patterns_cli.py --file doc.eml --report summary; then
  echo "✅ Validation passed - safe to send"
else
  echo "❌ Validation failed - review before sending"
  exit 1
fi
```

---

## 📁 Example Files

### MAA Legal Case Files
```bash
# Primary settlement emails
/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND/

# Test files:
SETTLEMENT-PROPOSAL-SCENARIO-A.eml  # Conservative offer
SETTLEMENT-PROPOSAL-SCENARIO-B.eml  # Mid-range offer
SETTLEMENT-PROPOSAL-SCENARIO-C.eml  # Strong position
LEASE-DISCOVERY-REQUEST.eml         # Court filing
ATTORNEY-GARY-FOCUSED-EMAIL.eml     # Attorney communication
```

### Expected Results
```bash
# Scenario C should score highest
./validate_legal_patterns_cli.py --file SETTLEMENT-PROPOSAL-SCENARIO-C.eml
# Expected: 90-95% wholeness, 4.5/5.0 consensus, 38-40/40 systemic

# Discovery request (court format)
./validate_legal_patterns_cli.py --file LEASE-DISCOVERY-REQUEST.eml --type court
# Expected: 85-90% wholeness, signature block court format validated
```

---

## 🐛 Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'wholeness_validator_legal_patterns'"
**Solution**: Ensure all validator files are in the same directory:
```bash
ls -1 wholeness_*.py
# Should show all 3 files
```

### Issue: "UnicodeDecodeError: 'utf-8' codec can't decode"
**Solution**: File encoding issue. Convert to UTF-8:
```bash
iconv -f ISO-8859-1 -t UTF-8 input.eml > output.eml
```

### Issue: Low systemic indifference score (expected 40/40, got 15/40)
**Possible Causes**:
1. Document doesn't explicitly mention duration ("22 months")
2. Organizational hierarchy not clear (maintenance → manager → regional → corporate)
3. Recurring issues not documented (same problem multiple times)
4. Deliberate avoidance not proven (work order cancellations)

**Solution**: Review `ROBUSTNESS_IMPROVEMENTS.md` for systemic indifference guidance

### Issue: Signature block validation fails
**Possible Causes**:
1. Wrong document_type (use --type settlement or --type court)
2. Signature format doesn't match expected patterns
3. Missing contact information

**Expected Formats**:

**Settlement**:
```
Shahrooz Bhopti
Pro Se (Evidence-Based Systemic Analysis)
BSBA Finance/MIS (Managing Information Systems)
Phone: (412) 256-8390
Email: shahrooz@bhopti.com
Case: 26CV005596-590
```

**Court**:
```
Shahrooz Bhopti
Pro Se
BSBA Finance/MIS (Managing Information Systems)
Phone: (412) 256-8390
Email: shahrooz@bhopti.com
Case: 26CV005596-590
```

---

## 📚 Additional Resources

- **Full Documentation**: `WHOLENESS_VALIDATION_README.md`
- **Robustness Guide**: `ROBUSTNESS_IMPROVEMENTS.md`
- **Integration Summary**: `INTEGRATION_SUMMARY.md`
- **Batch Validation Script**: `validate_legal_case_batch.sh`

---

## 🎓 Advanced Usage

### Custom Validation Thresholds by Document Type
```bash
# Settlement (strict)
./validate_legal_patterns_cli.py \
  --file SETTLEMENT.eml \
  --type settlement \
  --min-wholeness 90.0 \
  --min-systemic-score 35

# Discovery (moderate)
./validate_legal_patterns_cli.py \
  --file DISCOVERY.eml \
  --type court \
  --min-wholeness 85.0 \
  --min-systemic-score 28

# Correspondence (lenient)
./validate_legal_patterns_cli.py \
  --file EMAIL.eml \
  --type correspondence \
  --min-wholeness 75.0 \
  --min-systemic-score 20
```

### Parallel Batch Processing
```bash
# Process multiple directories in parallel
find ~/Documents/Personal/CLT/MAA/ -type d -name "OUTBOUND" | \
  parallel --jobs 4 \
  "./validate_legal_patterns_cli.py --batch {} --recursive --report json --output {/.}_report.json"
```

### Automated Weekly Reports
```bash
# Add to crontab (run every Sunday at 9 AM)
0 9 * * 0 /path/to/validate_legal_patterns_cli.py \
  --batch ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND/ \
  --recursive \
  --report json \
  --output ~/validation_reports/weekly_$(date +\%Y\%m\%d).json && \
  mail -s "Weekly Validation Report" shahrooz@bhopti.com < ~/validation_reports/weekly_$(date +\%Y\%m\%d).json
```

---

## 🤝 Support

For issues, questions, or feature requests related to the wholeness validation framework, refer to:
- `ROBUSTNESS_IMPROVEMENTS.md` for known issues and enhancement roadmap
- `WHOLENESS_VALIDATION_README.md` for comprehensive documentation

**Current Status**: Framework is functional but undergoing robustness improvements (see `ROBUSTNESS_IMPROVEMENTS.md` Phase 2-7)
