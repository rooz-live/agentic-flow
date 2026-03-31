/**
 * AISP (AI Symbolic Protocol) Integration
 * Proof-carrying protocol types for agentic-flow
 * Based on AISP 5.1 Platinum Specification
 *
 * Reference: https://github.com/bar181/aisp-open-core
 */
export interface AISPDocument {
    version: '5.1';
    blocks: AISPBlock[];
    metadata: AISPMetadata;
    validation: ValidationResult;
}
export interface AISPMetadata {
    id: string;
    timestamp: string;
    author?: string;
    ambiguity: number;
    tier: QualityTier;
}
export type QualityTier = '◊++' | '◊+' | '◊' | '◊-' | '⊘';
export interface AISPBlock {
    type: BlockType;
    name: string;
    content: string;
    proof?: ProofObligation;
    dependencies: string[];
}
export type BlockType = 'Ω:Foundation' | 'Σ:Glossary' | 'Γ:Rules' | 'Λ:Functions' | 'Χ:Errors' | 'Ε:Evidence' | 'ℭ:Categories' | 'ℜ:Resources';
export interface ValidationResult {
    valid: boolean;
    ambiguity: number;
    density: number;
    tier: QualityTier;
    completeness: number;
    proofObligations: ProofObligation[];
    errors: ValidationError[];
}
export interface ProofObligation {
    id: string;
    statement: string;
    status: 'PENDING' | 'PROVEN' | 'FAILED' | 'TIMEOUT';
    method?: ProofMethod;
    evidence?: Evidence[];
    dependencies: string[];
}
export type ProofMethod = 'NATURAL_DEDUCTION' | 'CATEGORY_THEORY' | 'TYPE_CHECK' | 'CONTRACT_VERIFY' | 'AUTOMATED_THEOREM';
export interface Evidence {
    type: 'RUNTIME' | 'COMPILE_TIME' | 'FORMAL_PROOF' | 'TEST_RESULT';
    data: Record<string, unknown>;
    timestamp: string;
    confidence: number;
}
export interface ValidationError {
    code: string;
    message: string;
    location: {
        block: string;
        line?: number;
    };
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recovery?: RecoveryAction;
}
export interface RecoveryAction {
    type: 'REJECT' | 'REGISTER' | 'SKIP' | 'REPAIR' | 'CONFIRM';
    action: () => Promise<void>;
}
export interface Signal {
    V_H: number[];
    V_L: number[];
    V_S: number[];
}
export interface SignalAnalysis {
    semantic_similarity: number;
    structural_fitness: number;
    safety_affinity: number;
    overall_score: number;
}
export interface Pocket {
    header: PocketHeader;
    membrane: PocketMembrane;
    nucleus: PocketNucleus;
}
export interface PocketHeader {
    id: string;
    signal: Signal;
    flags: bigint;
}
export interface PocketMembrane {
    affinity: Map<string, number>;
    confidence: number;
    tags: Set<string>;
    usage: number;
}
export interface PocketNucleus {
    definition: string;
    ir?: string;
    wasm?: Uint8Array;
    signature?: string;
}
export interface BindingState {
    state: 0 | 1 | 2 | 3;
    priority: 'BOTTOM' | 'EMPTY' | 'LAMBDA' | 'TOP';
}
export interface BindingResult {
    state: BindingState;
    compatible: boolean;
    dceApplied: boolean;
    optimizations: string[];
}
export declare function calculateBinding(pocketA: Pocket, pocketB: Pocket): BindingResult;
export interface SearchBeam {
    pockets: Pocket[];
    ghost: Signal;
    fitness: number;
    risk: number;
    viable: boolean;
}
export interface SearchConfig {
    K: number;
    tau: number;
    lambda_r: number;
    eta: number;
    T: number;
    epsilon: number;
}
export declare class RossNetSearchEngine {
    private config;
    private registry;
    constructor(config?: Partial<SearchConfig>);
    search(target: Signal): Promise<SearchBeam>;
    private initializeBeams;
    private stepSearch;
    private expandBeam;
    private scan;
    private calculateGhost;
    private calculateFitness;
    private calculateRisk;
    private isDone;
    private isGhostEmpty;
    private selectBest;
    private selectDiverseSet;
    private prune;
    private signalDistance;
    private cosineSimilarity;
    private aggregateSignals;
    private subtractSignals;
    registerPocket(pocket: Pocket): void;
}
export declare class AISPValidator {
    validate(doc: AISPDocument): ValidationResult;
    private validateBlock;
    private calculateDensity;
    private calculateTier;
    private calculateCompleteness;
}
export declare const AISP: {
    Validator: typeof AISPValidator;
    SearchEngine: typeof RossNetSearchEngine;
    calculateBinding: typeof calculateBinding;
};
//# sourceMappingURL=types.d.ts.map