/**
 * Multi-Agent Coordination System
 * 
 * Implements advanced tracking features for multi-agent coordination,
 * collaboration workflows, and communication channels
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentCoordination,
  AgentParticipant,
  AgentAvailability,
  AgentPerformance,
  CollaborationType,
  CoordinationState,
  CoordinationWorkflow,
  WorkflowStep,
  WorkflowDependency,
  CommunicationChannel,
  CommunicationMessage,
  ExecutionTrackingError
} from './types';
import { OrchestrationFramework } from '../core/orchestration-framework';

export interface AgentCapability {
  name: string;
  description: string;
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  experience: number; // years
  lastUsed?: Date;
  certification?: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  type: 'human' | 'ai' | 'hybrid';
  role: string;
  capabilities: AgentCapability[];
  preferences: {
    collaborationStyle: 'leader' | 'follower' | 'collaborative' | 'independent';
    communicationChannels: string[];
    workHours?: { start: string; end: string };
    timezone: string;
  };
  status: 'online' | 'offline' | 'busy' | 'away';
  lastActivity: Date;
  metrics: {
    tasksCompleted: number;
    averageTaskDuration: number;
    successRate: number;
    collaborationScore: number;
    satisfactionScore: number;
  };
}

export interface CoordinationSession {
  id: string;
  name: string;
  description: string;
  type: CollaborationType;
  participants: string[];
  workflow: CoordinationWorkflow;
  communication: CommunicationChannel[];
  state: CoordinationState;
  startTime: Date;
  endTime?: Date;
  metadata: {
    priority: number;
    deadline?: Date;
    budget?: number;
    constraints: string[];
    goals: string[];
  };
  history: CoordinationEvent[];
}

export interface CoordinationEvent {
  id: string;
  timestamp: Date;
  type: 'session_started' | 'session_ended' | 'participant_joined' | 'participant_left' | 
        'step_started' | 'step_completed' | 'message_sent' | 'decision_made' | 
        'conflict_detected' | 'conflict_resolved' | 'milestone_reached';
  actor: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export class AgentCoordinationSystem extends EventEmitter {
  private agents: Map<string, AgentProfile> = new Map();
  private coordinations: Map<string, AgentCoordination> = new Map();
  private sessions: Map<string, CoordinationSession> = new Map();
  private workflows: Map<string, CoordinationWorkflow> = new Map();
  private communicationChannels: Map<string, CommunicationChannel> = new Map();
  private capabilityRegistry: Map<string, AgentCapability> = new Map();
  private isRunning: boolean = false;
  private coordinationInterval: NodeJS.Timeout | null = null;

  constructor(private orchestrationFramework: OrchestrationFramework) {
    super();
    this.initializeCapabilityRegistry();
  }

  /**
   * Start agent coordination system
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[AGENT_COORDINATION] System already running');
      return;
    }

    this.isRunning = true;
    console.log('[AGENT_COORDINATION] Starting agent coordination system');

    // Start coordination monitoring
    this.coordinationInterval = setInterval(() => {
      this.monitorCoordinations();
    }, 5000); // Monitor every 5 seconds

    // Initialize default agents if none exist
    if (this.agents.size === 0) {
      await this.createDefaultAgents();
    }

    console.log('[AGENT_COORDINATION] Agent coordination system started');
    this.emit('systemStarted');
  }

  /**
   * Stop agent coordination system
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.coordinationInterval) {
      clearInterval(this.coordinationInterval);
      this.coordinationInterval = null;
    }

    // End all active sessions
    for (const session of this.sessions.values()) {
      if (session.state === 'active') {
        await this.endCoordinationSession(session.id);
      }
    }

    console.log('[AGENT_COORDINATION] Agent coordination system stopped');
    this.emit('systemStopped');
  }

  /**
   * Register a new agent
   */
  public async registerAgent(agentData: Omit<AgentProfile, 'id' | 'metrics' | 'lastActivity'>): Promise<AgentProfile> {
    const agent: AgentProfile = {
      id: uuidv4(),
      lastActivity: new Date(),
      metrics: {
        tasksCompleted: 0,
        averageTaskDuration: 0,
        successRate: 100,
        collaborationScore: 50,
        satisfactionScore: 50
      },
      ...agentData
    };

    this.agents.set(agent.id, agent);

    console.log(`[AGENT_COORDINATION] Registered agent: ${agent.name} (${agent.id})`);
    this.emit('agentRegistered', agent);

    return agent;
  }

  /**
   * Update agent status
   */
  public async updateAgentStatus(agentId: string, status: AgentProfile['status']): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new ExecutionTrackingError(
        `Agent not found: ${agentId}`,
        'AGENT_NOT_FOUND',
        agentId
      );
    }

    agent.status = status;
    agent.lastActivity = new Date();

    console.log(`[AGENT_COORDINATION] Updated agent status: ${agent.name} to ${status}`);
    this.emit('agentStatusUpdated', { agent, status });
  }

  /**
   * Create coordination session
   */
  public async createCoordinationSession(
    name: string,
    type: CollaborationType,
    participantIds: string[],
    workflowId?: string,
    options: {
      description?: string;
      priority?: number;
      deadline?: Date;
      budget?: number;
      constraints?: string[];
      goals?: string[];
    } = {}
  ): Promise<CoordinationSession> {
    // Validate participants
    const participants = participantIds.map(id => this.agents.get(id)).filter(Boolean) as AgentProfile[];
    if (participants.length !== participantIds.length) {
      throw new ExecutionTrackingError(
        'One or more participants not found',
        'PARTICIPANTS_NOT_FOUND'
      );
    }

    // Get or create workflow
    let workflow: CoordinationWorkflow;
    if (workflowId) {
      workflow = this.workflows.get(workflowId)!;
      if (!workflow) {
        throw new ExecutionTrackingError(
          `Workflow not found: ${workflowId}`,
          'WORKFLOW_NOT_FOUND',
          workflowId
        );
      }
    } else {
      workflow = await this.createDefaultWorkflow(type, participants);
    }

    // Create communication channels
    const communication = await this.createCommunicationChannels(participants);

    const session: CoordinationSession = {
      id: uuidv4(),
      name,
      description: options.description || '',
      type,
      participants: participantIds,
      workflow,
      communication,
      state: 'initializing',
      startTime: new Date(),
      metadata: {
        priority: options.priority || 5,
        deadline: options.deadline,
        budget: options.budget,
        constraints: options.constraints || [],
        goals: options.goals || []
      },
      history: []
    };

    this.sessions.set(session.id, session);

    // Add session start event
    this.addSessionEvent(session.id, 'session_started', 'system', {
      participants: participantIds,
      workflowId: workflow.id
    });

    // Create agent coordination
    const coordination: AgentCoordination = {
      id: uuidv4(),
      name: `${name} Coordination`,
      participants: participants.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        capabilities: p.capabilities.map(c => c.name),
        status: this.mapAgentStatusToCoordinationStatus(p.status),
        availability: this.calculateAgentAvailability(p),
        performance: p.metrics
      })),
      collaborationType: type,
      state: 'active',
      workflow,
      communication
    };

    this.coordinations.set(coordination.id, coordination);

    // Start the session
    session.state = 'active';

    console.log(`[AGENT_COORDINATION] Created coordination session: ${session.name} (${session.id})`);
    this.emit('sessionCreated', session);

    return session;
  }

  /**
   * End coordination session
   */
  public async endCoordinationSession(sessionId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ExecutionTrackingError(
        `Session not found: ${sessionId}`,
        'SESSION_NOT_FOUND',
        sessionId
      );
    }

    session.state = 'completed';
    session.endTime = new Date();

    // Add session end event
    this.addSessionEvent(sessionId, 'session_ended', 'system', {
      reason: reason || 'Session completed normally',
      duration: session.endTime.getTime() - session.startTime.getTime()
    });

    // Update coordination state
    const coordination = Array.from(this.coordinations.values())
      .find(c => c.participants.some(p => session.participants.includes(p.id)));
    
    if (coordination) {
      coordination.state = 'completed';
    }

    console.log(`[AGENT_COORDINATION] Ended coordination session: ${session.name} (${sessionId})`);
    this.emit('sessionEnded', { session, reason });
  }

  /**
   * Add participant to session
   */
  public async addParticipantToSession(sessionId: string, agentId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    const agent = this.agents.get(agentId);
    
    if (!session) {
      throw new ExecutionTrackingError(
        `Session not found: ${sessionId}`,
        'SESSION_NOT_FOUND',
        sessionId
      );
    }

    if (!agent) {
      throw new ExecutionTrackingError(
        `Agent not found: ${agentId}`,
        'AGENT_NOT_FOUND',
        agentId
      );
    }

    if (session.participants.includes(agentId)) {
      return; // Already a participant
    }

    session.participants.push(agentId);

    // Add participant to coordination
    const coordination = Array.from(this.coordinations.values())
      .find(c => c.participants.some(p => session.participants.includes(p.id)));
    
    if (coordination) {
      coordination.participants.push({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        capabilities: agent.capabilities.map(c => c.name),
        status: this.mapAgentStatusToCoordinationStatus(agent.status),
        availability: this.calculateAgentAvailability(agent),
        performance: agent.metrics
      });
    }

    // Add participant event
    this.addSessionEvent(sessionId, 'participant_joined', agentId, {
      agentName: agent.name,
      agentRole: agent.role
    });

    console.log(`[AGENT_COORDINATION] Added participant ${agent.name} to session ${session.name}`);
    this.emit('participantAdded', { session, agent });
  }

  /**
   * Remove participant from session
   */
  public async removeParticipantFromSession(sessionId: string, agentId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    const agent = this.agents.get(agentId);
    
    if (!session) {
      throw new ExecutionTrackingError(
        `Session not found: ${sessionId}`,
        'SESSION_NOT_FOUND',
        sessionId
      );
    }

    const participantIndex = session.participants.indexOf(agentId);
    if (participantIndex === -1) {
      return; // Not a participant
    }

    session.participants.splice(participantIndex, 1);

    // Remove participant from coordination
    const coordination = Array.from(this.coordinations.values())
      .find(c => c.participants.some(p => session.participants.includes(p.id)));
    
    if (coordination) {
      const participantIndex = coordination.participants.findIndex(p => p.id === agentId);
      if (participantIndex !== -1) {
        coordination.participants.splice(participantIndex, 1);
      }
    }

    // Add participant event
    this.addSessionEvent(sessionId, 'participant_left', agentId, {
      agentName: agent.name,
      reason: reason || 'Removed from session'
    });

    console.log(`[AGENT_COORDINATION] Removed participant ${agent.name} from session ${session.name}`);
    this.emit('participantRemoved', { session, agent, reason });
  }

  /**
   * Start workflow step
   */
  public async startWorkflowStep(sessionId: string, stepId: string, assigneeId?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ExecutionTrackingError(
        `Session not found: ${sessionId}`,
        'SESSION_NOT_FOUND',
        sessionId
      );
    }

    const step = session.workflow.steps.find(s => s.id === stepId);
    if (!step) {
      throw new ExecutionTrackingError(
        `Workflow step not found: ${stepId}`,
        'STEP_NOT_FOUND',
        stepId
      );
    }

    step.status = 'in_progress';
    step.assignee = assigneeId;
    step.actualDuration = 0;

    // Update current step
    session.workflow.currentStep = session.workflow.steps.findIndex(s => s.id === stepId);

    // Add step start event
    this.addSessionEvent(sessionId, 'step_started', assigneeId || 'system', {
      stepId,
      stepName: step.name,
      assignee: assigneeId
    });

    console.log(`[AGENT_COORDINATION] Started workflow step: ${step.name} in session ${session.name}`);
    this.emit('stepStarted', { session, step, assignee: assigneeId });
  }

  /**
   * Complete workflow step
   */
  public async completeWorkflowStep(
    sessionId: string, 
    stepId: string, 
    outcomes: any[] = [],
    notes?: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ExecutionTrackingError(
        `Session not found: ${sessionId}`,
        'SESSION_NOT_FOUND',
        sessionId
      );
    }

    const step = session.workflow.steps.find(s => s.id === stepId);
    if (!step) {
      throw new ExecutionTrackingError(
        `Workflow step not found: ${stepId}`,
        'STEP_NOT_FOUND',
        stepId
      );
    }

    const startTime = step.actualDuration ? Date.now() - step.actualDuration : Date.now();
    step.status = 'completed';
    step.actualDuration = Date.now() - startTime;

    // Check if next steps can be started
    const nextSteps = this.getNextSteps(session.workflow, stepId);
    for (const nextStep of nextSteps) {
      if (this.canStartStep(session.workflow, nextStep.id)) {
        // Auto-start next step if no assignee required
        if (!nextStep.assignee) {
          await this.startWorkflowStep(sessionId, nextStep.id);
        }
      }
    }

    // Check if workflow is complete
    const allCompleted = session.workflow.steps.every(s => s.status === 'completed');
    if (allCompleted) {
      session.workflow.status = 'completed';
      await this.endCoordinationSession(sessionId, 'Workflow completed');
    }

    // Add step completion event
    this.addSessionEvent(sessionId, 'step_completed', step.assignee || 'system', {
      stepId,
      stepName: step.name,
      duration: step.actualDuration,
      outcomes,
      notes
    });

    console.log(`[AGENT_COORDINATION] Completed workflow step: ${step.name} in session ${session.name}`);
    this.emit('stepCompleted', { session, step, outcomes, notes });
  }

  /**
   * Send message in session
   */
  public async sendMessage(
    sessionId: string,
    from: string,
    to: string | string[],
    content: any,
    type: CommunicationMessage['type'] = 'message',
    priority: CommunicationMessage['priority'] = 'medium'
  ): Promise<CommunicationMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ExecutionTrackingError(
        `Session not found: ${sessionId}`,
        'SESSION_NOT_FOUND',
        sessionId
      );
    }

    const message: CommunicationMessage = {
      id: uuidv4(),
      from,
      to: Array.isArray(to) ? to : [to],
      type,
      content,
      timestamp: new Date(),
      priority,
      metadata: {
        sessionId,
        messageType: type
      }
    };

    // Add to communication channels
    for (const channel of session.communication) {
      if (channel.participants.includes(from) || 
          (Array.isArray(to) ? to.some(t => channel.participants.includes(t)) : channel.participants.includes(to))) {
        channel.messageHistory.push(message);
      }
    }

    // Add message event
    this.addSessionEvent(sessionId, 'message_sent', from, {
      messageId: message.id,
      to,
      type,
      priority
    });

    console.log(`[AGENT_COORDINATION] Sent message in session ${session.name} from ${from} to ${Array.isArray(to) ? to.join(', ') : to}`);
    this.emit('messageSent', { session, message });

    return message;
  }

  /**
   * Get agent by ID
   */
  public getAgent(agentId: string): AgentProfile | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  public getAgents(): AgentProfile[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): CoordinationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  public getSessions(): CoordinationSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get active sessions
   */
  public getActiveSessions(): CoordinationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.state === 'active');
  }

  /**
   * Get coordination by ID
   */
  public getCoordination(coordinationId: string): AgentCoordination | undefined {
    return this.coordinations.get(coordinationId);
  }

  /**
   * Get all coordinations
   */
  public getCoordinations(): AgentCoordination[] {
    return Array.from(this.coordinations.values());
  }

  /**
   * Find available agents for task
   */
  public async findAvailableAgents(
    requiredCapabilities: string[],
    excludeIds: string[] = [],
    maxResults: number = 10
  ): Promise<AgentProfile[]> {
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => 
        !excludeIds.includes(agent.id) &&
        agent.status === 'online' &&
        this.hasRequiredCapabilities(agent, requiredCapabilities)
      )
      .map(agent => ({
        agent,
        score: this.calculateAgentScore(agent, requiredCapabilities)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(item => item.agent);

    return availableAgents;
  }

  /**
   * Monitor coordinations
   */
  private async monitorCoordinations(): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.state !== 'active') continue;

      // Check for timeouts
      const now = new Date();
      if (session.metadata.deadline && now > session.metadata.deadline) {
        await this.endCoordinationSession(session.id, 'Deadline exceeded');
        continue;
      }

      // Check for inactive participants
      for (const participantId of session.participants) {
        const agent = this.agents.get(participantId);
        if (agent && (now.getTime() - agent.lastActivity.getTime()) > 300000) { // 5 minutes
          await this.updateAgentStatus(participantId, 'away');
        }
      }

      // Update participant availability
      const coordination = Array.from(this.coordinations.values())
        .find(c => c.participants.some(p => session.participants.includes(p.id)));
      
      if (coordination) {
        for (const participant of coordination.participants) {
          const agent = this.agents.get(participant.id);
          if (agent) {
            participant.availability = this.calculateAgentAvailability(agent);
            participant.performance = agent.metrics;
          }
        }
      }
    }
  }

  /**
   * Create default agents
   */
  private async createDefaultAgents(): Promise<void> {
    const defaultAgents: Omit<AgentProfile, 'id' | 'metrics' | 'lastActivity'>[] = [
      {
        name: 'Analyst Agent',
        type: 'ai',
        role: 'analyst',
        capabilities: [
          { name: 'data_analysis', description: 'Analyze complex data sets', level: 'advanced', experience: 5 },
          { name: 'pattern_recognition', description: 'Identify patterns in data', level: 'expert', experience: 7 },
          { name: 'report_generation', description: 'Generate detailed reports', level: 'intermediate', experience: 3 }
        ],
        preferences: {
          collaborationStyle: 'collaborative',
          communicationChannels: ['text', 'email'],
          timezone: 'UTC'
        },
        status: 'online'
      },
      {
        name: 'Orchestrator Agent',
        type: 'ai',
        role: 'orchestrator',
        capabilities: [
          { name: 'workflow_management', description: 'Manage complex workflows', level: 'expert', experience: 8 },
          { name: 'resource_allocation', description: 'Allocate resources efficiently', level: 'advanced', experience: 6 },
          { name: 'coordination', description: 'Coordinate multiple agents', level: 'expert', experience: 10 }
        ],
        preferences: {
          collaborationStyle: 'leader',
          communicationChannels: ['text', 'voice', 'video'],
          timezone: 'UTC'
        },
        status: 'online'
      },
      {
        name: 'Innovator Agent',
        type: 'ai',
        role: 'innovator',
        capabilities: [
          { name: 'creative_thinking', description: 'Generate innovative solutions', level: 'expert', experience: 6 },
          { name: 'research', description: 'Conduct deep research', level: 'advanced', experience: 5 },
          { name: 'prototyping', description: 'Create rapid prototypes', level: 'intermediate', experience: 4 }
        ],
        preferences: {
          collaborationStyle: 'independent',
          communicationChannels: ['text', 'email'],
          timezone: 'UTC'
        },
        status: 'online'
      }
    ];

    for (const agentData of defaultAgents) {
      await this.registerAgent(agentData);
    }
  }

  /**
   * Initialize capability registry
   */
  private initializeCapabilityRegistry(): void {
    const capabilities: AgentCapability[] = [
      { name: 'data_analysis', description: 'Analyze complex data sets', level: 'intermediate', experience: 0 },
      { name: 'pattern_recognition', description: 'Identify patterns in data', level: 'intermediate', experience: 0 },
      { name: 'report_generation', description: 'Generate detailed reports', level: 'intermediate', experience: 0 },
      { name: 'workflow_management', description: 'Manage complex workflows', level: 'intermediate', experience: 0 },
      { name: 'resource_allocation', description: 'Allocate resources efficiently', level: 'intermediate', experience: 0 },
      { name: 'coordination', description: 'Coordinate multiple agents', level: 'intermediate', experience: 0 },
      { name: 'creative_thinking', description: 'Generate innovative solutions', level: 'intermediate', experience: 0 },
      { name: 'research', description: 'Conduct deep research', level: 'intermediate', experience: 0 },
      { name: 'prototyping', description: 'Create rapid prototypes', level: 'intermediate', experience: 0 }
    ];

    for (const capability of capabilities) {
      this.capabilityRegistry.set(capability.name, capability);
    }
  }

  /**
   * Create default workflow
   */
  private async createDefaultWorkflow(
    type: CollaborationType,
    participants: AgentProfile[]
  ): Promise<CoordinationWorkflow> {
    const steps: WorkflowStep[] = [];

    switch (type) {
      case 'sequential':
        steps.push(
          {
            id: uuidv4(),
            name: 'Initialization',
            description: 'Initialize coordination session',
            assignee: participants[0]?.id,
            requiredCapabilities: ['coordination'],
            estimatedDuration: 300000, // 5 minutes
            status: 'pending',
            inputs: [],
            outputs: ['session_initialized'],
            metadata: {}
          },
          {
            id: uuidv4(),
            name: 'Execution',
            description: 'Execute main tasks',
            assignee: participants[1]?.id,
            requiredCapabilities: ['workflow_management'],
            estimatedDuration: 600000, // 10 minutes
            status: 'pending',
            inputs: ['session_initialized'],
            outputs: ['tasks_completed'],
            metadata: {}
          },
          {
            id: uuidv4(),
            name: 'Completion',
            description: 'Complete coordination session',
            assignee: participants[2]?.id,
            requiredCapabilities: ['coordination'],
            estimatedDuration: 300000, // 5 minutes
            status: 'pending',
            inputs: ['tasks_completed'],
            outputs: ['session_completed'],
            metadata: {}
          }
        );
        break;

      case 'parallel':
        for (let i = 0; i < participants.length; i++) {
          steps.push({
            id: uuidv4(),
            name: `Task ${i + 1}`,
            description: `Execute parallel task ${i + 1}`,
            assignee: participants[i]?.id,
            requiredCapabilities: participants[i]?.capabilities.map(c => c.name) || [],
            estimatedDuration: 600000, // 10 minutes
            status: 'pending',
            inputs: [],
            outputs: [`task_${i + 1}_completed`],
            metadata: {}
          });
        }
        break;

      case 'hierarchical':
        steps.push(
          {
            id: uuidv4(),
            name: 'Planning',
            description: 'Plan the coordination effort',
            assignee: participants[0]?.id,
            requiredCapabilities: ['workflow_management'],
            estimatedDuration: 600000, // 10 minutes
            status: 'pending',
            inputs: [],
            outputs: ['plan_completed'],
            metadata: {}
          }
        );

        for (let i = 1; i < participants.length; i++) {
          steps.push({
            id: uuidv4(),
            name: `Execution ${i}`,
            description: `Execute assigned task ${i}`,
            assignee: participants[i]?.id,
            requiredCapabilities: participants[i]?.capabilities.map(c => c.name) || [],
            estimatedDuration: 900000, // 15 minutes
            status: 'pending',
            inputs: ['plan_completed'],
            outputs: [`task_${i}_completed`],
            metadata: {}
          });
        }
        break;

      default:
        // Create a generic workflow
        steps.push({
          id: uuidv4(),
          name: 'Collaboration',
          description: 'Execute collaborative task',
          assignee: participants[0]?.id,
          requiredCapabilities: ['coordination'],
          estimatedDuration: 900000, // 15 minutes
          status: 'pending',
          inputs: [],
          outputs: ['collaboration_completed'],
          metadata: {}
        });
    }

    const workflow: CoordinationWorkflow = {
      id: uuidv4(),
      name: `${type} Workflow`,
      steps,
      dependencies: this.createWorkflowDependencies(steps),
      currentStep: 0,
      status: 'pending'
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  /**
   * Create workflow dependencies
   */
  private createWorkflowDependencies(steps: WorkflowStep[]): WorkflowDependency[] {
    const dependencies: WorkflowDependency[] = [];

    // Create simple sequential dependencies
    for (let i = 0; i < steps.length - 1; i++) {
      dependencies.push({
        from: steps[i].id,
        to: steps[i + 1].id,
        type: 'finish_to_start'
      });
    }

    return dependencies;
  }

  /**
   * Create communication channels
   */
  private async createCommunicationChannels(participants: AgentProfile[]): Promise<CommunicationChannel[]> {
    const channels: CommunicationChannel[] = [];

    // Create a message queue channel
    channels.push({
      id: uuidv4(),
      type: 'message_queue',
      configuration: {
        maxMessages: 1000,
        retentionPeriod: 86400000 // 24 hours
      },
      participants: participants.map(p => p.id),
      messageHistory: []
    });

    // Create a WebSocket channel for real-time communication
    channels.push({
      id: uuidv4(),
      type: 'websocket',
      configuration: {
        heartbeatInterval: 30000,
        maxConnections: participants.length
      },
      participants: participants.map(p => p.id),
      messageHistory: []
    });

    return channels;
  }

  /**
   * Add session event
   */
  private addSessionEvent(
    sessionId: string,
    type: CoordinationEvent['type'],
    actor: string,
    data: Record<string, any>
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const event: CoordinationEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      type,
      actor,
      data
    };

    session.history.push(event);
  }

  /**
   * Map agent status to coordination status
   */
  private mapAgentStatusToCoordinationStatus(status: AgentProfile['status']): AgentParticipant['status'] {
    switch (status) {
      case 'online': return 'active';
      case 'offline': return 'inactive';
      case 'busy': return 'busy';
      case 'away': return 'inactive';
      default: return 'inactive';
    }
  }

  /**
   * Calculate agent availability
   */
  private calculateAgentAvailability(agent: AgentProfile): AgentAvailability {
    const currentLoad = agent.status === 'busy' ? 100 : 0;
    const maxCapacity = 100;
    const availableSlots = agent.status === 'online' ? 5 : 0;
    
    return {
      currentLoad,
      maxCapacity,
      availableSlots,
      skills: agent.capabilities.map(c => c.name),
      preferences: agent.preferences
    };
  }

  /**
   * Check if agent has required capabilities
   */
  private hasRequiredCapabilities(agent: AgentProfile, requiredCapabilities: string[]): boolean {
    const agentCapabilities = agent.capabilities.map(c => c.name);
    return requiredCapabilities.every(cap => agentCapabilities.includes(cap));
  }

  /**
   * Calculate agent score for task matching
   */
  private calculateAgentScore(agent: AgentProfile, requiredCapabilities: string[]): number {
    let score = 0;
    
    // Capability matching score
    const agentCapabilities = agent.capabilities.map(c => c.name);
    const matchedCapabilities = requiredCapabilities.filter(cap => agentCapabilities.includes(cap));
    const capabilityScore = (matchedCapabilities.length / requiredCapabilities.length) * 40;
    
    // Performance score
    const performanceScore = (agent.metrics.successRate / 100) * 30;
    
    // Collaboration score
    const collaborationScore = (agent.metrics.collaborationScore / 100) * 20;
    
    // Availability score
    const availabilityScore = agent.status === 'online' ? 10 : 0;
    
    score = capabilityScore + performanceScore + collaborationScore + availabilityScore;
    
    return score;
  }

  /**
   * Get next steps in workflow
   */
  private getNextSteps(workflow: CoordinationWorkflow, completedStepId: string): WorkflowStep[] {
    return workflow.steps.filter(step => 
      workflow.dependencies.some(dep => 
        dep.from === completedStepId && dep.to === step.id
      )
    );
  }

  /**
   * Check if step can be started
   */
  private canStartStep(workflow: CoordinationWorkflow, stepId: string): boolean {
    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) return false;

    // Check if all dependencies are completed
    const dependencies = workflow.dependencies.filter(dep => dep.to === stepId);
    return dependencies.every(dep => {
      const fromStep = workflow.steps.find(s => s.id === dep.from);
      return fromStep && fromStep.status === 'completed';
    });
  }
}