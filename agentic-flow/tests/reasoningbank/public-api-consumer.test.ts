import { describe, it, expect } from 'vitest';

// Tiny TS-only consumer sanity test that imports the published ReasoningBank
// entrypoint the same way an external package consumer would.
//
// This intentionally focuses on surface API shape (exports & types), not on
// exercising the full database / WASM pipeline.

describe('agentic-flow/reasoningbank public API (TS consumer)', () => {
  it('exposes core ReasoningBank entrypoints for external consumers', async () => {
    const mod = await import('agentic-flow/reasoningbank');

    const { HybridReasoningBank, AdvancedMemorySystem, VERSION } = mod as any;

    expect(typeof HybridReasoningBank).toBe('function');
    expect(typeof AdvancedMemorySystem).toBe('function');
    expect(typeof VERSION).toBe('string');
  });
});

