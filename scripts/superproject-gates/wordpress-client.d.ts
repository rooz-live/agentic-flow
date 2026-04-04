/**
 * WordPress Client
 *
 * Phase 2 Implementation - WordPress REST API v2 Integration
 *
 * Provides a complete client for WordPress REST API v2 including:
 * - Authentication (JWT, OAuth2, Application Password)
 * - Content operations (CRUD for posts, pages, custom types)
 * - Media operations (upload, retrieve, manage)
 * - User operations
 * - Webhook registration
 */
import { EventEmitter } from 'events';
import { WordPressConfig, WPContent, WPMedia, WPUser } from './types.js';
/**
 * WordPress REST API v2 Client
 *
 * Implements comprehensive WordPress integration including:
 * - Multiple authentication methods
 * - Content management (posts, pages, custom types)
 * - Media library operations
 * - User management
 * - Webhook registration
 */
export declare class WordPressClient extends EventEmitter {
    private config;
    private httpClient;
    private authToken;
    private tokenExpiry;
    constructor(config: WordPressConfig);
    /**
     * Authenticate with WordPress and get an access token
     * Supports JWT, OAuth2, and Application Password methods
     */
    authenticate(): Promise<string>;
    private authenticateJWT;
    private authenticateOAuth2;
    private createApplicationPasswordAuth;
    private getAuthHeaders;
    private ensureAuthenticated;
    /**
     * Get content by type and ID
     */
    getContent(type: string, id: number): Promise<WPContent>;
    /**
     * List content with pagination and filtering
     */
    listContent(type: string, params?: {
        page?: number;
        perPage?: number;
        status?: string;
        search?: string;
        orderBy?: string;
        order?: 'asc' | 'desc';
        categories?: number[];
        tags?: number[];
    }): Promise<{
        items: WPContent[];
        total: number;
        totalPages: number;
    }>;
    /**
     * Create new content
     */
    createContent(type: string, content: Partial<WPContent>): Promise<WPContent>;
    /**
     * Update existing content
     */
    updateContent(type: string, id: number, content: Partial<WPContent>): Promise<WPContent>;
    /**
     * Delete content
     */
    deleteContent(type: string, id: number, force?: boolean): Promise<void>;
    /**
     * Upload media file
     */
    uploadMedia(file: Buffer, filename: string, mimeType: string): Promise<{
        id: number;
        url: string;
    }>;
    /**
     * Get media by ID
     */
    getMedia(id: number): Promise<WPMedia>;
    /**
     * List media items
     */
    listMedia(params?: {
        page?: number;
        perPage?: number;
        mediaType?: string;
        mimeType?: string;
    }): Promise<{
        items: WPMedia[];
        total: number;
    }>;
    /**
     * Delete media
     */
    deleteMedia(id: number, force?: boolean): Promise<void>;
    /**
     * Get user by ID
     */
    getUser(id: number): Promise<WPUser>;
    /**
     * Get current authenticated user
     */
    getCurrentUser(): Promise<WPUser>;
    /**
     * Create new user
     */
    createUser(userData: {
        username: string;
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
        roles?: string[];
    }): Promise<WPUser>;
    /**
     * List users
     */
    listUsers(params?: {
        page?: number;
        perPage?: number;
        roles?: string[];
        search?: string;
    }): Promise<{
        items: WPUser[];
        total: number;
    }>;
    /**
     * Register a webhook for specific events
     * Note: Requires a webhook plugin like WP Webhooks
     */
    registerWebhook(events: string[], callbackUrl: string): Promise<string>;
    /**
     * Unregister a webhook
     */
    unregisterWebhook(hookId: string): Promise<void>;
    /**
     * Get categories
     */
    getCategories(params?: {
        page?: number;
        perPage?: number;
    }): Promise<Array<{
        id: number;
        name: string;
        slug: string;
        parent: number;
    }>>;
    /**
     * Get tags
     */
    getTags(params?: {
        page?: number;
        perPage?: number;
        search?: string;
    }): Promise<Array<{
        id: number;
        name: string;
        slug: string;
    }>>;
    private getContentEndpoint;
    private mapToWPContent;
    private mapFromWPContent;
    private mapToWPMedia;
    private mapToWPUser;
    /**
     * Check if the WordPress site is reachable
     */
    healthCheck(): Promise<{
        healthy: boolean;
        version?: string;
        error?: string;
    }>;
    /**
     * Get WordPress site information
     */
    getSiteInfo(): Promise<{
        name: string;
        description: string;
        url: string;
        timezone: string;
        namespaces: string[];
    }>;
    /**
     * Get current configuration
     */
    getConfig(): WordPressConfig;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<WordPressConfig>): void;
}
/**
 * Factory function to create a WordPress client
 */
export declare function createWordPressClient(config: WordPressConfig): WordPressClient;
//# sourceMappingURL=wordpress-client.d.ts.map