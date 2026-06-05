import { MAPEKLoop, ScenarioBand, VectorContext, PlanResult, ExecuteResult } from './mape-k-loop';
import { CrossCircleDependencyManager } from '../../orchestration/cross-circle-dependency-manager';
import { getSwarmBudgetStatus } from '../../integrations/opex-test-budget-authorizer';
import { stxRouter } from '../../../_SYSTEM/integrations/openstack-stx-router';
import { hostBillRouter } from '../../../_SYSTEM/integrations/hostbill-router';
import { SCDBEAMFactory, SCDBEAMRecord, SCDBusinessEvent } from '../../../_SYSTEM/scd-beam/SlowlyChangingDimensions';
import { determineMonitoringMode, MonitoringMode } from '../../../_SYSTEM/scd-beam/MonitoringMode';

// ─── Agent Result Types ───────────────────────────────────────────────────────

// ─── BML + ROAM Types ────────────────────────────────────────────────────────

export type BmlDecision = 'UNLEASH' | 'REHEARSE' | 'ITERATE';

export type CeremonyKey = 'standup' | 'review' | 'retro' | 'replenish' | 'refine' | 'pi_prep' | 'sync';

export interface RoamRisk {
    id: string;
    description: string;
    status: 'Resolved' | 'Owned' | 'Accepted' | 'Mitigated';
    scenario: ScenarioBand;
    wsjf: number;
    detectedAt: number;
}

export interface BmlResult {
    decision: BmlDecision;
    rationale: string;
    nextScenario: ScenarioBand;
    roamRisks: RoamRisk[];
    ceremonyRecommended: CeremonyKey;
    wsjfPriority: number;
    autonomousThresholdDecay: number | null; // e.g. 0.10 for 10% tolerance reduction
    executionTopology: string[][]; // Topological DAG sequencing for Role coordination
}

// ─── WSJF constants per ceremony ─────────────────────────────────────────────
const CEREMONY_WSJF: Record<CeremonyKey, number> = {
    standup:   9.2,
    review:    8.7,
    retro:     7.9,
    replenish: 8.1,
    refine:    7.4,
    pi_prep:   9.8,
    sync:      8.4,
};

export interface MonitorResult {
    domain: string;
    latencyMs: number;
    cpuLoadPercent: number;
    scenario: ScenarioBand;
    pewmaLatency: number;
    vectorContext: VectorContext;
    monitoringMode: MonitoringMode;
}

export interface AnalyzeResult {
    anomalyDetected: boolean;
    anomalyScore: number;
    pewmaAlpha: number;
}

export interface RefinerCritique {
    planAccepted: boolean;
    confidenceScore: number;     // 0–1
    rejectionReason: string | null;
    revisedWsjfPriority: number;
}

// ─── Agent 1: Monitor ─────────────────────────────────────────────────────────

export class MonitorAgent {
    constructor(private mapek: MAPEKLoop) {}

    public async collect(
        domain: string,
        latencyMs: number,
        cpuLoadPercent: number,
        vectorContext: VectorContext = 'code',
    ): Promise<MonitorResult> {
        this.mapek.monitor({ latencyMs, cpuLoadPercent, vectorContext });
        const state = this.mapek.getState();
        const mode = determineMonitoringMode('edge_utility'); // Defaulting role check

        console.log(`[MonitorAgent] DOMAIN=${domain} PEWMA=${state.pewmaLatency.toFixed(1)}ms scenario=${state.scenario} mode=${mode}`);
        return {
            domain,
            latencyMs,
            cpuLoadPercent,
            scenario: state.scenario,
            pewmaLatency: state.pewmaLatency,
            vectorContext,
            monitoringMode: mode,
        };
    }
}

// ─── Agent 2: Analyze ─────────────────────────────────────────────────────────

export class AnalyzeAgent {
    private scdBuffer: SCDBEAMRecord[] = [];

    constructor(private mapek: MAPEKLoop) {}

