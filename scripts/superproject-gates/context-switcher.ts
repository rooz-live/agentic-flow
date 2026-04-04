/**
 * Context Switcher - Multi-Tenant Navigation
 *
 * Handles domain-aware navigation context switching with session management.
 * Maintains tenant-specific navigation state across domains.
 *
 * Principles:
 * - Manthra: Directed thought-power applied to context transition logic
 * - Yasna: Disciplined alignment through consistent context interfaces
 * - Mithra: Binding force preventing context state drift
 *
 * @module multi-tenant-navigation/context-switcher
 */

import {
  NavigationContext,
  ContextSwitchEvent,
  ContextSwitchConfig,
  ContextPersistence,
  ContextSwitchAnalytics,
  DEFAULT_CONTEXT_SWITCH_CONFIG,
  TenantPlatform
} from './types.js';

/**
 * ContextSwitcher manages domain-aware navigation context switching
 */
export class ContextSwitcher {
  private config: ContextSwitchConfig;
  private currentContext: NavigationContext | null;
  private contextHistory: NavigationContext[];
  private persistence: ContextPersistence;
  private analytics: Map<string, ContextSwitchAnalytics>;
  private eventListeners: Map<string, ((event: ContextSwitchEvent) => void)[]>;

  constructor(config?: Partial<ContextSwitchConfig>) {
    this.config = { ...DEFAULT_CONTEXT_SWITCH_CONFIG, ...config };
    this.currentContext = null;
    this.contextHistory = [];
    this.analytics = new Map();
    this.eventListeners = new Map();
    this.persistence = {
      enabled: this.config.persistenceEnabled,
      storageKey: this.config.storageKey,
      maxHistorySize: this.config.maxHistorySize
    };

    // Load persisted context if enabled
    if (this.persistence.enabled) {
      this.loadPersistedContext();
    }
  }

  /**
   * Switch to a new navigation context
   * @param newContext - New context to switch to
   * @returns Switch event
   */
  async switchContext(newContext: NavigationContext): Promise<ContextSwitchEvent> {
    const previousContext = this.currentContext;
    const timestamp = new Date();

    // Validate new context
    if (!newContext.platform || !newContext.domain) {
      throw new Error('Context must include platform and domain');
    }

    // Store previous context in history
    if (previousContext) {
      this.addToHistory(previousContext);
    }

    // Update current context
    this.currentContext = newContext;

    // Create switch event
    const event: ContextSwitchEvent = {
      type: 'context-switched',
      timestamp,
      previousContext,
      currentContext: newContext,
      platform: newContext.platform,
      domain: newContext.domain,
      userId: newContext.userId
    };

    // Record analytics
    this.recordSwitchAnalytics(event);

    // Persist context if enabled
    if (this.persistence.enabled) {
      this.persistContext(newContext);
    }

    // Emit event to listeners
    this.emitEvent(event);

    return event;
  }

  /**
   * Get current navigation context
   * @returns Current context or null
   */
  getCurrentContext(): NavigationContext | null {
    return this.currentContext;
  }

  /**
   * Get context history
   * @param limit - Maximum number of history items to return
   * @returns Context history array
   */
  getContextHistory(limit?: number): NavigationContext[] {
    const actualLimit = limit ?? this.contextHistory.length;
    return this.contextHistory.slice(-actualLimit);
  }

  /**
   * Restore a previous context from history
   * @param index - Index in history (0 = most recent)
   * @returns Switch event
   */
  async restoreContext(index: number): Promise<ContextSwitchEvent> {
    const context = this.contextHistory[index];
    if (!context) {
      throw new Error(`Context at index ${index} not found`);
    }

    // Remove from history
    this.contextHistory.splice(index, 1);

    // Switch to restored context
    return this.switchContext(context);
  }

  /**
   * Update current context with partial changes
   * @param updates - Partial context updates
   * @returns Updated context
   */
  updateCurrentContext(updates: Partial<NavigationContext>): NavigationContext {
    if (!this.currentContext) {
      throw new Error('No current context to update');
    }

    this.currentContext = {
      ...this.currentContext,
      ...updates,
      lastUpdated: new Date()
    };

    // Persist updated context
    if (this.persistence.enabled) {
      this.persistContext(this.currentContext);
    }

    return this.currentContext;
  }

  /**
   * Clear current context
   */
  clearContext(): void {
    if (this.currentContext) {
      this.addToHistory(this.currentContext);
    }
    this.currentContext = null;

    if (this.persistence.enabled) {
      this.clearPersistedContext();
    }
  }

