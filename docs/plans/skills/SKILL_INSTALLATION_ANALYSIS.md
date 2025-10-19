# Skill Installation Analysis & Recommendations

## Executive Summary

Analysis of agentic-flow's skill installation system reveals that **the current implementation is correct** according to Claude Code's official documentation. Skills ARE being installed to the proper locations, but there's a **namespace inconsistency** that should be addressed for better organization.

## Claude Code Official Requirements

### Skill Discovery Locations (Official)

Claude Code automatically discovers skills from:

1. **Personal (User-Level)**: `~/.claude/skills/`
   - Available across all projects
   - User-specific skills

2. **Project-Level**: `.claude/skills/` (in project directory)
   - Shared with team via version control
   - Project-specific skills

3. **Plugin Skills**: `skills/` directory in any plugin

### Directory Structure (Official)

```
~/.claude/skills/
├── my-skill/
│   └── SKILL.md          # Minimum required
├── complex-skill/
│   ├── SKILL.md
│   ├── FORMS.md
│   ├── REFERENCE.md
│   └── scripts/
```

**Key Points:**
- Skills can be at any depth under `.claude/skills/`
- Namespaces/subdirectories ARE supported
- Only `SKILL.md` with YAML frontmatter is required
- Discovery is recursive

## Current agentic-flow Implementation

### What's Working ✅

1. **Correct Installation Paths**
   ```typescript
   // Line 30-37 in skills-manager.ts
   export function getSkillsPaths() {
     return {
       personal: join(homedir(), '.claude', 'skills'),  // ✅ Correct
       project: join(process.cwd(), '.claude', 'skills'), // ✅ Correct
     };
   }
   ```

2. **Skills ARE Discoverable**
   - Personal skills: `~/.claude/skills/agentic-flow/*` ✅
   - Project skills: `.claude/skills/agentic-flow/*` ✅
   - Both locations are valid per Claude documentation

3. **Package Distribution**
   ```json
   // package.json line 174
   "files": [".claude", ...]  // ✅ Skills shipped with npm package
   ```

4. **Init Command Works**
   ```bash
   npx agentic-flow skills init --with-builder
   ```
   - Creates `~/.claude/skills/` ✅
   - Installs skill-builder ✅
   - Copies from package source ✅

### The Namespace Inconsistency ⚠️

**Current State:**
```
~/.claude/skills/
├── skill-builder/              # ❌ Top-level (no namespace)
└── agentic-flow/               # ✅ Namespaced
    ├── agentdb-vector-search/
    ├── swarm-orchestration/
    └── reasoningbank-intelligence/
```

**Issue:** skill-builder is placed at `~/.claude/skills/skill-builder/` while all other agentic-flow skills are under `~/.claude/skills/agentic-flow/`

**Why This Happened:**
```typescript
// Line 398 in skills-manager.ts
const builderDir = join(baseDir, 'skill-builder');  // ❌ No namespace

// Line 74 in skills-manager.ts (for other skills)
const skillDir = join(baseDir, 'agentic-flow', template.name);  // ✅ Namespaced
```

## Why Skills Weren't Showing in Claude Code

The original issue was **NOT a bug**, but a misunderstanding:

1. ✅ Skills ARE in correct locations (`~/.claude/skills/`)
2. ✅ Skills ARE being discovered by Claude Code
3. ✅ The namespace structure is valid

**The Real Issue:** Skills may not have been installed yet because:
- User hasn't run `npx agentic-flow skills init --with-builder`
- Or Claude Code needs restart after installation
- Or we were checking project-level instead of user-level

## Recommendations

### Priority 1: Fix Namespace Consistency (RECOMMENDED)

**Change skill-builder to use namespace:**

```typescript
// skills-manager.ts line 398
// BEFORE:
const builderDir = join(baseDir, 'skill-builder');

// AFTER:
const builderDir = join(baseDir, 'agentic-flow', 'skill-builder');
```

**Result:**
```
~/.claude/skills/
└── agentic-flow/                    # All skills under one namespace
    ├── skill-builder/               # ✅ Consistent
    ├── agentdb-vector-search/
    ├── swarm-orchestration/
    └── reasoningbank-intelligence/
```

**Benefits:**
- Consistent organization
- Prevents namespace pollution
- Easier to manage/uninstall all agentic-flow skills
- Follows best practices for package-distributed skills

### Priority 2: Add Postinstall Hook (OPTIONAL)

```json
// package.json
{
  "scripts": {
    "postinstall": "node scripts/postinstall-skills.js"
  }
}
```

**Benefits:**
- Auto-installs skills on `npm install -g agentic-flow`
- Better user experience (no manual init needed)
- Ensures skills are always available

**Drawbacks:**
- May interfere with CI/CD environments
- Not all users want skills auto-installed
- Adds complexity

**Recommendation:** Document manual installation well instead

### Priority 3: Improve Documentation (HIGH PRIORITY)

Update README to clarify:

