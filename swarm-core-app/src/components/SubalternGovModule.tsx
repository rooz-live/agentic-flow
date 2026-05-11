import React, { useState, useEffect } from 'react';
import { SubalternGovModuleEngine } from '../domains/subalterngovmodule/SubalternGovModuleEngine';

/**
 * [RCA TRACE]
 * Epic 12: Subaltern Governance Module
 * TDD Phase: GREEN / REFACTOR
 * Physical UI component splitting network contexts between the Institution and the Swarm.
 */
export const SubalternGovModule: React.FC = () => {
    const [engineState, setEngineState] = useState<{status: string, entropy: number}>({ status: 'PENDING', entropy: 0 });
    useEffect(() => {
        const engine = new SubalternGovModuleEngine();
        setEngineState(engine.getDiagnostics());
    }, []);

    const [activeNetwork, setActiveNetwork] = useState<'o-gov' | 'subaltern'>('subaltern');

    return (
        <div id="subaltern-gov-module" style={{
            width: '100%', marginTop: '2rem', padding: '1.5rem',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            border: '1px solid #312e81', borderRadius: '16px',
            fontFamily: "'Inter', sans-serif",
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
            <h4 style={{ margin: '0 0 1.5rem 0', color: '#c7d2fe', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem', letterSpacing: '1px' }}>
                <span style={{ fontSize: '1.3rem' }}>🏛️</span> Governance Router (Topological Partition)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                
                {/* Primary Institution Node */}
                <div 
                    onClick={() => setActiveNetwork('o-gov')}
                    className="gov-node-primary"
                    style={{
                        padding: '1.5rem', borderRadius: '12px', cursor: 'pointer',
                        background: activeNetwork === 'o-gov' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                        border: `1px solid ${activeNetwork === 'o-gov' ? '#3b82f6' : '#334155'}`,
                        transition: 'all 0.3s ease',
                        boxShadow: activeNetwork === 'o-gov' ? '0 0 20px rgba(59, 130, 246, 0.15)' : 'none'
                    }}
                >
                    <div style={{ color: activeNetwork === 'o-gov' ? '#60a5fa' : '#64748b', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1.5px', marginBottom: '0.5rem' }}>INSTITUTIONAL LAYER</div>
                    <div style={{ color: activeNetwork === 'o-gov' ? '#ffffff' : '#94a3b8', fontSize: '1.3rem', fontWeight: 800 }}>o-gov.com</div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '1rem', lineHeight: '1.4' }}>Constitutional Policy, Capital Allocation, & Trust-Path Core.</div>
                </div>

                {/* Subaltern Swarm Node */}
                <div 
                    onClick={() => setActiveNetwork('subaltern')}
                    className="gov-node-subaltern"
                    style={{
                        padding: '1.5rem', borderRadius: '12px', cursor: 'pointer',
                        background: activeNetwork === 'subaltern' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                        border: `1px solid ${activeNetwork === 'subaltern' ? '#a855f7' : '#334155'}`,
                        transition: 'all 0.3s ease',
                        boxShadow: activeNetwork === 'subaltern' ? '0 0 20px rgba(168, 85, 247, 0.15)' : 'none'
                    }}
                >
                    <div style={{ color: activeNetwork === 'subaltern' ? '#c084fc' : '#64748b', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1.5px', marginBottom: '0.5rem' }}>SWARM EXECUTION LAYER</div>
                    <div style={{ color: activeNetwork === 'subaltern' ? '#ffffff' : '#94a3b8', fontSize: '1.3rem', fontWeight: 800 }}>subaltern.o-gov.com</div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '1rem', lineHeight: '1.4' }}>Generative Access Nodes, Agentic Workflows, & Infinite Scaling.</div>
                </div>

            </div>
            
            <div style={{ marginTop: '1.5rem', padding: '1.2rem', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', borderLeft: `4px solid ${activeNetwork === 'o-gov' ? '#3b82f6' : '#a855f7'}`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px' }}>ACTIVE ROUTING PROXY: </span>
                <span style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace' }}>
                    {activeNetwork === 'o-gov' ? 'HTTPS // O-GOV.COM / STRICT CONSTITUTIONAL ENFORCEMENT' : 'HTTPS // SUBALTERN.O-GOV.COM / AUTONOMOUS HORIZONTAL SWARM'}
                </span>
            </div>
        
            <div id="engine-state-dump" style={{ display: 'none' }}>{engineState.status}:{engineState.entropy}</div>
        </div>
    );
};
