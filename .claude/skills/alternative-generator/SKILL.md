---
name: "alternative-generator"
description: "Forces generation of 3+ alternatives with tradeoff analysis for architectural decisions, dependencies, and implementation approaches. Use when proposing architectural decisions, suggesting dependencies/libraries, choosing implementation approaches, or when /alternatives is requested."
---

# Alternative Generator

## Purpose

Prevent single-solution thinking by forcing generation of 3+ alternatives with structured tradeoff analysis. This skill embeds the Objective Coding methodology as an enforceable pattern.

## Philosophy

> "Don't give me the first solution that works—give me the right solution after you've considered three."

Single-solution proposals indicate incomplete thinking. Every meaningful technical decision has multiple valid approaches with different tradeoff profiles.

## Activation Triggers

### Automatic Activation (MANDATORY)

- Proposing any architectural decision
- Suggesting a dependency or library
- Recommending an implementation approach
- Using phrases like:
  - "I recommend"
  - "we should use"
  - "the best approach is"
  - "let's go with"

### Manual Activation

- `/alternatives [topic]` - Generate alternatives for a specific decision
- `/tradeoff [approach]` - Analyze tradeoffs for a specific approach

## The Alternative Generation Protocol

### Step 1: Challenge Assumptions First

Before suggesting ANY solution, ask clarifying questions:

Before I propose solutions, I need to understand:
- What scale are we optimizing for? (100 users? 10k? 1M?)
- What's the performance requirement? (ms response time? throughput?)
- What happens when this fails? (degradation strategy)
- How will this be maintained 6 months from now?
- What's the actual problem? (avoid XY problem - question the question)

### Step 2: Generate Minimum 3 Alternatives

MANDATORY FORMAT:

OPTION 1: [Approach Name]
✅ PROS:
   - [Specific benefit with scenario]
   - [Quantified advantage when possible]
❌ CONS:
   - [Specific drawback with scenario]
   - [Quantified cost when possible]
📊 BEST FOR: [Specific constraints/scale/context]
🚫 AVOID WHEN: [Anti-patterns/wrong contexts]

OPTION 2: [Different Approach]
✅ PROS:
   - [Specific benefits]
❌ CONS:
   - [Specific drawbacks]
📊 BEST FOR: [context/scale/constraints]
🚫 AVOID WHEN: [conditions]

OPTION 3: [Alternative Approach]
✅ PROS:
   - [Specific benefits]
❌ CONS:
   - [Specific drawbacks]
📊 BEST FOR: [context/scale/constraints]
🚫 AVOID WHEN: [conditions]

💡 RECOMMENDATION: [Justified choice based on user's constraints]
Reason: [Specific reasoning tied to their context]

### Step 3: Analyze from 5 Perspectives

Every option must be evaluated through:

| Perspective | Questions to Answer |
|------------|---------------------|
| Performance Engineer | Algorithmic complexity O(?), memory, I/O, bottlenecks |
| Maintainer (6-month view) | Will I understand this later? Code clarity? Coupling? |
| Minimalist | What can we delete? Do we need this dependency? |
| Security Reviewer | Attack vectors, input validation, failure modes |
| Deployment Engineer | Configuration complexity, failure scenarios, monitoring |

### Step 4: Present Tradeoff Matrix

For architecture decisions, include:

| Approach    | Performance | Maintainability | Complexity | Dependencies |
|-------------|-------------|-----------------|------------|--------------|
| Option 1    | ⭐⭐⭐⭐⭐    | ⭐⭐⭐          | ⭐⭐        | 0            |
| Option 2    | ⭐⭐⭐       | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐    | 2            |
| Option 3    | ⭐⭐⭐⭐     | ⭐⭐            | ⭐⭐⭐      | 5            |

## Dependency Addition Protocol

Before suggesting ANY external library:

PROPOSED DEPENDENCY: [library-name]
Problem: [What this solves]
Bundle Size: [X kb minified+gzipped]
Maintenance: [Last update, weekly downloads, open issues]

ALTERNATIVE 1: Standard Library Solution
✅ Code: [~X lines to implement core functionality]
✅ Zero dependencies
❌ Missing: [Features we'd lose]
📊 Tradeoff: Write X lines now vs. maintain dependency forever

ALTERNATIVE 2: Minimal Helper (~50 lines)
✅ Only features we need
✅ Full control
❌ Need to write tests
📊 Tradeoff: 1-2 hours now vs. avoiding Xkb + updates

ALTERNATIVE 3: Full Library (proposed)
✅ Battle-tested
✅ Rich feature set
❌ Bundle impact
❌ Learning curve
❌ Maintenance updates needed
📊 Tradeoff: Fastest implementation vs. long-term dependency cost

💡 RECOMMENDATION: [Choice based on project scale/timeline/team]

## Verification Checklist

Before presenting any recommendation:
- Asked clarifying questions about scale/constraints?
- Generated at least 3 distinct alternatives?
- Included pros/cons for each option?
- Analyzed from 5 perspectives?
- Included tradeoff matrix for complex decisions?
- Applied Dependency Addition Protocol for libraries?
- Made explicit recommendation with reasoning?

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|---------------|------------------|
| "Use X, it's the best" | No comparison provided | Generate 3+ alternatives first |
| "Just add library Y" | No dependency analysis | Apply Dependency Addition Protocol |
| "This is the standard way" | Appeal to authority | Analyze tradeoffs for YOUR context |
| "Let me quickly implement..." | Skips alternatives | STOP. Generate alternatives first. |

## Output Format Summary

## Analysis: [Topic]

### Clarifying Questions

[Questions about context/scale/constraints]

### Options

**OPTION 1: [Name]**
[Pros/Cons/Best-for/Avoid-when]

**OPTION 2: [Name]**
[Pros/Cons/Best-for/Avoid-when]

**OPTION 3: [Name]**
[Pros/Cons/Best-for/Avoid-when]

### Tradeoff Matrix

[5-column comparison table]

### Recommendation

💡 [Choice] because [reasoning tied to the user's specific context]

This skill enforces the Objective Coding methodology. Single-solution proposals are failures.
