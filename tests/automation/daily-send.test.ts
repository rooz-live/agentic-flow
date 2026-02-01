/**
 * TDD Test Suite for Daily Send Automation
 * 
 * Capabilities:
 * - MAA (Morning Accountability Automation) workflow
 * - Template synchronization
 * - MCP (Model Context Protocol) integration
 * - MPP (Multi-Provider Pipeline) support
 * - Scheduled sends with cron support
 * - Context preservation across sends
 * - Metrics tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DailySendAutomation } from '../../src/automation/daily-send';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('DailySendAutomation', () => {
  let tmpDir: string;
  let automation: DailySendAutomation;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-send-test-'));
    automation = new DailySendAutomation({
      workDir: tmpDir,
      templateDir: path.join(tmpDir, 'templates'),
      enableMCP: true,
      enableMPP: true,
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('template management', () => {
    it('should load templates from directory', async () => {
      const templatesDir = path.join(tmpDir, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      
      fs.writeFileSync(
        path.join(templatesDir, 'morning.md'),
        '# Morning Accountability\n\nGoals: {{goals}}\nContext: {{context}}'
      );

      const templates = await automation.loadTemplates();

      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe('morning');
      expect(templates[0].content).toContain('Goals:');
    });

    it('should support template variables', async () => {
      const templatesDir = path.join(tmpDir, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      
      fs.writeFileSync(
        path.join(templatesDir, 'daily.md'),
        'Task: {{task}}\nPriority: {{priority}}\nDeadline: {{deadline}}'
      );

      const result = await automation.renderTemplate('daily', {
        task: 'Build feature X',
        priority: 'HIGH',
        deadline: '2026-02-01',
      });

      expect(result).toContain('Task: Build feature X');
      expect(result).toContain('Priority: HIGH');
      expect(result).toContain('Deadline: 2026-02-01');
    });

    it('should sync templates from git repository', async () => {
      const result = await automation.syncTemplates({
        source: 'git',
        repository: 'https://github.com/example/templates.git',
        branch: 'main',
        path: 'daily-sends',
      });

      expect(result.success).toBe(true);
      expect(result.templatesUpdated).toBeGreaterThan(0);
    });
  });

  describe('MCP integration', () => {
    it('should connect to MCP server', async () => {
      const connection = await automation.connectMCP({
        server: 'claude-flow',
        transport: 'stdio',
      });

      expect(connection.connected).toBe(true);
      expect(connection.capabilities).toContain('context-management');
    });

    it('should store context in MCP', async () => {
      await automation.connectMCP({ server: 'claude-flow' });

      const result = await automation.storeContext({
        namespace: 'daily-send',
        key: 'yesterday-goals',
        value: 'Completed: Feature A, Feature B',
        ttl: 86400, // 24 hours
      });

      expect(result.success).toBe(true);
      expect(result.key).toBe('yesterday-goals');
    });

    it('should retrieve context from MCP', async () => {
      await automation.connectMCP({ server: 'claude-flow' });
      
      await automation.storeContext({
        namespace: 'daily-send',
        key: 'current-sprint',
        value: 'Sprint 23: Infrastructure improvements',
      });

      const result = await automation.retrieveContext({
        namespace: 'daily-send',
        key: 'current-sprint',
      });

      expect(result.found).toBe(true);
      expect(result.value).toContain('Sprint 23');
    });
  });

  describe('MPP support', () => {
    it('should route to optimal provider based on task', async () => {
      const routing = await automation.routeProvider({
        task: 'complex-reasoning',
        complexity: 'high',
        budget: 'standard',
      });

      expect(routing.provider).toBe('anthropic');
      expect(routing.model).toBe('claude-sonnet-4');
      expect(routing.reasoning).toContain('high complexity');
    });

    it('should fall back to alternative provider on failure', async () => {
      const result = await automation.sendWithFallback({
        message: 'Test message',
        primaryProvider: 'anthropic',
        fallbackProviders: ['openai', 'google'],
      });

      expect(result.success).toBe(true);
      expect(result.providerUsed).toBeDefined();
    });

    it('should track provider metrics', async () => {
      await automation.sendWithFallback({
        message: 'Test 1',
        primaryProvider: 'anthropic',
      });

      const metrics = await automation.getProviderMetrics();

      expect(metrics.totalRequests).toBe(1);
      expect(metrics.byProvider).toHaveProperty('anthropic');
    });
  });

  describe('scheduled sends', () => {
    it('should schedule daily send with cron', async () => {
      const schedule = await automation.schedule({
        template: 'morning',
        cron: '0 9 * * *', // 9 AM daily
        timezone: 'America/Los_Angeles',
        enabled: true,
      });

      expect(schedule.id).toBeDefined();
      expect(schedule.nextRun).toBeDefined();
      expect(schedule.enabled).toBe(true);
    });

    it('should execute scheduled send', async () => {
      const templatesDir = path.join(tmpDir, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      
      fs.writeFileSync(
        path.join(templatesDir, 'morning.md'),
        'Goals: {{goals}}'
      );

      const schedule = await automation.schedule({
        template: 'morning',
        cron: '* * * * *', // Every minute for testing
        variables: { goals: 'Complete Phase B' },
      });

      const result = await automation.executeSchedule(schedule.id);

      expect(result.success).toBe(true);
      expect(result.messageSent).toBe(true);
    });

    it('should disable schedule', async () => {
      const schedule = await automation.schedule({
        template: 'daily',
        cron: '0 8 * * *',
      });

      const result = await automation.disableSchedule(schedule.id);

      expect(result.success).toBe(true);
      
      const status = await automation.getScheduleStatus(schedule.id);
      expect(status.enabled).toBe(false);
    });
  });

  describe('context preservation', () => {
    it('should carry forward previous day context', async () => {
      await automation.storeContext({
        namespace: 'daily-send',
        key: 'yesterday',
        value: JSON.stringify({
          goals: ['Feature A', 'Feature B'],
          blockers: ['Dependency issue'],
          completed: ['Feature A'],
        }),
      });

      const context = await automation.buildDailyContext({
        includeYesterday: true,
        includeMetrics: true,
      });

      expect(context.yesterday).toBeDefined();
      expect(context.yesterday.goals).toContain('Feature A');
      expect(context.yesterday.completed).toContain('Feature A');
    });

    it('should track send history', async () => {
      await automation.sendDaily({
        template: 'morning',
        variables: { task: 'Build feature' },
      });

      const history = await automation.getSendHistory({ limit: 10 });

      expect(history.sends).toHaveLength(1);
      expect(history.sends[0].template).toBe('morning');
      expect(history.sends[0].timestamp).toBeDefined();
    });

    it('should calculate streak metrics', async () => {
      // Simulate 5 consecutive days
      for (let i = 0; i < 5; i++) {
        await automation.recordSend({
          template: 'morning',
          timestamp: new Date(2026, 0, i + 1),
        });
      }

      const metrics = await automation.getStreakMetrics();

      expect(metrics.currentStreak).toBe(5);
      expect(metrics.longestStreak).toBe(5);
      expect(metrics.totalSends).toBe(5);
    });
  });

  describe('metrics tracking', () => {
    it('should track send success rate', async () => {
      await automation.recordSend({ success: true });
      await automation.recordSend({ success: true });
      await automation.recordSend({ success: false });

      const metrics = await automation.getMetrics();

      expect(metrics.successRate).toBeCloseTo(0.667, 2);
      expect(metrics.totalSends).toBe(3);
    });

    it('should track template usage', async () => {
      await automation.sendDaily({ template: 'morning' });
      await automation.sendDaily({ template: 'morning' });
      await automation.sendDaily({ template: 'evening' });

      const metrics = await automation.getTemplateMetrics();

      expect(metrics['morning'].count).toBe(2);
      expect(metrics['evening'].count).toBe(1);
    });

    it('should export metrics to JSON', async () => {
      await automation.recordSend({ success: true });
      await automation.recordSend({ success: true });

      const exportPath = path.join(tmpDir, 'metrics.json');
      await automation.exportMetrics(exportPath);

      expect(fs.existsSync(exportPath)).toBe(true);
      
      const exported = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
      expect(exported.totalSends).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle missing template gracefully', async () => {
      const result = await automation.renderTemplate('nonexistent', {});

      expect(result).toBeNull();
    });

    it('should retry on MCP connection failure', async () => {
      const result = await automation.connectMCP({
        server: 'unreachable-server',
        retries: 3,
        retryDelay: 100,
      });

      expect(result.connected).toBe(false);
      expect(result.attempts).toBe(3);
    });

    it('should validate cron expressions', async () => {
      await expect(async () => {
        await automation.schedule({
          template: 'test',
          cron: 'invalid cron',
        });
      }).rejects.toThrow('Invalid cron expression');
    });
  });

  describe('dry run mode', () => {
    it('should simulate send without actually sending', async () => {
      const templatesDir = path.join(tmpDir, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      
      fs.writeFileSync(
        path.join(templatesDir, 'test.md'),
        'Message: {{msg}}'
      );

      const result = await automation.sendDaily({
        template: 'test',
        variables: { msg: 'Hello' },
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.preview).toContain('Message: Hello');
    });
  });
});
