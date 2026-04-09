/**
 * Semantic Degradation Analyzer
 * 
 * Analyzes API contracts for violations, breaking changes, and semantic drift.
 * Also monitors type coverage trends and documentation staleness.
 * 
 * @module structural-diagnostics/semantic-analyzer
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import {
  APIContract,
  ContractViolation,
  TypeCoverageReport
} from './types.js';

/**
 * SemanticDegradationAnalyzer monitors API contracts and type coverage
 * to detect semantic degradation over time.
 */
export class SemanticDegradationAnalyzer extends EventEmitter {
  private contracts: Map<string, APIContract>;
  private violations: ContractViolation[];
  private coverageHistory: TypeCoverageReport[];
  private readonly maxHistorySize = 100;

  /**
   * Create a new SemanticDegradationAnalyzer instance
   */
  constructor() {
    super();
    this.contracts = new Map();
    this.violations = [];
    this.coverageHistory = [];
  }

  /**
   * Register a new API contract
   * 
   * @param contract - API contract to register
   */
  registerContract(contract: APIContract): void {
    this.contracts.set(contract.id, contract);
    this.emit('contractRegistered', contract);
  }

  /**
   * Get a registered contract by ID
   * 
   * @param id - Contract ID
   * @returns Contract or null if not found
   */
  getContract(id: string): APIContract | null {
    return this.contracts.get(id) || null;
  }

  /**
   * Update an existing contract
   * 
   * @param id - Contract ID
   * @param updates - Partial contract updates
   */
  updateContract(id: string, updates: Partial<APIContract>): void {
    const existing = this.contracts.get(id);
    if (!existing) {
      throw new Error(`Contract not found: ${id}`);
    }

    const updated = { ...existing, ...updates };
    this.contracts.set(id, updated);
    this.emit('contractUpdated', updated);
  }

  /**
   * Mark a contract as deprecated
   * 
   * @param id - Contract ID
   */
  deprecateContract(id: string): void {
    this.updateContract(id, { deprecationStatus: 'deprecated' });
    this.emit('contractDeprecated', id);
  }

  /**
   * Validate a request against a contract's request schema
   * 
   * @param contractId - Contract ID
   * @param request - Request data to validate
   * @returns Array of contract violations
   */
  validateRequest(contractId: string, request: any): ContractViolation[] {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      return [{
        contractId,
        violationType: 'request_schema',
        path: '',
        expected: 'registered contract',
        actual: 'contract not found',
        severity: 'breaking',
        timestamp: new Date()
      }];
    }

    const violations = this.validateAgainstSchema(
      request,
      contract.requestSchema,
      contractId,
      'request_schema'
    );

    // Record violations
    for (const violation of violations) {
      this.violations.push(violation);
    }

    if (violations.length > 0) {
      this.emit('requestViolations', { contractId, violations });
    }

