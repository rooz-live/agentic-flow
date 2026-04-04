/**
 * ONNX LLM Proxy Middleware
 *
 * Middleware for integrating ONNX inference with agentic workflow
 * orchestration, including PDA cycle support and evidence emission.
 */
import { EventEmitter } from 'events';
import type { InferenceRequest, InferenceResponse, AgenticWorkflowConfig } from './types.js';
import { ONNXLLMProxyClient } from './proxy-client.js';
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
export declare class AgenticWorkflowMiddleware extends EventEmitter {
    private proxyClient;
    private config;
    private middlewares;
    private evidenceBuffer;
    private contextCache;
    constructor(proxyClient?: ONNXLLMProxyClient, config?: AgenticWorkflowConfig);
    /**
     * Register default middlewares
     */
    private registerDefaultMiddlewares;
    /**
     * Register a middleware
     */
    registerMiddleware(middleware: InferenceMiddleware): void;
    /**
     * Remove a middleware
     */
    removeMiddleware(name: string): void;
    /**
     * Execute inference with middleware chain
     */
    infer(input: string | Partial<InferenceRequest>, options?: {
        pdaPhase?: PDAPhaseContext;
        agentRole?: AgentRoleContext;
        metadata?: Record<string, unknown>;
    }): Promise<InferenceResponse>;
    /**
     * Execute inference for Plan phase
     */
    inferForPlan(input: string, planContext: {
        planId: string;
        objectives: string[];
    }): Promise<InferenceResponse>;
    /**
     * Execute inference for Do phase
     */
    inferForDo(input: string, doContext: {
        doId: string;
        planId: string;
        actions: string[];
    }): Promise<InferenceResponse>;
    /**
     * Execute inference for Act phase
     */
    inferForAct(input: string, actContext: {
        actId: string;
        doId: string;
        outcomes: string[];
    }): Promise<InferenceResponse>;
    /**
     * Execute inference for a specific agent role
     */
    inferForRole(input: string, role: AgentRoleContext): Promise<InferenceResponse>;
    /**
     * Get model ID for PDA phase
     */
    private getPhaseModelId;
    /**
     * Build cache key
     */
    private buildCacheKey;
    /**
     * Emit evidence record
     */
    private emitEvidence;
    /**
     * Get evidence buffer
     */
    getEvidenceBuffer(): EvidenceRecord[];
    /**
     * Clear evidence buffer
     */
    clearEvidenceBuffer(): void;
    /**
     * Start cache cleanup interval
     */
    private startCacheCleanup;
    /**
     * Generate unique ID
     */
    private generateId;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<AgenticWorkflowConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): AgenticWorkflowConfig;
    /**
     * Get registered middlewares
     */
    getMiddlewares(): InferenceMiddleware[];
}
export declare function getMiddleware(proxyClient?: ONNXLLMProxyClient, config?: AgenticWorkflowConfig): AgenticWorkflowMiddleware;
export declare function resetMiddleware(): void;
//# sourceMappingURL=middleware.d.ts.map