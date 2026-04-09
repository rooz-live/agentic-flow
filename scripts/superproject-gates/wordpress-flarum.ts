/**
 * WordPress/Flarum Integration
 * 
 * Provides integration layer for connecting affiliate platform with WordPress
 * content management and Flarum forum systems
 */

import { EventEmitter } from 'events';
import {
  Affiliate,
  Referral,
  Customer,
  Commission,
  AffiliateError,
  AffiliateEvent
} from '../types';
import { OrchestrationFramework } from '../../core/orchestration-framework';
import { WSJFScoringService } from '../../wsjf/scoring-service';

export interface WordPressConfig {
  siteUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface FlarumConfig {
  siteUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface ContentSyncConfig {
  autoSync: boolean;
  syncInterval: number; // minutes
  enableBiDirectional: boolean;
  contentTypes: string[];
  syncAffiliateContent: boolean;
  syncForumPosts: boolean;
}

export interface WordPressPost {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  status: 'publish' | 'draft' | 'private';
  author: number;
  categories: number[];
  tags: string[];
  featured_media: number;
  date: string;
  modified: string;
  slug: string;
  meta: Record<string, any>;
}

export interface FlarumPost {
  id: string;
  title: string;
  content: string;
  type: 'discussion' | 'article' | 'announcement';
  userId: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  slug: string;
  isSticky: boolean;
  isLocked: boolean;
}

export interface ContentSyncResult {
  success: boolean;
  syncedPosts: number;
  failedPosts: number;
  errors: AffiliateError[];
  lastSyncAt: Date;
  syncType: 'wordpress_to_flarum' | 'flarum_to_wordpress' | 'bidirectional';
}

export class WordPressFlarumIntegration extends EventEmitter {
  private wordpressConfig: WordPressConfig;
  private flarumConfig: FlarumConfig;
  private syncConfig: ContentSyncConfig;
  private isSyncing: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private contentCache: Map<string, any> = new Map();

  constructor(
    private orchestration: OrchestrationFramework,
    private wsjfService: WSJFScoringService,
    wordpressConfig: WordPressConfig,
    flarumConfig: FlarumConfig,
    syncConfig: Partial<ContentSyncConfig> = {}
  ) {
    super();
    this.wordpressConfig = wordpressConfig;
    this.flarumConfig = flarumConfig;
    this.syncConfig = {
      autoSync: true,
      syncInterval: 60, // 1 hour
      enableBiDirectional: true,
      contentTypes: ['post', 'page', 'affiliate_review'],
      syncAffiliateContent: true,
      syncForumPosts: true,
      ...syncConfig
    };
    this.setupOrchestrationIntegration();
    this.startSyncTimer();
  }

  /**
   * Setup integration with orchestration framework
   */
  private setupOrchestrationIntegration(): void {
    // Create purpose for content integration
    const contentPurpose = this.orchestration.createPurpose({
      name: 'Content Platform Integration',
      description: 'Seamlessly integrate affiliate content across WordPress and Flarum platforms',
      objectives: [
        'Synchronize content between platforms',
        'Maintain content consistency',
        'Optimize SEO and engagement',
        'Enable cross-platform analytics'
      ],
      keyResults: [
        '99.9% content sync accuracy',
        'Sub-5 minute sync latency',
        'Zero content duplication',
        'Improved engagement metrics'
      ]
    });

    // Create domain for content operations
    const contentDomain = this.orchestration.createDomain({
      name: 'Content Management',
      purpose: 'Manage all content synchronization and platform integration operations',
      boundaries: [
        'WordPress content management',
        'Flarum forum integration',
        'Content synchronization',
        'Cross-platform analytics'
      ],
      accountabilities: [
        'Content synchronization accuracy',
        'Platform integration stability',
        'Content quality and consistency',
        'Performance optimization'
      ]
    });

    console.log('[WP-FLARUM] Integrated with orchestration framework');
  }

  /**
   * Start automatic sync timer
   */
  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    if (this.syncConfig.autoSync && this.syncConfig.syncInterval > 0) {
      this.syncTimer = setInterval(() => {
        this.performSync();
      }, this.syncConfig.syncInterval * 60 * 1000); // Convert minutes to milliseconds
    }
  }

  /**
   * Perform content synchronization
   */
  public async performSync(
    syncType: 'wordpress_to_flarum' | 'flarum_to_wordpress' | 'bidirectional' = 'bidirectional'
  ): Promise<ContentSyncResult> {
    if (this.isSyncing) {
      throw new Error('Content synchronization already in progress');
    }

    this.isSyncing = true;
    const result: ContentSyncResult = {
      success: true,
      syncedPosts: 0,
      failedPosts: 0,
      errors: [],
      lastSyncAt: new Date(),
      syncType
    };

    try {
      this.emitEvent('sync_started', { syncType, timestamp: result.lastSyncAt });

      if (syncType === 'wordpress_to_flarum' || syncType === 'bidirectional') {
        const wpResult = await this.syncWordPressToFlarum();
        result.syncedPosts += wpResult.syncedPosts;
        result.failedPosts += wpResult.failedPosts;
        result.errors.push(...wpResult.errors);
      }

      if (syncType === 'flarum_to_wordpress' || syncType === 'bidirectional') {
        const flarumResult = await this.syncFlarumToWordPress();
        result.syncedPosts += flarumResult.syncedPosts;
        result.failedPosts += flarumResult.failedPosts;
        result.errors.push(...flarumResult.errors);
      }

      this.emitEvent('sync_completed', result);
      
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(this.createError('SYNC_FAILED', error.message));
      
      this.emitEvent('sync_failed', { error: error.message, syncType });
      
      return result;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync WordPress content to Flarum
   */
  private async syncWordPressToFlarum(): Promise<{
    syncedPosts: number;
    failedPosts: number;
    errors: AffiliateError[];
  }> {
    const result = { syncedPosts: 0, failedPosts: 0, errors: [] as AffiliateError[] };

    try {
      // Fetch WordPress posts
      const wpPosts = await this.fetchWordPressPosts();
      
      for (const wpPost of wpPosts) {
        try {
          // Check if post should be synced
          if (!this.shouldSyncPost(wpPost)) {
            continue;
          }

          // Convert to Flarum format
          const flarumPost = this.convertWordPressToFlarum(wpPost);
          
          // Create or update in Flarum
          await this.createFlarumPost(flarumPost);
          
          result.syncedPosts++;
          
          // Emit event for affiliate tracking
          if (wpPost.meta.affiliate_id) {
            this.emitEvent('content_synced', {
              type: 'wordpress_to_flarum',
              postId: wpPost.id,
              affiliateId: wpPost.meta.affiliate_id,
              title: wpPost.title
            });
          }
          
        } catch (error) {
          result.failedPosts++;
          result.errors.push(this.createError('POST_SYNC_FAILED', 
            `Failed to sync WordPress post ${wpPost.id}: ${error.message}`));
        }
      }
    } catch (error) {
      result.errors.push(this.createError('WP_FETCH_FAILED', 
        `Failed to fetch WordPress posts: ${error.message}`));
    }

    return result;
  }

  /**
   * Sync Flarum content to WordPress
   */
  private async syncFlarumToWordPress(): Promise<{
    syncedPosts: number;
    failedPosts: number;
    errors: AffiliateError[];
  }> {
    const result = { syncedPosts: 0, failedPosts: 0, errors: [] as AffiliateError[] };

    try {
      // Fetch Flarum posts
      const flarumPosts = await this.fetchFlarumPosts();
      
      for (const flarumPost of flarumPosts) {
        try {
          // Check if post should be synced
          if (!this.shouldSyncFlarumPost(flarumPost)) {
            continue;
          }

          // Convert to WordPress format
          const wpPost = this.convertFlarumToWordPress(flarumPost);
          
          // Create or update in WordPress
          await this.createWordPressPost(wpPost);
          
          result.syncedPosts++;
          
          // Emit event for affiliate tracking
          if (flarumPost.tags.includes('affiliate')) {
            this.emitEvent('content_synced', {
              type: 'flarum_to_wordpress',
              postId: flarumPost.id,
              title: flarumPost.title
            });
          }
          
        } catch (error) {
          result.failedPosts++;
          result.errors.push(this.createError('POST_SYNC_FAILED', 
            `Failed to sync Flarum post ${flarumPost.id}: ${error.message}`));
        }
      }
    } catch (error) {
      result.errors.push(this.createError('FLARUM_FETCH_FAILED', 
        `Failed to fetch Flarum posts: ${error.message}`));
    }

    return result;
  }

  /**
   * Fetch posts from WordPress
   */
  private async fetchWordPressPosts(): Promise<WordPressPost[]> {
    const url = `${this.wordpressConfig.siteUrl}/wp-json/wp/v2/posts`;
    const headers = this.buildWordPressHeaders();

    const response = await this.makeRequest('GET', url, headers);
    return response.data || [];
  }

  /**
   * Fetch posts from Flarum
   */
  private async fetchFlarumPosts(): Promise<FlarumPost[]> {
    const url = `${this.flarumConfig.siteUrl}/api/discussions`;
    const headers = this.buildFlarumHeaders();

    const response = await this.makeRequest('GET', url, headers);
    return response.data || [];
  }

  /**
   * Create post in Flarum
   */
  private async createFlarumPost(post: FlarumPost): Promise<any> {
    const url = `${this.flarumConfig.siteUrl}/api/discussions`;
    const headers = this.buildFlarumHeaders();

    const response = await this.makeRequest('POST', url, headers, post);
    return response.data;
  }

  /**
   * Create post in WordPress
   */
  private async createWordPressPost(post: Partial<WordPressPost>): Promise<any> {
    const url = `${this.wordpressConfig.siteUrl}/wp-json/wp/v2/posts`;
    const headers = this.buildWordPressHeaders();

    const response = await this.makeRequest('POST', url, headers, post);
    return response.data;
  }

  /**
   * Convert WordPress post to Flarum format
   */
  private convertWordPressToFlarum(wpPost: WordPressPost): FlarumPost {
    return {
      id: `wp_${wpPost.id}`,
      title: wpPost.title,
      content: wpPost.content,
      type: wpPost.categories.includes('affiliate') ? 'discussion' : 'article',
      userId: wpPost.author,
      tags: [...wpPost.tags, 'wordpress_sync'],
      createdAt: wpPost.date,
      updatedAt: wpPost.modified,
      slug: wpPost.slug,
      isSticky: wpPost.meta.sticky || false,
      isLocked: wpPost.status === 'private'
    };
  }

  /**
   * Convert Flarum post to WordPress format
   */
  private convertFlarumToWordPress(flarumPost: FlarumPost): Partial<WordPressPost> {
    return {
      title: flarumPost.title,
      content: flarumPost.content,
      excerpt: flarumPost.content.substring(0, 150) + '...',
      status: flarumPost.isLocked ? 'private' : 'publish',
      tags: flarumPost.tags.filter(tag => tag !== 'flarum_sync'),
      slug: flarumPost.slug,
      meta: {
        flarum_id: flarumPost.id,
        flarum_type: flarumPost.type,
        original_created: flarumPost.createdAt
      }
    };
  }

  /**
   * Check if WordPress post should be synced
   */
  private shouldSyncPost(post: WordPressPost): boolean {
    // Check content type
    if (!this.syncConfig.contentTypes.includes('post')) {
      return false;
    }

    // Check status
    if (post.status !== 'publish') {
      return false;
    }

    // Check if already synced
    if (post.meta.flarum_synced) {
      return false;
    }

    // Check affiliate content sync setting
    if (!this.syncConfig.syncAffiliateContent && post.categories.includes('affiliate')) {
      return false;
    }

    return true;
  }

  /**
   * Check if Flarum post should be synced
   */
  private shouldSyncFlarumPost(post: FlarumPost): boolean {
    // Check if already synced
    if (post.tags.includes('wordpress_sync')) {
      return false;
    }

    // Check forum posts sync setting
    if (!this.syncConfig.syncForumPosts && post.type === 'discussion') {
      return false;
    }

    return true;
  }

  /**
   * Build WordPress API headers
   */
  private buildWordPressHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.wordpressConfig.apiKey) {
      headers['Authorization'] = `Bearer ${this.wordpressConfig.apiKey}`;
    } else if (this.wordpressConfig.username && this.wordpressConfig.password) {
      const auth = Buffer.from(`${this.wordpressConfig.username}:${this.wordpressConfig.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    return headers;
  }

  /**
   * Build Flarum API headers
   */
  private buildFlarumHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.flarumConfig.apiKey) {
      headers['Authorization'] = `Token ${this.flarumConfig.apiKey}`;
    } else if (this.flarumConfig.username && this.flarumConfig.password) {
      const auth = Buffer.from(`${this.flarumConfig.username}:${this.flarumConfig.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    return headers;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    data?: any
  ): Promise<any> {
    const config = this.wordpressConfig.siteUrl.includes(url) ? 
      this.wordpressConfig : this.flarumConfig;
    
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          signal: AbortSignal.timeout(config.timeout)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (attempt < config.retryAttempts) {
          await this.delay(config.retryDelay * attempt);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create affiliate-specific content in WordPress
   */
  public async createAffiliateContent(
    affiliate: Affiliate,
    content: {
      title: string;
      content: string;
      excerpt?: string;
      tags?: string[];
      category?: string;
    }
  ): Promise<WordPressPost> {
    try {
      const post: Partial<WordPressPost> = {
        title: content.title,
        content: content.content,
        excerpt: content.excerpt,
        status: 'publish',
        tags: [...(content.tags || []), 'affiliate', affiliate.affiliateCode],
        categories: content.category ? [await this.getOrCreateCategory(content.category)] : [1], // Default category
        meta: {
          affiliate_id: affiliate.id,
          affiliate_code: affiliate.affiliateCode,
          tenant_id: affiliate.tenantId,
          created_by: 'affiliate_platform'
        }
      };

      const response = await this.createWordPressPost(post);
      
      this.emitEvent('affiliate_content_created', {
        affiliateId: affiliate.id,
        postId: response.id,
        title: content.title,
        platform: 'wordpress'
      });

      console.log(`[WP-FLARUM] Created affiliate content in WordPress: ${response.id}`);
      return response;

    } catch (error) {
      const contentError: AffiliateError = {
        code: 'CONTENT_CREATION_FAILED',
        message: `Failed to create affiliate content: ${error.message}`,
        details: { affiliateId: affiliate.id, content },
        timestamp: new Date()
      };
      
      this.emitEvent('system_error', { error: contentError });
      throw error;
    }
  }

  /**
   * Create affiliate discussion in Flarum
   */
  public async createAffiliateDiscussion(
    affiliate: Affiliate,
    discussion: {
      title: string;
      content: string;
      tags?: string[];
      type?: 'discussion' | 'article' | 'announcement';
    }
  ): Promise<FlarumPost> {
    try {
      const post: FlarumPost = {
        id: this.generateId('discussion'),
        title: discussion.title,
        content: discussion.content,
        type: discussion.type || 'discussion',
        userId: 1, // System user
        tags: [...(discussion.tags || []), 'affiliate', affiliate.affiliateCode],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        slug: this.generateSlug(discussion.title),
        isSticky: discussion.type === 'announcement',
        isLocked: false
      };

      const response = await this.createFlarumPost(post);
      
      this.emitEvent('affiliate_discussion_created', {
        affiliateId: affiliate.id,
        discussionId: response.id,
        title: discussion.title,
        platform: 'flarum'
      });

      console.log(`[WP-FLARUM] Created affiliate discussion in Flarum: ${response.id}`);
      return response;

    } catch (error) {
      const discussionError: AffiliateError = {
        code: 'DISCUSSION_CREATION_FAILED',
        message: `Failed to create affiliate discussion: ${error.message}`,
        details: { affiliateId: affiliate.id, discussion },
        timestamp: new Date()
      };
      
      this.emitEvent('system_error', { error: discussionError });
      throw error;
    }
  }

  /**
   * Get or create category in WordPress
   */
  private async getOrCreateCategory(categoryName: string): Promise<number> {
    // This would implement category lookup/creation logic
    // For now, return default category ID
    return 1;
  }

  /**
   * Generate URL-friendly slug
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Generate unique ID
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * Create standardized error object
   */
  private createError(code: string, message: string): AffiliateError {
    return {
      code,
      message,
      timestamp: new Date()
    };
  }

  /**
   * Emit affiliate event
   */
  private emitEvent(type: AffiliateEvent['type'], data: Record<string, any>): void {
    const event: AffiliateEvent = {
      id: this.generateId('event'),
      type,
      timestamp: new Date(),
      data,
      metadata: {}
    };

    this.emit('affiliateEvent', event);
  }

  // Public utility methods
  public getSyncStatus(): {
    isSyncing: boolean;
    autoSync: boolean;
    syncInterval: number;
    lastSyncAt?: Date;
  } {
    return {
      isSyncing: this.isSyncing,
      autoSync: this.syncConfig.autoSync,
      syncInterval: this.syncConfig.syncInterval,
      lastSyncAt: undefined // This would be tracked in actual implementation
    };
  }

  public updateSyncConfig(updates: Partial<ContentSyncConfig>): void {
    this.syncConfig = { ...this.syncConfig, ...updates };
    
    if (updates.syncInterval !== undefined) {
      this.startSyncTimer();
    }
    
    this.emitEvent('sync_config_updated', { updates: Object.keys(updates) });
  }

  public getContentStats(): {
    wordpressPosts: number;
    flarumPosts: number;
    syncedPosts: number;
    lastSyncAt?: Date;
  } {
    return {
      wordpressPosts: this.contentCache.size,
      flarumPosts: this.contentCache.size,
      syncedPosts: 0, // This would be calculated from actual sync data
      lastSyncAt: undefined // This would be tracked in actual implementation
    };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.removeAllListeners();
    this.contentCache.clear();
    console.log('[WP-FLARUM] WordPress/Flarum integration disposed');
  }
}