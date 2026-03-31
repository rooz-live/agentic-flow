# Wholeness Validation Framework

**Integrated multi-perspective validation system combining circle-based orchestration, legal role simulation, government counsel review, and software pattern analysis.**

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 WHOLENESS VALIDATION FRAMEWORK                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─ LAYER 1: Circle-Based Orchestration (Holacracy)
                              │  ├─ Analyst    (Data quality, metrics)
                              │  ├─ Assessor   (BLOCKER remediation, dependencies)
                              │  ├─ Innovator  (Federation, automation)
                              │  ├─ Intuitive  (Observability, sensemaking)
                              │  ├─ Orchestrator (BML cycles, coordination)
                              │  └─ Seeker     (Dependencies, maintenance)
                              │
                              ├─ LAYER 2: Legal Role Simulation
                              │  ├─ Judge      (Procedure, precedent)
                              │  ├─ Prosecutor (Plaintiff arguments)
                              │  ├─ Defense    (Defendant counterarguments)
                              │  ├─ Expert Witness (Domain expertise)
                              │  ├─ Jury       (Common sense, reasonableness)
                              │  └─ Mediator   (Settlement facilitation)
                              │
                              ├─ LAYER 3: Government Counsel Review
                              │  ├─ County Attorney (Local law)
                              │  ├─ State AG Consumer (UDTP)
                              │  ├─ HUD Regional (Federal housing)
                              │  ├─ Legal Aid (Pro se viability)
                              │  └─ Appellate Specialist (Precedent)
                              │
                              └─ LAYER 4: Software Pattern Analysis
                                 ├─ PRD (Product Requirements)
                                 ├─ ADR (Architecture Decisions)
                                 ├─ DDD (Domain-Driven Design)
                                 └─ TDD (Test-Driven Development)
```

---

## 🎯 Key Features

### **1. Multi-Perspective Validation**
- **6 Circles**: Holacracy-based organizational perspectives
- **6 Legal Roles**: Adversarial + collaborative viewpoints
- **5 Government Counsels**: Multi-jurisdiction expert review
- **4 Software Patterns**: PRD/ADR/DDD/TDD compliance

### **2. Comprehensive Scoring**
- **Wholeness Score**: 0-100% (all checks passed)
- **Consensus Rating**: 0-5.0 (average counsel rating)
- **Overall Recommendation**: APPROVE / NEEDS_REVISION / REJECT
- **Per-Check Severity**: critical / warning / info

### **3. Flexible Execution**
- **CLI Interface**: Validate single files or batch
- **Selective Validation**: Choose specific circles/roles/counsels
- **Pattern Detection**: Automatic software pattern recognition
- **JSON Output**: Machine-readable reports

---

## 📦 Installation

```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# Ensure Python 3.10+
python3 --version

# Make scripts executable
chmod +x wholeness_validation_framework.py
chmod +x wholeness_validator_extended.py
chmod +x validate_legal_case_batch.sh

# Test installation
python3 wholeness_validation_framework.py
```

---

## 🚀 Quick Start

### **Example 1: Validate Single Email**

```bash
python3 wholeness_validator_extended.py \
  --file /path/to/LEASE-DISCOVERY-REQUEST.eml \
  --circles all \
  --roles judge,prosecutor,defense,mediator \
  --counsels county_attorney,legal_aid \
  --patterns adr,prd \
  --blockers "lease verification" \
  --output report.json \
  --verbose
```

**Output:**
```
Validating: LEASE-DISCOVERY-REQUEST.eml
Circles: 6, Roles: 4, Counsels: 2, Patterns: 2

================================================================================
WHOLENESS VALIDATION REPORT
================================================================================
Document: eml
Timestamp: 2026-02-11T17:30:00Z

OVERALL ASSESSMENT
--------------------------------------------------------------------------------
Wholeness Score: 87.5%
Consensus Rating: 4.2/5.0
Recommendation: APPROVE - Ready to send

CIRCLE PERSPECTIVES
--------------------------------------------------------------------------------

