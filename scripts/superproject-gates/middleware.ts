/**
 * ONNX LLM Proxy Middleware
 * 
 * Middleware for integrating ONNX inference with agentic workflow
 * orchestration, including PDA cycle support and evidence emission.
 */

import { EventEmitter } from 'events';
import type {
  InferenceRequest,
  InferenceResponse,
  AgenticWorkflowConfig
} from './types.js';
import { ONNXLLMProxyClient, getProxyClient } from './proxy-client.js';

/**
 * PDA Phase context for inference
 */
export interface PDAPhaseContext {
  phase: 'plan' | 'do' | 'act';
  planId?: string;
  doId?: string;
  actId?: string;
  objectives?: string[];
  actions?: string[];
  outcomes?: string[];
}

/**
 * Evidence record for interpretability
 */
export interface EvidenceRecord {
  timestamp: string;
  runId: string;
  command: string;
  mode: string;
  emitterName: string;
  eventType: string;
  category: string;
  data: Record<string, unknown>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
}

/**
 * Agent role context
 */
export interface AgentRoleContext {
  role: 'analyst' | 'assessor' | 'innovator' | 'intuitive' | 'orchestrator' | 'seeker';
  agentId: string;
  agentName: string;
  capabilities?: string[];
}

/**
 * Inference middleware interface
 */
export interface InferenceMiddleware {
  name: string;
  priority: number;
  preProcess?: (request: InferenceRequest, context: MiddlewareContext) => Promise<InferenceRequest>;
  postProcess?: (response: InferenceResponse, context: MiddlewareContext) => Promise<InferenceResponse>;
}

/**
 * Middleware context
 */
export interface MiddlewareContext {
  pdaPhase?: PDAPhaseContext;
  agentRole?: AgentRoleContext;
  correlationId: string;
  startTime: Date;
  metadata: Record<string, unknown>;
}

/**
 * Agentic Workflow Middleware Manager
 */
export class AgenticWorkflowMiddleware extends EventEmitter {
  private proxyClient: ONNXLLMProxyClient;
  private config: AgenticWorkflowConfig;
  private middlewares: InferenceMiddleware[] = [];
  private evidenceBuffer: EvidenceRecord[] = [];
  private contextCache: Map<string, { context: MiddlewareContext; expiresAt: number }> = new Map();

