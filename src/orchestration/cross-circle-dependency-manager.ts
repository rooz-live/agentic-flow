import { EventEmitter } from "events";

export type CircleRole =
  | "Innovator"
  | "Analyst"
  | "Assessor"
  | "Orchestrator"
  | "Intuitive"
  | "Seeker"
  | "Testing";

export type TaskState =
  | "PENDING"
  | "RUNNING"
  | "SOFT_PENDING" // Hard deps resolved, waiting on soft deps
  | "COMPLETED"
  | "FAILED"
  | "ABORTED"
  | "WARNING_MITIGATED";
export type TaskSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface CircleTask {
  id: string;
  circle: CircleRole;
  description: string;
  severity?: TaskSeverity; // Optional bounding impact limit, assumed CRITICAL if missing
  dependencies: string[]; // Strict tasks that must resolve
  softDependencies?: string[]; // Soft tasks that determine topology but may fail gracefully
  state: TaskState;
  // Telemetry Gate: Async validation hook to prevent Completion Theater
  // If provided, resolveTask will await this before marking COMPLETED
  telemetryValidator?: () => Promise<boolean>;
}

export class CrossCircleDependencyManager extends EventEmitter {
  private tasks: Map<string, CircleTask> = new Map();
  private adjacency: Map<string, string[]> = new Map(); // Forward edges (A -> B means B depends on A)

  constructor() {
    super();
  }

  /** Register a task into the Circle DAG */
  public registerTask(task: CircleTask) {
    if (this.tasks.has(task.id)) {
      throw new Error(
        `Task ID ${task.id} already exists in the boundary graph.`,
      );
    }
    this.tasks.set(task.id, { ...task, state: "PENDING" });
  }

  /**
   * Perform Topological Sort (Kahn's Algorithm) with Soft-Dependency Tier Splitting.
   * Hard dependencies block tier progression; soft dependencies don't.
   * Returns an array of task arrays representing parallel execution tiers.
   */
  public resolveTopology(): string[][] {
    const hardInDegree: Map<string, number> = new Map(); // Strict deps that block
    const softInDegree: Map<string, number> = new Map();  // Soft deps that don't block
    const softPressure: Map<string, number> = new Map();  // Track soft dep count for telemetry
    this.adjacency.clear();

    // Initialize maps
    for (const task of Array.from(this.tasks.values())) {
      hardInDegree.set(task.id, 0);
      softInDegree.set(task.id, 0);
      softPressure.set(task.id, (task.softDependencies || []).length);
      if (!this.adjacency.has(task.id)) {
        this.adjacency.set(task.id, []);
      }
    }

    // Build Graph - split hard and soft dep tracking
    for (const task of Array.from(this.tasks.values())) {
      // Hard dependencies block tier progression
      for (const depId of task.dependencies) {
        if (!this.tasks.has(depId)) {
          throw new Error(
            `Graph Violation: Task ${task.id} depends on unknown Task ${depId}`,
          );
        }
        hardInDegree.set(task.id, (hardInDegree.get(task.id) || 0) + 1);
        if (!this.adjacency.has(depId)) {
          this.adjacency.set(depId, []);
        }
        this.adjacency.get(depId)!.push(task.id);
      }
      
      // Soft dependencies tracked but don't block
      for (const depId of (task.softDependencies || [])) {
        if (!this.tasks.has(depId)) {
          throw new Error(
            `Graph Violation: Task ${task.id} depends on unknown Task ${depId}`,
          );
        }
        softInDegree.set(task.id, (softInDegree.get(task.id) || 0) + 1);
        // Still add to adjacency for cascade tracking
        if (!this.adjacency.has(depId)) {
          this.adjacency.set(depId, []);
        }
        this.adjacency.get(depId)!.push(task.id);
      }
    }

    const tiers: string[][] = [];
    let queue: string[] = [];
    const processed = new Set<string>();

    // Seed initial tier (tasks with 0 hard dependencies)
    for (const [taskId, degree] of Array.from(hardInDegree.entries())) {
      if (degree === 0) queue.push(taskId);
    }

    while (queue.length > 0) {
      const currentTier: string[] = [];
      const nextQueue: string[] = [];

      for (const taskId of queue) {
        if (processed.has(taskId)) continue;
        processed.add(taskId);
        
        // Check if soft deps are still pending
        const softDepsRemaining = softInDegree.get(taskId) || 0;
        if (softDepsRemaining > 0) {
          // Hard deps resolved, but soft deps pending
          const taskObj = this.tasks.get(taskId);
          if (taskObj && taskObj.state === "PENDING") {
            taskObj.state = "SOFT_PENDING";
            this.emit("circle:soft_tier_ready", { task: taskObj, softDepsRemaining });
          }
        }
        currentTier.push(taskId);
        
        const edges = this.adjacency.get(taskId) || [];
        for (const destinationId of edges) {
          const targetTask = this.tasks.get(destinationId);
          if (!targetTask) continue;
          
          // Check if this is a hard or soft dependency edge
          const isHardDep = targetTask.dependencies.includes(taskId);
          const isSoftDep = (targetTask.softDependencies || []).includes(taskId);
          
          if (isHardDep) {
            const newHardDegree = hardInDegree.get(destinationId)! - 1;
            hardInDegree.set(destinationId, newHardDegree);
            if (newHardDegree === 0) {
              nextQueue.push(destinationId);
            }
          } else if (isSoftDep) {
            const newSoftDegree = softInDegree.get(destinationId)! - 1;
            softInDegree.set(destinationId, newSoftDegree);
            // Soft deps don't block tier progression, but we track them
          }
        }
      }
      
      if (currentTier.length > 0) {
        tiers.push(currentTier);
      }
      queue = nextQueue;
    }

    if (processed.size !== this.tasks.size) {
      const unprocessed = Array.from(this.tasks.keys()).filter(id => !processed.has(id));
      throw new Error(
        `Graph Violation: Circular dependency detected in Circle Matrix! Unprocessed: ${unprocessed.join(', ')}`,
      );
    }

    return tiers;
  }