ANALYST: 100.0% pass rate
  Purpose: Data quality foundation and risk analytics baseline
  ✅ [CRITICAL] Contains quantitative evidence (dates, amounts, counts)
     → Document includes measurable data
  ✅ [CRITICAL] Timeline/dates are present and trackable
     → Timeline present
  ✅ [WARNING] References to supporting evidence/documentation
     → Evidence cited

ASSESSOR: 100.0% pass rate
  Purpose: BLOCKER remediation and dependency validation
  ✅ [CRITICAL] All known blockers are addressed
     → All 1 blockers addressed
  ✅ [WARNING] Dependencies are clearly identified
     → Dependencies mapped
  ✅ [CRITICAL] Clear remediation/next steps provided
     → Remediation path clear

...
```

---

### **Example 2: Batch Validate Legal Case Files**

```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
./validate_legal_case_batch.sh
```

**Output:**
```
═══════════════════════════════════════════════════════════
      Wholeness Validation: Legal Case Files Batch
═══════════════════════════════════════════════════════════

1. Gary Correspondence (Before Departure)
-----------------------------------------------------------
Validating: ATTORNEY-GARY-FOCUSED-EMAIL.eml
  ✅ APPROVED - Wholeness: 91.2% | Consensus: 4.5/5.0
  Report: /path/to/ATTORNEY-GARY-FOCUSED-EMAIL-report.json

2. Discovery Requests
-----------------------------------------------------------
Validating: LEASE-DISCOVERY-REQUEST.eml
  ✅ APPROVED - Wholeness: 87.5% | Consensus: 4.2/5.0
  Report: /path/to/LEASE-DISCOVERY-REQUEST-report.json

3. Settlement Proposals
-----------------------------------------------------------
Validating: SETTLEMENT-PROPOSAL-SCENARIO-C.eml
  ⚠️  NEEDS REVISION - Wholeness: 78.3% | Consensus: 3.8/5.0
  Report: /path/to/SETTLEMENT-PROPOSAL-SCENARIO-C-report.json

═══════════════════════════════════════════════════════════
                    Validation Summary
═══════════════════════════════════════════════════════════

Total files validated:       3
  ✅ Approved:             2
  ⚠️  Needs Revision:      1
  ❌ Rejected:             0

Overall Pass Rate:           66%

Reports saved to: /path/to/VALIDATION-REPORTS
Consolidated report: /path/to/CONSOLIDATED-REPORT.md

