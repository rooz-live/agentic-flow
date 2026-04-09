/**
 * AISP v5.1 Type Definitions
 * AI Symbolic Protocol - Proof-carrying protocol for AI-to-AI communication
 *
 * Key Features:
 * - Ambiguity < 2% (vs 40-65% for natural language)
 * - Zero execution overhead (compile once, execute many)
 * - Category Theory foundation with formal verification
 * - Tri-Vector Signal Decomposition (V_H, V_L, V_S)
 */

// Quality Tiers (◊⁺⁺ > ◊⁺ > ◊ > ◊⁻ > ⊘)
export type QualityTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'rejected';
export const QUALITY_TIERS: Record<QualityTier, { symbol: string; minDensity: number }> = {
  platinum: { symbol: '◊⁺⁺', minDensity: 0.75 },
  gold: { symbol: '◊⁺', minDensity: 0.60 },
  silver: { symbol: '◊', minDensity: 0.40 },
  bronze: { symbol: '◊⁻', minDensity: 0.20 },
  rejected: { symbol: '⊘', minDensity: 0 }
};

// Tri-Vector Signal Decomposition (AISP 5.1 Core)
export interface TriVectorSignal {
  V_H: number[]; // High-level semantic embedding (d=768)
  V_L: number[]; // Low-level topological structure (d=512)
  V_S: number[]; // Safety/constraint vector (d=256)
}

// AISP Document Blocks
export interface AISPMeta {
  invariants: string[];
  proofObligations: string[];
  ambiguityTarget: number;
}

export interface AISPTypes {
  primitives: Record<string, string>;
  composites: Record<string, string>;
  dependent: Record<string, string>;
}

export interface AISPRules {
  inference: Array<{ id: string; premise: string; conclusion: string }>;
  constraints: Array<{ id: string; condition: string; action: string }>;
}

export interface AISPFunctions {
  core: Array<{ name: string; signature: string; implementation: string }>;
  derived: Array<{ name: string; signature: string; derivedFrom: string[] }>;
}

export interface AISPErrors {
  handlers: Array<{ pattern: string; recovery: string; severity: 'low' | 'medium' | 'high' | 'critical' }>;
}

export interface AISPEvidence {
  density: number;           // δ ∈ [0,1]
  completeness: number;      // φ ∈ [0,100]
  tier: QualityTier;         // τ
  proofs: string[];          // ⊢ claims
  ambiguity: number;         // Calculated ambiguity score
}

// Main AISP Document Structure
export interface AISPDocument {
  header: {
    version: string;         // e.g., "5.1"
    name: string;            // Document name
    date: string;            // ISO8601
    context: string;         // γ context
    references: string[];    // ρ references
  };
  blocks: {
    omega: AISPMeta;        // ⟦Ω⟧ Meta
    sigma: AISPTypes;       // ⟦Σ⟧ Types
    gamma: AISPRules;       // ⟦Γ⟧ Rules
    lambda: AISPFunctions;  // ⟦Λ⟧ Functions
    chi?: AISPErrors;       // ⟦Χ⟧ Errors (optional)
    epsilon: AISPEvidence;  // ⟦Ε⟧ Evidence
  };
  signal?: TriVectorSignal;  // Optional tri-vector embedding
}

// Binding States (Δ⊗λ)
export type BindingState = 'zero' | 'null' | 'adapt' | 'crash';
export const BINDING_STATES: Record<BindingState, { code: number; description: string }> = {
  zero: { code: 3, description: 'Post(A) ⊆ Pre(B) - Perfect binding' },
  adapt: { code: 2, description: 'Type(A) ≠ Type(B) - Requires adaptation' },
  null: { code: 1, description: 'Sock(A) ∩ Sock(B) = ∅ - No connection' },
  crash: { code: 0, description: 'Logic(A) ∩ Logic(B) ⇒ ⊥ - Incompatible' }
};

// Validation Result
export interface AISPValidationResult {
  isValid: boolean;
  tier: QualityTier;
  density: number;
  ambiguity: number;
  violations: Array<{
    block: string;
    rule: string;
    message: string;
    severity: 'warning' | 'error';
  }>;
}

// Governance Integration Types
export interface AISPGovernanceContext {
  dimension: 'TRUTH' | 'TIME' | 'LIVE' | 'ROAM';
  mymScores?: {
    manthra: number;  // ≥ 0.84
    yasna: number;    // = 1.0
    mithra: number;   // ≥ 0.96
  };
  complianceScore: number;
}

