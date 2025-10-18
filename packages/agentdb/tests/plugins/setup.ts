/**
 * Test setup and utilities for plugin system tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock SQLiteVectorDB for unit tests
export class MockSQLiteVectorDB {
  private data: Map<string, any> = new Map();
  private metadata: Map<string, any> = new Map();

  async insert(vector: number[], metadata?: any): Promise<string> {
    const id = Math.random().toString(36).substring(7);
    this.data.set(id, vector);
    if (metadata) {
      this.metadata.set(id, metadata);
    }
    return id;
  }

  async search(vector: number[], k: number = 5): Promise<Array<{ id: string; distance: number; metadata?: any }>> {
    const results = Array.from(this.data.entries()).map(([id, vec]) => ({
      id,
      distance: this.euclideanDistance(vector, vec),
      metadata: this.metadata.get(id),
    }));
    return results.sort((a, b) => a.distance - b.distance).slice(0, k);
  }

  async update(id: string, vector: number[], metadata?: any): Promise<void> {
    if (!this.data.has(id)) {
      throw new Error(`Vector with id ${id} not found`);
    }
    this.data.set(id, vector);
    if (metadata) {
      this.metadata.set(id, metadata);
    }
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
    this.metadata.delete(id);
  }

  async get(id: string): Promise<{ vector: number[]; metadata?: any } | null> {
    const vector = this.data.get(id);
    if (!vector) return null;
    return {
      vector,
      metadata: this.metadata.get(id),
    };
  }

  async clear(): Promise<void> {
    this.data.clear();
    this.metadata.clear();
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }
}

// Test data generators
export function generateTrainingData(samples: number, dimensions: number): Array<{
  state: number[];
  action: number;
  reward: number;
  nextState: number[];
}> {
  const data = [];
  for (let i = 0; i < samples; i++) {
    data.push({
      state: Array.from({ length: dimensions }, () => Math.random()),
      action: Math.floor(Math.random() * 4), // 4 possible actions
      reward: Math.random() * 10 - 5, // Rewards between -5 and 5
      nextState: Array.from({ length: dimensions }, () => Math.random()),
    });
  }
  return data;
}

export function generateClassificationData(samples: number, dimensions: number, classes: number): Array<{
  features: number[];
  label: number;
}> {
  const data = [];
  for (let i = 0; i < samples; i++) {
    data.push({
      features: Array.from({ length: dimensions }, () => Math.random()),
      label: Math.floor(Math.random() * classes),
    });
  }
  return data;
}

// Performance measurement utilities
export class PerformanceTimer {
  private startTime: number = 0;
  private endTime: number = 0;

  start(): void {
    this.startTime = performance.now();
  }

  stop(): number {
    this.endTime = performance.now();
    return this.getDuration();
  }

  getDuration(): number {
    return this.endTime - this.startTime;
  }
}

export function measureMemory(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  return 0;
}

// Assertion helpers
export function assertValidPlugin(plugin: any): void {
  expect(plugin).toBeDefined();
  expect(plugin.name).toBeDefined();
  expect(plugin.version).toBeDefined();
  expect(plugin.description).toBeDefined();
  expect(typeof plugin.initialize).toBe('function');
  expect(typeof plugin.train).toBe('function');
  expect(typeof plugin.predict).toBe('function');
  expect(typeof plugin.save).toBe('function');
  expect(typeof plugin.load).toBe('function');
}

export function assertValidConfig(config: any, requiredFields: string[]): void {
  expect(config).toBeDefined();
  requiredFields.forEach(field => {
    expect(config).toHaveProperty(field);
  });
}
