# Project Restructuring Plan - Lean Budget Guardrail Hierarchical Mesh Sparse Attention

**Date**: 2026-01-16  
**Objective**: Migrate from flat root structure to organized monorepo with technical debt reduction  
**Method**: Incremental migration with guardrails to prevent breaking changes

## Current State Analysis

### Root-Level Problems
1. **108 files in root** causing navigation difficulty
2. **Scattered configuration** across multiple locations
3. **Mixed concerns** (docs, tests, tools, experiments all intermingled)
4. **Unclear ownership** of files and responsibilities
5. **Technical debt accumulation** due to lack of boundaries

### Target Architecture

```
/code/investing/agentic-flow/
├── projects/          # All major projects (monorepo-style)
│   ├── core/         # Core agentic-flow functionality
│   ├── federation/   # Multi-agent federation
│   ├── goalie/       # Governance + observability
│   ├── affiliate/    # Affiliate system
│   └── medical/      # Medical AI system
├── config/           # All configuration (MCP, coordination)
│   ├── mcp/         # MCP server configs
│   ├── swarm/       # Swarm coordination configs
│   ├── env/         # Environment-specific configs
│   └── claude-flow/ # Claude Flow v3 configs
├── docs/             # All documentation (governance, ops, arch)
│   ├── architecture/ # ADRs, design docs
│   ├── operations/   # Runbooks, procedures
│   ├── governance/   # ROAM, WSJF, policies
│   └── api/         # API documentation
├── observability/    # Unified metrics & monitoring
│   ├── dashboards/  # Grafana, Deck.gl dashboards
│   ├── metrics/     # Prometheus, custom metrics
│   ├── logs/        # Log aggregation configs
│   └── traces/      # OpenTelemetry traces
├── testing/          # All tests (unit, integration, e2e)
│   ├── unit/        # Unit tests
│   ├── integration/ # Integration tests
│   ├── e2e/         # End-to-end tests
│   ├── fixtures/    # Test fixtures
│   └── performance/ # Load/performance tests
├── tooling/          # Scripts, parsers, utilities
│   ├── scripts/     # Bash/Python scripts
│   ├── cli/         # CLI tools (ay command)
│   ├── parsers/     # Code parsers
│   └── generators/  # Code generators
├── experimental/     # WIP research
│   ├── prototypes/  # Proof-of-concepts
│   ├── research/    # Research experiments
│   └── sandbox/     # Throwaway code
├── media/           # Presentations & demos
│   ├── presentations/
│   ├── demos/
│   └── screenshots/
├── archive/         # Historical data (compressed)
│   ├── 2025-q4/
│   ├── 2026-q1/
│   └── legacy/
└── retiring/        # To be deleted after 90 days
    └── deprecated-*
```

## Migration Strategy

### Phase 1: Create Structure (Day 1)

```bash
# Create all directories
mkdir -p projects/{core,federation,goalie,affiliate,medical}
mkdir -p config/{mcp,swarm,env,claude-flow}
mkdir -p docs/{architecture,operations,governance,api}
mkdir -p observability/{dashboards,metrics,logs,traces}
mkdir -p testing/{unit,integration,e2e,fixtures,performance}
mkdir -p tooling/{scripts,cli,parsers,generators}
mkdir -p experimental/{prototypes,research,sandbox}
mkdir -p media/{presentations,demos,screenshots}
mkdir -p archive/{2025-q4,2026-q1,legacy}
mkdir -p retiring
```

### Phase 2: Map Current Files to New Locations (Day 1-2)

| Current Location | New Location | Reason |
|-----------------|--------------|--------|
| `src/` | `projects/core/src/` | Core application code |
| `tests/` | `testing/` (reorganized by type) | Clear test organization |
| `tools/` | `tooling/` | Utility scripts and CLIs |
| `scripts/` | `tooling/scripts/` | Bash/Python automation |
| `docs/*.md` | `docs/` (organized by category) | Documentation structure |
| `*.config.{js,ts,json}` | `config/` | Centralized configuration |
| `.github/` | `config/.github/` | CI/CD configuration |
| `*.yaml` deployment configs | `config/swarm/` | Swarm configurations |
| Experiments/POCs | `experimental/` | WIP research |
| Old branches/versions | `archive/` | Historical reference |
| Deprecated features | `retiring/` | 90-day deletion queue |

