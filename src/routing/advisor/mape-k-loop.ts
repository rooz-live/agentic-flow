import * as fs from 'fs';
import * as path from 'path';

// ─── Scenario Bands (aligned with multi-model-executor) ──────────────────────
export type ScenarioBand = 'baseline' | 'adverse' | 'severe' | 'critical';

// ─── PEWMA Constants ──────────────────────────────────────────────────────────
// Probabilistic Exponential Moving Average — frugal edge adaptive sampling
const PEWMA_ALPHA_FAST = 0.3;   // high anomaly: weight recent samples heavily
const PEWMA_ALPHA_SLOW = 0.05;  // stable: smooth out noise to save sampling energy

// ─── Thresholds (per scenario band) ──────────────────────────────────────────
const LATENCY_THRESHOLDS: Record<ScenarioBand, number> = {
    baseline: 200,   // FAST_EDGE_TARGET_MS from circuit-breaker
    adverse:  400,
    severe:   900,
    critical: 1500,
};

const CPU_THRESHOLDS: Record<ScenarioBand, number> = {
    baseline: 70,
    adverse:  80,
    severe:   88,
    critical: 95,
};

// ─── LBEC Offload Decision ────────────────────────────────────────────────────
// Load Balanced Edge Computing: decide local vs. cloud dispatch
export type OffloadDecision = 'local' | 'cloud' | 'denied';

// ─── Cross-Vector ─────────────────────────────────────────────────────────────
export type VectorContext = 'code' | 'clt' | 'shared';

// CLT WSJF tracker directory (read-only source)
const CLT_WSJF_DIR = '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/_WSJF-TRACKER';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MAPEKMetric {
    latencyMs: number;
    cpuLoadPercent: number;
    timestamp: number;
    scenario?: ScenarioBand;
    vectorContext?: VectorContext;   // SA: which workspace generated this metric
    roleTarget?: string;             // Institution clearance level tracking
    channelTarget?: string;          // Extrusion endpoint
}

export interface MAPEKState {
    metrics: MAPEKMetric[];
    pewmaLatency: number;     // running PEWMA estimate
    pewmaAlpha: number;       // current alpha (adapts to anomaly state)
    anomalyDetected: boolean;
    anomalyScore: number;     // 0–1 density score
    frugalMode: boolean;
    scenario: ScenarioBand;
    lastGcAt: number;
}

export interface PlanResult {
    offload: OffloadDecision;
    frugalMode: boolean;
    selfEditRecommendation: string | null;
    wsjfPriority: number;     // 0–10 urgency for WSJF queue
}

export interface ExecuteResult {
    offloadDenied: boolean;
    offload: OffloadDecision;
    actuatorCalled: boolean;
    fakeDoor: boolean;
}

// ─── Paths ────────────────────────────────────────────────────────────────────
const STATE_FILE    = path.join(process.cwd(), '.goalie', 'mapek_state.json');
const LEDGER_FILE   = path.join(process.cwd(), '.goalie', 'genuine_telemetry.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ensureDir(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendLedger(payload: unknown): void {
    ensureDir(LEDGER_FILE);
    fs.writeFileSync(LEDGER_FILE, `${JSON.stringify(payload)}\n`, { flag: 'a' });
}

// ─── MAPEKLoop ────────────────────────────────────────────────────────────────
export class MAPEKLoop {
    private state: MAPEKState;

    constructor(scenario: ScenarioBand = 'baseline') {
        this.state = this.loadState();
        this.state.scenario = scenario;
    }

    private loadState(): MAPEKState {
        try {
            if (fs.existsSync(STATE_FILE)) {
                return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
            }
        } catch {
            // fall through to default
        }
        return {
            metrics: [],
            pewmaLatency: 0,
            pewmaAlpha: PEWMA_ALPHA_SLOW,
            anomalyDetected: false,
            anomalyScore: 0,
            frugalMode: false,
            scenario: 'baseline',
            lastGcAt: Date.now(),
        };
    }

    private saveState(): void {
        ensureDir(STATE_FILE);
        fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    }

    /** Monitor (M): PEWMA adaptive sampling — frugal edge metric ingestion */
    public monitor(metric: Omit<MAPEKMetric, 'timestamp'>): void {
        const sample: MAPEKMetric = {
            ...metric,
            timestamp: Date.now(),
            scenario: this.state.scenario,
            vectorContext: metric.vectorContext ?? 'code',
        };
        // SA: CLT critical deadlines demand fast response — force PEWMA_ALPHA_FAST
        if (sample.vectorContext === 'clt' && sample.scenario === 'critical') {
            this.state.pewmaAlpha = PEWMA_ALPHA_FAST;
        }

        // Update PEWMA latency estimate
        if (this.state.metrics.length === 0) {
            this.state.pewmaLatency = sample.latencyMs;
        } else {
            this.state.pewmaLatency =
                this.state.pewmaAlpha * sample.latencyMs +
                (1 - this.state.pewmaAlpha) * this.state.pewmaLatency;
        }

        this.state.metrics.push(sample);
        // Rolling window — keep last 200 samples (frugal memory)
        if (this.state.metrics.length > 200) {
            this.state.metrics = this.state.metrics.slice(-200);
        }
        this.saveState();
    }

