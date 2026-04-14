import { EmailibriumWebhookConsumer, EmailibriumSignal } from '../../../src/consumers/emailibrium-webhook';

describe('EmailibriumWebhookConsumer [Red/Green TDD Validation]', () => {
    let mockConceptRepository: any;
    let consumer: EmailibriumWebhookConsumer;

    beforeEach(() => {
        // Mock the ConceptRepository to prevent out-of-repo tests from mutating DB state
        mockConceptRepository = {
            insertSignal: jest.fn().mockResolvedValue(true)
        };
        consumer = new EmailibriumWebhookConsumer(mockConceptRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should gracefully reject payloads that hallucinate beyond schema bounds', async () => {
        // Missing required fields and out-of-bounds confidence score
        const invalidPayload = {
            signal_id: "hallucination-uuid-123",
            confidence_score: 9.99, // Schema constraint: max 1.0
            classification: "UNKNOWN_INTENT", // Schema constraint: invalid enum
            roam_risk_mapping: {
                impact: "SUPER_CRITICAL"
            }
        };

        const result = await consumer.processIncomingWebhook(invalidPayload);

        // Verify the single-thread elegantly traps the hallucination
        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid schema');
        expect(mockConceptRepository.insertSignal).not.toHaveBeenCalled();
    });

    it('should short-circuit and safely drop SPAM_REJECT signals without DB mutation', async () => {
        const spamPayload: EmailibriumSignal = {
            signal_id: "spam-uuid-123",
            source: "n8n-email",
            timestamp: new Date().toISOString(),
            confidence_score: 0.99,
            classification: "SPAM_REJECT",
            roam_risk_mapping: {
                impact: "LOW",
                category: "Other"
            }
        };

        const result = await consumer.processIncomingWebhook(spamPayload);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Spam dropped');
        expect(result.signalId).toBe('spam-uuid-123');
        expect(mockConceptRepository.insertSignal).not.toHaveBeenCalled();
    });

    it('should isolate valid signals strictly into the n8n.inbox tenant boundary (ADR-024)', async () => {
        const validPayload: EmailibriumSignal = {
            signal_id: "valid-uuid-456",
            source: "finelo-alert",
            timestamp: new Date().toISOString(),
            confidence_score: 0.85,
            classification: "TENSION_DISCOVERED",
            roam_risk_mapping: {
                impact: "HIGH",
                category: "Financial/Tax",
                suggested_wsjf_penalty: 15
            }
        };

        const result = await consumer.processIncomingWebhook(validPayload);

        expect(result.success).toBe(true);
        expect(result.signalId).toBe("valid-uuid-456");

        // Assert the graph boundary constraint: unique_application_context MUST be applied
        expect(mockConceptRepository.insertSignal).toHaveBeenCalledWith(
            expect.objectContaining({
                signal_id: "valid-uuid-456",
                unique_application_context: "n8n.inbox"
            })
        );
    });

    it('should process valid signals but skip WSJF ledger routing for low confidence', async () => {
         const lowConfidencePayload: EmailibriumSignal = {
            signal_id: "low-conf-789",
            source: "server-log",
            timestamp: new Date().toISOString(),
            confidence_score: 0.40, // Below 0.75 threshold
            classification: "PASSIVE_LOG",
            roam_risk_mapping: {
                impact: "MEDIUM",
                category: "Infrastructure Bleed"
            }
        };

        const result = await consumer.processIncomingWebhook(lowConfidencePayload);

        expect(result.success).toBe(true);
        expect(mockConceptRepository.insertSignal).toHaveBeenCalled();
        // Since confidence is 0.40, it routes to the tenant context but skips WSJF prioritization natively
    });

    it('should gracefully handle internal repository exceptions without exposing stack traces', async () => {
        mockConceptRepository.insertSignal.mockRejectedValue(new Error('Database Connection Lost'));

        const validPayload: EmailibriumSignal = {
            signal_id: "valid-uuid-999",
            source: "zero-day-cve",
            timestamp: new Date().toISOString(),
            confidence_score: 0.95,
            classification: "URGENT_ACTION_REQUIRED",
            roam_risk_mapping: {
                impact: "CRITICAL",
                category: "Security Vulnerability"
            }
        };

        const result = await consumer.processIncomingWebhook(validPayload);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Internal ingress failure');
    });
});
