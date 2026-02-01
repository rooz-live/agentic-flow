#!/usr/bin/env npx tsx
/**
 * TUI Status Monitor with Visual Metaphors
 * 
 * P1-4 (WSJF 4.6): Real-time terminal UI for swarm monitoring
 * 
 * Features:
 * - Live agent status grid with health indicators
 * - Real-time progress bars for tasks
 * - Network topology visualization (ASCII art)
 * - Performance metrics streaming
 * - Interactive controls (pause/resume/scale)
 * - ROAM metrics integration
 * - WSJF prioritization display
 * 
 * Technology: Blessed (Node.js TUI library)
 * Fallback: Pure terminal output for compatibility
 * Future: Rio Terminal (WGPU) + Three.js for 3D visualization
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { SwarmBindingCoordinator } from '../swarm/binding-coordinator.js';
import { execSync } from 'child_process';

interface MonitorConfig {
  refreshInterval: number; // ms
  enableColors: boolean;
  compactMode: boolean;
}

export class TUIMonitor {
  private screen: blessed.Widgets.Screen;
  private coordinator: SwarmBindingCoordinator;
  private config: MonitorConfig;
  private refreshTimer?: NodeJS.Timeout;
  
  // UI Components
  private agentGrid?: blessed.Widgets.ListTable;
  private taskList?: blessed.Widgets.ListElement;
  private metricsBar?: any;
  private topologyBox?: blessed.Widgets.BoxElement;
  private logBox?: blessed.Widgets.Log;
  private commandBar?: blessed.Widgets.BoxElement;

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = {
      refreshInterval: 1000,
      enableColors: true,
      compactMode: false,
      ...config
    };

    this.coordinator = new SwarmBindingCoordinator();
    
    // Create screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Claude Flow - Swarm Status Monitor',
      fullUnicode: true
    });

    this.setupUI();
    this.setupKeybindings();
  }

  private setupUI(): void {
    // Header
    const header = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: '{center}{bold}🐝 CLAUDE FLOW - SWARM STATUS MONITOR{/bold}{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue',
        border: {
          fg: 'cyan'
        }
      }
    });

    // Agent Status Grid (top-left)
    this.agentGrid = blessed.listtable({
      parent: this.screen,
      top: 3,
      left: 0,
      width: '50%',
      height: '40%',
      label: ' 🤖 Agents ',
      border: 'line',
      align: 'left',
      tags: true,
      keys: true,
      vi: true,
      style: {
        header: {
          fg: 'cyan',
          bold: true
        },
        cell: {
          selected: {
            bg: 'blue'
          }
        },
        border: {
          fg: 'cyan'
        }
      }
    });

    // Task List (top-right)
    this.taskList = blessed.list({
      parent: this.screen,
      top: 3,
      left: '50%',
      width: '50%',
      height: '40%',
      label: ' 📋 Tasks ',
      border: 'line',
      tags: true,
      keys: true,
      vi: true,
      style: {
        selected: {
          bg: 'blue'
        },
        border: {
          fg: 'cyan'
        }
      }
    });

    // Metrics Bar Chart (middle)
    this.metricsBar = (contrib as any).bar({
      parent: this.screen,
      label: ' 📊 Metrics ',
      barWidth: 8,
      barSpacing: 2,
      xOffset: 0,
      maxHeight: 10,
      top: '43%',
      left: 0,
      width: '100%',
      height: '20%',
      border: 'line',
      style: {
        border: {
          fg: 'cyan'
        }
      }
    });

    // Topology Visualization (bottom-left)
    this.topologyBox = blessed.box({
      parent: this.screen,
      top: '63%',
      left: 0,
      width: '50%',
      height: '30%',
      label: ' 🕸️  Topology ',
      border: 'line',
      content: '',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      style: {
        border: {
          fg: 'cyan'
        }
      }
    });

    // Log/Events (bottom-right)
    this.logBox = blessed.log({
      parent: this.screen,
      top: '63%',
      left: '50%',
      width: '50%',
      height: '30%',
      label: ' 📝 Events ',
      border: 'line',
      tags: true,
      scrollable: true,
      scrollbar: {
        ch: ' ',
        inverse: true
      },
      style: {
        border: {
          fg: 'cyan'
        }
      }
    });

    // Command Bar (bottom)
    this.commandBar = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: ' [q]uit | [r]efresh | [p]ause | [h]ealthcheck | [s]cale | [i]nfo ',
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue'
      }
    });
  }

  private setupKeybindings(): void {
    // Quit
    this.screen.key(['q', 'C-c'], () => {
      this.stop();
      process.exit(0);
    });

    // Refresh
    this.screen.key(['r'], () => {
      this.refresh();
      this.log('Manual refresh triggered');
    });

    // Pause/Resume
    this.screen.key(['p'], () => {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = undefined;
        this.log('⏸️  Monitoring paused');
      } else {
        this.startRefresh();
        this.log('▶️  Monitoring resumed');
      }
    });

    // Health Check
    this.screen.key(['h'], () => {
      const health = this.coordinator.healthCheck();
      this.log(`Health Check: ${health.healthy ? '✅ Healthy' : '❌ Issues found'}`);
      health.issues.forEach(issue => this.log(`  - ${issue}`));
    });

    // Scale Info
    this.screen.key(['s'], () => {
      const status = this.coordinator.getStatus();
      if (status.swarm) {
        this.log(`Current: ${status.metrics.totalAgents}/${status.swarm.maxAgents} agents`);
      }
    });

    // Info
    this.screen.key(['i'], () => {
      const status = this.coordinator.getStatus();
      if (status.swarm) {
        this.log(`Swarm ID: ${status.swarm.id}`);
        this.log(`Topology: ${status.swarm.topology}`);
        this.log(`Strategy: ${status.swarm.strategy}`);
        this.log(`Status: ${status.swarm.status}`);
      }
    });
  }

  public refresh(): void {
    const status = this.coordinator.getStatus();
    
    if (!status.swarm) {
      this.renderNoSwarm();
      return;
    }

    this.renderAgentGrid(status);
    this.renderTaskList(status);
    this.renderMetrics(status);
    this.renderTopology(status);
    
    this.screen.render();
  }

  private renderNoSwarm(): void {
    const message = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: 5,
      content: '{center}{yellow-fg}No active swarm detected{/yellow-fg}\n\n' +
               'Initialize with: npx claude-flow swarm init{/center}',
      tags: true,
      border: 'line',
      style: {
        border: {
          fg: 'yellow'
        }
      }
    });
    
    this.screen.render();
  }

  private renderAgentGrid(status: any): void {
    if (!this.agentGrid) return;

    const headers = ['ID', 'Type', 'Status', 'Tasks', 'Health', 'Activity'];
    const data = [headers];

    status.swarm.agents.forEach((agent: any, idx: number) => {
      if (agent.status === 'terminated') return;

      const statusIcon = this.getStatusIcon(agent.status);
      const healthBar = this.getHealthBar(agent.healthScore);
      const lastActivity = agent.lastActivity 
        ? this.getTimeAgo(agent.lastActivity)
        : 'Never';

      data.push([
        `${idx + 1}`,
        agent.type,
        `${statusIcon} ${agent.status}`,
        `${agent.taskCount}`,
        healthBar,
        lastActivity
      ]);
    });

    this.agentGrid.setData(data);
  }

  private renderTaskList(status: any): void {
    if (!this.taskList) return;

    this.taskList.clearItems();

    const recentTasks = status.swarm.tasks
      .slice(-10)
      .reverse();

    recentTasks.forEach((task: any) => {
      const statusIcon = this.getTaskStatusIcon(task.status);
      const agentCount = task.assignedAgents.length;
      const duration = task.completedAt
        ? this.getTaskDuration(task.createdAt, task.completedAt)
        : 'In progress';

      const line = `${statusIcon} ${task.taskId.slice(0, 8)} [${agentCount} agents] ${duration}`;
      this.taskList.addItem(line);
    });
  }

  private renderMetrics(status: any): void {
    if (!this.metricsBar) return;

    const { metrics } = status;
    
    this.metricsBar.setData({
      titles: ['Active', 'Idle', 'Tasks', 'Complete', 'Failed'],
      data: [
        metrics.activeAgents,
        metrics.idleAgents,
        metrics.totalTasks,
        metrics.completedTasks,
        metrics.failedTasks
      ]
    });
  }

  private renderTopology(status: any): void {
    if (!this.topologyBox) return;

    const { swarm, metrics } = status;
    const ascii = this.generateTopologyASCII(swarm, metrics);
    
    this.topologyBox.setContent(ascii);
  }

  private generateTopologyASCII(swarm: any, metrics: any): string {
    const { topology } = swarm;
    const activeCount = metrics.activeAgents;
    const idleCount = metrics.idleAgents;

    let ascii = `Type: ${topology}\n\n`;

    if (topology === 'hierarchical-mesh') {
      ascii += '        👑 Queen\n';
      ascii += '        │\n';
      ascii += '    ┌───┴───┐\n';
      ascii += '    │       │\n';
      ascii += '   👥 👥    👥 👥  ← Agents\n';
      ascii += '    └───┬───┘\n';
      ascii += '        │ (mesh)\n';
    } else if (topology === 'hierarchical') {
      ascii += '        👑 Queen\n';
      ascii += '        │\n';
      ascii += '    ┌───┼───┐\n';
      ascii += '    │   │   │\n';
      ascii += '   👤  👤  👤  ← Agents\n';
    } else if (topology === 'mesh') {
      ascii += '    👤──👤──👤\n';
      ascii += '    │ \\ │ / │\n';
      ascii += '    👤──👤──👤\n';
    }

    ascii += `\n🟢 Active: ${activeCount}  ⚪ Idle: ${idleCount}`;

    return ascii;
  }

  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'active': '🟢',
      'idle': '⚪',
      'spawning': '🔵',
      'terminated': '🔴'
    };
    return icons[status] || '❓';
  }

  private getTaskStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'completed': '✅',
      'in_progress': '⏳',
      'pending': '📋',
      'failed': '❌'
    };
    return icons[status] || '❓';
  }

  private getHealthBar(score: number): string {
    const width = 10;
    const filled = Math.round(score * width);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    
    const color = score > 0.7 ? 'green' : score > 0.4 ? 'yellow' : 'red';
    return `{${color}-fg}${bar}{/${color}-fg} ${(score * 100).toFixed(0)}%`;
  }

  private getTimeAgo(timestamp: string): string {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = now - then;

    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  private getTaskDuration(start: string, end: string): string {
    const duration = new Date(end).getTime() - new Date(start).getTime();
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  }

  public log(message: string): void {
    if (this.logBox) {
      const timestamp = new Date().toLocaleTimeString();
      this.logBox.log(`[${timestamp}] ${message}`);
    }
  }

  private startRefresh(): void {
    this.refreshTimer = setInterval(() => {
      this.refresh();
    }, this.config.refreshInterval);
  }

  public start(): void {
    this.log('🚀 TUI Monitor started');
    this.log('Press h for health check, s for scale info, q to quit');
    
    this.refresh();
    this.startRefresh();
    
    this.screen.render();
  }

  public stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.log('🛑 TUI Monitor stopped');
    this.screen.destroy();
  }
}

// CLI Entry Point
async function startMonitor() {
  try {
    const monitor = new TUIMonitor({
      refreshInterval: 1000,
      enableColors: true,
      compactMode: false
    });

    monitor.start();
  } catch (error: any) {
    console.error('❌ Failed to start TUI Monitor:', error.message);
    console.log('💡 Ensure swarm is initialized: npx tsx src/cli/wsjf-commands.ts swarm init');
    process.exit(1);
  }
}

if (require.main === module) {
  startMonitor();
}

export default TUIMonitor;
