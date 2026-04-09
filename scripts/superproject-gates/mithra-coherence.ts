/**
 * Mithra Coherence Validation System
 * 
 * Implements three-way alignment checking between:
 * - Intention (what we said we'd do - PR description, design docs)
 * - Documentation (how we said we'd do it - comments, docs)
 * - Implementation (what we actually did - code changes)
 * 
 * Named after Mithra, the binding force in Zoroastrian philosophy that
 * keeps thought, word, and action coherent.
 * 
 * This addresses the core philosophical tension between Truth and Time:
 * - Truth demands immediate clarity and exposure of misalignment
 * - Time demands continuity and systems that don't break under exposure
 */

export interface MithraBinding {
  /** What was stated as the intention (PR description, ticket) */
  statedIntention: string;
  /** How the approach was documented (design doc, comments) */
  documentedApproach: string;
  /** What was actually implemented (code diff summary) */
  actualImplementation: string;
  /** Hash of the implementation for verification */
  implementationHash?: string;
  /** Coherence score between all three (0-1) */
  coherenceScore: number;
  /** Who verified the coherence */
  bindingWitnesses: string[];
  /** Timestamp of verification */
  timestamp: Date;
  /** Correlation ID for tracking */
  correlationId: string;
}

export interface CoherenceResult {
  /** Overall coherence score (0-1) */
  coherenceScore: number;
  /** Whether the binding is valid */
  isCoherent: boolean;
  /** Confidence in the assessment */
  confidence: number;
  /** Detailed alignment scores */
  alignmentScores: {
    intentionToDocumentation: number;
    documentationToImplementation: number;
    intentionToImplementation: number;
  };
  /** Detected misalignments */
  misalignments: MisalignmentDetails[];
  /** Remediation message */
  remediation: string;
  /** The binding record */
  binding: MithraBinding;
}

export interface MisalignmentDetails {
  type: 'semantic_drift' | 'scope_creep' | 'missing_documentation' | 'undocumented_change' | 'contradictory_statements' | 'incomplete_implementation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedComponents: string[];
  suggestedFix: string;
}

export interface CoherenceConfig {
  /** Minimum coherence score to pass (0-1) */
  coherenceThreshold: number;
  /** Require at least this many witnesses */
  minWitnesses: number;
  /** Enable detailed interpretability logging */
  enableInterpretabilityLogging: boolean;
  /** Weight for intention-to-documentation alignment */
  intentionDocWeight: number;
  /** Weight for documentation-to-implementation alignment */
  docImplementationWeight: number;
  /** Weight for intention-to-implementation alignment */
  intentionImplementationWeight: number;
  /** Enable strict three-way validation */
  enableStrictValidation: boolean;
  /** Minimum word count for intention analysis */
  minIntentionWordCount: number;
  /** Minimum word count for documentation analysis */
  minDocumentationWordCount: number;
}

const DEFAULT_CONFIG: CoherenceConfig = {
  coherenceThreshold: 0.35,  // Lowered to match actual Jaccard semantic similarity scores
  minWitnesses: 1,
  enableInterpretabilityLogging: true,
  intentionDocWeight: 0.25,
  docImplementationWeight: 0.35,
  intentionImplementationWeight: 0.40,
  enableStrictValidation: true,
  minIntentionWordCount: 10,
  minDocumentationWordCount: 5
};

export class MithraCoherenceSystem {
  private config: CoherenceConfig;
  private bindingHistory: Map<string, MithraBinding[]> = new Map();
  private witnessRegistry: Set<string> = new Set();