⚠️  Some files NEED REVISION. Review reports for warnings.
```

---

## 🔬 Validation Profiles

### **Legal Documents**

#### **Discovery Request**
```bash
--circles all
--roles judge,prosecutor,defense
--counsels county_attorney,legal_aid
--patterns adr,prd
--blockers "lease verification"
```

#### **Settlement Proposal**
```bash
--circles analyst,assessor,orchestrator
--roles judge,mediator,jury
--counsels county_attorney,hud_regional,legal_aid
--patterns prd
```

#### **Attorney Correspondence**
```bash
--circles analyst,orchestrator
--roles judge,expert_witness
--counsels county_attorney,legal_aid
```

### **Technical Documents**

#### **Architecture Decision Record (ADR)**
```bash
--circles innovator,orchestrator,seeker
--patterns adr,ddd
```

#### **Product Requirements Document (PRD)**
```bash
--circles analyst,innovator,intuitive
--patterns prd,tdd
```

---

## 📊 Validation Checks Reference

### **Circle Checks**

| Circle | Focus | Key Checks |
|--------|-------|------------|
| **Analyst** | Data quality | Quantitative evidence, timeline accuracy, evidence references |
| **Assessor** | Blockers | Known blockers addressed, dependencies identified, remediation path |
| **Innovator** | Automation | Novel approach, process improvement, scalability |
| **Intuitive** | Observability | Visual structure, metrics present, reasoning explained |
| **Orchestrator** | Coordination | Strategic alignment, multi-circle coordination, feedback loops |
| **Seeker** | Dependencies | Dependencies identified, technical debt, maintenance path |

### **Legal Role Checks**

| Role | Focus | Key Checks |
|------|-------|------------|
| **Judge** | Procedure | Legal citations, professional tone, judicial economy |
| **Prosecutor** | Plaintiff strength | Strong opening, evidence abundance, damages quantified |
| **Defense** | Defendant position | Good faith attempts, contributory fault, damages reasonable |
| **Expert Witness** | Technical accuracy | Domain terminology, specific facts, measurements |
| **Jury** | Common sense | Coherent narrative, accessible language, reasonable claims |
| **Mediator** | Settlement | Settlement language, mutual benefit framing, timeline |

### **Government Counsel Checks**

| Counsel | Jurisdiction | Key Checks |
|---------|--------------|------------|
| **County Attorney** | Local | Local statutes cited, procedures followed, settlement norms |
| **State AG Consumer** | State | UDTP elements, pattern vs. single incident |
| **HUD Regional** | Federal | Habitability standards, landlord notice |
| **Legal Aid** | Pro Se Support | Realistic expectations, evidence documented, seeks guidance |

### **Software Pattern Checks**

| Pattern | Elements | Scoring |
|---------|----------|---------|
| **PRD** | Problem, goal, stakeholders, requirements, success metrics | 3/5 to pass |
| **ADR** | Context, decision, alternatives, consequences, rationale | 3/5 to pass |
| **DDD** | Bounded context, entities, value objects, aggregates, language | 2/5 to pass |
| **TDD** | Red, green, refactor, test-first, coverage | 3/5 to pass |

---

## 🔍 Real-World Examples

### **Example: Discovery Request Email**

**Document:** `LEASE-DISCOVERY-REQUEST.eml`

**Validation Results:**

```json
{
  "overall": {
    "wholeness_score": 87.5,
    "consensus_rating": 4.2,
    "recommendation": "APPROVE - Ready to send"
  },
  "circle_perspectives": {
    "analyst": {
      "pass_rate": 100.0,
      "checks_passed": 3,
      "checks_total": 3
    },
    "assessor": {
      "pass_rate": 100.0,
      "checks_passed": 3,
      "checks_total": 3,
      "blockers_addressed": ["lease verification"]
    }
  },
  "role_perspectives": {
    "judge": {
      "verdict": "APPROVE",
      "reasoning": "All critical checks passed"
    },
    "prosecutor": {
      "verdict": "APPROVE",
      "reasoning": "Strong opening, multiple evidence types, damages quantified"
    },
    "defense": {
      "verdict": "APPROVE",
      "reasoning": "Acknowledges good faith, reasonable damages"
    }
  },
  "counsel_perspectives": {
    "county_attorney": {
      "assessment": "LEGALLY_SOUND",
      "rating": 4.5,
      "jurisdiction": "Mecklenburg County"
    },
    "legal_aid": {
      "assessment": "LEGALLY_SOUND",
      "rating": 4.0,
      "jurisdiction": "North Carolina"
    }
  },
  "software_patterns": {
    "adr": {
      "passed": true,
      "message": "4/5 ADR elements present",
      "evidence": {
        "context": true,
        "decision": true,
        "alternatives": true,
        "consequences": true,
        "rationale": true
      }
    },
    "prd": {
      "passed": true,
      "message": "4/5 PRD elements present"
    }
  }
}
```

**Key Findings:**
- ✅ **Strong legal foundation**: Cites NC statutes (§ 42-37.1, § 42-14)
- ✅ **Clear blocker identification**: "New tenant lease verification" blocking settlement
- ✅ **Evidence-based**: 40+ portal requests, 22-month timeline, 3 scenarios
- ✅ **Settlement-focused**: Cost-benefit analysis, mutual interest framing
- ⚠️  **Minor warning**: Could strengthen alternative remediation paths

---

### **Example: Attorney Gary Email**

**Document:** `ATTORNEY-GARY-FOCUSED-EMAIL.eml`

**Validation Results:**

```json
{
  "overall": {
    "wholeness_score": 91.2,
    "consensus_rating": 4.5,
    "recommendation": "APPROVE - Ready to send"
  },
  "circle_perspectives": {
    "analyst": {
      "pass_rate": 100.0,
      "checks_passed": 3,
      "checks_total": 3
    },
    "orchestrator": {
      "pass_rate": 100.0,
      "checks_passed": 3,
      "checks_total": 3
    }
  },
  "role_perspectives": {
    "judge": {
      "verdict": "APPROVE",
      "reasoning": "Professional tone, proper citations, concise"
    },
    "expert_witness": {
      "verdict": "APPROVE",
      "reasoning": "Domain terminology correct, specific calculations"
    }
  },
  "counsel_perspectives": {
    "county_attorney": {
      "assessment": "LEGALLY_SOUND",
      "rating": 4.5,
      "comments": "Von Pettis calculation accurate, realistic damages"
    },
    "legal_aid": {
      "assessment": "LEGALLY_SOUND",
      "rating": 4.5,
      "comments": "Excellent pro se work, seeks attorney guidance"
    }
  }
}
```

**Key Findings:**
- ✅ **Legal research demonstrated**: Von Pettis Realty v. McKoy (1999)
- ✅ **Realistic damages**: $12K-20K range (30% × $40K rent paid)
- ✅ **Seeks attorney guidance**: 4 specific questions
- ✅ **Professional tone**: Respectful, acknowledges attorney's expertise
- ✅ **Timeline pressure**: 53 hours to Feb 12 @ 5 PM deadline

---

## 🛠️ Advanced Usage

### **Custom Validation Profiles**

Create a Python script to define custom validation logic:

```python
from wholeness_validator_extended import ExtendedValidator, Circle, LegalRole