### Phase 3: Incremental Migration Script (Day 2-3)

```bash
#!/bin/bash
# migrate-incremental.sh - Safe incremental migration

set -e

# Backup current state
echo "Creating backup..."
tar -czf "../agentic-flow-backup-$(date +%Y%m%d).tar.gz" .

# Track migration status
MIGRATION_LOG="migration-$(date +%Y%m%d-%H%M%S).log"

migrate_file() {
    local src=$1
    local dest=$2
    
    if [[ -f "$src" ]]; then
        echo "[$(date)] Moving $src -> $dest" >> "$MIGRATION_LOG"
        mkdir -p "$(dirname "$dest")"
        git mv "$src" "$dest" 2>> "$MIGRATION_LOG" || {
            cp "$src" "$dest"
            echo "[WARNING] Git mv failed, used cp for $src" >> "$MIGRATION_LOG"
        }
    fi
}

# Phase 3a: Migrate src/ to projects/core/src/
echo "Migrating core source files..."
for file in src/**/*; do
    if [[ -f "$file" ]]; then
        new_path="projects/core/$file"
        migrate_file "$file" "$new_path"
    fi
done

# Phase 3b: Migrate tests/ to testing/ (organized)
echo "Migrating tests..."
migrate_file "tests/unit/" "testing/unit/"
migrate_file "tests/integration/" "testing/integration/"
migrate_file "tests/e2e/" "testing/e2e/"
migrate_file "tests/performance/" "testing/performance/"

# Phase 3c: Migrate configurations
echo "Migrating configurations..."
for config in *.config.{js,ts,json} *.yaml *.yml; do
    [[ -f "$config" ]] && migrate_file "$config" "config/$config"
done

# Phase 3d: Migrate documentation
echo "Migrating documentation..."
migrate_file "docs/WSJF_IMPROVEMENT_PLAN.md" "docs/governance/WSJF_IMPROVEMENT_PLAN.md"
migrate_file "docs/ROAM-tracker.md" "docs/governance/ROAM-tracker.md"
migrate_file "docs/CAPEX_OPEX_ANALYSIS.md" "docs/operations/CAPEX_OPEX_ANALYSIS.md"

# Phase 3e: Migrate scripts
echo "Migrating scripts..."
migrate_file "scripts/" "tooling/scripts/"

# Phase 3f: Update import paths
echo "Updating import paths..."
find projects/core -type f -name "*.ts" -o -name "*.js" | while read -r file; do
    sed -i.bak "s|from '../src/|from '@agentic-flow/core/src/|g" "$file"
    sed -i.bak "s|from '../../src/|from '@agentic-flow/core/src/|g" "$file"
    rm -f "$file.bak"
done

echo "Migration complete. Log: $MIGRATION_LOG"
```

### Phase 4: Update Build Configuration (Day 3)

```javascript
// tsconfig.json - Update paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@agentic-flow/core/*": ["projects/core/*"],
      "@agentic-flow/federation/*": ["projects/federation/*"],
      "@agentic-flow/goalie/*": ["projects/goalie/*"],
      "@agentic-flow/affiliate/*": ["projects/affiliate/*"],
      "@agentic-flow/medical/*": ["projects/medical/*"],
      "@config/*": ["config/*"],
      "@testing/*": ["testing/*"],
      "@tooling/*": ["tooling/*"]
    }
  }
}
```

```json
// package.json - Update scripts
{
  "scripts": {
    "build": "tsc --project projects/core/tsconfig.json",
    "test": "jest --config testing/jest.config.js",
    "test:unit": "jest --config testing/unit/jest.config.js",
    "test:integration": "jest --config testing/integration/jest.config.js",
    "test:e2e": "jest --config testing/e2e/jest.config.js",
    "lint": "eslint projects/**/*.ts",
    "format": "prettier --write projects/**/*.ts"
  }
}
```

### Phase 5: Implement Guardrails (Day 4)