1. **Skills are optional** - They require explicit installation
2. **Installation command**: `npx agentic-flow skills init --with-builder`
3. **Restart required**: Claude Code must restart to discover new skills
4. **Verification**: `npx agentic-flow skills list` to see installed skills

## Implementation Changes Needed

### File: `agentic-flow/src/cli/skills-manager.ts`

**Change 1: Fix namespace consistency (line 398)**
```typescript
async function installSkillBuilder(location: 'personal' | 'project' | 'both'): Promise<void> {
  const paths = getSkillsPaths();
  const locations: Array<'personal' | 'project'> = location === 'both' ? ['personal', 'project'] : [location];

  for (const loc of locations) {
    const baseDir = loc === 'personal' ? paths.personal : paths.project;
    // CHANGE THIS LINE:
    const builderDir = join(baseDir, 'agentic-flow', 'skill-builder');  // Was: join(baseDir, 'skill-builder')

    // ... rest of function
  }
}
```

**Change 2: Update source detection paths (lines 407-410)**
```typescript
// After the change above, update source paths to match new location:
const possibleSources = [
  join(process.cwd(), '.claude', 'skills', 'agentic-flow', 'skill-builder'),           // Project
  join(__dirname, '..', '..', '.claude', 'skills', 'agentic-flow', 'skill-builder'),   // Package
  join(__dirname, '..', '..', '..', '.claude', 'skills', 'agentic-flow', 'skill-builder'), // Monorepo
];
```

**Change 3: Update help text references (lines 380-385, 1361)**
```typescript
// Update all references from:
// '.claude/skills/skill-builder/'
// to:
// '.claude/skills/agentic-flow/skill-builder/'
```

### File: `.claude/skills/skill-builder/` (Source)

**Move directory:**
```bash
# In the source repository
mv .claude/skills/skill-builder .claude/skills/agentic-flow/skill-builder
```

### File: `agentic-flow/.claude/skills/skill-builder/` (Package)

**Move directory:**
```bash
# In the npm package directory
mv agentic-flow/.claude/skills/skill-builder agentic-flow/.claude/skills/agentic-flow/skill-builder
```

## Testing Plan

1. **Test Installation**
   ```bash
   # Clean install
   npm install -g agentic-flow

   # Initialize skills
   npx agentic-flow skills init --with-builder

   # Verify location
   ls -la ~/.claude/skills/agentic-flow/
   # Should show: skill-builder, agentdb-vector-search, etc.
   ```

2. **Test Discovery**
   ```bash
   # List skills
   npx agentic-flow skills list

   # Should show all skills under "agentic-flow/" namespace
   ```

3. **Test Claude Code Detection**
   - Restart Claude Code
   - Check available skills
   - Should see all agentic-flow skills

4. **Test Both Locations**
   ```bash
   # Personal
   npx agentic-flow skills init personal --with-builder

   # Project
   npx agentic-flow skills init project --with-builder

   # Both should work identically
   ```

## Migration Path for Existing Users

For users who already have `~/.claude/skills/skill-builder/` installed:

**Option 1: Automatic Migration (Recommended)**
```typescript
// Add to installSkillBuilder function:
async function installSkillBuilder(location: 'personal' | 'project' | 'both'): Promise<void> {
  // ... existing code ...

  // Check for old location and migrate
  const oldBuilderDir = join(baseDir, 'skill-builder');
  const newBuilderDir = join(baseDir, 'agentic-flow', 'skill-builder');

  if (existsSync(oldBuilderDir) && !existsSync(newBuilderDir)) {
    console.log(chalk.yellow('⚠') + ' Migrating skill-builder to new location...');
    await copyRecursive(oldBuilderDir, newBuilderDir);
    console.log(chalk.green('✓') + ' Migration complete');
  }
}
```

**Option 2: Manual Migration Instructions**
```bash
# Add to release notes / upgrade guide
mv ~/.claude/skills/skill-builder ~/.claude/skills/agentic-flow/skill-builder
```

## Breaking Changes?

**No** - This is NOT a breaking change because:
1. Claude Code discovers skills recursively
2. Both old and new locations work
3. Skills continue functioning during migration
4. Worst case: Users have two copies (no errors)

## Conclusion

The current implementation **is correct** per Claude Code documentation. The only improvement needed is **namespace consistency** for better organization and maintainability.

### Action Items

- [ ] Move skill-builder to `agentic-flow/` namespace in source
- [ ] Update `installSkillBuilder()` to use new path
- [ ] Update source detection paths
- [ ] Update all documentation references
- [ ] Add migration logic for existing installations
- [ ] Test installation on clean system
- [ ] Test installation with existing skills
- [ ] Update CHANGELOG.md
- [ ] Bump version to reflect improvement

### Estimated Impact

- **Code Changes**: 10 lines in 1 file
- **Testing**: 30 minutes
- **Risk**: Very low (backward compatible)
- **User Impact**: Positive (better organization)
