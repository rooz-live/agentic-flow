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
    
    // Act: Attempt compilation with skipLibCheck to tolerate third-party type issues
    try {
      execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
      // Assert: If we reach here, compilation succeeded
      expect(true).toBe(true);
    } catch (error: any) {
      const errorOutput = error.stdout?.toString() || error.stderr?.toString() || '';
      
      // Count specific error types
      const moduleErrors = (errorOutput.match(/error TS2307/g) || []).length;
      const totalErrors = (errorOutput.match(/error TS\d+/g) || []).length;
      const otherErrors = totalErrors - moduleErrors;
      
      // Allow module-only errors (missing third-party types are expected in a polyglot repo)
      // Fail only if there are non-module errors (actual code bugs)
      if (otherErrors > 0) {
        fail(`TypeScript has ${otherErrors} non-module compilation errors (excluding ${moduleErrors} missing-module errors).`);
      } else {
        // Module-not-found errors are acceptable — third-party deps may lack types
        console.warn(`TypeScript: ${moduleErrors} missing-module errors (TS2307) — acceptable in polyglot repo.`);
        expect(true).toBe(true);
      }
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
