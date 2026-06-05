/**
 * ADR-001: Hierarchical Progress Tracking - Test First
 * 
 * Tests for hierarchical mesh navigation with progress indicators
 */

import { HierarchicalProgressTracker, ProgressNode } from './index';

describe('ADR-001: Hierarchical Progress Tracking', () => {
  let tracker: HierarchicalProgressTracker;

  beforeEach(() => {
    tracker = new HierarchicalProgressTracker();
  });

  describe('Progress Node Creation', () => {
    it('should create a progress node with required fields', () => {
      const node: ProgressNode = {
        id: 'test-node-1',
        label: 'Test Node',
        status: 'pending',
        progress: 0,
        children: []
      };

      tracker.addNode(node);
      const retrieved = tracker.getNode('test-node-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.label).toBe('Test Node');
      expect(retrieved?.status).toBe('pending');
    });

    it('should enforce progress values between 0 and 100', () => {
      const node: ProgressNode = {
        id: 'test-node-2',
        label: 'Progress Test',
        status: 'in-progress',
        progress: 150, // Invalid - should be clamped or rejected
        children: []
      };

      // Should throw or clamp
      expect(() => tracker.addNode(node)).toThrow('Progress must be between 0 and 100');
    });

    it('should reject negative progress values', () => {
      const node: ProgressNode = {
        id: 'test-node-3',
        label: 'Negative Progress',
        status: 'in-progress',
        progress: -10,
        children: []
      };

      expect(() => tracker.addNode(node)).toThrow('Progress must be between 0 and 100');
    });
  });

  describe('Hierarchical Structure', () => {
    it('should create parent-child relationships', () => {
      const parent: ProgressNode = {
        id: 'parent',
        label: 'Parent Node',
        status: 'in-progress',
        progress: 50,
        children: ['child-1', 'child-2']
      };

      const child1: ProgressNode = {
        id: 'child-1',
        label: 'Child 1',
        status: 'complete',
        progress: 100,
        children: []
      };

      const child2: ProgressNode = {
        id: 'child-2',
        label: 'Child 2',
        status: 'pending',
        progress: 0,
        children: []
      };

      tracker.addNode(parent);
      tracker.addNode(child1);
      tracker.addNode(child2);

      const tree = tracker.getTree('parent');
      expect(tree.children).toHaveLength(2);
      expect(tree.children[0].id).toBe('child-1');
      expect(tree.children[1].id).toBe('child-2');
    });

    it('should calculate aggregate progress from children', () => {
      // Parent with 2 children: one 100% complete, one 0% complete
      // Expected aggregate: 50%
      
      const parent: ProgressNode = {
        id: 'aggregate-parent',
        label: 'Aggregate Parent',
        status: 'in-progress',
        progress: 0, // Will be calculated
        children: ['agg-child-1', 'agg-child-2']
      };

      const child1: ProgressNode = {
        id: 'agg-child-1',
        label: 'Complete Child',
        status: 'complete',
        progress: 100,
        children: []
      };

      const child2: ProgressNode = {
        id: 'agg-child-2',
        label: 'Pending Child',
        status: 'pending',
        progress: 0,
        children: []
      };

      tracker.addNode(parent);
      tracker.addNode(child1);
      tracker.addNode(child2);

      const aggregate = tracker.calculateAggregateProgress('aggregate-parent');
      expect(aggregate).toBe(50);
    });

    it('should detect circular references and throw', () => {
      // A -> B -> C -> A (circular)
      const nodeA: ProgressNode = {
        id: 'circular-a',
        label: 'Node A',
        status: 'pending',
        progress: 0,
        children: ['circular-b']
      };

      const nodeB: ProgressNode = {
        id: 'circular-b',
        label: 'Node B',
        status: 'pending',
        progress: 0,
        children: ['circular-c']
      };

      const nodeC: ProgressNode = {
        id: 'circular-c',
        label: 'Node C',
        status: 'pending',
        progress: 0,
        children: ['circular-a'] // Creates cycle
      };

      tracker.addNode(nodeA);
      tracker.addNode(nodeB);
      
      // Adding C should detect the circular reference
      expect(() => tracker.addNode(nodeC)).toThrow('Circular reference detected');
    });
  });

  describe('Status Transitions', () => {
    it('should transition from pending to in-progress', () => {
      const node: ProgressNode = {
        id: 'transition-test',
        label: 'Transition Test',
        status: 'pending',
        progress: 0,
        children: []
      };

      tracker.addNode(node);
      tracker.updateStatus('transition-test', 'in-progress');

      const updated = tracker.getNode('transition-test');
      expect(updated?.status).toBe('in-progress');
    });

    it('should auto-complete when progress reaches 100', () => {
      const node: ProgressNode = {
        id: 'auto-complete',
        label: 'Auto Complete Test',
        status: 'in-progress',
        progress: 99,
        children: []
      };

      tracker.addNode(node);
      tracker.updateProgress('auto-complete', 100);

      const updated = tracker.getNode('auto-complete');
      expect(updated?.status).toBe('complete');
      expect(updated?.progress).toBe(100);
    });

    it('should not allow transition from complete back to pending', () => {
      const node: ProgressNode = {
        id: 'no-regress',
        label: 'No Regression',
        status: 'complete',
        progress: 100,
        children: []
      };

      tracker.addNode(node);
      
      // Should throw - can't go back from complete
      expect(() => tracker.updateStatus('no-regress', 'pending')).toThrow(
        'Cannot transition from complete to pending'
      );
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const node: ProgressNode = {
        id: 'serialize-test',
        label: 'Serialize Test',
        status: 'in-progress',
        progress: 75,
        children: []
      };

      tracker.addNode(node);
      const json = tracker.serialize();

      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed['serialize-test']).toBeDefined();
      expect(parsed['serialize-test'].progress).toBe(75);
    });

    it('should deserialize from JSON', () => {
      const json = JSON.stringify({
        'deser-test': {
          id: 'deser-test',
          label: 'Deserialize Test',
          status: 'complete',
          progress: 100,
          children: []
        }
      });

      tracker.deserialize(json);
      const node = tracker.getNode('deser-test');

      expect(node).toBeDefined();
      expect(node?.status).toBe('complete');
      expect(node?.progress).toBe(100);
    });
  });

  describe('Integration with HierarchicalMeshNav', () => {
    it('should export data formatted for HierarchicalMeshNav component', () => {
      const root: ProgressNode = {
        id: 'mesh-root',
        label: 'Root',
        status: 'in-progress',
        progress: 60,
        children: ['mesh-child']
      };

      const child: ProgressNode = {
        id: 'mesh-child',
        label: 'Child',
        status: 'complete',
        progress: 100,
        children: []
      };

      tracker.addNode(root);
      tracker.addNode(child);

      const meshData = tracker.toMeshNavFormat();
      
      expect(meshData).toHaveProperty('items');
      expect(meshData.items).toHaveLength(1);
      expect(meshData.items[0].label).toBe('Root');
      expect(meshData.items[0].children).toHaveLength(1);
    });

    it('should include progress indicators in mesh format', () => {
      const node: ProgressNode = {
        id: 'progress-indicator',
        label: 'With Indicator',
        status: 'in-progress',
        progress: 45,
        children: []
      };

      tracker.addNode(node);
      const meshData = tracker.toMeshNavFormat();

      expect(meshData.items[0]).toHaveProperty('progressIndicator');
      expect(meshData.items[0].progressIndicator).toBe(45);
    });
  });
});
