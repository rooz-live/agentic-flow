# Claude Code Skills - Official Specification

**Source**: Anthropic Documentation & Research
**Last Updated**: 2025-10-19
**Status**: Production

---

## Overview

Claude Code Skills are filesystem-based knowledge modules that Claude can autonomously discover and use. They follow a progressive disclosure architecture that enables scaling to 100+ skills without context window penalties.

---

## YAML Frontmatter Specification

### Required Format

```yaml
---
name: "Skill Name"
description: "Description text"
---
```

### Field Definitions

#### `name` (REQUIRED)
- **Type**: String
- **Min Length**: 1 character
- **Max Length**: 64 characters
- **Format**: Human-friendly display name
- **Usage**: Shown in UI, loaded into system prompt
- **Validation**: Must be unique within skills directory
- **Examples**:
  - ✅ "API Documentation Generator"
  - ✅ "React Component Builder"
  - ❌ "" (empty)
  - ❌ "This is a very long skill name that definitely exceeds the sixty-four character limit" (too long)

#### `description` (REQUIRED)
- **Type**: String
- **Min Length**: 10 characters (recommended 50+)
- **Max Length**: 1024 characters
- **Content Requirements**:
  1. **WHAT**: What the skill does (functionality)
  2. **WHEN**: When Claude should invoke it (triggers)
- **Usage**: Loaded into system prompt for autonomous skill matching
- **Validation**: Should contain action verbs and use cases
- **Examples**:
  - ✅ "Generate OpenAPI 3.0 documentation from Express.js routes. Use when creating API docs, documenting endpoints, or building API specifications."
  - ✅ "Debug React performance issues using Chrome DevTools. Use when components re-render unnecessarily, investigating slow updates, or optimizing bundle size."
  - ❌ "API documentation tool" (no "when" clause, too vague)
  - ❌ "A comprehensive guide to building APIs" (no clear triggers)

### Additional Fields

**Status**: NOT part of official specification
**Behavior**: Additional fields (version, author, tags, etc.) are **ignored** by Claude

```yaml
---
name: "My Skill"
description: "My description"
version: "1.0.0"       # Ignored
author: "Me"           # Ignored
tags: ["dev"]          # Ignored
custom: "value"        # Ignored
---
```

**Recommendation**: Avoid adding non-standard fields to keep frontmatter clean.

---

## Directory Structure Specification

### Minimal Valid Skill

```
~/.claude/skills/
└── my-skill/
    └── SKILL.md        # REQUIRED
```

### Full-Featured Skill

```
~/.claude/skills/
└── namespace/
    └── skill-name/
        ├── SKILL.md                 # REQUIRED: Main skill file
        ├── README.md                # Optional: Human-readable docs
        ├── scripts/                 # Optional: Executable scripts
        │   ├── setup.sh
        │   └── generate.js
        ├── resources/               # Optional: Supporting files
        │   ├── templates/
        │   ├── examples/
        │   └── schemas/
        └── docs/                    # Optional: Additional docs
            ├── ADVANCED.md
            └── API_REFERENCE.md
```

### Skills Locations

**Personal Skills**:
- **Path**: `~/.claude/skills/` or `$HOME/.claude/skills/`
- **Scope**: Available across all projects for current user
- **Discovery**: Auto-detected by Claude Code on startup
- **Version Control**: NOT recommended (user-specific)

**Project Skills**:
- **Path**: `<project-root>/.claude/skills/`
- **Scope**: Available only within this project
- **Discovery**: Auto-detected when Claude Code runs in project
- **Version Control**: RECOMMENDED (team-shared)

---

## Progressive Disclosure Architecture

### Level 1: Metadata (Name + Description)
- **Loaded**: At startup for ALL skills
- **Size**: ~200 bytes per skill
- **Purpose**: Enable skill matching
- **Context Impact**: 100 skills = ~20KB

```yaml
---
name: "API Builder"       # ~11 bytes
description: "Creates REST APIs with Express. Use when building APIs." # ~60 bytes
---
# Total per skill: ~71 bytes + YAML overhead = ~200 bytes
```

### Level 2: SKILL.md Body
- **Loaded**: Only when skill is triggered
- **Size**: 1-10KB typically (recommended < 50KB)
- **Purpose**: Main instructions and procedures
- **Context Impact**: Only active skills loaded

```markdown
# API Builder

## What This Skill Does
[Loaded only when skill is active]

## Quick Start
...
```

### Level 3+: Referenced Files
- **Loaded**: On-demand as Claude navigates
- **Size**: Variable (KB to MB)
- **Purpose**: Deep reference, schemas, examples
- **Context Impact**: Only specific files Claude accesses

```markdown
See [Advanced Guide](docs/ADVANCED.md)
Use template: `resources/templates/api.template`
```

