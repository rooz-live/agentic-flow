# Claude Code Configuration (Optimized)

## 🚨 Critical Rules
*   **Verification-First**: Truth is enforced. Threshold: 0.95.
*   **Batch Operations**: 1 Message = All Related Operations.
*   **No Root Files**: Save to `src/`, `tests/`, `docs/`, `config/`, `scripts/`.

## 🛠️ Core Commands
```bash
# Initialize
npx claude-flow@alpha verify init strict
npx claude-flow@alpha pair --start

# Agent Discovery
ls agents/*.md | wc -l

# Execution (Batch Pattern)
# Read("agents/doc-planner.md")
# Read("agents/microtask-breakdown.md")
# Task("Plan", "Execute doc-planner...", "planner")
# TodoWrite { ... }
# Write "src/file.js"
```

## 🤖 Mandatory Agents
1.  **Doc-Planner**: SPARC workflow, London School TDD.
2.  **Microtask-Breakdown**: Atomic 10-min tasks, 100/100 production readiness.

## 🔧 Development Principles
1.  **Verification-First**: Truth enforced.
2.  **Doc-First**: Plan before coding.
3.  **GitHub-Centric**: Integration workflows.
4.  **Batch Everything**: Maximize context window.
5.  **Iterate**: Persistent fixes.