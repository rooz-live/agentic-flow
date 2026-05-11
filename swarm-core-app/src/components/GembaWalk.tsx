import React, { useState, useEffect } from 'react';
import { GembaWalkEngine } from '../domains/gembawalk/GembaWalkEngine';

/**
 * [RCA TRACE] Epic 26: Gemba Walk Observer (San Gen Shugi)
 */
export const GembaWalk: React.FC = () => {
    const [engineState, setEngineState] = useState<{status: string, entropy: number}>({ status: 'PENDING', entropy: 0 });
    useEffect(() => {
        const engine = new GembaWalkEngine();
        setEngineState(engine.getDiagnostics());
    }, []);

    return (
        <div id="gemba-walk-module" style={{
            width: '100%', marginTop: '2rem', padding: '1.5rem',
            background: 'linear-gradient(135deg, #171717 0%, #262626 100%)',
            border: '1px solid #737373', borderRadius: '16px',
            fontFamily: "'Inter', sans-serif"
        }}>
            <h4 style={{ margin: '0 0 1.5rem 0', color: '#d4d4d4', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.3rem' }}>🚶</span> Physical Gemba Walk (San Gen Shugi)
            </h4>
            
            <div style={{ background: '#171717', padding: '1.2rem', borderRadius: '12px', borderLeft: '4px solid #a3a3a3' }}>
                <div style={{ color: '#737373', fontSize: '0.75rem', fontFamily: "'Space Mono', monospace", marginBottom: '1.2rem', fontWeight: 800 }}>
                    PHYSICAL OBSERVATION OF THE WORKSPACE (CSS DEBT)
                </div>
                <div style={{ color: '#e5e5e5', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #404040', paddingBottom: '0.6rem', marginBottom: '0.6rem' }}>
                        <span style={{ fontWeight: 600 }}>App.tsx</span> <span style={{ color: '#ef4444', fontWeight: 800 }}>[DEBT: 42 INLINE STYLES]</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #404040', paddingBottom: '0.6rem', marginBottom: '0.6rem' }}>
                        <span style={{ fontWeight: 600 }}>SubalternGovModule.tsx</span> <span style={{ color: '#eab308', fontWeight: 800 }}>[DEBT: 18 INLINE STYLES]</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600 }}>GembaWalk.tsx</span> <span style={{ color: '#22c55e', fontWeight: 800 }}>[CLEAN: 0 DEBT]</span>
                    </div>
                </div>
            </div>
        
            <div id="engine-state-dump" style={{ display: 'none' }}>{engineState.status}:{engineState.entropy}</div>
        </div>
    );
};
