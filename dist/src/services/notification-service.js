export class NotificationService {
    notifications = new Map();
    async sendNotification(analysisId, providerId, channel, priority, message) {
        const notification = {
            id: this.generateNotificationId(),
            analysisId,
            providerId,
            channel,
            priority,
            message,
            status: 'pending',
        };
        // Simulate sending notification
        await this.sendViaChannel(notification);
        this.notifications.set(notification.id, notification);
        return notification;
    }
    async notifyProvider(analysis, providerId) {
        const notifications = [];
        const priority = this.determinePriority(analysis);
        // Determine channels based on priority
        const channels = this.getChannelsForPriority(priority);
        for (const channel of channels) {
            const message = this.formatMessage(analysis, channel);
            const notification = await this.sendNotification(analysis.id, providerId, channel, priority, message);
            notifications.push(notification);
        }
        return notifications;
    }
    async getNotificationStatus(notificationId) {
        return this.notifications.get(notificationId) || null;
    }
    async markAsDelivered(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (notification) {
            notification.status = 'delivered';
            notification.deliveredAt = new Date().toISOString();
        }
    }
    async markAsRead(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (notification) {
            notification.status = 'read';
            notification.readAt = new Date().toISOString();
        }
    }
    async sendViaChannel(notification) {
        // Simulate channel-specific sending
        await this.delay(100);
        switch (notification.channel) {
            case 'email':
                await this.sendEmail(notification);
                break;
            case 'sms':
                await this.sendSMS(notification);
                break;
            case 'push':
                await this.sendPushNotification(notification);
                break;
            case 'in-app':
                await this.sendInAppNotification(notification);
                break;
        }
        notification.status = 'sent';
        notification.sentAt = new Date().toISOString();
    }
    async sendEmail(notification) {
        // Email sending logic
        console.log(`Sending email to provider ${notification.providerId}`);
    }
    async sendSMS(notification) {
        // SMS sending logic
        console.log(`Sending SMS to provider ${notification.providerId}`);
    }
    async sendPushNotification(notification) {
        // Push notification logic
        console.log(`Sending push notification to provider ${notification.providerId}`);
    }
    async sendInAppNotification(notification) {
        // In-app notification logic
        console.log(`Sending in-app notification to provider ${notification.providerId}`);
    }
    determinePriority(analysis) {
        const criticalRisks = analysis.riskFactors.filter(r => r.severity === 'critical');
        const highRisks = analysis.riskFactors.filter(r => r.severity === 'high');
        // Critical risks always trigger urgent priority
        if (criticalRisks.length > 0) {
            return 'urgent';
        }
        // Low verification score with high risks is urgent
        if (analysis.verificationScore < 0.7 && highRisks.length > 0) {
            return 'urgent';
        }
        // High risks or very low verification score
        if (highRisks.length > 0 || analysis.verificationScore < 0.5) {
            return 'high';
        }
        // Low confidence or moderately low verification
        if (analysis.confidence < 0.8 || analysis.verificationScore < 0.7) {
            return 'medium';
        }
        // Moderate confidence
        if (analysis.confidence < 0.9) {
            return 'medium';
        }
        return 'low';
    }
    getChannelsForPriority(priority) {
        switch (priority) {
            case 'urgent':
                return ['sms', 'push', 'email', 'in-app'];
            case 'high':
                return ['push', 'email', 'in-app'];
            case 'medium':
                return ['email', 'in-app'];
            case 'low':
                return ['in-app'];
        }
    }
    formatMessage(analysis, channel) {
        const shortMessage = `New analysis for patient ${analysis.patientId}`;
        const detailedMessage = `${shortMessage}\nDiagnosis: ${analysis.diagnosis.join(', ')}\nConfidence: ${(analysis.confidence * 100).toFixed(1)}%`;
        switch (channel) {
            case 'sms':
                return shortMessage;
            case 'push':
                return shortMessage;
            case 'email':
            case 'in-app':
                return detailedMessage;
        }
    }
    generateNotificationId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=notification-service.js.map