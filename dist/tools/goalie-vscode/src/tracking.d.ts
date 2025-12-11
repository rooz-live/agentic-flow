/**
 * User Study Tracking Module
 *
 * Tracks user interactions with alert icons and patterns for the user study
 * on alert icon effectiveness.
 */
import * as vscode from 'vscode';
export interface TrackingEvent {
    ts: string;
    type: 'pattern_detected' | 'alert_displayed' | 'alert_clicked' | 'alert_hovered' | 'tooltip_viewed' | 'action_taken' | 'insight_created' | 'insight_committed' | 'context_switch' | 'action_completion_rate';
    pattern?: string;
    circle?: string;
    depth?: number;
    cod?: number;
    alert_variant?: string;
    user_id?: string;
    interaction_type?: 'click' | 'hover' | 'tooltip_view';
    action_type?: 'code_fix' | 'observability_action' | 'manual_fix';
    time_to_action_sec?: number;
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
export declare class UserStudyTracker {
    private events;
    private outputPath;
    private enabled;
    private userId;
    constructor(context: vscode.ExtensionContext);
    private generateUserId;
    private hashString;
    track(event: TrackingEvent): void;
    private flush;
    trackPatternDetected(pattern: string, circle: string, depth: number, cod: number): void;
    trackAlertDisplayed(pattern: string, alertVariant: string): void;
    trackAlertClicked(pattern: string, interactionType: 'click' | 'hover' | 'tooltip_view'): void;
    trackActionTaken(pattern: string, actionType: 'code_fix' | 'observability_action' | 'manual_fix', timeToActionSec: number): void;
    private insightTimestamps;
    trackInsightCreated(insightId: string, pattern: string, circle: string): void;
    trackInsightCommitted(insightId: string, commitId: string): void;
    trackContextSwitch(fromTool: string, toTool: string): void;
    trackActionCompletionRate(cycleId: string, completed: number, total: number): void;
}
//# sourceMappingURL=tracking.d.ts.map