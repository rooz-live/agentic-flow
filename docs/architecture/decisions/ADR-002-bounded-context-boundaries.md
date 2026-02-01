# ADR-002: Bounded Context Boundaries

**Status**: Accepted  
**Date**: 2026-02-01  
**Deciders**: Development Team  
**Tags**: architecture, ddd, bounded-contexts, microkernel

## Context and Problem Statement

The agentic-flow system handles multiple distinct concerns:
- Task management and orchestration
- Session state management
- Agent lifecycle and coordination
- Health monitoring and metrics
- Event-driven communication
- Plugin system for extensions

Currently, these concerns are entangled in god objects (e.g., `core/orchestrator.ts` at 1,440 LOC), making the system:
- Hard to understand and modify
- Difficult to test in isolation
- Resistant to parallel development
- Prone to unintended side effects

We need to define **bounded contexts** - cohesive subdomains with clear boundaries and well-defined integration points.

## Decision Drivers

- **Complexity Management**: Break down 1,440-line god object into manageable pieces
- **Parallel Development**: Allow teams to work on different contexts independently
- **Testability**: Enable testing contexts in isolation
- **Scalability**: Support future microservices decomposition
- **Clear Ownership**: Assign responsibility for each context
- **Integration Points**: Define how contexts communicate

## Considered Options

### Option 1: Single Bounded Context (Status Quo)
Keep everything in one large context.

**Pros**:
- No refactoring needed
- No integration complexity

**Cons**:
- Already unmanageable at 1,440 LOC
- Cannot scale further
- Testing is difficult

### Option 2: Function-Based Contexts
Split by technical function: persistence, communication, computation.

**Pros**:
- Technical teams aligned with contexts

**Cons**:
- Doesn't match business capabilities
- Cross-cutting changes affect all contexts

### Option 3: Domain-Based Bounded Contexts
Split by business capability: task management, session management, agent coordination, etc.

**Pros**:
- Aligns with business capabilities
- Changes localized to single context
- Clear ownership

**Cons**:
- Requires domain modeling
- Some shared concepts need translation

### Option 4: Microkernel + Plugin Architecture
Core kernel with minimal responsibilities, plugins extend functionality.

**Pros**:
- Maximum flexibility
- Easy to add new capabilities
- Clear extension points

**Cons**:
- More complex initially
- Plugin contract design is critical

## Decision Outcome

**Chosen option**: **Hybrid Option 3 + 4** (Domain Bounded Contexts + Microkernel)

We adopt a **microkernel architecture** with **5 bounded contexts** as plugins:

```
┌─────────────────────────────────────────────────────┐
│              Microkernel (Core)                     │
│   - Lifecycle management (start/stop)              │
│   - Plugin registry and discovery                  │
│   - Event bus (inter-context communication)        │
│   - Dependency injection container                 │
└─────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ↓                ↓                ↓
┌───────────────┐ ┌─────────────┐ ┌──────────────────┐
│Task Management│ │   Session   │ │Agent Coordination│
│   Context     │ │  Management │ │    Context       │
│               │ │   Context   │ │                  │
└───────────────┘ └─────────────┘ └──────────────────┘
        │                │                │
        ↓                ↓                ↓
┌───────────────┐ ┌─────────────┐
│    Health     │ │    Event    │
│  Monitoring   │ │ Coordination│
│   Context     │ │   Context   │
└───────────────┘ └─────────────┘
```

### Bounded Context Definitions

#### 1. Task Management Context

**Ubiquitous Language**:
- Task, Workflow, Step, Dependency, Priority, Status
- Schedule, Execute, Complete, Fail, Retry

**Responsibilities**:
- Create and assign tasks
- Track task lifecycle (pending → running → completed/failed)
- Manage task dependencies and scheduling
- Execute task logic with retry policies
- Provide task query capabilities

**Domain Models**:
- `Task` (aggregate root): Identity, status, assigned agent, metadata
- `TaskId` (value object): Unique identifier
- `TaskStatus` (value object): Pending, Running, Completed, Failed
- `TaskDependency` (value object): Dependency graph edges
- `TaskRepository` (interface): Persistence contract

**External Dependencies**:
- Session Management: Get current session context
- Agent Coordination: Assign tasks to agents
- Event Coordination: Publish `TaskCreated`, `TaskCompleted` events

**API**:
```typescript
interface TaskManagementContext {
  createTask(input: CreateTaskInput): Promise<TaskId>;
  assignTask(taskId: TaskId, agentId: AgentId): Promise<void>;
  executeTask(taskId: TaskId): Promise<void>;
  queryTasks(filter: TaskFilter): Promise<Task[]>;
}
```

#### 2. Session Management Context

**Ubiquitous Language**:
- Session, SessionState, Context, Snapshot, Restore
- Start, Pause, Resume, End, Persist

**Responsibilities**:
- Create and manage session lifecycle
- Persist and restore session state
- Provide session context to other contexts
- Handle session timeouts and cleanup

