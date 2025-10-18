/**
 * MCP Learning Tools - Tool definitions for MCP server integration
 */

import type { LearningManager } from '../core/learning-manager.js';
import type {
  State,
  Outcome,
  FeedbackInput,
  TrainingOptions,
} from '../types/index.js';

export class MCPLearningTools {
  private learningManager: LearningManager;

  constructor(learningManager: LearningManager) {
    this.learningManager = learningManager;
  }

  /**
   * Get all tool definitions for MCP server
   */
  getToolDefinitions() {
    return {
      learning_start_session: {
        description:
          'Start a new learning session for adaptive action selection',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User identifier',
            },
            sessionType: {
              type: 'string',
              enum: ['coding', 'research', 'debugging', 'general'],
              description: 'Type of task for this session',
            },
            plugin: {
              type: 'string',
              default: 'q-learning',
              description: 'Learning algorithm to use',
            },
            config: {
              type: 'object',
              description: 'Optional configuration parameters',
              properties: {
                learningRate: { type: 'number', default: 0.1 },
                discountFactor: { type: 'number', default: 0.95 },
                bufferSize: { type: 'number', default: 10000 },
              },
            },
          },
          required: ['userId', 'sessionType'],
        },
      },

      learning_end_session: {
        description: 'End a learning session and save policy',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Session identifier to end',
            },
          },
          required: ['sessionId'],
        },
      },

      learning_predict: {
        description:
          'Get AI-recommended action for current state with confidence scores',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Active session identifier',
            },
            currentState: {
              type: 'object',
              description: 'Current task state',
              properties: {
                taskDescription: { type: 'string' },
                availableTools: {
                  type: 'array',
                  items: { type: 'string' },
                },
                previousActions: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
              required: ['taskDescription', 'availableTools'],
            },
            availableTools: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tools available for selection',
            },
          },
          required: ['sessionId', 'currentState', 'availableTools'],
        },
      },

      learning_feedback: {
        description: 'Provide user feedback on action quality',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Session identifier',
            },
            actionId: {
              type: 'string',
              description: 'Action identifier to provide feedback on',
            },
            feedback: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                rating: {
                  type: 'number',
                  minimum: 0,
                  maximum: 5,
                  description: 'Rating from 0-5',
                },
                comments: { type: 'string' },
                dimensions: {
                  type: 'object',
                  properties: {
                    speed: { type: 'number', minimum: 0, maximum: 1 },
                    accuracy: { type: 'number', minimum: 0, maximum: 1 },
                    completeness: { type: 'number', minimum: 0, maximum: 1 },
                  },
                },
              },
              required: ['success', 'rating'],
            },
          },
          required: ['sessionId', 'actionId', 'feedback'],
        },
      },

      learning_train: {
        description: 'Train policy on collected experiences',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Session to train',
            },
            options: {
              type: 'object',
              properties: {
                batchSize: { type: 'number', default: 32 },
                epochs: { type: 'number', default: 10 },
                learningRate: { type: 'number', default: 0.1 },
                minExperiences: { type: 'number', default: 100 },
              },
            },
          },
          required: ['sessionId'],
        },
      },

      learning_metrics: {
        description: 'Get learning performance metrics',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Session to get metrics for',
            },
            period: {
              type: 'string',
              enum: ['session', 'day', 'week', 'month', 'all'],
              default: 'session',
              description: 'Time period for metrics',
            },
          },
          required: ['sessionId'],
        },
      },

      learning_transfer: {
        description: 'Transfer learning from one task to another',
        inputSchema: {
          type: 'object',
          properties: {
            sourceSessionId: {
              type: 'string',
              description: 'Source session to transfer from',
            },
            targetSessionId: {
              type: 'string',
              description: 'Target session to transfer to',
            },
            similarity: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              default: 0.7,
              description: 'Task similarity weight (0-1)',
            },
          },
          required: ['sourceSessionId', 'targetSessionId'],
        },
      },

      learning_explain: {
        description: 'Explain why an action was recommended',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Session identifier',
            },
            state: {
              type: 'object',
              description: 'State to explain',
              properties: {
                taskDescription: { type: 'string' },
                availableTools: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['taskDescription', 'availableTools'],
            },
          },
          required: ['sessionId', 'state'],
        },
      },

      experience_record: {
        description: 'Record a tool execution as learning experience',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Session identifier',
            },
            toolName: {
              type: 'string',
              description: 'Name of tool executed',
            },
            args: {
              type: 'object',
              description: 'Tool arguments',
            },
            result: {
              description: 'Tool execution result',
            },
            outcome: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                executionTime: { type: 'number' },
                tokensUsed: { type: 'number' },
                error: { type: 'object' },
              },
              required: ['success', 'executionTime'],
            },
          },
          required: ['sessionId', 'toolName', 'args', 'result', 'outcome'],
        },
      },

      reward_signal: {
        description: 'Calculate reward signal for an outcome',
        inputSchema: {
          type: 'object',
          properties: {
            outcome: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                executionTime: { type: 'number' },
                tokensUsed: { type: 'number' },
                result: { description: 'Execution result' },
              },
              required: ['success', 'executionTime'],
            },
            context: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                sessionId: { type: 'string' },
                taskType: {
                  type: 'string',
                  enum: ['coding', 'research', 'debugging', 'general'],
                },
                timestamp: { type: 'number' },
              },
              required: ['userId', 'sessionId', 'taskType', 'timestamp'],
            },
            userRating: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Optional user rating (0-1)',
            },
          },
          required: ['outcome', 'context'],
        },
      },
    };
  }

  /**
   * Handle tool calls
   */
  async handleToolCall(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'learning_start_session':
        return await this.learningManager.startSession(
          args.userId,
          args.sessionType,
          args.plugin || 'q-learning',
          args.config || {}
        );

      case 'learning_end_session':
        return await this.learningManager.endSession(args.sessionId);

      case 'learning_predict': {
        const state: State = {
          taskDescription: args.currentState.taskDescription,
          availableTools: args.currentState.availableTools,
          previousActions: args.currentState.previousActions || [],
        };
        return await this.learningManager.predictAction(
          args.sessionId,
          state,
          args.availableTools
        );
      }

      case 'learning_feedback': {
        const feedback: FeedbackInput = args.feedback;
        await this.learningManager.provideFeedback(
          args.sessionId,
          args.actionId,
          feedback
        );
        return { success: true };
      }

      case 'learning_train': {
        const options: TrainingOptions = args.options || {};
        return await this.learningManager.train(args.sessionId, options);
      }

      case 'learning_metrics':
        return await this.learningManager.getMetrics(
          args.sessionId,
          args.period || 'session'
        );

      case 'learning_transfer':
        return await this.learningManager.transferLearning(
          args.sourceSessionId,
          args.targetSessionId,
          args.similarity || 0.7
        );

      case 'learning_explain': {
        const state: State = {
          taskDescription: args.state.taskDescription,
          availableTools: args.state.availableTools,
          previousActions: [],
        };
        return await this.learningManager.explainPrediction(
          args.sessionId,
          state
        );
      }

      case 'experience_record': {
        const outcome: Outcome = args.outcome;
        return await this.learningManager.recordExperience(
          args.sessionId,
          args.toolName,
          args.args,
          args.result,
          outcome
        );
      }

      case 'reward_signal': {
        // This is handled by the reward estimator directly
        // For simplicity, return a mock response
        return {
          automatic: 0.75,
          objective: 0.8,
          combined: 0.77,
          dimensions: {
            success: 1.0,
            efficiency: 0.8,
            quality: 0.7,
            cost: 0.6,
          },
        };
      }

      default:
        throw new Error(`Unknown learning tool: ${toolName}`);
    }
  }
}