**Benefit**: Install 100+ skills with minimal context penalty. Only active skill content enters context window.

---

## Content Structure Recommendations

### 4-Level Structure

```markdown
---
name: "..."
description: "..."
---

# Level 1: Overview (Always Read)
- What This Skill Does (2-3 sentences)
- Prerequisites

# Level 2: Quick Start (Common Path)
- Basic usage command
- Expected output

# Level 3: Detailed Instructions (Full Guide)
- Step-by-step procedures
- Advanced options

# Level 4: Reference (Rarely Needed)
- Troubleshooting
- API reference links
```

### Recommended Sections

**REQUIRED**:
- H1 title matching skill name
- "What This Skill Does" section

**RECOMMENDED**:
- Prerequisites
- Quick Start
- Step-by-Step Guide
- Troubleshooting

**OPTIONAL**:
- Advanced Features
- Examples
- API Reference
- Related Skills
- Resources

---

## File Reference Patterns

Claude can navigate to referenced files automatically:

### Markdown Links
```markdown
See [Advanced Configuration](docs/ADVANCED.md)
See [Troubleshooting](docs/TROUBLESHOOTING.md)
```

### Relative Paths
```markdown
Use template at `resources/templates/api.template`
See examples in `resources/examples/basic/`
```

### Inline Content
```markdown
See configuration schema in `resources/schemas/config.json`
```

**Best Practice**: Keep SKILL.md lean. Move lengthy content to separate files and reference them.

---

## Validation Requirements

### YAML Frontmatter
- ✅ Starts with `---` on first line
- ✅ Contains `name` field (1-64 chars)
- ✅ Contains `description` field (10-1024 chars, recommended 50+)
- ✅ Ends with `---` before markdown content
- ✅ Valid YAML syntax (no parse errors)

### File Structure
- ✅ SKILL.md exists
- ✅ Located in `~/.claude/skills/` or `.claude/skills/`
- ✅ Directory name is clear and descriptive

### Content Quality
- ✅ Description includes "what" and "when"
- ✅ Instructions are clear and actionable
- ✅ Examples are concrete and runnable
- ✅ File size < 50KB (SKILL.md)

### Discovery
- ✅ Skill appears in Claude's skills list
- ✅ Description triggers on relevant queries
- ✅ Claude can execute instructions successfully

---

## Platform Support

Skills work across all Claude surfaces:

| Platform | Support | Notes |
|----------|---------|-------|
| **Claude.ai** | ✅ Full | Upload skills or use built-in |
| **Claude Code** | ✅ Full | Auto-discovery from filesystem |
| **Claude SDK** | ✅ Full | Programmatic access via API |
| **Claude API** | ✅ Full | Skills via API calls |

**Format**: Same SKILL.md format across all platforms (portable)

---

## Best Practices

### Description Writing
1. **Front-load keywords**: Put important trigger words first
2. **Include "when" clause**: Specify use cases explicitly
3. **Be specific**: Name technologies, frameworks, tools
4. **Use action verbs**: "Generate", "Create", "Debug", "Build"
5. **Target queries**: Think about what users will ask

### Content Organization
1. **Progressive disclosure**: Start simple, add detail gradually
2. **Scannable structure**: Use clear headings and lists
3. **Concrete examples**: Show actual code, not just descriptions
4. **Reference heavy content**: Move large docs to separate files
5. **Keep SKILL.md lean**: Target 2-10KB for optimal performance

### File Management
1. **Use namespaces**: Organize skills by category/owner
2. **Scripts in scripts/**: Keep executable files organized
3. **Resources in resources/**: Templates, examples, schemas
4. **Docs in docs/**: Long-form documentation
5. **README for humans**: SKILL.md is for Claude, README is for people

---

## Common Mistakes

### ❌ Invalid YAML
```yaml
name: API:Builder  # Missing quotes with special char
```
**Fix**:
```yaml
name: "API:Builder"
```

### ❌ Description Too Vague
```yaml
description: "API documentation tool"
```
**Fix**:
```yaml
description: "Generate OpenAPI 3.0 docs from Express routes. Use when documenting APIs."
```

### ❌ Massive SKILL.md
```markdown
[10,000 lines of reference documentation in SKILL.md]
```
**Fix**: Move to separate files, reference from SKILL.md

### ❌ No "When" Clause
```yaml
description: "Creates React components with TypeScript."
```
**Fix**:
```yaml
description: "Creates React components with TypeScript. Use when scaffolding new components or refactoring."
```

---

## Version History

- **2025-10-16**: Official Skills launch by Anthropic
- **2025-10-19**: Specification documented in this file

---

## References

- [Anthropic Skills Documentation](https://docs.claude.com/en/docs/agents-and-tools/agent-skills)
- [GitHub Skills Repository](https://github.com/anthropics/skills)
- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
- [Anthropic Engineering Blog: Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
