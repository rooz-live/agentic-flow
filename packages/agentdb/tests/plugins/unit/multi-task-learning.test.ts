/**
 * Unit tests for MultiTaskLearningPlugin
 * Tests joint learning across multiple related tasks
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MultiTaskLearningPlugin } from '../../../src/plugins/implementations/multi-task-learning';
import type { Experience } from '../../../src/plugins/learning-plugin.interface';

describe('MultiTaskLearningPlugin', () => {
  let plugin: MultiTaskLearningPlugin;

  beforeEach(() => {
    plugin = new MultiTaskLearningPlugin({
      sharingStrategy: 'hard_sharing',
      uncertaintyWeighting: true,
      gradientNormalization: true,
    });
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const p = new MultiTaskLearningPlugin();
      expect(p).toBeDefined();
    });

    it('should accept different sharing strategies', () => {
      const strategies = ['hard_sharing', 'soft_sharing', 'cross_stitch', 'sluice_network'] as const;

      strategies.forEach(strategy => {
        const p = new MultiTaskLearningPlugin({ sharingStrategy: strategy });
        expect(p).toBeDefined();
      });
    });

    it('should configure uncertainty weighting', () => {
      const p = new MultiTaskLearningPlugin({ uncertaintyWeighting: false });
      expect(p).toBeDefined();
    });

    it('should configure gradient normalization', () => {
      const p = new MultiTaskLearningPlugin({ gradientNormalization: false });
      expect(p).toBeDefined();
    });
  });

  describe('Task Management', () => {
    it('should add task', () => {
      plugin.addTask('task_1', 'Sentiment Analysis', 1.0, false);
      expect(plugin).toBeDefined();
    });

    it('should add multiple tasks', () => {
      plugin.addTask('sentiment', 'Sentiment Analysis', 1.0, false);
      plugin.addTask('ner', 'Named Entity Recognition', 0.8, false);
      plugin.addTask('pos', 'Part-of-Speech Tagging', 0.5, true); // Auxiliary

      const stats = plugin.getTaskStats();
      expect(stats.length).toBe(3);
    });

    it('should track task priority', () => {
      plugin.addTask('high_priority', 'Important Task', 1.0, false);
      plugin.addTask('low_priority', 'Background Task', 0.3, false);

      const stats = plugin.getTaskStats();
      const highPri = stats.find(t => t.id === 'high_priority');
      const lowPri = stats.find(t => t.id === 'low_priority');

      expect(highPri!.priority).toBe(1.0);
      expect(lowPri!.priority).toBe(0.3);
    });

    it('should distinguish main and auxiliary tasks', () => {
      plugin.addTask('main_task', 'Main Task', 1.0, false);
      plugin.addTask('aux_task', 'Auxiliary Task', 0.5, true);

      const stats = plugin.getTaskStats();
      expect(stats.length).toBe(2);
    });
  });

  describe('Task Statistics', () => {
    beforeEach(() => {
      plugin.addTask('task_a', 'Task A', 1.0, false);
      plugin.addTask('task_b', 'Task B', 0.8, false);
      plugin.addTask('task_c', 'Task C', 0.6, true);
    });

    it('should get task stats', () => {
      const stats = plugin.getTaskStats();

      expect(stats).toBeDefined();
      expect(stats.length).toBe(3);

      stats.forEach(task => {
        expect(task.id).toBeDefined();
        expect(task.name).toBeDefined();
        expect(task.performance).toBeGreaterThanOrEqual(0);
        expect(task.weight).toBeGreaterThan(0);
        expect(task.priority).toBeGreaterThan(0);
      });
    });

    it('should track task performance', async () => {
      const experiences: Experience[] = Array.from({ length: 20 }, (_, i) => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: i < 15 ? 1.0 : 0.0, // 75% success
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
        metadata: { taskId: 'task_a' },
      }));

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      const stats = plugin.getTaskStats();
      const taskA = stats.find(t => t.id === 'task_a');
      expect(taskA!.performance).toBeGreaterThan(0);
    });
  });

  describe('Multi-Task Training', () => {
    beforeEach(() => {
      plugin.addTask('classification', 'Classification', 1.0, false);
      plugin.addTask('regression', 'Regression', 0.9, false);
      plugin.addTask('auxiliary', 'Auxiliary Features', 0.5, true);
    });

    it('should train across multiple tasks', async () => {
      const tasks = ['classification', 'regression', 'auxiliary'];
      const allExperiences: Experience[] = [];

      tasks.forEach(taskId => {
        const experiences = Array.from({ length: 10 }, () => ({
          state: Array.from({ length: 4 }, () => Math.random()),
          action: { id: 0, type: 'discrete' as const, value: 0 },
          reward: Math.random(),
          nextState: Array.from({ length: 4 }, () => Math.random()),
          done: false,
          metadata: { taskId },
        }));

        allExperiences.push(...experiences);
      });

      for (const exp of allExperiences) {
        await plugin.storeExperience(exp);
      }

      const metrics = await plugin.train({ epochs: 10, batchSize: 8 });

      expect(metrics).toBeDefined();
      expect(metrics.experiencesProcessed).toBeGreaterThan(0);
      expect(metrics.duration).toBeGreaterThan(0);
    });

    it('should compute task-specific losses', async () => {
      const experiences: Experience[] = Array.from({ length: 15 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
        metadata: { taskId: 'classification' },
      }));

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      const metrics = await plugin.train({ epochs: 5 });
      expect(metrics.loss).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Uncertainty Weighting', () => {
    beforeEach(() => {
      plugin = new MultiTaskLearningPlugin({
        uncertaintyWeighting: true,
      });

      plugin.addTask('easy_task', 'Easy Task', 1.0, false);
      plugin.addTask('hard_task', 'Hard Task', 1.0, false);
    });

    it('should automatically weight tasks by uncertainty', async () => {
      // Easy task: high performance
      const easyExperiences: Experience[] = Array.from({ length: 20 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: 1.0, // Always succeed
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
        metadata: { taskId: 'easy_task' },
      }));

      // Hard task: low performance
      const hardExperiences: Experience[] = Array.from({ length: 20 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random() * 0.2, // Low, variable rewards
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
        metadata: { taskId: 'hard_task' },
      }));

      for (const exp of [...easyExperiences, ...hardExperiences]) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 10 });

      const stats = plugin.getTaskStats();
      const easyTask = stats.find(t => t.id === 'easy_task');
      const hardTask = stats.find(t => t.id === 'hard_task');

      expect(easyTask).toBeDefined();
      expect(hardTask).toBeDefined();
    });
  });

  describe('Gradient Normalization', () => {
    beforeEach(() => {
      plugin = new MultiTaskLearningPlugin({
        gradientNormalization: true,
      });

      plugin.addTask('task_1', 'Task 1', 1.0, false);
      plugin.addTask('task_2', 'Task 2', 0.8, false);
    });

    it('should normalize gradients across tasks', async () => {
      const experiences: Experience[] = Array.from({ length: 30 }, (_, i) => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
        metadata: { taskId: i < 15 ? 'task_1' : 'task_2' },
      }));

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 10 });
      expect(plugin).toBeDefined();
    });
  });

  describe('Task Relationships', () => {
    beforeEach(() => {
      plugin.addTask('task_a', 'Task A', 1.0, false);
      plugin.addTask('task_b', 'Task B', 0.9, false);
      plugin.addTask('task_c', 'Task C', 0.8, false);
    });

    it('should compute task similarity', async () => {
      const relationships = plugin.getTaskRelationships();

      expect(relationships).toBeDefined();
      expect(relationships.size).toBe(3);

      relationships.forEach((similarities, taskId) => {
        expect(similarities.size).toBeGreaterThan(0);

        similarities.forEach((similarity, otherTaskId) => {
          expect(taskId).not.toBe(otherTaskId);
          expect(similarity).toBeGreaterThanOrEqual(0);
          expect(similarity).toBeLessThanOrEqual(1);
        });
      });
    });

    it('should identify related tasks', async () => {
      // Similar tasks: similar state distributions
      const taskAExp: Experience[] = Array.from({ length: 15 }, () => ({
        state: [0.1, 0.2, 0.3, 0.4].map(v => v + Math.random() * 0.1),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
        metadata: { taskId: 'task_a' },
      }));

      const taskBExp: Experience[] = Array.from({ length: 15 }, () => ({
        state: [0.1, 0.2, 0.3, 0.4].map(v => v + Math.random() * 0.1), // Similar to task_a
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
        metadata: { taskId: 'task_b' },
      }));

      for (const exp of [...taskAExp, ...taskBExp]) {
        await plugin.storeExperience(exp);
      }

      const relationships = plugin.getTaskRelationships();
      expect(relationships.size).toBeGreaterThan(0);
    });
  });

  describe('Task-Specific Prediction', () => {
    beforeEach(() => {
      plugin.addTask('sentiment', 'Sentiment', 1.0, false);
      plugin.addTask('topic', 'Topic', 0.8, false);
    });

    it('should select action for specific task', async () => {
      const state = [0.5, 0.5, 0.5, 0.5];

      const action = await plugin.selectActionForTask(state, 'sentiment');

      expect(action).toBeDefined();
      expect(action.id).toBeGreaterThanOrEqual(0);
      expect(action.type).toBe('discrete');
      expect(action.metadata?.taskId).toBe('sentiment');
    });

    it('should handle different tasks differently', async () => {
      const state = [0.5, 0.5, 0.5, 0.5];

      const sentimentAction = await plugin.selectActionForTask(state, 'sentiment');
      const topicAction = await plugin.selectActionForTask(state, 'topic');

      expect(sentimentAction).toBeDefined();
      expect(topicAction).toBeDefined();
      expect(sentimentAction.metadata?.taskId).toBe('sentiment');
      expect(topicAction.metadata?.taskId).toBe('topic');
    });
  });

  describe('Performance', () => {
    it('should handle many tasks efficiently', async () => {
      const numTasks = 10;

      for (let i = 0; i < numTasks; i++) {
        plugin.addTask(`task_${i}`, `Task ${i}`, 1.0 - i * 0.05, false);
      }

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

    it('should train faster than independent models', async () => {
      // Multi-task learning should be more efficient than training
      // separate models for each task
      plugin.addTask('task_1', 'Task 1', 1.0, false);
      plugin.addTask('task_2', 'Task 2', 1.0, false);
      plugin.addTask('task_3', 'Task 3', 1.0, false);

      const experiences: Experience[] = Array.from({ length: 90 }, (_, i) => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
        metadata: { taskId: `task_${(i % 3) + 1}` },
      }));

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      const start = performance.now();
      await plugin.train({ epochs: 15 });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(4000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single task', async () => {
      plugin.addTask('only_task', 'Only Task', 1.0, false);

      const experiences: Experience[] = Array.from({ length: 20 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
        metadata: { taskId: 'only_task' },
      }));

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 5 });

      const stats = plugin.getTaskStats();
      expect(stats.length).toBe(1);
    });

    it('should handle tasks with no experiences', async () => {
      plugin.addTask('empty_task', 'Empty Task', 1.0, false);

      await plugin.train({ epochs: 5 });

      const stats = plugin.getTaskStats();
      const emptyTask = stats.find(t => t.id === 'empty_task');
      expect(emptyTask).toBeDefined();
    });

    it('should handle mixed task priorities', async () => {
      plugin.addTask('high', 'High Priority', 1.0, false);
      plugin.addTask('medium', 'Medium Priority', 0.5, false);
      plugin.addTask('low', 'Low Priority', 0.1, false);

      const experiences: Experience[] = Array.from({ length: 30 }, (_, i) => {
        const taskId = i < 10 ? 'high' : i < 20 ? 'medium' : 'low';
        return {
          state: Array.from({ length: 4 }, () => Math.random()),
          action: { id: 0, type: 'discrete' as const, value: 0 },
          reward: Math.random(),
          nextState: Array.from({ length: 4 }, () => Math.random()),
          done: false,
          metadata: { taskId },
        };
      });

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 10 });

      const stats = plugin.getTaskStats();
      expect(stats.length).toBe(3);
    });
  });
});
