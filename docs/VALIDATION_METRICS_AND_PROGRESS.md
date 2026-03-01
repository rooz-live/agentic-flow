# Validation Metrics and Progress: %/#, %.#, and One Constant

**One constant for locality/relativistic spacetime:** You need **two notations** (state + velocity) and **one relation** that ties them to time.

---

## 1. Do we need one constant or two notations?

**Two notations, one relation.**

| Context     | Notation | Meaning              | Example                          |
| ----------- | -------- | -------------------- | -------------------------------- |
| **State**   | **%/#**  | Snapshot count       | 2/5 validators (40%)            |
| **Change**  | **%.#**  | Rate of change       | +60% in 3 min ⇒ 20%.#/min       |
| **Time**    | **T**    | Deadline pressure    | T_trial − T_now                  |
| **Unified** | 4D vector| Complete state       | [40%, 20%/min, X days, 77%]     |

- **%/#** (count-based truth): discrete “quanta” of completion — *how many* validators pass, *how many* checks. Like quantum mechanics: countable states.
- **%.#** (percentage-based velocity): rate of change — *how fast* coverage or progress changes. Like special relativity: v = Δx/Δt; %.# = Δ(coverage)/Δ(time).
- **One constant** is the **relation** between them and time, not a single number:
  - **Coverage ↔ Velocity:** C = ∫ v·dt (coverage is integral of velocity over time).
  - **Time ↔ Progress:** P(t) = %/#(t) × (T_trial − t) or equivalently progress depends on both state and time remaining.
  - **Uncertainty-style bound:** ΔCoverage · ΔTime ≥ (complexity constant) — “You cannot know exact coverage AND exact time remaining with arbitrary precision; fixing bugs reveals new gaps.”

So: **one constant** = the *law* relating %/#, %.#, and T (the “Planck-like” relation for delivery). **Two notations** = %/# (state) and %.# (velocity).

---

## 2. Physics and mathematical interpretation

### Count-based (discrete) — %/#

- **Discrete spacetime points:** completion is a count (e.g. 4/10 validators, 7/7 checks).
- **Quantum analogy:** %/# counts “quanta” of completion (whole units: pass/fail, validator on/off).

### Rate-based (continuous) — %.#

- **Velocity:** v = Δ(coverage)/Δ(time); units e.g. %/min or %.#/day.
- **Special-relativity analogy:** %.# is “speed” through completion space.

### Time components (deadline physics)

- **Time as vector:** Time = [T_trial, T_now, T_remaining, T_velocity].
  - **T_trial**   = fixed deadline (e.g. Trial #1 date).
  - **T_now**     = current timestamp.
  - **T_remaining** = T_trial − T_now.
  - **T_velocity**  = Δ(coverage)/Δ(time) = %.#.

### 4D progress (spacetime for delivery)

- **Dimensions:** x, y, z = coverage dimensions (validators, duplication, maintenance); t = time (deadline pressure).
- **Progress vector:**

```
Progress[t] = [
  coverage(t),      // %/# of validators working
  velocity(t),      // %.# rate of improvement
  time(t),          // T_remaining until deadline
  robustness(t)     // implementation vs stub ratio
]
```

- **Current state (example):**

```
Progress[now] = [
  %/# ,    // e.g. 4/10 validators pass
  %.#/min, // e.g. +60% in 3 min ⇒ 20%.#/min
  X days,  // until Trial #1
  %       // implementation % vs stub/gap %
]
```

---

## 3. MCP/MPP method–pattern–protocol

- **Method:** *how* we run validation (core → runner → compare → report).
- **Pattern:** *shape* of the pipeline (pure functions, orchestration, aggregation).
- **Protocol:** *contract* (exit codes 0/1/2, PASS/FAIL/SKIP, %/# and %.# in report).

**Elements/factors:**

- **%/#** = state (counts, snapshots) — protocol element for “what is true now.”
- **%.#** = change (velocity) — protocol element for “how fast we’re improving.”
- **T** = time (deadline, T_remaining) — dimension for “how much time is left.”
- **One constant** = the relation C = ∫v·dt and/or ΔC·ΔT ≥ k — ties state, velocity, and time into one coherent “locality” for delivery.

---

## 4. Consolidation-first sequence (invert thinking)

1. **Discover** working infra: %/# and %.# coverage, pure-function core (validation-core.sh + validation-runner.sh), CONSOLIDATION-TRUTH-REPORT. Discover gaps **during execution**, not only in planning (shift-left, pre-trial automation).
2. **Use it first:** “How can I extend it?” — run compare-all-validators, advocate/ay validate-email, then extend.
3. **Fix in-place:** Fix quoting, deps, PASS/FAIL parsing; zero placeholder stubs where it matters; improve actual implementation robustness.
4. **Deadline:** Win Trial #1 (one constant = ship state + velocity + T in the report).
5. **Then extend:** Win Trial #2; add RAG/LLMLingua/LazyLLM, agentic-qe, Claude Flow hooks as needed.

**Consolidation first is faster:** 1.5h consolidation + 1h P1 ⇒ clean architecture + new validators; future fixes apply to one pipeline. **Build P1 first is slower:** duplicate logic, N× maintenance.

---

## 5. Where this lives in the repo

| Artifact | Location | Content |
| -------- | -------- | ------- |
| **Metric definitions** | This doc | %/#, %.#, T, 4D Progress, one constant |
| **Generated report** | `reports/CONSOLIDATION-TRUTH-REPORT.md` | What works NOW, %/# table, per-run results |
| **How to generate** | `scripts/compare-all-validators.sh` | File + project validators, writes report |
| **Script index** | `scripts/CONSOLIDATION-TRUTH-INDEX.md` | Validator audit, overlap, commands |

---

## 6. Single “locality” for reporting

For a **single constant that measures our own locality** (one number to track):

- **Primary:** **%/#** (e.g. 4/10 = 40%) — one snapshot number for “how much is green now.”
- **Secondary:** **%.#** when you need “how fast we’re getting there” (e.g. 20%.#/min).
- **Relation:** Progress P(t) = %/#(t) × T_remaining (or C = ∫v·dt). That **relation** is the one constant; the two notations (%/# and %.#) are the dimensions.

So: **one constant** = the *invariant relation* between coverage, velocity, and time. **One number to ship** in the report = **%/#** (state); add **%.#** when you want velocity in the same 4D Progress frame.
