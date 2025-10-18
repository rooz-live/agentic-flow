/**
 * Tests for test-plugin
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestPluginPlugin } from '../src/index.mjs';
import type { PluginConfig } from 'agentdb/plugins';

describe('test-plugin', () => {
  let plugin: TestPluginPlugin;

  beforeAll(async () => {
    const config: PluginConfig = {
      // Load from plugin.yaml
    };

    plugin = new TestPluginPlugin();
    await plugin.initialize(config);
  });

  afterAll(async () => {
    await plugin.destroy();
  });

  it('should initialize correctly', () => {
    expect(plugin.name).toBe('test-plugin');
    expect(plugin.version).toBe('1.0.0');
  });

  it('should store experiences', async () => {
    const experience = {
      state: new Float32Array(768),
      action: { id: 0, type: 'discrete' },
      reward: 1.0,
      nextState: new Float32Array(768),
      done: false,
    };

    await plugin.storeExperience(experience);
  });

  it('should select actions', async () => {
    const state = new Float32Array(768);
    const action = await plugin.selectAction(state);
    expect(action).toBeDefined();
  });

  it('should train successfully', async () => {
    const metrics = await plugin.train();
    expect(metrics).toBeDefined();
  });
});
