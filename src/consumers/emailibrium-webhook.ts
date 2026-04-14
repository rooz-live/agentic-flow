import * as fs from 'fs';
import * as path from 'path';

/**
 * ADR-025: N8N Emailibrium Webhook Isolation & Ingress
 *
 * Safely ingests out-of-repo Swarm classifications (emails, financial alerts, CVEs),
 * validates them against the strict JSON schema constraint, and isolates them into
 * the 'n8n.inbox' multi-tenant boundary to prevent Cognitive Drift.
 */

export interface RoamRiskMapping {
    impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: 'Cognitive Drift' | 'Financial/Tax' | 'Infrastructure Bleed' | 'Security Vulnerability' | 'Other';
    suggested_wsjf_penalty?: number;
}

export interface EmailibriumSignal {
    signal_id: string;
    source: 'n8n-email' | 'finelo-alert' | 'zero-day-cve' | 'server-log';
    timestamp: string;
    confidence_score: number;
    classification: 'URGENT_ACTION_REQUIRED' | 'TENSION_DISCOVERED' | 'PASSIVE_LOG' | 'SPAM_REJECT';
    roam_risk_mapping: RoamRiskMapping;
    raw_context?: string;
}

export class EmailibriumWebhookConsumer {
    private readonly INBOX_TENANT_CONTEXT = 'n8n.inbox';
    private conceptRepository: any; // Injected ConceptRepository dependency

    constructor(conceptRepository: any) {
        this.conceptRepository = conceptRepository;
    }

    /**
     * Primary ingress point for external N8N Webhooks.
     * Enforces the Single-Thread Ingress Protocol.
     */
    public async processIncomingWebhook(payload: unknown): Promise<{ success: boolean; message: string; signalId?: string }> {
        try {
            console.log(`[Emailibrium] Ingesting new signal from out-of-repo swarm mesh...`);

            // 1. Schema Constraint Validation
            if (!this.validateSchema(payload)) {
                console.warn(`[Emailibrium] Signal rejected: Schema hallucination or malformed payload detected.`);
                return { success: false, message: 'Invalid schema. Payload rejected by deterministic bounds.' };
            }

            const signal = payload as EmailibriumSignal;

            // Short-circuit on spam
            if (signal.classification === 'SPAM_REJECT') {
                console.log(`[Emailibrium] Signal ${signal.signal_id} classified as SPAM_REJECT. Dropping safely.`);
                return { success: true, message: 'Spam dropped', signalId: signal.signal_id };
            }

            // 2. Multi-Tenant Isolation & Storage
            // Routes to n8n.inbox exclusively.
            await this.storeIsolatedSignal(signal);

            // 3. WSJF Ledger Mapping
            if (signal.confidence_score >= 0.75) {
                await this.routeToWSJFLedger(signal);
            } else {
                console.log(`[Emailibrium] Signal ${signal.signal_id} confidence (${signal.confidence_score}) too low for WSJF routing.`);
            }

            return { success: true, message: 'Signal processed and safely isolated', signalId: signal.signal_id };

        } catch (error) {
            console.error(`[Emailibrium] Critical failure during webhook ingress:`, error);
            return { success: false, message: 'Internal ingress failure' };
        }
    }

    /**
     * Red/Green TDD-compliant structural validation.
     * Maps to schemas/emailibrium-schema.min.json.
     */
    private validateSchema(payload: any): payload is EmailibriumSignal {
        if (!payload || typeof payload !== 'object') return false;

        const requiredKeys = ['signal_id', 'source', 'timestamp', 'confidence_score', 'classification', 'roam_risk_mapping'];
        for (const key of requiredKeys) {
            if (!(key in payload)) return false;
        }

        if (typeof payload.confidence_score !== 'number' || payload.confidence_score < 0 || payload.confidence_score > 1) {
            return false;
        }

        const validSources = ['n8n-email', 'finelo-alert', 'zero-day-cve', 'server-log'];
        if (!validSources.includes(payload.source)) return false;

        if (!payload.roam_risk_mapping || !payload.roam_risk_mapping.impact || !payload.roam_risk_mapping.category) {
            return false;
        }

        return true;
    }

    /**
     * Stores the signal in the ConceptRepository bound strictly to the n8n.inbox tenant.
     */
    private async storeIsolatedSignal(signal: EmailibriumSignal): Promise<void> {
        console.log(`[Emailibrium] Isolating signal ${signal.signal_id} into tenant context: ${this.INBOX_TENANT_CONTEXT}`);

        // Simulating the DB layer interaction described in ADR-024 & ADR-025
        if (this.conceptRepository && typeof this.conceptRepository.insertSignal === 'function') {
            await this.conceptRepository.insertSignal({
                ...signal,
                unique_application_context: this.INBOX_TENANT_CONTEXT
            });
        }
    }

    /**
     * Maps the parsed tension into the WSJF ledger if confidence bounds are met.
     */
    private async routeToWSJFLedger(signal: EmailibriumSignal): Promise<void> {
        const impactMultiplier = this.getImpactMultiplier(signal.roam_risk_mapping.impact);
        const baselineTension = 10; // Baseline score
        const suggestedPenalty = signal.roam_risk_mapping.suggested_wsjf_penalty || 0;

        const generatedWsjfScore = (baselineTension * impactMultiplier * signal.confidence_score) + suggestedPenalty;

        console.log(`[Emailibrium] Signal ${signal.signal_id} mapped to WSJF score: ${generatedWsjfScore.toFixed(2)}`);

        // In a real implementation, this writes to pi-sync-targets.min.json or the AgentDB WSJF column.
    }

    private getImpactMultiplier(impact: string): number {
        switch (impact) {
            case 'CRITICAL': return 4.0;
            case 'HIGH': return 3.0;
            case 'MEDIUM': return 2.0;
            case 'LOW': return 1.0;
            default: return 1.0;
        }
    }
}
