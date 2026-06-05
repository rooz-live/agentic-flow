/**
 * ADR-001: Hierarchical Progress Tracking
 * 
 * Implements hierarchical mesh navigation with progress indicators.
 * Tracks completion status across nested ADR implementations.
 */

export type ProgressStatus = 'pending' | 'in-progress' | 'complete' | 'blocked';

export interface ProgressNode {
  id: string;
  label: string;
  status: ProgressStatus;
  progress: number; // 0-100
  children: string[]; // IDs of child nodes
  metadata?: Record<string, any>;
}

export interface MeshNavItem {
  id: string;
  label: string;
  status: ProgressStatus;
  progressIndicator: number;
  children: MeshNavItem[];
  expanded?: boolean;
}

export class HierarchicalProgressTracker {
  private nodes: Map<string, ProgressNode> = new Map();
  private listeners: Array<(nodes: Map<string, ProgressNode>) => void> = [];

  /**
   * Add a progress node to the tracker
   * @throws Error if progress is out of bounds (0-100)
   * @throws Error if circular reference detected
   */
  addNode(node: ProgressNode): void {
    // Validate progress bounds
    if (node.progress < 0 || node.progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    // Check for circular references before adding
    if (node.children.length > 0) {
      this.validateNoCircularReference(node);
    }

    this.nodes.set(node.id, { ...node });
    this.notifyListeners();
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): ProgressNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Update node status with validation
   * @throws Error if transition is invalid
   */
  updateStatus(id: string, newStatus: ProgressStatus): void {
    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Node not found: ${id}`);
    }

    // Validate status transition
    if (node.status === 'complete' && newStatus === 'pending') {
      throw new Error('Cannot transition from complete to pending');
    }

    if (node.status === 'blocked' && newStatus === 'complete') {
      throw new Error('Cannot transition from blocked directly to complete');
    }

    node.status = newStatus;
    
    // Auto-update progress based on status
    if (newStatus === 'complete') {
      node.progress = 100;
    } else if (newStatus === 'pending') {
      node.progress = 0;
    }

    this.nodes.set(id, node);
    this.notifyListeners();
  }

  /**
   * Update node progress
   * Auto-completes if progress reaches 100
   */
  updateProgress(id: string, newProgress: number): void {
    if (newProgress < 0 || newProgress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Node not found: ${id}`);
    }

    node.progress = newProgress;

    // Auto-complete at 100%
    if (newProgress === 100) {
      node.status = 'complete';
    } else if (newProgress > 0 && node.status === 'pending') {
      node.status = 'in-progress';
    }

