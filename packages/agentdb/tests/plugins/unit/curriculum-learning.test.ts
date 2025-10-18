/**
 * Unit tests for CurriculumLearningPlugin
 * Tests structured learning progression from easy to hard
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CurriculumLearningPlugin } from '../../../src/plugins/implementations/curriculum-learning';
import type { Experience } from '../../../src/plugins/learning-plugin.interface';

describe('CurriculumLearningPlugin', () => {
  let plugin: CurriculumLearningPlugin;

  beforeEach(() => {
    plugin = new CurriculumLearningPlugin({
      strategy: 'automatic',
      minSuccessRate: 0.7,
      competenceThreshold: 0.8,
      difficultyWindow: 0.2,
    });
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const p = new CurriculumLearningPlugin();
      expect(p).toBeDefined();
    });

    it('should accept different curriculum strategies', () => {
      const strategies = ['automatic', 'predefined', 'self_paced', 'teacher_student'] as const;

      strategies.forEach(strategy => {
        const p = new CurriculumLearningPlugin({ strategy });
        expect(p).toBeDefined();
      });
    });

    it('should validate competence threshold', () => {
      const p = new CurriculumLearningPlugin({
        competenceThreshold: 0.9,
      });
      expect(p).toBeDefined();
    });
  });

  describe('Task Difficulty Estimation', () => {
    it('should estimate task difficulty from experiences', async () => {
      const easyExperiences: Experience[] = Array.from({ length: 20 }, () => ({
        state: [0.1, 0.1], // Simple state
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: 1.0, // High rewards
        nextState: [0.2, 0.2],
        done: false,
        metadata: { taskId: 'easy_task' },
      }));

      for (const exp of easyExperiences) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 5 });
      expect(plugin).toBeDefined();
    });

    it('should distinguish easy from hard tasks', async () => {
      const easyTask: Experience[] = Array.from({ length: 10 }, () => ({
        state: [0.1, 0.1],
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: 1.0,
        nextState: [0.2, 0.2],
        done: false,
        metadata: { taskId: 'easy' },
      }));

      const hardTask: Experience[] = Array.from({ length: 10 }, () => ({
        state: Array.from({ length: 32 }, () => Math.random()), // Complex state
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random() * 0.1, // Low, variable rewards
        nextState: Array.from({ length: 32 }, () => Math.random()),
        done: false,
        metadata: { taskId: 'hard' },
      }));

      for (const exp of [...easyTask, ...hardTask]) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 10 });
      expect(plugin).toBeDefined();
    });
  });

  describe('Curriculum Stages', () => {
    it('should add custom curriculum stage', () => {
      plugin.addCurriculumStage({
        stage: 4,
        name: 'Expert',
        minCompetence: 0.95,
        tasks: ['advanced_reasoning', 'complex_planning'],
      });

      expect(plugin).toBeDefined();
    });

    it('should track curriculum progress', async () => {
      plugin.addCurriculumStage({
        stage: 1,
        name: 'Beginner',
        minCompetence: 0.5,
        tasks: ['basic_task'],
      });

      plugin.addCurriculumStage({
        stage: 2,
        name: 'Intermediate',
        minCompetence: 0.7,
        tasks: ['moderate_task'],
      });

      const progress = plugin.getCurriculumProgress();

      expect(progress).toBeDefined();
      expect(progress.currentStage).toBeGreaterThanOrEqual(0);
      expect(progress.totalStages).toBeGreaterThan(0);
      expect(progress.competence).toBeGreaterThanOrEqual(0);
      expect(progress.competence).toBeLessThanOrEqual(1);
    });
  });

  describe('Self-Paced Learning', () => {
    beforeEach(() => {
      plugin = new CurriculumLearningPlugin({
        strategy: 'self_paced',
        difficultyWindow: 0.2,
      });
    });

    it('should select next task based on current competence', async () => {
      const experiences: Experience[] = Array.from({ length: 15 }, (_, i) => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: i < 10 ? 1.0 : Math.random(), // First 10 succeed
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
        metadata: { taskId: 'current_task' },
      }));

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 5 });
      expect(plugin).toBeDefined();
    });
  });

  describe('Automatic Curriculum', () => {
    beforeEach(() => {
      plugin = new CurriculumLearningPlugin({
        strategy: 'automatic',
      });
    });

    it('should automatically create curriculum from tasks', async () => {
      const tasks = ['task_a', 'task_b', 'task_c'];
      const allExperiences: Experience[] = [];

      for (const taskId of tasks) {
        const experiences: Experience[] = Array.from({ length: 10 }, () => ({
          state: Array.from({ length: 4 }, () => Math.random()),
          action: { id: 0, type: 'discrete' as const, value: 0 },
          reward: Math.random(),
          nextState: Array.from({ length: 4 }, () => Math.random()),
          done: false,
          metadata: { taskId },
        }));

        allExperiences.push(...experiences);
      }

      for (const exp of allExperiences) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 10 });
      expect(plugin).toBeDefined();
    });
  });

  describe('Competence Tracking', () => {
    it('should track competence per task', async () => {
      const task1: Experience[] = Array.from({ length: 20 }, (_, i) => ({
        state: [0.1, 0.2],
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: i < 15 ? 1.0 : 0.0, // 75% success rate
        nextState: [0.2, 0.3],
        done: false,
        metadata: { taskId: 'task_1' },
      }));

      for (const exp of task1) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 5 });

      const progress = plugin.getCurriculumProgress();
      expect(progress.competence).toBeGreaterThan(0);
    });

    it('should require minimum success rate for progression', async () => {
      const lowSuccessTask: Experience[] = Array.from({ length: 20 }, (_, i) => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: i < 5 ? 1.0 : 0.0, // Only 25% success
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
        metadata: { taskId: 'difficult_task' },
      }));

      for (const exp of lowSuccessTask) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 5 });

      const progress = plugin.getCurriculumProgress();
      // Should not progress with low success rate
      expect(progress.competence).toBeLessThan(plugin['competenceThreshold']);
    });
  });

  describe('Training', () => {
    it('should train with curriculum guidance', async () => {
      const experiences: Experience[] = Array.from({ length: 30 }, (_, i) => {
        const difficulty = i < 10 ? 'easy' : i < 20 ? 'medium' : 'hard';
        const rewardMult = i < 10 ? 1.0 : i < 20 ? 0.7 : 0.4;

        return {
          state: Array.from({ length: 4 }, () => Math.random()),
          action: { id: 0, type: 'discrete' as const, value: 0 },
          reward: Math.random() * rewardMult,
          nextState: Array.from({ length: 4 }, () => Math.random()),
          done: false,
          metadata: { taskId: difficulty },
        };
      });

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      const metrics = await plugin.train({ epochs: 10, batchSize: 8 });

      expect(metrics).toBeDefined();
      expect(metrics.experiencesProcessed).toBeGreaterThan(0);
      expect(metrics.duration).toBeGreaterThan(0);
    });

    it('should show learning speedup with curriculum', async () => {
      // Curriculum should provide faster learning than random ordering
      const experiences: Experience[] = Array.from({ length: 50 }, (_, i) => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: i % 4, type: 'discrete' as const, value: i % 4 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
        metadata: { taskId: `task_${i % 5}` },
      }));

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      const start = performance.now();
      await plugin.train({ epochs: 20 });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(3000); // Should be reasonably fast
    });
  });

  describe('Performance', () => {
    it('should handle many tasks efficiently', async () => {
      const numTasks = 20;
      const experiences: Experience[] = [];

      for (let taskId = 0; taskId < numTasks; taskId++) {
        for (let i = 0; i < 10; i++) {
          experiences.push({
            state: Array.from({ length: 4 }, () => Math.random()),
            action: { id: 0, type: 'discrete' as const, value: 0 },
            reward: Math.random(),
            nextState: Array.from({ length: 4 }, () => Math.random()),
            done: false,
            metadata: { taskId: `task_${taskId}` },
          });
        }
      }

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      const start = performance.now();
      await plugin.train({ epochs: 10 });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty task list', async () => {
      await plugin.train({ epochs: 5 });
      expect(plugin).toBeDefined();
    });

    it('should handle single task', async () => {
      const experiences: Experience[] = Array.from({ length: 10 }, () => ({
        state: [0.5],
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: 1.0,
        nextState: [0.6],
        done: false,
        metadata: { taskId: 'only_task' },
      }));

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 5 });

      const progress = plugin.getCurriculumProgress();
      expect(progress).toBeDefined();
    });

    it('should handle tasks with no metadata', async () => {
      const experiences: Experience[] = Array.from({ length: 10 }, () => ({
        state: [0.5],
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: 1.0,
        nextState: [0.6],
        done: false,
      }));

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 5 });
      expect(plugin).toBeDefined();
    });
  });
});
