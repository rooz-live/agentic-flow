import { RefactorLoopEngine } from '../../swarm-core-app/src/domains/refactorloop/RefactorLoopEngine';

describe('RefactorLoopEngine DDD Model', () => {
    it('should initialize and return physical diagnostic state', () => {
        const engine = new RefactorLoopEngine();
        const state = engine.getDiagnostics();
        expect(state.status).toBe('OPERATIONAL');
        expect(state.entropy).toBeLessThan(0.1);
    });
});
