"use strict";
/**
 * User Study Tracking Module
 *
 * Tracks user interactions with alert icons and patterns for the user study
 * on alert icon effectiveness.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserStudyTracker = void 0;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
class UserStudyTracker {
    constructor(context) {
        var _a, _b;
        this.events = [];
        this.enabled = false;
        // Process Metrics Instrumentation (insight → commit tracking)
        this.insightTimestamps = new Map();
        const workspaceRoot = (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath;
        if (!workspaceRoot) {
            return;
        }
        this.outputPath = path.join(workspaceRoot, '.goalie', 'user_study_tracking.jsonl');
        // Check if tracking is enabled
        const config = vscode.workspace.getConfiguration('goalie');
        this.enabled = config.get('enableUserStudyTracking', false);
        // Generate anonymized user ID (hash of machine ID + extension install date)
        this.userId = this.generateUserId(context);
        // Ensure directory exists
        const dir = path.dirname(this.outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    generateUserId(context) {
        // Use extension install date + machine info to create stable but anonymized ID
        const installDate = context.globalState.get('goalie.installDate');
        if (!installDate) {
            const now = new Date().toISOString();
            context.globalState.update('goalie.installDate', now);
            return this.hashString(now + 'user');
        }
        return this.hashString(installDate + 'user');
    }
    hashString(str) {
        // Simple hash function for anonymization
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `user_${Math.abs(hash).toString(36)}`;
    }
    track(event) {
        if (!this.enabled) {
            return;
        }
        event.ts = new Date().toISOString();
        event.user_id = this.userId;
        this.events.push(event);
        this.flush();
    }
    flush() {
        if (this.events.length === 0) {
            return;
        }
        const event = this.events[this.events.length - 1];
        const line = JSON.stringify(event) + '\n';
        try {
            fs.appendFileSync(this.outputPath, line, 'utf8');
        }
        catch (error) {
            // Silently fail to avoid disrupting user experience
            console.error('Failed to write tracking event:', error);
        }
    }
    // Convenience methods for common events
    trackPatternDetected(pattern, circle, depth, cod) {
        this.track({
            ts: new Date().toISOString(),
            type: 'pattern_detected',
            pattern,
            circle,
            depth,
            cod,
        });
    }
    trackAlertDisplayed(pattern, alertVariant) {
        this.track({
            ts: new Date().toISOString(),
            type: 'alert_displayed',
            pattern,
            alert_variant: alertVariant,
        });
    }
    trackAlertClicked(pattern, interactionType) {
        this.track({
            ts: new Date().toISOString(),
            type: 'alert_clicked',
            pattern,
            interaction_type: interactionType,
        });
    }
    trackActionTaken(pattern, actionType, timeToActionSec) {
        this.track({
            ts: new Date().toISOString(),
            type: 'action_taken',
            pattern,
            action_type: actionType,
            time_to_action_sec: timeToActionSec,
        });
    }
    trackInsightCreated(insightId, pattern, circle) {
        this.insightTimestamps.set(insightId, new Date().toISOString());
        this.track({
            ts: new Date().toISOString(),
            type: 'insight_created',
            insight_id: insightId,
            pattern,
            circle,
        });
    }
    trackInsightCommitted(insightId, commitId) {
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
    trackContextSwitch(fromTool, toTool) {
        this.track({
            ts: new Date().toISOString(),
            type: 'context_switch',
            from_tool: fromTool,
            to_tool: toTool,
        });
    }
    trackActionCompletionRate(cycleId, completed, total) {
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
exports.UserStudyTracker = UserStudyTracker;
//# sourceMappingURL=tracking.js.map