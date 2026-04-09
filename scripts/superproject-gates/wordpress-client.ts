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
import * as crypto from 'crypto';

import {
  WordPressConfig,
  WPContent,
  WPMedia,
  WPUser,
  WPWebhook,
  DEFAULT_WORDPRESS_CONFIG
} from './types.js';

/**
 * HTTP client interface for making requests
 * This can be replaced with axios, node-fetch, or any HTTP client
 */
interface HttpClient {
  get<T>(url: string, config?: any): Promise<{ data: T; headers: any }>;
  post<T>(url: string, data?: any, config?: any): Promise<{ data: T; headers: any }>;
  put<T>(url: string, data?: any, config?: any): Promise<{ data: T; headers: any }>;
  delete<T>(url: string, config?: any): Promise<{ data: T; headers: any }>;
}

/**
 * Simple HTTP client implementation using fetch
 */
class FetchHttpClient implements HttpClient {
  private defaultHeaders: Record<string, string> = {};
  private timeout: number;

  constructor(timeout: number = 30000) {
    this.timeout = timeout;
  }

  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  async get<T>(url: string, config?: any): Promise<{ data: T; headers: any }> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T>(url: string, data?: any, config?: any): Promise<{ data: T; headers: any }> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T>(url: string, data?: any, config?: any): Promise<{ data: T; headers: any }> {
    return this.request<T>('PUT', url, data, config);
  }

