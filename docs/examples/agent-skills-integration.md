# Agent Integration with Claude Code Skills

This guide demonstrates how agentic-flow agents can discover and use Claude Code Skills for specialized tasks.

---

## Overview

Claude Code Skills provide a powerful way for agents to access structured knowledge and workflows. When skills are properly installed, Claude Code can:

1. **Auto-detect** skills on startup from `~/.claude/skills/` and `.claude/skills/`
2. **Index** skill names and descriptions into the system prompt
3. **Match** user queries or agent tasks to relevant skills
4. **Load** full skill content only when needed (progressive disclosure)
5. **Execute** skill instructions through agents

---

## Skills Installation Status

### ✅ Verified Installation

**Personal Skills**: `~/.claude/skills/`
```
agentic-flow/
└── agentdb-quickstart/
    └── SKILL.md ✅
```

**Project Skills**: `.claude/skills/`
```
(Ready for team skills)
```

**YAML Frontmatter** (Compliant with Anthropic spec):
```yaml
---
name: "AgentDB Quickstart"
description: "Initialize AgentDB with optimal settings and demonstrate 150x-12,500x performance improvements. Quick 60-second onboarding to vector intelligence."
---
```

---

## How Agents Use Skills

### Method 1: Explicit Skill Reference

When spawning an agent via Claude Code's Task tool, explicitly reference the skill:

```javascript
// Spawn an agent with skill reference
Task(
  "AgentDB Setup Agent",
  "Use the 'AgentDB Quickstart' skill to initialize AgentDB with optimal settings. Follow all steps in the skill guide and report results.",
  "coder"
)
```

**What Happens**:
1. Agent receives task description mentioning "AgentDB Quickstart" skill
2. Agent recognizes skill name from Claude Code's indexed skills
3. Agent reads full SKILL.md content from filesystem
4. Agent follows step-by-step instructions in the skill
5. Agent reports back with execution results

### Method 2: Autonomous Skill Discovery

Let Claude Code autonomously match tasks to skills based on description:

```javascript
// User query that matches skill description
"I need to set up AgentDB with the best performance settings"

// Claude Code:
// 1. Analyzes query: "set up AgentDB" + "best performance"
// 2. Matches to skill description: "Initialize AgentDB with optimal settings"
// 3. Loads "AgentDB Quickstart" skill
// 4. Spawns agent with skill instructions
Task(
  "AgentDB Setup Agent",
  "Initialize AgentDB using the AgentDB Quickstart skill...",
  "coder"
)
```

### Method 3: Multi-Agent Skill Coordination

Multiple agents can use different skills collaboratively:

```javascript
// Parallel agent execution with skills coordination
Task(
  "Database Agent",
  "Use 'AgentDB Quickstart' skill to initialize vector database with optimal settings",
  "code-analyzer"
)

Task(
  "Performance Agent",
  "Use 'AgentDB Performance Benchmark' skill (when available) to validate 150x speedup claims",
  "perf-analyzer"
)

Task(
  "Integration Agent",
  "Use 'ReasoningBank Migration' skill to integrate with existing ReasoningBank data",
  "coder"
)
```

---

## Example: AgentDB Quickstart Skill Usage

### Scenario: Developer Needs Fast AgentDB Setup

**User Request**:
```
"I need to quickly set up AgentDB for my project with the best performance settings"
```

**Claude Code Response** (with skills enabled):
```
I'll help you set up AgentDB using the AgentDB Quickstart skill. Let me spawn a specialized agent to handle this.

[Spawns Agent via Task tool]
Task(
  "AgentDB Setup Specialist",
  "Follow the 'AgentDB Quickstart' skill instructions to initialize AgentDB with optimal settings. The skill provides 60-second onboarding with 150x-12,500x performance improvements. Report back with setup status and performance metrics.",
  "coder"
)
```

**Agent Execution**:
1. Agent reads SKILL.md content:
   - Prerequisites: agentic-flow installed, Node.js 18+
   - Quick start: `npx agentic-flow agentdb-quickstart`
   - Steps: Initialize → Configure → Benchmark → Verify

2. Agent follows instructions:
   ```bash
   # Step 1: Initialize AgentDB
   npx agentic-flow agentdb init

   # Step 2: Configure optimal settings
   npx agentic-flow agentdb config --quantization binary --index hnsw

   # Step 3: Run benchmark
   npx agentic-flow agentdb benchmark

   # Step 4: Verify performance
   npx agentic-flow agentdb status
   ```

