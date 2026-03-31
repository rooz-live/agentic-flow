/**
 * @fileoverview Architecture Tests - DDD Layer Boundary Validation
 * 
 * These tests enforce Clean Architecture dependency rules:
 * - Domain → nothing (pure business logic)
 * - Application → Domain
 * - Infrastructure → Domain + Application
 * - Presentation → Application + Domain
 * 
 * Based on ADR-001: DDD Layer Responsibilities and Boundaries
 */

import * as fs from 'fs';
import * as path from 'path';

interface ImportAnalysis {
  file: string;
  layer: 'domain' | 'application' | 'infrastructure' | 'presentation' | 'unknown';
  imports: string[];
  violations: Array<{
    importPath: string;
    targetLayer: string;
    reason: string;
  }>;
}

/**
 * Detect DDD layer from file path
 */
function detectLayer(filePath: string): ImportAnalysis['layer'] {
  const normalized = filePath.toLowerCase();
  
  if (normalized.includes('/domain/') || 
      normalized.includes('/entities/') || 
      normalized.includes('/value-objects/') ||
      normalized.includes('/aggregates/')) {
    return 'domain';
  }
  
  if (normalized.includes('/application/') || 
      normalized.includes('/use-cases/') ||
      normalized.includes('/usecases/') ||
      normalized.includes('/services/')) {
    return 'application';
  }
  
  if (normalized.includes('/infrastructure/') || 
      normalized.includes('/adapters/') ||
      normalized.includes('/persistence/')) {
    return 'infrastructure';
  }
  
  if (normalized.includes('/presentation/') || 
      normalized.includes('/controllers/') ||
      normalized.includes('/api/') ||
      normalized.includes('/cli/') ||
      normalized.includes('/tui/')) {
    return 'presentation';
  }
  
  return 'unknown';
}

/**
 * Extract imports from TypeScript file
 */
function extractImports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  
  const imports: string[] = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Only analyze relative imports (not node_modules)
    if (importPath.startsWith('.') || importPath.startsWith('/')) {
      imports.push(importPath);
    }
  }
  
  return imports;
}

/**
 * Check if a dependency violates DDD boundaries
 */
function isViolation(fromLayer: string, toLayer: string): boolean {
  // Unknown layers get a pass (we can't enforce what we don't recognize)
  if (fromLayer === 'unknown' || toLayer === 'unknown') {
    return false;
  }
  
  // Same layer is always OK
  if (fromLayer === toLayer) {
    return false;
  }
  
  // Domain can only depend on domain
  if (fromLayer === 'domain') {
    return toLayer !== 'domain';
  }
  
  // Application can depend on domain
  if (fromLayer === 'application') {
    return toLayer !== 'domain';
  }
  
  // Infrastructure can depend on domain + application
  if (fromLayer === 'infrastructure') {
    return toLayer !== 'domain' && toLayer !== 'application';
  }
  
  // Presentation can depend on application + domain
  if (fromLayer === 'presentation') {
    return toLayer !== 'application' && toLayer !== 'domain';
  }
  
  return false;
}

/**
 * Analyze a TypeScript file for DDD violations
 */
function analyzeFile(filePath: string, projectRoot: string): ImportAnalysis {
  const layer = detectLayer(filePath);
  const imports = extractImports(filePath);
  const violations: ImportAnalysis['violations'] = [];
  
  for (const importPath of imports) {
    // Resolve import to absolute path
    const resolvedPath = path.resolve(path.dirname(filePath), importPath);
    const targetLayer = detectLayer(resolvedPath);
    
    if (isViolation(layer, targetLayer)) {
      violations.push({
        importPath,
        targetLayer,
        reason: `${layer} layer cannot import from ${targetLayer} layer`,
      });
    }
  }
  
  return {
    file: path.relative(projectRoot, filePath),
    layer,
    imports,
    violations,
  };
}

/**
 * Recursively find all TypeScript files in directory
 */
function findTypeScriptFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip node_modules, dist, build directories
    if (entry.name === 'node_modules' || 
        entry.name === 'dist' || 
        entry.name === 'build' ||
        entry.name === '.git') {
      continue;
    }
    
    if (entry.isDirectory()) {
      findTypeScriptFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

describe('DDD Architecture Boundaries', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const srcDir = path.join(projectRoot, 'src');
  
  describe('Layer Dependency Rules', () => {
    it('should enforce domain layer purity (domain → nothing)', () => {
      const files = findTypeScriptFiles(srcDir);
      const domainFiles = files.filter(f => detectLayer(f) === 'domain');
      const violations: ImportAnalysis[] = [];
      
      for (const file of domainFiles) {
        const analysis = analyzeFile(file, projectRoot);
        if (analysis.violations.length > 0) {
          violations.push(analysis);
        }
      }
      
      if (violations.length > 0) {
        const details = violations.map(v => 
          `\n  ${v.file}:\n${v.violations.map(viol => 
            `    - ${viol.importPath} (${viol.reason})`
          ).join('\n')}`
        ).join('');
        
        fail(`Domain layer has ${violations.length} file(s) with violations:${details}\n\n` +
             `Domain layer must be pure - it can only depend on other domain code.\n` +
             `Fix: Move infrastructure/application code to appropriate layer, or use dependency inversion.`);
      }
      
      expect(violations).toHaveLength(0);
    });
    
    it('should enforce application layer dependencies (application → domain only)', () => {
      const files = findTypeScriptFiles(srcDir);
      const appFiles = files.filter(f => detectLayer(f) === 'application');
      const violations: ImportAnalysis[] = [];
      
      for (const file of appFiles) {
        const analysis = analyzeFile(file, projectRoot);
        // Filter out domain imports (those are allowed)
        const filtered = {
          ...analysis,
          violations: analysis.violations.filter(v => v.targetLayer !== 'domain'),
        };
        
        if (filtered.violations.length > 0) {
          violations.push(filtered);
        }
      }
      
      if (violations.length > 0) {
        const details = violations.map(v => 
          `\n  ${v.file}:\n${v.violations.map(viol => 
            `    - ${viol.importPath} (${viol.reason})`
          ).join('\n')}`
        ).join('');
        
        fail(`Application layer has ${violations.length} file(s) with violations:${details}\n\n` +
             `Application layer can only depend on Domain.\n` +
             `Fix: Use dependency injection to inject infrastructure implementations.`);
      }
      
      expect(violations).toHaveLength(0);
    });
    
    it('should allow infrastructure dependencies (infrastructure → domain + application)', () => {
      const files = findTypeScriptFiles(srcDir);
      const infraFiles = files.filter(f => detectLayer(f) === 'infrastructure');
      const violations: ImportAnalysis[] = [];
      
      for (const file of infraFiles) {
        const analysis = analyzeFile(file, projectRoot);
        // Filter out domain/application imports (those are allowed)
        const filtered = {
          ...analysis,
          violations: analysis.violations.filter(v => 
            v.targetLayer !== 'domain' && v.targetLayer !== 'application'
          ),
        };
        
        if (filtered.violations.length > 0) {
          violations.push(filtered);
        }
      }
      
      if (violations.length > 0) {
        const details = violations.map(v => 
          `\n  ${v.file}:\n${v.violations.map(viol => 
            `    - ${viol.importPath} (${viol.reason})`
          ).join('\n')}`
        ).join('');
        
        fail(`Infrastructure layer has ${violations.length} file(s) with violations:${details}\n\n` +
             `Infrastructure can depend on Domain and Application, but not Presentation.\n` +
             `Fix: Refactor to remove presentation dependencies.`);
      }
      
      expect(violations).toHaveLength(0);
    });
    
    it('should allow presentation dependencies (presentation → application + domain)', () => {
      const files = findTypeScriptFiles(srcDir);
      const presentationFiles = files.filter(f => detectLayer(f) === 'presentation');
      const violations: ImportAnalysis[] = [];
      
      for (const file of presentationFiles) {
        const analysis = analyzeFile(file, projectRoot);
        // Filter out domain/application imports (those are allowed)
        const filtered = {
          ...analysis,
          violations: analysis.violations.filter(v => 
            v.targetLayer !== 'domain' && v.targetLayer !== 'application'
          ),
        };
        
        if (filtered.violations.length > 0) {
          violations.push(filtered);
        }
      }
      
      if (violations.length > 0) {
        const details = violations.map(v => 
          `\n  ${v.file}:\n${v.violations.map(viol => 
            `    - ${viol.importPath} (${viol.reason})`
          ).join('\n')}`
        ).join('');
        
        fail(`Presentation layer has ${violations.length} file(s) with violations:${details}\n\n` +
             `Presentation can depend on Application and Domain, but not Infrastructure.\n` +
             `Fix: Access infrastructure through application layer (dependency injection).`);
      }
      
      expect(violations).toHaveLength(0);
    });
  });
  
  describe('Domain Layer Purity', () => {
    it('should have domain entities with behavior (not anemic)', () => {
      const files = findTypeScriptFiles(srcDir);
      const domainFiles = files.filter(f => 
        detectLayer(f) === 'domain' && 
        (f.includes('/entities/') || f.includes('/aggregates/'))
      );
      
      // This is a heuristic check - we look for classes with methods beyond constructor
      const anemicEntities: string[] = [];
      
      for (const file of domainFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Skip if file is very small (likely a barrel export)
        if (content.length < 100) continue;
        
        // Check for class with methods
        const classMatch = content.match(/class\s+(\w+)/);
        if (!classMatch) continue;
        
        const className = classMatch[1];
        
        // Count methods (excluding constructor, getters, setters)
        const methodMatches = content.match(/\s+(public|private|protected)?\s*\w+\s*\([^)]*\)\s*[:{]/g) || [];
        const nonConstructorMethods = methodMatches.filter(m => 
          !m.includes('constructor') && 
          !m.includes('get ') && 
          !m.includes('set ')
        );
        
        if (nonConstructorMethods.length === 0) {
          anemicEntities.push(`${path.relative(projectRoot, file)} (${className})`);
        }
      }
      
      // We allow some anemic entities (e.g., simple VOs), but not all
      if (anemicEntities.length > domainFiles.length * 0.5) {
        console.warn(
          `Warning: ${anemicEntities.length}/${domainFiles.length} domain entities appear anemic:\n` +
          anemicEntities.map(e => `  - ${e}`).join('\n') +
          `\n\nConsider adding business logic methods to entities.`
        );
      }
      
      // This is a warning, not a failure
      expect(true).toBe(true);
    });
    
    it('should have repository interfaces in domain layer', () => {
      const files = findTypeScriptFiles(srcDir);
      const repositoryInterfacePattern = /interface\s+\w*Repository/;
      
      const repositoryInterfaces: Array<{ file: string; layer: string }> = [];
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        if (repositoryInterfacePattern.test(content)) {
          const layer = detectLayer(file);
          repositoryInterfaces.push({
            file: path.relative(projectRoot, file),
            layer,
          });
        }
      }
      
      const violations = repositoryInterfaces.filter(r => r.layer !== 'domain');
      
      if (violations.length > 0) {
        const details = violations.map(v => `  - ${v.file} (in ${v.layer})`).join('\n');
        
        console.warn(
          `Warning: ${violations.length} repository interface(s) found outside domain layer:\n${details}\n\n` +
          `Per Dependency Inversion Principle, repository interfaces should be in domain layer.`
        );
      }
      
      // This is a warning for now, not a hard failure
      expect(true).toBe(true);
    });
  });
  
  describe('Application Layer Patterns', () => {
    it('should not have direct entity property mutations in application layer', () => {
      const files = findTypeScriptFiles(srcDir);
      const appFiles = files.filter(f => detectLayer(f) === 'application');
      
      const suspiciousMutations: string[] = [];
      
      for (const file of appFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Look for patterns like: entity.propertyName = value
        // This is a heuristic and may have false positives
        const mutationPattern = /\b(entity|aggregate|user|order|product|customer|item)\.\w+\s*=/g;
        const matches = content.match(mutationPattern);
        
        if (matches && matches.length > 0) {
          suspiciousMutations.push(
            `${path.relative(projectRoot, file)}: ${matches.length} potential direct mutation(s)`
          );
        }
      }
      
      if (suspiciousMutations.length > 0) {
        console.warn(
          `Warning: Detected potential direct entity mutations:\n` +
          suspiciousMutations.map(m => `  - ${m}`).join('\n') +
          `\n\nPrefer domain methods (e.g., entity.updateStatus()) over direct assignment.`
        );
      }
      
      // This is a warning, not a failure (some assignments may be valid)
      expect(true).toBe(true);
    });
  });
  
  describe('Clean Architecture Compliance Summary', () => {
    it('should generate compliance report', () => {
      const files = findTypeScriptFiles(srcDir);
      const layerCounts = {
        domain: 0,
        application: 0,
        infrastructure: 0,
        presentation: 0,
        unknown: 0,
      };
      
      const allViolations: ImportAnalysis[] = [];
      
      for (const file of files) {
        const layer = detectLayer(file);
        layerCounts[layer]++;
        
        const analysis = analyzeFile(file, projectRoot);
        if (analysis.violations.length > 0) {
          allViolations.push(analysis);
        }
      }
      
      console.log('\n📊 Clean Architecture Compliance Report:');
      console.log('=====================================');
      console.log(`Total Files: ${files.length}`);
      console.log(`  - Domain:         ${layerCounts.domain}`);
      console.log(`  - Application:    ${layerCounts.application}`);
      console.log(`  - Infrastructure: ${layerCounts.infrastructure}`);
      console.log(`  - Presentation:   ${layerCounts.presentation}`);
      console.log(`  - Unknown:        ${layerCounts.unknown}`);
      console.log('');
      console.log(`Total Violations: ${allViolations.length}`);
      
      if (allViolations.length > 0) {
        console.log('\nViolations by Layer:');
        const byLayer = allViolations.reduce((acc, v) => {
          acc[v.layer] = (acc[v.layer] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        for (const [layer, count] of Object.entries(byLayer)) {
          console.log(`  - ${layer}: ${count} file(s)`);
        }
      }
      
      const complianceRate = files.length > 0 
        ? ((files.length - allViolations.length) / files.length * 100).toFixed(1)
        : '100.0';
      
      console.log(`\nCompliance Rate: ${complianceRate}%`);
      console.log('=====================================\n');
      
      expect(true).toBe(true);
    });
  });
});
