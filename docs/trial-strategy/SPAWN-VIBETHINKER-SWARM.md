# VibeThinker Swarm Execution Plan

**Agent Architecture**: 12 agents, hierarchical-mesh, 8-10 iterations

## Agent Spawn Commands

I'm spawning 12 concurrent agents to run iterative multi-perspective analysis:

### Coordinator Agent
- **Role**: VibeThinker orchestrator
- **Task**: Run 8-10 iterations, track convergence, produce final recommendation
- **Model**: Sonnet (complex reasoning)

### Plaintiff Advocates (3 agents)
- **Role**: Argue from plaintiff perspective
- **Tasks**: 
  - Agent 1: Argue Option A strengths (mitigation framing)
  - Agent 2: Argue Option B strengths (technical skill framing)
  - Agent 3: Explore hybrid positioning
- **Model**: Haiku (argumentation)

### Defendant Advocates (3 agents)
- **Role**: Attack from defendant perspective
- **Tasks**:
  - Agent 4: Attack Option A weaknesses
  - Agent 5: Attack Option B weaknesses
  - Agent 6: Maximum damage cross-examination scenarios
- **Model**: Haiku (adversarial analysis)

### Judge Simulators (2 agents)
- **Role**: Evidentiary gatekeeping (FRE 401-403)
- **Tasks**:
  - Agent 7: Admissibility rulings
  - Agent 8: Relevance + prejudice analysis
- **Model**: Haiku (legal standards)

### Validators (2 agents)
- **Role**: Score each iteration across 5 dimensions
- **Tasks**:
  - Agent 9: Score + track trends
  - Agent 10: Convergence analysis
- **Model**: Haiku (scoring)

### Meta-Analyst
- **Role**: Cross-iteration synthesis
- **Task**: Pattern recognition, ROI synthesis, final recommendation
- **Model**: Sonnet (complex synthesis)

## Execution Flow

```
PHASE 1: SETUP (Agents 1-12 spawn)
→ Load VIBETHINKER-ANALYSIS-FRAMEWORK.md
→ Load neural trader evidence (BUILD-LOG.md, TRIAL-EVIDENCE.md)
→ Load case context

PHASE 2: ITERATIONS (8-10 cycles)
Each iteration:
  1. Plaintiff Advocates argue both options
  2. Defendant Advocates attack both options
  3. Judge Simulators evaluate admissibility
  4. Validators score 5 dimensions
  5. Coordinator checks convergence
  6. Meta-Analyst tracks trends
  7. Adjust and repeat

PHASE 3: SYNTHESIS
→ Meta-Analyst produces final recommendation
→ Coordinator compiles iteration data
→ Validators confirm convergence
→ Output: VIBETHINKER-FINAL-RECOMMENDATION.md
```

## Output Files

Each iteration produces:
- `iteration-N-plaintiff.yaml` - Plaintiff arguments
- `iteration-N-defendant.yaml` - Defendant attacks
- `iteration-N-judge.yaml` - Admissibility rulings
- `iteration-N-scores.yaml` - Validator scores
- `iteration-N-trends.json` - Convergence data

Final outputs:
- `VIBETHINKER-FINAL-RECOMMENDATION.md` - Strategic recommendation
- `CONVERGENCE-ANALYSIS.json` - Trend data across iterations
- `ATTACK-VECTORS-IDENTIFIED.md` - Defendant weaknesses found
- `EVIDENCE-REWRITE-PLAN.md` - Doc updates if needed

## Success Criteria

✅ 8-10 iterations complete  
✅ Convergence: All scores within ±1 point  
✅ Confidence: ≥8/10 on recommendation  
✅ Attack vectors identified + countered  
✅ Clear actionable strategy

## Estimated Duration

- Setup: 5 min
- Iterations: 60-90 min (8-10 cycles × 6-9 min each)
- Synthesis: 10 min
- **Total**: 75-105 minutes

---

**Status**: Ready to spawn agents and execute
**Working Directory**: `/Users/shahroozbhopti/Documents/code/investing/agentic-flow`
**Output Directory**: `docs/trial-strategy/vibethinker-output/`
