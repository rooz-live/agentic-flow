/**
 * AISP Proof-Carrying Protocol (PCP)
 *
 * Extends AISP specification with proof requirements for formal verification.
 * Implements proof-carrying code paradigm where every AISP document carries
 * a formal proof of its well-formedness and correctness properties.
 *
 * Based on: https://gist.github.com/bar181/b02944bd27e91c7116c41647b396c4b8
 * WSJF Score: 5.5 (High priority)
 */
import { AISPOrchestrator } from './specification';
/**
 * Natural Deduction proof system (⊢ND)
 * Judgment: Γ ⊢ A (context Γ proves proposition A)
 */
export interface NaturalDeductionProof {
    premises: Proposition[];
    conclusion: Proposition;
    rules: InferenceRule[];
    derivationTree: ProofTree;
}
export type Proposition = {
    type: 'atomic';
    symbol: string;
} | {
    type: 'conjunction';
    left: Proposition;
    right: Proposition;
} | {
    type: 'disjunction';
    left: Proposition;
    right: Proposition;
} | {
    type: 'implication';
    antecedent: Proposition;
    consequent: Proposition;
} | {
    type: 'negation';
    inner: Proposition;
} | {
    type: 'forall';
    variable: string;
    body: Proposition;
} | {
    type: 'exists';
    variable: string;
    body: Proposition;
};
export type InferenceRule = {
    type: 'assume';
    proposition: Proposition;
} | {
    type: 'and_intro';
    left: ProofTree;
    right: ProofTree;
} | {
    type: 'and_elim_left';
    proof: ProofTree;
} | {
    type: 'and_elim_right';
    proof: ProofTree;
} | {
    type: 'or_intro_left';
    proof: ProofTree;
    rightType: Proposition;
} | {
    type: 'or_intro_right';
    proof: ProofTree;
    leftType: Proposition;
} | {
    type: 'or_elim';
    disjunction: ProofTree;
    leftCase: ProofTree;
    rightCase: ProofTree;
} | {
    type: 'impl_intro';
    assumption: Proposition;
    body: ProofTree;
} | {
    type: 'impl_elim';
    implication: ProofTree;
    argument: ProofTree;
} | {
    type: 'forall_intro';
    variable: string;
    body: ProofTree;
} | {
    type: 'forall_elim';
    proof: ProofTree;
    term: string;
} | {
    type: 'exists_intro';
    witness: string;
    body: ProofTree;
} | {
    type: 'exists_elim';
    existence: ProofTree;
    variable: string;
    body: ProofTree;
};
export interface ProofTree {
    rule: InferenceRule;
    conclusion: Proposition;
    subproofs: ProofTree[];
    context: Proposition[];
}
/**
 * Category Theory foundations (⊢CAT)
 * Objects, Morphisms, Composition, Identity
 */
export interface Category<Obj, Mor> {
    objects: Set<Obj>;
    morphisms: (a: Obj, b: Obj) => Set<Mor>;
    compose: (g: Mor, f: Mor) => Mor;
    identity: (a: Obj) => Mor;
}
export interface Functor<C1, C2, Obj1, Obj2, Mor1, Mor2> {
    source: Category<Obj1, Mor1>;
    target: Category<Obj2, Mor2>;
    mapObject: (obj: Obj1) => Obj2;
    mapMorphism: (mor: Mor1) => Mor2;
}
/**
 * Well-formedness proof: ⊢ wf(D)
 * Every AISP document D must carry a proof that it's well-formed
 */
export interface WellFormednessProof {
    document: any;
    foundationProof: ProofTree;
    glossaryProof: ProofTree;
    rulesProof: ProofTree;
    functionsProof: ProofTree;
    ambiguityProof: ProofTree;
}
/**
 * Type correctness proof: Γ ⊢ e : τ
 * Every expression e has a type τ derivable from context Γ
 */
export interface TypeCorrectnessProof {
    expression: any;
    type: Type;
    context: Map<string, Type>;
    derivation: ProofTree;
}
export type Type = {
    kind: 'primitive';
    name: string;
} | {
    kind: 'tensor';
    dimension: number;
} | {
    kind: 'function';
    domain: Type;
    codomain: Type;
} | {
    kind: 'product';
    left: Type;
    right: Type;
} | {
    kind: 'sum';
    left: Type;
    right: Type;
} | {
    kind: 'dependent_pi';
    variable: string;
    domain: Type;
    codomain: Type;
} | {
    kind: 'dependent_sigma';
    variable: string;
    domain: Type;
    codomain: Type;
};
/**
 * Safety property proof: ⊢ Safe(p)
 * Pocket p maintains V_S safety constraints
 */
export interface SafetyProof {
    pocket: any;
    orthogonalityProof: ProofTree;
    preservationProof: ProofTree;
    riskBoundProof: ProofTree;
}
export declare class ProofVerifier {
    /**
     * Verify natural deduction proof
     * Check that derivation tree is valid under ND rules
     */
    verifyNaturalDeduction(proof: NaturalDeductionProof): boolean;
    verifyProofTree(tree: ProofTree, context: Proposition[]): boolean;
    /**
     * Verify type correctness proof
     * Check that type derivation is valid under typing rules
     */
    verifyTypeCorrectness(proof: TypeCorrectnessProof): boolean;
    private checkType;
    /**
     * Verify safety proof
     * Check that V_S constraints are maintained
     */
    verifySafety(proof: SafetyProof): boolean;
    private propEqual;
    private typeEqual;
    private substitute;
}
export declare class ProofCarryingAISPOrchestrator extends AISPOrchestrator {
    private verifier;
    constructor();
    /**
     * Validate AISP document with proof checking
     * Extends base validation with formal verification
     */
    validateDocumentWithProof(document: any): Promise<any>;
    private extractWellFormednessProof;
    private verifyWellFormednessProof;
}
export declare class ProofBuilder {
    /**
     * Build proof that Ambig(D) < 0.02
     * Formula: 1 - |Parse_u(D)|/|Parse_t(D)| < 0.02
     */
    buildAmbiguityProof(document: any, ambiguity: number): ProofTree;
    /**
     * Build proof that V_S is orthogonal to V_H and V_L
     * V_H ∩ V_S ≡ ∅ ∧ V_L ∩ V_S ≡ ∅
     */
    buildOrthogonalityProof(): ProofTree;
}
declare const _default: {
    ProofVerifier: typeof ProofVerifier;
    ProofCarryingAISPOrchestrator: typeof ProofCarryingAISPOrchestrator;
    ProofBuilder: typeof ProofBuilder;
};
export default _default;
//# sourceMappingURL=proof_carrying_protocol.d.ts.map