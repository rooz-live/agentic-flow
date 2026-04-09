/**
 * MCP Tool Registration for Ceremony Automation
 * 
 * Exposes ceremony execution APIs as MCP tools for external automation
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const ceremonyTools: Tool[] = [
  {
    name: 'execute_ceremony',
    description: 'Execute a ceremony for a specific circle. Returns episode ID and validation results.',
    inputSchema: {
      type: 'object',
      properties: {
        circle: {
          type: 'string',
          description: 'The circle to execute the ceremony for',
          enum: ['orchestrator', 'assessor', 'analyst', 'innovator', 'seeker', 'intuitive']
        },
        ceremony: {
          type: 'string',
          description: 'The ceremony type to execute',
          enum: ['standup', 'wsjf', 'review', 'retro', 'refine', 'replenish', 'synthesis']
        },
        mode: {
          type: 'string',
          description: 'Execution mode: advisory (logs only) or enforce (applies changes)',
          enum: ['advisory', 'enforce'],
          default: 'advisory'
        }
      },
      required: ['circle', 'ceremony']
    }
  },
  
  {
    name: 'get_ceremony_history',
    description: 'Get ceremony execution history for a circle. Returns DoR/DoD validation results.',
    inputSchema: {
      type: 'object',
      properties: {
        circle: {
          type: 'string',
          description: 'The circle to fetch history for',
          enum: ['orchestrator', 'assessor', 'analyst', 'innovator', 'seeker', 'intuitive']
        },
        limit: {
          type: 'number',
          description: 'Maximum number of history items to return',
          default: 50
        },
        status: {
          type: 'string',
          description: 'Filter by check status',
          enum: ['passed', 'failed']
        }
      },
      required: ['circle']
    }
  },
  
  {
    name: 'track_risk',
    description: 'Track a new risk or update an existing risk with mitigation strategies.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Unique risk identifier'
        },
        title: {
          type: 'string',
          description: 'Risk title/summary'
        },
        description: {
          type: 'string',
          description: 'Detailed risk description'
        },
        severity: {
          type: 'string',
          description: 'Risk severity level',
          enum: ['low', 'medium', 'high', 'critical']
        },
        status: {
          type: 'string',
          description: 'Risk status',
          enum: ['identified', 'mitigating', 'resolved', 'accepted'],
          default: 'identified'
        },
        circle: {
          type: 'string',
          description: 'Circle associated with the risk',
          enum: ['orchestrator', 'assessor', 'analyst', 'innovator', 'seeker', 'intuitive']
        },
        ceremony: {
          type: 'string',
          description: 'Ceremony where risk was identified',
          enum: ['standup', 'wsjf', 'review', 'retro', 'refine', 'replenish', 'synthesis']
        }
      },
      required: ['id', 'title', 'severity']
    }
  },
  
  {
    name: 'get_risks',
    description: 'List all tracked risks with optional filters. Returns risk details and mitigation status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by risk status',
          enum: ['identified', 'mitigating', 'resolved', 'accepted']
        },
        severity: {
          type: 'string',
          description: 'Filter by severity level',
          enum: ['low', 'medium', 'high', 'critical']
        },
        circle: {
          type: 'string',
          description: 'Filter by circle',
          enum: ['orchestrator', 'assessor', 'analyst', 'innovator', 'seeker', 'intuitive']
        },
        limit: {
          type: 'number',
          description: 'Maximum number of risks to return',
          default: 100
        }
      }
    }
  },
  
  {
    name: 'track_obstacle',
    description: 'Track an obstacle with ownership assignment. Links obstacles to risks.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Unique obstacle identifier'
        },
        type: {
          type: 'string',
          description: 'Obstacle type',
          enum: ['technical', 'process', 'resource', 'external', 'cultural']
        },
        description: {
          type: 'string',
          description: 'Obstacle description'
        },
        owner_circle: {
          type: 'string',
          description: 'Circle responsible for resolving the obstacle',
          enum: ['orchestrator', 'assessor', 'analyst', 'innovator', 'seeker', 'intuitive']
        },
        owner_agent: {
          type: 'string',
          description: 'Specific agent/person assigned to the obstacle'
        },
        related_risk_id: {
          type: 'string',
          description: 'Related risk ID if this obstacle is blocking risk mitigation'
        }
      },
      required: ['id', 'description', 'owner_circle']
    }
  },
  
  {
    name: 'get_risk_dashboard',
    description: 'Get comprehensive risk dashboard with metrics, episode results, and mitigation effectiveness.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

/**
 * Handler function for MCP tool calls
 */
export async function handleCeremonyToolCall(
  toolName: string,
  args: any,
  apiBaseUrl: string = 'http://localhost:3000'
): Promise<any> {
  const endpoints: Record<string, { method: string; path: (args: any) => string }> = {
    execute_ceremony: {
      method: 'POST',
      path: () => '/api/ceremonies/execute'
    },
    get_ceremony_history: {
      method: 'GET',
      path: (args) => `/api/ceremonies/history/${args.circle}?limit=${args.limit || 50}${args.status ? `&status=${args.status}` : ''}`
    },
    track_risk: {
      method: 'POST',
      path: () => '/api/risks/track'
    },
    get_risks: {
      method: 'GET',
      path: (args) => {
        const params = new URLSearchParams();
        if (args.status) params.append('status', args.status);
        if (args.severity) params.append('severity', args.severity);
        if (args.circle) params.append('circle', args.circle);
        if (args.limit) params.append('limit', args.limit.toString());
        return `/api/risks?${params.toString()}`;
      }
    },
    track_obstacle: {
      method: 'POST',
      path: () => '/api/obstacles/track'
    },
    get_risk_dashboard: {
      method: 'GET',
      path: () => '/api/risk-dashboard'
    }
  };

  const endpoint = endpoints[toolName];
  if (!endpoint) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  const url = `${apiBaseUrl}${endpoint.path(args)}`;
  const options: RequestInit = {
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (endpoint.method === 'POST') {
    options.body = JSON.stringify(args);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return await response.json();
}
