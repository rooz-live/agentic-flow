/**
 * ADR-026: DAG Topology Relaxation & Failure Cascade Containment
 * Test-First Architecture
 * 
 * Tests for BFS-based abort, soft vs hard dependencies, and telemetry emission
 */

import { 
  DAGRelaxationOrchestrator, 
  DAGNode, 
  DependencyType,
  FailureCascadeResult 
} from './index';

describe('ADR-026: DAG Relaxation & Failure Cascade Containment', () => {
  let orchestrator: DAGRelaxationOrchestrator;

  beforeEach(() => {
    orchestrator = new DAGRelaxationOrchestrator();
  });

  describe('DAG Node Creation', () => {
    it('should create node with hard dependencies', () => {
      const node: DAGNode = {
        id: 'test-node-1',
        circle: 'Test',
        dependencies: ['dep-1', 'dep-2'],
        softDependencies: [],
        status: 'pending',
        severity: 'NORMAL',
        telemetry: {}
      };

      orchestrator.addNode(node);
      const retrieved = orchestrator.getNode('test-node-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.dependencies).toHaveLength(2);
      expect(retrieved?.softDependencies).toHaveLength(0);
    });

    it('should create node with soft dependencies', () => {
      const node: DAGNode = {
        id: 'test-node-2',
        circle: 'Test',
        dependencies: ['hard-dep'],
        softDependencies: ['soft-dep-1', 'soft-dep-2'],
        status: 'pending',
        severity: 'NORMAL',
        telemetry: {}
      };

      orchestrator.addNode(node);
      const retrieved = orchestrator.getNode('test-node-2');

      expect(retrieved?.softDependencies).toHaveLength(2);
    });

    it('should reject circular dependency', () => {
      const nodeA: DAGNode = {
        id: 'circ-a',
        circle: 'Test',
        dependencies: ['circ-b'],
        softDependencies: [],
        status: 'pending',
        severity: 'NORMAL',
        telemetry: {}
      };

      const nodeB: DAGNode = {
        id: 'circ-b',
        circle: 'Test',
        dependencies: ['circ-a'], // Creates cycle
        softDependencies: [],
        status: 'pending',
        severity: 'NORMAL',
        telemetry: {}
      };

      orchestrator.addNode(nodeA);
      expect(() => orchestrator.addNode(nodeB)).toThrow('Circular dependency detected');
    });
  });

  describe('BFS-Based Failure Cascade (Not Global)', () => {
    it('should abort only topological descendants on CRITICAL failure', () => {
      // Build DAG: A -> B -> C, A -> D (D is independent branch)
      orchestrator.addNode({
        id: 'node-a', circle: 'Test', dependencies: [],
        softDependencies: [], status: 'failed', severity: 'CRITICAL', telemetry: {}
      });
      
      orchestrator.addNode({
        id: 'node-b', circle: 'Test', dependencies: ['node-a'],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });
      
      orchestrator.addNode({
        id: 'node-c', circle: 'Test', dependencies: ['node-b'],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });
      
      orchestrator.addNode({
        id: 'node-d', circle: 'Test', dependencies: ['node-a'],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });
      
      // Add independent node E (no connection to A)
      orchestrator.addNode({
        id: 'node-e', circle: 'Test', dependencies: [],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });

      const result = orchestrator.handleFailureCascade('node-a');

      // B and C should be aborted (descendants of A)
      expect(result.abortedNodes).toContain('node-b');
      expect(result.abortedNodes).toContain('node-c');
      
      // D should also be aborted (direct dependent of A)
      expect(result.abortedNodes).toContain('node-d');
      
      // E should NOT be aborted (disconnected sub-graph)
      expect(result.abortedNodes).not.toContain('node-e');
      
      // Telemetry should be emitted
      expect(result.telemetryPayload).toBeDefined();
      expect(result.telemetryPayload.abortedCount).toBe(3);
    });

    it('should NOT use global kill-switch (no failureCascade=true)', () => {
      // Add many nodes across different circles
      for (let i = 0; i < 10; i++) {
        orchestrator.addNode({
          id: `isolated-${i}`,
          circle: i < 5 ? 'Circle-A' : 'Circle-B',
          dependencies: [],
          softDependencies: [],
          status: 'pending',
          severity: 'NORMAL',
          telemetry: {}
        });
      }

      // Add failing node in Circle-A
      orchestrator.addNode({
        id: 'failing-node',
        circle: 'Circle-A',
        dependencies: ['isolated-0'],
        softDependencies: [],
        status: 'failed',
        severity: 'CRITICAL',
        telemetry: {}
      });

      const result = orchestrator.handleFailureCascade('failing-node');
      
      // Should NOT abort all 10 nodes globally
      expect(result.abortedNodes.length).toBeLessThan(5);
      
      // Should only abort descendants
      const failingNode = orchestrator.getNode('failing-node');
      expect(failingNode?.status).toBe('failed');
    });

    it('should preserve disconnected sub-graphs during failure', () => {
      // Create two disconnected sub-graphs
      // Sub-graph 1: 1 -> 2 -> 3
      orchestrator.addNode({
        id: 'sg1-1', circle: 'Test', dependencies: [],
        softDependencies: [], status: 'running', severity: 'NORMAL', telemetry: {}
      });
      orchestrator.addNode({
        id: 'sg1-2', circle: 'Test', dependencies: ['sg1-1'],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });
      orchestrator.addNode({
        id: 'sg1-3', circle: 'Test', dependencies: ['sg1-2'],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });

      // Sub-graph 2: A -> B -> C (completely disconnected)
      orchestrator.addNode({
        id: 'sg2-a', circle: 'Test', dependencies: [],
        softDependencies: [], status: 'running', severity: 'NORMAL', telemetry: {}
      });
      orchestrator.addNode({
        id: 'sg2-b', circle: 'Test', dependencies: ['sg2-a'],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });
      orchestrator.addNode({
        id: 'sg2-c', circle: 'Test', dependencies: ['sg2-b'],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });

      // Fail node in sub-graph 1
      orchestrator.updateNodeStatus('sg1-2', 'failed', 'CRITICAL');
      const result = orchestrator.handleFailureCascade('sg1-2');

      // Sub-graph 1: sg1-3 should be aborted
      expect(result.abortedNodes).toContain('sg1-3');
      
      // Sub-graph 2: NO nodes should be aborted (disconnected)
      expect(result.abortedNodes).not.toContain('sg2-a');
      expect(result.abortedNodes).not.toContain('sg2-b');
      expect(result.abortedNodes).not.toContain('sg2-c');
    });
  });

  describe('Soft vs Hard Dependencies', () => {
    it('should allow execution when soft dependency fails', () => {
      // Node A has hard dep on B, soft dep on C
      orchestrator.addNode({
        id: 'node-b', circle: 'Test', dependencies: [],
        softDependencies: [], status: 'complete', severity: 'NORMAL', telemetry: {}
      });
      
      orchestrator.addNode({
        id: 'node-c', circle: 'Test', dependencies: [],
        softDependencies: [], status: 'failed', severity: 'WARNING', telemetry: {}
      });
      
      orchestrator.addNode({
        id: 'node-a', circle: 'Test', dependencies: ['node-b'],
        softDependencies: ['node-c'], // Soft dependency on C
        status: 'pending', severity: 'NORMAL', telemetry: {}
      });

      // A should be allowed to execute (B is complete, C failure is warning only)
      const canExecute = orchestrator.canExecute('node-a');
      expect(canExecute.allowed).toBe(true);
      expect(canExecute.warnings).toContain('Soft dependency node-c failed');
    });

    it('should block execution when hard dependency fails', () => {
      orchestrator.addNode({
        id: 'hard-fail', circle: 'Test', dependencies: [],
        softDependencies: [], status: 'failed', severity: 'CRITICAL', telemetry: {}
      });
      
      orchestrator.addNode({
        id: 'dependent', circle: 'Test', dependencies: ['hard-fail'],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });

      const canExecute = orchestrator.canExecute('dependent');
      expect(canExecute.allowed).toBe(false);
      expect(canExecute.reason).toContain('Hard dependency hard-fail failed');
    });

    it('should emit telemetry warning for soft dependency failure', () => {
      orchestrator.addNode({
        id: 'soft-dep', circle: 'Test', dependencies: [],
        softDependencies: [], status: 'failed', severity: 'WARNING', telemetry: {}
      });
      
      orchestrator.addNode({
        id: 'soft-dependent', circle: 'Test', dependencies: [],
        softDependencies: ['soft-dep'], status: 'pending', severity: 'NORMAL', telemetry: {}
      });

      orchestrator.canExecute('soft-dependent');
      
      const telemetry = orchestrator.getTelemetry();
      expect(telemetry.warnings).toBeDefined();
      expect(telemetry.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Active Telemetry Emission', () => {
    it('should emit structured JSON for /loop ingestion', () => {
      orchestrator.addNode({
        id: 'telemetry-test', circle: 'Test', dependencies: [],
        softDependencies: [], status: 'failed', severity: 'CRITICAL', telemetry: {}
      });

      orchestrator.addNode({
        id: 'child-1', circle: 'Test', dependencies: ['telemetry-test'],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });

      const result = orchestrator.handleFailureCascade('telemetry-test');

      // Verify telemetry payload structure
      expect(result.telemetryPayload).toMatchObject({
        source: 'DAGRelaxationOrchestrator',
        event: 'failureCascade',
        triggerNode: 'telemetry-test',
        timestamp: expect.any(String),
        abortedCount: expect.any(Number),
        abortedNodes: expect.any(Array),
        survivingSubgraphs: expect.any(Array),
        opexSavings: expect.any(Number) // API cost saved by not executing doomed nodes
      });
    });

    it('should include OPEX savings calculation in telemetry', () => {
      // Create chain: A(failed) -> B -> C -> D
      orchestrator.addNode({
        id: 'opex-a', circle: 'Test', dependencies: [],
        softDependencies: [], status: 'failed', severity: 'CRITICAL', telemetry: {}
      });
      
      ['opex-b', 'opex-c', 'opex-d'].forEach((id, i, arr) => {
        orchestrator.addNode({
          id, circle: 'Test', dependencies: [i === 0 ? 'opex-a' : arr[i-1]],
          softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
        });
      });

      const result = orchestrator.handleFailureCascade('opex-a');
      
      // OPEX savings should be calculated (3 nodes * estimated cost per node)
      expect(result.telemetryPayload.opexSavings).toBeGreaterThan(0);
      expect(result.telemetryPayload.opexSavings).toBeGreaterThanOrEqual(3);
    });

    it('should emit survival data for edge nodes', () => {
      // Create complex graph with multiple edge nodes
      orchestrator.addNode({
        id: 'root-fail', circle: 'Test', dependencies: [],
        softDependencies: [], status: 'failed', severity: 'CRITICAL', telemetry: {}
      });

      // Create branches
      for (let i = 0; i < 3; i++) {
        orchestrator.addNode({
          id: `branch-${i}`, circle: 'Test', dependencies: ['root-fail'],
          softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
        });
        
        orchestrator.addNode({
          id: `edge-${i}`, circle: 'Test', dependencies: [`branch-${i}`],
          softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
        });
      }

      const result = orchestrator.handleFailureCascade('root-fail');
      
      // Telemetry should include edge node survival data
      expect(result.telemetryPayload.edgeNodes).toBeDefined();
      expect(result.telemetryPayload.edgeNodes.length).toBe(3);
    });
  });

  describe('Topological Sorting (Kahn Algorithm)', () => {
    it('should return correct execution order', () => {
      // Create DAG: A -> B -> D, A -> C -> D
      orchestrator.addNode({
        id: 'kahn-a', circle: 'Test', dependencies: [],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });
      orchestrator.addNode({
        id: 'kahn-b', circle: 'Test', dependencies: ['kahn-a'],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });
      orchestrator.addNode({
        id: 'kahn-c', circle: 'Test', dependencies: ['kahn-a'],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });
      orchestrator.addNode({
        id: 'kahn-d', circle: 'Test', dependencies: ['kahn-b', 'kahn-c'],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });

      const executionOrder = orchestrator.getExecutionOrder();
      
      // A must come first
      expect(executionOrder[0]).toBe('kahn-a');
      
      // D must come last
      expect(executionOrder[executionOrder.length - 1]).toBe('kahn-d');
      
      // B and C must come after A, before D
      const indexA = executionOrder.indexOf('kahn-a');
      const indexB = executionOrder.indexOf('kahn-b');
      const indexC = executionOrder.indexOf('kahn-c');
      const indexD = executionOrder.indexOf('kahn-d');
      
      expect(indexB).toBeGreaterThan(indexA);
      expect(indexC).toBeGreaterThan(indexA);
      expect(indexD).toBeGreaterThan(indexB);
      expect(indexD).toBeGreaterThan(indexC);
    });

    it('should detect cycles and throw', () => {
      orchestrator.addNode({
        id: 'cycle-1', circle: 'Test', dependencies: ['cycle-2'],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });
      orchestrator.addNode({
        id: 'cycle-2', circle: 'Test', dependencies: ['cycle-3'],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });
      orchestrator.addNode({
        id: 'cycle-3', circle: 'Test', dependencies: ['cycle-1'], // Creates cycle
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });

      expect(() => orchestrator.getExecutionOrder()).toThrow('Cycle detected in DAG');
    });
  });

  describe('Asynchronous Horizontal Speed', () => {
    it('should identify parallelizable nodes', () => {
      // Create multiple independent branches
      for (let i = 0; i < 3; i++) {
        orchestrator.addNode({
          id: `parallel-root-${i}`, circle: 'Test', dependencies: [],
          softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
        });
        
        orchestrator.addNode({
          id: `parallel-child-${i}`, circle: 'Test', dependencies: [`parallel-root-${i}`],
          softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
        });
      }

      const waves = orchestrator.getParallelExecutionWaves();
      
      // All 3 roots should be in wave 1
      expect(waves[0]).toHaveLength(3);
      expect(waves[0]).toContain('parallel-root-0');
      expect(waves[0]).toContain('parallel-root-1');
      expect(waves[0]).toContain('parallel-root-2');
      
      // All 3 children should be in wave 2
      expect(waves[1]).toHaveLength(3);
    });

    it('should maximize parallel execution within constraints', () => {
      // Complex graph with multiple parallel paths
      orchestrator.addNode({
        id: 'parallel-start', circle: 'Test', dependencies: [],
        softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
      });

      // Create 5 parallel branches
      for (let i = 0; i < 5; i++) {
        orchestrator.addNode({
          id: `branch-${i}`, circle: 'Test', dependencies: ['parallel-start'],
          softDependencies: [], status: 'pending', severity: 'NORMAL', telemetry: {}
        });
      }

      const parallelGroups = orchestrator.getParallelizableGroups();
      
      // All 5 branches should be parallelizable after start completes
      expect(parallelGroups.length).toBeGreaterThan(0);
      expect(parallelGroups[0].length).toBe(5);
    });
  });
});
