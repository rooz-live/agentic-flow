/**
 * User Study Tracking Module
 *
 * Tracks user interactions with alert icons and patterns for the user study
 * on alert icon effectiveness.
 */
import * as vscode from 'vscode';
export interface TrackingEvent {
    ts: string;
    type: 'pattern_detected' | 'alert_displayed' | 'alert_clicked' | 'alert_hovered' | 'tooltip_viewed' | 'action_taken';
    pattern?: string;
    circle?: string;
    depth?: number;
    cod?: number;
    alert_variant?: string;
    user_id?: string;
    interaction_type?: 'click' | 'hover' | 'tooltip_view';
    action_type?: 'code_fix' | 'observability_action' | 'manual_fix';
    time_to_action_sec?: number;
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
}
//# sourceMappingURL=tracking.d.ts.map