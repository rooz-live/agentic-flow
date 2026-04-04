/**
 * Comprehensive TODO System
 * 
 * Implements multi-dimensional TODO management (NOW, NEXT, LATER)
 * with priority-based task scheduling and resource allocation
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  TodoItem,
  TodoStatus,
  TodoPriority,
  TodoCategory,
  TodoDimension,
  TodoMetadata,
  RecurringPattern,
  TodoAttachment,
  TodoComment,
  TodoHistoryEntry,
  FilterOptions,
  PaginationOptions,
  QueryResult,
  TodoSystemError,
  ExportOptions,
  ImportOptions
} from './types';
import { OrchestrationFramework } from '../core/orchestration-framework';
import { WSJFScoringService } from '../wsjf';

export class TodoSystem extends EventEmitter {
  private todos: Map<string, TodoItem> = new Map();
  private dimensionViews: Map<TodoDimension, Set<string>> = new Map();
  private categoryViews: Map<TodoCategory, Set<string>> = new Map();
  private statusViews: Map<TodoStatus, Set<string>> = new Map();
  private priorityViews: Map<TodoPriority, Set<string>> = new Map();
  private assigneeViews: Map<string, Set<string>> = new Map();
  private circleViews: Map<string, Set<string>> = new Map();
  private tagViews: Map<string, Set<string>> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map(); // todoId -> dependencies
  private reverseDependencyGraph: Map<string, Set<string>> = new Map(); // todoId -> dependents

  constructor(
    private orchestrationFramework: OrchestrationFramework,
    private wsjfService?: WSJFScoringService
  ) {
    super();
    this.initializeViews();
  }

  /**
   * Initialize all views
   */
  private initializeViews(): void {
    // Initialize dimension views
    this.dimensionViews.set('now', new Set());
    this.dimensionViews.set('next', new Set());
    this.dimensionViews.set('later', new Set());

    // Initialize category views
    const categories: TodoCategory[] = ['feature', 'bug', 'improvement', 'research', 'documentation', 'testing', 'deployment', 'maintenance'];
    categories.forEach(category => this.categoryViews.set(category, new Set()));

    // Initialize status views
    const statuses: TodoStatus[] = ['not_started', 'in_progress', 'completed', 'blocked', 'cancelled', 'deferred'];
    statuses.forEach(status => this.statusViews.set(status, new Set()));

    // Initialize priority views
    const priorities: TodoPriority[] = ['lowest', 'low', 'medium', 'high', 'highest', 'critical'];
    priorities.forEach(priority => this.priorityViews.set(priority, new Set()));
  }

  /**
   * Create a new TODO item
   */
  public async createTodo(todoData: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>): Promise<TodoItem> {
    const id = uuidv4();
    const now = new Date();

    // Initialize metadata
    const metadata: TodoMetadata = {
      source: 'manual',
      complexity: 'moderate',
      effort: 'medium',
      value: 'medium',
      risk: 'medium',
      recurring: false,
      attachments: [],
      comments: [],
      history: []
    };

    const todo: TodoItem = {
      id,
      createdAt: now,
      updatedAt: now,
      metadata,
      ...todoData
    };

    // Calculate WSJF score if service is available
    if (this.wsjfService) {
      todo.wsjfScore = await this.calculateWSJFScore(todo);
    }

    // Store todo
    this.todos.set(id, todo);

    // Update all views
    this.updateViews(todo, 'created');

    // Add history entry
    this.addHistoryEntry(id, 'created', 'system', {
      title: todo.title,
      priority: todo.priority,
      category: todo.category,
      dimension: todo.dimension
    });

    // Update dependency graph
    this.updateDependencyGraph(id, todo.dependencies, []);

    console.log(`[TODO_SYSTEM] Created TODO: ${todo.title} (${id})`);
    this.emit('todoCreated', todo);

    return todo;
  }

  /**
   * Update an existing TODO item
   */
  public async updateTodo(
    id: string, 
    updates: Partial<Omit<TodoItem, 'id' | 'createdAt' | 'metadata'>>,
    author: string = 'system'
  ): Promise<TodoItem> {
    const todo = this.todos.get(id);
    if (!todo) {
      throw new TodoSystemError(
        `TODO not found: ${id}`,
        'TODO_NOT_FOUND',
        id
      );
    }

    const previousValues: any = {};
    const updatedFields: string[] = [];

    // Track changes
    for (const [key, value] of Object.entries(updates)) {
      if (todo[key as keyof TodoItem] !== value) {
        previousValues[key] = todo[key as keyof TodoItem];
        (todo as any)[key] = value;
        updatedFields.push(key);
      }
    }

    // Update timestamp
    todo.updatedAt = new Date();

    // Recalculate WSJF score if relevant fields changed
    if (this.wsjfService && ['priority', 'category', 'estimatedDuration', 'dependencies'].some(field => updatedFields.includes(field))) {
      todo.wsjfScore = await this.calculateWSJFScore(todo);
    }

    // Update views
    this.updateViews(todo, 'updated', previousValues);

    // Update dependency graph if dependencies changed
    if (updates.dependencies) {
      this.updateDependencyGraph(id, updates.dependencies, todo.dependencies);
    }

    // Add history entries for each updated field
    for (const field of updatedFields) {
      this.addHistoryEntry(id, 'updated' as any, author, {
        field,
        previousValue: previousValues[field],
        newValue: (updates as any)[field]
      });
    }

    // Handle status changes
    if (updates.status && updates.status !== previousValues.status) {
      await this.handleStatusChange(todo, previousValues.status as TodoStatus, updates.status, author);
    }

    console.log(`[TODO_SYSTEM] Updated TODO: ${todo.title} (${id})`);
    this.emit('todoUpdated', todo);

    return todo;
  }

  /**
   * Get TODO by ID
   */
  public getTodo(id: string): TodoItem | undefined {
    return this.todos.get(id);
  }

  /**
   * Query TODOs with filters and pagination
   */
  public async queryTodos(
    filters: FilterOptions = {},
    pagination: PaginationOptions = {}
  ): Promise<QueryResult<TodoItem>> {
    const startTime = Date.now();

    let results = Array.from(this.todos.values());

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      results = results.filter(todo => filters.status!.includes(todo.status));
    }

    if (filters.priority && filters.priority.length > 0) {
      results = results.filter(todo => filters.priority!.includes(todo.priority));
    }

    if (filters.category && filters.category.length > 0) {
      results = results.filter(todo => filters.category!.includes(todo.category));
    }

    if (filters.dimension && filters.dimension.length > 0) {
      results = results.filter(todo => filters.dimension!.includes(todo.dimension));
    }

    if (filters.assignee && filters.assignee.length > 0) {
      results = results.filter(todo => todo.assignee && filters.assignee!.includes(todo.assignee));
    }

    if (filters.circleId && filters.circleId.length > 0) {
      results = results.filter(todo => todo.circleId && filters.circleId!.includes(todo.circleId));
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(todo => 
        filters.tags!.some(tag => todo.tags.includes(tag))
      );
    }

    if (filters.dateRange) {
      results = results.filter(todo => 
        todo.createdAt >= filters.dateRange!.start && 
        todo.createdAt <= filters.dateRange!.end
      );
    }

    // Apply custom filters
    if (filters.customFilters) {
      for (const [field, value] of Object.entries(filters.customFilters)) {
        results = results.filter(todo => (todo as any)[field] === value);
      }
    }

    // Sort results
    if (pagination.sortBy) {
      const sortOrder = pagination.sortOrder || 'asc';
      results.sort((a, b) => {
        const aValue = (a as any)[pagination.sortBy!];
        const bValue = (b as any)[pagination.sortBy!];
        
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default sort by WSJF score (descending), then priority, then created date
      results.sort((a, b) => {
        if (a.wsjfScore !== b.wsjfScore) {
          return (b.wsjfScore || 0) - (a.wsjfScore || 0);
        }
        
        const priorityOrder = { critical: 6, highest: 5, high: 4, medium: 3, low: 2, lowest: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }

    // Apply pagination
    const totalCount = results.length;
    const offset = pagination.offset || 0;
    const limit = pagination.limit || 50;
    const paginatedResults = results.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;

    const queryTime = Date.now() - startTime;

    return {
      results: paginatedResults,
      totalCount,
      hasMore,
      queryTime,
      filters,
      pagination
    };
  }

  /**
   * Get TODOs by dimension (NOW, NEXT, LATER)
   */
  public async getTodosByDimension(dimension: TodoDimension): Promise<TodoItem[]> {
    const todoIds = this.dimensionViews.get(dimension) || new Set();
    return Array.from(todoIds).map(id => this.todos.get(id)!).filter(Boolean);
  }

  /**
   * Move TODO to different dimension
   */
  public async moveTodoToDimension(id: string, newDimension: TodoDimension, author: string = 'system'): Promise<TodoItem> {
    const todo = this.todos.get(id);
    if (!todo) {
      throw new TodoSystemError(
        `TODO not found: ${id}`,
        'TODO_NOT_FOUND',
        id
      );
    }

    const oldDimension = todo.dimension;
    if (oldDimension === newDimension) {
      return todo;
    }

    // Remove from old dimension view
    const oldView = this.dimensionViews.get(oldDimension);
    if (oldView) {
      oldView.delete(id);
    }

    // Add to new dimension view
    const newView = this.dimensionViews.get(newDimension);
    if (newView) {
      newView.add(id);
    }

    // Update todo
    todo.dimension = newDimension;
    todo.updatedAt = new Date();

    // Add history entry
    this.addHistoryEntry(id, 'updated', author, {
      field: 'dimension',
      previousValue: oldDimension,
      newValue: newDimension
    });

    console.log(`[TODO_SYSTEM] Moved TODO ${id} from ${oldDimension} to ${newDimension}`);
    this.emit('todoDimensionChanged', { todo, oldDimension, newDimension });

    return todo;
  }

  /**
   * Assign TODO to user
   */
  public async assignTodo(id: string, assignee: string, author: string = 'system'): Promise<TodoItem> {
    return this.updateTodo(id, { assignee }, author);
  }

  /**
   * Complete TODO
   */
  public async completeTodo(id: string, author: string = 'system'): Promise<TodoItem> {
    const todo = await this.updateTodo(id, { 
      status: 'completed',
      completedAt: new Date()
    }, author);

    // Move to completed status view
    const statusView = this.statusViews.get('completed');
    if (statusView) {
      statusView.add(id);
    }

    // Remove from other status views
    ['not_started', 'in_progress', 'blocked', 'cancelled', 'deferred'].forEach(status => {
      const view = this.statusViews.get(status as TodoStatus);
      if (view) {
        view.delete(id);
      }
    });

    // Check if this unlocks any dependent TODOs
    await this.checkDependentTodos(id);

    // Handle recurring TODOs
    if (todo.metadata.recurring && todo.metadata.recurringPattern) {
      await this.createNextRecurringTodo(todo);
    }

    console.log(`[TODO_SYSTEM] Completed TODO: ${todo.title} (${id})`);
    this.emit('todoCompleted', todo);

    return todo;
  }

  /**
   * Block TODO
   */
  public async blockTodo(id: string, reason: string, author: string = 'system'): Promise<TodoItem> {
    const todo = await this.updateTodo(id, { status: 'blocked' }, author);

    // Add comment about blocking
    await this.addComment(id, `Blocked: ${reason}`, author);

    console.log(`[TODO_SYSTEM] Blocked TODO: ${todo.title} (${id}) - ${reason}`);
    this.emit('todoBlocked', { todo, reason, author });

    return todo;
  }

  /**
   * Unblock TODO
   */
  public async unblockTodo(id: string, author: string = 'system'): Promise<TodoItem> {
    const todo = await this.updateTodo(id, { status: 'not_started' }, author);

    // Add comment about unblocking
    await this.addComment(id, 'Unblocked', author);

    console.log(`[TODO_SYSTEM] Unblocked TODO: ${todo.title} (${id})`);
    this.emit('todoUnblocked', { todo, author });

    return todo;
  }

  /**
   * Add comment to TODO
   */
  public async addComment(id: string, content: string, author: string): Promise<TodoComment> {
    const todo = this.todos.get(id);
    if (!todo) {
      throw new TodoSystemError(
        `TODO not found: ${id}`,
        'TODO_NOT_FOUND',
        id
      );
    }

    const comment: TodoComment = {
      id: uuidv4(),
      content,
      author,
      createdAt: new Date(),
      mentions: this.extractMentions(content)
    };

    todo.metadata.comments.push(comment);
    todo.updatedAt = new Date();

    console.log(`[TODO_SYSTEM] Added comment to TODO ${id} by ${author}`);
    this.emit('commentAdded', { todo, comment });

    return comment;
  }

  /**
   * Add attachment to TODO
   */
  public async addAttachment(
    id: string, 
    name: string, 
    type: string, 
    size: number, 
    url: string, 
    author: string
  ): Promise<TodoAttachment> {
    const todo = this.todos.get(id);
    if (!todo) {
      throw new TodoSystemError(
        `TODO not found: ${id}`,
        'TODO_NOT_FOUND',
        id
      );
    }

    const attachment: TodoAttachment = {
      id: uuidv4(),
      name,
      type,
      size,
      url,
      uploadedAt: new Date(),
      uploadedBy: author
    };

    todo.metadata.attachments.push(attachment);
    todo.updatedAt = new Date();

    console.log(`[TODO_SYSTEM] Added attachment to TODO ${id}: ${name}`);
    this.emit('attachmentAdded', { todo, attachment });

    return attachment;
  }

  /**
   * Delete TODO
   */
  public async deleteTodo(id: string, author: string = 'system'): Promise<void> {
    const todo = this.todos.get(id);
    if (!todo) {
      throw new TodoSystemError(
        `TODO not found: ${id}`,
        'TODO_NOT_FOUND',
        id
      );
    }

    // Check for dependents
    const dependents = this.reverseDependencyGraph.get(id) || new Set();
    if (dependents.size > 0) {
      throw new TodoSystemError(
        `Cannot delete TODO with dependents: ${Array.from(dependents).join(', ')}`,
        'TODO_HAS_DEPENDENTS',
        id
      );
    }

    // Remove from all views
    this.removeFromAllViews(id);

    // Remove from dependency graphs
    this.dependencyGraph.delete(id);
    this.reverseDependencyGraph.delete(id);

    // Remove todo
    this.todos.delete(id);

    console.log(`[TODO_SYSTEM] Deleted TODO: ${todo.title} (${id})`);
    this.emit('todoDeleted', { todo, author });
  }

  /**
   * Get TODO statistics
   */
  public getTodoStatistics(): {
    total: number;
    byStatus: Record<TodoStatus, number>;
    byPriority: Record<TodoPriority, number>;
    byCategory: Record<TodoCategory, number>;
    byDimension: Record<TodoDimension, number>;
    byAssignee: Record<string, number>;
    byCircle: Record<string, number>;
    overdue: number;
    completedToday: number;
    completionRate: number;
  } {
    const todos = Array.from(this.todos.values());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const stats = {
      total: todos.length,
      byStatus: {} as Record<TodoStatus, number>,
      byPriority: {} as Record<TodoPriority, number>,
      byCategory: {} as Record<TodoCategory, number>,
      byDimension: {} as Record<TodoDimension, number>,
      byAssignee: {} as Record<string, number>,
      byCircle: {} as Record<string, number>,
      overdue: 0,
      completedToday: 0,
      completionRate: 0
    };

    // Initialize counters
    ['not_started', 'in_progress', 'completed', 'blocked', 'cancelled', 'deferred'].forEach(status => {
      stats.byStatus[status as TodoStatus] = 0;
    });

    ['lowest', 'low', 'medium', 'high', 'highest', 'critical'].forEach(priority => {
      stats.byPriority[priority as TodoPriority] = 0;
    });

    ['feature', 'bug', 'improvement', 'research', 'documentation', 'testing', 'deployment', 'maintenance'].forEach(category => {
      stats.byCategory[category as TodoCategory] = 0;
    });

    ['now', 'next', 'later'].forEach(dimension => {
      stats.byDimension[dimension as TodoDimension] = 0;
    });

    // Count todos
    todos.forEach(todo => {
      stats.byStatus[todo.status]++;
      stats.byPriority[todo.priority]++;
      stats.byCategory[todo.category]++;
      stats.byDimension[todo.dimension];

      if (todo.assignee) {
        stats.byAssignee[todo.assignee] = (stats.byAssignee[todo.assignee] || 0) + 1;
      }

      if (todo.circleId) {
        stats.byCircle[todo.circleId] = (stats.byCircle[todo.circleId] || 0) + 1;
      }

      if (todo.dueDate && todo.dueDate < now && todo.status !== 'completed') {
        stats.overdue++;
      }

      if (todo.completedAt && todo.completedAt >= today) {
        stats.completedToday++;
      }
    });

    // Calculate completion rate
    const completedCount = stats.byStatus.completed;
    const totalRelevant = todos.filter(todo => todo.status !== 'cancelled').length;
    stats.completionRate = totalRelevant > 0 ? (completedCount / totalRelevant) * 100 : 0;

    return stats;
  }

  /**
   * Export TODOs
   */
  public async exportTodos(options: ExportOptions): Promise<any> {
    const { format, includeMetadata = true, includeHistory = false, dateRange, filters = {} } = options;

    // Get filtered todos
    const queryResult = await this.queryTodos(filters);
    let todos = queryResult.results;

    // Apply date range filter
    if (dateRange) {
      todos = todos.filter(todo => 
        todo.createdAt >= dateRange.start && 
        todo.createdAt <= dateRange.end
      );
    }

    // Prepare export data
    const exportData = todos.map(todo => {
      const exportTodo: any = {
        id: todo.id,
        title: todo.title,
        description: todo.description,
        status: todo.status,
        priority: todo.priority,
        category: todo.category,
        dimension: todo.dimension,
        assignee: todo.assignee,
        circleId: todo.circleId,
        estimatedDuration: todo.estimatedDuration,
        actualDuration: todo.actualDuration,
        dueDate: todo.dueDate,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
        completedAt: todo.completedAt,
        tags: todo.tags,
        dependencies: todo.dependencies,
        blockedBy: todo.blockedBy,
        wsjfScore: todo.wsjfScore,
        pdaPhase: todo.pdaPhase
      };

      if (includeMetadata) {
        exportTodo.metadata = todo.metadata;
      }

      if (!includeHistory && exportTodo.metadata) {
        delete exportTodo.metadata.history;
      }

      return exportTodo;
    });

    // Format based on requested format
    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      
      case 'csv':
        return this.convertToCSV(exportData);
      
      case 'xlsx':
        // Would need a library like xlsx to implement
        throw new TodoSystemError('XLSX export not implemented', 'EXPORT_NOT_SUPPORTED');
      
      case 'pdf':
        // Would need a library like pdfkit to implement
        throw new TodoSystemError('PDF export not implemented', 'EXPORT_NOT_SUPPORTED');
      
      default:
        throw new TodoSystemError(`Unsupported export format: ${format}`, 'UNSUPPORTED_FORMAT');
    }
  }

  /**
   * Import TODOs
   */
  public async importTodos(options: ImportOptions): Promise<TodoItem[]> {
    const { format, mapping, validation = true, updateExisting = false, defaultValues = {} } = options;

    // This would implement the actual import logic based on format
    // For now, return empty array as placeholder
    throw new TodoSystemError('Import not implemented', 'IMPORT_NOT_SUPPORTED');
  }

  /**
   * Update views when TODO changes
   */
  private updateViews(todo: TodoItem, action: 'created' | 'updated', previousValues?: any): void {
    // Dimension view
    if (action === 'created') {
      this.dimensionViews.get(todo.dimension)?.add(todo.id);
    } else if (action === 'updated' && previousValues?.dimension !== todo.dimension) {
      this.dimensionViews.get(previousValues.dimension)?.delete(todo.id);
      this.dimensionViews.get(todo.dimension)?.add(todo.id);
    }

    // Category view
    if (action === 'created') {
      this.categoryViews.get(todo.category)?.add(todo.id);
    } else if (action === 'updated' && previousValues?.category !== todo.category) {
      this.categoryViews.get(previousValues.category)?.delete(todo.id);
      this.categoryViews.get(todo.category)?.add(todo.id);
    }

    // Status view
    if (action === 'created') {
      this.statusViews.get(todo.status)?.add(todo.id);
    } else if (action === 'updated' && previousValues?.status !== todo.status) {
      this.statusViews.get(previousValues.status)?.delete(todo.id);
      this.statusViews.get(todo.status)?.add(todo.id);
    }

    // Priority view
    if (action === 'created') {
      this.priorityViews.get(todo.priority)?.add(todo.id);
    } else if (action === 'updated' && previousValues?.priority !== todo.priority) {
      this.priorityViews.get(previousValues.priority)?.delete(todo.id);
      this.priorityViews.get(todo.priority)?.add(todo.id);
    }

    // Assignee view
    if (action === 'created' && todo.assignee) {
      if (!this.assigneeViews.has(todo.assignee)) {
        this.assigneeViews.set(todo.assignee, new Set());
      }
      this.assigneeViews.get(todo.assignee)!.add(todo.id);
    } else if (action === 'updated') {
      if (previousValues?.assignee) {
        this.assigneeViews.get(previousValues.assignee)?.delete(todo.id);
      }
      if (todo.assignee) {
        if (!this.assigneeViews.has(todo.assignee)) {
          this.assigneeViews.set(todo.assignee, new Set());
        }
        this.assigneeViews.get(todo.assignee)!.add(todo.id);
      }
    }

    // Circle view
    if (action === 'created' && todo.circleId) {
      if (!this.circleViews.has(todo.circleId)) {
        this.circleViews.set(todo.circleId, new Set());
      }
      this.circleViews.get(todo.circleId)!.add(todo.id);
    } else if (action === 'updated') {
      if (previousValues?.circleId) {
        this.circleViews.get(previousValues.circleId)?.delete(todo.id);
      }
      if (todo.circleId) {
        if (!this.circleViews.has(todo.circleId)) {
          this.circleViews.set(todo.circleId, new Set());
        }
        this.circleViews.get(todo.circleId)!.add(todo.id);
      }
    }

    // Tag views
    if (action === 'created') {
      todo.tags.forEach(tag => {
        if (!this.tagViews.has(tag)) {
          this.tagViews.set(tag, new Set());
        }
        this.tagViews.get(tag)!.add(todo.id);
      });
    } else if (action === 'updated' && previousValues?.tags !== todo.tags) {
      // Remove from old tag views
      (previousValues.tags as string[] || []).forEach(tag => {
        this.tagViews.get(tag)?.delete(todo.id);
      });
      // Add to new tag views
      todo.tags.forEach(tag => {
        if (!this.tagViews.has(tag)) {
          this.tagViews.set(tag, new Set());
        }
        this.tagViews.get(tag)!.add(todo.id);
      });
    }
  }

  /**
   * Remove TODO from all views
   */
  private removeFromAllViews(id: string): void {
    this.dimensionViews.forEach(view => view.delete(id));
    this.categoryViews.forEach(view => view.delete(id));
    this.statusViews.forEach(view => view.delete(id));
    this.priorityViews.forEach(view => view.delete(id));
    this.assigneeViews.forEach(view => view.delete(id));
    this.circleViews.forEach(view => view.delete(id));
    this.tagViews.forEach(view => view.delete(id));
  }

  /**
   * Update dependency graph
   */
  private updateDependencyGraph(todoId: string, newDependencies: string[], oldDependencies: string[]): void {
    // Remove old dependencies
    oldDependencies.forEach(depId => {
      const deps = this.dependencyGraph.get(todoId);
      if (deps) {
        deps.delete(depId);
      }
      
      const reverseDeps = this.reverseDependencyGraph.get(depId);
      if (reverseDeps) {
        reverseDeps.delete(todoId);
      }
    });

    // Add new dependencies
    newDependencies.forEach(depId => {
      if (!this.dependencyGraph.has(todoId)) {
        this.dependencyGraph.set(todoId, new Set());
      }
      this.dependencyGraph.get(todoId)!.add(depId);
      
      if (!this.reverseDependencyGraph.has(depId)) {
        this.reverseDependencyGraph.set(depId, new Set());
      }
      this.reverseDependencyGraph.get(depId)!.add(todoId);
    });
  }

  /**
   * Calculate WSJF score for TODO
   */
  private async calculateWSJFScore(todo: TodoItem): Promise<number> {
    if (!this.wsjfService) {
      return 0;
    }

    // This would integrate with the actual WSJF service
    // For now, return a mock score based on priority and category
    const priorityScores = {
      critical: 100,
      highest: 80,
      high: 60,
      medium: 40,
      low: 20,
      lowest: 10
    };

    const categoryMultipliers = {
      bug: 1.5,
      feature: 1.2,
      improvement: 1.0,
      research: 0.8,
      documentation: 0.6,
      testing: 1.1,
      deployment: 1.3,
      maintenance: 0.9
    };

    const baseScore = priorityScores[todo.priority];
    const multiplier = categoryMultipliers[todo.category];
    
    return Math.round(baseScore * multiplier);
  }

  /**
   * Handle status changes
   */
  private async handleStatusChange(
    todo: TodoItem, 
    oldStatus: TodoStatus, 
    newStatus: TodoStatus, 
    author: string
  ): Promise<void> {
    // Handle specific status transitions
    switch (newStatus) {
      case 'in_progress':
        if (oldStatus === 'not_started') {
          todo.actualDuration = 0; // Reset actual duration when starting
        }
        break;
        
      case 'completed':
        if (oldStatus === 'in_progress' && todo.actualDuration !== undefined) {
          // Calculate actual duration if not already set
          if (!todo.actualDuration) {
            todo.actualDuration = Date.now() - todo.createdAt.getTime();
          }
        }
        break;
    }
  }

  /**
   * Check dependent todos when a todo is completed
   */
  private async checkDependentTodos(completedTodoId: string): Promise<void> {
    const dependents = this.reverseDependencyGraph.get(completedTodoId) || new Set();
    
    for (const dependentId of dependents) {
      const dependent = this.todos.get(dependentId);
      if (dependent && dependent.status === 'blocked') {
        // Check if all dependencies are now completed
        const dependencies = this.dependencyGraph.get(dependentId) || new Set();
        const allCompleted = Array.from(dependencies).every(depId => {
          const dep = this.todos.get(depId);
          return dep && dep.status === 'completed';
        });

        if (allCompleted) {
          await this.unblockTodo(dependentId, 'system');
        }
      }
    }
  }

  /**
   * Create next recurring todo
   */
  private async createNextRecurringTodo(originalTodo: TodoItem): Promise<void> {
    if (!originalTodo.metadata.recurringPattern) {
      return;
    }

    const pattern = originalTodo.metadata.recurringPattern;
    let nextDueDate: Date | undefined;

    // Calculate next due date based on pattern
    const baseDate = originalTodo.dueDate || originalTodo.completedAt || new Date();
    
    switch (pattern.type) {
      case 'daily':
        nextDueDate = new Date(baseDate.getTime() + pattern.interval * 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        nextDueDate = new Date(baseDate.getTime() + pattern.interval * 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        nextDueDate = new Date(baseDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + pattern.interval);
        break;
      // Add other pattern types as needed
    }

    // Check if we should create the next occurrence
    if (nextDueDate && (!pattern.endDate || nextDueDate <= pattern.endDate)) {
      const occurrenceCount = originalTodo.metadata.history.filter(h => h.action === 'completed').length;
      if (!pattern.maxOccurrences || occurrenceCount < pattern.maxOccurrences) {
        await this.createTodo({
          title: originalTodo.title,
          description: originalTodo.description,
          status: 'not_started',
          priority: originalTodo.priority,
          category: originalTodo.category,
          dimension: originalTodo.dimension,
          assignee: originalTodo.assignee,
          circleId: originalTodo.circleId,
          estimatedDuration: originalTodo.estimatedDuration,
          dueDate: nextDueDate,
          tags: originalTodo.tags,
          dependencies: originalTodo.dependencies,
          blockedBy: originalTodo.blockedBy,
          metadata: {
            ...originalTodo.metadata,
            source: 'generated',
            sourceId: originalTodo.id
          },
          pdaPhase: originalTodo.pdaPhase
        });
      }
    }
  }

  /**
   * Add history entry
   */
  private addHistoryEntry(
    todoId: string, 
    action: TodoHistoryEntry['action'], 
    author: string, 
    details: Record<string, any>
  ): void {
    const todo = this.todos.get(todoId);
    if (!todo) return;

    const entry: TodoHistoryEntry = {
      id: uuidv4(),
      action,
      timestamp: new Date(),
      author,
      details,
      previousValue: details.previousValue,
      newValue: details.newValue
    };

    todo.metadata.history.push(entry);
  }

  /**
   * Extract mentions from comment content
   */
  private extractMentions(content: string): string[] {
    const mentions = content.match(/@(\w+)/g) || [];
    return mentions.map(mention => mention.substring(1));
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}