**Domain Models**:
- `Session` (aggregate root): Identity, state, metadata, timestamps
- `SessionId` (value object): Unique identifier
- `SessionState` (value object): Active, Paused, Ended
- `SessionSnapshot` (entity): Point-in-time state capture
- `SessionRepository` (interface): Persistence contract

**External Dependencies**:
- Event Coordination: Publish `SessionStarted`, `SessionEnded` events
- Health Monitoring: Report session health metrics

**API**:
```typescript
interface SessionManagementContext {
  startSession(config: SessionConfig): Promise<SessionId>;
  pauseSession(sessionId: SessionId): Promise<void>;
  resumeSession(sessionId: SessionId): Promise<void>;
  endSession(sessionId: SessionId): Promise<void>;
  getCurrentSession(): Promise<Session | null>;
}
```

#### 3. Agent Coordination Context

**Ubiquitous Language**:
- Agent, AgentPool, Capability, Availability, Assignment
- Spawn, Terminate, Assign, Coordinate, Communicate

**Responsibilities**:
- Spawn and terminate agents
- Manage agent pool and availability
- Coordinate multi-agent swarms
- Track agent capabilities and health
- Handle agent-to-agent communication

**Domain Models**:
- `Agent` (aggregate root): Identity, type, status, capabilities
- `AgentId` (value object): Unique identifier
- `AgentStatus` (value object): Idle, Busy, Terminated
- `AgentCapability` (value object): Skills the agent has
- `AgentSwarm` (aggregate): Collection of coordinating agents
- `AgentRepository` (interface): Persistence contract

**External Dependencies**:
- Task Management: Receive task assignments
- Session Management: Get session context for agent operations
- Event Coordination: Publish `AgentSpawned`, `AgentTerminated` events

**API**:
```typescript
interface AgentCoordinationContext {
  spawnAgent(type: AgentType): Promise<AgentId>;
  terminateAgent(agentId: AgentId): Promise<void>;
  assignTask(agentId: AgentId, taskId: TaskId): Promise<void>;
  queryAgents(filter: AgentFilter): Promise<Agent[]>;
  createSwarm(config: SwarmConfig): Promise<SwarmId>;
}
```

#### 4. Health Monitoring Context

**Ubiquitous Language**:
- Metric, HealthCheck, Alert, Threshold, Anomaly
- Monitor, Track, Alert, Report, Diagnose

**Responsibilities**:
- Collect system and component metrics
- Run health checks on services
- Detect anomalies and performance issues
- Generate alerts when thresholds exceeded
- Provide observability dashboards

**Domain Models**:
- `Metric` (value object): Name, value, timestamp, tags
- `HealthCheck` (entity): Check definition and results
- `Alert` (entity): Triggered alert with severity
- `Threshold` (value object): Min/max boundaries
- `MetricRepository` (interface): Time-series storage

**External Dependencies**:
- All Contexts: Collect metrics from all contexts
- Event Coordination: Subscribe to all events for monitoring

**API**:
```typescript
interface HealthMonitoringContext {
  recordMetric(metric: Metric): Promise<void>;
  runHealthCheck(checkId: string): Promise<HealthCheckResult>;
  queryMetrics(filter: MetricFilter): Promise<Metric[]>;
  getSystemHealth(): Promise<SystemHealth>;
}
```

#### 5. Event Coordination Context

**Ubiquitous Language**:
- Event, Subscriber, Publisher, Topic, Handler
- Publish, Subscribe, Route, Process, Retry

**Responsibilities**:
- Provide event bus for inter-context communication
- Manage event subscriptions and routing
- Handle event persistence and replay
- Ensure at-least-once delivery
- Dead-letter queue for failed events

**Domain Models**:
- `DomainEvent` (base class): Event metadata and payload
- `EventSubscription` (entity): Subscription details
- `EventHandler` (interface): Event processing contract
- `EventStore` (interface): Event persistence

**External Dependencies**:
- None (this is infrastructure for other contexts)

**API**:
```typescript
interface EventCoordinationContext {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): Promise<void>;
  replay(filter: EventFilter): Promise<void>;
}
```

### Context Integration Patterns

#### 1. Event-Driven Communication (Primary)

Contexts communicate via **domain events** published through Event Coordination Context:

```typescript
// Task Management publishes event
await eventBus.publish(new TaskCompleted(taskId, result));

// Health Monitoring subscribes
eventBus.subscribe('TaskCompleted', async (event) => {
  await healthMonitoring.recordMetric({
    name: 'task.completion_time',
    value: event.duration,
    tags: { taskType: event.type },
  });
});
```

**Benefits**:
- Loose coupling between contexts
- Easy to add new subscribers
- Supports event sourcing

**Trade-offs**:
- Eventual consistency
- Harder to debug than direct calls

#### 2. Shared Kernel (Minimal)

Small set of **shared concepts** across all contexts:

- `Id` (value object): Base class for all IDs
- `Timestamp` (value object): UTC timestamps
- `Result<T, E>` (type): Success/failure result type
- `DomainError` (base class): Errors in domain layer

**Benefits**:
- Consistency across contexts
- Avoids duplication

**Trade-offs**:
- Changes affect all contexts (minimize this)

#### 3. Anti-Corruption Layer (ACL)

When integrating with external systems or legacy code, use **ACL pattern**:

```typescript
// ACL translates external API to internal domain models
class LegacyOrchestratorAdapter {
  toTask(legacyTask: any): Task {
    return new Task(
      new TaskId(legacyTask.id),
      mapStatus(legacyTask.state),
      // ... translation logic
    );
  }
}
```

**Benefits**:
- Isolates contexts from external changes
- Gradual migration from legacy code

#### 4. Context Map

Visual representation of context relationships:

```
[Task Management] --publishes--> [Event Coordination]
                                        ↓
                                  [Health Monitoring]
                                        ↑
[Session Management] --publishes--> [Event Coordination]
                                        ↓
                                  [Agent Coordination]
```

### Migration Strategy

#### Phase 1: Extract Task Management Context (Week 1-2)
1. Create `src/contexts/task-management/` directory structure
2. Extract task-related domain models from `core/orchestrator.ts`
3. Define `TaskRepository` interface
4. Implement in-memory repository for testing
5. Write context-specific tests
6. Wire into microkernel

#### Phase 2: Extract Session Management Context (Week 3-4)
1. Create `src/contexts/session-management/` directory structure
2. Extract session logic from orchestrator
3. Define session persistence contract
4. Implement repository
5. Test session lifecycle

#### Phase 3: Extract Agent Coordination Context (Week 5-6)
1. Create `src/contexts/agent-coordination/` directory structure
2. Extract agent spawning and coordination logic
3. Define agent repository
4. Implement swarm coordination
5. Test multi-agent scenarios

#### Phase 4: Extract Health & Event Contexts (Week 7-8)
1. Create both contexts in parallel
2. Extract monitoring logic
3. Implement event bus
4. Wire all contexts to event bus
5. End-to-end integration tests

#### Phase 5: Deprecate Legacy Orchestrator (Week 9-10)
1. Ensure all functionality migrated
2. Add ACL if needed for backward compatibility
3. Mark `core/orchestrator.ts` as deprecated
4. Remove once all clients migrated

### Context Directory Structure

```
src/
├── contexts/
│   ├── task-management/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── task.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── task-id.ts
│   │   │   │   └── task-status.ts
│   │   │   └── repositories/
│   │   │       └── task-repository.interface.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── create-task.ts
│   │   │   │   └── execute-task.ts
│   │   │   └── services/
│   │   │       └── task-service.ts
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   │   └── in-memory-task-repository.ts
│   │   │   └── adapters/
│   │   └── presentation/
│   │       └── task-controller.ts
│   ├── session-management/
│   ├── agent-coordination/
│   ├── health-monitoring/
│   └── event-coordination/
├── microkernel/
│   ├── plugin-registry.ts
│   ├── lifecycle-manager.ts
│   └── dependency-container.ts
└── shared-kernel/
    ├── id.ts
    ├── timestamp.ts
    └── result.ts
```

## Consequences

### Positive

- ✅ **Reduced Complexity**: 1,440-line god object → 5 cohesive contexts (~200-300 LOC each)
- ✅ **Parallel Development**: Teams can work on different contexts independently
- ✅ **Testability**: Each context testable in isolation
- ✅ **Scalability**: Can extract contexts into microservices later
- ✅ **Clear Ownership**: Each context has a designated maintainer
- ✅ **Extensibility**: Plugin architecture allows easy feature additions

### Negative

- ⚠️ **Integration Complexity**: Event-driven communication harder to debug
- ⚠️ **More Files**: Code distributed across many directories
- ⚠️ **Learning Curve**: Developers must understand bounded contexts
- ⚠️ **Migration Effort**: 8-10 weeks of refactoring work

### Neutral

- ℹ️ **Eventual Consistency**: Event-driven communication is async
- ℹ️ **Context Translation**: Some concepts need mapping between contexts

## Compliance

New features MUST be implemented within appropriate bounded contexts. Cross-context communication MUST use events or well-defined APIs.

## References

- [Domain-Driven Design (Eric Evans)](https://www.domainlanguage.com/ddd/)
- [Bounded Context (Martin Fowler)](https://martinfowler.com/bliki/BoundedContext.html)
- [Context Mapping](https://www.infoq.com/articles/ddd-contextmapping/)
- [Microkernel Architecture](https://www.oreilly.com/library/view/software-architecture-patterns/9781491971437/ch03.html)

## Related ADRs

- ADR-001: DDD Layer Responsibilities and Boundaries
- ADR-003: Aggregate Design Decisions (planned)
- ADR-004: Repository Pattern Implementation (planned)
- ADR-005: Event-Driven Architecture (planned)