  /**
   * Register event listener for context switches
   * @param eventType - Event type to listen for
   * @param listener - Event handler function
   */
  on(eventType: string, listener: (event: ContextSwitchEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   * @param eventType - Event type
   * @param listener - Event handler function to remove
   */
  off(eventType: string, listener: (event: ContextSwitchEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get analytics for context switches
   * @param domain - Optional domain filter
   * @returns Analytics data
   */
  getAnalytics(domain?: string): ContextSwitchAnalytics[] {
    if (domain) {
      return Array.from(this.analytics.values()).filter(a => a.domain === domain);
    }
    return Array.from(this.analytics.values());
  }

  /**
   * Get analytics summary
   * @returns Summary statistics
   */
  getAnalyticsSummary(): {
    totalSwitches: number;
    switchesByDomain: Record<string, number>;
    switchesByPlatform: Record<string, number>;
    avgSwitchTime: number;
  } {
    const switches = Array.from(this.analytics.values());
    const totalSwitches = switches.length;

    const switchesByDomain: Record<string, number> = {};
    const switchesByPlatform: Record<string, number> = {};

    for (const analytics of switches) {
      switchesByDomain[analytics.domain] = (switchesByDomain[analytics.domain] || 0) + 1;
      switchesByPlatform[analytics.platform] = (switchesByPlatform[analytics.platform] || 0) + 1;
    }

    const avgSwitchTime = totalSwitches > 0
      ? switches.reduce((sum, a) => sum + a.switchTimeMs, 0) / totalSwitches
      : 0;

    return {
      totalSwitches,
      switchesByDomain,
      switchesByPlatform,
      avgSwitchTime
    };
  }

  /**
   * Clear analytics data
   */
  clearAnalytics(): void {
    this.analytics.clear();
  }

  /**
   * Get configuration
   * @returns Current configuration
   */
  getConfig(): ContextSwitchConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param updates - Partial configuration updates
   */
  updateConfig(updates: Partial<ContextSwitchConfig>): void {
    this.config = { ...this.config, ...updates };
    this.persistence.enabled = this.config.persistenceEnabled;
    this.persistence.storageKey = this.config.storageKey;
    this.persistence.maxHistorySize = this.config.maxHistorySize;
  }

  /**
   * Add context to history
   */
  private addToHistory(context: NavigationContext): void {
    this.contextHistory.push(context);

    // Trim history to max size
    if (this.contextHistory.length > this.persistence.maxHistorySize) {
      this.contextHistory.shift();
    }
  }

  /**
   * Record switch analytics
   */
  private recordSwitchAnalytics(event: ContextSwitchEvent): void {
    const key = `${event.domain}:${event.platform}:${event.userId}`;
    const existing = this.analytics.get(key);

    if (existing) {
      existing.totalSwitches++;
      existing.lastSwitchedAt = event.timestamp;
    } else {
      this.analytics.set(key, {
        domain: event.domain,
        platform: event.platform,
        userId: event.userId,
        totalSwitches: 1,
        firstSwitchedAt: event.timestamp,
        lastSwitchedAt: event.timestamp,
        switchTimeMs: 0 // Would be calculated from actual timing
      });
    }
  }

  /**
   * Persist context to storage
   */
  private persistContext(context: NavigationContext): void {
    try {
      const storageKey = `${this.persistence.storageKey}:${context.userId}`;
      const data = JSON.stringify({
        context,
        history: this.contextHistory.slice(-this.persistence.maxHistorySize)
      });
      localStorage.setItem(storageKey, data);
    } catch (error) {
      console.warn('Failed to persist context:', error);
    }
  }

  /**
   * Load persisted context from storage
   */
  private loadPersistedContext(): void {
    try {
      const storageKey = `${this.persistence.storageKey}:current`;
      const data = localStorage.getItem(storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.currentContext = parsed.context;
        this.contextHistory = parsed.history || [];
      }
    } catch (error) {
      console.warn('Failed to load persisted context:', error);
    }
  }

  /**
   * Clear persisted context
   */
  private clearPersistedContext(): void {
    try {
      const storageKey = `${this.persistence.storageKey}:current`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear persisted context:', error);
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: ContextSwitchEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      }
    }
  }
}

/**
 * Factory function to create a ContextSwitcher
 * @param config - Optional configuration overrides
 * @returns Configured ContextSwitcher instance
 */
export function createContextSwitcher(config?: Partial<ContextSwitchConfig>): ContextSwitcher {
  return new ContextSwitcher(config);
}
