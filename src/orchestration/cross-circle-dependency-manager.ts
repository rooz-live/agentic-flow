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
   * Perform Topological Sort (Kahn's Algorithm) to determine execution order
   * Returns an array of task arrays representing parallel execution tiers
   */
  public resolveTopology(): string[][] {
    const inDegree: Map<string, number> = new Map();
    this.adjacency.clear();

    // Initialize maps
    for (const task of Array.from(this.tasks.values())) {
      inDegree.set(task.id, 0);
      if (!this.adjacency.has(task.id)) {
        this.adjacency.set(task.id, []);
      }
    }

    // Build Graph
    for (const task of Array.from(this.tasks.values())) {
      const allDeps = [...task.dependencies, ...(task.softDependencies || [])];
      for (const depId of allDeps) {
        if (!this.tasks.has(depId)) {
          throw new Error(
            `Graph Violation: Task ${task.id} depends on unknown Task ${depId}`,
          );
        }
        inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);

        if (!this.adjacency.has(depId)) {
          this.adjacency.set(depId, []);
        }
        this.adjacency.get(depId)!.push(task.id);
      }
    }

    const tiers: string[][] = [];
    let queue: string[] = [];

    // Seed initial tier (tasks with 0 dependencies)
    for (const [taskId, degree] of Array.from(inDegree.entries())) {
      if (degree === 0) queue.push(taskId);
    }

    let processedCount = 0;

    while (queue.length > 0) {
      tiers.push([...queue]); // Push the current parallel execution tier
      const nextQueue: string[] = [];

      for (const taskId of queue) {
        processedCount++;
        const edges = this.adjacency.get(taskId) || [];
        for (const destinationId of edges) {
          const newDegree = inDegree.get(destinationId)! - 1;
          inDegree.set(destinationId, newDegree);
          if (newDegree === 0) {
            nextQueue.push(destinationId);
          }
        }
      }
      queue = nextQueue;
    }

    if (processedCount !== this.tasks.size) {
      throw new Error(
        "Graph Violation: Circular dependency detected in Circle Matrix!",
      );
    }

    return tiers;
  }

  public resolveTask(taskId: string, success: boolean) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Note: Global failureCascade logic has been formally removed via ADR-026.
    // We no longer abort disconnected sub-graphs indiscriminately.

    if (task.state === "ABORTED") {
      // Task was already structurally aborted by a parent's failure cascade.
      return;
    }

    if (success) {
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
