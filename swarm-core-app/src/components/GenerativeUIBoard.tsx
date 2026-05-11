import React, { useState } from 'react';
import './GenerativeUIBoard.css';

/**
 * [Generative UI] - Execution of the 3 Phase Gates
 * 1. Beginners (Pills)
 * 2. Power Users (Sliders/Config Drawer)
 * 3. Designers/Devs (Canvas / Ghost Components)
 */
export const GenerativeUIBoard: React.FC = () => {
    const [activeGate, setActiveGate] = useState<'beginner' | 'power' | 'designer'>('beginner');

    return (
        <div className="gen-ui-container">
            
            {/* Phase Gate Selector */}
            <div className="gen-ui-header">
                <GateButton active={activeGate === 'beginner'} onClick={() => setActiveGate('beginner')} icon="💊" label="Beginners (Pills)" />
                <GateButton active={activeGate === 'power'} onClick={() => setActiveGate('power')} icon="🎛️" label="Power Users (Sliders)" />
                <GateButton active={activeGate === 'designer'} onClick={() => setActiveGate('designer')} icon="🎨" label="Designers (Canvas)" />
            </div>

            {/* Gate Content */}
            <div className="gen-ui-content">
                {activeGate === 'beginner' && <BeginnerGate />}
                {activeGate === 'power' && <PowerUserGate />}
                {activeGate === 'designer' && <DesignerGate />}
            </div>
        </div>
    );
};

const GateButton: React.FC<{ active: boolean, onClick: () => void, icon: string, label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`gate-btn ${active ? 'gate-btn-active' : 'gate-btn-inactive'}`}
    >
        {icon} {label}
    </button>
);

// 1. Dynamic Pills & Guided Text
const BeginnerGate = () => (
    <div>
        <h3 className="gate-title">Tactical Implementation: Guided Text</h3>
        <p className="gate-subtitle">Select a dynamic pill to auto-fill your swarm intent.</p>
        <div className="pill-container">
            <span className="pill-btn">✨ Summarize my spending</span>
            <span className="pill-btn">📊 Generate ROAM Risk matrix</span>
            <span className="pill-btn">🚀 Scaffold iOS/Android App</span>
        </div>
        <div className="magic-input-container">
            <input type="text" placeholder="I need a blog post..." className="magic-input" />
            <button className="magic-btn">🪄</button>
        </div>
    </div>
);

// 2. Parameterization & Config Drawer
const PowerUserGate = () => (
    <div>
        <h3 className="gate-title">The Control Panel: Parameterization</h3>
        <p className="gate-subtitle">Visual Style Tokens and Interactive Variable Chips.</p>
        
        <div className="power-grid">
            <div className="power-panel">
                <h4 className="power-title">Temperature</h4>
                <input type="range" min="0" max="100" className="power-range" title="Temperature Slider" aria-label="Temperature" />
            </div>
            <div className="power-panel">
                <h4 className="power-title">Style Token</h4>
                <div className="token-grid">
                    <button className="token-btn">Minimal</button>
                    <button className="token-btn">Glass</button>
                    <button className="token-btn">Brutal</button>
                    <button className="token-btn">Realistic</button>
                </div>
            </div>
        </div>
    </div>
);

// 3. Canvas & Ghost Components
const DesignerGate = () => (
    <div>
        <h3 className="gate-title">Ghost Components & Direct-to-Code Sync</h3>
        <p className="gate-subtitle">Drag and manipulate real UI blocks instead of reading markdown threads.</p>
        
        <div className="canvas-area">
            <div className="ghost-component">
                &lt;GhostDataTable columns=["ROAM", "WSJF"] /&gt;
            </div>
        </div>
        <div className="merge-btn-container">
            <button className="merge-btn">
                Merge Diff to Workspace
            </button>
        </div>
    </div>
);
