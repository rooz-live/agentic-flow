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

import {
  FlarumConfig,
  FlarumDiscussion,
  FlarumPost,
  FlarumUser,
  FlarumTag,
  FlarumResponse,
  DEFAULT_FLARUM_CONFIG
} from './types.js';

/**
 * Flarum REST API Client
 * 
 * Implements comprehensive Flarum integration using JSON:API spec including:
 * - Discussion management
 * - Post/comment management
 * - User management and linking
 * - Tag management
 */
export class FlarumClient extends EventEmitter {
  private config: FlarumConfig;
  private baseApiUrl: string;

  constructor(config: FlarumConfig) {
    super();
    this.config = { ...DEFAULT_FLARUM_CONFIG, ...config } as FlarumConfig;
    this.baseApiUrl = `${this.config.baseUrl}/api`;
  }

  // ==================== Private Helpers ====================

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Token ${this.config.apiKey}`
    };
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any,
    retryCount: number = 0
  ): Promise<T> {
    const url = `${this.baseApiUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout || 30000
    );

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Flarum API Error ${response.status}: ${JSON.stringify(errorData)}`
        );
      }

      // Handle no content responses
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json() as T;
    } catch (error) {
      // Retry logic
      const maxRetries = this.config.retry?.maxAttempts || 3;
      if (retryCount < maxRetries && error instanceof Error && !error.message.includes('abort')) {
        const backoff = (this.config.retry?.backoffMs || 1000) * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this.request<T>(method, endpoint, body, retryCount + 1);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ==================== Discussion Operations ====================

  /**
   * Get a single discussion by ID
   */
  async getDiscussion(id: string): Promise<FlarumDiscussion> {
    const response = await this.request<{ data: FlarumDiscussion; included?: any[] }>(
      'GET',
      `/discussions/${id}`
    );
    return response.data;
  }

  /**
   * List discussions with pagination and filtering
   */
  async listDiscussions(params?: {
    page?: { offset: number; limit: number };
    filter?: Record<string, string>;
    sort?: string;
    include?: string[];
  }): Promise<FlarumResponse<FlarumDiscussion>> {
    const queryParams = new URLSearchParams();

    if (params?.page) {
      queryParams.set('page[offset]', params.page.offset.toString());
      queryParams.set('page[limit]', params.page.limit.toString());
    }

    if (params?.filter) {
      for (const [key, value] of Object.entries(params.filter)) {
        queryParams.set(`filter[${key}]`, value);
      }
    }

    if (params?.sort) {
      queryParams.set('sort', params.sort);
    }

    if (params?.include?.length) {
      queryParams.set('include', params.include.join(','));
    }

    const queryString = queryParams.toString();
    const endpoint = `/discussions${queryString ? `?${queryString}` : ''}`;

    return this.request<FlarumResponse<FlarumDiscussion>>('GET', endpoint);
  }

  /**
   * Create a new discussion
   */
  async createDiscussion(data: {
    title: string;
    content: string;
    tags?: string[];
  }): Promise<FlarumDiscussion> {
    const payload = {
      data: {
        type: 'discussions',
        attributes: {
          title: data.title,
          content: data.content
        },
        relationships: data.tags?.length ? {
          tags: {
            data: data.tags.map(id => ({ type: 'tags', id }))
          }
        } : undefined
      }
    };

    const response = await this.request<{ data: FlarumDiscussion }>(
      'POST',
      '/discussions',
      payload
    );

    this.emit('discussionCreated', { id: response.data.id, title: data.title });
    return response.data;
  }

  /**
   * Update an existing discussion
   */
  async updateDiscussion(
    id: string,
    data: Partial<{
      title: string;
      isLocked: boolean;
      isSticky: boolean;
      isHidden: boolean;
      tags: string[];
    }>
  ): Promise<FlarumDiscussion> {
    const payload: any = {
      data: {
        type: 'discussions',
        id,
        attributes: {}
      }
    };

    if (data.title !== undefined) payload.data.attributes.title = data.title;
    if (data.isLocked !== undefined) payload.data.attributes.isLocked = data.isLocked;
    if (data.isSticky !== undefined) payload.data.attributes.isSticky = data.isSticky;
    if (data.isHidden !== undefined) payload.data.attributes.isHidden = data.isHidden;

    if (data.tags?.length) {
      payload.data.relationships = {
        tags: {
          data: data.tags.map(tagId => ({ type: 'tags', id: tagId }))
        }
      };
    }

    const response = await this.request<{ data: FlarumDiscussion }>(
      'PATCH',
      `/discussions/${id}`,
      payload
    );

    this.emit('discussionUpdated', { id });
    return response.data;
  }

  /**
   * Delete a discussion
   */
  async deleteDiscussion(id: string): Promise<void> {
    await this.request<void>('DELETE', `/discussions/${id}`);
    this.emit('discussionDeleted', { id });
  }

  /**
   * Search discussions
   */
  async searchDiscussions(query: string, params?: {
    page?: { offset: number; limit: number };
  }): Promise<FlarumResponse<FlarumDiscussion>> {
    return this.listDiscussions({
      filter: { q: query },
      page: params?.page
    });
  }

  // ==================== Post Operations ====================

  /**
   * Get posts for a discussion
   */
  async getPosts(discussionId: string, params?: {
    page?: { offset: number; limit: number };
  }): Promise<FlarumResponse<FlarumPost>> {
    const queryParams = new URLSearchParams();
    queryParams.set('filter[discussion]', discussionId);

    if (params?.page) {
      queryParams.set('page[offset]', params.page.offset.toString());
      queryParams.set('page[limit]', params.page.limit.toString());
    }

    return this.request<FlarumResponse<FlarumPost>>(
      'GET',
      `/posts?${queryParams.toString()}`
    );
  }

  /**
   * Get a single post by ID
   */
  async getPost(id: string): Promise<FlarumPost> {
    const response = await this.request<{ data: FlarumPost }>(
      'GET',
      `/posts/${id}`
    );
    return response.data;
  }

  /**
   * Create a new post (reply) in a discussion
   */
  async createPost(discussionId: string, content: string): Promise<FlarumPost> {
    const payload = {
      data: {
        type: 'posts',
        attributes: {
          content
        },
        relationships: {
          discussion: {
            data: { type: 'discussions', id: discussionId }
          }
        }
      }
    };

    const response = await this.request<{ data: FlarumPost }>(
      'POST',
      '/posts',
      payload
    );

    this.emit('postCreated', { id: response.data.id, discussionId });
    return response.data;
  }

  /**
   * Update an existing post
   */
  async updatePost(id: string, content: string): Promise<FlarumPost> {
    const payload = {
      data: {
        type: 'posts',
        id,
        attributes: {
          content
        }
      }
    };

    const response = await this.request<{ data: FlarumPost }>(
      'PATCH',
      `/posts/${id}`,
      payload
    );

    this.emit('postUpdated', { id });
    return response.data;
  }

  /**
   * Delete a post
   */
  async deletePost(id: string): Promise<void> {
    await this.request<void>('DELETE', `/posts/${id}`);
    this.emit('postDeleted', { id });
  }

  /**
   * Hide a post (soft delete)
   */
  async hidePost(id: string): Promise<FlarumPost> {
    const payload = {
      data: {
        type: 'posts',
        id,
        attributes: {
          isHidden: true
        }
      }
    };

    const response = await this.request<{ data: FlarumPost }>(
      'PATCH',
      `/posts/${id}`,
      payload
    );

    this.emit('postHidden', { id });
    return response.data;
  }

  // ==================== User Operations ====================

  /**
   * Get a user by ID
   */
  async getUser(id: string): Promise<FlarumUser> {
    const response = await this.request<{ data: FlarumUser }>(
      'GET',
      `/users/${id}`
    );
    return response.data;
  }

  /**
   * Get a user by username
   */
  async getUserByUsername(username: string): Promise<FlarumUser | null> {
    const response = await this.request<FlarumResponse<FlarumUser>>(
      'GET',
      `/users?filter[username]=${encodeURIComponent(username)}`
    );
    return response.data[0] || null;
  }

  /**
   * List users with pagination
   */
  async listUsers(params?: {
    page?: { offset: number; limit: number };
    filter?: Record<string, string>;
  }): Promise<FlarumResponse<FlarumUser>> {
    const queryParams = new URLSearchParams();

    if (params?.page) {
      queryParams.set('page[offset]', params.page.offset.toString());
      queryParams.set('page[limit]', params.page.limit.toString());
    }

    if (params?.filter) {
      for (const [key, value] of Object.entries(params.filter)) {
        queryParams.set(`filter[${key}]`, value);
      }
    }

    const queryString = queryParams.toString();
    return this.request<FlarumResponse<FlarumUser>>(
      'GET',
      `/users${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Link a Flarum user to an external identity
   * This requires a custom Flarum extension for external identity linking
   */
  async linkUser(flarumUserId: string, externalId: string): Promise<void> {
    // This endpoint depends on a custom Flarum extension
    // The actual implementation would vary based on the extension used
    const payload = {
      data: {
        type: 'users',
        id: flarumUserId,
        attributes: {
          externalId
        }
      }
    };

    try {
      await this.request<void>(
        'PATCH',
        `/users/${flarumUserId}`,
        payload
      );
      this.emit('userLinked', { flarumUserId, externalId });
    } catch (error) {
      // If the standard endpoint doesn't support this, try a custom endpoint
      await this.request<void>(
        'POST',
        `/users/${flarumUserId}/link-external`,
        { externalId }
      );
      this.emit('userLinked', { flarumUserId, externalId });
    }
  }

  /**
   * Unlink a Flarum user from an external identity
   */
  async unlinkUser(flarumUserId: string): Promise<void> {
    await this.request<void>(
      'POST',
      `/users/${flarumUserId}/unlink-external`,
      {}
    );
    this.emit('userUnlinked', { flarumUserId });
  }

  /**
   * Update user profile
   */
  async updateUser(
    id: string,
    data: Partial<{
      username: string;
      email: string;
      bio: string;
    }>
  ): Promise<FlarumUser> {
    const payload = {
      data: {
        type: 'users',
        id,
        attributes: data
      }
    };

    const response = await this.request<{ data: FlarumUser }>(
      'PATCH',
      `/users/${id}`,
      payload
    );

    this.emit('userUpdated', { id });
    return response.data;
  }

  // ==================== Tag Operations ====================

  /**
   * Get all tags
   */
  async getTags(): Promise<FlarumTag[]> {
    const response = await this.request<FlarumResponse<FlarumTag>>(
      'GET',
      '/tags'
    );
    return response.data;
  }

  /**
   * Get a single tag by ID
   */
  async getTag(id: string): Promise<FlarumTag> {
    const response = await this.request<{ data: FlarumTag }>(
      'GET',
      `/tags/${id}`
    );
    return response.data;
  }

  /**
   * Create a new tag (requires admin privileges)
   */
  async createTag(data: {
    name: string;
    slug: string;
    description?: string;
    color?: string;
    icon?: string;
    isHidden?: boolean;
    parentId?: string;
  }): Promise<FlarumTag> {
    const payload: any = {
      data: {
        type: 'tags',
        attributes: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          color: data.color,
          icon: data.icon,
          isHidden: data.isHidden || false
        }
      }
    };

    if (data.parentId) {
      payload.data.relationships = {
        parent: {
          data: { type: 'tags', id: data.parentId }
        }
      };
    }

    const response = await this.request<{ data: FlarumTag }>(
      'POST',
      '/tags',
      payload
    );

    this.emit('tagCreated', { id: response.data.id, name: data.name });
    return response.data;
  }