3. Agent reports results:
   ```
   ✓ AgentDB initialized successfully
   ✓ Binary quantization enabled (32x memory reduction)
   ✓ HNSW indexing configured
   ✓ Benchmark results: 150x faster pattern search, 12,500x faster large queries
   ✓ Ready for production use
   ```

---

## Skills Discovery Protocol

### 1. Claude Code Startup Phase

When Claude Code starts in a project:

```bash
# Claude Code scans for skills
~/.claude/skills/          # Personal skills (all projects)
.claude/skills/            # Project skills (this project only)

# Finds SKILL.md files
~/.claude/skills/agentic-flow/agentdb-quickstart/SKILL.md ✅

# Reads YAML frontmatter
name: "AgentDB Quickstart"
description: "Initialize AgentDB with optimal settings..."

# Indexes into system prompt (lightweight, no context penalty)
```

### 2. User Query Analysis

```
User: "I need to set up AgentDB"
       ↓
Claude Code analyzes query:
  - Keywords: "set up", "AgentDB"
  - Intent: Initialization, configuration
       ↓
Claude Code matches to skill:
  - Skill: "AgentDB Quickstart"
  - Description match: "Initialize AgentDB"
  - Confidence: High
       ↓
Claude Code loads full SKILL.md (only now enters context)
```

### 3. Agent Task Assignment

```javascript
// Claude Code creates agent task with skill
Task(
  "AgentDB Setup Agent",
  "Use 'AgentDB Quickstart' skill:\n" +
  "[Full SKILL.md content loaded here]",
  "coder"
)
```

### 4. Progressive Disclosure Benefit

**Without Progressive Disclosure**:
```
All 20 skills loaded at startup = 20 × 1.4KB = 28KB context used
Context penalty: ~2,000 tokens
Cost: Significant for every query
```

