/**
 * Provider Matcher
 * Matches patient queries to the most suitable providers
 */
import { ProviderMatch } from './types';
import { PatientQuery } from '../providers/types';
import { Provider } from '../providers/types';
export declare class ProviderMatcher {
    /**
     * Find best matching providers for query
     */
    findMatches(query: PatientQuery, availableProviders: Provider[], topN?: number): Promise<ProviderMatch[]>;
    /**
     * Calculate match score between query and provider
     */
    private calculateMatchScore;
    /**
     * Match query to provider specialization
     */
    private matchSpecialization;
    /**
     * Match query type to provider
     */
    private matchQueryType;
    /**
     * Estimate wait time for provider
     */
    private estimateWaitTime;
    /**
     * Get match explanation
     */
    getMatchExplanation(match: ProviderMatch): string;
}
//# sourceMappingURL=provider-matcher.d.ts.map