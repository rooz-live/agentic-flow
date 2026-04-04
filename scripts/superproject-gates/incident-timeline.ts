/**
 * Incident Timeline
 *
 * Automatic logging and tracking of provider events:
 * - Log all provider events to syslog sink
 * - Include timestamp, event type, severity
 * - Track incident lifecycle (open, investigating, resolved)
 * - Generate incident reports
 *
 * Security:
 * - Syslog sink credentials from environment variables
 * - No hardcoded credentials
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ProviderEvent {
  provider: 'hivelocity' | 'aws';
  eventType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details: any;
  timestamp: Date;
}

export interface Incident {
  id?: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  provider: string;
  created: Date;
  updated?: Date;
}

export interface IncidentStatus {
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  notes?: string;
}

export interface IncidentEvent {
  id: string;
  timestamp: Date;
  type: 'created' | 'updated' | 'comment' | 'action';
  details: string;
  author: string;
}

export interface IncidentMetrics {
  duration: number;
  impact: string;
  affectedServices: string[];
  resolutionTime?: number;
}

export interface IncidentReport {
  incident: Incident;
  timeline: IncidentEvent[];
  metrics: IncidentMetrics;
  recommendations: string[];
}

// ============================================================================
// Incident Timeline Class
// ============================================================================

export class IncidentTimeline {
  private syslogSink: string;
  private syslogPort: number;
  private incidents: Map<string, Incident> = new Map();
  private incidentEvents: Map<string, IncidentEvent[]> = new Map();
  private providerEvents: ProviderEvent[] = [];

  constructor(syslogSink: string, syslogPort: number = 6514) {
    this.syslogSink = syslogSink;
    this.syslogPort = syslogPort;
  }

  /**
   * Log provider event to syslog sink
   */
  async logProviderEvent(event: ProviderEvent): Promise<void> {
    try {
      // Store event locally
      this.providerEvents.push(event);

      // In a real implementation, send to syslog sink
      // await this.sendToSyslog(event);

      console.log(`[Syslog] Event logged:`, {
        provider: event.provider,
        eventType: event.eventType,
        severity: event.severity,
        message: event.message,
        timestamp: event.timestamp,
      });
    } catch (error) {
      console.error('Failed to log provider event:', error);
      throw error;
    }
  }

  /**
   * Create new incident
   */
  async createIncident(incident: Incident): Promise<string> {
    const incidentId = incident.id || this.generateIncidentId();
    incident.id = incidentId;
    incident.created = incident.created || new Date();
    incident.updated = incident.created;

    // Store incident
    this.incidents.set(incidentId, incident);

    // Create initial event
    const event: IncidentEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'created',
      details: `Incident created: ${incident.title}`,
      author: 'system',
    };

    this.incidentEvents.set(incidentId, [event]);

    // Log to syslog
    await this.logProviderEvent({
      provider: incident.provider as 'hivelocity' | 'aws',
      eventType: 'incident_created',
      severity: incident.severity,
      message: `Incident ${incidentId} created: ${incident.title}`,
      details: incident,
      timestamp: new Date(),
    });

    return incidentId;
  }

  /**
   * Update incident status
   */
  async updateIncident(incidentId: string, status: IncidentStatus): Promise<void> {
    const incident = this.incidents.get(incidentId);

    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    // Update incident
    incident.status = status.status;
    incident.updated = new Date();

    // Add event
    const event: IncidentEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'updated',
      details: `Status changed to ${status.status}${status.notes ? `: ${status.notes}` : ''}`,
      author: 'system',
    };

    const events = this.incidentEvents.get(incidentId) || [];
    events.push(event);
    this.incidentEvents.set(incidentId, events);

    // Log to syslog
    await this.logProviderEvent({
      provider: incident.provider as 'hivelocity' | 'aws',
      eventType: 'incident_updated',
      severity: incident.severity,
      message: `Incident ${incidentId} status changed to ${status.status}`,
      details: { incidentId, status },
      timestamp: new Date(),
    });
  }

  /**
   * Get incident timeline
   */
  async getIncidentTimeline(incidentId: string): Promise<IncidentEvent[]> {
    return this.incidentEvents.get(incidentId) || [];
  }

  /**
   * Generate incident report
   */
  async generateIncidentReport(incidentId: string): Promise<IncidentReport> {
    const incident = this.incidents.get(incidentId);

    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    const timeline = await this.getIncidentTimeline(incidentId);
    const metrics = this.calculateIncidentMetrics(incident, timeline);
    const recommendations = this.generateRecommendations(incident, timeline, metrics);

    return {
      incident,
      timeline,
      metrics,
      recommendations,
    };
  }

  /**
   * Get all incidents
   */
  getIncidents(): Incident[] {
    return Array.from(this.incidents.values());
  }

  /**
   * Get incident by ID
   */
  getIncident(incidentId: string): Incident | undefined {
    return this.incidents.get(incidentId);
  }

  /**
   * Get provider events
   */
  getProviderEvents(since?: Date): ProviderEvent[] {
    if (!since) {
      return [...this.providerEvents];
    }
    return this.providerEvents.filter(e => e.timestamp >= since);
  }

  /**
   * Calculate incident metrics
   */
  private calculateIncidentMetrics(incident: Incident, timeline: IncidentEvent[]): IncidentMetrics {
    const createdEvent = timeline.find(e => e.type === 'created');
    const resolvedEvent = timeline.find(e => 
      e.type === 'updated' && e.details.includes('resolved')
    );

    const duration = resolvedEvent
      ? resolvedEvent.timestamp.getTime() - incident.created.getTime()
      : Date.now() - incident.created.getTime();

    const resolutionTime = resolvedEvent
      ? resolvedEvent.timestamp.getTime() - incident.created.getTime()
      : undefined;

    const impact = this.determineImpact(incident, timeline);
    const affectedServices = this.extractAffectedServices(incident, timeline);

    return {
      duration,
      impact,
      affectedServices,
      resolutionTime,
    };
  }

  /**
   * Determine incident impact
   */
  private determineImpact(incident: Incident, timeline: IncidentEvent[]): string {
    if (incident.severity === 'critical') {
      return 'Critical - Major service disruption';
    } else if (incident.severity === 'high') {
      return 'High - Significant service degradation';
    } else if (incident.severity === 'medium') {
      return 'Medium - Partial service impact';
    } else {
      return 'Low - Minimal service impact';
    }
  }

  /**
   * Extract affected services from incident details
   */
  private extractAffectedServices(incident: Incident, timeline: IncidentEvent[]): string[] {
    const services: string[] = [];

    // Extract from incident description
    if (incident.description) {
      const matches = incident.description.match(/(?:service|component|system):\s*([^\n,]+)/gi);
      if (matches) {
        services.push(...matches.map(m => m.split(':')[1].trim()));
      }
    }

    // Extract from timeline events
    for (const event of timeline) {
      const matches = event.details.match(/(?:service|component|system):\s*([^\n,]+)/gi);
      if (matches) {
        services.push(...matches.map(m => m.split(':')[1].trim()));
      }
    }

    return [...new Set(services)]; // Remove duplicates
  }

  /**
   * Generate recommendations based on incident
   */
  private generateRecommendations(
    incident: Incident,
    timeline: IncidentEvent[],
    metrics: IncidentMetrics
  ): string[] {
    const recommendations: string[] = [];

    // Based on severity
    if (incident.severity === 'critical' || incident.severity === 'high') {
      recommendations.push('Conduct post-incident review with all stakeholders');
      recommendations.push('Update runbooks and documentation');
    }

    // Based on duration
    if (metrics.duration > 3600000) { // > 1 hour
      recommendations.push('Review incident response procedures to reduce resolution time');
      recommendations.push('Consider implementing automated remediation');
    }

    // Based on affected services
    if (metrics.affectedServices.length > 1) {
      recommendations.push('Review dependencies between affected services');
      recommendations.push('Implement service health checks and circuit breakers');
    }

    // Based on resolution time
    if (!metrics.resolutionTime) {
      recommendations.push('Incident still in progress - ensure regular status updates');
    } else if (metrics.resolutionTime > 1800000) { // > 30 minutes
      recommendations.push('Review escalation procedures and on-call rotation');
    }

    return recommendations;
  }

  /**
   * Generate unique incident ID
   */
  private generateIncidentId(): string {
    return `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send event to syslog sink (placeholder)
   */
  private async sendToSyslog(event: ProviderEvent): Promise<void> {
    // In a real implementation, this would send to the syslog sink
    // using a library like syslog-pro or dgram
    console.log(`[Syslog Sink ${this.syslogSink}:${this.syslogPort}]`, event);
  }
}

/**
 * Create incident timeline from environment variables
 */
export function createIncidentTimelineFromEnv(): IncidentTimeline {
  const syslogSink = process.env.SYSLOG_SINK_HOST || 'localhost';
  const syslogPort = parseInt(process.env.SYSLOG_SINK_PORT || '6514', 10);

  return new IncidentTimeline(syslogSink, syslogPort);
}
