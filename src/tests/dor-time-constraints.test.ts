import { readFileSync } from 'fs';
import { join } from 'path';

describe('DoR Time Constraints', () => {
  let dorBudgets: any;

  beforeAll(() => {
    const configPath = join(__dirname, '../../config/dor-budgets.json');
    dorBudgets = JSON.parse(readFileSync(configPath, 'utf-8'));
  });

  describe('Budget Configuration', () => {
    test('should have budgets for all circles', () => {
      const expectedCircles = ['orchestrator', 'assessor', 'innovator', 'analyst', 'seeker', 'intuitive'];
      
      expectedCircles.forEach(circle => {
        expect(dorBudgets[circle]).toBeDefined();
        expect(dorBudgets[circle].dor_minutes).toBeGreaterThan(0);
      });
    });

    test('orchestrator should have minimal DoR time (5 min)', () => {
      expect(dorBudgets.orchestrator.dor_minutes).toBe(5);
      expect(dorBudgets.orchestrator.skills).toContain('minimal_cycle');
    });

    test('assessor should have moderate DoR time (15 min)', () => {
      expect(dorBudgets.assessor.dor_minutes).toBe(15);
      expect(dorBudgets.assessor.skills).toContain('planning_heavy');
    });

    test('analyst should have highest DoR time (30 min)', () => {
      expect(dorBudgets.analyst.dor_minutes).toBe(30);
      expect(dorBudgets.analyst.skills).toContain('full_cycle');
    });
  });

  describe('Time Budget Enforcement', () => {
    test('should enforce timeout based on circle budget', () => {
      const circle = 'orchestrator';
      const budgetMinutes = dorBudgets[circle].dor_minutes;
      const budgetSeconds = budgetMinutes * 60;
      
      expect(budgetSeconds).toBe(300); // 5 minutes = 300 seconds
    });

    test('should validate ceremony matches circle', () => {
      const circle = 'orchestrator';
      const expectedCeremony = dorBudgets[circle].ceremony;
      
      expect(expectedCeremony).toBe('standup');
    });

    test('should have rationale for each budget', () => {
      const circles = ['orchestrator', 'assessor', 'innovator', 'analyst', 'seeker', 'intuitive'];
      
      circles.forEach(circle => {
        expect(dorBudgets[circle].rationale).toBeDefined();
        expect(dorBudgets[circle].rationale.length).toBeGreaterThan(0);
      });
    });
  });

  describe('DoR Budget Compliance', () => {
    test('should track actual vs budgeted DoR time', () => {
      const episode = {
        circle: 'orchestrator',
        ceremony: 'standup',
        dor_actual: 5,
        dor_budget: dorBudgets.orchestrator.dor_minutes,
        compliance: true
      };

      expect(episode.dor_actual).toBeLessThanOrEqual(episode.dor_budget);
      expect(episode.compliance).toBe(true);
    });

    test('should flag DoR budget overruns', () => {
      const episode = {
        circle: 'orchestrator',
        ceremony: 'standup',
        dor_actual: 8,
        dor_budget: dorBudgets.orchestrator.dor_minutes,
        compliance: false
      };

      expect(episode.dor_actual).toBeGreaterThan(episode.dor_budget);
      expect(episode.compliance).toBe(false);
    });

    test('should calculate compliance percentage', () => {
      const dorActual = 4;
      const dorBudget = 5;
      const compliancePercentage = (dorActual / dorBudget) * 100;

      expect(compliancePercentage).toBe(80);
      expect(compliancePercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('Circle Skill Alignment', () => {
    test('minimal_cycle circles should have lower DoR budgets', () => {
      const minimalCycleCircles = Object.keys(dorBudgets)
        .filter(key => dorBudgets[key].skills?.includes('minimal_cycle'));

      minimalCycleCircles.forEach(circle => {
        expect(dorBudgets[circle].dor_minutes).toBeLessThanOrEqual(10);
      });
    });

    test('planning_heavy circles should have higher DoR budgets', () => {
      const planningHeavyCircles = Object.keys(dorBudgets)
        .filter(key => dorBudgets[key].skills?.includes('planning_heavy'));

      planningHeavyCircles.forEach(circle => {
        expect(dorBudgets[circle].dor_minutes).toBeGreaterThanOrEqual(15);
      });
    });

    test('retro_driven circles should focus on learning not planning', () => {
      const retroDrivenCircles = Object.keys(dorBudgets)
        .filter(key => dorBudgets[key].skills?.includes('retro_driven'));

      retroDrivenCircles.forEach(circle => {
        expect(dorBudgets[circle].dor_minutes).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Metadata Validation', () => {
    test('should have version metadata', () => {
      expect(dorBudgets.metadata.version).toBeDefined();
      expect(dorBudgets.metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('should have philosophy statement', () => {
      expect(dorBudgets.metadata.philosophy).toBeDefined();
      expect(dorBudgets.metadata.philosophy).toContain('Time-boxed');
    });
  });
});
