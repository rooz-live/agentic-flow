# Skills Migration Guide - v1.7.0

## Namespace Consistency Fix

In v1.7.0, we've fixed the skill installation namespace for better organization and Claude Code discovery.

## What Changed

### Before (v1.6.6 and earlier)
```
~/.claude/skills/
├── skill-builder/              # ❌ Top-level (inconsistent)
└── agentic-flow/
    ├── agentdb-vector-search/
    ├── swarm-orchestration/
    └── reasoningbank-intelligence/
```

### After (v1.7.0+)
```
~/.claude/skills/
└── agentic-flow/               # ✅ All under namespace
    ├── skill-builder/          # ✅ Now consistent
    ├── agentdb-vector-search/
    ├── agentdb-memory-patterns/
    ├── agentdb-quickstart/
    ├── swarm-orchestration/
    └── reasoningbank-intelligence/
```

## Why This Matters

1. **Better Organization**: All agentic-flow skills grouped under one namespace
2. **Claude Code Discovery**: Skills are more reliably discovered by Claude Code
3. **Consistent Structure**: Follows best practices for skill packaging
4. **Easier Management**: Install/uninstall all agentic-flow skills together

## Migration Options

### Option 1: Automatic (Recommended)

Simply reinstall skills with the new version:

```bash
# Upgrade to v1.7.0
npm install -g agentic-flow@latest

# Reinstall skills (will use new namespace)
npx agentic-flow skills init personal --with-builder
```

The old location will remain but won't be used. You can manually remove it later.

### Option 2: Manual Migration

Move skills to the new namespace:

```bash
# Create new namespace directory
mkdir -p ~/.claude/skills/agentic-flow

# Move skill-builder
mv ~/.claude/skills/skill-builder ~/.claude/skills/agentic-flow/skill-builder

# Verify all skills are under agentic-flow namespace
ls -la ~/.claude/skills/agentic-flow/
```

### Option 3: Clean Install

Remove old skills and reinstall:

```bash
# Remove old skills
rm -rf ~/.claude/skills/skill-builder
rm -rf ~/.claude/skills/agentic-flow

# Reinstall with new version
npx agentic-flow skills init personal --with-builder
npx agentic-flow skills create  # Optional: create project-level skills
```

## Verification

After migration, verify skills are properly installed:

```bash
# List all installed skills
npx agentic-flow skills list

# Should show:
# Personal Skills (~/.claude/skills/)
#   • Skill Builder            (under agentic-flow namespace)
#   • AgentDB Quickstart       (under agentic-flow namespace)
#   ... etc
```

## For Users With Custom Skills

If you have custom skills in the old location:

```bash
# Your custom skills in ~/.claude/skills/my-skills/ are NOT affected
# Only agentic-flow's skill-builder location changed
```

## Restart Claude Code

After migration, restart Claude Code to pick up the new skill locations:

```bash
# Close and reopen Claude Code
# or
# Restart your IDE
```

## Rollback

If you need to rollback to v1.6.6:

```bash
npm install -g agentic-flow@1.6.6
```

The old skill locations will still work in v1.6.6.

## Support

If you experience issues:

1. Check skill installation: `npx agentic-flow skills list`
2. Verify directory: `ls -la ~/.claude/skills/agentic-flow/`
3. Report issues: https://github.com/ruvnet/agentic-flow/issues

## Technical Details

**Files Changed:**
- `src/cli/skills-manager.ts` - Updated namespace handling
- `.claude/skills/` - Directory structure reorganized

**Backward Compatibility:**
- Source detection checks both old and new locations
- Existing skills continue to work during migration
- No breaking changes to skill functionality

## Benefits

✅ All agentic-flow skills under one namespace
✅ Better Claude Code discovery
✅ Consistent with skill packaging best practices
✅ Easier to manage multiple skill sources
✅ Cleaner ~/.claude/skills/ directory structure
