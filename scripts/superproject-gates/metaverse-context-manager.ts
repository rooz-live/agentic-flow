/**
 * Metaverse Context Manager
 * 
 * Manages virtual environment state, user presence, and spatial context
 * for agent coordination within metaverse environments
 */

import { EventEmitter } from 'events';
import { OrchestrationFramework } from '../core/orchestration-framework';
import {
  MetaverseContextConfig,
  MetaverseEnvironment,
  UserPresence,
  EnvironmentResource,
  EnvironmentConstraint,
  Vector3D,
  UserInteraction,
  ContextEvent,
  ContextError,
  SpatialBounds,
  EnvironmentProperties
} from './types';

export class MetaverseContextManager extends EventEmitter {
  private config: MetaverseContextConfig;
  private orchestration: OrchestrationFramework;
  private currentEnvironment: MetaverseEnvironment | null = null;
  private userPresences: Map<string, UserPresence> = new Map();
  private environmentResources: Map<string, EnvironmentResource> = new Map();
  private activeConstraints: Map<string, EnvironmentConstraint> = new Map();
  private spatialIndex: SpatialIndex | null = null;
  private metrics: {
    contextUpdates: number;
    presenceChanges: number;
    resourceUpdates: number;
    constraintUpdates: number;
    averageUpdateTime: number;
  };

  constructor(
    orchestration: OrchestrationFramework,
    config: MetaverseContextConfig
  ) {
    super();
    this.config = config;
    this.orchestration = orchestration;
    this.initializeMetrics();
    
    // Register with orchestration framework
    this.registerWithOrchestration();
  }

  /**
   * Initialize context manager
   */
  public async initialize(): Promise<void> {
    try {
      console.log('[METAVRSE-CONTEXT] Initializing metaverse context manager');
      
      // Initialize spatial indexing if enabled
      if (this.config.spatialIndexing) {
        this.spatialIndex = new SpatialIndex();
        await this.spatialIndex.initialize();
      }
      
      // Load initial environment state
      await this.loadInitialEnvironment();
      
      // Start context update loop
      if (this.config.updateInterval > 0) {
        this.startContextUpdateLoop();
      }
      
      console.log('[METAVRSE-CONTEXT] Context manager initialized successfully');
    } catch (error) {
      console.error('[METAVRSE-CONTEXT] Failed to initialize context manager:', error);
      throw new ContextError(
        `Failed to initialize context manager: ${error.message}`,
        'INITIALIZATION_FAILED'
      );
    }
  }