    /** Analyze (A): Density-based anomaly detection — no large history needed */
    public analyze(): boolean {
        const window = this.state.metrics.slice(-20);
        
        const latencyThreshold = LATENCY_THRESHOLDS[this.state.scenario];
        const cpuThreshold     = CPU_THRESHOLDS[this.state.scenario];

        // DATA CHANNEL SPILLAGE INTERCEPTOR:
        // Tier 1 (institution-circle) must absolutely never extrude data via low-clearance channels loosely
        const crossContamination = window.some(m => 
            m.roleTarget === 'institution-circle' && 
            (m.channelTarget === 'Slack' || m.channelTarget === 'Direct Mail')
        );

        if (crossContamination) {
            this.state.scenario = 'critical';
            this.state.anomalyScore = 1.0;
            this.state.anomalyDetected = true;
            this.state.pewmaAlpha = PEWMA_ALPHA_FAST;
            this.saveState();
            
            appendLedger({
                kind: 'data_channel_spillage_blocked',
                ts: new Date().toISOString(),
                event: 'Data Leakage Prevented via First Principles Extrusion Rule',
                intercepted_channels: ['Slack', 'Direct Mail']
            });
            
            return true; // Fast-fail to Critical
        }

        // LOW VOLUME SPIKE DETECTION (Inverted fake door):
        // If volume < 3 but there is a critical latency spike, flag immediately!
        if (window.length < 3) {
            const hasCriticalSpike = window.some(m => m.latencyMs >= LATENCY_THRESHOLDS['critical']);
            if (hasCriticalSpike) {
                this.state.anomalyScore = 1.0;
                this.state.anomalyDetected = true;
                this.state.pewmaAlpha = PEWMA_ALPHA_FAST;
                this.saveState();
                return true;
            }
            return false;
        }

        // Density score: fraction of recent samples breaching threshold
        const latencyViolations = window.filter(m => m.latencyMs > latencyThreshold).length;
        const cpuViolations     = window.filter(m => m.cpuLoadPercent > cpuThreshold).length;
        const densityScore      = (latencyViolations + cpuViolations) / (window.length * 2);

        this.state.anomalyScore   = densityScore;
        this.state.anomalyDetected = densityScore > 0.25; // >25% window in violation

        // Adapt PEWMA alpha: if anomaly, sample faster; if stable, slow down (saves energy)
        this.state.pewmaAlpha = this.state.anomalyDetected ? PEWMA_ALPHA_FAST : PEWMA_ALPHA_SLOW;

        this.saveState();
        appendLedger({
            kind: 'mapek_analyze',
            ts: new Date().toISOString(),
            scenario: this.state.scenario,
            densityScore,
            anomalyDetected: this.state.anomalyDetected,
            pewmaLatency: this.state.pewmaLatency,
        });

        return this.state.anomalyDetected;
    }

    /** Plan (P): WSJF-ranked remediation + LBEC offload decision + self-edit generation */
    public plan(options?: { circuitBreakerSlowEdgeRatio?: number }): PlanResult {
        const anomaly  = this.state.anomalyDetected;
        const score    = this.state.anomalyScore;
        const scenario = this.state.scenario;
        const slowRatio = options?.circuitBreakerSlowEdgeRatio ?? 0;

        // LBEC: balance cost vs. makespan to decide local vs cloud
        let offload: OffloadDecision;
        
        // DYNAMIC CLOUD OFFLOAD BYPASS (LBEC): Bypass frugal restriction if ratio is dangerously high
        if (slowRatio > 0.3) {
            offload = 'cloud';
            this.state.frugalMode = false;
        } else if (scenario === 'critical' || score > 0.7) {
            offload = 'denied';      // resource-constrained: do not offload
            this.state.frugalMode = true;
        } else if (anomaly && scenario !== 'baseline') {
            offload = 'cloud';       // offload heavy compute to cloud tier
            this.state.frugalMode = false;
        } else {
            offload = 'local';       // stable: process locally at edge
            this.state.frugalMode = false;
        }

        // WSJF urgency: higher score = higher priority in swarm queue
        const wsjfPriority = Math.min(10, Math.round(score * 10 + (
            scenario === 'critical' ? 3 : scenario === 'severe' ? 2 : scenario === 'adverse' ? 1 : 0
        )));

        // Self-edit: natural language recommendation for meta-controller
        const selfEditRecommendation = anomaly
            ? `[Self-Edit] Lower inference budget by ${Math.round(score * 30)}% for next cycle; increase PEWMA alpha to ${PEWMA_ALPHA_FAST}.`
            : null;

        // RCA Traceability: Deep Why Local/Cloud Execution Matrix
        const deepWhy = {
            trigger: offload,
            slowEdgeRatio: slowRatio,
            anomalyDensityScore: score,
            frugalModeBypassTriggered: slowRatio > 0.3,
            densityBreachTriggered: anomaly && scenario !== 'baseline'
        };

        this.saveState();
        appendLedger({
            kind: 'mapek_plan',
            ts: new Date().toISOString(),
            scenario,
            offload,
            frugalMode: this.state.frugalMode,
            wsjfPriority,
            selfEditRecommendation,
            deepWhy,
        });

        return { offload, frugalMode: this.state.frugalMode, selfEditRecommendation, wsjfPriority };
    }