// Category Theory Constructs
export interface Functor<A, B> {
  map: (f: (a: A) => B) => Functor<A, B>;
  ob: A;
}

export interface Monad<T> {
  unit: (value: T) => Monad<T>;
  bind: <U>(f: (value: T) => Monad<U>) => Monad<U>;
  value: T;
}

// Export utility for calculating quality tier
export function calculateQualityTier(density: number): QualityTier {
  if (density >= 0.75) return 'platinum';
  if (density >= 0.60) return 'gold';
  if (density >= 0.40) return 'silver';
  if (density >= 0.20) return 'bronze';
  return 'rejected';
}

// Export utility for calculating ambiguity
export function calculateAmbiguity(
  uniqueParses: number,
  totalParses: number
): number {
  if (totalParses === 0) return 1.0;
  return 1 - (uniqueParses / totalParses);
}

// Export utility for binding state calculation
export function calculateBindingState(
  source: { post: Set<string>; type: string; logic: Set<string> },
  target: { pre: Set<string>; type: string; logic: Set<string> }
): BindingState {
  // Check for postcondition/precondition overlap first (socket connection)
  const socketIntersection = new Set([...source.post].filter(p => target.pre.has(p)));
  
  // If no connection at all, return null
  if (socketIntersection.size === 0) {
    return 'null';
  }
  
  // Check for logical conflict (different logic systems)
  // If logic sets don't match exactly when they both have logic, it's a crash
  if (source.logic.size > 0 && target.logic.size > 0) {
    const logicMatches = [...source.logic].every(l => target.logic.has(l)) &&
                         [...target.logic].every(l => source.logic.has(l));
    if (!logicMatches) return 'crash';
  }

  // Check for type mismatch (requires adaptation)
  if (source.type !== target.type) return 'adapt';

  // Check for perfect postcondition coverage
  const postCovered = [...source.post].every(p => target.pre.has(p));
  if (postCovered) return 'zero';

  // Has connection but not perfect coverage
  return 'adapt';
}

// MYM (Manthra/Yasna/Mithra) Scoring System
export interface MYMScores {
  manthra: number;  // Intent alignment score (target: ≥0.84)
  yasna: number;    // Protocol compliance (target: =1.0)
  mithra: number;   // Covenant adherence (target: ≥0.96)
}

export const MYM_THRESHOLDS: Record<keyof MYMScores, number> = {
  manthra: 0.84,
  yasna: 1.0,
  mithra: 0.96
};

export function calculateMYMScore(scores: MYMScores): {
  overall: number;
  passed: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (scores.manthra < MYM_THRESHOLDS.manthra) {
    violations.push(`Manthra (${scores.manthra.toFixed(2)}) below threshold (${MYM_THRESHOLDS.manthra})`);
  }
  if (scores.yasna < MYM_THRESHOLDS.yasna) {
    violations.push(`Yasna (${scores.yasna.toFixed(2)}) below threshold (${MYM_THRESHOLDS.yasna})`);
  }
  if (scores.mithra < MYM_THRESHOLDS.mithra) {
    violations.push(`Mithra (${scores.mithra.toFixed(2)}) below threshold (${MYM_THRESHOLDS.mithra})`);
  }

  // Weighted average: Manthra(40%), Yasna(30%), Mithra(30%)
  const overall = (scores.manthra * 0.4) + (scores.yasna * 0.3) + (scores.mithra * 0.3);

  return {
    overall,
    passed: violations.length === 0,
    violations
  };
}

// AISP Governance Decision Record
export interface AISPGovernanceDecision {
  id: string;
  timestamp: string;
  dimension: 'TRUTH' | 'TIME' | 'LIVE' | 'ROAM';
  decision: string;
  rationale: string;
  mymScores: MYMScores;
  complianceScore: number;
  violations: string[];
  approvedBy?: string;
}

// AISP Protocol Message (for agent-to-agent communication)
export interface AISPMessage {
  header: {
    messageId: string;
    version: string;
    timestamp: string;
    sender: string;
    receiver: string;
  };
  payload: {
    intent: string;
    proof: string[];
    signal: TriVectorSignal;
  };
  governance: AISPGovernanceContext;
}
