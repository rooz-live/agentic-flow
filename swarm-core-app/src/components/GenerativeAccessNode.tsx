import React, { useState, useEffect } from 'react';
import { GenerativeAccessNodeEngine } from '../domains/generativeaccessnode/GenerativeAccessNodeEngine';

/**
 * [RCA TRACE]
 * Epic 13: Generative Access Node
 * TDD Phase: GREEN / REFACTOR
 * Physical representation of the cross-domain telemetry routing system.
 */
export const GenerativeAccessNode: React.FC = () => {
    const [engineState, setEngineState] = useState<{status: string, entropy: number}>({ status: 'PENDING', entropy: 0 });
    useEffect(() => {
        const engine = new GenerativeAccessNodeEngine();
        setEngineState(engine.getDiagnostics());
    }, []);

    const [mockDomain, setMockDomain] = useState<string>('localhost');
    const [branding, setBranding] = useState({ name: "Core Node (Unmapped)", accent: "#94a3b8", whopId: "whop_root_000" });

    useEffect(() => {
        // Native Sniffing Logic (Prefiguring window.location.hostname extraction)
        const hostname = mockDomain;
        
        if (hostname.includes('investing')) {
            setBranding({ name: "Quant Alpha Trading", accent: "#34d399", whopId: "whop_inv_123" });
        } else if (hostname.includes('fitness')) {
            setBranding({ name: "Hypertrophy AI", accent: "#fb923c", whopId: "whop_fit_456" });
        } else if (hostname.includes('crypto')) {
            setBranding({ name: "DeFi Swarm Matrix", accent: "#a78bfa", whopId: "whop_cry_789" });
        } else {
            setBranding({ name: "Core Node (Unmapped)", accent: "#94a3b8", whopId: "whop_root_000" });
        }
    }, [mockDomain]);

    return (
        <div id="generative-access-node" style={{
            width: '100%', marginTop: '2rem', padding: '1.5rem',
            background: `linear-gradient(to bottom right, #0f172a, ${branding.accent}15)`,
            border: `1px solid ${branding.accent}50`, borderRadius: '16px',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.4s ease',
            boxShadow: `0 10px 25px ${branding.accent}10`
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.3rem' }}>📡</span> Generative Access Node
                    </h4>
                    <span style={{ color: branding.accent, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        [RUNTIME RESOLUTION ENGINE]
                    </span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ color: '#64748b', fontSize: '0.6rem', fontWeight: 800, marginBottom: '0.3rem', letterSpacing: '1px' }}>MOCK SUBDOMAIN INJECTOR:</div>
                    <select 
                        value={mockDomain} 
                        onChange={(e) => setMockDomain(e.target.value)}
                        style={{ 
                            background: 'transparent', color: '#f8fafc', border: 'none', 
                            outline: 'none', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'monospace' 
                        }}
                    >
                        <option value="localhost">localhost</option>
                        <option value="investing.agentic-flow.com">investing.agentic-flow.com</option>
                        <option value="fitness.agentic-flow.com">fitness.agentic-flow.com</option>
                        <option value="crypto.agentic-flow.com">crypto.agentic-flow.com</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '1.2rem', borderRadius: '12px', borderLeft: `4px solid ${branding.accent}` }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px', marginBottom: '0.5rem' }}>RESOLVED BRANDING PROFILE</div>
                    <div style={{ color: branding.accent, fontSize: '1.2rem', fontWeight: 800, textShadow: `0 0 10px ${branding.accent}40` }}>
                        {branding.name}
                    </div>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '1.2rem', borderRadius: '12px', borderLeft: `4px solid #38bdf8` }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px', marginBottom: '0.5rem' }}>RESOLVED WHOP SDK HOOK</div>
                    <div style={{ color: '#38bdf8', fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        {branding.whopId}
                    </div>
                </div>
            </div>
        
            <div id="engine-state-dump" style={{ display: 'none' }}>{engineState.status}:{engineState.entropy}</div>
        </div>
    );
};
