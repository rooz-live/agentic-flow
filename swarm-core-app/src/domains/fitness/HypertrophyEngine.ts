export interface Routine {
    type: 'PUSH' | 'PULL' | 'LEGS';
    exercises: string[];
}

export class HypertrophyEngine {
    generateRoutine(focus: 'CHEST' | 'BACK' | 'LEGS'): Routine {
        switch (focus) {
            case 'CHEST':
                return { type: 'PUSH', exercises: ['Bench Press', 'Overhead Press', 'Triceps Extension'] };
            case 'BACK':
                return { type: 'PULL', exercises: ['Pull-ups', 'Barbell Row', 'Bicep Curls'] };
            case 'LEGS':
                return { type: 'LEGS', exercises: ['Squats', 'Romanian Deadlift', 'Calf Raises'] };
        }
    }

    calculateLeanMassProjection(weeks: number, complianceRatio: number): number {
        // Ideal newbie gains ~ 0.2kg of lean mass per week
        const idealGainPerWeek = 0.2;
        return weeks * idealGainPerWeek * Math.max(0, Math.min(1, complianceRatio));
    }
}
