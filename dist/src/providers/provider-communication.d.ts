/**
 * Provider Communication
 * Secure messaging between providers and patients
 */
import { ProviderCommunication } from './types';
export declare class ProviderCommunicationService {
    private messages;
    private unreadMessages;
    constructor();
    /**
     * Send message from provider to patient or vice versa
     */
    sendMessage(message: Omit<ProviderCommunication, 'id' | 'sentAt'>): Promise<ProviderCommunication>;
    /**
     * Get messages for query
     */
    getMessagesForQuery(queryId: string): ProviderCommunication[];
    /**
     * Get conversation between provider and patient
     */
    getConversation(queryId: string, userId1: string, userId2: string): ProviderCommunication[];
    /**
     * Mark message as read
     */
    markAsRead(messageId: string, userId: string): Promise<boolean>;
    /**
     * Get unread messages for user
     */
    getUnreadMessages(userId: string): ProviderCommunication[];
    /**
     * Get unread count for user
     */
    getUnreadCount(userId: string): number;
    /**
     * Mark all messages as read for user in query
     */
    markAllAsReadForQuery(queryId: string, userId: string): Promise<number>;
    /**
     * Send secure file attachment
     */
    sendAttachment(queryId: string, from: string, to: string, fileName: string, fileUrl: string, message?: string): Promise<ProviderCommunication>;
    /**
     * Get message statistics
     */
    getStats(): {
        totalMessages: number;
        totalConversations: number;
        unreadTotal: number;
        encryptedMessages: number;
    };
}
//# sourceMappingURL=provider-communication.d.ts.map