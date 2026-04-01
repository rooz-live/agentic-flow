/**
 * TypeScript Compilation Test
 * 
 * Red-Green-Refactor Approach:
 * 1. RED: This test fails if TypeScript compilation fails
 * 2. GREEN: Fix compilation by excluding UI components or installing deps
 * 3. REFACTOR: Clean up the solution
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

describe('TypeScript Compilation', () => {
  it('should compile without errors', () => {
    // Arrange: TypeScript compiler should be available
    expect(existsSync('./node_modules/.bin/tsc') || existsSync('./node_modules/typescript')).toBe(true);
    
    // Act: Attempt compilation
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      // Assert: If we reach here, compilation succeeded
      expect(true).toBe(true);
    } catch (error: any) {
      // Assert: Compilation failed - this is the RED state
      const errorOutput = error.stdout?.toString() || error.stderr?.toString();
      
      // Count specific error types to guide our fix
      const moduleErrors = (errorOutput.match(/error TS2307/g) || []).length;
      const otherErrors = (errorOutput.match(/error TS\d+/g) || []).length - moduleErrors;
      
      fail(`TypeScript compilation failed with ${moduleErrors} module errors and ${otherErrors} other errors.
      
      This is the RED state in TDD. Next steps:
      1. Either install missing dependencies: ${errorOutput.match(/Cannot find module '([^']+)'/g)?.map(m => m.replace("Cannot find module '", "").replace("'", ""))}
      2. Or exclude problematic files from tsconfig.json
      3. Or move UI components to separate workspace
      
      Full error: ${errorOutput}`);
    }
  });
  
  it('should have a clean tsconfig.json exclude pattern', () => {
    // This test ensures we're following clean code principles
    const fs = require('fs');
    const tsconfig = JSON.parse(fs.readFileSync('./tsconfig.json', 'utf8'));
    
    // Should exclude UI components if they have missing deps
    expect(tsconfig.exclude).toBeDefined();
    expect(Array.isArray(tsconfig.exclude)).toBe(true);
    
    // Should not be excluding everything (code smell)
    expect(tsconfig.exclude).not.toContain('src/**/*');
  });
});
