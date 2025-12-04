/**
 * Email Notification Service
 * SMTP-based email delivery with HIPAA compliance
 */
import { INotifier, NotificationPayload, NotificationResult, NotificationStatus, EmailConfig } from './types';
export declare class EmailNotifier implements INotifier {
    private config;
    private deliveryLog;
    constructor(config: EmailConfig);
    /**
     * Send email notification with HIPAA-compliant encryption
     */
    send(payload: NotificationPayload): Promise<NotificationResult>;
    /**
     * Get delivery status of email notification
     */
    getStatus(notificationId: string): Promise<NotificationStatus>;
    /**
     * Cancel pending email notification
     */
    cancel(notificationId: string): Promise<boolean>;
    /**
     * Build email content from notification payload
     */
    private buildEmailContent;
    /**
     * Get color code for priority level
     */
    private getPriorityColor;
    /**
     * Send email via SMTP (simulated for now)
     */
    private sendEmail;
}
//# sourceMappingURL=email-notifier.d.ts.map