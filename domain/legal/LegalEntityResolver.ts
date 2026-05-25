/**
 * Legal Entity Resolver - ADR-016 Implementation
 * Prevents "Cognitive Bleed-Over" via strict bounded context enforcement
 * 
 * Rules:
 * 1. NO free-text entity parsing in legal drafting
 * 2. ALL entities from legal-entity-matrix.json only
 * 3. Template placeholders strictly hydrated from matrix
 * 4. Cross-domain validation prevents context bleed
 */

import * as fs from 'fs';
import * as path from 'path';

// Legal Entity Matrix Schema
interface LegalEntityMatrix {
  caseId: string;
  boundedContext: string;
  version: string;
  lastUpdated: string;
  entities: {
    plaintiffs: LegalEntity[];
    defendants: LegalEntity[];
    agents: LegalEntity[];
    attorneys: LegalEntity[];
    courts: CourtEntity[];
    properties: PropertyEntity[];
  };
  metadata: {
    strictHydration: boolean;
    validationHash: string;
  };
}

interface LegalEntity {
  id: string;
  name: string;
  role: string;
  jurisdiction?: string;
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  verified: boolean;
  source: string; // Must reference CASE_REGISTRY.yaml or verified document
}

interface CourtEntity {
  id: string;
  name: string;
  jurisdiction: string;
  division?: string;
  caseNumber: string;
  judge?: string;
}

interface PropertyEntity {
  id: string;
  address: string;
  owner: string;
  management?: string;
  unitNumber?: string;
}

// Template hydration placeholder regex
const PLACEHOLDER_REGEX = /\{\{([A-Z_]+)\}\}/g;

// Forbidden patterns (free-text parsing indicators)
const FORBIDDEN_PATTERNS = [
  /\b[A-Z][a-z]+\s+[A-Z][a-z]+\s*(?:said|stated|claimed|alleged)/, // Name + verb
  /\b(?:according to|per)\s+[A-Z][a-z]+/, // Attribution
  /\b(?:email|called|contacted)\s+[A-Z][a-z]+\s+at/, // Contact inference
];

export class LegalEntityResolver {
  private matrix: LegalEntityMatrix | null = null;
  private contextPath: string;
  private validationErrors: string[] = [];

  constructor(boundedContextPath: string) {
    this.contextPath = boundedContextPath;
    this.loadMatrix();
  }

  /**
   * Load legal-entity-matrix.json from bounded context
   * ADR-016: All entities MUST come from this file only
   */
  private loadMatrix(): void {
    const matrixPath = path.join(this.contextPath, 'legal-entity-matrix.json');
    
    if (!fs.existsSync(matrixPath)) {
      throw new Error(`ADR-016 VIOLATION: legal-entity-matrix.json not found at ${matrixPath}. Free-text parsing is STRICTLY PROHIBITED.`);
    }

    try {
      const content = fs.readFileSync(matrixPath, 'utf-8');
      this.matrix = JSON.parse(content);
      
      // Validate strict hydration flag
      if (!this.matrix?.metadata?.strictHydration) {
        throw new Error('ADR-016 VIOLATION: strictHydration must be true in legal-entity-matrix.json');
      }
    } catch (err) {
      throw new Error(`ADR-016 ERROR: Failed to parse legal-entity-matrix.json: ${err}`);
    }
  }

