/**
 * User Study Tracking Module
 *
 * Tracks user interactions with alert icons and patterns for the user study
 * on alert icon effectiveness.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface TrackingEvent {
  ts: string;
  type: 'pattern_detected' | 'alert_displayed' | 'alert_clicked' | 'alert_hovered' | 'tooltip_viewed' | 'action_taken' | 'insight_created' | 'insight_committed' | 'context_switch' | 'action_completion_rate';
  pattern?: string;
  circle?: string;
  depth?: number;
  cod?: number;
  alert_variant?: string;
  user_id?: string; // anonymized
  interaction_type?: 'click' | 'hover' | 'tooltip_view';
  action_type?: 'code_fix' | 'observability_action' | 'manual_fix';
  time_to_action_sec?: number;
  // Process metrics instrumentation
  insight_id?: string;
  commit_id?: string;
  time_to_commit_sec?: number;
  from_tool?: string;
  to_tool?: string;
  cycle_id?: string;
  completed?: number;
  total?: number;
  rate?: number;
  [key: string]: any;
}

export class UserStudyTracker {
  private events: TrackingEvent[] = [];
  private outputPath!: string;
  private enabled: boolean = false;
  private userId!: string;

  constructor(context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      return;
    }

    this.outputPath = path.join(workspaceRoot, '.goalie', 'user_study_tracking.jsonl');

    // Check if tracking is enabled
    const config = vscode.workspace.getConfiguration('goalie');
    this.enabled = config.get<boolean>('enableUserStudyTracking', false);

    // Generate anonymized user ID (hash of machine ID + extension install date)
    this.userId = this.generateUserId(context);

    // Ensure directory exists
    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private generateUserId(context: vscode.ExtensionContext): string {
    // Use extension install date + machine info to create stable but anonymized ID
    const installDate = context.globalState.get<string>('goalie.installDate');
    if (!installDate) {
      const now = new Date().toISOString();
      context.globalState.update('goalie.installDate', now);
      return this.hashString(now + 'user');
    }
    return this.hashString(installDate + 'user');
  }

  private hashString(str: string): string {
    // Simple hash function for anonymization
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `user_${Math.abs(hash).toString(36)}`;
  }

  track(event: TrackingEvent): void {
    if (!this.enabled) {
      return;
    }

    event.ts = new Date().toISOString();
    event.user_id = this.userId;
    this.events.push(event);
    this.flush();
  }

  private flush(): void {
    if (this.events.length === 0) {
      return;
    }

    const event = this.events[this.events.length - 1];
    const line = JSON.stringify(event) + '\n';

    try {
      fs.appendFileSync(this.outputPath, line, 'utf8');
    } catch (error) {
      // Silently fail to avoid disrupting user experience
      console.error('Failed to write tracking event:', error);
    }
  }

  // Convenience methods for common events
  trackPatternDetected(pattern: string, circle: string, depth: number, cod: number): void {
    this.track({
      ts: new Date().toISOString(),
      type: 'pattern_detected',
      pattern,
      circle,
      depth,
      cod,
    });
  }

  trackAlertDisplayed(pattern: string, alertVariant: string): void {
    this.track({
      ts: new Date().toISOString(),
      type: 'alert_displayed',
      pattern,
      alert_variant: alertVariant,
    });
  }

  trackAlertClicked(pattern: string, interactionType: 'click' | 'hover' | 'tooltip_view'): void {
    this.track({
      ts: new Date().toISOString(),
      type: 'alert_clicked',
      pattern,
      interaction_type: interactionType,
    });
  }

  trackActionTaken(pattern: string, actionType: 'code_fix' | 'observability_action' | 'manual_fix', timeToActionSec: number): void {
    this.track({
      ts: new Date().toISOString(),
      type: 'action_taken',
      pattern,
      action_type: actionType,
      time_to_action_sec: timeToActionSec,
    });
  }

  // Process Metrics Instrumentation (insight → commit tracking)
  private insightTimestamps: Map<string, string> = new Map();

  trackInsightCreated(insightId: string, pattern: string, circle: string): void {
    this.insightTimestamps.set(insightId, new Date().toISOString());
    this.track({
      ts: new Date().toISOString(),
      type: 'insight_created',
      insight_id: insightId,
      pattern,
      circle,
    });
  }

  trackInsightCommitted(insightId: string, commitId: string): void {
    const insightTs = this.insightTimestamps.get(insightId);
    let timeToCommitSec = 0;
    if (insightTs) {
      timeToCommitSec = (new Date().getTime() - new Date(insightTs).getTime()) / 1000;
    }
    this.track({
      ts: new Date().toISOString(),
      type: 'insight_committed',
      insight_id: insightId,
      commit_id: commitId,
      time_to_commit_sec: timeToCommitSec,
    });
    this.insightTimestamps.delete(insightId);
  }

  trackContextSwitch(fromTool: string, toTool: string): void {
    this.track({
      ts: new Date().toISOString(),
      type: 'context_switch',
      from_tool: fromTool,
      to_tool: toTool,
    });
  }

  trackActionCompletionRate(cycleId: string, completed: number, total: number): void {
    this.track({
      ts: new Date().toISOString(),
      type: 'action_completion_rate',
      cycle_id: cycleId,
      completed,
      total,
      rate: total > 0 ? (completed / total) * 100 : 0,
    });
  }
}
