import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { MAPEKLoop, ScenarioBand } from '../mape-k-loop';
import * as fs from 'fs';
import * as path from 'path';

describe('MAPEKLoop', () => {
    const testStatePath = path.join(process.cwd(), '.goalie', 'mapek_state.json');

    beforeEach(() => {
        if (fs.existsSync(testStatePath)) {
            fs.unlinkSync(testStatePath);
        }
    });

    afterAll(() => {
        if (fs.existsSync(testStatePath)) {
            fs.unlinkSync(testStatePath);
        }
    });

    it('adapts alpha when anomaly is detected', () => {
        const loop = new MAPEKLoop('baseline');
        
        // Feed stable metrics
        for (let i = 0; i < 20; i++) {
            loop.monitor({ latencyMs: 50, cpuLoadPercent: 30 });
        }
        
        loop.analyze();
        let state = loop.getState();
        expect(state.anomalyDetected).toBe(false);
        expect(state.pewmaAlpha).toBe(0.05); // PEWMA_ALPHA_SLOW

        // Spike metrics to breach baseline threshold (200ms latency, 70% cpu)
        for (let i = 0; i < 10; i++) {
            loop.monitor({ latencyMs: 250, cpuLoadPercent: 80 });
        }
        
        loop.analyze();
        state = loop.getState();
        expect(state.anomalyDetected).toBe(true);
        expect(state.pewmaAlpha).toBe(0.3); // PEWMA_ALPHA_FAST
    });

    it('handles WSJF scoring and LBEC offload correctly based on scenario and anomaly', () => {
        // Critical scenario should deny offload
        const criticalLoop = new MAPEKLoop('critical');
        const critPlan = criticalLoop.plan();
        expect(critPlan.offload).toBe('denied');
        expect(critPlan.frugalMode).toBe(true);

        // Adverse + anomaly should offload to cloud (density < 0.7 but > 0.25)
        const adverseLoop = new MAPEKLoop('adverse');
        for (let i = 0; i < 10; i++) adverseLoop.monitor({ latencyMs: 500, cpuLoadPercent: 90 }); // 10 bad
        for (let i = 0; i < 10; i++) adverseLoop.monitor({ latencyMs: 50, cpuLoadPercent: 30 }); // 10 good
        adverseLoop.analyze();
        const advPlan = adverseLoop.plan();
        expect(advPlan.offload).toBe('cloud');
        expect(advPlan.wsjfPriority).toBeGreaterThan(0);

        // Baseline + no anomaly should stay local
        const baselineLoop = new MAPEKLoop('baseline');
        for (let i = 0; i < 20; i++) baselineLoop.monitor({ latencyMs: 50, cpuLoadPercent: 30 });
        baselineLoop.analyze();
        const basePlan = baselineLoop.plan();
        expect(basePlan.offload).toBe('local');
    });

    it('consolidates knowledge into ledger and cleans up old state', () => {
        const loop = new MAPEKLoop('baseline');
        
        // Add metric from 48 hours ago
        const past = Date.now() - (48 * 60 * 60 * 1000);
        // Force the protected state by mutating the raw read for testing purposes
        const rawState = loop.getState() as any;
        rawState.metrics.push({ latencyMs: 100, cpuLoadPercent: 50, timestamp: past, scenario: 'baseline' });
        
        expect(rawState.metrics.length).toBe(1);
        loop.knowledgeConsolidation();
        expect(loop.getState().metrics.length).toBe(0);
    });

    it('immediately spikes PEWMA alpha on a single critical latency anomaly in low-volume windows', () => {
        const loop = new MAPEKLoop('baseline');
        expect(loop.getState().pewmaAlpha).toBe(0.05);
        
        // Add just ONE critical item (latency >> threshold) - density volume is 1
        loop.monitor({ latencyMs: 1600, cpuLoadPercent: 95 });
        const anomaly = loop.analyze();
        
        expect(anomaly).toBe(true);
        expect(loop.getState().pewmaAlpha).toBe(0.3); // PEWMA_ALPHA_FAST
    });

    it('bypasses frugal mode constraint natively to LBEC cloud if slow-edge ratio exceeds the danger boundary', () => {
        const loop = new MAPEKLoop('critical');
        for (let i = 0; i < 20; i++) loop.monitor({ latencyMs: 250, cpuLoadPercent: 30 });
        loop.analyze();
        
        // Verify default frugal denial
        const basePlan = loop.plan();
        expect(basePlan.offload).toBe('denied');
        expect(basePlan.frugalMode).toBe(true);
        
        // Force test the Inverted Fake Door limit break
        const dangerouslySlowPlan = loop.plan({ circuitBreakerSlowEdgeRatio: 0.5 });
        expect(dangerouslySlowPlan.offload).toBe('cloud');
        expect(dangerouslySlowPlan.frugalMode).toBe(false);
    });

    it('should detect and block Cross-Channel Contamination (Institution -> Slack)', () => {
        const loop = new MAPEKLoop('baseline');
        
        // Inject an illegal payload where a high-clearance institution payload leaks to a low-clearance Slack channel
        loop.monitor({
            latencyMs: 50,
            cpuLoadPercent: 30,
            roleTarget: 'institution-circle',
            channelTarget: 'Slack'
        });

        // The analyze phase shouldn't just look at latency, it must panic on spillage
        const anomaly = loop.analyze();
        
        expect(anomaly).toBe(true);
        expect(loop.getState().scenario).toBe('critical'); // Forced escalation
        expect(loop.getState().anomalyScore).toBe(1.0); // Maximum density
        
        // Plan must reflect absolute closure
        const plan = loop.plan();
        expect(plan.offload).toBe('denied');
        expect(plan.frugalMode).toBe(true);
    });
});
