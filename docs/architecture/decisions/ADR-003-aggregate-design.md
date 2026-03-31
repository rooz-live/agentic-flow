---
date: 2026-03-06
status: accepted
related_tests: TBD
---

# ADR-003: Aggregate Design Decisions

**Status**: Accepted  
**Date**: 2026-02-01  
**Deciders**: Development Team  
**Tags**: architecture, ddd, aggregates, consistency

## Context and Problem Statement

In DDD, **aggregates** are clusters of domain objects treated as a single unit for data changes. They enforce:
- **Consistency boundaries**: Transactional consistency within aggregate
- **Invariant enforcement**: Business rules always valid
- **Encapsulation**: Hide internal structure

Without clear aggregate boundaries, we risk:
- Inconsistent state across related entities
- Performance issues (loading entire object graphs)
- Difficult testing (mocking complex relationships)
- Concurrency conflicts (multiple updates to same data)

We need to define aggregate roots, boundaries, and consistency rules for agentic-flow's core domain models.

## Decision Drivers

- **Consistency**: Guarantee business rules are always valid
- **Performance**: Minimize database round-trips
- **Simplicity**: Keep aggregates small and focused
- **Concurrency**: Support parallel operations without conflicts
- **Testability**: Enable isolated aggregate testing

## Considered Options

### Option 1: Large Aggregates (Everything Related)
One aggregate contains all related entities (e.g., Task includes full Agent, full Session).

**Pros**:
- All data in one transaction
- No cross-aggregate queries

**Cons**:
- Huge aggregates, slow to load
- High contention, poor concurrency
- Difficult to test

### Option 2: Fine-Grained Aggregates (One Entity = One Aggregate)
Every entity is its own aggregate.

**Pros**:
- Maximum concurrency
- Fast operations

**Cons**:
- Hard to enforce invariants across entities
- Complex cross-aggregate transactions
- Eventual consistency everywhere

### Option 3: Business-Driven Aggregate Boundaries
Aggregates based on transactional consistency requirements (what must change together).

**Pros**:
- Natural consistency boundaries
- Balanced aggregate size
- Clear invariant enforcement

**Cons**:
- Requires domain understanding
- Some cross-aggregate coordination needed

## Decision Outcome

**Chosen option**: **Option 3** (Business-Driven Aggregate Boundaries)

We define **4 core aggregates** with clear consistency boundaries:

### 1. Task Aggregate

**Aggregate Root**: `Task`

**Consistency Boundary**:
- Task identity, status, metadata
- Task dependencies (within same aggregate)
- Task execution result
- Assigned agent ID (reference, not full agent)

**Invariants**:
1. Task cannot be completed without being assigned to an agent
2. Task cannot transition from Completed to Pending
3. Task dependencies must not form cycles
4. Failed tasks can retry up to max retry limit

**Entities/VOs within Aggregate**:
- `Task` (root)
- `TaskId` (VO)
- `TaskStatus` (VO): Pending, Running, Completed, Failed
- `TaskMetadata` (VO): Created at, updated at, creator
- `TaskResult` (VO): Success/failure with details
- `TaskDependency` (VO): References to other task IDs

**References Outside Aggregate**:
- `AgentId`: Reference to assigned agent (NOT full Agent entity)
- `SessionId`: Reference to session context (NOT full Session)

**Example**:
```typescript
class Task {
  private constructor(
    private readonly id: TaskId,
    private status: TaskStatus,
    private metadata: TaskMetadata,
    private result?: TaskResult,
    private assignedAgentId?: AgentId,
    private sessionId?: SessionId,
    private dependencies: Set<TaskId> = new Set()
  ) {}

  assign(agentId: AgentId): void {
    if (this.status === TaskStatus.Completed) {
      throw new Error('Cannot assign completed task');
    }
    this.assignedAgentId = agentId;
  }

  complete(result: TaskResult): void {
    if (!this.assignedAgentId) {
      throw new Error('Cannot complete unassigned task'); // Invariant
    }
    this.status = TaskStatus.Completed;
    this.result = result;
    this.metadata = this.metadata.withUpdatedAt(new Date());
  }

  addDependency(taskId: TaskId): void {
    if (taskId.equals(this.id)) {
      throw new Error('Task cannot depend on itself'); // Invariant
    }
    // TODO: Check for cycles (would require repository access)
    this.dependencies.add(taskId);
  }
}
```

