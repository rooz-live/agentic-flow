/**
 * Provider Service
 * Manages healthcare provider interactions and notifications
 */
export class ProviderService {
    providers = new Map();
    pendingReviews = new Map();
    reviews = new Map();
    constructor() {
        // Initialize with default provider
        this.addProvider({
            id: 'default-provider',
            name: 'Dr. Default',
            specialty: 'General Medicine',
            credentials: ['MD', 'FACP'],
            licenseNumber: 'MED-12345',
            email: 'provider@example.com',
            phone: '+1-555-0100',
            notificationPreferences: {
                email: true,
                sms: true,
                push: true,
                urgentOnly: false,
                minimumSeverity: 'medium'
            }
        });
    }
    /**
     * Add a healthcare provider
     */
    addProvider(provider) {
        this.providers.set(provider.id, provider);
    }
    /**
     * Get provider by ID
     */
    getProvider(id) {
        return this.providers.get(id) || null;
    }
    /**
     * Notify provider about analysis requiring review
     */
    async notifyProvider(analysisId, analysis, urgent = false) {
        try {
            // Determine priority
            const priority = this.determinePriority(analysis, urgent);
            // Get default provider (in production, use assignment logic)
            const provider = Array.from(this.providers.values())[0];
            if (!provider) {
                throw new Error('No provider available');
            }
            // Check notification preferences
            if (this.shouldNotify(provider.notificationPreferences, priority)) {
                // Send notifications
                await this.sendNotifications(provider, analysisId, analysis, priority);
                // Add to pending reviews
                this.pendingReviews.set(analysisId, {
                    analysisId,
                    priority,
                    timestamp: new Date(),
                    notified: true
                });
                console.log(`Provider ${provider.name} notified about analysis ${analysisId}`);
            }
        }
        catch (error) {
            console.error('Error notifying provider:', error);
            throw error;
        }
    }
    /**
     * Submit provider review
     */
    async submitReview(analysisId, reviewData) {
        try {
            // Get provider (in production, from authentication)
            const provider = Array.from(this.providers.values())[0];
            if (!provider) {
                throw new Error('No provider found');
            }
            const review = {
                providerId: provider.id,
                providerName: provider.name,
                timestamp: new Date(),
                decision: reviewData.decision,
                comments: reviewData.comments,
                modifications: reviewData.modifications
            };
            this.reviews.set(analysisId, review);
            // Remove from pending reviews
            this.pendingReviews.delete(analysisId);
            console.log(`Provider review submitted for analysis ${analysisId}: ${reviewData.decision}`);
        }
        catch (error) {
            console.error('Error submitting review:', error);
            throw error;
        }
    }
    /**
     * Get pending reviews
     */
    async getPendingReviews() {
        return Array.from(this.pendingReviews.values());
    }
    /**
     * Get review for analysis
     */
    async getReview(analysisId) {
        return this.reviews.get(analysisId) || null;
    }
    /**
     * Determine notification priority
     */
    determinePriority(analysis, urgent) {
        if (urgent)
            return 'urgent';
        // Check for emergency warnings
        const hasEmergency = analysis.warnings.some(w => w.type === 'emergency');
        if (hasEmergency)
            return 'urgent';
        // Check confidence score
        if (analysis.confidenceScore.overall < 0.50)
            return 'high';
        if (analysis.confidenceScore.overall < 0.70)
            return 'medium';
        // Check for hallucination warnings
        const hasHallucination = analysis.warnings.some(w => w.type === 'hallucination');
        if (hasHallucination)
            return 'high';
        return 'medium';
    }
    /**
     * Check if provider should be notified based on preferences
     */
    shouldNotify(prefs, priority) {
        if (prefs.urgentOnly && priority !== 'urgent') {
            return false;
        }
        const severityLevels = ['low', 'medium', 'high', 'urgent'];
        const minIndex = severityLevels.indexOf(prefs.minimumSeverity);
        const currentIndex = severityLevels.indexOf(priority);
        return currentIndex >= minIndex;
    }
    /**
     * Send notifications via configured channels
     */
    async sendNotifications(provider, analysisId, analysis, priority) {
        const prefs = provider.notificationPreferences;
        // Email notification
        if (prefs.email) {
            await this.sendEmail(provider.email, analysisId, analysis, priority);
        }
        // SMS notification
        if (prefs.sms && provider.phone) {
            await this.sendSMS(provider.phone, analysisId, analysis, priority);
        }
        // Push notification
        if (prefs.push) {
            await this.sendPushNotification(provider.id, analysisId, analysis, priority);
        }
    }
    /**
     * Send email notification
     */
    async sendEmail(email, analysisId, analysis, priority) {
        // In production, integrate with email service (SendGrid, AWS SES, etc.)
        console.log(`📧 Email sent to ${email}:`);
        console.log(`   Priority: ${priority.toUpperCase()}`);
        console.log(`   Analysis ID: ${analysisId}`);
        console.log(`   Confidence: ${(analysis.confidenceScore.overall * 100).toFixed(1)}%`);
        console.log(`   Requires Review: ${analysis.requiresProviderReview ? 'Yes' : 'No'}`);
    }
    /**
     * Send SMS notification
     */
    async sendSMS(phone, analysisId, analysis, priority) {
        // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
        console.log(`📱 SMS sent to ${phone}:`);
        console.log(`   [${priority.toUpperCase()}] Analysis ${analysisId.substring(0, 8)} requires review`);
    }
    /**
     * Send push notification
     */
    async sendPushNotification(providerId, analysisId, analysis, priority) {
        // In production, integrate with push service (Firebase, OneSignal, etc.)
        console.log(`🔔 Push notification sent to provider ${providerId}:`);
        console.log(`   Priority: ${priority.toUpperCase()}`);
        console.log(`   Analysis: ${analysisId}`);
    }
    /**
     * List all providers
     */
    listProviders() {
        return Array.from(this.providers.values());
    }
}
//# sourceMappingURL=provider.service.js.map