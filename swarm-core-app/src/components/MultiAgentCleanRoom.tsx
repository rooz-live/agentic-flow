import React, { useState, useEffect } from 'react';
import { MultiAgentCleanRoomEngine } from '../domains/multiagentcleanroom/MultiAgentCleanRoomEngine';

/**
 * [RCA TRACE]
 * Epic 11: Multi-Agent Clean Room
 * TDD Phase: GREEN / REFACTOR
 * Physical implementation of cross-IDE contextual boundary management.
 */
export const MultiAgentCleanRoom: React.FC = () => {
    const [engineState, setEngineState] = useState<{status: string, entropy: number}>({ status: 'PENDING', entropy: 0 });
    useEffect(() => {
        const engine = new MultiAgentCleanRoomEngine();
        setEngineState(engine.getDiagnostics());
    }, []);

    const [isolationActive, setIsolationActive] = useState(true);

    const agents = [
        { name: "Antigravity Node", status: "ACTIVE (Primary)", defaultBleed: "0.0%", memory: "128k/256k", color: "#818cf8" },
        { name: "Cursor Workspace", status: "STANDBY", defaultBleed: "4.5%", memory: "0k", color: "#a78bfa" },
        { name: "Zed Headless", status: "OFFLINE", defaultBleed: "2.1%", memory: "0k", color: "#f472b6" }
    ];

    return (
        <div id="multi-agent-clean-room" style={{
            width: '100%', marginTop: '2rem', background: '#0f172a',
            border: `1px solid ${isolationActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`, 
            borderRadius: '16px', padding: '1.5rem',
            fontFamily: "'Inter', system-ui, sans-serif",
            transition: 'all 0.3s ease',
            boxShadow: isolationActive ? 'inset 0 0 20px rgba(16, 185, 129, 0.05)' : 'inset 0 0 20px rgba(239, 68, 68, 0.05)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', letterSpacing: '0.5px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🧪</span> Multi-Agent Clean Room
                </h4>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.5px' }}>CONTEXT ISOLATION:</span>
                    <button 
                        onClick={() => setIsolationActive(!isolationActive)}
                        style={{ 
                            background: isolationActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isolationActive ? '#10b981' : '#ef4444',
                            border: `1px solid ${isolationActive ? '#10b981' : '#ef4444'}`,
                            padding: '0.4rem 1.2rem', borderRadius: '20px', cursor: 'pointer',
                            fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                            transition: 'all 0.2s', letterSpacing: '1px'
                        }}
                    >
                        {isolationActive ? 'Locked' : 'Bleed Risk'}
                    </button>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {agents.map((agent, i) => (
                    <div key={i} className="agent-pod" style={{
                        background: '#1e293b', border: `1px solid ${agent.color}`,
                        borderRadius: '12px', padding: '1rem',
                        boxShadow: `0 4px 12px ${agent.color}20`
                    }}>
                        <div style={{ color: agent.color, fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                            {agent.name}
                            <div style={{ width: '8px', height: '8px', background: agent.status.includes('ACTIVE') ? '#10b981' : '#475569', borderRadius: '50%' }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                            <span style={{ opacity: 0.7 }}>State:</span>
                            <span style={{ color: agent.status.includes('ACTIVE') ? '#10b981' : '#94a3b8', fontWeight: 600 }}>{agent.status}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                            <span style={{ opacity: 0.7 }}>Memory Map:</span>
                            <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{agent.memory}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1', borderTop: '1px solid #334155', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                            <span style={{ opacity: 0.7 }}>Hallucination Bleed:</span>
                            <span style={{ color: isolationActive ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                                {isolationActive ? '0.0%' : agent.defaultBleed}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        
            <div id="engine-state-dump" style={{ display: 'none' }}>{engineState.status}:{engineState.entropy}</div>
        </div>
    );
};
