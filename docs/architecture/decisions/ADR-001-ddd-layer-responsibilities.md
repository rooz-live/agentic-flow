# ADR-001: DDD Layer Responsibilities and Boundaries

**Status**: Accepted  
**Date**: 2026-02-01  
**Deciders**: Development Team  
**Tags**: architecture, ddd, clean-architecture, boundaries

## Context and Problem Statement

The agentic-flow codebase has grown organically, resulting in:
- God objects (e.g., `core/orchestrator.ts` at 1,440 LOC)
- Unclear separation of concerns between business logic and infrastructure
- Domain logic leaking into presentation/infrastructure layers
- Tight coupling between layers making testing and maintenance difficult
- Difficulty understanding where new code should live

We need to establish clear architectural boundaries that enforce:
1. Separation of business logic from technical concerns
2. Testability of domain logic in isolation
3. Ability to swap infrastructure implementations
4. Clear ownership and single responsibility for each layer

## Decision Drivers

- **Maintainability**: Code should be easy to understand and modify
- **Testability**: Domain logic must be testable without external dependencies
- **Flexibility**: Should support future infrastructure changes (databases, APIs, etc.)
- **Scalability**: Architecture should handle growing complexity
- **Developer Experience**: Clear guidelines on where code belongs
- **WSJF Priority**: High business value (8/10), high risk reduction (7/10)

## Considered Options

### Option 1: Layered Architecture (N-Tier)
Traditional separation into UI, Business Logic, Data Access layers.

**Pros**:
- Simple to understand
- Well-documented pattern
- Clear separation of concerns

**Cons**:
- Business logic still depends on infrastructure (database models)
- Hard to test in isolation
- Coupling flows downward (UI → BL → DAL)

### Option 2: Hexagonal Architecture (Ports and Adapters)
Business logic at center, infrastructure as pluggable adapters.

**Pros**:
- Business logic is independent
- Infrastructure is swappable
- Great testability

**Cons**:
- More complex initially
- Requires discipline to maintain boundaries
- More interfaces/abstractions

### Option 3: Clean Architecture (Uncle Bob)
Strict dependency inversion: outer layers depend on inner, never reverse.

**Pros**:
- Enforces dependency rules
- Domain is completely pure
- Frameworks are details
- Excellent testability

**Cons**:
- Steeper learning curve
- More boilerplate
- Requires tooling to enforce

### Option 4: Domain-Driven Design Layers
Four-layer architecture: Presentation, Application, Domain, Infrastructure.

**Pros**:
- Clear tactical patterns (Entities, Value Objects, Repositories)
- Ubiquitous language emphasis
- Bounded contexts for large systems
- Combines well with Clean Architecture

**Cons**:
- Complex for small projects
- Requires domain modeling expertise
- Can be over-engineered

## Decision Outcome

**Chosen option**: **Hybrid DDD + Clean Architecture** (Option 4 enhanced with Option 3)

We adopt a four-layer DDD architecture with Clean Architecture dependency rules:

```
┌─────────────────────────────────────────────┐
│        Presentation Layer                   │
│  (Controllers, API Routes, CLI, TUI)        │
│  Depends on: Application, Domain            │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│        Application Layer                    │
│  (Use Cases, Application Services, DTOs)    │
│  Depends on: Domain only                    │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│        Domain Layer (CORE)                  │
│  (Entities, Value Objects, Domain Services, │
│   Repository Interfaces, Domain Events)     │
│  Depends on: Nothing (pure business logic)  │
└─────────────────────────────────────────────┘
               ↑
               │
┌──────────────┴──────────────────────────────┐
│        Infrastructure Layer                 │
│  (Repository Impls, Database, External APIs,│
│   File System, Email, Message Queue)        │
│  Depends on: Domain, Application            │
└─────────────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. Domain Layer (Core Business Logic)

**Purpose**: Pure business logic, independent of any technical concerns.

**Contains**:
- **Entities**: Objects with identity and lifecycle (e.g., `Task`, `Agent`, `Session`)
- **Value Objects**: Immutable descriptors (e.g., `AgentId`, `TaskStatus`, `Email`)
- **Aggregates**: Clusters of entities/VOs with consistency boundaries
- **Domain Services**: Operations that don't belong to a single entity
- **Repository Interfaces**: Contracts for data access (NOT implementations)
- **Domain Events**: Things that happened in the domain (e.g., `TaskCompleted`)
- **Specifications**: Business rules for object selection

**Rules**:
- ✅ Can depend on: Domain layer only (self-contained)
- ❌ Cannot depend on: Application, Infrastructure, Presentation
- ✅ Can import: Standard libraries (e.g., `uuid`, date libraries)
- ❌ Cannot import: Database libraries, HTTP libraries, file system APIs
- ✅ Should be: Framework-agnostic, testable without mocks

**Example**:
```typescript
// ✅ GOOD: Domain entity with behavior
export class Task {
  private constructor(
    private readonly id: TaskId,
    private status: TaskStatus,
    private assignedAgent?: AgentId
  ) {}