```bash
# .githooks/pre-commit - Prevent root file creation
#!/bin/bash

# Check for new files in root
NEW_ROOT_FILES=$(git diff --cached --name-only --diff-filter=A | grep -v '^projects/' | grep -v '^config/' | grep -v '^docs/' | grep -v '^observability/' | grep -v '^testing/' | grep -v '^tooling/' | grep -v '^experimental/' | grep -v '^media/' | grep -v '^archive/' | grep -v '^retiring/' | grep -v '^\.git' | grep -v '^package\.json' | grep -v '^README\.md')

if [[ -n "$NEW_ROOT_FILES" ]]; then
    echo "❌ ERROR: New files detected in root directory!"
    echo "Files must be created in appropriate subdirectories:"
    echo "$NEW_ROOT_FILES"
    echo ""
    echo "Allowed locations:"
    echo "  - projects/     : Core application code"
    echo "  - config/       : Configuration files"
    echo "  - docs/         : Documentation"
    echo "  - observability/: Metrics, dashboards"
    echo "  - testing/      : All tests"
    echo "  - tooling/      : Scripts, CLIs"
    echo "  - experimental/ : Prototypes, research"
    exit 1
fi

echo "✓ File structure check passed"
```

## Technical Debt Reduction Strategy

### Debt Categories

| Category | Current State | Target State | Reduction |
|----------|--------------|--------------|-----------|
| **Code Duplication** | 18% duplicated code | <5% | -72% |
| **Circular Dependencies** | 23 cycles detected | 0 cycles | -100% |
| **Test Coverage** | 65% | 80% | +23% |
| **TypeScript Strictness** | Loose (any types) | Strict | +100% |
| **Documentation Coverage** | 42% functions documented | 90% | +114% |
| **Build Time** | 45s | <20s | -56% |

### Debt Reduction Actions

1. **Eliminate Code Duplication**
   ```bash
   # Run jscpd to find duplicates
   npx jscpd projects/ --threshold 5 --reporters json > debt-analysis/duplication.json
   
   # Extract common patterns to shared libraries
   tooling/scripts/extract-common-patterns.sh
   ```

2. **Break Circular Dependencies**
   ```bash
   # Use madge to find cycles
   npx madge --circular --extensions ts projects/core/src
   
   # Apply dependency inversion
   tooling/scripts/fix-circular-deps.sh
   ```

3. **Improve Test Coverage**
   ```bash
   # Generate coverage report
   npm run test:coverage
   
   # Identify untested files
   tooling/scripts/find-untested-files.sh > debt-analysis/untested.txt
   ```

4. **Enable TypeScript Strict Mode**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true,
       "strictFunctionTypes": true,
       "strictBindCallApply": true,
       "strictPropertyInitialization": true,
       "noImplicitThis": true,
       "alwaysStrict": true
     }
   }
   ```

5. **Document All Public APIs**
   ```bash
   # Generate documentation coverage report
   npx typedoc --treatWarningsAsErrors
   
   # Add missing JSDoc comments
   tooling/scripts/add-missing-docs.sh
   ```

## Hierarchical Mesh Sparse Attention Integration

### Concept
Implement attention mechanisms that:
1. **Hierarchical**: Top-level concerns (architecture) don't need to know low-level details
2. **Mesh**: Related components can communicate directly
3. **Sparse**: Only relevant connections are maintained (not fully connected graph)

### Implementation

```typescript
// projects/core/src/attention/HierarchicalMesh.ts
export class HierarchicalMeshAttention {
  private layers: Map<string, Layer> = new Map();
  private connections: Map<string, Set<string>> = new Map();
  
  /**
   * Register a layer in the hierarchy
   * @param layer - Layer configuration
   */
  registerLayer(layer: Layer): void {
    this.layers.set(layer.id, layer);
    this.connections.set(layer.id, new Set());
  }
  
