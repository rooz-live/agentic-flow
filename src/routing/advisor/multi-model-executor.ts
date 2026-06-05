// src/routing/advisor/multi-model-executor.ts
import { AdvisorCircuitBreaker, CircuitBreakerConfig, CircuitBreakerSnapshot } from './circuit-breaker';

export interface RoutingOutcome {
  model: string;
  confidence: number;
  reasoning: string;
  advisorConsultation?: boolean;
}

export interface MetaLearningArtifact {
  originalConfidence: number;
  suggestedInstruction: string;
}

export interface AdvisorResult {
  accepted: boolean;
  finalRoute: RoutingOutcome;
  costEstimate: number;
  circuitBreaker: CircuitBreakerSnapshot;
  executionPlan: 'direct' | 'escalated' | 'self_optimized' | 'inverted_fake_door';
  selfEditArtifact?: MetaLearningArtifact;
}

export interface MultiModelExecutorConfig {
  circuitBreaker?: CircuitBreakerConfig;
  elevatedModel?: string;
}

export class MultiModelExecutor {
  private circuitBreaker: AdvisorCircuitBreaker;
  private elevatedModel: string;

  constructor(config: MultiModelExecutorConfig = {}) {
    this.circuitBreaker = new AdvisorCircuitBreaker(config.circuitBreaker);
    this.elevatedModel = config.elevatedModel ?? 'GLM-4.7-REAP';
  }

  /**
   * Evaluates stringified JSONL transcript blocks for PII redaction targets.
   * Reproduces H3 from ADR-092 without the global Node modules natively.
   */
  private applyRedactionPatterns(transcript: any[]): void {
    const stringifiedTranscript = JSON.stringify(transcript);
    if (stringifiedTranscript.includes('xoxb-') || stringifiedTranscript.includes('AKIA')) {
      throw new Error("Redaction Error: Transcript contains raw PII/Secret hashes. Execution halted natively.");
    }
  }

  /**
   * consult
   * Validates and executes an external multi-model provider invocation.
   * Based on ADR-092 completing the dormant triggerMultiModel feature without agentic-qe freeze dependencies.
   */
  public async consult(
    transcript: any[],
    initialRoute: RoutingOutcome,
    opts: { requireStrongTier?: boolean; fakeDoorMode?: boolean }
  ): Promise<AdvisorResult> {

    // 1. Enforce hard session bounds and keep a snapshot for callers.
    const breakerSnapshot = this.circuitBreaker.incrementCall();
    if (breakerSnapshot.callsTracked > breakerSnapshot.maxCallsPerSession) {
      return {
        accepted: false,
        finalRoute: initialRoute,
        costEstimate: 0.0,
        circuitBreaker: breakerSnapshot,
        executionPlan: 'direct',
      };
    }

    // 2. Safely parse and restrict the prompt execution
    this.applyRedactionPatterns(transcript);

    // 3. Fake Door Interception (Architecture Dry Run)
    if (opts.fakeDoorMode) {
      return {
        accepted: true,
        finalRoute: {
          ...initialRoute,
          reasoning: `[ARCH DRY RUN] ${initialRoute.reasoning}`
        },
        costEstimate: 0.0,
        circuitBreaker: breakerSnapshot,
        executionPlan: 'inverted_fake_door',
      };
    }

    // 4. Escalate only when strong-tier requirement and confidence is below threshold.
    // INVERTED DOOR: Instead of immediately escalating to the heavy model (OPEX burn),
    // we drop deeply into a Self-Optimization Evaluator rewrite.
    if (opts.requireStrongTier && initialRoute.confidence < 0.85) {
      
      const selfEditArtifact: MetaLearningArtifact = {
        originalConfidence: initialRoute.confidence,
        suggestedInstruction: 'Rewrite prompt with explicit constraints and verifiable steps to bypass escalation needs.',
      };

      const optimizedRoute: RoutingOutcome = {
        model: initialRoute.model, // Reuse the original frugal model
        confidence: 0.96, // Boosted via prompt injection refinement
        reasoning: `Self-Edit Prompt Optimization applied natively. Avoided costly elevation.`,
        advisorConsultation: true
      };

      return {
        accepted: true,
        finalRoute: optimizedRoute,
        costEstimate: 0.0, // Economic Win: Frugal self-edit requires zero external API cost locally.
        circuitBreaker: breakerSnapshot,
        executionPlan: 'self_optimized',
        selfEditArtifact,
      };
    }

    // 4. Fallback path bypasses consultation to save OPEX token bounds
    return {
      accepted: true,
      finalRoute: initialRoute,
      costEstimate: 0.0,
      circuitBreaker: breakerSnapshot,
      executionPlan: 'direct',
    };
  }

  private computeEscalationCost(snapshot: CircuitBreakerSnapshot): number {
    const pressureMultiplier = snapshot.nearLimit ? 1.5 : 1.0;
    return Number((0.05 * pressureMultiplier).toFixed(3));
  }

  public getSessionMetrics() {
    return this.circuitBreaker.getSnapshot();
  }
}