  assign(agentId: AgentId): void {
    if (this.status === TaskStatus.Completed) {
      throw new Error('Cannot assign completed task');
    }
    this.assignedAgent = agentId;
  }

  complete(): void {
    if (!this.assignedAgent) {
      throw new Error('Cannot complete unassigned task');
    }
    this.status = TaskStatus.Completed;
  }
}

// ✅ GOOD: Repository interface in domain
export interface TaskRepository {
  findById(id: TaskId): Promise<Task | null>;
  save(task: Task): Promise<void>;
}
```

#### 2. Application Layer (Use Cases & Orchestration)

**Purpose**: Orchestrate domain objects to fulfill use cases. Coordinate flow.

**Contains**:
- **Use Cases / Commands**: Application-specific operations (e.g., `CreateTaskUseCase`)
- **Application Services**: Coordinate multiple use cases
- **DTOs**: Data Transfer Objects for use case inputs/outputs
- **Query Objects**: Read-only projections for queries (CQRS)
- **Event Handlers**: React to domain events
- **Mappers**: Convert between domain objects and DTOs

**Rules**:
- ✅ Can depend on: Domain layer
- ❌ Cannot depend on: Infrastructure, Presentation
- ✅ Can call: Repository interfaces (via dependency injection)
- ❌ Cannot call: Repository implementations directly
- ✅ Should be: Thin orchestration logic, no business rules

**Example**:
```typescript
// ✅ GOOD: Use case orchestrates domain logic
export class AssignTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository, // Interface, not implementation
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(input: AssignTaskInput): Promise<void> {
    const task = await this.taskRepository.findById(input.taskId);
    if (!task) {
      throw new TaskNotFoundError(input.taskId);
    }

    const agent = await this.agentRepository.findById(input.agentId);
    if (!agent) {
      throw new AgentNotFoundError(input.agentId);
    }

    task.assign(agent.id); // Domain method does validation
    await this.taskRepository.save(task);
  }
}

// ❌ BAD: Direct entity mutation
user.email = 'new@email.com'; // Should be: user.updateEmail('new@email.com')
```

#### 3. Infrastructure Layer (Technical Details)

**Purpose**: Implement technical capabilities: persistence, external APIs, messaging, etc.

**Contains**:
- **Repository Implementations**: Database-specific implementations
- **Database Schemas**: ORM models, SQL scripts
- **External API Clients**: HTTP clients for 3rd-party services
- **File System Access**: File reading/writing
- **Message Queue Adapters**: Kafka, RabbitMQ, etc.
- **Email/SMS Services**: Notification implementations
- **Caching**: Redis, Memcached implementations

**Rules**:
- ✅ Can depend on: Domain, Application
- ❌ Cannot depend on: Presentation
- ✅ Implements: Repository interfaces from domain
- ✅ Can use: ORMs, database libraries, HTTP clients
- ✅ Should be: Swappable (Postgres ↔ MongoDB without changing domain)

**Example**:
```typescript
// ✅ GOOD: Infrastructure implements domain interface
export class PostgresTaskRepository implements TaskRepository {
  constructor(private readonly db: Database) {}

  async findById(id: TaskId): Promise<Task | null> {
    const row = await this.db.query(
      'SELECT * FROM tasks WHERE id = $1',
      [id.value]
    );
    return row ? this.toDomain(row) : null;
  }

  async save(task: Task): Promise<void> {
    await this.db.query(
      'INSERT INTO tasks (id, status, assigned_agent) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE ...',
      [task.id.value, task.status.value, task.assignedAgent?.value]
    );
  }