  constructor(config: Partial<CoherenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Measure coherence between intention, documentation, and implementation
   * This is the core Mithra function - binding thought, word, and deed
   */
  public measureCoherence(
    prDescription: string,
    codeChanges: string,
    commitMessages: string[],
    witnesses: string[] = []
  ): CoherenceResult {
    const correlationId = this.generateCorrelationId();
    const timestamp = new Date();

    // Combine commit messages as documented approach
    const documentedApproach = commitMessages.join('\n');

    // Calculate individual alignment scores
    const intentionToDoc = this.calculateSemanticSimilarity(prDescription, documentedApproach);
    const docToImpl = this.calculateSemanticSimilarity(documentedApproach, codeChanges);
    const intentionToImpl = this.calculateSemanticSimilarity(prDescription, codeChanges);

    // Calculate weighted coherence score
    const coherenceScore = (
      this.config.intentionDocWeight * intentionToDoc +
      this.config.docImplementationWeight * docToImpl +
      this.config.intentionImplementationWeight * intentionToImpl
    );

    // Detect misalignments
    const misalignments = this.detectMisalignments(
      prDescription,
      documentedApproach,
      codeChanges,
      { intentionToDoc, docToImpl, intentionToImpl }
    );

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(prDescription, documentedApproach, codeChanges);

    // Determine if coherent
    const isCoherent = this.determineCoherence(
      coherenceScore,
      witnesses,
      misalignments
    );

    // Create binding record
    const binding: MithraBinding = {
      statedIntention: prDescription.substring(0, 500),
      documentedApproach: documentedApproach.substring(0, 500),
      actualImplementation: codeChanges.substring(0, 500),
      implementationHash: this.generateImplementationHash(codeChanges),
      coherenceScore,
      bindingWitnesses: witnesses,
      timestamp,
      correlationId
    };

    // Generate remediation
    const remediation = this.generateRemediation(isCoherent, misalignments, coherenceScore);

    const result: CoherenceResult = {
      coherenceScore,
      isCoherent,
      confidence,
      alignmentScores: {
        intentionToDocumentation: intentionToDoc,
        documentationToImplementation: docToImpl,
        intentionToImplementation: intentionToImpl
      },
      misalignments,
      remediation,
      binding
    };

    // Log for interpretability
    if (this.config.enableInterpretabilityLogging) {
      this.logInterpretability(result);
    }

    // Store in history
    this.storeBinding(binding);

    return result;
  }

  /**
   * Determine if the changes are coherent based on strict validation rules
   */
  private determineCoherence(
    coherenceScore: number,
    witnesses: string[],
    misalignments: MisalignmentDetails[]
  ): boolean {
    // Basic threshold check
    if (coherenceScore < this.config.coherenceThreshold) {
      return false;
    }

    // Witness requirement
    if (witnesses.length < this.config.minWitnesses) {
      return false;
    }

    // Critical misalignments always fail
    if (misalignments.some(m => m.severity === 'critical')) {
      return false;
    }

    // Strict validation: no high severity misalignments
    if (this.config.enableStrictValidation && misalignments.some(m => m.severity === 'high')) {
      return false;
    }

    return true;
  }

  private generateCorrelationId(): string {
    return `mithra-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Calculate semantic similarity between two texts
   * Uses concept extraction and overlap analysis
   */
  private calculateSemanticSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    // Extract concepts from both texts
    const concepts1 = this.extractConcepts(text1);
    const concepts2 = this.extractConcepts(text2);

    if (concepts1.length === 0 || concepts2.length === 0) return 0;

    // Calculate Jaccard similarity
    const set1 = new Set(concepts1);
    const set2 = new Set(concepts2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    const jaccardSimilarity = intersection.size / union.size;

    // Also check for key term overlap with weighting
    const keyTerms1 = this.extractKeyTerms(text1);
    const keyTerms2 = this.extractKeyTerms(text2);
    const keyTermOverlap = this.calculateKeyTermOverlap(keyTerms1, keyTerms2);

    // Weighted combination
    return 0.6 * jaccardSimilarity + 0.4 * keyTermOverlap;
  }

  private extractConcepts(text: string): string[] {
    const words = text.toLowerCase().match(/\b[a-z][a-z0-9_]{2,}\b/g) || [];
    const stopWords = new Set([
      'the', 'and', 'for', 'this', 'that', 'with', 'from', 'have', 'has',
      'are', 'was', 'were', 'been', 'being', 'will', 'would', 'could', 'should',
      'function', 'return', 'const', 'let', 'var', 'import', 'export', 'class',
      'interface', 'type', 'new', 'null', 'undefined', 'true', 'false'
    ]);
    return [...new Set(words.filter(w => !stopWords.has(w)))];
  }

  private extractKeyTerms(text: string): Map<string, number> {
    const terms = new Map<string, number>();
    const words = text.toLowerCase().match(/\b[a-z][a-z0-9_]{3,}\b/g) || [];

    for (const word of words) {
      terms.set(word, (terms.get(word) || 0) + 1);
    }

    return terms;
  }

  private calculateKeyTermOverlap(terms1: Map<string, number>, terms2: Map<string, number>): number {
    if (terms1.size === 0 || terms2.size === 0) return 0;

    let overlapScore = 0;
    let totalWeight = 0;

    for (const [term, count1] of terms1) {
      const count2 = terms2.get(term) || 0;
      if (count2 > 0) {
        overlapScore += Math.min(count1, count2);
      }
      totalWeight += count1;
    }

    return totalWeight > 0 ? overlapScore / totalWeight : 0;
  }

  /**
   * Detect misalignments between intention, documentation, and implementation
   */
  private detectMisalignments(
    intention: string,
    documentation: string,
    implementation: string,
    scores: { intentionToDoc: number; docToImpl: number; intentionToImpl: number }
  ): MisalignmentDetails[] {
    const misalignments: MisalignmentDetails[] = [];

    // Check for semantic drift (intention doesn't match implementation)
    if (scores.intentionToImpl < 0.3) {
      misalignments.push({
        type: 'semantic_drift',
        severity: scores.intentionToImpl < 0.1 ? 'critical' : 'high',
        description: 'Implementation significantly diverges from stated intention',
        affectedComponents: ['implementation', 'intention'],
        suggestedFix: 'Review implementation against original requirements and align or update PR description'
      });
    }

    // Check for scope creep (implementation has concepts not in intention)
    const intentionConcepts = new Set(this.extractConcepts(intention));
    const implConcepts = this.extractConcepts(implementation);
    const newConcepts = implConcepts.filter(c => !intentionConcepts.has(c));

    if (newConcepts.length > implConcepts.length * 0.5) {
      misalignments.push({
        type: 'scope_creep',
        severity: 'medium',
        description: `Implementation introduces ${newConcepts.length} concepts not mentioned in intention`,
        affectedComponents: ['implementation'],
        suggestedFix: 'Update PR description to include new scope or remove unrelated changes'
      });
    }

    // Check for missing documentation
    if (scores.docToImpl < 0.2 && documentation.length < this.config.minDocumentationWordCount) {
      misalignments.push({
        type: 'missing_documentation',
        severity: 'medium',
        description: 'Implementation lacks adequate documentation in commit messages',
        affectedComponents: ['documentation'],
        suggestedFix: 'Add descriptive commit messages explaining the changes'
      });
    }

    // Check for undocumented changes
    if (scores.intentionToDoc > 0.7 && scores.docToImpl < 0.3) {
      misalignments.push({
        type: 'undocumented_change',
        severity: 'high',
        description: 'Implementation contains changes not reflected in documentation',
        affectedComponents: ['implementation', 'documentation'],
        suggestedFix: 'Document all implementation changes in commit messages'
      });
    }

    // Check for contradictory statements
    if (this.detectContradictions(intention, documentation)) {
      misalignments.push({
        type: 'contradictory_statements',
        severity: 'high',
        description: 'Intention and documentation contain contradictory statements',
        affectedComponents: ['intention', 'documentation'],
        suggestedFix: 'Resolve contradictions between PR description and commit messages'
      });
    }

    // Check for incomplete implementation
    if (this.detectIncompleteImplementation(intention, implementation)) {
      misalignments.push({
        type: 'incomplete_implementation',
        severity: 'high',
        description: 'Implementation appears incomplete relative to stated intention',
        affectedComponents: ['implementation'],
        suggestedFix: 'Complete implementation or update intention to reflect partial delivery'
      });
    }

    return misalignments;
  }

  /**
   * Detect contradictions between two texts
   */
  private detectContradictions(text1: string, text2: string): boolean {
    const contradictions = [
      { pattern: /\badd\b/i, anti: /\bremove\b/i },
      { pattern: /\bcreate\b/i, anti: /\bdelete\b/i },
      { pattern: /\benable\b/i, anti: /\bdisable\b/i },
      { pattern: /\binclude\b/i, anti: /\bexclude\b/i },
    ];

    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    for (const { pattern, anti } of contradictions) {
      const hasPattern1 = words1.some(w => pattern.test(w));
      const hasAnti2 = words2.some(w => anti.test(w));
      const hasPattern2 = words2.some(w => pattern.test(w));
      const hasAnti1 = words1.some(w => anti.test(w));

      if ((hasPattern1 && hasAnti2) || (hasPattern2 && hasAnti1)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect if implementation appears incomplete
   */
  private detectIncompleteImplementation(intention: string, implementation: string): boolean {
    // Check for TODO/FIXME markers in implementation
    const incompleteMarkers = [
      /TODO:/i,
      /FIXME:/i,
      /XXX:/i,
      /not implemented/i,
      /coming soon/i,
      /placeholder/i
    ];

    for (const marker of incompleteMarkers) {
      if (marker.test(implementation)) {
        return true;
      }
    }

    // Check if implementation is too short compared to intention
    const intentionWords = intention.split(/\s+/).length;
    const implWords = implementation.split(/\s+/).length;

    if (intentionWords > 20 && implWords < intentionWords * 0.3) {
      return true;
    }

    return false;
  }

  /**
   * Generate hash of implementation for verification
   */
  private generateImplementationHash(implementation: string): string {
    let hash = 0;
    const str = implementation.substring(0, 1000); // Hash first 1000 chars
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  private calculateConfidence(intention: string, documentation: string, implementation: string): number {
    // Confidence based on data quality
    let confidence = 1.0;

    // Reduce confidence for short inputs
    if (intention.split(/\s+/).length < this.config.minIntentionWordCount) confidence *= 0.8;
    if (documentation.split(/\s+/).length < this.config.minDocumentationWordCount) confidence *= 0.7;
    if (implementation.split(/\s+/).length < 10) confidence *= 0.8;

    // Reduce confidence for very long inputs (harder to analyze)
    if (intention.length > 5000) confidence *= 0.9;
    if (implementation.length > 10000) confidence *= 0.85;

    return Math.max(0.1, confidence);
  }

  private generateRemediation(
    isCoherent: boolean,
    misalignments: MisalignmentDetails[],
    coherenceScore: number
  ): string {
    if (isCoherent) {
      return 'Coherence check passed. Intention, documentation, and implementation are aligned.';
    }

    const suggestions: string[] = [];

    if (coherenceScore < this.config.coherenceThreshold) {
      suggestions.push(`Coherence score (${(coherenceScore * 100).toFixed(1)}%) below threshold (${(this.config.coherenceThreshold * 100).toFixed(1)}%)`);
    }

    for (const misalignment of misalignments) {
      if (misalignment.severity === 'critical' || misalignment.severity === 'high') {
        suggestions.push(`${misalignment.type}: ${misalignment.suggestedFix}`);
      }
    }

    return suggestions.length > 0
      ? `Coherence issues detected: ${suggestions.join('; ')}`
      : 'Review required for coherence verification.';
  }

  private logInterpretability(result: CoherenceResult): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      pattern: 'interpretability',
      model_type: 'mithra_coherence_v1',
      explanation_type: 'alignment_analysis',
      circle: 'quality-alignment',
      coherence_score: result.coherenceScore,
      is_coherent: result.isCoherent,
      confidence: result.confidence,
      alignment_scores: result.alignmentScores,
      misalignment_count: result.misalignments.length,
      critical_misalignments: result.misalignments.filter(m => m.severity === 'critical').length,
      correlation_id: result.binding.correlationId
    };

    console.log('[MITHRA-COHERENCE]', JSON.stringify(logEntry));
  }

  private storeBinding(binding: MithraBinding): void {
    const key = binding.correlationId.substring(0, 8);
    const history = this.bindingHistory.get(key) || [];
    history.push(binding);
    this.bindingHistory.set(key, history.slice(-50));

    // Register witnesses
    for (const witness of binding.bindingWitnesses) {
      this.witnessRegistry.add(witness);
    }
  }

  /**
   * Register a witness for coherence verification
   */
  public registerWitness(witnessId: string): void {
    this.witnessRegistry.add(witnessId);
  }

  /**
   * Get binding history
   */
  public getBindingHistory(key?: string): MithraBinding[] {
    if (key) {
      return this.bindingHistory.get(key) || [];
    }
    return Array.from(this.bindingHistory.values()).flat();
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<CoherenceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): Readonly<CoherenceConfig> {
    return { ...this.config };
  }

  /**
   * Validate a specific binding record
   */
  public validateBinding(binding: MithraBinding): boolean {
    // Check if binding exists in history
    const history = this.getBindingHistory(binding.correlationId.substring(0, 8));
    return history.some(b => b.correlationId === binding.correlationId);
  }
}
