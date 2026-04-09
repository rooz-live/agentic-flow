/**
 * ══════════════════════════════════════════════════════════════════════════
 * Trajectory Storage - Episode Trajectory Persistence
 * Stores episode trajectories as JSON for learning curve analysis
 * ════════════════════════════════════════════════════════════════════════════
 */
/**
 * Trajectory state transition for learning curve tracking
 */
export interface TrajectoryState {
    state: string;
    action: string;
    reward: number;
    timestamp?: string;
    metadata?: Record<string, any>;
}
/**
 * Episode with trajectory data
 */
export interface EpisodeWithTrajectory {
    episode_id: string;
    primary_circle: string;
    ceremony: string;
    mode?: string;
    timestamp: string;
    outcome?: string;
    reward?: number;
    trajectory?: TrajectoryState[];
    skills_context?: string;
    mcp_health?: string;
    metadata?: Record<string, any>;
}
/**
 * Query options for trajectory retrieval
 */
export interface TrajectoryQueryOptions {
    circle?: string;
    ceremony?: string;
    since?: string;
    before?: string;
    hours?: number;
    days?: number;
    limit?: number;
    outcome?: string;
}
/**
 * Trajectory query result with metadata
 */
export interface TrajectoryQueryResult {
    episodes: EpisodeWithTrajectory[];
    total: number;
    filtered: number;
    timeRange?: {
        start: string;
        end: string;
    };
}
/**
 * Trajectory statistics
 */
export interface TrajectoryStats {
    totalEpisodes: number;
    byCircle: Record<string, number>;
    byCeremony: Record<string, number>;
    byOutcome: Record<string, number>;
    avgReward: number;
    avgTrajectoryLength: number;
    timeRange: {
        first: string;
        last: string;
    };
}
/**
 * TrajectoryStorage - Manages episode trajectory persistence
 */
export declare class TrajectoryStorage {
    private db;
    private initialized;
    /**
     * Get or create database connection
     */
    private getDB;
    /**
     * Initialize database schema for trajectory storage
     */
    initSchema(): Promise<void>;
    /**
     * Store a single episode with trajectory
     * @param episode Episode data with trajectory
     */
    storeEpisode(episode: EpisodeWithTrajectory): Promise<number>;
    /**
     * Store multiple episodes in a batch
     * @param episodes Array of episodes with trajectories
     */
    storeBatch(episodes: EpisodeWithTrajectory[]): Promise<number[]>;
    /**
     * Query trajectories with filters
     * @param options Query options
     * @returns Trajectory query results
     */
    queryTrajectories(options?: TrajectoryQueryOptions): Promise<TrajectoryQueryResult>;
    /**
     * Get recent learning curves per circle
     * @param circle Circle name
     * @param hours Number of hours to look back
     * @param limit Maximum number of episodes to return
     * @returns Array of recent episodes with trajectories
     */
    getRecentLearningCircles(circle: string, hours?: number, limit?: number): Promise<EpisodeWithTrajectory[]>;
    /**
     * Get trajectory statistics
     * @returns Trajectory statistics
     */
    getStats(): Promise<TrajectoryStats>;
    /**
     * Get a single episode by ID
     * @param episodeId Episode ID
     * @returns Episode data or null if not found
     */
    getEpisode(episodeId: string): Promise<EpisodeWithTrajectory | null>;
    /**
     * Delete episodes older than specified days
     * @param days Number of days to keep
     * @returns Number of deleted episodes
     */
    deleteOldEpisodes(days: number): Promise<number>;
    /**
     * Close database connection
     */
    close(): void;
}
export declare const trajectoryStorage: TrajectoryStorage;
//# sourceMappingURL=trajectory-storage.d.ts.map