  public async resolveTask(taskId: string, success: boolean): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Note: Global failureCascade logic has been formally removed via ADR-026.
    // We no longer abort disconnected sub-graphs indiscriminately.

    if (task.state === "ABORTED") {
      // Task was already structurally aborted by a parent's failure cascade.
      return;
    }

    if (success) {
      // Telemetry Gate: Prevent Completion Theater by validating physical execution
      if (task.telemetryValidator) {
        try {
          const telemetryPassed = await task.telemetryValidator();
          if (!telemetryPassed) {
            // Syntax check passed, but telemetry failed = Completion Theater detected
            task.state = "WARNING_MITIGATED";
            this.emit("circle:telemetry_failed", {
              task,
              reason: "telemetry_validator_returned_false",
              message: "Task marked success but telemetry validation failed. Completion Theater detected."
            });
            // Still cascade to strict dependencies as this is effectively a WARNING
            this.abortTopologicalDescendants(task.id, false);
            return;
          }
        } catch (err) {
          // Telemetry validation threw error = system failure
          task.state = "WARNING_MITIGATED";
          this.emit("circle:telemetry_error", {
            task,
            error: err,
            reason: "telemetry_validator_threw_error"
          });
          this.abortTopologicalDescendants(task.id, false);
          return;
        }
      }
      
      task.state = "COMPLETED";
      this.emit("circle:complete", task);
    } else {
      const severity = task.severity || "CRITICAL";

      if (severity === "CRITICAL") {
        task.state = "FAILED";
        this.emit("circle:failed", task);

        // ADR-026: Granular OPEX Bounding via BFS component-level abort
        this.abortTopologicalDescendants(task.id, true);
      } else {
        task.state = "WARNING_MITIGATED";
        this.emit("circle:warning", task);

        // ADR-026: Soft failures do not structurally abort soft descendants.
        // We only cascade the abort to strict dependencies.
        this.abortTopologicalDescendants(task.id, false);
      }
    }
  }

  /**
   * Breadth-First Search (BFS) to traverse and abort topological descendants.
   * @param failedTaskId The root task that failed.
   * @param strictCascade If true, aborts all descendants. If false, aborts only strict descendants.
   */
  private abortTopologicalDescendants(
    failedTaskId: string,
    strictCascade: boolean,
  ) {
    const queue: string[] = [failedTaskId];
    const visited: Set<string> = new Set([failedTaskId]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const edges = this.adjacency.get(currentId) || [];

      for (const targetId of edges) {
        if (visited.has(targetId)) continue;

        const targetTask = this.tasks.get(targetId);
        if (!targetTask) continue;

        // Determine if the target task is structurally dependent on the failed task
        const isStrictlyDependent = targetTask.dependencies.includes(currentId);
        const isSoftlyDependent = (targetTask.softDependencies || []).includes(
          currentId,
        );

        let shouldAbort = false;

        if (strictCascade) {
          // A critical parent failure aborts everything beneath it
          shouldAbort = true;
        } else {
          // A warning parent failure only aborts tasks that strictly required it to succeed
          if (isStrictlyDependent) {
            shouldAbort = true;
          }
        }

        if (
          shouldAbort &&
          (targetTask.state === "PENDING" || targetTask.state === "RUNNING")
        ) {
          targetTask.state = "ABORTED";
          visited.add(targetId);
          queue.push(targetId);

          this.emit("circle:aborted_structural", {
            task: targetTask,
            cause: failedTaskId,
            reason: isStrictlyDependent
              ? "strict_dependency_failed"
              : "parent_critical_cascade",
          });
        } else if (isSoftlyDependent && !strictCascade) {
          // Target has a soft dependency that warned, it survives but telemetry is emitted
          this.emit("circle:soft_dependency_warned", {
            task: targetTask,
            cause: failedTaskId,
          });
        }
      }
    }
  }

  public getStatus() {
    return Array.from(this.tasks.values());
  }
}