  /**
   * Update metaverse context
   */
  public async updateEnvironment(changes: any[]): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`[METAVRSE-CONTEXT] Updating environment with ${changes.length} changes`);
      
      if (!this.currentEnvironment) {
        throw new ContextError('No active environment', 'NO_ENVIRONMENT');
      }
      
      // Apply changes to current environment
      for (const change of changes) {
        await this.applyEnvironmentChange(change);
      }
      
      // Update spatial index if enabled
      if (this.spatialIndex && this.config.spatialIndexing) {
        await this.spatialIndex.updateEnvironment(this.currentEnvironment);
      }
      
      // Update metrics
      this.updateMetrics(startTime);
      
      // Emit context change event
      this.emit('contextChange', {
        id: this.generateId(),
        timestamp: new Date(),
        type: 'environment_update',
        context: this.currentEnvironment,
        changes: changes.map(c => c.type)
      } as ContextEvent);
      
      console.log('[METAVRSE-CONTEXT] Environment updated successfully');
    } catch (error) {
      console.error('[METAVRSE-CONTEXT] Failed to update environment:', error);
      throw new ContextError(
        `Failed to update environment: ${error.message}`,
        'ENVIRONMENT_UPDATE_FAILED',
        undefined,
        undefined
      );
    }
  }

  /**
   * Update user presence
   */
  public async updateUserPresence(
    userId: string,
    presence: Partial<UserPresence>
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`[METAVRSE-CONTEXT] Updating presence for user: ${userId}`);
      
      const currentPresence = this.userPresences.get(userId);
      const updatedPresence: UserPresence = {
        userId,
        agentId: presence.agentId || currentPresence?.agentId,
        avatarId: presence.avatarId || currentPresence?.avatarId,
        location: presence.location || currentPresence?.location || { x: 0, y: 0, z: 0 },
        orientation: presence.orientation || currentPresence?.orientation || { x: 0, y: 0, z: 0, w: 1 },
        status: presence.status || currentPresence?.status || 'offline',
        capabilities: presence.capabilities || currentPresence?.capabilities || [],
        lastActivity: new Date(),
        interactions: presence.interactions || currentPresence?.interactions || []
      };
      
      this.userPresences.set(userId, updatedPresence);
      
      // Update spatial index if enabled
      if (this.spatialIndex && this.config.spatialIndexing) {
        await this.spatialIndex.updatePresence(userId, updatedPresence);
      }
      
      // Update metrics
      this.metrics.presenceChanges++;
      
      // Emit presence change event
      this.emit('contextChange', {
        id: this.generateId(),
        timestamp: new Date(),
        type: 'presence_change',
        context: updatedPresence
      } as ContextEvent);
      
      console.log(`[METAVRSE-CONTEXT] User presence updated: ${userId}`);
    } catch (error) {
      console.error('[METAVRSE-CONTEXT] Failed to update user presence:', error);
      throw new ContextError(
        `Failed to update user presence: ${error.message}`,
        'PRESENCE_UPDATE_FAILED',
        undefined,
        userId
      );
    }
  }

  /**
   * Get user presences in area
   */
  public async getPresencesInArea(
    bounds: SpatialBounds,
    limit?: number
  ): Promise<UserPresence[]> {
    try {
      if (!this.spatialIndex) {
        // Fallback to linear search
        return this.getPresencesInAreaLinear(bounds, limit);
      }
      
      return await this.spatialIndex.getPresencesInArea(bounds, limit);
    } catch (error) {
      console.error('[METAVRSE-CONTEXT] Failed to get presences in area:', error);
      throw new ContextError(
        `Failed to get presences in area: ${error.message}`,
        'AREA_QUERY_FAILED'
      );
    }
  }

  /**
   * Get environment resources
   */
  public async getEnvironmentResources(
    type?: string,
    location?: Vector3D
  ): Promise<EnvironmentResource[]> {
    try {
      const resources: EnvironmentResource[] = [];
      
      for (const [id, resource] of this.environmentResources.entries()) {
        // Filter by type if specified
        if (type && resource.type !== type) {
          continue;
        }
        
        // Filter by location if specified
        if (location && resource.location) {
          const distance = this.calculateDistance(location, resource.location);
          if (distance > 100) { // 100 units radius
            continue;
          }
        }
        
        resources.push({ ...resource });
      }
      
      return resources;
    } catch (error) {
      console.error('[METAVRSE-CONTEXT] Failed to get environment resources:', error);
      throw new ContextError(
        `Failed to get environment resources: ${error.message}`,
        'RESOURCE_QUERY_FAILED'
      );
    }
  }

  /**
   * Add environment constraint
   */
  public async addEnvironmentConstraint(
    constraint: EnvironmentConstraint
  ): Promise<void> {
    try {
      console.log(`[METAVRSE-CONTEXT] Adding constraint: ${constraint.type}`);
      
      this.activeConstraints.set(constraint.id, constraint);
      
      // Apply constraint to current environment
      if (this.currentEnvironment) {
        await this.applyConstraint(constraint);
      }
      
      // Update metrics
      this.metrics.constraintUpdates++;
      
      // Emit constraint update event
      this.emit('contextChange', {
        id: this.generateId(),
        timestamp: new Date(),
        type: 'constraint_update',
        context: constraint
      } as ContextEvent);
      
      console.log(`[METAVRSE-CONTEXT] Constraint added: ${constraint.id}`);
    } catch (error) {
      console.error('[METAVRSE-CONTEXT] Failed to add environment constraint:', error);
      throw new ContextError(
        `Failed to add environment constraint: ${error.message}`,
        'CONSTRAINT_ADD_FAILED'
      );
    }
  }

  /**
   * Remove environment constraint
   */
  public async removeEnvironmentConstraint(constraintId: string): Promise<void> {
    try {
      console.log(`[METAVRSE-CONTEXT] Removing constraint: ${constraintId}`);
      
      const constraint = this.activeConstraints.get(constraintId);
      if (constraint) {
        this.activeConstraints.delete(constraintId);
        
        // Remove constraint from current environment
        if (this.currentEnvironment) {
          await this.removeConstraint(constraint);
        }
        
        // Update metrics
        this.metrics.constraintUpdates++;
        
        console.log(`[METAVRSE-CONTEXT] Constraint removed: ${constraintId}`);
      }
    } catch (error) {
      console.error('[METAVRSE-CONTEXT] Failed to remove environment constraint:', error);
      throw new ContextError(
        `Failed to remove environment constraint: ${error.message}`,
        'CONSTRAINT_REMOVE_FAILED'
      );
    }
  }

  /**
   * Get current context
   */
  public getCurrentContext(): {
    environment: MetaverseEnvironment | null;
    userPresences: Map<string, UserPresence>;
    activeConstraints: Map<string, EnvironmentConstraint>;
    resources: Map<string, EnvironmentResource>;
    metrics: any;
  } {
    return {
      environment: this.currentEnvironment,
      userPresences: new Map(this.userPresences),
      activeConstraints: new Map(this.activeConstraints),
      resources: new Map(this.environmentResources),
      metrics: this.metrics
    };
  }

  /**
   * Get context metrics
   */
  public getMetrics(): any {
    return {
      ...this.metrics,
      activeUsers: this.userPresences.size,
      activeConstraints: this.activeConstraints.size,
      activeResources: this.environmentResources.size,
      environmentId: this.currentEnvironment?.id || null,
      spatialIndexEnabled: this.spatialIndex !== null,
      uptime: this.getUptime()
    };
  }

  /**
   * Load initial environment state
   */
  private async loadInitialEnvironment(): Promise<void> {
    // In a real implementation, this would load from persistent storage
    // For now, we'll create a default environment
    
    this.currentEnvironment = {
      id: 'default-metaverse',
      name: 'Default Metaverse Environment',
      type: 'virtual',
      properties: {
        spatialBounds: { x: { min: -1000, max: 1000 }, y: { min: -500, max: 500 }, z: { min: -100, max: 100 } },
        physicsEnabled: true,
        renderingMode: '3d',
        maxUsers: 1000,
        timeScale: 1.0
      },
      resources: [
        { id: 'gpu-cluster-1', type: 'gpu', capacity: 100, available: 75 },
        { id: 'storage-main', type: 'storage', capacity: 10000, available: 6500 }
      ],
      constraints: []
    };
    
    // Initialize some default resources
    this.environmentResources.set('gpu-cluster-1', {
      id: 'gpu-cluster-1',
      type: 'gpu',
      capacity: 100,
      available: 75,
      location: { x: 0, y: 0, z: 0 }
    });
    
    this.environmentResources.set('storage-main', {
      id: 'storage-main',
      type: 'storage',
      capacity: 10000,
      available: 6500,
      location: { x: 100, y: 0, z: 0 }
    });
    
    console.log('[METAVRSE-CONTEXT] Initial environment loaded');
  }

  /**
   * Start context update loop
   */
  private startContextUpdateLoop(): void {
    setInterval(async () => {
      try {
        await this.performContextUpdate();
      } catch (error) {
        console.error('[METAVRSE-CONTEXT] Error in context update loop:', error);
      }
    }, this.config.updateInterval);
  }

  /**
   * Perform context update
   */
  private async performContextUpdate(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Update user presence timeouts
      await this.updatePresenceTimeouts();
      
      // Update resource availability
      await this.updateResourceAvailability();
      
      // Check constraint violations
      await this.checkConstraintViolations();
      
      // Update metrics
      this.updateMetrics(startTime);
      
      this.metrics.contextUpdates++;
    } catch (error) {
      console.error('[METAVRSE-CONTEXT] Failed to perform context update:', error);
    }
  }

  /**
   * Update presence timeouts
   */
  private async updatePresenceTimeouts(): Promise<void> {
    const now = new Date();
    const timeoutThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [userId, presence] of this.userPresences.entries()) {
      if (now.getTime() - presence.lastActivity.getTime() > timeoutThreshold) {
        // Update status to away
        presence.status = 'away';
        presence.lastActivity = now;
        
        this.emit('contextChange', {
          id: this.generateId(),
          timestamp: now,
          type: 'presence_change',
          context: { ...presence }
        } as ContextEvent);
      }
    }
  }

  /**
   * Update resource availability
   */
  private async updateResourceAvailability(): Promise<void> {
    // Simulate resource availability changes
    for (const [id, resource] of this.environmentResources.entries()) {
      // Random availability changes for simulation
      if (Math.random() > 0.8) {
        const change = Math.random() > 0.5 ? -5 : 5;
        resource.available = Math.max(0, Math.min(resource.capacity, resource.available + change));
      }
    }
  }

  /**
   * Check constraint violations
   */
  private async checkConstraintViolations(): Promise<void> {
    // Simulate constraint violation checking
    for (const [id, constraint] of this.activeConstraints.entries()) {
      if (constraint.type === 'capacity_limit' && this.currentEnvironment) {
        const currentUsage = this.calculateCurrentUsage(constraint.parameters.resourceType);
        if (currentUsage > constraint.parameters.maxCapacity) {
          // Emit violation event
          this.emit('contextChange', {
            id: this.generateId(),
            timestamp: new Date(),
            type: 'constraint_violation',
            context: {
              constraintId: id,
              violationType: 'capacity_exceeded',
              currentUsage,
              maxCapacity: constraint.parameters.maxCapacity
            }
          } as ContextEvent);
        }
      }
    }
  }

  /**
   * Apply environment change
   */
  private async applyEnvironmentChange(change: any): Promise<void> {
    if (!this.currentEnvironment) {
      return;
    }
    
    switch (change.type) {
      case 'property_update':
        this.currentEnvironment.properties = {
          ...this.currentEnvironment.properties,
          ...change.properties
        };
        break;
      case 'resource_add':
        if (change.resource) {
          this.environmentResources.set(change.resource.id, change.resource);
        }
        break;
      case 'resource_remove':
        if (change.resourceId) {
          this.environmentResources.delete(change.resourceId);
        }
        break;
      case 'constraint_add':
        if (change.constraint) {
          this.activeConstraints.set(change.constraint.id, change.constraint);
        }
        break;
    }
  }

  /**
   * Apply constraint
   */
  private async applyConstraint(constraint: EnvironmentConstraint): Promise<void> {
    // Simulate constraint application
    console.log(`[METAVRSE-CONTEXT] Applying constraint: ${constraint.type}`);
  }

  /**
   * Remove constraint
   */
  private async removeConstraint(constraint: EnvironmentConstraint): Promise<void> {
    // Simulate constraint removal
    console.log(`[METAVRSE-CONTEXT] Removing constraint: ${constraint.type}`);
  }

  /**
   * Calculate current usage
   */
  private calculateCurrentUsage(resourceType: string): number {
    // Simulate usage calculation
    return Math.random() * 100;
  }

  /**
   * Get presences in area (linear search fallback)
   */
  private getPresencesInAreaLinear(
    bounds: SpatialBounds,
    limit?: number
  ): UserPresence[] {
    const presences: UserPresence[] = [];
    
    for (const presence of this.userPresences.values()) {
      if (this.isInBounds(presence.location, bounds)) {
        presences.push(presence);
        
        if (limit && presences.length >= limit) {
          break;
        }
      }
    }
    
    return presences;
  }

  /**
   * Check if point is in bounds
   */
  private isInBounds(point: Vector3D, bounds: SpatialBounds): boolean {
    return point.x >= bounds.x.min && point.x <= bounds.x.max &&
           point.y >= bounds.y.min && point.y <= bounds.y.max &&
           point.z >= bounds.z.min && point.z <= bounds.z.max;
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(point1: Vector3D, point2: Vector3D): number {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = point1.z - point2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Update metrics
   */
  private updateMetrics(startTime: number): void {
    const updateTime = Date.now() - startTime;
    
    // Update average update time
    this.metrics.averageUpdateTime = 
      (this.metrics.averageUpdateTime + updateTime) / 2;
  }

  /**
   * Get uptime
   */
  private getUptime(): number {
    // In a real implementation, this would track actual uptime
    return Math.floor(Math.random() * 86400); // Random uptime in seconds
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Register with orchestration framework
   */
  private registerWithOrchestration(): void {
    // Create metaverse domain if it doesn't exist
    const metaverseDomain = this.orchestration.getDomain('metaverse-operations');
    if (!metaverseDomain) {
      this.orchestration.createDomain({
        name: 'Metaverse Operations',
        purpose: 'system-optimization',
        boundaries: [
          'Virtual environment management',
          'User presence tracking',
          'Spatial indexing and query',
          'Resource allocation and monitoring',
          'Environment constraint enforcement'
        ],
        accountabilities: [
          'context-manager',
          'spatial-indexer',
          'resource-coordinator',
          'presence-tracker'
        ]
      });
    }

    console.log('[METAVRSE-CONTEXT] Registered with orchestration framework');
  }
}

// Spatial Index class for efficient spatial queries
class SpatialIndex {
  private index: Map<string, SpatialIndexEntry[]> = new Map();
  private cellSize: number = 50; // 50 units per cell

  async initialize(): Promise<void> {
    console.log('[SPATIAL-INDEX] Initializing spatial index');
  }

  async updateEnvironment(environment: MetaverseEnvironment): Promise<void> {
    // Rebuild spatial index based on environment changes
    this.index.clear();
    
    // Add resources to spatial index
    if (environment.resources) {
      for (const resource of environment.resources) {
        if (resource.location) {
          this.addToIndex(resource.id, resource.location, 'resource', resource);
        }
      }
    }
  }

  async updatePresence(userId: string, presence: UserPresence): Promise<void> {
    // Update presence in spatial index
    this.addToIndex(userId, presence.location, 'presence', presence);
  }

  async getPresencesInArea(
    bounds: SpatialBounds,
    limit?: number
  ): Promise<UserPresence[]> {
    const presences: UserPresence[] = [];
    const cells = this.getCellsInBounds(bounds);
    
    for (const cellKey of cells) {
      const entries = this.index.get(cellKey);
      if (entries) {
        for (const entry of entries) {
          if (entry.type === 'presence') {
            const presence = entry.data as UserPresence;
            if (this.isInBounds(presence.location, bounds)) {
              presences.push(presence);
              
              if (limit && presences.length >= limit) {
                return presences;
              }
            }
          }
        }
      }
    }
    
    return presences;
  }

  private addToIndex(id: string, location: Vector3D, type: string, data: any): void {
    const cellKey = this.getCellKey(location);
    
    if (!this.index.has(cellKey)) {
      this.index.set(cellKey, []);
    }
    
    this.index.get(cellKey)!.push({
      id,
      location,
      type,
      data
    });
  }

  private getCellsInBounds(bounds: SpatialBounds): string[] {
    const cells: string[] = [];
    
    const minCellX = Math.floor(bounds.x.min / this.cellSize);
    const maxCellX = Math.floor(bounds.x.max / this.cellSize);
    const minCellY = Math.floor(bounds.y.min / this.cellSize);
    const maxCellY = Math.floor(bounds.y.max / this.cellSize);
    const minCellZ = Math.floor(bounds.z.min / this.cellSize);
    const maxCellZ = Math.floor(bounds.z.max / this.cellSize);
    
    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        for (let z = minCellZ; z <= maxCellZ; z++) {
          cells.push(`${x},${y},${z}`);
        }
      }
    }
    
    return cells;
  }

  private getCellKey(location: Vector3D): string {
    const x = Math.floor(location.x / this.cellSize);
    const y = Math.floor(location.y / this.cellSize);
    const z = Math.floor(location.z / this.cellSize);
    return `${x},${y},${z}`;
  }
}

interface SpatialIndexEntry {
  id: string;
  location: Vector3D;
  type: string;
  data: any;
}