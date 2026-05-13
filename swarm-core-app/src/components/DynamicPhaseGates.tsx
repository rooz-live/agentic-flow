import React, { useState } from 'react';
import './DynamicPhaseGates.css';

type PhaseGateMode = 'beginner' | 'power' | 'canvas';

export const DynamicPhaseGates: React.FC = () => {
    const [mode, setMode] = useState<PhaseGateMode>('beginner');
    const [temperature, setTemperature] = useState(0.7);
    const [urgency, setUrgency] = useState(5);

    const handleOmnichannelTrigger = async () => {
        try {
            // Invokes the DBOS Telecom Orchestrator on the Edge
            const res = await fetch('http://192.168.122.237:3000/api/campaign/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: "client_swarm",
                    phone: "+15550000000",
                    firstName: "Architect",
                    cohort: "Innovator_Circle",
                    type: "omnichannel"
                })
            });
            console.log("DBOS Triggered:", await res.json());
            alert("DBOS Omnichannel Telecom Triggered Successfully (SMS + TTS)");
        } catch (e) {
            console.error("DBOS Edge not reachable", e);
            alert("DBOS Orchestrator currently syncing. Check Edge Node connection.");
        }
    };

    return (
        <div className="phase-gate-container">
            <div className="phase-gate-header">
                <h3 className="phase-gate-title">⚡ Gen-UI Phase Gates</h3>
                <div className="gate-selector">
                    <button className={`gate-btn ${mode === 'beginner' ? 'active' : ''}`} onClick={() => setMode('beginner')}>Pills</button>
                    <button className={`gate-btn ${mode === 'power' ? 'active' : ''}`} onClick={() => setMode('power')}>Sliders</button>
                    <button className={`gate-btn ${mode === 'canvas' ? 'active' : ''}`} onClick={() => setMode('canvas')}>Canvas</button>
                </div>
            </div>

            {mode === 'beginner' && (
                <div className="pills-grid">
                    <button className="context-pill">Run Assessor E2E Sweep</button>
                    <button className="context-pill">Calculate WSJF Ledger</button>
                    <button className="context-pill">Spawn Headless Orchestrator</button>
                    <button className="context-pill">Audit Domain Monetization</button>
                </div>
            )}

            {mode === 'power' && (
                <div className="sliders-grid">
                    <div className="slider-group">
                        <label>Swarm Autonomy Threshold (Temp) <span>{temperature}</span></label>
                        <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="power-slider" />
                    </div>
                    <div className="slider-group">
                        <label>WSJF Urgency Multiplier <span>{urgency}x</span></label>
                        <input type="range" min="1" max="10" step="1" value={urgency} onChange={(e) => setUrgency(parseInt(e.target.value))} className="power-slider" />
                    </div>
                    <button className="trigger-btn" onClick={handleOmnichannelTrigger}>
                        Execute Edge Omnichannel Action (DBOS)
                    </button>
                </div>
            )}

            {mode === 'canvas' && (
                <div className="canvas-zone">
                    <span>[ Drag & Drop Generative Components Here ]</span>
                </div>
            )}
        </div>
    );
};
