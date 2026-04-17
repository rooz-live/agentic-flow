import { CrossCircleDependencyManager, CircleTask } from '../../../src/orchestration/cross-circle-dependency-manager';

describe('CrossCircleDependencyManager (ADR-026)', () => {
    let manager: CrossCircleDependencyManager;

    beforeEach(() => {
        manager = new CrossCircleDependencyManager();
    });

    it('should NOT abort disconnected sub-graphs when a critical failure occurs (Portfolio Starvation Fix)', () => {
        // Sub-graph 1: n8n classification
        manager.registerTask({ id: 'A', circle: 'Seeker', description: 'n8n fetch', dependencies: [], state: 'PENDING' });
        manager.registerTask({ id: 'B', circle: 'Analyst', description: 'parse json', dependencies: ['A'], state: 'PENDING' });

        // Sub-graph 2: HostBill deploy (Independent)
        manager.registerTask({ id: 'C', circle: 'Implementer', description: 'Deploy HostBill', dependencies: [], state: 'PENDING' });
        manager.registerTask({ id: 'D', circle: 'Testing', description: 'Test HostBill', dependencies: ['C'], state: 'PENDING' });

        manager.resolveTopology();

        // Node A critically fails
        manager.resolveTask('A', false);

        const status = manager.getStatus();

        // Node B should be aborted because it depends on A
        expect(status.find(t => t.id === 'B')?.state).toBe('ABORTED');

        // Nodes C and D MUST remain PENDING because they are an independent component
        expect(status.find(t => t.id === 'C')?.state).toBe('PENDING');
        expect(status.find(t => t.id === 'D')?.state).toBe('PENDING');
    });

    it('should allow soft dependencies to fail gracefully without aborting children (Program Starvation Fix)', () => {
        manager.registerTask({ id: 'A', circle: 'Seeker', description: 'Optional telemetry fetch', dependencies: [], state: 'PENDING', severity: 'WARNING' });
        manager.registerTask({ id: 'B', circle: 'Analyst', description: 'Analyze data', dependencies: [], softDependencies: ['A'], state: 'PENDING' });

        manager.resolveTopology();

        // Node A fails with a WARNING severity (soft fail)
        manager.resolveTask('A', false);

        const status = manager.getStatus();

        // Node B should survive because A was only a soft dependency warning
        expect(status.find(t => t.id === 'B')?.state).toBe('PENDING');
    });
});