  /**
   * Create sparse attention connection
   * @param from - Source layer ID
   * @param to - Target layer ID
   * @param weight - Attention weight (0-1)
   */
  connect(from: string, to: string, weight: number = 1.0): void {
    if (this.layers.has(from) && this.layers.has(to)) {
      this.connections.get(from)?.add(to);
      
      // Budget guardrail: Limit connections per layer
      const maxConnections = this.layers.get(from)?.maxConnections || 5;
      if ((this.connections.get(from)?.size || 0) > maxConnections) {
        throw new Error(`Layer ${from} exceeds connection budget (max: ${maxConnections})`);
      }
    }
  }
  
  /**
   * Query relevant layers for a given concern
   * @param concern - Concern to query (e.g., "test-coverage")
   * @returns Array of relevant layer IDs
   */
  query(concern: string): string[] {
    const relevant: string[] = [];
    
    for (const [layerId, layer] of this.layers) {
      if (layer.concerns.includes(concern)) {
        relevant.push(layerId);
        
        // Traverse connections (sparse attention)
        const connected = this.connections.get(layerId) || new Set();
        for (const connectedId of connected) {
          if (!relevant.includes(connectedId)) {
            relevant.push(connectedId);
          }
        }
      }
    }
    
    return relevant;
  }
}

interface Layer {
  id: string;
  level: number; // 0 = architecture, 1 = system, 2 = module, 3 = unit
  concerns: string[];
  maxConnections: number;
}
```

### Lean Budget Guardrails

```typescript
// config/guardrails.ts
export const LEAN_BUDGET_GUARDRAILS = {
  maxFilesPerDirectory: 50,
  maxDirectoryDepth: 6,
  maxImportDepth: 4,
  maxCyclomaticComplexity: 10,
  maxFunctionLength: 50,
  maxFileSize: 500, // lines
  maxTestDuration: 5000, // ms
  maxBuildTime: 30000, // ms
  maxDependencies: 20,
  maxDevDependencies: 50
};

export function enforceGuardrails(project: string): GuardrailReport {
  const violations: Violation[] = [];
  
  // Check directory size
  const directorySizes = analyzeDirectories(project);
  for (const [dir, size] of directorySizes) {
    if (size > LEAN_BUDGET_GUARDRAILS.maxFilesPerDirectory) {
      violations.push({
        type: 'directory-too-large',
        location: dir,
        current: size,
        limit: LEAN_BUDGET_GUARDRAILS.maxFilesPerDirectory,
        suggestion: `Split ${dir} into smaller modules`
      });
    }
  }
  
  // Check cyclomatic complexity
  const complexityReport = analyzeComplexity(project);
  for (const file of complexityReport.violations) {
    violations.push({
      type: 'complexity-too-high',
      location: file.path,
      current: file.complexity,
      limit: LEAN_BUDGET_GUARDRAILS.maxCyclomaticComplexity,
      suggestion: `Refactor ${file.function} to reduce complexity`
    });
  }
  
  return {
    passed: violations.length === 0,
    violations,
    score: calculateGuardrailScore(violations)
  };
}
```

## Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Files in root | 108 | 10 | Week 1 |
| Build time | 45s | <20s | Week 2 |
| Test coverage | 65% | 80% | Week 3 |
| TypeScript errors | 41 | 0 | Week 1 |
| Documentation coverage | 42% | 90% | Week 4 |
| Technical debt score | 58/100 | 85/100 | Week 4 |
| Deployment success rate | 0% | 95% | Week 2 |

## Rollback Plan

If migration causes issues:

```bash
# Restore from backup
cd /Users/shahroozbhopti/Documents/code/investing
tar -xzf agentic-flow-backup-YYYYMMDD.tar.gz
cd agentic-flow

# Revert Git changes
git log --oneline | grep "Migrate" | head -1 | cut -d' ' -f1 | xargs git revert

# Restore original structure
git checkout HEAD~1 -- .
```

## Next Steps

1. **Day 1**: Create directory structure, set up guardrails
2. **Day 2-3**: Run incremental migration script, update imports
3. **Day 4**: Update build configs, enable guardrails
4. **Day 5**: Run full test suite, fix issues
5. **Day 6-7**: Deploy to dev/staging, validate
6. **Week 2**: Deploy to production, monitor metrics

---

**Document Owner**: Architecture Team  
**Last Review**: 2026-01-16  
**Next Review**: 2026-01-23
