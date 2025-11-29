import { describe, it, expect } from 'vitest';

// Tiny TS-only consumer sanity test that validates the ReasoningBank public API.
//
// This test uses a relative import from source since the full build requires
// wasm-pack (Rust toolchain) which may not be available in all CI environments.
//
// This intentionally focuses on surface API shape (exports & types), not on
// exercising the full database / WASM pipeline.

describe('agentic-flow/reasoningbank public API (TS consumer)', () => {
  it('exposes core ReasoningBank entrypoints for external consumers', async () => {
    // Import from source to avoid requiring full build with wasm-pack
    const mod = await import('../../src/reasoningbank/index.js');

    const { HybridReasoningBank, AdvancedMemorySystem, VERSION } = mod as any;

    expect(typeof HybridReasoningBank).toBe('function');
    expect(typeof AdvancedMemorySystem).toBe('function');
    expect(typeof VERSION).toBe('string');
  });

  it('exports VERSION constant with correct format', async () => {
    const mod = await import('../../src/reasoningbank/index.js');
    const { VERSION } = mod as any;

    // VERSION should be a semver-like string (e.g., "1.7.1")
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

