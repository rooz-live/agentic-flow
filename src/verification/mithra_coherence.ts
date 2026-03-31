/**
 * Mithra Coherence Validation System
 *
 * Implements three-way alignment checking between:
 * - Intention (PR description, commit messages)
 * - Documentation (README, comments, docstrings)
 * - Implementation (actual code changes)
 *
 * Named after Mithra - the binding coherence between thought, word, and deed.
 */

export interface CoherenceCheckResult {
  score: number;
  passed: boolean;
  alignment: {
    intentionToCode: number;
    intentionToDocs: number;
    codeToDocumentation: number;
  };
  misalignments: MisalignmentDetail[];
  recommendations: string[];
}

export interface MisalignmentDetail {
  type: 'intention-code' | 'intention-docs' | 'code-docs';
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: {
    claimed: string;
    actual: string;
  };
}

export interface PRContext {
  description: string;
  commitMessages: string[];
  codeChanges: CodeChange[];
  documentationChanges: string[];
}

export interface CodeChange {
  file: string;
  additions: string[];
  deletions: string[];
}

const MITHRA_THRESHOLD = 0.4;

/**
 * Extract key concepts from text using simple keyword extraction
 */
function extractConcepts(text: string): Set<string> {
  const concepts = new Set<string>();
  const lowerText = text.toLowerCase();

  // Extract function/class names
  const functionMatches = text.match(/\b(function|class|interface|type|const|def|export|async)\s+(\w+)/gi) || [];
  functionMatches.forEach((match: string) => {
    const parts = match.split(/\s+/);
    const name = parts[1];
    if (name && name.length > 2) {
      concepts.add(name.toLowerCase());
    }
  });

  // Extract action verbs (expanded)
  const actionVerbs = text.match(/\b(add|remove|fix|implement|update|refactor|optimize|create|delete|modify|validate|test|build|deploy|configure|setup|install)\w*/gi) || [];
  actionVerbs.forEach((verb: string) => {
    concepts.add(verb.toLowerCase());
  });

  // Extract technical terms (greatly expanded list)
  const techTerms = text.match(/\b(api|database|authentication|authorization|validation|cache|queue|webhook|endpoint|jwt|middleware|token|auth|redis|rate|limit|pooling|server|client|request|response|config|test|spec|integration|unit|e2e|mock|stub|query|mutation|schema|migration|model|controller|service|repository|entity|dto|guard|interceptor|filter|pipe|decorator)\b/gi) || [];
  techTerms.forEach((term: string) => {
    concepts.add(term.toLowerCase());
  });

  // Extract camelCase/PascalCase identifiers (e.g., authMiddleware, validateJWT)
  const identifiers = text.match(/\b[a-z]+[A-Z][a-zA-Z]*\b/g) || [];
  identifiers.forEach((id: string) => {
    concepts.add(id.toLowerCase());
    // Also extract the parts (e.g., "auth" from "authMiddleware")
    const parts = id.split(/(?=[A-Z])/);
    parts.forEach(part => {
      if (part.length > 2) {
        concepts.add(part.toLowerCase());
      }
    });
  });

  // Extract hyphenated and underscored terms
  const compoundTerms = text.match(/\b[a-z]+[-_][a-z]+\b/gi) || [];
  compoundTerms.forEach((term: string) => {
    concepts.add(term.toLowerCase());
    // Extract individual parts
    const parts = term.split(/[-_]/);
    parts.forEach(part => {
      if (part.length > 2) {
        concepts.add(part.toLowerCase());
      }
    });
  });

  // Extract all capitalized words (likely important nouns)
  const capitalizedWords = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
  capitalizedWords.forEach((word: string) => {
    if (word.length > 2) {
      concepts.add(word.toLowerCase());
    }
  });

  // Extract all significant words (3+ characters, not common stop words)
  const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'let', 'put', 'say', 'she', 'too', 'use']);
  const words = lowerText.match(/\b[a-z]{3,}\b/g) || [];
  words.forEach(word => {
    if (!stopWords.has(word)) {
      concepts.add(word);
    }
  });

  return concepts;
}

/**
 * Calculate Jaccard similarity between two concept sets
 */
function calculateSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  const arrA = Array.from(setA);
  const arrB = Array.from(setB);
  const intersection = arrA.filter(x => setB.has(x));
  const unionSize = new Set(arrA.concat(arrB)).size;

  return intersection.length / unionSize;
}

/**
 * Measure coherence between PR description, code changes, and commit messages
 */
export function measureCoherence(context: PRContext): CoherenceCheckResult {
  const intentionText = `${context.description} ${context.commitMessages.join(' ')}`;
  const codeText = context.codeChanges.map(c => [...c.additions, ...c.deletions].join(' ')).join(' ');
  const docsText = context.documentationChanges.join(' ');

  const intentionConcepts = extractConcepts(intentionText);
  const codeConcepts = extractConcepts(codeText);
  const docsConcepts = extractConcepts(docsText);

  const intentionToCode = calculateSimilarity(intentionConcepts, codeConcepts);
  const intentionToDocs = docsConcepts.size > 0 ? calculateSimilarity(intentionConcepts, docsConcepts) : 1;
  const codeToDocumentation = docsConcepts.size > 0 && codeConcepts.size > 0 ? calculateSimilarity(codeConcepts, docsConcepts) : 1;

  // Weighted average (intention-code alignment is most critical)
  // Boost score if docs are missing (docs are optional for many PRs)
  const hasDocumentation = docsConcepts.size > 0;
  const score = hasDocumentation 
    ? intentionToCode * 0.5 + intentionToDocs * 0.25 + codeToDocumentation * 0.25
    : intentionToCode; // If no docs, score is just intention-to-code alignment
  const passed = score >= MITHRA_THRESHOLD;

  const misalignments: MisalignmentDetail[] = [];
  const recommendations: string[] = [];

  if (intentionToCode < 0.5) {
    const claimedConcepts = Array.from(intentionConcepts).slice(0, 5).join(', ');
    const actualConcepts = Array.from(codeConcepts).slice(0, 5).join(', ');

    misalignments.push({
      type: 'intention-code',
      severity: intentionToCode < 0.3 ? 'high' : 'medium',
      description: 'PR description does not match code changes',
      evidence: {
        claimed: claimedConcepts || '(no concepts extracted)',
        actual: actualConcepts || '(no concepts extracted)',
      },
    });

    recommendations.push('Update PR description to accurately reflect the code changes.');
  }

  if (intentionToDocs < 0.5 && docsConcepts.size > 0) {
    misalignments.push({
      type: 'intention-docs',
      severity: 'medium',
      description: 'Documentation changes do not align with stated intention',
      evidence: {
        claimed: Array.from(intentionConcepts).slice(0, 3).join(', '),
        actual: Array.from(docsConcepts).slice(0, 3).join(', '),
      },
    });

    recommendations.push('Ensure documentation reflects the stated purpose of the PR.');
  }

  if (codeToDocumentation < 0.5 && docsConcepts.size > 0) {
    misalignments.push({
      type: 'code-docs',
      severity: 'low',
      description: 'Code changes and documentation changes address different concepts',
      evidence: {
        claimed: Array.from(codeConcepts).slice(0, 3).join(', '),
        actual: Array.from(docsConcepts).slice(0, 3).join(', '),
      },
    });

    recommendations.push('Consider adding documentation for the code changes made.');
  }

  return {
    score,
    passed,
    alignment: {
      intentionToCode,
      intentionToDocs,
      codeToDocumentation,
    },
    misalignments,
    recommendations,
  };
}

/**
 * Request human review if coherence is below threshold
 */
export function requestCoherenceReview(context: PRContext): { needsReview: boolean; message: string } {
  const result = measureCoherence(context);

  if (!result.passed) {
    const misalignmentSummary = result.misalignments
      .map(m => `[${m.severity.toUpperCase()}] ${m.description}`)
      .join('\n');

    return {
      needsReview: true,
      message: `Misalignment detected between stated intention and implementation (score: ${(result.score * 100).toFixed(1)}%).\n\n` +
               `Manual review required to verify thought-word-deed consistency.\n\n` +
               `Issues:\n${misalignmentSummary}\n\n` +
               `Recommendations:\n${result.recommendations.map(r => `- ${r}`).join('\n')}`,
    };
  }

  return {
    needsReview: false,
    message: `Coherence check passed (score: ${(result.score * 100).toFixed(1)}%)`,
  };
}
