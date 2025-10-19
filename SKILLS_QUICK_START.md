# agentic-flow Skills - Quick Start Guide

## 🚀 What You Have Now

Your project now includes **6 production-ready Claude Code Skills**:

### 📋 Available Skills

```bash
node dist/cli-proxy.js skills list
```

**Output:**
```
Project Skills (.claude/skills/)
  • Skill Builder              - Meta-skill for creating new skills
  • AgentDB Quickstart         - Complete integration guide
  • AgentDB Vector Search      - Semantic search & RAG
  • AgentDB Memory Patterns    - Persistent memory management
  • Swarm Orchestration        - Multi-agent coordination
  • ReasoningBank Intelligence - Pattern learning & optimization
```

## 🎯 How to Use Each Skill

### 1️⃣ Skill Builder (Meta-Skill)

**Purpose**: Create new custom skills for your workflows

**Ask Claude Code**:
```
"I want to create a skill for generating React components"
"Create a skill for API testing workflows"
"Build a skill for database migration management"
```

**Or use the generator script**:
```bash
.claude/skills/skill-builder/scripts/generate-skill.sh my-skill-name project

# Interactive prompts will guide you through:
# - Skill display name
# - Description (what + when)
# - Category/namespace
# - Include scripts/resources/docs
```

**Directory Structure**:
```
.claude/skills/skill-builder/
├── SKILL.md                    # Main skill file (909 lines)
├── README.md                   # Human docs (308 lines)
├── scripts/
│   ├── generate-skill.sh       # Interactive generator
│   └── validate-skill.sh       # 10-step validator
├── resources/
│   ├── templates/
│   │   ├── minimal-skill.template
│   │   └── full-skill.template
│   └── schemas/
│       └── skill-frontmatter.schema.json
└── docs/
    └── SPECIFICATION.md        # Official Anthropic spec (358 lines)
```

### 2️⃣ AgentDB Quickstart

**Purpose**: Initialize AgentDB with optimal settings

**Ask Claude Code**:
```
"Set up AgentDB with vector search"
"Initialize AgentDB for my RAG application"
"Show me the complete AgentDB integration example"
```

**Key Features**:
- Binary quantization (32x memory reduction)
- HNSW indexing (O(log n) search)
- Vector search integration
- Memory patterns
- Swarm coordination
- ReasoningBank intelligence

### 3️⃣ AgentDB Vector Search

**Purpose**: Semantic search with vector embeddings

**Ask Claude Code**:
```
"Implement semantic search for my documents"
"Build a RAG pipeline with AgentDB"
"Create hybrid search (vector + metadata filters)"
```

**What You Get**:
- Vector storage patterns
- Similarity search (150x-12,500x faster)
- RAG implementation examples
- Hybrid search (vector + metadata)
- Batch operations
- Performance optimization tips

### 4️⃣ AgentDB Memory Patterns

**Purpose**: Persistent memory for AI agents

**Ask Claude Code**:
```
"Set up session memory for my chatbot"
"Implement long-term memory for agents"
"Build memory consolidation with ReasoningBank"
```

**What You Get**:
- Session memory patterns
- Long-term storage strategies
- Memory consolidation techniques
- ReasoningBank integration
- Hierarchical memory organization

### 5️⃣ Swarm Orchestration

**Purpose**: Multi-agent coordination

**Ask Claude Code**:
```
"Set up a mesh topology swarm"
"Orchestrate 5 agents in parallel"
"Build a hierarchical agent workflow"
```

**What You Get**:
- Mesh, hierarchical, adaptive topologies
- Parallel & pipeline execution
- Load balancing patterns
- Fault tolerance setup
- Memory coordination
- Hooks integration

### 6️⃣ ReasoningBank Intelligence

**Purpose**: Adaptive learning & pattern recognition

**Ask Claude Code**:
```
"Implement pattern learning for my agents"
"Build strategy optimization with ReasoningBank"
"Create a self-improving agent workflow"
```

**What You Get**:
- Pattern recognition examples
- Strategy optimization techniques
- Meta-learning patterns
- Transfer learning examples
- AgentDB integration
- Performance metrics tracking

## 📝 Creating New Skills

### Method 1: Ask Claude Code (Recommended)
```
"I want to create a skill for [your use case]"
```

Claude Code will use the **Skill Builder** skill to guide you through creating a new skill with proper YAML frontmatter, progressive disclosure structure, and complete documentation.

### Method 2: Use Generator Script
```bash
# Interactive mode
.claude/skills/skill-builder/scripts/generate-skill.sh

# With arguments
.claude/skills/skill-builder/scripts/generate-skill.sh \
  api-testing \
  project
```

### Method 3: Manual Creation

1. Create directory:
```bash
mkdir -p .claude/skills/my-namespace/my-skill
```

