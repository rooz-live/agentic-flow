# Environment Template Synchronization

## Overview

The `ay env sync` command provides automatic synchronization of environment templates across the entire repository, ensuring consistency while maintaining security by masking sensitive credentials.

## Problem Statement

With 12+ environment template files scattered across the codebase (`.env.example`, `.env.template`, `config/.env.example`, `docker/configs/*.env.template`, etc.), maintaining consistency is error-prone and time-consuming. When new environment variables are added or defaults change, all templates must be updated manually, leading to:

- **Drift**: Templates become out of sync with each other
- **Missing variables**: New required variables don't propagate to all templates
- **Security risks**: Developers might accidentally commit real credentials to templates
- **Documentation gaps**: No single source of truth for what variables exist

## Solution

A single source of truth (`config/env.catalog.json`) combined with an automated sync tool that:

1. **Reads active environment** from `.env` and `process.env`
2. **Applies security rules** to mask secrets
3. **Writes safe defaults** to all template files
4. **Adds missing variables** automatically
5. **Validates consistency** in CI/CD

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           Environment Template Sync Flow            │
└─────────────────────────────────────────────────────┘

Active Environment (.env + process.env)
                 ↓
    ┌────────────────────────┐
    │ config/env.catalog.json│
    │  (Single Source of     │
    │   Truth)               │
    └────────────┬───────────┘
                 ↓
    ┌────────────────────────┐
    │ tooling/scripts/       │
    │   env-sync.ts          │
    │  (Sync Engine)         │
    └────────────┬───────────┘
                 ↓
    ┌────────────────────────────────┐
    │ Security Rules Applied:        │
    │ • Secrets → <REQUIRED>         │
    │ • Non-secrets → active/default │
    └────────────┬───────────────────┘
                 ↓
    ┌────────────────────────────────┐
    │ 12+ Template Files Updated:    │
    │ • .env.example                 │
    │ • .env.template                │
    │ • config/.env.example          │
    │ • docker/configs/*.env.template│
    │ • examples/**/.env.example     │
    └────────────────────────────────┘
```

## Files

### Core Components

| File | Purpose |
|------|---------|
| `config/env.catalog.json` | Single source of truth for all environment variables |
| `tooling/scripts/env-sync.ts` | Sync engine that propagates values to templates |
| `tooling/cli/ay` | CLI wrapper with `ay env sync` command |
| `.github/workflows/env-drift-check.yml` | CI check for template drift |

### Template Files (12+)

- `.env.example` (175 lines)
- `.env.template` (107 lines)
- `.env.integration`
- `.env.docker-test`
- `config/.env.example`
- `config/.env.fastmcp`
- `config/discord_production.env.template`
- `docker/configs/claude.env.template`
- `docker/configs/multi-model.env.template`
- `docker/configs/openrouter.env.template`
- `examples/research-swarm/.env.example`

## Usage

### Dry Run (Check for Drift)

```bash
# Check if templates need updating (default mode)
./tooling/cli/ay env sync

# Output:
# 🔍 DRY RUN - Would update:
#   - ./.env.example
#   - ./config/.env.example
# ✅ Pass --write to apply changes.
```

**Exit codes:**
- `0` - No drift, templates in sync
- `1` - Drift detected (triggers CI failure)
- `>1` - Error occurred

### Apply Changes

```bash
# Update all templates
./tooling/cli/ay env sync --write

# Output:
# ✅ Updated:
#   - ./.env.example
#   - ./config/.env.example
# ✓ Environment templates synchronized
```

### CI Integration

The GitHub Actions workflow `.github/workflows/env-drift-check.yml` automatically:

1. Runs dry-run on PR changes to env files
2. Fails CI if drift detected
3. Comments on PR with fix instructions
4. Runs on pushes to `main`/`develop`

## Catalog Schema

`config/env.catalog.json` defines all environment variables:

```json
{
  "VAR_NAME": {
    "secret": true/false,     // If true, replaced with <REQUIRED>
    "default": "value",       // Default value for non-secrets
    "desc": "Description"     // Human-readable description
  }
}
```

### Example Entries

```json
{
  "AWS_REGION": {
    "secret": false,
    "default": "us-west-1",
    "desc": "Default AWS region"
  },
  "HIVELOCITY_API_KEY": {
    "secret": true,
    "desc": "Hivelocity infrastructure API key"
  },
  "API_PORT": {
    "secret": false,
    "default": "3001",
    "desc": "API server port (Grafana uses 3000)"
  }
}
```

## Security Model

### Secret Handling

**Secrets are NEVER written to templates:**

```bash
# Active .env
HIVELOCITY_API_KEY=hive_live_abc123xyz

# Template output
HIVELOCITY_API_KEY=<REQUIRED>
```

### Non-Secret Defaults

**Non-secrets use active values or catalog defaults:**

```bash
# Active .env
AWS_REGION=us-east-1

# Template output (uses active value)
AWS_REGION=us-east-1

# If not in active env, uses catalog default:
AWS_REGION=us-west-1
```

## Template Update Rules

### Existing Variables

For each `KEY=VALUE` line in a template:

1. Check if `KEY` exists in catalog
2. If secret: replace with `KEY=<REQUIRED>`
3. If non-secret: replace with active value or catalog default
4. Preserve comments and formatting

### Missing Variables

New variables in catalog but not in template:

```bash
# Added keys (2026-01-17)
# Description from catalog
NEW_VAR=<REQUIRED>  # if secret
NEW_VAR=default_value  # if non-secret
```

### Unknown Variables

Variables in template but not in catalog:
- **Preserved as-is** (no modification)
- Recommendation: Add to catalog or remove from template

## Workflow Examples

### Adding a New Environment Variable

```bash
# 1. Add to catalog
echo '{
  "NEW_API_KEY": {
    "secret": true,
    "desc": "New service API key"
  }
}' | jq -s '.[0] * .[1]' config/env.catalog.json - > tmp && mv tmp config/env.catalog.json

