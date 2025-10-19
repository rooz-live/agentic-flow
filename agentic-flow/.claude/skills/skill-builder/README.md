# Skill Builder

**Meta-Skill**: A skill that teaches you how to create other Claude Code Skills

---

## What This Is

Skill Builder is a comprehensive reference and toolkit for creating production-ready Claude Code Skills. It includes:

- ✅ **Complete specification** - All YAML frontmatter requirements and best practices
- ✅ **Generation scripts** - Automated skill scaffolding with templates
- ✅ **Validation tools** - Check skills against Anthropic specification
- ✅ **Templates** - Minimal, intermediate, and advanced skill templates
- ✅ **Examples** - Real-world skill patterns and structures

---

## Directory Structure

```
skill-builder/
├── SKILL.md                           # Main skill (Claude reads this)
├── README.md                          # This file (human docs)
├── scripts/                           # Automated tools
│   ├── generate-skill.sh              # Create new skills
│   └── validate-skill.sh              # Validate existing skills
├── resources/                         # Templates and schemas
│   ├── templates/
│   │   ├── minimal-skill.template     # Basic skill template
│   │   └── full-skill.template        # Full-featured template
│   └── schemas/
│       └── skill-frontmatter.schema.json  # YAML validation schema
└── docs/                              # Reference documentation
    └── SPECIFICATION.md               # Official spec details
```

---

## Quick Start

### 1. Use the Skill in Claude Code

Ask Claude:
```
"I want to create a new skill for generating React components"
```

Claude will:
1. Load the Skill Builder SKILL.md
2. Guide you through skill creation
3. Generate proper YAML frontmatter
4. Set up directory structure
5. Provide templates and examples

### 2. Use Generation Scripts

Generate a new skill automatically:

```bash
# Interactive mode
./scripts/generate-skill.sh my-new-skill personal

# Follow prompts for:
# - Display name
# - Description
# - Category/namespace
# - Optional directories (scripts, resources, docs)
```

### 3. Validate Existing Skills

Check if a skill meets Anthropic specification:

```bash
./scripts/validate-skill.sh ~/.claude/skills/my-skills/my-skill

# Checks:
# ✓ SKILL.md exists
# ✓ YAML frontmatter present
# ✓ name field (1-64 chars)
# ✓ description field (10-1024 chars)
# ✓ Content structure
# ✓ File size appropriate
```

---

## What You'll Learn

### From SKILL.md

**Level 1: Essentials**
- YAML frontmatter requirements (`name`, `description`)
- Skills directory locations (personal vs project)
- Progressive disclosure architecture

**Level 2: Structure**
- Complete directory structure
- Content organization (4-level structure)
- File reference patterns

**Level 3: Advanced**
- Scripts and resources integration
- Multi-file navigation
- Validation best practices

**Level 4: Reference**
- Full specification details
- Examples from real skills
- Common mistakes and fixes

### From SPECIFICATION.md

- Official Anthropic specification
- Field definitions and constraints
- Platform support details
- Version history

---

## Templates Included

### Minimal Skill Template
**File**: `resources/templates/minimal-skill.template`
**Use When**: Quick, simple skills without scripts
**Size**: ~1KB
**Includes**:
- YAML frontmatter
- Basic sections (What, Quick Start, Steps, Troubleshooting)

### Full Skill Template
**File**: `resources/templates/full-skill.template`
**Use When**: Complex skills with scripts, resources, advanced features
**Size**: ~5KB
**Includes**:
- YAML frontmatter
- All 4 progressive disclosure levels
- Scripts reference table
- Resources organization
- Advanced features section

---

## Schema Validation

JSON Schema for YAML frontmatter validation:

**File**: `resources/schemas/skill-frontmatter.schema.json`

**Use**:
```bash
# Validate frontmatter with JSON schema tools
cat skill-frontmatter.yaml | ajv validate -s skill-frontmatter.schema.json
```

**Constraints**:
- `name`: 1-64 characters, required
- `description`: 10-1024 characters, required
- No additional properties allowed

---

## Examples of Skills You Can Create