    this.nodes.set(id, node);
    this.notifyListeners();
  }

  /**
   * Calculate aggregate progress from children
   * Returns average of all direct children's progress
   */
  calculateAggregateProgress(parentId: string): number {
    const parent = this.nodes.get(parentId);
    if (!parent) {
      throw new Error(`Parent node not found: ${parentId}`);
    }

    if (parent.children.length === 0) {
      return parent.progress;
    }

    let totalProgress = 0;
    let validChildren = 0;

    for (const childId of parent.children) {
      const child = this.nodes.get(childId);
      if (child) {
        totalProgress += child.progress;
        validChildren++;
      }
    }

    if (validChildren === 0) {
      return parent.progress;
    }

    const aggregate = Math.round(totalProgress / validChildren);
    
    // Update parent's progress to match aggregate
    parent.progress = aggregate;
    this.nodes.set(parentId, parent);

    return aggregate;
  }

  /**
   * Get full tree structure starting from root node
   */
  getTree(rootId: string): ProgressNode & { children: (ProgressNode & { children: any[] })[] } {
    const root = this.nodes.get(rootId);
    if (!root) {
      throw new Error(`Root node not found: ${rootId}`);
    }

    const buildTree = (nodeId: string): any => {
      const node = this.nodes.get(nodeId);
      if (!node) return null;

      return {
        ...node,
        children: node.children.map(childId => buildTree(childId)).filter(Boolean)
      };
    };

    return buildTree(rootId);
  }

  /**
   * Serialize all nodes to JSON
   */
  serialize(): string {
    const obj: Record<string, ProgressNode> = {};
    this.nodes.forEach((node, id) => {
      obj[id] = node;
    });
    return JSON.stringify(obj);
  }

  /**
   * Deserialize nodes from JSON
   */
  deserialize(json: string): void {
    try {
      const obj = JSON.parse(json) as Record<string, ProgressNode>;
      this.nodes.clear();
      
      Object.entries(obj).forEach(([id, node]) => {
        this.nodes.set(id, node);
      });
      
      this.notifyListeners();
    } catch (error) {
      throw new Error(`Failed to deserialize: ${error}`);
    }
  }

  /**
   * Export to format compatible with HierarchicalMeshNav component
   */
  toMeshNavFormat(): { items: MeshNavItem[] } {
    // Find root nodes (nodes that aren't children of any other node)
    const allChildren = new Set<string>();
    this.nodes.forEach(node => {
      node.children.forEach(childId => allChildren.add(childId));
    });

    const rootIds = Array.from(this.nodes.keys()).filter(id => !allChildren.has(id));

    const buildMeshItem = (nodeId: string): MeshNavItem | null => {
      const node = this.nodes.get(nodeId);
      if (!node) return null;

      return {
        id: node.id,
        label: node.label,
        status: node.status,
        progressIndicator: node.progress,
        children: node.children
          .map(childId => buildMeshItem(childId))
          .filter(Boolean) as MeshNavItem[],
        expanded: node.children.length > 0
      };
    };

    return {
      items: rootIds
        .map(id => buildMeshItem(id))
        .filter(Boolean) as MeshNavItem[]
    };
  }

  /**
   * Get overall completion percentage across all nodes
   */
  getOverallProgress(): number {
    if (this.nodes.size === 0) return 0;

    let totalProgress = 0;
    this.nodes.forEach(node => {
      totalProgress += node.progress;
    });

    return Math.round(totalProgress / this.nodes.size);
  }

  /**
   * Get completion statistics
   */
  getStats(): {
    total: number;
    pending: number;
    inProgress: number;
    complete: number;
    blocked: number;
    overallProgress: number;
  } {
    const stats = {
      total: this.nodes.size,
      pending: 0,
      inProgress: 0,
      complete: 0,
      blocked: 0,
      overallProgress: 0
    };

    this.nodes.forEach(node => {
      switch (node.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'in-progress':
          stats.inProgress++;
          break;
        case 'complete':
          stats.complete++;
          break;
        case 'blocked':
          stats.blocked++;
          break;
      }
    });

    stats.overallProgress = this.getOverallProgress();
    return stats;
  }

  /**
   * Subscribe to changes
   */
  onChange(listener: (nodes: Map<string, ProgressNode>) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Clear all nodes
   */
  clear(): void {
    this.nodes.clear();
    this.notifyListeners();
  }

  /**
   * Validate no circular reference would be created
   * @throws Error if circular reference detected
   */
  private validateNoCircularReference(newNode: ProgressNode): void {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (stack.has(nodeId)) return true; // Cycle found
      if (visited.has(nodeId)) return false; // Already checked

      visited.add(nodeId);
      stack.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) {
        for (const childId of node.children) {
          if (hasCycle(childId)) return true;
        }
      }

      stack.delete(nodeId);
      return false;
    };

    // Temporarily add new node to check for cycles
    this.nodes.set(newNode.id, newNode);
    
    const cycleExists = hasCycle(newNode.id);
    
    // Remove temporarily added node
    this.nodes.delete(newNode.id);

    if (cycleExists) {
      throw new Error('Circular reference detected');
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.nodes));
  }
}

/**
 * Global progress tracker singleton
 * Use this for application-wide progress tracking
 */
export const globalProgressTracker = new HierarchicalProgressTracker();

/**
 * Hook for React components to subscribe to progress changes
 */
export function useProgressTracker(tracker: HierarchicalProgressTracker = globalProgressTracker) {
  // This would be implemented with React hooks in a React environment
  // For now, return the tracker directly
  return {
    tracker,
    getStats: () => tracker.getStats(),
    getOverallProgress: () => tracker.getOverallProgress()
  };
}

export default HierarchicalProgressTracker;
