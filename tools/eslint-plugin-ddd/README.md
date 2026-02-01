# @agentic-flow/eslint-plugin-ddd

ESLint plugin to enforce Domain-Driven Design (DDD) and Clean Architecture boundaries in TypeScript projects.

## Features

- 🏗️ **Layer Boundary Enforcement**: Prevent invalid dependencies between DDD layers
- 🔒 **Domain Purity**: Keep domain layer free from infrastructure concerns
- 🎯 **Dependency Inversion**: Enforce interfaces in domain, implementations in infrastructure
- 🛡️ **Encapsulation**: Prevent direct entity mutation from application layer

## Installation

```bash
npm install --save-dev @agentic-flow/eslint-plugin-ddd
```

## Usage

Add to your `.eslintrc.js`:

```javascript
module.exports = {
  plugins: ['@agentic-flow/ddd'],
  extends: ['plugin:@agentic-flow/ddd/recommended'],
};
```

Or configure manually:

```javascript
module.exports = {
  plugins: ['@agentic-flow/ddd'],
  rules: {
    '@agentic-flow/ddd/no-domain-infrastructure-imports': 'error',
    '@agentic-flow/ddd/no-application-domain-mutation': 'error',
    '@agentic-flow/ddd/repository-interfaces-in-domain': 'warn',
  },
};
```

## Rules

### `no-domain-infrastructure-imports`

Prevents domain layer from importing infrastructure or application concerns.

**Clean Architecture**: Domain must only depend on other domain code.

❌ **Invalid**:
```typescript
// File: src/domain/entities/user.ts
import { UserRepository } from '../../infrastructure/repositories/user-repository';
import { UserService } from '../application/services/user-service';
```

✅ **Valid**:
```typescript
// File: src/domain/entities/user.ts
import { ValueObject } from './value-objects/email';
import { Entity } from '../shared/entity';
```

### `no-application-domain-mutation`

Prevents application layer from directly mutating domain entities.

**Principle**: Use domain methods (behavior) instead of direct property assignment.

❌ **Invalid**:
```typescript
// File: src/application/use-cases/update-user.ts
const user = await userRepository.findById(userId);
user.email = 'new@email.com';  // Direct mutation
user.status = 'active';         // Direct mutation
```

✅ **Valid**:
```typescript
// File: src/application/use-cases/update-user.ts
const user = await userRepository.findById(userId);
user.updateEmail('new@email.com');  // Domain method
user.activate();                     // Domain method
```

### `repository-interfaces-in-domain`

Ensures repository interfaces are defined in domain layer, per Dependency Inversion Principle.

**Principle**: High-level domain defines interfaces; low-level infrastructure implements them.

❌ **Invalid**:
```typescript
// File: src/infrastructure/repositories/user-repository.ts
export interface UserRepository {  // Interface in infrastructure
  findById(id: string): Promise<User | null>;
}
```

✅ **Valid**:
```typescript
// File: src/domain/repositories/user-repository.ts
export interface UserRepository {  // Interface in domain
  findById(id: string): Promise<User | null>;
}

// File: src/infrastructure/repositories/postgres-user-repository.ts
export class PostgresUserRepository implements UserRepository {
  // Implementation in infrastructure
}
```

## Layer Detection

The plugin detects DDD layers based on directory structure:

| Layer | Detected Paths |
|-------|----------------|
| **Domain** | `/domain/`, `/entities/`, `/value-objects/`, `/aggregates/` |
| **Application** | `/application/`, `/use-cases/`, `/services/`, `/commands/`, `/queries/` |
| **Infrastructure** | `/infrastructure/`, `/adapters/`, `/repositories/`, `/persistence/` |
| **Presentation** | `/presentation/`, `/controllers/`, `/api/`, `/ui/`, `/views/` |

## Dependency Rules

**Clean Architecture dependency flow** (outward → inward):

```
Presentation → Application → Domain ← Infrastructure
```

Allowed dependencies:

- ✅ **Domain** → Domain only
- ✅ **Application** → Domain
- ✅ **Infrastructure** → Domain, Application
- ✅ **Presentation** → Application, Domain
- ❌ **Domain** → anything except Domain
- ❌ **Presentation** → Infrastructure (direct)

## Configuration Presets

### `recommended` (default)

```javascript
{
  rules: {
    '@agentic-flow/ddd/no-domain-infrastructure-imports': 'error',
    '@agentic-flow/ddd/no-application-domain-mutation': 'error',
    '@agentic-flow/ddd/repository-interfaces-in-domain': 'warn',
  }
}
```

### `strict`

```javascript
{
  extends: ['plugin:@agentic-flow/ddd/strict'],
}
```

All rules set to `error`.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint
```

## Testing

Uses `@typescript-eslint/rule-tester` for comprehensive rule testing:

```bash
npm test
```

Coverage threshold: 80% (branches, functions, lines, statements)

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new rules
4. Ensure 80%+ test coverage
5. Submit a pull request

## Resources

- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)