# 2. Sync all templates
./tooling/cli/ay env sync --write

# 3. Commit changes
git add config/env.catalog.json .env.* config/ docker/configs/ examples/
git commit -m "feat: add NEW_API_KEY environment variable"
```

### Updating Default Values

```bash
# 1. Edit catalog
sed -i '' 's/"us-west-1"/"us-east-2"/g' config/env.catalog.json

# 2. Sync templates
./tooling/cli/ay env sync --write

# 3. Verify changes
git diff config/env.catalog.json .env.example
```

### Checking Template Consistency

```bash
# Dry run shows which templates need updating
./tooling/cli/ay env sync

# If drift detected (exit 1):
# 🔍 DRY RUN - Would update:
#   - ./.env.example
# ✅ Pass --write to apply changes.
```

## CI/CD Integration

### GitHub Actions Workflow

The workflow triggers on:

**Pull Requests:**
- Changes to any `.env.*` file
- Changes to `config/env.catalog.json`
- Changes to `tooling/scripts/env-sync.ts`

**Pushes:**
- To `main` or `develop` branches
- Changes to `.env.example`, `.env.template`, or catalog

### PR Comment (on drift)

```markdown
## ⚠️ Environment Template Drift Detected

Your changes have caused environment templates to drift from the catalog.

**To fix:**
```bash
./tooling/cli/ay env sync --write
git add .
git commit -m "chore: sync environment templates"
git push
```

This ensures all environment templates across the system stay in sync with `config/env.catalog.json`.
```

## Technical Details

### Dependencies

- **Runtime**: Node.js 20+
- **Execution**: `tsx` (preferred) or `ts-node`
- **Parsing**: Built-in (no external deps for dotenv parsing)
- **Globbing**: `glob` package (already in project)

### Performance

- **Scan time**: <100ms for 12 templates
- **Update time**: <200ms to write all templates
- **Memory**: <10MB

### Idempotence

Running twice with same state = no changes:

```bash
$ ./tooling/cli/ay env sync --write
✅ Updated: 8 files

$ ./tooling/cli/ay env sync --write
✅ Updated: (no changes needed)
```

## Troubleshooting

### "tsx not found"

```bash
npm install -g tsx
# or
npm install tsx --save-dev
```

### "Catalog not found"

Ensure `config/env.catalog.json` exists:

```bash
ls -l config/env.catalog.json
```

### Templates still drifting

Check for manual edits outside of sync:

```bash
git diff config/env.catalog.json .env.example
```

### CI failing on PR

Run locally before pushing:

```bash
./tooling/cli/ay env sync --write
git add .
git commit -m "chore: sync env templates"
git push
```

## Best Practices

### DO

✅ Add all new variables to `config/env.catalog.json` first  
✅ Run `ay env sync --write` after catalog changes  
✅ Mark secrets with `"secret": true` in catalog  
✅ Provide descriptions for all variables  
✅ Use meaningful defaults for non-secrets  
✅ Commit template changes with catalog changes  

### DON'T

❌ Edit template files directly (edit catalog instead)  
❌ Commit real credentials to templates  
❌ Skip the dry-run check (`ay env sync`)  
❌ Ignore CI drift warnings  
❌ Have variables outside the catalog  

## Migration from Manual Templates

### Step 1: Audit Existing Templates

```bash
# Find all template files
find . -name "*.env.example" -o -name "*.env.template" -o -name ".env.*"
```

### Step 2: Build Catalog

```bash
# Extract unique keys from all templates
for f in $(find . -name ".env.*" -type f); do
  grep -E "^[A-Z_]+" "$f" | cut -d= -f1
done | sort -u > all_keys.txt

# Review and categorize as secret/non-secret
```

### Step 3: Run Initial Sync

```bash
./tooling/cli/ay env sync --write
```

### Step 4: Review Changes

```bash
git diff
# Verify secrets are masked
# Verify defaults are appropriate
```

### Step 5: Commit and Enable CI

```bash
git add .
git commit -m "feat: implement env template sync system"
git push
```

## Future Enhancements

### Planned

- [ ] Support for environment-specific catalogs (`env.catalog.dev.json`, `env.catalog.prod.json`)
- [ ] Validation against actual usage in codebase (unused vars)
- [ ] Auto-detection of new env vars from code (grep for `process.env.X`)
- [ ] Integration with secrets managers (AWS Secrets Manager, Vault)
- [ ] Pre-commit hook for automatic sync

### Considered

- [ ] Support for `.env.local` (developer-specific, never committed)
- [ ] Template diffing tool to show what changed
- [ ] Slack/Discord notifications on drift in CI

## Related Documentation

- [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) - How to set up environment credentials
- [ROAM-tracker.md](./ROAM-tracker.md) - Risk/Opportunity/Action/Metrics tracking
- [RESTRUCTURING_PLAN.md](./RESTRUCTURING_PLAN.md) - Overall project structure

## Support

**Issues:** Create GitHub issue with `environment` label  
**Questions:** See `docs/ENV_SETUP_GUIDE.md`  
**CI Failures:** Run `ay env sync --write` locally and push

---

Last updated: 2026-01-17  
Version: 1.0.0  
Maintained by: Agentic Flow Team
