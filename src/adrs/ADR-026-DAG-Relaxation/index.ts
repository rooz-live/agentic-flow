/**
 * ADR-026: DAG Topology Relaxation & Failure Cascade Containment
 * 
 * Refactored DAG constraints to balance OPEX protection with execution speed:
 * 1. Component-Level Isolation (BFS Abort) - No global kill-switch
 * 2. Soft vs Hard Dependency Parsing
 * 3. Active Telemetry Emission for /loop ingestion
 */

export type NodeStatus = 'pending' | 'running' | 'complete' | 'failed' | 'aborted';
export type Severity = 'NORMAL' | 'WARNING' | 'CRITICAL';
export type DependencyType = 'hard' | 'soft';

export interface DAGNode {
  id: string;
  circle: string;
  dependencies: string[]; // Hard dependencies
  softDependencies: string[]; // Soft dependencies (warning only on failure)
  status: NodeStatus;
  severity: Severity;
  telemetry: Record<string, any>;
  estimatedCost?: number; // OPEX cost estimate for telemetry
}

export interface FailureCascadeResult {
  triggerNode: string;
  abortedNodes: string[];
  survivingSubgraphs: string[];
  telemetryPayload: {
    source: string;
    event: 'failureCascade';
    triggerNode: string;
    timestamp: string;
    abortedCount: number;
    abortedNodes: string[];
    survivingSubgraphs: string[];
    opexSavings: number;
    edgeNodes?: string[];
  };
}

export interface ExecutionCheck {
  allowed: boolean;
  reason?: string;
  warnings: string[];
}

export interface TelemetryData {
  warnings: string[];
  events: string[];
  opexMetrics: {
    estimatedSavings: number;
    actualSpend: number;
  };
}

export class DAGRelaxationOrchestrator {
  private nodes: Map<string, DAGNode> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map(); // parent -> children
  private telemetry: TelemetryData = {
    warnings: [],
    events: [],
    opexMetrics: { estimatedSavings: 0, actualSpend: 0 }
  };