**With Progressive Disclosure** (Anthropic's approach):
```
Startup: 20 × (name + description) = 20 × 200 chars = 4KB
Active skill: 1 × 1.4KB = 1.4KB
Context penalty: ~400 tokens (5x reduction!)
Cost: Only pay for what you use
```

---

## Advanced Agent Patterns

### Pattern 1: Skill Chaining

Agents can chain multiple skills for complex workflows:

```javascript
// Step 1: Initialize (AgentDB Quickstart skill)
Task("Setup Agent", "Use AgentDB Quickstart skill", "coder")
  ↓
// Step 2: Populate (AgentDB Learning Pipeline skill)
Task("Learning Agent", "Use AgentDB Learning Pipeline skill", "ml-developer")
  ↓
// Step 3: Validate (AgentDB Performance Benchmark skill)
Task("Benchmark Agent", "Use AgentDB Performance Benchmark skill", "perf-analyzer")
```

### Pattern 2: Skill Composition

Combine skills for hybrid approaches:

```javascript
// Multi-agent swarm using multiple skills
Task("DB Agent", "AgentDB Quickstart skill", "coder")
Task("Swarm Agent", "Swarm Orchestrator skill", "hierarchical-coordinator")
Task("Memory Agent", "ReasoningBank Explorer skill", "researcher")

// Agents coordinate via hooks and memory:
// DB Agent → stores schema in memory
// Swarm Agent → reads schema, coordinates agents
// Memory Agent → analyzes patterns, optimizes
```

### Pattern 3: Skill Customization

Agents can adapt skills to specific contexts:

```javascript
Task(
  "Custom Setup Agent",
  "Use 'AgentDB Quickstart' skill but customize for production:\n" +
  "- Use PostgreSQL backend (not SQLite)\n" +
  "- Enable replication\n" +
  "- Configure monitoring",
  "system-architect"
)
```

---

## Verification Steps

### Step 1: Verify Skills Installation

```bash
# Check personal skills
npx agentic-flow skills list

# Expected output:
# 📚 Installed Claude Code Skills
# Personal Skills (~/.claude/skills/)
#   • AgentDB Quickstart
#      Initialize AgentDB with optimal settings...
```

### Step 2: Start Claude Code

```bash
# In a project with skills
claude code

# Watch startup logs for skill detection
# Expected: "Loaded 1 skill: AgentDB Quickstart"
```

### Step 3: Test Skill Discovery

In Claude Code session:

```
You: "What skills do you have?"

Claude: "I have the following skills available:
1. AgentDB Quickstart - Initialize AgentDB with optimal settings and demonstrate 150x-12,500x performance improvements. Quick 60-second onboarding to vector intelligence."
```

### Step 4: Test Skill Usage

```
You: "Set up AgentDB for me"

Claude: "I'll use the AgentDB Quickstart skill to set this up.
[Proceeds with skill instructions]"
```

---

## Integration with agentic-flow MCP Tools

### Combining Skills with MCP Coordination

```javascript
// Setup coordination topology
mcp__claude-flow__swarm_init({ topology: "mesh", maxAgents: 3 })

// Spawn agents that use skills
Task(
  "AgentDB Agent",
  "Use 'AgentDB Quickstart' skill. Coordinate via MCP hooks.",
  "coder"
)

Task(
  "Benchmark Agent",
  "Use 'AgentDB Performance Benchmark' skill. Report metrics to swarm.",
  "perf-analyzer"
)

// Agents coordinate:
// 1. Use skills for specialized knowledge
// 2. Use MCP hooks for cross-agent communication
// 3. Store results in shared memory
```

---

## Troubleshooting

### Issue: Skills Not Detected

**Problem**: Claude Code doesn't show skills in system prompt

**Solutions**:
1. Verify installation:
   ```bash
   ls -la ~/.claude/skills/agentic-flow/agentdb-quickstart/
   # Should show SKILL.md
   ```

2. Check YAML frontmatter:
   ```bash
   head -n 10 ~/.claude/skills/agentic-flow/agentdb-quickstart/SKILL.md
   # Should show:
   # ---
   # name: "AgentDB Quickstart"
   # description: "..."
   # ---
   ```

3. Restart Claude Code:
   ```bash
   # Skills are indexed at startup
   # Restart to trigger re-indexing
   ```

### Issue: Agent Doesn't Use Skill

**Problem**: Agent completes task without referencing skill

**Solutions**:
1. Be explicit in task description:
   ```javascript
   Task("Agent", "Use the 'AgentDB Quickstart' skill to...", "coder")
   // Not: "Set up AgentDB" (too vague)
   ```

2. Check skill description matches task:
   - Skill: "Initialize AgentDB"
   - Task: "Set up database" ← Might not match!
   - Better task: "Initialize AgentDB" ← Strong match

### Issue: Multiple Skills Match

**Problem**: Multiple skills match the same query

**Solution**: Claude Code will choose the best match based on:
- Description similarity (highest priority)
- Skill category
- Recent usage

To force specific skill:
```javascript
Task("Agent", "Use ONLY the 'AgentDB Quickstart' skill, not 'AgentDB Learning Pipeline'", "coder")
```

---

## Best Practices

### 1. Clear Task Descriptions
```javascript
// ✅ Good: Explicit skill reference
Task("Agent", "Use 'AgentDB Quickstart' skill to initialize database", "coder")

// ❌ Bad: Vague task
Task("Agent", "Set up the database thing", "coder")
```

### 2. Skill Description Optimization

When creating skills, write descriptions that match common user queries:

```yaml
# ✅ Good: Matches "set up AgentDB", "initialize database"
description: "Initialize AgentDB with optimal settings..."

# ❌ Bad: Doesn't match common queries
description: "A comprehensive guide to database configuration"
```

### 3. Progressive Complexity

Skills should use progressive disclosure:

```markdown
# Level 1: Quick Start (ALWAYS read)
## What This Skill Does
## Quick Start

# Level 2: Details (Read if needed)
## Step-by-Step Guide

# Level 3: Advanced (Read rarely)
## Advanced Options
## Troubleshooting
```

---

## Next Steps

### For Users
1. ✅ Install skills: `npx agentic-flow skills init`
2. ✅ Create examples: `npx agentic-flow skills create`
3. 🔲 Start Claude Code and verify detection
4. 🔲 Test skill usage with agents

### For Developers
1. ✅ Study agentdb-quickstart skill structure
2. 🔲 Create additional skills (20 planned)
3. 🔲 Test skill matching accuracy
4. 🔲 Optimize skill descriptions for discovery

---

## Resources

- **Skills Plan**: `/docs/plans/skills/SKILLS_PLAN.md`
- **Implementation Roadmap**: `/docs/plans/skills/IMPLEMENTATION_ROADMAP.md`
- **Validation Report**: `/docs/plans/skills/SKILLS_VALIDATION_REPORT.md`
- **SKILL.md Example**: `~/.claude/skills/agentic-flow/agentdb-quickstart/SKILL.md`

---

**Status**: ✅ Skills installed and ready for agent integration
**Next Milestone**: Phase 1 skills development (4 foundation skills)