2. Create SKILL.md:
```yaml
---
name: "My Skill Name"
description: "What this skill does and when Claude should use it. Maximum 1024 characters."
---

# My Skill Name

## What This Skill Does
[Description]

## Prerequisites
[Requirements]

## Quick Start
[Basic usage]

## Step-by-Step Guide
[Detailed instructions]
```

## 🔍 Validating Skills

```bash
# Validate any skill
.claude/skills/skill-builder/scripts/validate-skill.sh .claude/skills/my-skill/

# Output:
# [1/10] ✓ SKILL.md exists
# [2/10] ✓ YAML frontmatter present
# [3/10] ✓ name field valid (1-64 chars)
# [4/10] ✓ description field valid (10-1024 chars, includes "when")
# ...
```

## 🧪 Testing Locally

```bash
# Build first
cd /workspaces/agentic-flow/agentic-flow
npm run build

# List all skills
node dist/cli-proxy.js skills list

# Install skill-builder in a new project
cd /path/to/new/project
node /workspaces/agentic-flow/agentic-flow/dist/cli-proxy.js skills init-builder project

# Create all 4 agentic-flow skills
node /workspaces/agentic-flow/agentic-flow/dist/cli-proxy.js skills create

# View help
node dist/cli-proxy.js skills help
```

## 🎓 Example Workflows

### Workflow 1: Building a RAG Application

1. Ask Claude Code: *"I want to build a RAG application with AgentDB"*
2. Claude uses **AgentDB Vector Search** skill
3. Implements semantic search with vector embeddings
4. Sets up RAG pipeline with context retrieval
5. Integrates with **ReasoningBank Intelligence** for learning

### Workflow 2: Creating a Multi-Agent System

1. Ask Claude Code: *"Set up a swarm of 5 agents for API development"*
2. Claude uses **Swarm Orchestration** skill
3. Initializes mesh topology with 5 agents
4. Sets up **AgentDB Memory Patterns** for coordination
5. Implements fault tolerance and load balancing

### Workflow 3: Building a Custom Skill

1. Ask Claude Code: *"Create a skill for React component generation"*
2. Claude uses **Skill Builder** skill
3. Generates SKILL.md with proper YAML frontmatter
4. Creates templates and validation scripts
5. New skill ready to use immediately

## 📚 Documentation

### Skills Documentation
- **Integration Guide**: `docs/skills/SKILLS_INTEGRATION_COMPLETE.md`
- **Testing Report**: `docs/skills/TESTING_REPORT.md`
- **Skills Plan**: `docs/plans/skills/SKILLS_PLAN.md`
- **Roadmap**: `docs/plans/skills/IMPLEMENTATION_ROADMAP.md`

### Skill-Specific Docs
- **Skill Builder**: `.claude/skills/skill-builder/README.md`
- **Specification**: `.claude/skills/skill-builder/docs/SPECIFICATION.md`
- **AgentDB**: `packages/agentdb/README.md`
- **ReasoningBank**: `agentic-flow/src/reasoningbank/README.md`

## 🔧 CLI Commands Reference

```bash
# Help
node dist/cli-proxy.js skills help

# List all installed skills
node dist/cli-proxy.js skills list

# Install skill-builder framework
node dist/cli-proxy.js skills init-builder [personal|project|both]

# Initialize directories
node dist/cli-proxy.js skills init [personal|project|both]

# Initialize with skill-builder included
node dist/cli-proxy.js skills init --with-builder

# Create 4 agentic-flow skills
node dist/cli-proxy.js skills create
```

## ✅ What's Included

### Skill Builder (Meta-Skill)
- ✅ Complete YAML specification
- ✅ Interactive generator script
- ✅ 10-step validation script
- ✅ Templates (minimal + full)
- ✅ JSON schema for validation
- ✅ Official Anthropic docs

### 4 Domain Skills
- ✅ **AgentDB Vector Search** (200+ lines, semantic search & RAG)
- ✅ **AgentDB Memory Patterns** (160+ lines, persistent memory)
- ✅ **Swarm Orchestration** (180+ lines, multi-agent coordination)
- ✅ **ReasoningBank Intelligence** (200+ lines, pattern learning)

### Integration Guide
- ✅ **AgentDB Quickstart** (330+ lines, complete integration)

## 🎯 Next Steps

1. **Try the skills**: Ask Claude Code to use any of the 6 skills
2. **Create custom skills**: Use Skill Builder to make workflow-specific skills
3. **Validate skills**: Run validation script on your skills
4. **Share skills**: Version control your `.claude/skills/` directory

## 🚀 Publishing

After publishing agentic-flow to npm:

```bash
# Users can install with:
npx agentic-flow skills init-builder
npx agentic-flow skills create
npx agentic-flow skills list
```

---

**Status**: ✅ Production Ready
**Version**: agentic-flow v1.6.6
**Total Skills**: 6 (1 meta + 1 integration + 4 domain)
**Total Lines**: 2,000+ lines of documentation and code examples
