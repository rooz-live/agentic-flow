/**
 * SMS Notification Service
 * Twilio/AWS SNS-based SMS delivery with HIPAA compliance
 */
import { INotifier, NotificationPayload, NotificationResult, NotificationStatus, SMSConfig } from './types';
export declare class SMSNotifier implements INotifier {
    private config;
    private deliveryLog;
    private readonly maxSmsLength;
    constructor(config: SMSConfig);
    /**
     * Send SMS notification with character limit enforcement
     */
    send(payload: NotificationPayload): Promise<NotificationResult>;
    /**
     * Get delivery status of SMS notification
     */
    getStatus(notificationId: string): Promise<NotificationStatus>;
    /**
     * Cancel pending SMS notification
     */
    cancel(notificationId: string): Promise<boolean>;
    /**
     * Build SMS content from notification payload
     */
    private buildSMSContent;
    /**
     * Format phone number to E.164 standard
     */
    private formatPhoneNumber;
    /**
     * Send SMS via provider (Twilio/AWS SNS)
     */
    private sendSMS;
    /**
     * Get SMS delivery report from provider
     */
    getDeliveryReport(messageId: string): Promise<{
        status: string;
        errorCode?: string;
        errorMessage?: string;
    }>;
}
//# sourceMappingURL=sms-notifier.d.ts.map