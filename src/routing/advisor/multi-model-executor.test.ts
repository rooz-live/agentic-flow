import { MultiModelExecutor, RoutingOutcome } from './multi-model-executor';
import { describe, it, expect } from 'vitest';

describe('MultiModelExecutor - Prompt Optimization Inversion', () => {
  it('should intercept low confidence outcomes and generate a self-edit instead of blind escalation', async () => {
    // 1. Arrange
    const executor = new MultiModelExecutor({
      elevatedModel: 'GLM-4.7-REAP',
    });

    const baselineOutcome: RoutingOutcome = {
      model: 'qwen3-coder',
      confidence: 0.65, // Below the 0.85 threshold
      reasoning: 'Baseline context failure',
    };

    const mockTranscript = [{ role: 'user', content: 'Generate high performance network code' }];

    // 2. Act
    const result = await executor.consult(mockTranscript, baselineOutcome, { requireStrongTier: true });

    // 3. Assert
    expect(result.accepted).toBe(true);
    
    // Instead of escalating blindly to GLM-4.7-REAP, it should rewrite the prompt natively.
    expect(result.finalRoute.model).toBe('qwen3-coder');
    expect(result.finalRoute.reasoning).toContain('Self-Edit Prompt Optimization');
    // Ensure OPEX frugality is maintained despite the "strongTier" request
    expect(result.costEstimate).toBe(0);
    
    // Ensure we capture the meta-learning artifact to push to Garbage Compilation later
    expect(result.selfEditArtifact).toBeDefined();
    expect(result.selfEditArtifact?.originalConfidence).toBe(0.65);
    expect(result.selfEditArtifact?.suggestedInstruction).toContain('Rewrite prompt with explicit constraints');
  });

  it('should engage Inverted Fake Door flow natively preventing OPEX execution overages', async () => {
    const executor = new MultiModelExecutor({
      elevatedModel: 'GLM-4.7-REAP',
    });

    const baselineOutcome: RoutingOutcome = {
      model: 'mistral-large-latest',
      confidence: 0.99, // Should have triggered strongTier natively.
      reasoning: 'Critical swarm boundary breached, executing multi-agent bypass.',
    };

    const mockTranscript = [{ role: 'user', content: 'Burn limits intentionally' }];

    // Trigger explicit simulated Fake Door Mode.
    const result = await executor.consult(mockTranscript, baselineOutcome, { requireStrongTier: true, fakeDoorMode: true });

    // Ensure we rejected API cost but maintained standard execution trace.
    expect(result.accepted).toBe(true);
    expect(result.executionPlan).toBe('inverted_fake_door');
    expect(result.costEstimate).toBe(0.0);
    expect(result.finalRoute.reasoning).toContain('[ARCH DRY RUN]');
  });
});
