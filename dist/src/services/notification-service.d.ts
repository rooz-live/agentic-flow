import { ProviderNotification, MedicalAnalysis } from '../types/medical';
export declare class NotificationService {
    private notifications;
    sendNotification(analysisId: string, providerId: string, channel: ProviderNotification['channel'], priority: ProviderNotification['priority'], message: string): Promise<ProviderNotification>;
    notifyProvider(analysis: MedicalAnalysis, providerId: string): Promise<ProviderNotification[]>;
    getNotificationStatus(notificationId: string): Promise<ProviderNotification | null>;
    markAsDelivered(notificationId: string): Promise<void>;
    markAsRead(notificationId: string): Promise<void>;
    private sendViaChannel;
    private sendEmail;
    private sendSMS;
    private sendPushNotification;
    private sendInAppNotification;
    private determinePriority;
    private getChannelsForPriority;
    private formatMessage;
    private generateNotificationId;
    private delay;
}
//# sourceMappingURL=notification-service.d.ts.map