  /**
   * Update an existing tag
   */
  async updateTag(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      color: string;
      icon: string;
      isHidden: boolean;
    }>
  ): Promise<FlarumTag> {
    const payload = {
      data: {
        type: 'tags',
        id,
        attributes: data
      }
    };

    const response = await this.request<{ data: FlarumTag }>(
      'PATCH',
      `/tags/${id}`,
      payload
    );

    this.emit('tagUpdated', { id });
    return response.data;
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: string): Promise<void> {
    await this.request<void>('DELETE', `/tags/${id}`);
    this.emit('tagDeleted', { id });
  }

  // ==================== Group Operations ====================

  /**
   * Get all groups
   */
  async getGroups(): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(
      'GET',
      '/groups'
    );
    return response.data;
  }

  /**
   * Add user to group
   */
  async addUserToGroup(userId: string, groupId: string): Promise<void> {
    const user = await this.getUser(userId);
    const currentGroups = user.relationships?.groups?.data || [];
    const newGroups = [...currentGroups, { type: 'groups', id: groupId }];

    await this.request<void>(
      'PATCH',
      `/users/${userId}`,
      {
        data: {
          type: 'users',
          id: userId,
          relationships: {
            groups: {
              data: newGroups
            }
          }
        }
      }
    );

    this.emit('userAddedToGroup', { userId, groupId });
  }

  /**
   * Remove user from group
   */
  async removeUserFromGroup(userId: string, groupId: string): Promise<void> {
    const user = await this.getUser(userId);
    const currentGroups = user.relationships?.groups?.data || [];
    const newGroups = currentGroups.filter(g => g.id !== groupId);

    await this.request<void>(
      'PATCH',
      `/users/${userId}`,
      {
        data: {
          type: 'users',
          id: userId,
          relationships: {
            groups: {
              data: newGroups
            }
          }
        }
      }
    );

    this.emit('userRemovedFromGroup', { userId, groupId });
  }

  // ==================== Notification Operations ====================

  /**
   * Get notifications for the authenticated user
   */
  async getNotifications(params?: {
    page?: { offset: number; limit: number };
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();

    if (params?.page) {
      queryParams.set('page[offset]', params.page.offset.toString());
      queryParams.set('page[limit]', params.page.limit.toString());
    }

    const queryString = queryParams.toString();
    const response = await this.request<{ data: any[] }>(
      'GET',
      `/notifications${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(): Promise<void> {
    await this.request<void>('POST', '/notifications/read');
    this.emit('notificationsMarkedRead');
  }

  // ==================== Utility Methods ====================

  /**
   * Health check for the Flarum API
   */
  async healthCheck(): Promise<{ healthy: boolean; version?: string; error?: string }> {
    try {
      const response = await this.request<any>('GET', '');
      return {
        healthy: true,
        version: response.data?.attributes?.version
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get forum information
   */
  async getForumInfo(): Promise<{
    title: string;
    description: string;
    baseUrl: string;
    welcomeMessage?: string;
    allowSignUp: boolean;
  }> {
    const response = await this.request<any>('GET', '');
    const attrs = response.data?.attributes || {};
    return {
      title: attrs.title || '',
      description: attrs.description || '',
      baseUrl: attrs.baseUrl || this.config.baseUrl,
      welcomeMessage: attrs.welcomeMessage,
      allowSignUp: attrs.allowSignUp ?? true
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): FlarumConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FlarumConfig>): void {
    this.config = { ...this.config, ...config };
    this.baseApiUrl = `${this.config.baseUrl}/api`;
  }

  /**
   * Get API statistics
   */
  async getStats(): Promise<{
    totalDiscussions: number;
    totalPosts: number;
    totalUsers: number;
  }> {
    // This requires aggregating data from multiple endpoints
    const [discussions, users] = await Promise.all([
      this.listDiscussions({ page: { offset: 0, limit: 1 } }),
      this.listUsers({ page: { offset: 0, limit: 1 } })
    ]);

    return {
      totalDiscussions: discussions.meta?.total || 0,
      totalPosts: 0, // Would need a separate count endpoint
      totalUsers: users.meta?.total || 0
    };
  }
}

/**
 * Factory function to create a Flarum client
 */
export function createFlarumClient(config: FlarumConfig): FlarumClient {
  return new FlarumClient(config);
}