    return violations;
  }

  /**
   * Validate a response against a contract's response schema
   * 
   * @param contractId - Contract ID
   * @param response - Response data to validate
   * @returns Array of contract violations
   */
  validateResponse(contractId: string, response: any): ContractViolation[] {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      return [{
        contractId,
        violationType: 'response_schema',
        path: '',
        expected: 'registered contract',
        actual: 'contract not found',
        severity: 'breaking',
        timestamp: new Date()
      }];
    }

    const violations = this.validateAgainstSchema(
      response,
      contract.responseSchema,
      contractId,
      'response_schema'
    );

    // Record violations
    for (const violation of violations) {
      this.violations.push(violation);
    }

    if (violations.length > 0) {
      this.emit('responseViolations', { contractId, violations });
    }

    return violations;
  }

  /**
   * Detect breaking changes between old and new contract versions
   * 
   * @param oldContract - Previous contract version
   * @param newContract - New contract version
   * @returns Array of contract violations representing breaking changes
   */
  detectBreakingChanges(
    oldContract: APIContract,
    newContract: APIContract
  ): ContractViolation[] {
    const violations: ContractViolation[] = [];

    // Check endpoint changes
    if (oldContract.endpoint !== newContract.endpoint) {
      violations.push({
        contractId: newContract.id,
        violationType: 'breaking_change',
        path: 'endpoint',
        expected: oldContract.endpoint,
        actual: newContract.endpoint,
        severity: 'breaking',
        timestamp: new Date()
      });
    }

    // Check method changes
    if (oldContract.method !== newContract.method) {
      violations.push({
        contractId: newContract.id,
        violationType: 'breaking_change',
        path: 'method',
        expected: oldContract.method,
        actual: newContract.method,
        severity: 'breaking',
        timestamp: new Date()
      });
    }

    // Check request schema compatibility
    const requestBreaking = this.detectSchemaBreakingChanges(
      oldContract.requestSchema,
      newContract.requestSchema,
      newContract.id,
      'request'
    );
    violations.push(...requestBreaking);

    // Check response schema compatibility
    const responseBreaking = this.detectSchemaBreakingChanges(
      oldContract.responseSchema,
      newContract.responseSchema,
      newContract.id,
      'response'
    );
    violations.push(...responseBreaking);

    // Record violations
    for (const violation of violations) {
      this.violations.push(violation);
    }

    if (violations.length > 0) {
      this.emit('breakingChangesDetected', { oldContract, newContract, violations });
    }

    return violations;
  }

  /**
   * Analyze TypeScript type coverage for a project
   * 
   * @param projectPath - Path to the project root
   * @returns Promise resolving to type coverage report
   */
  async analyzeTypeCoverage(projectPath: string): Promise<TypeCoverageReport> {
    const tsFiles = await this.findTypeScriptFiles(projectPath);
    const fileReports: TypeCoverageReport['files'] = [];
    
    let totalAny = 0;
    let totalUnknown = 0;
    let totalImplicitAny = 0;
    let typedFiles = 0;

    for (const filePath of tsFiles) {
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const analysis = this.analyzeFileTypes(content, filePath);
        
        totalAny += analysis.anyCount;
        totalUnknown += analysis.unknownCount;
        totalImplicitAny += analysis.implicitAnyCount;
        
        if (analysis.coverage >= 0.5) {
          typedFiles++;
        }

        fileReports.push({
          path: filePath,
          coverage: analysis.coverage,
          issues: analysis.issues
        });
      } catch (error) {
        fileReports.push({
          path: filePath,
          coverage: 0,
          issues: ['Failed to analyze file']
        });
      }
    }

    const coveragePercent = tsFiles.length > 0 
      ? (typedFiles / tsFiles.length) * 100 
      : 0;

    // Determine trend
    let trendDirection: TypeCoverageReport['trendDirection'] = 'stable';
    if (this.coverageHistory.length > 0) {
      const prevReport = this.coverageHistory[this.coverageHistory.length - 1];
      const delta = coveragePercent - prevReport.coveragePercent;
      if (delta > 2) trendDirection = 'improving';
      else if (delta < -2) trendDirection = 'degrading';
    }

    const report: TypeCoverageReport = {
      totalFiles: tsFiles.length,
      typedFiles,
      coveragePercent,
      anyCount: totalAny,
      unknownCount: totalUnknown,
      implicitAnyCount: totalImplicitAny,
      strictNullChecks: await this.checkStrictNullChecks(projectPath),
      trendDirection,
      files: fileReports
    };

    // Store in history
    this.coverageHistory.push(report);
    if (this.coverageHistory.length > this.maxHistorySize) {
      this.coverageHistory.shift();
    }

    this.emit('typeCoverageAnalyzed', report);
    return report;
  }

  /**
   * Get type coverage trend from historical reports
   * 
   * @param reports - Array of type coverage reports (uses history if not provided)
   * @returns Trend analysis
   */
  getTypeCoverageTrend(reports?: TypeCoverageReport[]): {
    direction: 'improving' | 'stable' | 'degrading';
    avgCoverage: number;
    anyTrend: 'increasing' | 'stable' | 'decreasing';
  } {
    const data = reports || this.coverageHistory;
    
    if (data.length < 2) {
      return {
        direction: 'stable',
        avgCoverage: data.length > 0 ? data[0].coveragePercent : 0,
        anyTrend: 'stable'
      };
    }

    // Calculate average coverage
    const avgCoverage = data.reduce((sum, r) => sum + r.coveragePercent, 0) / data.length;

    // Calculate coverage trend using linear regression
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i].coveragePercent;
      sumXY += i * data[i].coveragePercent;
      sumX2 += i * i;
    }
    const coverageSlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Calculate any count trend
    sumY = 0; sumXY = 0;
    for (let i = 0; i < n; i++) {
      sumY += data[i].anyCount;
      sumXY += i * data[i].anyCount;
    }
    const anySlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    let direction: 'improving' | 'stable' | 'degrading';
    if (coverageSlope > 0.5) direction = 'improving';
    else if (coverageSlope < -0.5) direction = 'degrading';
    else direction = 'stable';

    let anyTrend: 'increasing' | 'stable' | 'decreasing';
    if (anySlope > 0.2) anyTrend = 'increasing';
    else if (anySlope < -0.2) anyTrend = 'decreasing';
    else anyTrend = 'stable';

    return { direction, avgCoverage, anyTrend };
  }

  /**
   * Check documentation staleness by comparing file modification times
   * 
   * @param docPath - Path to documentation file
   * @param sourcePath - Path to source file
   * @returns Staleness information
   */
  async checkDocumentationStaleness(
    docPath: string,
    sourcePath: string
  ): Promise<{
    isStale: boolean;
    staleDays: number;
    lastDocUpdate: Date;
    lastSourceUpdate: Date;
  }> {
    let docStats: fs.Stats;
    let sourceStats: fs.Stats;

    try {
      docStats = await fs.promises.stat(docPath);
    } catch {
      return {
        isStale: true,
        staleDays: Infinity,
        lastDocUpdate: new Date(0),
        lastSourceUpdate: new Date()
      };
    }

    try {
      sourceStats = await fs.promises.stat(sourcePath);
    } catch {
      return {
        isStale: false,
        staleDays: 0,
        lastDocUpdate: docStats.mtime,
        lastSourceUpdate: new Date(0)
      };
    }

    const lastDocUpdate = docStats.mtime;
    const lastSourceUpdate = sourceStats.mtime;
    const isStale = lastSourceUpdate > lastDocUpdate;
    
    const staleDays = isStale
      ? Math.floor((lastSourceUpdate.getTime() - lastDocUpdate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      isStale,
      staleDays,
      lastDocUpdate,
      lastSourceUpdate
    };
  }

  /**
   * Get violations with optional filters
   * 
   * @param filters - Optional filters for contract ID and severity
   * @returns Filtered array of contract violations
   */
  getViolations(filters?: { contractId?: string; severity?: string }): ContractViolation[] {
    let result = [...this.violations];

    if (filters?.contractId) {
      result = result.filter(v => v.contractId === filters.contractId);
    }

    if (filters?.severity) {
      result = result.filter(v => v.severity === filters.severity);
    }

    return result;
  }

  /**
   * Generate a comprehensive semantic degradation report
   * 
   * @returns Semantic report with statistics and recommendations
   */
  generateSemanticReport(): {
    contractCount: number;
    violationCount: number;
    breakingChanges: number;
    typeCoverage: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    // Count breaking changes
    const breakingChanges = this.violations.filter(
      v => v.severity === 'breaking'
    ).length;

    // Get latest type coverage
    const latestCoverage = this.coverageHistory.length > 0
      ? this.coverageHistory[this.coverageHistory.length - 1]
      : null;

    // Generate recommendations
    if (breakingChanges > 0) {
      recommendations.push(
        `${breakingChanges} breaking changes detected. Review API versioning strategy.`
      );
    }

    if (latestCoverage) {
      if (latestCoverage.coveragePercent < 80) {
        recommendations.push(
          `Type coverage is ${latestCoverage.coveragePercent.toFixed(1)}%. Target is 80%+.`
        );
      }

      if (latestCoverage.anyCount > 10) {
        recommendations.push(
          `${latestCoverage.anyCount} 'any' types found. Consider replacing with specific types.`
        );
      }

      if (latestCoverage.implicitAnyCount > 5) {
        recommendations.push(
          `${latestCoverage.implicitAnyCount} implicit 'any' types. Enable 'noImplicitAny' in tsconfig.`
        );
      }

      if (!latestCoverage.strictNullChecks) {
        recommendations.push(
          `strictNullChecks is disabled. Enable for better null safety.`
        );
      }

      if (latestCoverage.trendDirection === 'degrading') {
        recommendations.push(
          `Type coverage is degrading. Review recent changes for type regressions.`
        );
      }
    }

    // Check for deprecated contracts still in use
    const deprecatedInUse = Array.from(this.contracts.values()).filter(
      c => c.deprecationStatus === 'deprecated'
    );
    if (deprecatedInUse.length > 0) {
      recommendations.push(
        `${deprecatedInUse.length} deprecated contracts still registered. Plan migration.`
      );
    }

    // Check violation trend
    const recentViolations = this.violations.filter(
      v => Date.now() - v.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );
    if (recentViolations.length > this.violations.length / 2) {
      recommendations.push(
        `High rate of recent violations. Investigate API stability.`
      );
    }

    return {
      contractCount: this.contracts.size,
      violationCount: this.violations.length,
      breakingChanges,
      typeCoverage: latestCoverage?.coveragePercent || 0,
      recommendations
    };
  }

  /**
   * Get all registered contracts
   */
  getContracts(): Map<string, APIContract> {
    return new Map(this.contracts);
  }

  /**
   * Get type coverage history
   */
  getCoverageHistory(): TypeCoverageReport[] {
    return [...this.coverageHistory];
  }

  /**
   * Clear all violations and reset state
   */
  reset(): void {
    this.contracts.clear();
    this.violations = [];
    this.coverageHistory = [];
    this.emit('reset');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private validateAgainstSchema(
    data: any,
    schema: any,
    contractId: string,
    violationType: 'request_schema' | 'response_schema'
  ): ContractViolation[] {
    const violations: ContractViolation[] = [];

    if (!schema) {
      return violations;
    }

    // Simplified schema validation
    // In production, use a proper JSON Schema validator like Ajv
    this.validateSchemaRecursive(
      data,
      schema,
      '',
      contractId,
      violationType,
      violations
    );

    return violations;
  }

  private validateSchemaRecursive(
    data: any,
    schema: any,
    currentPath: string,
    contractId: string,
    violationType: 'request_schema' | 'response_schema',
    violations: ContractViolation[]
  ): void {
    // Handle type validation
    if (schema.type) {
      const actualType = this.getJsonType(data);
      if (schema.type !== actualType && !(schema.type === 'integer' && actualType === 'number')) {
        violations.push({
          contractId,
          violationType: 'type_mismatch',
          path: currentPath || 'root',
          expected: schema.type,
          actual: actualType,
          severity: 'breaking',
          timestamp: new Date()
        });
        return;
      }
    }

    // Handle required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (data === null || data === undefined || !(field in data)) {
          violations.push({
            contractId,
            violationType: 'missing_field',
            path: currentPath ? `${currentPath}.${field}` : field,
            expected: 'required field',
            actual: 'missing',
            severity: 'breaking',
            timestamp: new Date()
          });
        }
      }
    }

    // Handle object properties
    if (schema.properties && typeof data === 'object' && data !== null) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propPath = currentPath ? `${currentPath}.${key}` : key;
        if (key in data) {
          this.validateSchemaRecursive(
            data[key],
            propSchema,
            propPath,
            contractId,
            violationType,
            violations
          );
        }
      }
    }

    // Handle array items
    if (schema.items && Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        const itemPath = `${currentPath}[${i}]`;
        this.validateSchemaRecursive(
          data[i],
          schema.items,
          itemPath,
          contractId,
          violationType,
          violations
        );
      }
    }
  }

  private detectSchemaBreakingChanges(
    oldSchema: any,
    newSchema: any,
    contractId: string,
    schemaType: string
  ): ContractViolation[] {
    const violations: ContractViolation[] = [];

    if (!oldSchema || !newSchema) {
      if (oldSchema && !newSchema) {
        violations.push({
          contractId,
          violationType: 'breaking_change',
          path: `${schemaType}Schema`,
          expected: 'schema present',
          actual: 'schema removed',
          severity: 'breaking',
          timestamp: new Date()
        });
      }
      return violations;
    }

    // Check for removed required fields in new schema
    if (oldSchema.required && newSchema.required) {
      for (const field of oldSchema.required) {
        if (!newSchema.required.includes(field)) {
          // Removing a required field is not breaking (makes it optional)
          // But adding a new required field IS breaking
        }
      }
      for (const field of newSchema.required) {
        if (!oldSchema.required.includes(field)) {
          violations.push({
            contractId,
            violationType: 'breaking_change',
            path: `${schemaType}.${field}`,
            expected: 'optional field',
            actual: 'now required',
            severity: 'breaking',
            timestamp: new Date()
          });
        }
      }
    }

    // Check for type changes in properties
    if (oldSchema.properties && newSchema.properties) {
      for (const [key, oldProp] of Object.entries(oldSchema.properties) as [string, any][]) {
        const newProp = newSchema.properties[key] as any;
        
        if (!newProp) {
          // Property removed
          violations.push({
            contractId,
            violationType: 'breaking_change',
            path: `${schemaType}.${key}`,
            expected: 'property exists',
            actual: 'property removed',
            severity: schemaType === 'response' ? 'breaking' : 'warning',
            timestamp: new Date()
          });
        } else if (oldProp.type !== newProp.type) {
          // Type changed
          violations.push({
            contractId,
            violationType: 'breaking_change',
            path: `${schemaType}.${key}.type`,
            expected: oldProp.type,
            actual: newProp.type,
            severity: 'breaking',
            timestamp: new Date()
          });
        }
      }
    }

    return violations;
  }

  private getJsonType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number';
    }
    return typeof value;
  }

  private async findTypeScriptFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];

    const walk = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          // Skip node_modules and hidden directories
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }

          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
            files.push(fullPath);
          }
        }
      } catch {
        // Ignore permission errors
      }
    };

    await walk(projectPath);
    return files;
  }

  private analyzeFileTypes(content: string, filePath: string): {
    coverage: number;
    anyCount: number;
    unknownCount: number;
    implicitAnyCount: number;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Count explicit 'any' types
    const anyMatches = content.match(/:\s*any\b/g) || [];
    const anyCount = anyMatches.length;

    // Count 'unknown' types
    const unknownMatches = content.match(/:\s*unknown\b/g) || [];
    const unknownCount = unknownMatches.length;

    // Estimate implicit any (function parameters without types)
    const implicitAnyMatches = content.match(/\(\s*\w+\s*[,)]/g) || [];
    const implicitAnyCount = Math.floor(implicitAnyMatches.length * 0.3); // Rough estimate

    // Estimate coverage based on type annotations
    const typeAnnotations = content.match(/:\s*\w+/g) || [];
    const declarations = content.match(/(?:const|let|var|function)\s+\w+/g) || [];
    
    const coverage = declarations.length > 0
      ? Math.min(1, typeAnnotations.length / declarations.length)
      : 1;

    // Generate issues
    if (anyCount > 5) {
      issues.push(`High 'any' usage: ${anyCount} occurrences`);
    }
    if (coverage < 0.5) {
      issues.push(`Low type coverage: ${(coverage * 100).toFixed(0)}%`);
    }
    if (implicitAnyCount > 3) {
      issues.push(`Possible implicit any: ${implicitAnyCount} cases`);
    }

    return {
      coverage,
      anyCount,
      unknownCount,
      implicitAnyCount,
      issues
    };
  }

  private async checkStrictNullChecks(projectPath: string): Promise<boolean> {
    const tsconfigPath = path.join(projectPath, 'tsconfig.json');
    
    try {
      const content = await fs.promises.readFile(tsconfigPath, 'utf-8');
      const config = JSON.parse(content);
      return config?.compilerOptions?.strictNullChecks === true ||
             config?.compilerOptions?.strict === true;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create a SemanticDegradationAnalyzer
 * @returns Configured SemanticDegradationAnalyzer instance
 */
export function createSemanticAnalyzer(): SemanticDegradationAnalyzer {
  return new SemanticDegradationAnalyzer();
}
