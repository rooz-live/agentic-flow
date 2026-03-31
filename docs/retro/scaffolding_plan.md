# Expansion of Agentic Flow Circles & Roles Plan

## 1. Directory Clean-up & Standardization
The current directories have trailing spaces (e.g., `operational-analyst-roles /`). These will be renamed for consistency.
- `circles/analyst/operational-analyst-roles /` -> `circles/analyst/operational-analyst-roles/`
- `circles/assessor/operational-assessor-roles /` -> `circles/assessor/operational-assessor-roles/`
- `circles/innovator/operational-innovator-roles /` -> `circles/innovator/operational-innovator-roles/`
- `circles/intuitive/operational-intuitive-roles /` -> `circles/intuitive/operational-intuitive-roles/`
- `circles/orchestrator/operational-orchestration-roles /` -> `circles/orchestrator/operational-orchestration-roles/`

## 2. Role Expansion Design

### Analyst Circle
**Path:** `circles/analyst/operational-analyst-roles/`
- **Architect**: Ensure `Architect` role exists.
    - `Architect/purpose.md`
    - `Architect/domains.md`
    - `Architect/accountabilities.md`

### Innovator Circle
**Path:** `circles/innovator/operational-innovator-roles/`
- **AI Architect:Prototyper**: Create this specific role.
    - `AI Architect:Prototyper/purpose.md`
    - `AI Architect:Prototyper/domains.md`
    - `AI Architect:Prototyper/accountabilities.md`

### Standard Purpose Template
All new `purpose.md` files will follow this structure to link back to the Circle Lead:
```markdown
# [Role Name] Purpose

## Primary Mandate
[One sentence summary of the role's core reason for existence]

## Circle Alignment
Supports the [Circle Name] Lead's mandate of [Circle Mandate Summary] by [Specific Contribution].
```

## 3. Metrics Integration Strategy

### Orchestrator Circle (Flow Metrics)
**Target File:** `circles/orchestrator/circle-lead-accountabilities/purpose.md`
**Metrics to Add:**
- Lead Time (Concept to Cash)
- Cycle Time (Start to Finish)
- Throughput (Items per Sprint)
- WIP Violations

### Assessor Circle (Process Metrics)
**Target File:** `circles/assessor/circle-lead-performance-assurance-assessment/purpose.md`
**Metrics to Add:**
- Time from Retro Insight -> Code Commit
- % of Action Items Completed
- Context Switches per Developer

### Analyst Circle (Learning Metrics)
**Target File:** `circles/analyst/circle-lead-analytics/purpose.md`
**Metrics to Add:**
- # of Experiments Run
- % Retro Items -> New Features
- Time to Implement Learning

## 4. Execution Steps
1.  **Rename** directories to remove trailing spaces.
2.  **Create** missing role directories and MD files (`Architect`, `AI Architect:Prototyper`).
3.  **Update** Circle Lead `purpose.md` files with specific metrics.