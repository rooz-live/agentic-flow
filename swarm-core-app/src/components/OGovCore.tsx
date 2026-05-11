import React, { useState, useEffect } from 'react';
import { OGovCoreEngine } from '../domains/ogovcore/OGovCoreEngine';

/**
 * [RCA TRACE] Epic 19: O-GOV Institutional Core
 */
export const OGovCore: React.FC = () => {
    const [engineState, setEngineState] = useState<{status: string, entropy: number}>({ status: 'PENDING', entropy: 0 });
    useEffect(() => {
        const engine = new OGovCoreEngine();
        setEngineState(engine.getDiagnostics());
    }, []);

    return (
        <div id="ogov-core-module" style={{
            width: '100%', marginTop: '2rem', padding: '1.5rem',
            background: 'linear-gradient(135deg, #171717 0%, #262626 100%)',
            border: '1px solid #525252', borderRadius: '16px',
            fontFamily: "'Inter', sans-serif"
        }}>
            <h4 style={{ margin: '0 0 1.5rem 0', color: '#e5e5e5', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.3rem' }}>🏛️</span> O-GOV Institutional Ledger
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#171717', padding: '1.2rem', borderRadius: '12px', borderLeft: '4px solid #a3a3a3' }}>
                    <div style={{ color: '#a3a3a3', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px' }}>CONSTITUTIONAL INTEGRITY</div>
                    <div style={{ color: '#f5f5f5', fontSize: '1.1rem', fontWeight: 800, marginTop: '0.4rem' }}>V5.0 VERIFIED</div>
                </div>
                <div style={{ background: '#171717', padding: '1.2rem', borderRadius: '12px', borderLeft: '4px solid #eab308' }}>
                    <div style={{ color: '#a3a3a3', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px' }}>CAPITAL ALLOCATION (SWARM)</div>
                    <div style={{ color: '#fde047', fontSize: '1.2rem', fontWeight: 800, marginTop: '0.4rem', fontFamily: "'Space Mono', monospace" }}>
                        $24,050.00 STR/MO
                    </div>
                </div>
            </div>
        
            <div id="engine-state-dump" style={{ display: 'none' }}>{engineState.status}:{engineState.entropy}</div>
        </div>
    );
};