validator = ExtendedValidator(
    document_type="custom_email",
    document_path="/path/to/document.eml"
)

# Custom circle selection
circles = [Circle.ANALYST, Circle.ASSESSOR, Circle.ORCHESTRATOR]

# Custom roles (adversarial focus)
roles = [LegalRole.PROSECUTOR, LegalRole.DEFENSE, LegalRole.MEDIATOR]

# Run validation
report = validator.run_full_validation(
    content=open("/path/to/document.eml").read(),
    circles=circles,
    roles=roles,
    blockers=["lease verification", "attorney representation"],
    patterns=["prd", "adr"]
)

# Access results
print(f"Wholeness: {report['overall']['wholeness_score']}%")
print(f"Recommendation: {report['overall']['recommendation']}")
```

### **Integration with CI/CD**

```yaml
# .github/workflows/validate-legal-docs.yml
name: Validate Legal Documents

on:
  pull_request:
    paths:
      - 'legal/correspondence/**/*.eml'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Run Wholeness Validation
        run: |
          chmod +x ./validate_legal_case_batch.sh
          ./validate_legal_case_batch.sh
      
      - name: Upload Reports
        uses: actions/upload-artifact@v3
        with:
          name: validation-reports
          path: ./VALIDATION-REPORTS/
```

---

## 📚 File Structure

```
investing/agentic-flow/
├── wholeness_validation_framework.py      # Base framework (3 layers)
├── wholeness_validator_extended.py        # Extended validator (all circles + patterns)
├── validate_legal_case_batch.sh           # Batch validation script
├── WHOLENESS_VALIDATION_README.md         # This file
└── examples/
    ├── validate_discovery_request.sh      # Discovery request example
    ├── validate_settlement_proposal.sh    # Settlement proposal example
    └── validate_attorney_email.sh         # Attorney correspondence example