### Development Tools
- "TypeScript Type Generator" - Generate TS types from JSON
- "API Client Builder" - Create API client from OpenAPI spec
- "Test Suite Generator" - Generate Jest tests from code

### Documentation
- "README Generator" - Create comprehensive READMEs
- "API Docs Builder" - Generate OpenAPI documentation
- "Changelog Creator" - Auto-generate CHANGELOGs

### Code Quality
- "Refactoring Assistant" - Guide code refactoring
- "Performance Analyzer" - Identify performance issues
- "Security Auditor" - Check for security vulnerabilities

### Workflow Automation
- "CI/CD Pipeline Builder" - Generate GitHub Actions workflows
- "Docker Setup" - Create Dockerfile and docker-compose
- "Deployment Helper" - Deploy to various platforms

---

## Best Practices

### Writing Descriptions
1. **Front-load keywords**: Important terms first
2. **Include "when" clause**: Clear trigger conditions
3. **Be specific**: Name exact technologies
4. **Use action verbs**: Generate, Create, Debug, Build
5. **Think like users**: What will they search for?

### Organizing Content
1. **Progressive disclosure**: Simple → Complex
2. **Scannable structure**: Clear headings, lists
3. **Concrete examples**: Actual code, not just text
4. **Reference heavy content**: Separate files for long docs
5. **Keep SKILL.md lean**: 2-10KB optimal

### File Management
1. **Use namespaces**: my-skills/, dev-tools/, etc.
2. **Scripts in scripts/**: Executable files
3. **Resources in resources/**: Templates, examples
4. **Docs in docs/**: Long-form documentation

---

## Validation Checklist

Before publishing a skill:

**YAML Frontmatter**:
- [ ] Starts with `---`
- [ ] Has `name` (1-64 chars)
- [ ] Has `description` (50-1024 chars recommended)
- [ ] Description includes "what" and "when"
- [ ] Ends with `---`
- [ ] Valid YAML syntax

**Content**:
- [ ] H1 title matches skill name
- [ ] "What This Skill Does" section
- [ ] Quick Start with example
- [ ] Step-by-step instructions
- [ ] Troubleshooting section

**Structure**:
- [ ] SKILL.md < 50KB
- [ ] Scripts are executable (if present)
- [ ] Resources are referenced correctly
- [ ] Links work (no broken references)

**Testing**:
- [ ] Appears in Claude's skills list
- [ ] Triggers on expected queries
- [ ] Instructions are clear
- [ ] Examples work

---

## Troubleshooting

### Skill Not Appearing

**Problem**: Claude doesn't show my skill
**Solutions**:
1. Check SKILL.md location (`~/.claude/skills/` or `.claude/skills/`)
2. Verify YAML frontmatter format
3. Restart Claude Code
4. Run validation script

### Description Not Matching

**Problem**: Claude doesn't trigger skill when expected
**Solutions**:
1. Add more specific trigger keywords
2. Include clear "when to use" clause
3. Front-load important terms
4. Test with different phrasings

### Validation Errors

**Problem**: Validation script reports errors
**Solution**: See error messages and fix:
- YAML syntax errors
- Field length violations
- Missing required sections

---

## Resources

### Official Documentation
- [Anthropic Skills Docs](https://docs.claude.com/en/docs/agents-and-tools/agent-skills)
- [GitHub Skills Repo](https://github.com/anthropics/skills)
- [Claude Code Docs](https://docs.claude.com/en/docs/claude-code)

### Community
- [Anthropic Discord](https://discord.gg/anthropic)
- [Skills Marketplace](https://github.com/anthropics/skills)

### Local Files
- Specification: [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md)
- Templates: [`resources/templates/`](resources/templates/)
- Schemas: [`resources/schemas/`](resources/schemas/)

---

## Contributing

To improve this skill:

1. Test skill creation workflows
2. Add more templates
3. Improve validation scripts
4. Document edge cases
5. Share examples

---

**Created**: 2025-10-19
**Version**: 1.0.0
**Maintained By**: agentic-flow team
**License**: MIT
