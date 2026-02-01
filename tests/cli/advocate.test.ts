/**
 * TDD Test Suite for Advocate CLI
 * 
 * Capabilities:
 * - Document/script consolidation with capability preservation
 * - DDD boundary enforcement
 * - ADR generation
 * - Script dependency analysis
 * - Sprawl detection
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AdvocateCLI } from '../../src/cli/advocate';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('AdvocateCLI', () => {
  let tmpDir: string;
  let advocate: AdvocateCLI;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'advocate-test-'));
    advocate = new AdvocateCLI({ workDir: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('audit scripts', () => {
    it('should detect script sprawl', async () => {
      // Create test scripts
      fs.writeFileSync(path.join(tmpDir, 'script1.sh'), '#!/bin/bash\necho "test"');
      fs.writeFileSync(path.join(tmpDir, 'script2.sh'), '#!/bin/bash\necho "test"');
      fs.writeFileSync(path.join(tmpDir, 'script3.sh'), '#!/bin/bash\necho "test"');

      const result = await advocate.audit('scripts', { path: tmpDir });

      expect(result.totalFiles).toBe(3);
      expect(result.sprawlDetected).toBe(true);
      expect(result.recommendations).toHaveLength(1);
    });

    it('should extract capabilities from scripts', async () => {
      const scriptContent = `#!/bin/bash
# Extract capabilities from repository
# Dependencies: git, jq
git log --oneline
jq '.capabilities'`;

      fs.writeFileSync(path.join(tmpDir, 'extract.sh'), scriptContent);

      const result = await advocate.audit('scripts', { 
        path: tmpDir,
        extractCapabilities: true 
      });

      expect(result.capabilities).toContain('git-log-extraction');
      expect(result.capabilities).toContain('json-parsing');
      expect(result.dependencies).toEqual(['git', 'jq']);
    });

    it('should identify duplicate functionality', async () => {
      fs.writeFileSync(path.join(tmpDir, 'deploy1.sh'), 'npm run build && npm run deploy');
      fs.writeFileSync(path.join(tmpDir, 'deploy2.sh'), 'npm run build && npm run deploy');

      const result = await advocate.audit('scripts', { 
        path: tmpDir,
        detectDuplicates: true 
      });

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].files).toEqual(['deploy1.sh', 'deploy2.sh']);
    });
  });

  describe('consolidate', () => {
    it('should consolidate scripts with DDD structure', async () => {
      const scriptsDir = path.join(tmpDir, 'scripts');
      fs.mkdirSync(scriptsDir);
      fs.writeFileSync(path.join(scriptsDir, 'deploy.sh'), '#!/bin/bash\necho deploy');
      fs.writeFileSync(path.join(scriptsDir, 'test.sh'), '#!/bin/bash\necho test');

      const result = await advocate.consolidate('scripts', {
        source: scriptsDir,
        target: path.join(tmpDir, 'domains'),
        preserveCapabilities: true,
        generateADRs: true
      });

      expect(result.success).toBe(true);
      expect(result.filesConsolidated).toBe(2);
      expect(result.adrsGenerated).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(tmpDir, 'domains/deployment/methods'))).toBe(true);
    });

    it('should preserve all capabilities during consolidation', async () => {
      const sourceDir = path.join(tmpDir, 'source');
      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, 'analyze.sh'), `#!/bin/bash
# Capability: performance-analysis
# Capability: metric-collection
./collect-metrics.sh | ./analyze.sh`);

      const result = await advocate.consolidate('scripts', {
        source: sourceDir,
        target: path.join(tmpDir, 'target'),
        preserveCapabilities: true
      });

      const capabilityFile = path.join(tmpDir, 'target', '.capabilities.json');
      expect(fs.existsSync(capabilityFile)).toBe(true);

      const capabilities = JSON.parse(fs.readFileSync(capabilityFile, 'utf-8'));
      expect(capabilities).toContain('performance-analysis');
      expect(capabilities).toContain('metric-collection');
    });

    it('should generate ADRs for architectural decisions', async () => {
      const sourceDir = path.join(tmpDir, 'source');
      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, 'legacy-deploy.sh'), '#!/bin/bash\necho old');

      const result = await advocate.consolidate('scripts', {
        source: sourceDir,
        target: path.join(tmpDir, 'target'),
        generateADRs: true
      });

      const adrDir = path.join(tmpDir, 'target', 'adrs');
      expect(fs.existsSync(adrDir)).toBe(true);

      const adrs = fs.readdirSync(adrDir);
      expect(adrs.length).toBeGreaterThan(0);
      expect(adrs[0]).toMatch(/^\d{4}-/); // Numbered ADR format
    });
  });

  describe('analyze dependencies', () => {
    it('should build dependency graph', async () => {
      const script1 = path.join(tmpDir, 'script1.sh');
      const script2 = path.join(tmpDir, 'script2.sh');
      
      fs.writeFileSync(script1, '#!/bin/bash\n./script2.sh');
      fs.writeFileSync(script2, '#!/bin/bash\necho done');

      const result = await advocate.analyzeDependencies(tmpDir);

      expect(result.graph).toBeDefined();
      expect(result.graph.nodes).toHaveLength(2);
      expect(result.graph.edges).toHaveLength(1);
      expect(result.graph.edges[0]).toEqual({ from: 'script1.sh', to: 'script2.sh' });
    });

    it('should detect circular dependencies', async () => {
      const script1 = path.join(tmpDir, 'a.sh');
      const script2 = path.join(tmpDir, 'b.sh');
      
      fs.writeFileSync(script1, '#!/bin/bash\n./b.sh');
      fs.writeFileSync(script2, '#!/bin/bash\n./a.sh');

      const result = await advocate.analyzeDependencies(tmpDir);

      expect(result.circularDependencies).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0]).toEqual(['a.sh', 'b.sh', 'a.sh']);
    });

    it('should output dependency graph as JSON', async () => {
      fs.writeFileSync(path.join(tmpDir, 'test.sh'), '#!/bin/bash\necho test');

      const outputFile = path.join(tmpDir, 'deps.json');
      await advocate.analyzeDependencies(tmpDir, { output: outputFile, format: 'json' });

      expect(fs.existsSync(outputFile)).toBe(true);
      const deps = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      expect(deps.nodes).toBeDefined();
    });
  });

  describe('validate wsjf', () => {
    it('should validate WSJF documentation sprawl', async () => {
      const docsDir = path.join(tmpDir, 'docs');
      fs.mkdirSync(docsDir);
      
      // Create sprawl
      for (let i = 0; i < 10; i++) {
        fs.writeFileSync(path.join(docsDir, `doc${i}.md`), '# Documentation');
      }

      const result = await advocate.validateWsjf(docsDir);

      expect(result.sprawlScore).toBeGreaterThan(7); // High sprawl
      expect(result.consolidationOpportunities).toHaveLength(1);
    });

    it('should recommend consolidation based on WSJF', async () => {
      const dir = path.join(tmpDir, 'messy');
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, 'old.md'), '# Old doc');
      fs.writeFileSync(path.join(dir, 'new.md'), '# New doc');
      fs.writeFileSync(path.join(dir, 'draft.md'), '# Draft');

      const result = await advocate.validateWsjf(dir);

      expect(result.recommendations).toBeDefined();
      expect(result.wsjfScore).toBeGreaterThan(0);
    });
  });

  describe('inspect architecture', () => {
    it('should verify DDD compliance', async () => {
      // Create proper DDD structure
      const domainsDir = path.join(tmpDir, 'domains');
      const authDir = path.join(domainsDir, 'authentication');
      fs.mkdirSync(authDir, { recursive: true });
      fs.mkdirSync(path.join(authDir, 'methods'));
      fs.mkdirSync(path.join(authDir, 'protocols'));
      fs.mkdirSync(path.join(authDir, 'tests'));

      const result = await advocate.inspectArchitecture(tmpDir, { dddCompliance: true });

      expect(result.dddCompliant).toBe(true);
      expect(result.domains).toContain('authentication');
    });

    it('should detect DDD violations', async () => {
      // Create non-compliant structure
      fs.writeFileSync(path.join(tmpDir, 'random-script.sh'), '#!/bin/bash\necho test');

      const result = await advocate.inspectArchitecture(tmpDir, { dddCompliance: true });

      expect(result.dddCompliant).toBe(false);
      expect(result.violations).toHaveLength(1);
    });
  });

  describe('case switch', () => {
    it('should provide interactive decision support', async () => {
      const options = ['consolidate', 'archive', 'ignore'];
      const result = await advocate.caseSwitch({
        scenario: 'duplicate-scripts',
        options,
        autoSelect: true // For testing
      });

      expect(result.selected).toBe('consolidate');
      expect(result.reasoning).toBeDefined();
    });
  });

  describe('edge cases - error handling', () => {
    it('should handle missing directory paths gracefully', async () => {
      const nonExistentPath = path.join(tmpDir, 'does-not-exist');
      
      const result = await advocate.audit('scripts', { path: nonExistentPath });
      
      expect(result.totalFiles).toBe(0);
      expect(result.sprawlDetected).toBe(false);
    });

    it('should handle empty directories', async () => {
      const emptyDir = path.join(tmpDir, 'empty');
      fs.mkdirSync(emptyDir);
      
      const result = await advocate.audit('scripts', { path: emptyDir });
      
      expect(result.totalFiles).toBe(0);
      expect(result.sprawlDetected).toBe(false);
    });

    it('should handle files with no extension', async () => {
      fs.writeFileSync(path.join(tmpDir, 'README'), '# Documentation');
      
      const result = await advocate.audit('docs', { path: tmpDir });
      
      expect(result.totalFiles).toBe(0); // No .md files
    });

    it('should handle invalid file content during capability extraction', async () => {
      const invalidScript = path.join(tmpDir, 'invalid.sh');
      fs.writeFileSync(invalidScript, '\x00\x01\x02\x03'); // Binary garbage
      
      const result = await advocate.audit('scripts', {
        path: tmpDir,
        extractCapabilities: true
      });
      
      expect(result.capabilities).toBeDefined();
      expect(Array.isArray(result.capabilities)).toBe(true);
    });

    it('should handle missing target directory during consolidation', async () => {
      const sourceDir = path.join(tmpDir, 'source');
      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, 'test.sh'), '#!/bin/bash\necho test');
      
      const targetDir = path.join(tmpDir, 'target'); // Does not exist yet
      
      const result = await advocate.consolidate('scripts', {
        source: sourceDir,
        target: targetDir,
        preserveCapabilities: true
      });
      
      expect(result.success).toBe(true);
      expect(fs.existsSync(targetDir)).toBe(true); // Should be created
    });

    it('should handle broken symbolic links', async () => {
      const targetFile = path.join(tmpDir, 'target.sh');
      const linkFile = path.join(tmpDir, 'link.sh');
      
      // Create symlink before target exists
      try {
        fs.symlinkSync(targetFile, linkFile);
        
        const result = await advocate.audit('scripts', { path: tmpDir });
        
        // Should not crash, even with broken symlink
        expect(result).toBeDefined();
      } catch (err) {
        // Symlinks may not be supported on all systems
        expect(err).toBeDefined();
      }
    });
  });

  describe('edge cases - large scale', () => {
    it('should handle 100+ files efficiently', async () => {
      const largeDir = path.join(tmpDir, 'large');
      fs.mkdirSync(largeDir);
      
      // Create 150 script files
      for (let i = 0; i < 150; i++) {
        fs.writeFileSync(
          path.join(largeDir, `script${i}.sh`),
          `#!/bin/bash\necho "Script ${i}"`
        );
      }
      
      const startTime = Date.now();
      const result = await advocate.audit('scripts', { path: largeDir });
      const duration = Date.now() - startTime;
      
      expect(result.totalFiles).toBe(150);
      expect(result.sprawlDetected).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });

    it('should handle deeply nested directory structures', async () => {
      const deepDir = path.join(tmpDir, 'level1/level2/level3/level4/level5');
      fs.mkdirSync(deepDir, { recursive: true });
      fs.writeFileSync(path.join(deepDir, 'deep.sh'), '#!/bin/bash\necho deep');
      
      const result = await advocate.audit('scripts', { path: tmpDir });
      
      expect(result.totalFiles).toBeGreaterThan(0);
    });

    it('should handle files with very long names', async () => {
      const longName = 'a'.repeat(200) + '.sh';
      fs.writeFileSync(path.join(tmpDir, longName), '#!/bin/bash\necho long');
      
      const result = await advocate.audit('scripts', { path: tmpDir });
      
      expect(result.totalFiles).toBe(1);
    });
  });

  describe('edge cases - dependency analysis', () => {
    it('should handle self-referencing scripts', async () => {
      const selfRef = path.join(tmpDir, 'recursive.sh');
      fs.writeFileSync(selfRef, '#!/bin/bash\n./recursive.sh');
      
      const result = await advocate.analyzeDependencies(tmpDir);
      
      expect(result.circularDependencies).toBe(true);
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('should handle missing dependency references', async () => {
      const script = path.join(tmpDir, 'caller.sh');
      fs.writeFileSync(script, '#!/bin/bash\n./nonexistent.sh');
      
      const result = await advocate.analyzeDependencies(tmpDir);
      
      expect(result.graph.nodes).toContain('caller.sh');
      expect(result.graph.edges).toHaveLength(0); // No valid edges
    });

    it('should handle complex circular dependency chains', async () => {
      fs.writeFileSync(path.join(tmpDir, 'a.sh'), '#!/bin/bash\n./b.sh');
      fs.writeFileSync(path.join(tmpDir, 'b.sh'), '#!/bin/bash\n./c.sh');
      fs.writeFileSync(path.join(tmpDir, 'c.sh'), '#!/bin/bash\n./a.sh');
      
      const result = await advocate.analyzeDependencies(tmpDir);
      
      expect(result.circularDependencies).toBe(true);
      expect(result.cycles.length).toBeGreaterThan(0);
      expect(result.cycles[0].length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('edge cases - WSJF validation', () => {
    it('should handle directories with no files', async () => {
      const emptyDir = path.join(tmpDir, 'empty');
      fs.mkdirSync(emptyDir);
      
      const result = await advocate.validateWsjf(emptyDir);
      
      expect(result.sprawlScore).toBe(0);
      expect(result.consolidationOpportunities).toHaveLength(0);
    });

    it('should handle single file (no sprawl)', async () => {
      fs.writeFileSync(path.join(tmpDir, 'single.md'), '# Single doc');
      
      const result = await advocate.validateWsjf(tmpDir);
      
      expect(result.sprawlScore).toBeLessThanOrEqual(2);
      expect(result.consolidationOpportunities).toHaveLength(0);
    });

    it('should calculate WSJF score correctly for high sprawl', async () => {
      for (let i = 0; i < 20; i++) {
        fs.writeFileSync(path.join(tmpDir, `doc${i}.md`), '# Doc');
      }
      
      const result = await advocate.validateWsjf(tmpDir);
      
      expect(result.sprawlScore).toBe(10); // Capped at 10
      expect(result.wsjfScore).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases - DDD architecture', () => {
    it('should handle partial DDD structure', async () => {
      const domainsDir = path.join(tmpDir, 'domains');
      const authDir = path.join(domainsDir, 'authentication');
      fs.mkdirSync(authDir, { recursive: true });
      fs.mkdirSync(path.join(authDir, 'methods'));
      // Missing 'protocols' and 'tests' dirs
      
      const result = await advocate.inspectArchitecture(tmpDir, { dddCompliance: true });
      
      expect(result.dddCompliant).toBe(false);
      expect(result.violations).toBeDefined();
      expect(result.violations!.length).toBeGreaterThan(0);
    });

    it('should handle empty domains directory', async () => {
      const domainsDir = path.join(tmpDir, 'domains');
      fs.mkdirSync(domainsDir);
      
      const result = await advocate.inspectArchitecture(tmpDir, { dddCompliance: true });
      
      expect(result.domains).toHaveLength(0);
    });

    it('should handle mixed files and directories in domains', async () => {
      const domainsDir = path.join(tmpDir, 'domains');
      fs.mkdirSync(domainsDir);
      fs.writeFileSync(path.join(domainsDir, 'README.md'), '# Domains');
      
      const authDir = path.join(domainsDir, 'auth');
      fs.mkdirSync(authDir);
      fs.mkdirSync(path.join(authDir, 'methods'));
      fs.mkdirSync(path.join(authDir, 'protocols'));
      fs.mkdirSync(path.join(authDir, 'tests'));
      
      const result = await advocate.inspectArchitecture(tmpDir, { dddCompliance: true });
      
      expect(result.domains).toContain('auth');
      expect(result.domains).not.toContain('README.md');
    });
  });

  describe('edge cases - consolidation', () => {
    it('should handle consolidation with no capabilities to preserve', async () => {
      const sourceDir = path.join(tmpDir, 'source');
      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, 'simple.sh'), '#!/bin/bash\necho simple');
      
      const result = await advocate.consolidate('scripts', {
        source: sourceDir,
        target: path.join(tmpDir, 'target'),
        preserveCapabilities: true
      });
      
      expect(result.success).toBe(true);
      expect(result.filesConsolidated).toBe(1);
    });

    it('should handle duplicate filenames in consolidation', async () => {
      const sourceDir = path.join(tmpDir, 'source');
      const subDir = path.join(sourceDir, 'subdir');
      fs.mkdirSync(subDir, { recursive: true });
      
      // Create two files with same name in different dirs
      fs.writeFileSync(path.join(sourceDir, 'deploy.sh'), '#!/bin/bash\necho v1');
      fs.writeFileSync(path.join(subDir, 'deploy.sh'), '#!/bin/bash\necho v2');
      
      const result = await advocate.consolidate('scripts', {
        source: sourceDir,
        target: path.join(tmpDir, 'target'),
        preserveCapabilities: true
      });
      
      expect(result.success).toBe(true);
      expect(result.filesConsolidated).toBe(2);
    });
  });
});
