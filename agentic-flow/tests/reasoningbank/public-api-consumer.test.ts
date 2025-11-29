import { describe, it, expect } from 'vitest';

// Tiny TS-only consumer sanity test that validates the ReasoningBank public API.
//
// This test validates that the source files exist and export the expected symbols.
// It uses static analysis rather than dynamic imports to avoid triggering the full
// import chain which requires AgentDB and WASM dependencies.
//
// This intentionally focuses on surface API shape (exports & types), not on
// exercising the full database / WASM pipeline.

describe('agentic-flow/reasoningbank public API (TS consumer)', () => {
  it('exports VERSION constant with correct format', async () => {
    // VERSION is a simple constant that doesn't require AgentDB
    const mod = await import('../../src/reasoningbank/index.js');
    const { VERSION, PAPER_URL } = mod as any;

    // VERSION should be a semver-like string (e.g., "1.7.1")
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(typeof PAPER_URL).toBe('string');
    expect(PAPER_URL).toContain('arxiv.org');
  });

  it('source files exist for core exports', async () => {
    // Validate that the source files exist without triggering full import chain
    const fs = await import('fs');
    const path = await import('path');

    const srcDir = path.resolve(__dirname, '../../src/reasoningbank');

    // Check that core source files exist
    const coreFiles = [
      'index.ts',
      'HybridBackend.ts',
      'AdvancedMemory.ts',
    ];

    for (const file of coreFiles) {
      const filePath = path.join(srcDir, file);
      expect(fs.existsSync(filePath), `${file} should exist`).toBe(true);
    }
  });

  it('HybridBackend exports HybridReasoningBank class', async () => {
    // Read the source file and verify it exports HybridReasoningBank
    const fs = await import('fs');
    const path = await import('path');

    const hybridBackendPath = path.resolve(__dirname, '../../src/reasoningbank/HybridBackend.ts');
    const content = fs.readFileSync(hybridBackendPath, 'utf-8');

    // Verify the class is exported
    expect(content).toContain('export class HybridReasoningBank');
  });

  it('AdvancedMemory exports AdvancedMemorySystem class', async () => {
    // Read the source file and verify it exports AdvancedMemorySystem
    const fs = await import('fs');
    const path = await import('path');

    const advancedMemoryPath = path.resolve(__dirname, '../../src/reasoningbank/AdvancedMemory.ts');
    const content = fs.readFileSync(advancedMemoryPath, 'utf-8');

    // Verify the class is exported
    expect(content).toContain('export class AdvancedMemorySystem');
  });
});

