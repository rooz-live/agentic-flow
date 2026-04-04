/**
 * IDE Extension Manager
 *
 * Manages IDE extensions, their lifecycle, and integration with the agentic flow system
 */

import { EventEmitter } from 'events';
import {
  IDEExtension,
  IDECapability,
  IDEContribution,
  IDEIntegrationConfig
} from './types';
import { OrchestrationFramework } from '../core/orchestration-framework';

export class IDEExtensionManager extends EventEmitter {
  private extensions: Map<string, IDEExtension> = new Map();
  private activeExtensions: Set<string> = new Set();
  private orchestrationFramework: OrchestrationFramework;

  constructor(orchestrationFramework: OrchestrationFramework) {
    super();
    this.orchestrationFramework = orchestrationFramework;
    this.initializeDefaultExtensions();
  }

  private initializeDefaultExtensions(): void {
    // Agentic Flow Dashboard Extension
    this.registerExtension({
      id: 'agentic-flow-dashboard',
      name: 'Agentic Flow Dashboard',
      version: '1.0.0',
      description: 'Real-time dashboard for agentic flow orchestration and monitoring',
      capabilities: [
        {
          type: 'dashboard',
          id: 'orchestration-dashboard',
          title: 'Orchestration Dashboard',
          icon: 'dashboard'
        },
        {
          type: 'sidebar',
          id: 'flow-sidebar',
          title: 'Agentic Flow',
          icon: 'workflow'
        }
      ],
      activationEvents: ['onStartup'],
      contributes: {
        commands: [
          {
            command: 'agentic-flow.show-dashboard',
            title: 'Show Agentic Flow Dashboard',
            category: 'Agentic Flow'
          },
          {
            command: 'agentic-flow.create-plan',
            title: 'Create New Plan',
            category: 'Agentic Flow'
          }
        ],
        views: [
          {
            id: 'agentic-flow-plans',
            name: 'Plans',
            type: 'tree',
            icon: 'checklist'
          },
          {
            id: 'agentic-flow-actions',
            name: 'Actions',
            type: 'tree',
            icon: 'tools'
          }
        ]
      },
      enabled: true
    });

    // MCP Tooling Extension
    this.registerExtension({
      id: 'mcp-tooling-integration',
      name: 'MCP Tooling Integration',
      version: '1.0.0',
      description: 'Integrates MCP servers for enhanced tooling capabilities',
      capabilities: [
        {
          type: 'command',
          id: 'mcp-execute',
          title: 'Execute MCP Command',
          command: 'mcp.execute'
        },
        {
          type: 'statusbar',
          id: 'mcp-status',
          title: 'MCP Status'
        }
      ],
      activationEvents: ['onCommand:mcp.execute'],
      enabled: true
    });

    // GLM AI Assistant Extension
    this.registerExtension({
      id: 'glm-ai-assistant',
      name: 'GLM AI Assistant',
      version: '1.0.0',
      description: 'AI-powered code assistance and decision support using GLM-4.6',
      capabilities: [
        {
          type: 'command',
          id: 'glm-analyze',
          title: 'Analyze Code with GLM',
          command: 'glm.analyze'
        },
        {
          type: 'editor',
          id: 'glm-suggestions',
          title: 'GLM Code Suggestions'
        }
      ],
      activationEvents: ['onLanguage:typescript', 'onLanguage:javascript'],
      enabled: true
    });

    // Predictive Simulation Extension
    this.registerExtension({
      id: 'predictive-simulation',
      name: 'Predictive Simulation Engine',
      version: '1.0.0',
      description: 'Run predictive simulations for decision-making and planning',
      capabilities: [
        {
          type: 'command',
          id: 'simulation-run',
          title: 'Run Simulation',
          command: 'simulation.run'
        },
        {
          type: 'sidebar',
          id: 'simulation-results',
          title: 'Simulation Results'
        }
      ],
      activationEvents: ['onCommand:simulation.run'],
      enabled: true
    });
  }

  registerExtension(extension: IDEExtension): void {
    this.extensions.set(extension.id, extension);
    this.emit('extension-registered', extension);

    if (extension.enabled) {
      this.activateExtension(extension.id);
    }
  }

  unregisterExtension(extensionId: string): void {
    const extension = this.extensions.get(extensionId);
    if (extension) {
      this.deactivateExtension(extensionId);
      this.extensions.delete(extensionId);
      this.emit('extension-unregistered', extension);
    }
  }

  activateExtension(extensionId: string): void {
    const extension = this.extensions.get(extensionId);
    if (extension && !this.activeExtensions.has(extensionId)) {
      this.activeExtensions.add(extensionId);
      this.emit('extension-activated', extension);

      // Register with orchestration framework
      this.orchestrationFramework.createPurpose({
        id: `ide-extension-${extensionId}`,
        name: `IDE Extension: ${extension.name}`,
        description: extension.description,
        objectives: ['Provide IDE integration capabilities'],
        keyResults: ['Extension activated successfully']
      });
    }
  }

  deactivateExtension(extensionId: string): void {
    if (this.activeExtensions.has(extensionId)) {
      this.activeExtensions.delete(extensionId);
      const extension = this.extensions.get(extensionId);
      this.emit('extension-deactivated', extension);
    }
  }

  getExtension(extensionId: string): IDEExtension | undefined {
    return this.extensions.get(extensionId);
  }

  getActiveExtensions(): IDEExtension[] {
    return Array.from(this.activeExtensions)
      .map(id => this.extensions.get(id))
      .filter(ext => ext !== undefined) as IDEExtension[];
  }

  getExtensionsByCapability(capabilityType: IDECapability['type']): IDEExtension[] {
    return Array.from(this.extensions.values())
      .filter(ext => ext.capabilities.some(cap => cap.type === capabilityType));
  }

  executeCommand(command: string, ...args: any[]): Promise<any> {
    // Find extension that provides this command
    for (const extension of this.getActiveExtensions()) {
      if (extension.contributes?.commands?.some(cmd => cmd.command === command)) {
        this.emit('command-executed', { command, args, extension: extension.id });
        // In a real implementation, this would route to the actual command handler
        return Promise.resolve({ success: true, extension: extension.id });
      }
    }
    return Promise.reject(new Error(`Command not found: ${command}`));
  }

  getConfiguration(): IDEIntegrationConfig {
    return {
      extensions: Array.from(this.extensions.values()),
      dashboards: [], // Will be populated by dashboard manager
      mcpBindings: [], // Will be populated by MCP bridge
      glmConfig: {
        model: 'GLM-4.6',
        version: '4.6',
        endpoint: process.env.GLM_ENDPOINT || '',
        apiKey: process.env.GLM_API_KEY || '',
        maxTokens: 4096,
        temperature: 0.7,
        contextWindow: 8192
      },
      predictiveSimulations: [], // Will be populated by simulation engine
      shareableOutputs: [], // Will be populated by shareable outputs system
      aiDecisionEngine: true,
      realTimeUpdates: true,
      websocketPort: 8080
    };
  }
}