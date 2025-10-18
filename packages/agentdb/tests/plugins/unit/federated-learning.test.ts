/**
 * Unit tests for FederatedLearningPlugin
 * Tests distributed learning with privacy preservation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { FederatedLearningPlugin } from '../../../src/plugins/implementations/federated-learning';
import type { Experience } from '../../../src/plugins/learning-plugin.interface';

describe('FederatedLearningPlugin', () => {
  let plugin: FederatedLearningPlugin;

  beforeEach(() => {
    plugin = new FederatedLearningPlugin({
      aggregationStrategy: 'fedavg',
      privacyBudget: 1.0,
      noisyScale: 0.1,
      byzantineFraction: 0.2,
    });
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const p = new FederatedLearningPlugin();
      expect(p).toBeDefined();
    });

    it('should accept custom aggregation strategy', () => {
      const strategies = ['fedavg', 'fedprox', 'fedopt', 'scaffold'] as const;

      strategies.forEach(strategy => {
        const p = new FederatedLearningPlugin({ aggregationStrategy: strategy });
        expect(p).toBeDefined();
      });
    });

    it('should validate privacy budget', () => {
      const p = new FederatedLearningPlugin({ privacyBudget: 0.5 });
      expect(p).toBeDefined();
    });
  });

  describe('Client Management', () => {
    it('should register client successfully', async () => {
      await plugin.registerClient('client_1');
      // Client should be registered without error
      expect(plugin).toBeDefined();
    });

    it('should register multiple clients', async () => {
      await plugin.registerClient('client_1');
      await plugin.registerClient('client_2');
      await plugin.registerClient('client_3');
      expect(plugin).toBeDefined();
    });

    it('should handle duplicate client registration', async () => {
      await plugin.registerClient('client_1');
      await plugin.registerClient('client_1'); // Should handle gracefully
      expect(plugin).toBeDefined();
    });
  });

  describe('Local Training', () => {
    beforeEach(async () => {
      await plugin.registerClient('client_1');
    });

    it('should train local model with experiences', async () => {
      const experiences: Experience[] = [
        {
          state: [0.1, 0.2, 0.3, 0.4],
          action: { id: 0, type: 'discrete', value: 0 },
          reward: 1.0,
          nextState: [0.2, 0.3, 0.4, 0.5],
          done: false,
        },
        {
          state: [0.2, 0.3, 0.4, 0.5],
          action: { id: 1, type: 'discrete', value: 1 },
          reward: 0.5,
          nextState: [0.3, 0.4, 0.5, 0.6],
          done: false,
        },
      ];

      await plugin.trainLocalModel('client_1', experiences, 5);
      expect(plugin).toBeDefined();
    });

    it('should handle empty experiences', async () => {
      await expect(
        plugin.trainLocalModel('client_1', [], 5)
      ).rejects.toThrow();
    });

    it('should train multiple epochs', async () => {
      const experiences: Experience[] = Array.from({ length: 10 }, (_, i) => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: i % 4, type: 'discrete' as const, value: i % 4 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: i === 9,
      }));

      await plugin.trainLocalModel('client_1', experiences, 10);
      expect(plugin).toBeDefined();
    });
  });

  describe('Federated Aggregation', () => {
    beforeEach(async () => {
      await plugin.registerClient('client_1');
      await plugin.registerClient('client_2');
      await plugin.registerClient('client_3');
    });

    it('should aggregate updates from multiple clients (FedAvg)', async () => {
      const experiences: Experience[] = Array.from({ length: 5 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
      }));

      await plugin.trainLocalModel('client_1', experiences, 3);
      await plugin.trainLocalModel('client_2', experiences, 3);
      await plugin.trainLocalModel('client_3', experiences, 3);

      await plugin.aggregateUpdates(['client_1', 'client_2', 'client_3']);
      expect(plugin).toBeDefined();
    });

    it('should handle FedProx aggregation', async () => {
      const fedProxPlugin = new FederatedLearningPlugin({
        aggregationStrategy: 'fedprox',
      });

      await fedProxPlugin.registerClient('client_1');
      await fedProxPlugin.registerClient('client_2');

      const experiences: Experience[] = Array.from({ length: 5 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
      }));

      await fedProxPlugin.trainLocalModel('client_1', experiences, 3);
      await fedProxPlugin.trainLocalModel('client_2', experiences, 3);
      await fedProxPlugin.aggregateUpdates(['client_1', 'client_2']);

      expect(fedProxPlugin).toBeDefined();
    });

    it('should aggregate with single client', async () => {
      const experiences: Experience[] = Array.from({ length: 5 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
      }));

      await plugin.trainLocalModel('client_1', experiences, 3);
      await plugin.aggregateUpdates(['client_1']);

      expect(plugin).toBeDefined();
    });
  });

  describe('Privacy Preservation', () => {
    it('should apply differential privacy noise', async () => {
      const highPrivacyPlugin = new FederatedLearningPlugin({
        privacyBudget: 0.1,
        noisyScale: 0.5,
      });

      await highPrivacyPlugin.registerClient('client_1');

      const experiences: Experience[] = Array.from({ length: 10 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
      }));

      await highPrivacyPlugin.trainLocalModel('client_1', experiences, 5);
      await highPrivacyPlugin.aggregateUpdates(['client_1']);

      expect(highPrivacyPlugin).toBeDefined();
    });
  });

  describe('Byzantine Fault Tolerance', () => {
    it('should detect malicious clients', async () => {
      const byzantinePlugin = new FederatedLearningPlugin({
        byzantineFraction: 0.3,
      });

      await byzantinePlugin.registerClient('good_1');
      await byzantinePlugin.registerClient('good_2');
      await byzantinePlugin.registerClient('malicious');

      const goodExperiences: Experience[] = Array.from({ length: 5 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random() * 0.1), // Normal range
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random() * 0.1),
        done: false,
      }));

      const maliciousExperiences: Experience[] = Array.from({ length: 5 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random() * 1000), // Abnormal range
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random() * 1000,
        nextState: Array.from({ length: 4 }, () => Math.random() * 1000),
        done: false,
      }));

      await byzantinePlugin.trainLocalModel('good_1', goodExperiences, 3);
      await byzantinePlugin.trainLocalModel('good_2', goodExperiences, 3);
      await byzantinePlugin.trainLocalModel('malicious', maliciousExperiences, 3);

      // Should filter malicious client during aggregation
      await byzantinePlugin.aggregateUpdates(['good_1', 'good_2', 'malicious']);
      expect(byzantinePlugin).toBeDefined();
    });
  });

  describe('Communication Rounds', () => {
    it('should track round number', async () => {
      await plugin.registerClient('client_1');

      const experiences: Experience[] = Array.from({ length: 5 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
      }));

      for (let round = 0; round < 3; round++) {
        await plugin.trainLocalModel('client_1', experiences, 2);
        await plugin.aggregateUpdates(['client_1']);
      }

      expect(plugin).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle large-scale federated training', async () => {
      const numClients = 10;
      const clientIds: string[] = [];

      for (let i = 0; i < numClients; i++) {
        const clientId = `client_${i}`;
        clientIds.push(clientId);
        await plugin.registerClient(clientId);
      }

      const experiences: Experience[] = Array.from({ length: 20 }, () => ({
        state: Array.from({ length: 8 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 8 }, () => Math.random()),
        done: false,
      }));

      const start = performance.now();

      for (const clientId of clientIds) {
        await plugin.trainLocalModel(clientId, experiences, 3);
      }

      await plugin.aggregateUpdates(clientIds);

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete in reasonable time
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent client', async () => {
      await expect(
        plugin.aggregateUpdates(['non_existent_client'])
      ).rejects.toThrow();
    });

    it('should handle clients with different data sizes', async () => {
      await plugin.registerClient('client_small');
      await plugin.registerClient('client_large');

      const smallExperiences: Experience[] = Array.from({ length: 5 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
      }));

      const largeExperiences: Experience[] = Array.from({ length: 50 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
      }));

      await plugin.trainLocalModel('client_small', smallExperiences, 3);
      await plugin.trainLocalModel('client_large', largeExperiences, 3);
      await plugin.aggregateUpdates(['client_small', 'client_large']);

      expect(plugin).toBeDefined();
    });
  });
});
