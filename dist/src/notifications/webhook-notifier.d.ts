/**
 * Webhook Notification Service
 * HTTP/HTTPS webhook delivery with retry logic
 */
import { INotifier, NotificationPayload, NotificationResult, NotificationStatus, WebhookConfig } from './types';
export declare class WebhookNotifier implements INotifier {
    private config;
    private deliveryLog;
    constructor(config: WebhookConfig);
    /**
     * Send webhook notification with retry logic
     */
    send(payload: NotificationPayload): Promise<NotificationResult>;
    /**
     * Get delivery status of webhook notification
     */
    getStatus(notificationId: string): Promise<NotificationStatus>;
    /**
     * Cancel pending webhook notification
     */
    cancel(notificationId: string): Promise<boolean>;
    /**
     * Build webhook payload with HIPAA-compliant structure
     */
    private buildWebhookPayload;
    /**
     * Send webhook with exponential backoff retry
     */
    private sendWithRetry;
    /**
     * Delay helper for retry backoff
     */
    private delay;
    /**
     * Verify webhook endpoint connectivity
     */
    verifyEndpoint(recipientId: string): Promise<boolean>;
}
//# sourceMappingURL=webhook-notifier.d.ts.map