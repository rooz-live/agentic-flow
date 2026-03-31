# DDD Architecture Compliance Integration Guide

## Overview

This document describes how to integrate DDD architecture validation into your development workflow and CI/CD pipeline.

## Local Development

### 1. Pre-Commit Hooks

Install pre-commit hooks to catch violations before committing:

```bash
# Install pre-commit (if not already installed)
pip install pre-commit

# Install DDD hooks
pre-commit install

# Run manually on all files
pre-commit run --all-files
```

The hooks will:
- ✅ Run ESLint DDD rules on TypeScript files
- ✅ Execute architecture boundary tests
- ✅ Check repository interface locations
- ✅ Warn about potential anemic domain models

### 2. NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "lint:ddd": "eslint --ext .ts --plugin @agentic-flow/ddd --rule '@agentic-flow/ddd/no-domain-infrastructure-imports: error' --rule '@agentic-flow/ddd/no-application-domain-mutation: error' --rule '@agentic-flow/ddd/repository-interfaces-in-domain: warn' src/",
    "test:architecture": "jest tests/architecture/ddd-boundaries.test.ts",
    "test:ddd-plugin": "cd tools/eslint-plugin-ddd && npm test",
    "validate:ddd": "npm run lint:ddd && npm run test:architecture",
    "prebuild": "npm run validate:ddd"
  }
}
```

Run locally:

```bash
# Check DDD compliance
npm run validate:ddd

# Individual checks
npm run lint:ddd
npm run test:architecture
npm run test:ddd-plugin
```

### 3. IDE Integration

#### VS Code

Install ESLint extension and configure `.vscode/settings.json`:

```json
{
  "eslint.enable": true,
  "eslint.validate": [
    "typescript"
  ],
  "eslint.options": {
    "plugins": ["@agentic-flow/ddd"],
    "rules": {
      "@agentic-flow/ddd/no-domain-infrastructure-imports": "error",
      "@agentic-flow/ddd/no-application-domain-mutation": "error",
      "@agentic-flow/ddd/repository-interfaces-in-domain": "warn"
    }
  }
}
```

#### IntelliJ IDEA / WebStorm

1. Go to Preferences → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
2. Enable ESLint
3. Set Configuration file to `.eslintrc.js`
4. Restart IDE

## CI/CD Pipeline

### GitHub Actions

The `.github/workflows/ddd-compliance.yml` workflow runs automatically on:
- Push to `main`, `develop`, `feature/**` branches
- Pull requests to `main`, `develop`

Jobs:
1. **eslint-ddd-rules**: Runs ESLint with DDD rules
2. **architecture-tests**: Executes boundary validation tests
3. **eslint-plugin-tests**: Tests the ESLint plugin itself
4. **compliance-summary**: Generates summary report

### Pull Request Comments

The workflow automatically comments on PRs with:
- Compliance status
- Violation count
- Compliance rate percentage

### Required Checks

Configure branch protection rules in GitHub:
1. Go to Settings → Branches → Branch protection rules
2. Add rule for `main` branch:
   - Require status checks to pass before merging
   - Required checks:
     - `eslint-ddd-rules`
     - `architecture-tests`
     - `eslint-plugin-tests`
   - Require branches to be up to date

## Violation Fixes

### Common Violations and Fixes

#### 1. Domain importing from Infrastructure

**Violation**:
```typescript
// src/domain/entities/user.ts
import { UserRepository } from '../../infrastructure/repositories/user-repository';
```

**Fix**: Move interface to domain, implementation to infrastructure
```typescript
// src/domain/repositories/user-repository.interface.ts
export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
}

// src/infrastructure/repositories/postgres-user-repository.ts
import { UserRepository } from '../../domain/repositories/user-repository.interface';
export class PostgresUserRepository implements UserRepository {
  // ...
}
```

#### 2. Application directly mutating domain entities

**Violation**:
```typescript
// src/application/use-cases/update-user.ts
const user = await userRepo.findById(userId);
user.email = 'new@email.com'; // Direct mutation
```

**Fix**: Use domain methods
```typescript
// src/domain/entities/user.ts
class User {
  updateEmail(email: Email): void {
    // Validate
    this.email = email;
  }
}

// src/application/use-cases/update-user.ts
const user = await userRepo.findById(userId);
user.updateEmail(new Email('new@email.com')); // Domain method
```

#### 3. Repository interface outside domain

**Violation**:
```typescript
// src/infrastructure/repositories/user-repository.ts
export interface UserRepository { /* ... */ }
```

**Fix**: Move to domain layer
```typescript
// src/domain/repositories/user-repository.interface.ts
export interface UserRepository { /* ... */ }
```

### Suppressing False Positives

If ESLint flags a false positive, you can suppress with a comment:

```typescript
// eslint-disable-next-line @agentic-flow/ddd/no-domain-infrastructure-imports
import { Logger } from '../../infrastructure/logging/logger';
```

**Warning**: Use sparingly. Most violations are real.

## Compliance Reporting

### Generate Compliance Report

Run architecture tests to see compliance report:

```bash
npm run test:architecture
```

Output:
```
📊 Clean Architecture Compliance Report:
=====================================
Total Files: 342
  - Domain:         45
  - Application:    87
  - Infrastructure: 123
  - Presentation:   67
  - Unknown:        20

Total Violations: 12

Violations by Layer:
  - domain: 3 file(s)
  - application: 9 file(s)

Compliance Rate: 96.5%
=====================================
```

### Metrics Tracking

Track compliance over time:

```bash
# Save report to file
npm run test:architecture > compliance-report.txt

# Extract compliance rate
grep "Compliance Rate" compliance-report.txt
```

Add to your dashboard/metrics system.

## Continuous Improvement

### Weekly Review

1. Run compliance report weekly
2. Review violations
3. Prioritize fixes based on:
   - Severity (domain violations > application violations)
   - Frequency (most common violations first)
   - Risk (violations in critical paths first)

### Refactoring Strategy

1. **New Code First**: Enforce 100% compliance for all new code
2. **High-Impact Files**: Fix violations in frequently modified files
3. **God Objects**: Refactor large files (`core/orchestrator.ts`) into bounded contexts
4. **Gradual Migration**: Fix 5-10 violations per sprint

### Team Training

1. Review ADRs with team:
   - ADR-001: DDD Layer Responsibilities
   - ADR-002: Bounded Context Boundaries
   - ADR-003: Aggregate Design Decisions

2. Pair programming on DDD patterns
3. Code review focus on architecture compliance

## Troubleshooting

### ESLint Plugin Not Found

```bash
cd tools/eslint-plugin-ddd
npm install
npm link
cd ../..
npm link @agentic-flow/eslint-plugin-ddd
```

### Architecture Tests Failing

Check if `src/` directory exists:
```bash
ls -la src/
```

If missing, tests will pass (no files to check).

### Pre-Commit Hooks Not Running

Reinstall hooks:
```bash
pre-commit uninstall
pre-commit install
```

## Additional Resources

- [ADR-001: DDD Layer Responsibilities](../docs/architecture/decisions/ADR-001-ddd-layer-responsibilities.md)
- [ADR-002: Bounded Context Boundaries](../docs/architecture/decisions/ADR-002-bounded-context-boundaries.md)
- [ADR-003: Aggregate Design Decisions](../docs/architecture/decisions/ADR-003-aggregate-design.md)
- [ESLint Plugin README](../tools/eslint-plugin-ddd/README.md)

## Support

For questions or issues:
1. Check this guide
2. Review ADRs
3. Run `npm run validate:ddd` to see specific violations
4. Ask team for help in #architecture channel
