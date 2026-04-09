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
export type QualityTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'rejected';
export declare const QUALITY_TIERS: Record<QualityTier, {
    symbol: string;
    minDensity: number;
}>;
export interface TriVectorSignal {
    V_H: number[];
    V_L: number[];
    V_S: number[];
}
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
    inference: Array<{
        id: string;
        premise: string;
        conclusion: string;
    }>;
    constraints: Array<{
        id: string;
        condition: string;
        action: string;
    }>;
}
export interface AISPFunctions {
    core: Array<{
        name: string;
        signature: string;
        implementation: string;
    }>;
    derived: Array<{
        name: string;
        signature: string;
        derivedFrom: string[];
    }>;
}
export interface AISPErrors {
    handlers: Array<{
        pattern: string;
        recovery: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
}
export interface AISPEvidence {
    density: number;
    completeness: number;
    tier: QualityTier;
    proofs: string[];
    ambiguity: number;
}
export interface AISPDocument {
    header: {
        version: string;
        name: string;
        date: string;
        context: string;
        references: string[];
    };
    blocks: {
        omega: AISPMeta;
        sigma: AISPTypes;
        gamma: AISPRules;
        lambda: AISPFunctions;
        chi?: AISPErrors;
        epsilon: AISPEvidence;
    };
    signal?: TriVectorSignal;
}
export type BindingState = 'zero' | 'null' | 'adapt' | 'crash';
export declare const BINDING_STATES: Record<BindingState, {
    code: number;
    description: string;
}>;
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
export interface AISPGovernanceContext {
    dimension: 'TRUTH' | 'TIME' | 'LIVE' | 'ROAM';
    mymScores?: {
        manthra: number;
        yasna: number;
        mithra: number;
    };
    complianceScore: number;
}
export interface Functor<A, B> {
    map: (f: (a: A) => B) => Functor<A, B>;
    ob: A;
}
export interface Monad<T> {
    unit: (value: T) => Monad<T>;
    bind: <U>(f: (value: T) => Monad<U>) => Monad<U>;
    value: T;
}
export declare function calculateQualityTier(density: number): QualityTier;
export declare function calculateAmbiguity(uniqueParses: number, totalParses: number): number;
export declare function calculateBindingState(source: {
    post: Set<string>;
    type: string;
    logic: Set<string>;
}, target: {
    pre: Set<string>;
    type: string;
    logic: Set<string>;
}): BindingState;
export interface MYMScores {
    manthra: number;
    yasna: number;
    mithra: number;
}
export declare const MYM_THRESHOLDS: Record<keyof MYMScores, number>;
export declare function calculateMYMScore(scores: MYMScores): {
    overall: number;
    passed: boolean;
    violations: string[];
};
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
//# sourceMappingURL=aisp-types.d.ts.map