  constructor(proxyClient?: ONNXLLMProxyClient, config?: AgenticWorkflowConfig) {
    super();
    this.proxyClient = proxyClient ?? getProxyClient();
    this.config = config ?? {
      enablePDACycle: true,
      enableInterpretability: true,
      evidenceEmission: {
        enabled: true,
        emitterName: 'onnx-llm-proxy',
        category: 'Inference'
      },
      roleModelMappings: {
        analyst: 'default-reasoning',
        assessor: 'default-classification',
        innovator: 'default-generation',
        intuitive: 'default-reasoning',
        orchestrator: 'default-reasoning',
        seeker: 'default-embedding'
      },
      contextManagement: {
        maxTokens: 4096,
        truncationStrategy: 'tail',
        enableContextCaching: true,
        cacheTTLMs: 300000
      }
    };

    // Register default middlewares
    this.registerDefaultMiddlewares();

    // Start cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Register default middlewares
   */
  private registerDefaultMiddlewares(): void {
    // PDA Context Middleware
    this.registerMiddleware({
      name: 'pda-context',
      priority: 100,
      preProcess: async (request, context) => {
        if (context.pdaPhase && this.config.enablePDACycle) {
          request.metadata.pdaPhase = context.pdaPhase.phase;
          request.metadata.context = {
            ...request.metadata.context,
            pdaPhase: context.pdaPhase
          };

          // Select model based on PDA phase
          const phaseModelId = this.getPhaseModelId(context.pdaPhase.phase);
          if (phaseModelId) {
            request.modelId = phaseModelId;
          }
        }
        return request;
      },
      postProcess: async (response, context) => {
        if (context.pdaPhase && this.config.enablePDACycle) {
          // Emit PDA phase evidence
          this.emitEvidence({
            eventType: `pda-${context.pdaPhase.phase}-inference`,
            data: {
              phase: context.pdaPhase.phase,
              planId: context.pdaPhase.planId,
              doId: context.pdaPhase.doId,
              actId: context.pdaPhase.actId,
              requestId: response.requestId,
              modelId: response.modelId,
              latencyMs: response.metrics.latencyMs,
              success: response.status === 'success'
            },
            tags: ['pda-cycle', context.pdaPhase.phase, 'inference']
          });
        }
        return response;
      }
    });

    // Agent Role Middleware
    this.registerMiddleware({
      name: 'agent-role',
      priority: 90,
      preProcess: async (request, context) => {
        if (context.agentRole) {
          // Select model based on agent role
          const roleModelId = this.config.roleModelMappings[context.agentRole.role];
          if (roleModelId && !request.modelId) {
            request.modelId = roleModelId;
          }

          request.metadata.context = {
            ...request.metadata.context,
            agentRole: context.agentRole
          };
        }
        return request;
      }
    });

    // Context Caching Middleware
    this.registerMiddleware({
      name: 'context-caching',
      priority: 80,
      preProcess: async (request, context) => {
        if (this.config.contextManagement.enableContextCaching) {
          const cacheKey = this.buildCacheKey(request, context);
          const cached = this.contextCache.get(cacheKey);
          
          if (cached && cached.expiresAt > Date.now()) {
            request.metadata.context = {
              ...request.metadata.context,
              cachedContext: cached.context.metadata
            };
          }
        }
        return request;
      },
      postProcess: async (response, context) => {
        if (this.config.contextManagement.enableContextCaching && response.status === 'success') {
          const cacheKey = this.buildCacheKey(response as any, context);
          this.contextCache.set(cacheKey, {
            context: { ...context, metadata: { ...context.metadata, lastResponse: response.output } },
            expiresAt: Date.now() + this.config.contextManagement.cacheTTLMs
          });
        }
        return response;
      }
    });

    // Token Truncation Middleware
    this.registerMiddleware({
      name: 'token-truncation',
      priority: 70,
      preProcess: async (request, context) => {
        if (request.input.text && request.input.text.length > this.config.contextManagement.maxTokens * 4) {
          const maxChars = this.config.contextManagement.maxTokens * 4; // Rough estimate
          
          switch (this.config.contextManagement.truncationStrategy) {
            case 'head':
              request.input.text = request.input.text.substring(0, maxChars);
              break;
            case 'tail':
              request.input.text = request.input.text.substring(request.input.text.length - maxChars);
              break;
            case 'middle':
              const halfMax = Math.floor(maxChars / 2);
              request.input.text = 
                request.input.text.substring(0, halfMax) + 
                '\n...[truncated]...\n' +
                request.input.text.substring(request.input.text.length - halfMax);
              break;
          }

          this.emit('contextTruncated', {
            requestId: request.requestId,
            strategy: this.config.contextManagement.truncationStrategy,
            originalLength: request.input.text.length,
            truncatedLength: maxChars
          });
        }
        return request;
      }
    });

    // Evidence Emission Middleware
    this.registerMiddleware({
      name: 'evidence-emission',
      priority: 10,
      postProcess: async (response, context) => {
        if (this.config.evidenceEmission.enabled && this.config.enableInterpretability) {
          this.emitEvidence({
            eventType: 'inference-completed',
            data: {
              requestId: response.requestId,
              modelId: response.modelId,
              status: response.status,
              latencyMs: response.metrics.latencyMs,
              queueTimeMs: response.metrics.queueTimeMs,
              inferenceTimeMs: response.metrics.inferenceTimeMs,
              endpointId: response.metrics.endpointId,
              tokensGenerated: response.generationMetadata?.tokensGenerated,
              tokensPrompt: response.generationMetadata?.tokensPrompt,
              finishReason: response.generationMetadata?.finishReason,
              correlationId: context.correlationId,
              pdaPhase: context.pdaPhase?.phase,
              agentRole: context.agentRole?.role
            },
            tags: ['inference', 'metrics', response.status]
          });
        }
        return response;
      }
    });
  }

  /**
   * Register a middleware
   */
  public registerMiddleware(middleware: InferenceMiddleware): void {
    // Remove existing middleware with same name
    this.middlewares = this.middlewares.filter(m => m.name !== middleware.name);
    
    // Add new middleware
    this.middlewares.push(middleware);
    
    // Sort by priority (higher priority first)
    this.middlewares.sort((a, b) => b.priority - a.priority);
    
    this.emit('middlewareRegistered', { name: middleware.name, priority: middleware.priority });
  }

  /**
   * Remove a middleware
   */
  public removeMiddleware(name: string): void {
    this.middlewares = this.middlewares.filter(m => m.name !== name);
    this.emit('middlewareRemoved', { name });
  }

  /**
   * Execute inference with middleware chain
   */
  public async infer(
    input: string | Partial<InferenceRequest>,
    options?: {
      pdaPhase?: PDAPhaseContext;
      agentRole?: AgentRoleContext;
      metadata?: Record<string, unknown>;
    }
  ): Promise<InferenceResponse> {
    // Build request
    let request: Partial<InferenceRequest>;
    if (typeof input === 'string') {
      request = { input: { text: input } };
    } else {
      request = input;
    }

    // Build context
    const context: MiddlewareContext = {
      pdaPhase: options?.pdaPhase,
      agentRole: options?.agentRole,
      correlationId: request.metadata?.correlationId ?? this.generateId(),
      startTime: new Date(),
      metadata: options?.metadata ?? {}
    };

    // Pre-process through middleware chain
    for (const middleware of this.middlewares) {
      if (middleware.preProcess) {
        request = await middleware.preProcess(request as InferenceRequest, context);
      }
    }

    // Execute inference
    let response = await this.proxyClient.infer(request);

    // Post-process through middleware chain (in reverse order)
    for (const middleware of [...this.middlewares].reverse()) {
      if (middleware.postProcess) {
        response = await middleware.postProcess(response, context);
      }
    }

    return response;
  }

  /**
   * Execute inference for Plan phase
   */
  public async inferForPlan(
    input: string,
    planContext: {
      planId: string;
      objectives: string[];
    }
  ): Promise<InferenceResponse> {
    return this.infer(input, {
      pdaPhase: {
        phase: 'plan',
        planId: planContext.planId,
        objectives: planContext.objectives
      }
    });
  }

  /**
   * Execute inference for Do phase
   */
  public async inferForDo(
    input: string,
    doContext: {
      doId: string;
      planId: string;
      actions: string[];
    }
  ): Promise<InferenceResponse> {
    return this.infer(input, {
      pdaPhase: {
        phase: 'do',
        planId: doContext.planId,
        doId: doContext.doId,
        actions: doContext.actions
      }
    });
  }

  /**
   * Execute inference for Act phase
   */
  public async inferForAct(
    input: string,
    actContext: {
      actId: string;
      doId: string;
      outcomes: string[];
    }
  ): Promise<InferenceResponse> {
    return this.infer(input, {
      pdaPhase: {
        phase: 'act',
        doId: actContext.doId,
        actId: actContext.actId,
        outcomes: actContext.outcomes
      }
    });
  }

  /**
   * Execute inference for a specific agent role
   */
  public async inferForRole(
    input: string,
    role: AgentRoleContext
  ): Promise<InferenceResponse> {
    return this.infer(input, { agentRole: role });
  }

  /**
   * Get model ID for PDA phase
   */
  private getPhaseModelId(phase: 'plan' | 'do' | 'act'): string | undefined {
    switch (phase) {
      case 'plan':
        return this.config.planPhaseModelId;
      case 'do':
        return this.config.doPhaseModelId;
      case 'act':
        return this.config.actPhaseModelId;
      default:
        return undefined;
    }
  }

  /**
   * Build cache key
   */
  private buildCacheKey(request: InferenceRequest, context: MiddlewareContext): string {
    const keyParts = [
      context.correlationId,
      request.modelId,
      context.pdaPhase?.phase ?? 'none',
      context.agentRole?.role ?? 'none'
    ];
    return keyParts.join(':');
  }

  /**
   * Emit evidence record
   */
  private emitEvidence(options: {
    eventType: string;
    data: Record<string, unknown>;
    tags: string[];
    priority?: 'critical' | 'high' | 'medium' | 'low';
  }): void {
    const evidence: EvidenceRecord = {
      timestamp: new Date().toISOString(),
      runId: this.generateId(),
      command: 'onnx-inference',
      mode: 'pda-cycle',
      emitterName: this.config.evidenceEmission.emitterName,
      eventType: options.eventType,
      category: this.config.evidenceEmission.category,
      data: options.data,
      priority: options.priority ?? 'medium',
      tags: options.tags
    };

    this.evidenceBuffer.push(evidence);
    this.emit('evidenceEmitted', evidence);

    // Trim buffer if too large
    if (this.evidenceBuffer.length > 1000) {
      this.evidenceBuffer = this.evidenceBuffer.slice(-500);
    }
  }

  /**
   * Get evidence buffer
   */
  public getEvidenceBuffer(): EvidenceRecord[] {
    return [...this.evidenceBuffer];
  }

  /**
   * Clear evidence buffer
   */
  public clearEvidenceBuffer(): void {
    this.evidenceBuffer = [];
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.contextCache.entries()) {
        if (value.expiresAt < now) {
          this.contextCache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${random}`;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AgenticWorkflowConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): AgenticWorkflowConfig {
    return { ...this.config };
  }

  /**
   * Get registered middlewares
   */
  public getMiddlewares(): InferenceMiddleware[] {
    return [...this.middlewares];
  }
}

/**
 * Create a singleton middleware instance
 */
let middlewareInstance: AgenticWorkflowMiddleware | null = null;

export function getMiddleware(
  proxyClient?: ONNXLLMProxyClient,
  config?: AgenticWorkflowConfig
): AgenticWorkflowMiddleware {
  if (!middlewareInstance) {
    middlewareInstance = new AgenticWorkflowMiddleware(proxyClient, config);
  }
  return middlewareInstance;
}

export function resetMiddleware(): void {
  middlewareInstance = null;
}
