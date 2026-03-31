/**
 * Episode Repository
 * Database operations for circle episodes
 */
export interface Episode {
    id?: number;
    episode_id: string;
    circle: string;
    ceremony: string;
    timestamp: number;
    state?: string;
    action?: string;
    reward?: number;
    next_state?: string;
    done?: boolean;
    metadata?: string;
    created_at?: number;
}
export interface CircleEquity {
    circle: string;
    color: string;
    episode_count: number;
    percentage: number;
    last_activity?: number;
    last_ceremony?: string;
    updated_at?: number;
}
export declare class EpisodeRepository {
    /**
     * Insert a new episode
     */
    createEpisode(episode: Episode): Promise<number>;
    /**
     * Bulk insert episodes (for migration)
     */
    bulkCreateEpisodes(episodes: Episode[]): Promise<number>;
    /**
     * Get episodes by circle
     */
    getEpisodesByCircle(circle: string, limit?: number, offset?: number): Promise<Episode[]>;
    /**
     * Get all episodes (paginated)
     */
    getAllEpisodes(limit?: number, offset?: number): Promise<Episode[]>;
    /**
     * Get episode by ID
     */
    getEpisodeById(episodeId: string): Promise<Episode | null>;
    /**
     * Get recent episodes across all circles
     */
    getRecentEpisodes(limit?: number): Promise<Episode[]>;
    /**
     * Get circle equity distribution
     */
    getCircleEquity(): Promise<CircleEquity[]>;
    /**
     * Get total episode count
     */
    getTotalEpisodeCount(): Promise<number>;
    /**
     * Get episodes by ceremony
     */
    getEpisodesByCeremony(ceremony: string, limit?: number): Promise<Episode[]>;
    /**
     * Get episodes in time range
     */
    getEpisodesByTimeRange(startTime: number, endTime: number): Promise<Episode[]>;
    /**
     * Delete episode
     */
    deleteEpisode(episodeId: string): Promise<boolean>;
    /**
     * Update episode
     */
    updateEpisode(episodeId: string, updates: Partial<Episode>): Promise<boolean>;
    /**
     * Get circle statistics
     */
    getCircleStats(circle: string): Promise<{
        total_episodes: number;
        unique_ceremonies: number;
        avg_reward: number;
        last_activity?: number;
    }>;
    /**
     * Map database row to Episode object
     */
    private mapEpisode;
}
declare const _default: EpisodeRepository;
export default _default;
//# sourceMappingURL=EpisodeRepository.d.ts.map