  /**
   * Add a node to the DAG
   * @throws Error if circular dependency detected
   */
  addNode(node: DAGNode): void {
    // Check for circular dependencies
    this.validateNoCircularDependency(node);

    this.nodes.set(node.id, { ...node });
    
    // Build adjacency list (parent -> children)
    [...node.dependencies, ...node.softDependencies].forEach(depId => {
      if (!this.adjacencyList.has(depId)) {
        this.adjacencyList.set(depId, new Set());
      }
      this.adjacencyList.get(depId)!.add(node.id);
    });
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): DAGNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Update node status and severity
   */
  updateNodeStatus(id: string, status: NodeStatus, severity: Severity = 'NORMAL'): void {
    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Node not found: ${id}`);
    }
    
    node.status = status;
    node.severity = severity;
    this.nodes.set(id, node);
  }

  /**
   * Check if node can execute based on dependencies
   * Implements soft vs hard dependency logic
   */
  canExecute(nodeId: string): ExecutionCheck {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return { allowed: false, reason: `Node ${nodeId} not found`, warnings: [] };
    }

    const warnings: string[] = [];

    // Check hard dependencies - must all be complete
    for (const depId of node.dependencies) {
      const dep = this.nodes.get(depId);
      if (!dep) {
        return { allowed: false, reason: `Hard dependency ${depId} not found`, warnings };
      }
      
      if (dep.status === 'failed') {
        return { 
          allowed: false, 
          reason: `Hard dependency ${depId} failed with severity ${dep.severity}`,
          warnings 
        };
      }
      
      if (dep.status !== 'complete') {
        return { 
          allowed: false, 
          reason: `Hard dependency ${depId} not complete (status: ${dep.status})`,
          warnings 
        };
      }
    }

    // Check soft dependencies - emit warning but allow execution
    for (const depId of node.softDependencies) {
      const dep = this.nodes.get(depId);
      if (dep && dep.status === 'failed') {
        const warning = `Soft dependency ${depId} failed`;
        warnings.push(warning);
        this.telemetry.warnings.push(`${nodeId}: ${warning}`);
      }
    }

    return { allowed: true, warnings };
  }

  /**
   * Handle failure cascade using BFS (not global kill-switch)
   * Only aborts topological descendants of failed node
   */
  handleFailureCascade(failedNodeId: string): FailureCascadeResult {
    const failedNode = this.nodes.get(failedNodeId);
    if (!failedNode) {
      throw new Error(`Failed node not found: ${failedNodeId}`);
    }

    // BFS to find all descendants (nodes that depend on failed node)
    const abortedNodes: string[] = [];
    const visited = new Set<string>();
    const queue: string[] = [failedNodeId];
    
    let opexSavings = 0;

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Get children from adjacency list
      const children = this.adjacencyList.get(currentId);
      if (children) {
        for (const childId of children) {
          const child = this.nodes.get(childId);
          if (child && child.status !== 'aborted' && child.status !== 'failed') {
            // Abort this child
            child.status = 'aborted';
            this.nodes.set(childId, child);
            abortedNodes.push(childId);
            
            // Calculate OPEX savings
            opexSavings += child.estimatedCost || 1;
            
            // Add to queue to process its children
            queue.push(childId);
          }
        }
      }
    }

    // Find surviving sub-graphs (disconnected from failed node)
    const allNodes = Array.from(this.nodes.keys());
    const survivingSubgraphs = allNodes.filter(id => 
      !visited.has(id) && 
      id !== failedNodeId &&
      this.nodes.get(id)?.status !== 'aborted'
    );

    // Find edge nodes (terminal nodes in aborted chains)
    const edgeNodes = abortedNodes.filter(id => {
      const children = this.adjacencyList.get(id);
      return !children || children.size === 0;
    });

    // Build telemetry payload
    const telemetryPayload = {
      source: 'DAGRelaxationOrchestrator',
      event: 'failureCascade' as const,
      triggerNode: failedNodeId,
      timestamp: new Date().toISOString(),
      abortedCount: abortedNodes.length,
      abortedNodes,
      survivingSubgraphs,
      opexSavings,
      edgeNodes
    };

    // Emit to telemetry
    this.telemetry.events.push(`Failure cascade from ${failedNodeId}: ${abortedNodes.length} nodes aborted`);
    this.telemetry.opexMetrics.estimatedSavings += opexSavings;

    return {
      triggerNode: failedNodeId,
      abortedNodes,
      survivingSubgraphs,
      telemetryPayload
    };
  }

  /**
   * Get topological sort using Kahn's Algorithm
   * @throws Error if cycle detected
   */
  getExecutionOrder(): string[] {
    const inDegree = new Map<string, number>();
    const result: string[] = [];
    const queue: string[] = [];

    // Initialize in-degrees
    this.nodes.forEach((node, id) => {
      inDegree.set(id, node.dependencies.length + node.softDependencies.length);
      if (inDegree.get(id) === 0) {
        queue.push(id);
      }
    });

    // Process queue
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      // Reduce in-degree of children
      const children = this.adjacencyList.get(nodeId);
      if (children) {
        for (const childId of children) {
          const currentDegree = inDegree.get(childId) || 0;
          const newDegree = currentDegree - 1;
          inDegree.set(childId, newDegree);
          
          if (newDegree === 0) {
            queue.push(childId);
          }
        }
      }
    }

    // Check for cycle
    if (result.length !== this.nodes.size) {
      throw new Error('Cycle detected in DAG');
    }

    return result;
  }

  /**
   * Get parallel execution waves
   * Groups nodes that can execute simultaneously
   */
  getParallelExecutionWaves(): string[][] {
    const waves: string[][] = [];
    const completed = new Set<string>();
    
    while (completed.size < this.nodes.size) {
      const wave: string[] = [];
      
      this.nodes.forEach((node, id) => {
        if (completed.has(id)) return;
        
        // Check if all dependencies are completed
        const allDepsComplete = [...node.dependencies, ...node.softDependencies]
          .every(depId => completed.has(depId));
        
        if (allDepsComplete) {
          wave.push(id);
        }
      });
      
      if (wave.length === 0) {
        // Deadlock or cycle
        throw new Error('Unable to find parallelizable nodes - possible cycle');
      }
      
      waves.push(wave);
      wave.forEach(id => completed.add(id));
    }
    
    return waves;
  }

  /**
   * Get groups of nodes that can execute in parallel
   */
  getParallelizableGroups(): string[][] {
    return this.getParallelExecutionWaves();
  }

  /**
   * Get telemetry data
   */
  getTelemetry(): TelemetryData {
    return { ...this.telemetry };
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    total: number;
    pending: number;
    running: number;
    complete: number;
    failed: number;
    aborted: number;
  } {
    const stats = {
      total: this.nodes.size,
      pending: 0,
      running: 0,
      complete: 0,
      failed: 0,
      aborted: 0
    };

    this.nodes.forEach(node => {
      switch (node.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'running':
          stats.running++;
          break;
        case 'complete':
          stats.complete++;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'aborted':
          stats.aborted++;
          break;
      }
    });

    return stats;
  }

  /**
   * Serialize DAG to JSON
   */
  serialize(): string {
    const obj = {
      nodes: Array.from(this.nodes.entries()),
      telemetry: this.telemetry
    };
    return JSON.stringify(obj, null, 2);
  }

  /**
   * Deserialize DAG from JSON
   */
  deserialize(json: string): void {
    try {
      const obj = JSON.parse(json);
      this.nodes.clear();
      this.adjacencyList.clear();
      
      obj.nodes.forEach(([id, node]: [string, DAGNode]) => {
        this.addNode(node);
      });
      
      this.telemetry = obj.telemetry || { warnings: [], events: [], opexMetrics: { estimatedSavings: 0, actualSpend: 0 } };
    } catch (error) {
      throw new Error(`Failed to deserialize DAG: ${error}`);
    }
  }

  /**
   * Clear all nodes
   */
  clear(): void {
    this.nodes.clear();
    this.adjacencyList.clear();
    this.telemetry = { warnings: [], events: [], opexMetrics: { estimatedSavings: 0, actualSpend: 0 } };
  }

  /**
   * Validate no circular dependency would be created
   */
  private validateNoCircularDependency(newNode: DAGNode): void {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const hasCycle = (nodeId: string, visited: Set<string>, stack: Set<string>): boolean => {
      if (stack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      stack.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) {
        for (const depId of [...node.dependencies, ...node.softDependencies]) {
          if (hasCycle(depId, visited, stack)) return true;
        }
      }

      // Also check newNode's dependencies
      if (nodeId === newNode.id) {
        for (const depId of [...newNode.dependencies, ...newNode.softDependencies]) {
          // Check if this dependency leads back to newNode
          if (depId === newNode.id) return true; // Self-reference
          
          const depNode = this.nodes.get(depId);
          if (depNode) {
            if (hasCycleFromNode(depId, newNode.id, new Set())) return true;
          }
        }
      }

      stack.delete(nodeId);
      return false;
    };

    const hasCycleFromNode = (startId: string, targetId: string, visited: Set<string>): boolean => {
      if (startId === targetId) return true;
      if (visited.has(startId)) return false;
      visited.add(startId);

      const node = this.nodes.get(startId);
      if (node) {
        for (const depId of [...node.dependencies, ...node.softDependencies]) {
          if (hasCycleFromNode(depId, targetId, visited)) return true;
        }
      }

      return false;
    };

    // Check if adding newNode creates a cycle
    if (hasCycle(newNode.id, new Set(), new Set())) {
      throw new Error('Circular dependency detected');
    }
  }
}

/**
 * Global DAG orchestrator singleton
 */
export const globalDAGOrchestrator = new DAGRelaxationOrchestrator();

export default DAGRelaxationOrchestrator;