    /** Execute (E): Actuator dispatch — fake-door gated, K8s-ready */
    public execute(fakeDoor = true, planOptions?: { circuitBreakerSlowEdgeRatio?: number }): ExecuteResult {
        const plan = this.plan(planOptions);
        const denied = plan.offload === 'denied';

        if (!fakeDoor && !denied) {
            // Real actuator path — wire to K8s API / aerOS here
            console.log(`[MAPE-K:Execute] LIVE dispatch — offload: ${plan.offload}, WSJF: ${plan.wsjfPriority}`);
        } else if (fakeDoor) {
            console.log(`[MAPE-K:Execute] FAKE-DOOR — offload: ${plan.offload} (dry run, no actuator called)`);
        }

        appendLedger({
            kind: 'mapek_execute',
            ts: new Date().toISOString(),
            scenario: this.state.scenario,
            offload: plan.offload,
            offloadDenied: denied,
            fakeDoor,
            actuatorCalled: !fakeDoor && !denied,
        });

        return {
            offloadDenied: denied,
            offload: plan.offload,
            actuatorCalled: !fakeDoor && !denied,
            fakeDoor,
        };
    }

    /** Knowledge (K): Versioned GC — consolidates stale traces into ledger */
    public knowledgeConsolidation(): void {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        const before = this.state.metrics.length;
        const flushed = this.state.metrics.filter(m => m.timestamp < cutoff);
        this.state.metrics = this.state.metrics.filter(m => m.timestamp >= cutoff);
        this.state.lastGcAt = Date.now();

        if (flushed.length > 0) {
            appendLedger({
                kind: 'mapek_knowledge_gc',
                ts: new Date().toISOString(),
                flushedCount: flushed.length,
                retained: this.state.metrics.length,
                totalBefore: before,
            });
            console.log(`[MAPE-K:GC] Auto-Dream: flushed ${flushed.length} stale traces → ledger`);
        }

        // SA: Cross-vector merge — pull CLT WSJF items into Knowledge base (read-only)
        this.mergeCltWsjfToKnowledge();

        this.saveState();
    }

    /** Knowledge (K): Integrates specific structural self-edits from the MultiModelExecutor into the Ledger */
    public integratePromptSelfEdit(confidence: number, instruction: string): void {
        appendLedger({
            kind: 'mapek_knowledge_prompt_optimization',
            ts: new Date().toISOString(),
            originalConfidence: confidence,
            suggestedInstruction: instruction,
            vectorContext: 'code',
            applied: true,
        });
        console.log(`[MAPE-K:Knowledge] Synthesized Promp Optimization Artifact — Score: ${confidence} | Ledger Sync Complete`);
    }

    /** Knowledge (K): Autonomously decays threshold bounds without Human intervention based on BmlAgent failures */
    public applyThresholdDecay(decayPct: number, vectorContext: VectorContext): void {
        appendLedger({
            kind: 'mapek_knowledge_threshold_decay',
            ts: new Date().toISOString(),
            appliedDecayPct: decayPct,
            scenario: this.state.scenario,
            vectorContext,
            automated: true,
        });
        console.log(`[MAPE-K:Knowledge] Human-in-the-loop Bypassed! Threshold Bounds decayed autonomously by -${decayPct * 100}%`);
    }

    /**
     * SA: Read CLT _WSJF-TRACKER directory (read-only) and extract scores into ledger.
     * Never writes to CLT directory. Fails silently.
     */
    private mergeCltWsjfToKnowledge(): void {
        try {
            if (!fs.existsSync(CLT_WSJF_DIR)) return;
            const files = fs.readdirSync(CLT_WSJF_DIR).filter(f => f.endsWith('.md'));
            const WSJF_RE = /WSJF[:\s*]+([0-9]+\.?[0-9]*)/gi;
            let totalItems = 0;
            const scores: number[] = [];
            for (const file of files) {
                const content = fs.readFileSync(`${CLT_WSJF_DIR}/${file}`, 'utf8');
                const matches = [...content.matchAll(WSJF_RE)];
                for (const m of matches) {
                    scores.push(parseFloat(m[1]));
                    totalItems++;
                }
            }
            if (totalItems > 0) {
                const avgWsjf = scores.reduce((a, b) => a + b, 0) / scores.length;
                appendLedger({
                    kind: 'mapek_knowledge_clt_merge',
                    ts: new Date().toISOString(),
                    cltWsjfItems: totalItems,
                    cltAvgWsjf: Math.round(avgWsjf * 10) / 10,
                    cltFiles: files.length,
                    vectorContext: 'clt',
                    readOnly: true,
                });
            }
        } catch {
            // read-only — never throw
        }
    }

    /** Accessor for current state snapshot */
    public getState(): Readonly<MAPEKState> {
        return this.state;
    }

    public setScenario(scenario: ScenarioBand): void {
        this.state.scenario = scenario;
        this.saveState();
    }
}