  async delete<T>(url: string, config?: any): Promise<{ data: T; headers: any }> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: any
  ): Promise<{ data: T; headers: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...config?.headers
      };

      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json() as T;
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return { data: responseData, headers: responseHeaders };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

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
export class WordPressClient extends EventEmitter {
  private config: WordPressConfig;
  private httpClient: HttpClient;
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: WordPressConfig) {
    super();
    this.config = { ...DEFAULT_WORDPRESS_CONFIG, ...config } as WordPressConfig;
    this.httpClient = new FetchHttpClient(this.config.timeout || 30000);
  }

  // ==================== Authentication ====================

  /**
   * Authenticate with WordPress and get an access token
   * Supports JWT, OAuth2, and Application Password methods
   */
  async authenticate(): Promise<string> {
    this.emit('authenticating', { method: this.config.auth.type });

    try {
      let token: string;

      switch (this.config.auth.type) {
        case 'jwt':
          token = await this.authenticateJWT();
          break;
        case 'oauth2':
          token = await this.authenticateOAuth2();
          break;
        case 'application_password':
          token = this.createApplicationPasswordAuth();
          break;
        default:
          throw new Error(`Unsupported auth type: ${this.config.auth.type}`);
      }

      this.authToken = token;
      this.emit('authenticated', { method: this.config.auth.type });
      
      return token;
    } catch (error) {
      this.emit('authError', { error });
      throw error;
    }
  }

  private async authenticateJWT(): Promise<string> {
    const { username, password } = this.config.auth.credentials;
    
    const response = await this.httpClient.post<{ token: string; user_email: string; user_display_name: string }>(
      `${this.config.baseUrl}/wp-json/jwt-auth/v1/token`,
      { username, password }
    );

    // JWT tokens typically expire in 7 days
    this.tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    return response.data.token;
  }

  private async authenticateOAuth2(): Promise<string> {
    const { clientId, clientSecret, accessToken, refreshToken } = this.config.auth.credentials;
    
    // If we have a refresh token, use it to get a new access token
    if (refreshToken) {
      const response = await this.httpClient.post<{ access_token: string; expires_in: number }>(
        `${this.config.baseUrl}/oauth/token`,
        {
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken
        }
      );
      
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
      return response.data.access_token;
    }
    
    // Otherwise use existing access token
    if (accessToken) {
      return accessToken;
    }
    
    throw new Error('OAuth2 requires either an access token or refresh token');
  }

  private createApplicationPasswordAuth(): string {
    const { username, applicationPassword } = this.config.auth.credentials;
    const credentials = Buffer.from(`${username}:${applicationPassword}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    if (this.config.auth.type === 'application_password') {
      return { Authorization: this.authToken };
    }

    return { Authorization: `Bearer ${this.authToken}` };
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.authToken || (this.tokenExpiry && new Date() >= this.tokenExpiry)) {
      await this.authenticate();
    }
  }

  // ==================== Content Operations ====================

  /**
   * Get content by type and ID
   */
  async getContent(type: string, id: number): Promise<WPContent> {
    await this.ensureAuthenticated();

    const endpoint = this.getContentEndpoint(type);
    const response = await this.httpClient.get<any>(
      `${this.config.baseUrl}/wp-json/wp/v2/${endpoint}/${id}`,
      { headers: this.getAuthHeaders() }
    );

    return this.mapToWPContent(response.data, type);
  }

  /**
   * List content with pagination and filtering
   */
  async listContent(type: string, params?: {
    page?: number;
    perPage?: number;
    status?: string;
    search?: string;
    orderBy?: string;
    order?: 'asc' | 'desc';
    categories?: number[];
    tags?: number[];
  }): Promise<{ items: WPContent[]; total: number; totalPages: number }> {
    await this.ensureAuthenticated();

    const endpoint = this.getContentEndpoint(type);
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.perPage) queryParams.set('per_page', params.perPage.toString());
    if (params?.status) queryParams.set('status', params.status);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.orderBy) queryParams.set('orderby', params.orderBy);
    if (params?.order) queryParams.set('order', params.order);
    if (params?.categories?.length) queryParams.set('categories', params.categories.join(','));
    if (params?.tags?.length) queryParams.set('tags', params.tags.join(','));

    const url = `${this.config.baseUrl}/wp-json/wp/v2/${endpoint}?${queryParams.toString()}`;
    const response = await this.httpClient.get<any[]>(url, { headers: this.getAuthHeaders() });

    const items = response.data.map(item => this.mapToWPContent(item, type));
    const total = parseInt(response.headers['x-wp-total'] || '0', 10);
    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '0', 10);

    return { items, total, totalPages };
  }

  /**
   * Create new content
   */
  async createContent(type: string, content: Partial<WPContent>): Promise<WPContent> {
    await this.ensureAuthenticated();

    const endpoint = this.getContentEndpoint(type);
    const payload = this.mapFromWPContent(content);

    const response = await this.httpClient.post<any>(
      `${this.config.baseUrl}/wp-json/wp/v2/${endpoint}`,
      payload,
      { headers: this.getAuthHeaders() }
    );

    this.emit('contentCreated', { type, id: response.data.id });
    return this.mapToWPContent(response.data, type);
  }

  /**
   * Update existing content
   */
  async updateContent(type: string, id: number, content: Partial<WPContent>): Promise<WPContent> {
    await this.ensureAuthenticated();

    const endpoint = this.getContentEndpoint(type);
    const payload = this.mapFromWPContent(content);

    const response = await this.httpClient.post<any>(
      `${this.config.baseUrl}/wp-json/wp/v2/${endpoint}/${id}`,
      payload,
      { headers: this.getAuthHeaders() }
    );

    this.emit('contentUpdated', { type, id });
    return this.mapToWPContent(response.data, type);
  }

  /**
   * Delete content
   */
  async deleteContent(type: string, id: number, force: boolean = false): Promise<void> {
    await this.ensureAuthenticated();

    const endpoint = this.getContentEndpoint(type);
    const queryParams = force ? '?force=true' : '';

    await this.httpClient.delete(
      `${this.config.baseUrl}/wp-json/wp/v2/${endpoint}/${id}${queryParams}`,
      { headers: this.getAuthHeaders() }
    );

    this.emit('contentDeleted', { type, id, force });
  }

  // ==================== Media Operations ====================

  /**
   * Upload media file
   */
  async uploadMedia(
    file: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ id: number; url: string }> {
    await this.ensureAuthenticated();

    // For media upload, we need multipart form data
    const boundary = `----WebKitFormBoundary${crypto.randomBytes(16).toString('hex')}`;
    
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`),
      Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`),
      file,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const response = await fetch(
      `${this.config.baseUrl}/wp-json/wp/v2/media`,
      {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Disposition': `attachment; filename="${filename}"`
        },
        body
      }
    );

    if (!response.ok) {
      throw new Error(`Media upload failed: ${response.statusText}`);
    }

    const data = await response.json() as { id: number; source_url: string };
    
    this.emit('mediaUploaded', { id: data.id, filename });
    return { id: data.id, url: data.source_url };
  }

  /**
   * Get media by ID
   */
  async getMedia(id: number): Promise<WPMedia> {
    await this.ensureAuthenticated();

    const response = await this.httpClient.get<any>(
      `${this.config.baseUrl}/wp-json/wp/v2/media/${id}`,
      { headers: this.getAuthHeaders() }
    );

    return this.mapToWPMedia(response.data);
  }

  /**
   * List media items
   */
  async listMedia(params?: {
    page?: number;
    perPage?: number;
    mediaType?: string;
    mimeType?: string;
  }): Promise<{ items: WPMedia[]; total: number }> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.perPage) queryParams.set('per_page', params.perPage.toString());
    if (params?.mediaType) queryParams.set('media_type', params.mediaType);
    if (params?.mimeType) queryParams.set('mime_type', params.mimeType);

    const url = `${this.config.baseUrl}/wp-json/wp/v2/media?${queryParams.toString()}`;
    const response = await this.httpClient.get<any[]>(url, { headers: this.getAuthHeaders() });

    const items = response.data.map(item => this.mapToWPMedia(item));
    const total = parseInt(response.headers['x-wp-total'] || '0', 10);

    return { items, total };
  }

  /**
   * Delete media
   */
  async deleteMedia(id: number, force: boolean = true): Promise<void> {
    await this.ensureAuthenticated();

    await this.httpClient.delete(
      `${this.config.baseUrl}/wp-json/wp/v2/media/${id}?force=${force}`,
      { headers: this.getAuthHeaders() }
    );

    this.emit('mediaDeleted', { id });
  }

  // ==================== User Operations ====================

  /**
   * Get user by ID
   */
  async getUser(id: number): Promise<WPUser> {
    await this.ensureAuthenticated();

    const response = await this.httpClient.get<any>(
      `${this.config.baseUrl}/wp-json/wp/v2/users/${id}`,
      { headers: this.getAuthHeaders() }
    );

    return this.mapToWPUser(response.data);
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<WPUser> {
    await this.ensureAuthenticated();

    const response = await this.httpClient.get<any>(
      `${this.config.baseUrl}/wp-json/wp/v2/users/me`,
      { headers: this.getAuthHeaders() }
    );

    return this.mapToWPUser(response.data);
  }

  /**
   * Create new user
   */
  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    roles?: string[];
  }): Promise<WPUser> {
    await this.ensureAuthenticated();

    const response = await this.httpClient.post<any>(
      `${this.config.baseUrl}/wp-json/wp/v2/users`,
      {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        first_name: userData.firstName,
        last_name: userData.lastName,
        roles: userData.roles || ['subscriber']
      },
      { headers: this.getAuthHeaders() }
    );

    this.emit('userCreated', { id: response.data.id, username: userData.username });
    return this.mapToWPUser(response.data);
  }

  /**
   * List users
   */
  async listUsers(params?: {
    page?: number;
    perPage?: number;
    roles?: string[];
    search?: string;
  }): Promise<{ items: WPUser[]; total: number }> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.perPage) queryParams.set('per_page', params.perPage.toString());
    if (params?.roles?.length) queryParams.set('roles', params.roles.join(','));
    if (params?.search) queryParams.set('search', params.search);

    const url = `${this.config.baseUrl}/wp-json/wp/v2/users?${queryParams.toString()}`;
    const response = await this.httpClient.get<any[]>(url, { headers: this.getAuthHeaders() });

    const items = response.data.map(item => this.mapToWPUser(item));
    const total = parseInt(response.headers['x-wp-total'] || '0', 10);

    return { items, total };
  }

  // ==================== Webhook Operations ====================

  /**
   * Register a webhook for specific events
   * Note: Requires a webhook plugin like WP Webhooks
   */
  async registerWebhook(events: string[], callbackUrl: string): Promise<string> {
    await this.ensureAuthenticated();

    const webhookId = crypto.randomUUID();
    const secret = crypto.randomBytes(32).toString('hex');

    // This assumes WP Webhooks plugin or similar
    const response = await this.httpClient.post<{ id: string }>(
      `${this.config.baseUrl}/wp-json/wp-webhooks/v1/webhooks`,
      {
        id: webhookId,
        name: `agentic-flow-${webhookId}`,
        trigger: events,
        url: callbackUrl,
        secret,
        status: 'active'
      },
      { headers: this.getAuthHeaders() }
    );

    this.emit('webhookRegistered', { id: webhookId, events, callbackUrl });
    return response.data.id || webhookId;
  }

  /**
   * Unregister a webhook
   */
  async unregisterWebhook(hookId: string): Promise<void> {
    await this.ensureAuthenticated();

    await this.httpClient.delete(
      `${this.config.baseUrl}/wp-json/wp-webhooks/v1/webhooks/${hookId}`,
      { headers: this.getAuthHeaders() }
    );

    this.emit('webhookUnregistered', { id: hookId });
  }

  // ==================== Category and Tag Operations ====================

  /**
   * Get categories
   */
  async getCategories(params?: { page?: number; perPage?: number }): Promise<Array<{ id: number; name: string; slug: string; parent: number }>> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.perPage) queryParams.set('per_page', params.perPage.toString());

    const response = await this.httpClient.get<any[]>(
      `${this.config.baseUrl}/wp-json/wp/v2/categories?${queryParams.toString()}`,
      { headers: this.getAuthHeaders() }
    );

    return response.data.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parent: cat.parent
    }));
  }

  /**
   * Get tags
   */
  async getTags(params?: { page?: number; perPage?: number; search?: string }): Promise<Array<{ id: number; name: string; slug: string }>> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.perPage) queryParams.set('per_page', params.perPage.toString());
    if (params?.search) queryParams.set('search', params.search);

    const response = await this.httpClient.get<any[]>(
      `${this.config.baseUrl}/wp-json/wp/v2/tags?${queryParams.toString()}`,
      { headers: this.getAuthHeaders() }
    );

    return response.data.map(tag => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug
    }));
  }

  // ==================== Helper Methods ====================

  private getContentEndpoint(type: string): string {
    const endpoints: Record<string, string> = {
      post: 'posts',
      page: 'pages',
      custom: type // For custom post types, use the type name directly
    };
    return endpoints[type] || type;
  }

  private mapToWPContent(data: any, type: string): WPContent {
    return {
      id: data.id,
      type: type as WPContent['type'],
      title: data.title?.rendered || data.title || '',
      content: data.content?.rendered || data.content || '',
      excerpt: data.excerpt?.rendered || data.excerpt || '',
      status: data.status,
      author: data.author,
      categories: data.categories || [],
      tags: data.tags || [],
      meta: data.meta || {},
      featuredMedia: data.featured_media,
      createdAt: new Date(data.date),
      modifiedAt: new Date(data.modified),
      slug: data.slug,
      link: data.link,
      format: data.format,
      template: data.template
    };
  }

  private mapFromWPContent(content: Partial<WPContent>): any {
    const payload: any = {};
    
    if (content.title !== undefined) payload.title = content.title;
    if (content.content !== undefined) payload.content = content.content;
    if (content.excerpt !== undefined) payload.excerpt = content.excerpt;
    if (content.status !== undefined) payload.status = content.status;
    if (content.author !== undefined) payload.author = content.author;
    if (content.categories !== undefined) payload.categories = content.categories;
    if (content.tags !== undefined) payload.tags = content.tags;
    if (content.meta !== undefined) payload.meta = content.meta;
    if (content.featuredMedia !== undefined) payload.featured_media = content.featuredMedia;
    if (content.slug !== undefined) payload.slug = content.slug;
    if (content.template !== undefined) payload.template = content.template;

    return payload;
  }

  private mapToWPMedia(data: any): WPMedia {
    return {
      id: data.id,
      url: data.source_url,
      alt: data.alt_text || '',
      title: data.title?.rendered || data.title || '',
      caption: data.caption?.rendered,
      description: data.description?.rendered,
      mimeType: data.mime_type,
      mediaType: data.media_type,
      width: data.media_details?.width,
      height: data.media_details?.height,
      sizes: data.media_details?.sizes
    };
  }

  private mapToWPUser(data: any): WPUser {
    return {
      id: data.id,
      username: data.username || data.slug,
      name: data.name,
      email: data.email,
      roles: data.roles || [],
      capabilities: data.capabilities || {},
      registeredDate: new Date(data.registered_date),
      avatarUrls: data.avatar_urls,
      meta: data.meta
    };
  }

  // ==================== Utility Methods ====================

  /**
   * Check if the WordPress site is reachable
   */
  async healthCheck(): Promise<{ healthy: boolean; version?: string; error?: string }> {
    try {
      const response = await this.httpClient.get<any>(`${this.config.baseUrl}/wp-json`);
      return {
        healthy: true,
        version: response.data.namespace
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get WordPress site information
   */
  async getSiteInfo(): Promise<{
    name: string;
    description: string;
    url: string;
    timezone: string;
    namespaces: string[];
  }> {
    const response = await this.httpClient.get<any>(`${this.config.baseUrl}/wp-json`);
    return {
      name: response.data.name,
      description: response.data.description,
      url: response.data.url,
      timezone: response.data.timezone_string,
      namespaces: response.data.namespaces
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): WordPressConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WordPressConfig>): void {
    this.config = { ...this.config, ...config };
    // Reset auth if credentials changed
    if (config.auth) {
      this.authToken = null;
      this.tokenExpiry = null;
    }
  }
}

/**
 * Factory function to create a WordPress client
 */
export function createWordPressClient(config: WordPressConfig): WordPressClient {
  return new WordPressClient(config);
}