  /**
   * Hydrate template with entities from matrix only
   * NO external context, NO free-text parsing
   */
  hydrateTemplate(template: string): { hydrated: string; placeholders: string[]; errors: string[] } {
    const placeholders: string[] = [];
    this.validationErrors = [];

    // Check for forbidden patterns (free-text entity references)
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(template)) {
        this.validationErrors.push(`ADR-016 VIOLATION: Template contains free-text entity reference matching ${pattern}`);
      }
    }

    // Hydrate placeholders
    const hydrated = template.replace(PLACEHOLDER_REGEX, (match, placeholder) => {
      placeholders.push(placeholder);
      const value = this.resolvePlaceholder(placeholder);
      
      if (value === null) {
        this.validationErrors.push(`ADR-016 ERROR: Unknown placeholder {{${placeholder}}} - not in legal-entity-matrix.json`);
        return match; // Keep placeholder if unresolved
      }
      
      return value;
    });

    return {
      hydrated,
      placeholders,
      errors: this.validationErrors
    };
  }

  /**
   * Resolve placeholder to value from matrix
   * ADR-016: Only matrix entities allowed
   */
  private resolvePlaceholder(placeholder: string): string | null {
    if (!this.matrix) return null;

    // Map placeholder patterns to matrix paths
    const mappings: Record<string, () => string | null> = {
      'PLAINTIFF_NAME': () => this.matrix?.entities.plaintiffs[0]?.name ?? null,
      'PLAINTIFF_ATTORNEY': () => this.matrix?.entities.attorneys.find(a => a.role === 'plaintiff')?.name ?? null,
      'DEFENDANT_NAME': () => this.matrix?.entities.defendants[0]?.name ?? null,
      'DEFENDANT_MGMT_AGENT': () => this.matrix?.entities.agents.find(a => a.role === 'management')?.name ?? null,
      'DEFENDANT_ATTORNEY': () => this.matrix?.entities.attorneys.find(a => a.role === 'defense')?.name ?? null,
      'COURT_NAME': () => this.matrix?.entities.courts[0]?.name ?? null,
      'CASE_NUMBER': () => this.matrix?.entities.courts[0]?.caseNumber ?? null,
      'JUDGE_NAME': () => this.matrix?.entities.courts[0]?.judge ?? null,
      'PROPERTY_ADDRESS': () => this.matrix?.entities.properties[0]?.address ?? null,
    };

    const resolver = mappings[placeholder];
    return resolver ? resolver() : null;
  }

  /**
   * Validate that NO entity from another bounded context is present
   * ADR-016: Cognitive Bleed-Over prevention
   */
  validateNoBleedOver(content: string, otherContextMatrices: string[]): boolean {
    let hasBleedOver = false;

    for (const otherMatrixPath of otherContextMatrices) {
      if (!fs.existsSync(otherMatrixPath)) continue;

      try {
        const otherContent = fs.readFileSync(otherMatrixPath, 'utf-8');
        const otherMatrix: LegalEntityMatrix = JSON.parse(otherContent);

        // Check all entity names from other context
        const allOtherEntities = [
          ...otherMatrix.entities.plaintiffs.map(e => e.name),
          ...otherMatrix.entities.defendants.map(e => e.name),
          ...otherMatrix.entities.agents.map(e => e.name),
          ...otherMatrix.entities.attorneys.map(e => e.name),
        ];

        for (const entityName of allOtherEntities) {
          if (content.includes(entityName)) {
            this.validationErrors.push(
              `ADR-016 BLEED-OVER DETECTED: Entity "${entityName}" from ${otherMatrix.boundedContext} found in ${this.matrix?.boundedContext}`
            );
            hasBleedOver = true;
          }
        }
      } catch (err) {
        // Skip invalid matrices
      }
    }

    return !hasBleedOver;
  }

  /**
   * Get validation summary
   */
  getValidationSummary(): {
    valid: boolean;
    errors: string[];
    matrixLoaded: boolean;
    strictHydration: boolean;
  } {
    return {
      valid: this.validationErrors.length === 0,
      errors: this.validationErrors,
      matrixLoaded: this.matrix !== null,
      strictHydration: this.matrix?.metadata?.strictHydration ?? false
    };
  }
}

// CLI usage for pre-send validation
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const contextPath = args[1];
  const templatePath = args[2];

  if (command === 'validate' && contextPath && templatePath) {
    try {
      const resolver = new LegalEntityResolver(contextPath);
      const template = fs.readFileSync(templatePath, 'utf-8');
      const result = resolver.hydrateTemplate(template);
      
      console.log(JSON.stringify({
        adr: '016',
        status: result.errors.length === 0 ? 'PASS' : 'FAIL',
        placeholdersFound: result.placeholders.length,
        errors: result.errors,
        summary: resolver.getValidationSummary()
      }, null, 2));
      
      process.exit(result.errors.length === 0 ? 0 : 1);
    } catch (err) {
      console.error(JSON.stringify({
        adr: '016',
        status: 'ERROR',
        message: (err as Error).message
      }));
      process.exit(1);
    }
  } else {
    console.log('Usage: ts-node LegalEntityResolver.ts validate <context-path> <template-path>');
    process.exit(1);
  }
}