  private toDomain(row: any): Task {
    // Map database row to domain entity
  }
}
```

#### 4. Presentation Layer (User Interface)

**Purpose**: Handle user interaction, input validation, output formatting.

**Contains**:
- **API Controllers**: REST/GraphQL endpoints
- **CLI Commands**: Command-line interfaces
- **TUI Components**: Terminal UI widgets
- **View Models**: UI-specific data structures
- **Input Validators**: Schema validation (Zod, Joi)
- **Output Formatters**: JSON, XML, CSV serializers

**Rules**:
- ✅ Can depend on: Application, Domain (for types)
- ❌ Cannot depend on: Infrastructure (no direct DB access)
- ✅ Should be: Thin layer, delegate to application layer
- ✅ Can use: Web frameworks (Express, Fastify), UI libraries

**Example**:
```typescript
// ✅ GOOD: Controller delegates to use case
@Controller('/tasks')
export class TaskController {
  constructor(private readonly assignTaskUseCase: AssignTaskUseCase) {}

  @Post('/:id/assign')
  async assignTask(@Param('id') id: string, @Body() body: AssignTaskDto) {
    try {
      await this.assignTaskUseCase.execute({
        taskId: new TaskId(id),
        agentId: new AgentId(body.agentId),
      });
      return { success: true };
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
```

### Dependency Rules

**The Dependency Rule**: Source code dependencies must point inward.

- **Domain** depends on **nothing** (zero external dependencies)
- **Application** depends on **Domain**
- **Infrastructure** depends on **Domain + Application**
- **Presentation** depends on **Application + Domain** (for types)

**Violations are forbidden**:
- ❌ Domain → Application
- ❌ Domain → Infrastructure
- ❌ Domain → Presentation
- ❌ Application → Infrastructure
- ❌ Application → Presentation
- ❌ Presentation → Infrastructure (direct)

### Enforcement Mechanisms

1. **ESLint Plugin** (`@agentic-flow/eslint-plugin-ddd`):
   - `no-domain-infrastructure-imports`: Prevents domain → infra/app
   - `no-application-domain-mutation`: Enforces domain methods
   - `repository-interfaces-in-domain`: Enforces DIP

2. **Architecture Tests** (Jest):
   - Validate layer boundaries programmatically
   - Fail build if violations detected

3. **CI/CD Pipeline**:
   - Pre-commit hooks run ESLint rules
   - CI pipeline runs architecture tests
   - Compliance reporting in PRs

### Migration Strategy

**Phase 1**: Document current state (complete)
- Map existing code to DDD layers
- Identify god objects and violations
- Create architecture decision records

**Phase 2**: Enforce new code (in progress)
- ESLint plugin active for new code
- Architecture tests in CI/CD
- Team training on DDD principles

**Phase 3**: Gradual refactoring (future)
- Refactor `core/orchestrator.ts` into bounded contexts
- Extract domain logic from infrastructure
- Introduce repository interfaces

**Phase 4**: Full compliance (future)
- All code complies with DDD boundaries
- 100% architecture test coverage
- Automated compliance reports

## Consequences

### Positive

- ✅ **Clear boundaries**: Developers know where code belongs
- ✅ **Testability**: Domain logic testable without external dependencies
- ✅ **Flexibility**: Can swap databases/frameworks without changing domain
- ✅ **Maintainability**: Changes localized to single layer
- ✅ **Scalability**: Can split into microservices along bounded contexts
- ✅ **Automated enforcement**: ESLint + architecture tests prevent violations

### Negative

- ⚠️ **Learning curve**: Team needs DDD training
- ⚠️ **More boilerplate**: Interfaces, DTOs, mappers add code
- ⚠️ **Initial slowdown**: Refactoring takes time
- ⚠️ **Over-engineering risk**: Simple features may feel complex

### Neutral

- ℹ️ **More files**: Code distributed across layers
- ℹ️ **More abstractions**: Interfaces everywhere
- ℹ️ **Dependency injection**: Required for testability

## Compliance

All new code MUST adhere to these layer responsibilities. Violations will:
1. Fail ESLint checks (pre-commit)
2. Fail architecture tests (CI pipeline)
3. Block PR merge

Existing code will be refactored gradually. No breaking changes to existing functionality.

## References

- [Domain-Driven Design (Eric Evans)](https://www.domainlanguage.com/ddd/)
- [Clean Architecture (Robert Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/)
- [DDD Layered Architecture](https://www.baeldung.com/java-layered-architecture)
- [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)

## Related ADRs

- ADR-002: Bounded Context Boundaries (planned)
- ADR-003: Aggregate Design Decisions (planned)
- ADR-004: Repository Pattern Implementation (planned)
- ADR-005: Domain Event Handling (planned)
