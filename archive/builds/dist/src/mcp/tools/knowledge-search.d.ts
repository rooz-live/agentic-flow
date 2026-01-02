/**
 * Knowledge Search Tool
 * Searches medical knowledge bases for relevant information
 */
import type { KnowledgeSearchQuery, MCPToolResponse } from '../types';
export declare class KnowledgeSearchTool {
    private readonly knowledgeBases;
    constructor();
    /**
     * Search medical knowledge
     */
    execute(args: KnowledgeSearchQuery): Promise<MCPToolResponse>;
    /**
     * Search knowledge bases
     */
    private searchKnowledgeBases;
    /**
     * Generate sample results for a source
     */
    private generateResults;
    /**
     * Generate result content
     */
    private generateContent;
    /**
     * Generate citations for result
     */
    private generateCitations;
    /**
     * Get source type
     */
    private getSourceType;
    /**
     * Generate date within range
     */
    private generateDate;
    /**
     * Check if source matches type filter
     */
    private matchesSourceType;
    /**
     * Format search results
     */
    private formatSearchResults;
}
//# sourceMappingURL=knowledge-search.d.ts.map