**Design Rationale**:
- Task state transitions are atomic (status, result, metadata change together)
- Agent assignment is a reference (Agent aggregate can change independently)
- Dependencies are task IDs (don't load full dependency graph into memory)

### 2. Agent Aggregate

**Aggregate Root**: `Agent`

**Consistency Boundary**:
- Agent identity, type, status
- Agent capabilities (skills it possesses)
- Current assignment (task ID reference)
- Health metrics specific to this agent

**Invariants**:
1. Agent cannot be terminated while executing a task
2. Agent can only be assigned tasks matching its capabilities
3. Idle agents must have no current assignment
4. Agent spawning requires valid agent type

**Entities/VOs within Aggregate**:
- `Agent` (root)
- `AgentId` (VO)
- `AgentType` (VO): Coder, Tester, Reviewer, etc.
- `AgentStatus` (VO): Idle, Busy, Terminated
- `AgentCapability` (VO): Set of skills
- `AgentHealth` (VO): CPU, memory, response time

**References Outside Aggregate**:
- `TaskId`: Reference to currently assigned task
- `SwarmId`: Reference to parent swarm (if part of one)

**Example**:
```typescript
class Agent {
  private constructor(
    private readonly id: AgentId,
    private readonly type: AgentType,
    private status: AgentStatus,
    private readonly capabilities: Set<AgentCapability>,
    private health: AgentHealth,
    private currentTaskId?: TaskId
  ) {}

  assignTask(taskId: TaskId, requiredCapability: AgentCapability): void {
    if (this.status === AgentStatus.Terminated) {
      throw new Error('Cannot assign task to terminated agent'); // Invariant
    }
    if (!this.capabilities.has(requiredCapability)) {
      throw new Error(`Agent lacks required capability: ${requiredCapability}`); // Invariant
    }
    this.currentTaskId = taskId;
    this.status = AgentStatus.Busy;
  }

  completeTask(): void {
    this.currentTaskId = undefined;
    this.status = AgentStatus.Idle;
  }

  terminate(): void {
    if (this.currentTaskId) {
      throw new Error('Cannot terminate agent while executing task'); // Invariant
    }
    this.status = AgentStatus.Terminated;
  }
}
```

**Design Rationale**:
- Agent state (idle/busy) tied to current assignment (atomic transition)
- Capabilities are intrinsic to agent (change together)
- Task reference only (Task aggregate owns task details)

### 3. Session Aggregate

**Aggregate Root**: `Session`

**Consistency Boundary**:
- Session identity, state, configuration
- Session timeline (start, pause, resume, end timestamps)
- Session context (key-value metadata)
- Snapshot history (for restore)

**Invariants**:
1. Active session cannot be started again
2. Ended session cannot be resumed
3. Paused session must have been active
4. Session snapshots are immutable and ordered

**Entities/VOs within Aggregate**:
- `Session` (root)
- `SessionId` (VO)
- `SessionState` (VO): Active, Paused, Ended
- `SessionTimeline` (VO): Start/pause/resume/end timestamps
- `SessionContext` (VO): Key-value metadata
- `SessionSnapshot` (entity): Point-in-time state capture

**References Outside Aggregate**:
- None (session is self-contained)

**Example**:
```typescript
class Session {
  private constructor(
    private readonly id: SessionId,
    private state: SessionState,
    private readonly timeline: SessionTimeline,
    private context: SessionContext,
    private snapshots: SessionSnapshot[] = []
  ) {}

  pause(): void {
    if (this.state !== SessionState.Active) {
      throw new Error('Only active sessions can be paused'); // Invariant
    }
    this.state = SessionState.Paused;
    this.timeline.recordPause(new Date());
  }

  resume(): void {
    if (this.state !== SessionState.Paused) {
      throw new Error('Only paused sessions can be resumed'); // Invariant
    }
    this.state = SessionState.Active;
    this.timeline.recordResume(new Date());
  }

  end(): void {
    if (this.state === SessionState.Ended) {
      throw new Error('Session already ended'); // Invariant
    }
    this.state = SessionState.Ended;
    this.timeline.recordEnd(new Date());
  }

  createSnapshot(): SessionSnapshot {
    const snapshot = new SessionSnapshot(this.state, this.context, new Date());
    this.snapshots.push(snapshot);
    return snapshot;
  }

  restore(snapshot: SessionSnapshot): void {
    this.state = snapshot.state;
    this.context = snapshot.context;
  }
}
```

**Design Rationale**:
- Session lifecycle (state + timeline) must be consistent
- Snapshots are part of aggregate (created/restored atomically)
- No external references (session is independent unit)

### 4. AgentSwarm Aggregate

**Aggregate Root**: `AgentSwarm`

**Consistency Boundary**:
- Swarm identity, configuration
- Agent membership (agent IDs in swarm)
- Swarm coordination state
- Consensus tracking

**Invariants**:
1. Swarm must have at least one agent
2. All agents must be in Idle or Busy state (not Terminated)
3. Swarm cannot execute tasks if any agent is unhealthy
4. Maximum swarm size enforced

**Entities/VOs within Aggregate**:
- `AgentSwarm` (root)
- `SwarmId` (VO)
- `SwarmConfig` (VO): Topology, max agents, strategy
- `SwarmMembership` (VO): Set of agent IDs
- `ConsensusState` (VO): Raft/Byzantine state

**References Outside Aggregate**:
- `AgentId[]`: References to member agents
- `TaskId`: Reference to swarm's current task

**Example**:
```typescript
class AgentSwarm {
  private constructor(
    private readonly id: SwarmId,
    private readonly config: SwarmConfig,
    private membership: Set<AgentId>,
    private consensus: ConsensusState,
    private currentTaskId?: TaskId
  ) {}

  addAgent(agentId: AgentId): void {
    if (this.membership.size >= this.config.maxAgents) {
      throw new Error('Swarm at maximum capacity'); // Invariant
    }
    this.membership.add(agentId);
  }

  removeAgent(agentId: AgentId): void {
    this.membership.delete(agentId);
    if (this.membership.size === 0) {
      throw new Error('Swarm must have at least one agent'); // Invariant
    }
  }

  assignTask(taskId: TaskId): void {
    if (this.membership.size === 0) {
      throw new Error('Cannot assign task to empty swarm'); // Invariant
    }
    this.currentTaskId = taskId;
  }
}
```

**Design Rationale**:
- Swarm membership and consensus must be consistent
- Agent references only (Agent aggregate owns agent state)
- Task reference only (Task aggregate owns task execution)

## Aggregate Design Principles

### 1. Small Aggregates (Prefer Fine-Grained)

**Rule**: Keep aggregates as small as possible while maintaining invariants.

**Benefits**:
- Faster load times
- Better concurrency
- Easier to test

**Example**:
```typescript
// ❌ BAD: Large aggregate
class Task {
  agent: Agent;        // Full agent entity
  session: Session;    // Full session entity
  dependencies: Task[]; // Full task entities
}

// ✅ GOOD: Small aggregate with references
class Task {
  assignedAgentId?: AgentId;      // Reference
  sessionId?: SessionId;          // Reference
  dependencies: Set<TaskId>;      // References
}
```

### 2. One Repository Per Aggregate

**Rule**: Each aggregate has exactly one repository interface.

```typescript
// ✅ GOOD
interface TaskRepository {
  findById(id: TaskId): Promise<Task | null>;
  save(task: Task): Promise<void>;
  delete(id: TaskId): Promise<void>;
}

// ❌ BAD: Repository for internal entity
interface TaskDependencyRepository { /* ... */ }
```

### 3. Reference by Identity Outside Aggregate

**Rule**: Don't hold references to other aggregates; use IDs instead.

```typescript
// ❌ BAD: Direct reference
class Task {
  private assignedAgent: Agent; // Aggregate reference
}

// ✅ GOOD: Reference by ID
class Task {
  private assignedAgentId?: AgentId; // ID reference
}
```

**Rationale**: Prevents accidental modification of other aggregates.

### 4. Eventual Consistency Between Aggregates

**Rule**: Use domain events for cross-aggregate coordination.

```typescript
// ✅ GOOD: Publish event
class Task {
  complete(result: TaskResult): void {
    this.status = TaskStatus.Completed;
    this.result = result;
    
    // Publish event for other aggregates
    this.addDomainEvent(new TaskCompleted(this.id, result));
  }
}

// Another aggregate listens
eventBus.subscribe('TaskCompleted', async (event) => {
  const agent = await agentRepo.findById(event.agentId);
  agent.completeTask();
  await agentRepo.save(agent);
});
```

### 5. Load Full Aggregate or None

**Rule**: Repository always loads complete aggregate, never partial.

```typescript
// ✅ GOOD: Load entire aggregate
async findById(id: TaskId): Promise<Task | null> {
  const row = await db.query(
    'SELECT * FROM tasks WHERE id = $1',
    [id.value]
  );
  if (!row) return null;
  
  // Load all dependencies
  const deps = await db.query(
    'SELECT dependency_id FROM task_dependencies WHERE task_id = $1',
    [id.value]
  );
  
  return Task.reconstitute(row, deps);
}

// ❌ BAD: Lazy loading
async findById(id: TaskId): Promise<Task | null> {
  const row = await db.query('SELECT * FROM tasks WHERE id = $1', [id.value]);
  return new Task(row.id, row.status /*, dependencies lazy-loaded */);
}
```

## Concurrency & Versioning

### Optimistic Locking

Use version numbers to detect concurrent modifications:

```typescript
class Task {
  private version: number = 0;

  incrementVersion(): void {
    this.version++;
  }
}

// Repository
async save(task: Task): Promise<void> {
  const result = await db.query(
    'UPDATE tasks SET status = $1, version = $2 WHERE id = $3 AND version = $4',
    [task.status, task.version + 1, task.id, task.version]
  );
  
  if (result.rowCount === 0) {
    throw new ConcurrencyError('Task was modified by another process');
  }
  
  task.incrementVersion();
}
```

## Testing Strategy

### Unit Tests (Aggregate Behavior)

```typescript
describe('Task Aggregate', () => {
  it('should enforce completion requires assignment', () => {
    const task = Task.create(new TaskId('1'));
    
    expect(() => {
      task.complete(TaskResult.success());
    }).toThrow('Cannot complete unassigned task');
  });
  
  it('should transition to completed when assigned', () => {
    const task = Task.create(new TaskId('1'));
    task.assign(new AgentId('agent-1'));
    task.complete(TaskResult.success());
    
    expect(task.status).toBe(TaskStatus.Completed);
  });
});
```

### Integration Tests (Cross-Aggregate)

```typescript
describe('Task-Agent Coordination', () => {
  it('should assign task to agent via events', async () => {
    const taskRepo = new InMemoryTaskRepository();
    const agentRepo = new InMemoryAgentRepository();
    const eventBus = new InMemoryEventBus();
    
    // Create task
    const task = Task.create(new TaskId('1'));
    await taskRepo.save(task);
    
    // Assign to agent
    task.assign(new AgentId('agent-1'));
    await taskRepo.save(task);
    
    // Event published and handled
    await eventBus.publish(new TaskAssigned(task.id, task.assignedAgentId!));
    
    // Agent updated
    const agent = await agentRepo.findById(new AgentId('agent-1'));
    expect(agent.status).toBe(AgentStatus.Busy);
  });
});
```

## Migration Path

1. **Identify existing god objects** (e.g., `core/orchestrator.ts`)
2. **Extract aggregate roots** (Task, Agent, Session, Swarm)
3. **Define invariants** for each aggregate
4. **Create repository interfaces** in domain layer
5. **Implement in-memory repositories** for testing
6. **Write aggregate unit tests** (behavior validation)
7. **Refactor existing code** to use aggregates
8. **Implement production repositories** (database)

## Consequences

### Positive

- ✅ **Consistency**: Invariants always enforced within aggregate
- ✅ **Testability**: Aggregates tested in isolation
- ✅ **Performance**: Small aggregates load fast
- ✅ **Concurrency**: Optimistic locking prevents conflicts

### Negative

- ⚠️ **Cross-Aggregate Coordination**: Eventual consistency via events
- ⚠️ **Learning Curve**: Team must understand aggregate boundaries

### Neutral

- ℹ️ **More Types**: Each aggregate has its own types (ID, Status, etc.)

## Compliance

All domain entities MUST be part of an aggregate. Cross-aggregate coordination MUST use domain events or application services.

## References

- [Effective Aggregate Design (Vaughn Vernon)](https://vaughnvernon.com/effective-aggregate-design-part-i-modeling-a-single-aggregate/)
- [DDD Aggregates (Martin Fowler)](https://martinfowler.com/bliki/DDD_Aggregate.html)
- [Designing Aggregates (Microsoft)](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/microservice-domain-model)

## Related ADRs

- ADR-001: DDD Layer Responsibilities and Boundaries
- ADR-002: Bounded Context Boundaries
- ADR-004: Repository Pattern Implementation (planned)
- ADR-005: Event-Driven Architecture (planned)
