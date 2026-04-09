/**
 * Flarum Client
 *
 * Phase 2 Implementation - Flarum REST API Integration
 *
 * Provides a complete client for Flarum's JSON:API including:
 * - Discussion operations (CRUD)
 * - Post operations
 * - User operations
 * - Tag operations
 * - User linking for federated identity
 */
import { EventEmitter } from 'events';
import { FlarumConfig, FlarumDiscussion, FlarumPost, FlarumUser, FlarumTag, FlarumResponse } from './types.js';
/**
 * Flarum REST API Client
 *
 * Implements comprehensive Flarum integration using JSON:API spec including:
 * - Discussion management
 * - Post/comment management
 * - User management and linking
 * - Tag management
 */
export declare class FlarumClient extends EventEmitter {
    private config;
    private baseApiUrl;
    constructor(config: FlarumConfig);
    private getHeaders;
    private request;
    /**
     * Get a single discussion by ID
     */
    getDiscussion(id: string): Promise<FlarumDiscussion>;
    /**
     * List discussions with pagination and filtering
     */
    listDiscussions(params?: {
        page?: {
            offset: number;
            limit: number;
        };
        filter?: Record<string, string>;
        sort?: string;
        include?: string[];
    }): Promise<FlarumResponse<FlarumDiscussion>>;
    /**
     * Create a new discussion
     */
    createDiscussion(data: {
        title: string;
        content: string;
        tags?: string[];
    }): Promise<FlarumDiscussion>;
    /**
     * Update an existing discussion
     */
    updateDiscussion(id: string, data: Partial<{
        title: string;
        isLocked: boolean;
        isSticky: boolean;
        isHidden: boolean;
        tags: string[];
    }>): Promise<FlarumDiscussion>;
    /**
     * Delete a discussion
     */
    deleteDiscussion(id: string): Promise<void>;
    /**
     * Search discussions
     */
    searchDiscussions(query: string, params?: {
        page?: {
            offset: number;
            limit: number;
        };
    }): Promise<FlarumResponse<FlarumDiscussion>>;
    /**
     * Get posts for a discussion
     */
    getPosts(discussionId: string, params?: {
        page?: {
            offset: number;
            limit: number;
        };
    }): Promise<FlarumResponse<FlarumPost>>;
    /**
     * Get a single post by ID
     */
    getPost(id: string): Promise<FlarumPost>;
    /**
     * Create a new post (reply) in a discussion
     */
    createPost(discussionId: string, content: string): Promise<FlarumPost>;
    /**
     * Update an existing post
     */
    updatePost(id: string, content: string): Promise<FlarumPost>;
    /**
     * Delete a post
     */
    deletePost(id: string): Promise<void>;
    /**
     * Hide a post (soft delete)
     */
    hidePost(id: string): Promise<FlarumPost>;
    /**
     * Get a user by ID
     */
    getUser(id: string): Promise<FlarumUser>;
    /**
     * Get a user by username
     */
    getUserByUsername(username: string): Promise<FlarumUser | null>;
    /**
     * List users with pagination
     */
    listUsers(params?: {
        page?: {
            offset: number;
            limit: number;
        };
        filter?: Record<string, string>;
    }): Promise<FlarumResponse<FlarumUser>>;
    /**
     * Link a Flarum user to an external identity
     * This requires a custom Flarum extension for external identity linking
     */
    linkUser(flarumUserId: string, externalId: string): Promise<void>;
    /**
     * Unlink a Flarum user from an external identity
     */
    unlinkUser(flarumUserId: string): Promise<void>;
    /**
     * Update user profile
     */
    updateUser(id: string, data: Partial<{
        username: string;
        email: string;
        bio: string;
    }>): Promise<FlarumUser>;
    /**
     * Get all tags
     */
    getTags(): Promise<FlarumTag[]>;
    /**
     * Get a single tag by ID
     */
    getTag(id: string): Promise<FlarumTag>;
    /**
     * Create a new tag (requires admin privileges)
     */
    createTag(data: {
        name: string;
        slug: string;
        description?: string;
        color?: string;
        icon?: string;
        isHidden?: boolean;
        parentId?: string;
    }): Promise<FlarumTag>;
    /**
     * Update an existing tag
     */
    updateTag(id: string, data: Partial<{
        name: string;
        slug: string;
        description: string;
        color: string;
        icon: string;
        isHidden: boolean;
    }>): Promise<FlarumTag>;
    /**
     * Delete a tag
     */
    deleteTag(id: string): Promise<void>;
    /**
     * Get all groups
     */
    getGroups(): Promise<any[]>;
    /**
     * Add user to group
     */
    addUserToGroup(userId: string, groupId: string): Promise<void>;
    /**
     * Remove user from group
     */
    removeUserFromGroup(userId: string, groupId: string): Promise<void>;
    /**
     * Get notifications for the authenticated user
     */
    getNotifications(params?: {
        page?: {
            offset: number;
            limit: number;
        };
    }): Promise<any[]>;
    /**
     * Mark all notifications as read
     */
    markAllNotificationsRead(): Promise<void>;
    /**
     * Health check for the Flarum API
     */
    healthCheck(): Promise<{
        healthy: boolean;
        version?: string;
        error?: string;
    }>;
    /**
     * Get forum information
     */
    getForumInfo(): Promise<{
        title: string;
        description: string;
        baseUrl: string;
        welcomeMessage?: string;
        allowSignUp: boolean;
    }>;
    /**
     * Get current configuration
     */
    getConfig(): FlarumConfig;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<FlarumConfig>): void;
    /**
     * Get API statistics
     */
    getStats(): Promise<{
        totalDiscussions: number;
        totalPosts: number;
        totalUsers: number;
    }>;
}
/**
 * Factory function to create a Flarum client
 */
export declare function createFlarumClient(config: FlarumConfig): FlarumClient;
//# sourceMappingURL=flarum-client.d.ts.map