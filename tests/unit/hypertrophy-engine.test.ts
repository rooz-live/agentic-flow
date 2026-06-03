import { HypertrophyEngine } from '../../swarm-core-app/src/domains/fitness/HypertrophyEngine';

describe('HypertrophyEngine DDD Model', () => {
    it('should generate PUSH routine for Chest/Triceps focus', () => {
        const engine = new HypertrophyEngine();
        const routine = engine.generateRoutine('CHEST');
        expect(routine.type).toBe('PUSH');
        expect(routine.exercises).toContain('Bench Press');
    });

    it('should generate PULL routine for Back/Biceps focus', () => {
        const engine = new HypertrophyEngine();
        const routine = engine.generateRoutine('BACK');
        expect(routine.type).toBe('PULL');
        expect(routine.exercises).toContain('Pull-ups');
    });

    it('should generate LEGS routine for Legs focus', () => {
        const engine = new HypertrophyEngine();
        const routine = engine.generateRoutine('LEGS');
        expect(routine.type).toBe('LEGS');
        expect(routine.exercises).toContain('Squats');
    });

    it('should calculate projected lean mass based on weeks of compliance', () => {
        const engine = new HypertrophyEngine();
        const projection = engine.calculateLeanMassProjection(12, 0.9); 
        expect(projection).toBeCloseTo(2.16);
    });
});