legal/case-files/
└── MAA-26CV005596-590/
    ├── CORRESPONDENCE/
    │   └── OUTBOUND/
    │       ├── Gary/
    │       │   └── ATTORNEY-GARY-FOCUSED-EMAIL.eml
    │       ├── LEASE-DISCOVERY-REQUEST.eml
    │       └── SETTLEMENT-PROPOSAL-SCENARIO-C.eml
    └── VALIDATION-REPORTS/
        ├── ATTORNEY-GARY-FOCUSED-EMAIL-report.json
        ├── LEASE-DISCOVERY-REQUEST-report.json
        ├── SETTLEMENT-PROPOSAL-SCENARIO-C-report.json
        └── CONSOLIDATED-REPORT.md
```

---

## 🎓 Best Practices

### **1. Validation Timing**
- **Before Sending**: Always validate legal correspondence before sending
- **After Drafting**: Run validation immediately after drafting
- **Before Review**: Validate before attorney review to catch obvious issues

### **2. Circle Selection**
- **Legal Documents**: Analyst, Assessor, Orchestrator
- **Technical Documents**: Innovator, Intuitive, Seeker
- **Strategic Documents**: Orchestrator, Innovator, Analyst

### **3. Role Selection**
- **Settlement Focus**: Judge, Mediator, Jury
- **Litigation Focus**: Judge, Prosecutor, Defense, Expert Witness
- **Attorney Review**: Judge, Expert Witness

### **4. Pattern Detection**
- **Discovery Requests**: ADR, PRD patterns
- **Settlement Proposals**: PRD pattern
- **Technical Specs**: ADR, DDD, TDD patterns

---

## 🔧 Troubleshooting

### **Issue: "Module not found" error**

```bash
# Solution: Ensure base framework is in same directory
ls -la wholeness_validation_framework.py wholeness_validator_extended.py

# If missing, check correct directory
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
```

### **Issue: "jq: command not found"**

```bash
# Install jq for JSON parsing
brew install jq  # macOS
apt-get install jq  # Linux
```

### **Issue: Low wholeness score**

1. **Check critical failures first**: These are blocking issues
2. **Review warnings**: Address high-severity warnings
3. **Compare with examples**: See `examples/` directory for reference
4. **Iterate and revalidate**: Fix issues, rerun validation

---

## 📖 References

### **Holacracy Circles**
- Source: `.goalie.backup.20251210_122152/CIRCLE_MAPPINGS.yaml`
- Pattern metrics: `.goalie/pattern_metrics.jsonl.legacy`

### **Legal Case Files**
- Case: 26CV005596-590 (Bhopti v. MAA)
- Documents: `/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/`
- Validation reports: `WHOLENESS-CHECK-REPORT.md`

### **Software Patterns**
- PRD: Product Requirements Document (Lean Startup)
- ADR: Architecture Decision Records (Michael Nygard)
- DDD: Domain-Driven Design (Eric Evans)
- TDD: Test-Driven Development (Kent Beck)

---

## 🤝 Contributing

To extend the framework:

1. **Add new circles**: Extend `Circle` enum in `wholeness_validation_framework.py`
2. **Add new roles**: Extend `LegalRole` enum and implement validator method
3. **Add new patterns**: Add validator method in `ExtendedValidator` class
4. **Add new checks**: Modify existing validator methods with new `ValidationCheck` instances

---

## 📄 License

This framework is part of the agentic-flow project.

---

## 🎯 Quick Reference

### **CLI Commands**

```bash
# Single file validation
python3 wholeness_validator_extended.py --file doc.eml --circles all --roles all --output report.json

# Batch validation
./validate_legal_case_batch.sh

# Verbose output
python3 wholeness_validator_extended.py --file doc.eml --verbose

# Custom profile
python3 wholeness_validator_extended.py \
  --file doc.eml \
  --circles analyst,assessor,orchestrator \
  --roles judge,mediator \
  --patterns prd,adr \
  --blockers "lease verification" \
  --output report.json
```

### **Exit Codes**
- **0**: All approved
- **1**: Some need revision
- **2**: Some rejected

---

**Last Updated:** 2026-02-11  
**Maintainer:** Shahrooz Bhopti  
**Contact:** shahrooz@bhopti.com
