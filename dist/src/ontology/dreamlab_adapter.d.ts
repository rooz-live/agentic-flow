/**
 * DreamLab AI Metaverse Ontology Adapter
 *
 * Adapts GenAI outputs to the DreamLab ontology structure.
 * Focuses on:
 * 1. Entity Grounding (mapping text to ontology entities)
 * 2. Relationship Extraction
 * 3. Attribute Validation
 */
export interface OntologyEntity {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
    groundingConfidence: number;
}
export interface OntologyRelationship {
    sourceId: string;
    targetId: string;
    type: string;
    weight: number;
}
export interface GroundingResult {
    entities: OntologyEntity[];
    relationships: OntologyRelationship[];
    unmappedConcepts: string[];
}
export declare class DreamLabAdapter {
    private schema;
    private synth;
    constructor(apiKey: string);
    /**
     * Grounds unstructured GenAI output into the DreamLab ontology.
     * @param genAiOutput The raw text or JSON output from an LLM.
     */
    groundToOntology(genAiOutput: unknown): Promise<GroundingResult>;
    /**
     * Validates if an entity conforms to specific Metaverse standards.
     */
    validateEntity(entity: OntologyEntity): boolean;
}
//# sourceMappingURL=dreamlab_adapter.d.ts.map