import { Citation } from '../types/medical';
export declare class KnowledgeBaseService {
    private knowledgeBase;
    constructor();
    crossCheckAnalysis(diagnosis: string[], citations: Citation[]): Promise<number>;
    searchKnowledgeBase(query: string): Promise<any[]>;
    verifyCitation(citation: Citation): Promise<boolean>;
    addKnowledge(key: string, value: any): Promise<void>;
    private initializeKnowledgeBase;
}
//# sourceMappingURL=knowledge-base.d.ts.map