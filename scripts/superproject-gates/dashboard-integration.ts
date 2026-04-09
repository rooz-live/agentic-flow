/**
 * Dashboard Integration System
 *
 * Real-time dashboard system with WebSocket support for actionable, shareable outputs
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import {
  DashboardWidget,
  DashboardLayout,
  ShareableOutput
} from './types';
import { MonitoringAnalyticsSystem } from '../monitoring-analytics/monitoring-analytics-system';

export class DashboardIntegration extends EventEmitter {
  private wss: WebSocket.Server | null = null;
  private layouts: Map<string, DashboardLayout> = new Map();
  private activeConnections: Set<WebSocket> = new Set();
  private monitoringSystem: MonitoringAnalyticsSystem;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(monitoringSystem: MonitoringAnalyticsSystem, port: number = 8080) {
    super();
    this.monitoringSystem = monitoringSystem;
    this.initializeWebSocketServer(port);
    this.initializeDefaultDashboards();
    this.startRealTimeUpdates();
  }

  private initializeWebSocketServer(port: number): void {
    this.wss = new WebSocket.Server({ port });

    this.wss.on('connection', (ws: WebSocket) => {
      this.activeConnections.add(ws);
      this.emit('client-connected', ws);

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(ws, data);
        } catch (error) {
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        this.activeConnections.delete(ws);
        this.emit('client-disconnected', ws);
      });

      // Send initial dashboard data
      this.sendDashboardData(ws);
    });

    this.wss.on('listening', () => {
      console.log(`Dashboard WebSocket server listening on port ${port}`);
    });
  }

  private initializeDefaultDashboards(): void {
    // Orchestration Dashboard
    const orchestrationLayout: DashboardLayout = {
      id: 'orchestration-dashboard',
      name: 'Agentic Flow Orchestration',
      widgets: [
        {
          id: 'plan-status',
          title: 'Plan Execution Status',
          type: 'chart',
          position: { x: 0, y: 0, width: 6, height: 4 },
          data: { type: 'pie', data: [] },
          refreshInterval: 5000,
          realTime: true
        },
        {
          id: 'action-metrics',
          title: 'Action Performance Metrics',
          type: 'metric',
          position: { x: 6, y: 0, width: 6, height: 4 },
          data: { metrics: [] },
          refreshInterval: 2000,
          realTime: true
        },
        {
          id: 'system-health',
          title: 'System Health Overview',
          type: 'table',
          position: { x: 0, y: 4, width: 12, height: 4 },
          data: { columns: [], rows: [] },
          refreshInterval: 10000,
          realTime: true
        }
      ],
      theme: 'auto',
      autoRefresh: true,
      refreshInterval: 5000
    };

    // MCP Tooling Dashboard
    const mcpLayout: DashboardLayout = {
      id: 'mcp-tooling-dashboard',
      name: 'MCP Server Tooling',
      widgets: [
        {
          id: 'server-status',
          title: 'MCP Server Status',
          type: 'metric',
          position: { x: 0, y: 0, width: 4, height: 3 },
          data: { servers: [] },
          refreshInterval: 3000,
          realTime: true
        },
        {
          id: 'command-throughput',
          title: 'Command Throughput',
          type: 'chart',
          position: { x: 4, y: 0, width: 8, height: 3 },
          data: { type: 'line', series: [] },
          refreshInterval: 2000,
          realTime: true
        },
        {
          id: 'tool-usage',
          title: 'Tool Usage Analytics',
          type: 'table',
          position: { x: 0, y: 3, width: 12, height: 5 },
          data: { tools: [] },
          refreshInterval: 10000,
          realTime: true
        }
      ],
      theme: 'auto',
      autoRefresh: true,
      refreshInterval: 3000
    };

    // AI Decision Dashboard
    const aiLayout: DashboardLayout = {
      id: 'ai-decision-dashboard',
      name: 'AI-Enhanced Decision Making',
      widgets: [
        {
          id: 'decision-confidence',
          title: 'Decision Confidence Levels',
          type: 'chart',
          position: { x: 0, y: 0, width: 6, height: 4 },
          data: { type: 'bar', decisions: [] },
          refreshInterval: 5000,
          realTime: true
        },
        {
          id: 'glm-performance',
          title: 'GLM Model Performance',
          type: 'metric',
          position: { x: 6, y: 0, width: 6, height: 4 },
          data: { latency: 0, accuracy: 0, throughput: 0 },
          refreshInterval: 2000,
          realTime: true
        },
        {
          id: 'simulation-results',
          title: 'Predictive Simulation Results',
          type: 'custom',
          position: { x: 0, y: 4, width: 12, height: 4 },
          data: { simulations: [] },
          refreshInterval: 10000,
          realTime: true
        }
      ],
      theme: 'auto',
      autoRefresh: true,
      refreshInterval: 5000
    };

    this.layouts.set(orchestrationLayout.id, orchestrationLayout);
    this.layouts.set(mcpLayout.id, mcpLayout);
    this.layouts.set(aiLayout.id, aiLayout);
  }

  private startRealTimeUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.updateDashboardData();
      this.broadcastDashboardUpdates();
    }, 1000); // Update every second
  }

  private async updateDashboardData(): Promise<void> {
    try {
      // Get real-time data from monitoring system
      const metrics = await this.monitoringSystem.getMetrics();

      // Update orchestration dashboard
      const orchestrationLayout = this.layouts.get('orchestration-dashboard');
      if (orchestrationLayout) {
        orchestrationLayout.widgets[0].data = {
          type: 'pie',
          data: [
            { label: 'Completed', value: metrics.completedPlans || 0 },
            { label: 'In Progress', value: metrics.activePlans || 0 },
            { label: 'Pending', value: metrics.pendingPlans || 0 }
          ]
        };
        orchestrationLayout.widgets[1].data = {
          metrics: [
            { name: 'Avg Action Time', value: metrics.avgActionTime || 0, unit: 'ms' },
            { name: 'Success Rate', value: metrics.successRate || 0, unit: '%' },
            { name: 'Active Actions', value: metrics.activeActions || 0, unit: '' }
          ]
        };
      }

      // Update MCP dashboard
      const mcpLayout = this.layouts.get('mcp-tooling-dashboard');
      if (mcpLayout) {
        mcpLayout.widgets[0].data = {
          servers: [
            { name: 'Claude Code Exec', status: 'online', latency: 45 },
            { name: 'Agent Harness', status: 'online', latency: 23 },
            { name: 'OpenCode Docs', status: 'online', latency: 67 }
          ]
        };
      }

      // Update AI dashboard
      const aiLayout = this.layouts.get('ai-decision-dashboard');
      if (aiLayout) {
        aiLayout.widgets[1].data = {
          latency: metrics.aiLatency || 120,
          accuracy: metrics.aiAccuracy || 0.94,
          throughput: metrics.aiThroughput || 150
        };
      }

    } catch (error) {
      console.error('Error updating dashboard data:', error);
    }
  }

  private broadcastDashboardUpdates(): void {
    const updateMessage = {
      type: 'dashboard-update',
      timestamp: new Date().toISOString(),
      layouts: Array.from(this.layouts.values())
    };

    this.activeConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(updateMessage));
      }
    });
  }

  private sendDashboardData(ws: WebSocket): void {
    const dashboardData = {
      type: 'dashboard-init',
      layouts: Array.from(this.layouts.values()),
      timestamp: new Date().toISOString()
    };

    ws.send(JSON.stringify(dashboardData));
  }

  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe-dashboard':
        // Handle dashboard subscription
        break;
      case 'update-widget':
        this.updateWidget(message.widgetId, message.data);
        break;
      case 'create-shareable-output':
        this.createShareableOutput(message.output);
        break;
      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  }

  createLayout(layout: DashboardLayout): void {
    this.layouts.set(layout.id, layout);
    this.emit('layout-created', layout);
    this.broadcastDashboardUpdates();
  }

  updateLayout(layoutId: string, updates: Partial<DashboardLayout>): void {
    const layout = this.layouts.get(layoutId);
    if (layout) {
      Object.assign(layout, updates);
      this.emit('layout-updated', layout);
      this.broadcastDashboardUpdates();
    }
  }

  deleteLayout(layoutId: string): void {
    const layout = this.layouts.get(layoutId);
    if (layout) {
      this.layouts.delete(layoutId);
      this.emit('layout-deleted', layout);
      this.broadcastDashboardUpdates();
    }
  }

  updateWidget(widgetId: string, data: any): void {
    for (const layout of this.layouts.values()) {
      const widget = layout.widgets.find(w => w.id === widgetId);
      if (widget) {
        widget.data = { ...widget.data, ...data };
        this.emit('widget-updated', { layoutId: layout.id, widget });
        this.broadcastDashboardUpdates();
        break;
      }
    }
  }

  getLayout(layoutId: string): DashboardLayout | undefined {
    return this.layouts.get(layoutId);
  }

  getAllLayouts(): DashboardLayout[] {
    return Array.from(this.layouts.values());
  }

  createShareableOutput(output: ShareableOutput): ShareableOutput {
    // In a real implementation, this would save to a database or file system
    this.emit('shareable-output-created', output);
    return output;
  }

  exportDashboard(layoutId: string, format: 'json' | 'html' | 'pdf'): Promise<Buffer> {
    const layout = this.layouts.get(layoutId);
    if (!layout) {
      throw new Error(`Dashboard layout not found: ${layoutId}`);
    }

    // Mock export functionality
    const exportData = JSON.stringify(layout, null, 2);
    return Promise.resolve(Buffer.from(exportData));
  }

  shutdown(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    if (this.wss) {
      this.wss.close();
    }

    this.activeConnections.clear();
    this.emit('shutdown');
  }
}