    public async thresholdDetection(monitorResult: MonitorResult): Promise<AnalyzeResult> {
        const anomalyDetected = this.mapek.analyze();
        const state = this.mapek.getState();
        
        if (anomalyDetected || monitorResult.latencyMs > 500) {
            console.warn(`[AnalyzeAgent] Density anomaly detected for ${monitorResult.domain}! score=${state.anomalyScore.toFixed(3)} alpha=${state.pewmaAlpha}`);
            
            // Phase 50 SCD Sensing Active Trigger Hook: Generate physical audit
            const event: SCDBusinessEvent = {
                eventId: `event_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                eventType: 'LATENCY_SPIKE',
                timestamp: new Date().toISOString(),
                source: 'MIROFISH_SIM',
                confidence: state.anomalyScore,
                rawPayload: { trigger: 'AnalyzeAgent.thresholdDetection', latencyMs: monitorResult.latencyMs }
            };
            
            const newRecord = SCDBEAMFactory.createRecord(monitorResult.domain, {
               ttfbMs: monitorResult.latencyMs,
               payloadSizeBytes: 1024,
               vector1024: new Array(1024).fill(0).map(() => Math.random() * monitorResult.latencyMs/1000),
               domHash: 'anomalous_hash',
               ipAddress: '127.0.0.1'
            }, event);

            this.scdBuffer.push(newRecord);
        }

        return {
            anomalyDetected,
            anomalyScore: state.anomalyScore,
            pewmaAlpha: state.pewmaAlpha,
        };
    }

    public getBufferedScdRecords(): SCDBEAMRecord[] {
        return this.scdBuffer.splice(0, this.scdBuffer.length); // Flushes and returns
    }
}

// ─── Agent 3: Plan + Refiner (inner critique loop) ───────────────────────────

export class PlanAgent {
    constructor(private mapek: MAPEKLoop) {}

    public async synthesize(slowEdgeRatio: number = 0): Promise<PlanResult> {
        const result = this.mapek.plan({ circuitBreakerSlowEdgeRatio: slowEdgeRatio });
        console.log(`[PlanAgent] offload=${result.offload} wsjf=${result.wsjfPriority} frugal=${result.frugalMode}`);
        if (result.selfEditRecommendation) {
            console.log(`[PlanAgent:Self-Edit] ${result.selfEditRecommendation}`);
        }
        return result;
    }
}

export class RefinerAgent {
    /** Recursive inner loop: critiques PlanAgent output, raises confidence threshold */
    public async critique(plan: PlanResult, analyzeResult: AnalyzeResult): Promise<RefinerCritique> {
        const state = { anomalyScore: analyzeResult.anomalyScore };

        // Reject plan if LBEC decision is 'cloud' but anomaly score is very low (over-escalation)
        const overEscalated = plan.offload === 'cloud' && state.anomalyScore < 0.1;
        // Reject if denied but score doesn't warrant it
        const underEscalated = plan.offload === 'denied' && state.anomalyScore < 0.5;

        const planAccepted = !overEscalated && !underEscalated;
        const confidenceScore = planAccepted
            ? Math.min(1, 0.6 + analyzeResult.anomalyScore * 0.4)
            : Math.max(0, 0.4 - analyzeResult.anomalyScore * 0.3);

        const rejectionReason = overEscalated
            ? 'Over-escalation: cloud offload not justified at low anomaly score'
            : underEscalated
                ? 'Under-escalation: deny decision too aggressive for score'
                : null;

        // Revised WSJF: clamp if plan was rejected
        const revisedWsjfPriority = planAccepted
            ? plan.wsjfPriority
            : Math.max(1, plan.wsjfPriority - 2);

        if (!planAccepted) {
            console.warn(`[RefinerAgent] Plan REJECTED — ${rejectionReason} | revised WSJF: ${revisedWsjfPriority}`);
        } else {
            console.log(`[RefinerAgent] Plan ACCEPTED — confidence: ${(confidenceScore * 100).toFixed(0)}%`);
        }

        return { planAccepted, confidenceScore, rejectionReason, revisedWsjfPriority };
    }
}

// ─── Agent 4: Execute ─────────────────────────────────────────────────────────

export class ExecuteAgent {
    constructor(private mapek: MAPEKLoop) {}

    public async deploy(fakeDoor = true, slowEdgeRatio: number = 0): Promise<ExecuteResult> {
        const result = this.mapek.execute(fakeDoor, { circuitBreakerSlowEdgeRatio: slowEdgeRatio });
        if (result.offloadDenied) {
            console.error(`[ExecuteAgent] LBEC offload DENIED — frugal mode active`);
        } else {
            console.log(`[ExecuteAgent] dispatch=${result.offload} fakeDoor=${result.fakeDoor} actuatorCalled=${result.actuatorCalled}`);
        }
        return result;
    }
}

// ─── Agent 5: Knowledge ───────────────────────────────────────────────────────

export class KnowledgeAgent {
    constructor(private mapek: MAPEKLoop) {}

    /** Auto-Dream GC: consolidate stale traces into versioned ledger */
    public async consolidate(pendingRecords: SCDBEAMRecord[] = []): Promise<boolean> {
        const state = this.mapek.getState();
        const hoursSinceGc = (Date.now() - state.lastGcAt) / (1000 * 60 * 60);

        // ALWAYS flush SCD Records immediately to prevent missing out on anomalies
        if (pendingRecords.length > 0) {
            console.log(`[KnowledgeAgent] Forcing active SCD buffer flush due to active sensing bounds.`);
            SCDBEAMFactory.flushToGenuineTelemetry(pendingRecords);
        }

        // Only run full Auto-Dream GC if >6 hours since last consolidation
        if (hoursSinceGc >= 6 || state.metrics.length > 150) {
            console.log(`[KnowledgeAgent] Auto-Dream triggered — ${state.metrics.length} traces, ${hoursSinceGc.toFixed(1)}h since last GC`);
            this.mapek.knowledgeConsolidation();

            // hab.yo.life Evidence Preservation Protocol
            try {
                const fs = require('fs');
                const path = require('path');
                const evidenceDir = path.resolve(process.cwd(), '.goalie/evidence-bundles');
                if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
                
                const payload = { 
                    attestation_timestamp: Date.now(), 
                    metrics_compressed: state.metrics.length, 
                    terminal_scenario: state.scenario,
                    boundary_protocol: 'hab.yo.life'
                };
                fs.writeFileSync(path.join(evidenceDir, `hab_life_attestation_${Date.now()}.json`), JSON.stringify(payload, null, 2));
                console.log(`[KnowledgeAgent] Synced attestation bounds physically to .life Protocol.`);
            } catch (e) {
                console.warn(`[KnowledgeAgent] Immutable boundary validation log bypassed due to edge environment limits.`);
            }

            return true;
        }
        return false;
    }
}

// ─── Agent 6: BML + ROAM Decision Engine ─────────────────────────────────────

export class BmlAgent {
    /** Derives BML decision + ROAM risks + next ceremony from swarm cycle results */
    public async evaluate(
        analyzeResult: AnalyzeResult,
        planResult: PlanResult,
        refinerResult: RefinerCritique,
        executeResult: ExecuteResult,
        opexUtilizationPct: number,
    ): Promise<BmlResult> {
        const { anomalyScore, anomalyDetected } = analyzeResult;
        const opexGated = opexUtilizationPct >= 95;
        const opexWarn  = opexUtilizationPct >= 70;

        // BML decision via first-principles gating
        let decision: BmlDecision;
        if (opexGated || !refinerResult.planAccepted || executeResult.offloadDenied) {
            decision = 'ITERATE';
        } else if (opexWarn || anomalyDetected || anomalyScore > 0.2) {
            decision = 'REHEARSE';
        } else {
            decision = 'UNLEASH';
        }

        // Next scenario escalation / de-escalation
        const ESCALATE: Record<ScenarioBand, ScenarioBand> = {
            baseline: 'adverse', adverse: 'severe', severe: 'critical', critical: 'critical',
        };
        const DEESCALATE: Record<ScenarioBand, ScenarioBand> = {
            baseline: 'baseline', adverse: 'baseline', severe: 'adverse', critical: 'severe',
        };
        const currentScenario = planResult.offload === 'denied' ? 'critical'
            : planResult.offload === 'cloud' ? 'severe'
            : anomalyDetected ? 'adverse' : 'baseline';
        const nextScenario = decision === 'UNLEASH' ? ESCALATE[currentScenario]
            : decision === 'ITERATE' ? DEESCALATE[currentScenario]
            : currentScenario;

        // ROAM risk generation
        const roamRisks: RoamRisk[] = [];
        if (executeResult.offloadDenied) {
            roamRisks.push({
                id: `roam-${Date.now()}-frugal`,
                description: 'LBEC offload denied — frugal mode constrains cloud fallback',
                status: 'Owned',
                scenario: currentScenario,
                wsjf: 9.0,
                detectedAt: Date.now(),
            });
        }
        if (opexGated) {
            roamRisks.push({
                id: `roam-${Date.now()}-opex`,
                description: `OPEX gate CLOSED at ${opexUtilizationPct.toFixed(1)}% — no new spend authorized`,
                status: 'Accepted',
                scenario: currentScenario,
                wsjf: 10.0,
                detectedAt: Date.now(),
            });
        }
        if (!refinerResult.planAccepted) {
            roamRisks.push({
                id: `roam-${Date.now()}-refiner`,
                description: `RefinerAgent rejected plan — ${refinerResult.rejectionReason ?? 'unknown'}`,
                status: 'Mitigated',
                scenario: currentScenario,
                wsjf: refinerResult.revisedWsjfPriority,
                detectedAt: Date.now(),
            });
        }

        // Ceremony recommendation — highest WSJF given BML state
        const ceremonyPriority: Record<BmlDecision, CeremonyKey[]> = {
            UNLEASH:  ['pi_prep', 'standup', 'review', 'replenish', 'sync', 'refine', 'retro'],
            REHEARSE: ['review', 'standup', 'sync', 'retro', 'replenish', 'refine', 'pi_prep'],
            ITERATE:  ['retro', 'refine', 'replenish', 'standup', 'sync', 'review', 'pi_prep'],
        };
        const ceremonyRecommended = ceremonyPriority[decision][0];

        // Generate Cross-Circle Role Topology (DAG) for the Runbook
        const executionTopology = this.generateCeremonyRunbook(ceremonyRecommended);
        const topologyTrace = executionTopology.map((tier, idx) => `T${idx}[${tier.join(',')}]`).join(' → ');

        // Autonomous Threshold Decay Rule
        // When the swarm fails (ITERATE) or warns heavily (REHEARSE), actively shrink tolerance autonomously
        const autonomousThresholdDecay = decision === 'ITERATE' ? 0.10 : decision === 'REHEARSE' ? 0.05 : null;

        const rationale = `BML=${decision} | opex=${opexUtilizationPct.toFixed(1)}% | anomaly=${anomalyScore.toFixed(3)} | refiner=${refinerResult.planAccepted ? 'ACCEPTED' : 'REJECTED'} | lbec=${executeResult.offload}`;
        console.log(`[BmlAgent] ${rationale} \n  → ceremony=${ceremonyRecommended} | nextScenario=${nextScenario} | Decay: ${autonomousThresholdDecay !== null ? `-${autonomousThresholdDecay*100}%` : '0%'}`);
        console.log(`  → [Execution Runbook] ${topologyTrace}`);

        return {
            decision,
            rationale,
            nextScenario,
            roamRisks,
            ceremonyRecommended,
            wsjfPriority: CEREMONY_WSJF[ceremonyRecommended],
            autonomousThresholdDecay,
            executionTopology,
        };
    }

    /** 
     * Constructs a formal DAG topological execution matrix enforcing role dependencies 
     * specifically bound to the BML ceremony. 
     */
    private generateCeremonyRunbook(ceremony: CeremonyKey): string[][] {
        const mgr = new CrossCircleDependencyManager();

        if (ceremony === 'retro') {
            mgr.registerTask({ id: 'pull_traces', circle: 'Analyst', description: 'Extract local ledger anomalies', dependencies: [], state: 'PENDING' });
            mgr.registerTask({ id: 'eval_squeeze', circle: 'Assessor', description: 'Evaluate threshold decay viability', dependencies: ['pull_traces'], state: 'PENDING' });
            mgr.registerTask({ id: 'bml_pivot', circle: 'Orchestrator', description: 'Execute structural BML Pivot', dependencies: ['eval_squeeze'], state: 'PENDING' });
        } else if (ceremony === 'review' || ceremony === 'standup') {
            mgr.registerTask({ id: 'health_check', circle: 'Testing', description: 'Validate integration boundaries', dependencies: [], state: 'PENDING' });
            mgr.registerTask({ id: 'wsjf_align', circle: 'Innovator', description: 'Align ROI vectors for execution block', dependencies: ['health_check'], state: 'PENDING' });
        } else {
            // Generic pipeline fallback (replenish, sync, pi_prep, refine)
            mgr.registerTask({ id: 'knowledge_sync', circle: 'Seeker', description: 'Consolidate active models', dependencies: [], state: 'PENDING' });
            mgr.registerTask({ id: 'deploy_matrix', circle: 'Orchestrator', description: 'Authorize swarm unleash', dependencies: ['knowledge_sync'], state: 'PENDING' });
        }

        return mgr.resolveTopology();
    }
}

// ─── Extended SwarmCycleResult ────────────────────────────────────────────────
export interface SwarmCycleResult {
    scenario: ScenarioBand;
    monitor: MonitorResult;
    analyze: AnalyzeResult;
    plan: PlanResult;
    refiner: RefinerCritique;
    execute: ExecuteResult;
    bml: BmlResult;
    knowledgeGcTriggered: boolean;
    cycleLatencyMs: number;
}

// ─── Swarm Orchestrator ───────────────────────────────────────────────────────

/**
 * runSwarmCycle — orchestrates all 5 + BML agents through one full MAPE-K loop
 * with optional fake-door gating, scenario band override, and vector context.
 */
export async function runSwarmCycle(
    latencyMs: number,
    cpuLoadPercent: number,
    options: {
        domain?: string;
        scenario?: ScenarioBand;
        fakeDoor?: boolean;
        vectorContext?: VectorContext;
        opexUtilizationPct?: number;
        circuitBreakerSlowEdgeRatio?: number;
    } = {}
): Promise<SwarmCycleResult> {
    const domain             = options.domain ?? 'rooz.live';
    const scenario           = options.scenario ?? 'baseline';
    const fakeDoor           = options.fakeDoor ?? true;
    const vectorContext      = options.vectorContext ?? 'code';
    const opexUtilizationPct = options.opexUtilizationPct ?? 0;
    const circuitBreakerSlowEdgeRatio = options.circuitBreakerSlowEdgeRatio ?? 0;
    const cycleStart         = Date.now();

    const mapek = new MAPEKLoop(scenario);

    const monitor   = new MonitorAgent(mapek);
    const analyze   = new AnalyzeAgent(mapek);
    const plan      = new PlanAgent(mapek);
    const refiner   = new RefinerAgent();
    const execute   = new ExecuteAgent(mapek);
    const knowledge = new KnowledgeAgent(mapek);
    const bmlAgent  = new BmlAgent();

    let actualOpex = opexUtilizationPct;
    if (actualOpex === 0) {
        const status = await getSwarmBudgetStatus();
        actualOpex = status.utilizationPercent;
    }

    // Sequential MAPE-K + BML execution
    const monitorResult  = await monitor.collect(domain, latencyMs, cpuLoadPercent, vectorContext);
    const analyzeResult  = await analyze.thresholdDetection(monitorResult);
    const planResult     = await plan.synthesize(circuitBreakerSlowEdgeRatio);
    const refinerResult  = await refiner.critique(planResult, analyzeResult);
    const executeResult  = await execute.deploy(fakeDoor, circuitBreakerSlowEdgeRatio);
    
    // ⚡️ PHYSICAL CLOUD BRIDGE INTERCEPT ⚡️ 
    // If the Circuit Breaker forced an LBEC Cloud Offload, trigger bare-metal expansion
    if (executeResult.offload === 'cloud') {
        console.log(`[SwarmOrchestrator] 🌩️ LBEC Cloud Offload Detected! Routing to Bare-Metal Hivelocity STX Edge Node...`);
        
        // 💳 HOSTBILL OPEX GATE 💳 
        // 1. Physically secure funding on the active Node ID.
        // E.g., device-24460 expansion requires a $1500 USD margin clearance.
        const financeApproved = await hostBillRouter.requestLimitExpansion('device-24460', 1500);
        
        if (financeApproved) {
            console.log(`[SwarmOrchestrator] 💳 HostBill OPEX Clearance Confirmed. Launching STX Compute Payload...`);
            // Natively bypass fakedoor gating to ensure hardware matches the limit expansion
            stxRouter.triggerSTXComputeExpansion('device-24460').catch((e: Error) => console.error(e));
        } else {
            console.error(`[SwarmOrchestrator] ❌ HostBill Finance Blocked (Billing Failure). Aborting Physical STX Expansion.`);
            // Autonomously override the offload state to ensure runbook doesn't assume the cloud is active!
            executeResult.offloadDenied = true;
            executeResult.offload = 'denied';
            
            // 🚨 DR/HA COLD BOOT TRIGGER 🚨
            console.error(`[SwarmOrchestrator] 🚨 Triggering Local Backup DR/HA Cold Boot Protocol (ADR-023)...`);
            try {
                const { execSync } = require('child_process');
                execSync('./tooling/scripts/dr_cold_boot.sh', { stdio: 'inherit' });
            } catch (err) {
                console.error(`[SwarmOrchestrator] ❌ DR/HA Boot Failed: ${err}`);
            }
        }
    }

    const bmlResult      = await bmlAgent.evaluate(analyzeResult, planResult, refinerResult, executeResult, actualOpex);
    
    // Automatically apply Autonomous Threshold Decay to lower bounds dynamically without human ceremonies
    if (bmlResult.autonomousThresholdDecay !== null) {
        mapek.applyThresholdDecay(bmlResult.autonomousThresholdDecay, vectorContext);
    }

    const scdBuffer      = analyze.getBufferedScdRecords();
    const gcTriggered    = await knowledge.consolidate(scdBuffer);

    const cycleLatencyMs = Date.now() - cycleStart;

    console.log(
        `[SwarmOrchestrator] cycle=${cycleLatencyMs}ms scenario=${scenario} vector=${vectorContext}` +
        ` anomaly=${analyzeResult.anomalyDetected} offload=${executeResult.offload}` +
        ` BML=${bmlResult.decision} nextScenario=${bmlResult.nextScenario} ceremony=${bmlResult.ceremonyRecommended}`
    );

    return {
        scenario,
        monitor: monitorResult,
        analyze: analyzeResult,
        plan: planResult,
        refiner: refinerResult,
        execute: executeResult,
        bml: bmlResult,
        knowledgeGcTriggered: gcTriggered,
        cycleLatencyMs,
    };
}

// Legacy compat export
export async function triggerKnowledgeGC(mapek: MAPEKLoop): Promise<void> {
    console.log(`[KnowledgeAgent] Auto-Dream triggered (legacy call)`);
    mapek.knowledgeConsolidation();
}
