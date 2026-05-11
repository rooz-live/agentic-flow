import React, { useState, useEffect } from 'react';
import { VisualTokensEngine } from '../domains/visualtokens/VisualTokensEngine';

/**
 * [RCA TRACE]
 * Epic 9: Visual Style Tokens
 * TDD Phase: GREEN / REFACTOR
 */
export const VisualTokens: React.FC = () => {
    const [engineState, setEngineState] = useState<{status: string, entropy: number}>({ status: 'PENDING', entropy: 0 });
    useEffect(() => {
        const engine = new VisualTokensEngine();
        setEngineState(engine.getDiagnostics());
    }, []);

    
    // Initialize default token on mount
    useEffect(() => {
        applyTheme('glass');
    }, []);

    const applyTheme = (theme: 'glass' | 'terminal' | 'cyberpunk' | 'minimal') => {
        const root = document.documentElement;
        if (theme === 'glass') {
            root.style.setProperty('--app-bg', 'rgba(10, 10, 15, 0.4)');
            root.style.setProperty('--neon-accent', '#00f0ff');
        } else if (theme === 'terminal') {
            root.style.setProperty('--app-bg', '#000000');
            root.style.setProperty('--neon-accent', '#4ade80');
        } else if (theme === 'cyberpunk') {
            root.style.setProperty('--app-bg', '#2b0944');
            root.style.setProperty('--neon-accent', '#fdf300');
        } else if (theme === 'minimal') {
            root.style.setProperty('--app-bg', '#ffffff');
            root.style.setProperty('--neon-accent', '#000000');
        }
    };

    return (
        <div id="visual-tokens-grid" style={{
            width: '100%', marginTop: '2rem', padding: '1.5rem',
            background: 'var(--app-bg, #1a1b26)',
            borderRadius: '16px', border: '1px solid var(--neon-accent, #333)',
            transition: 'all 0.3s ease',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
        }}>
            <h4 style={{ color: 'var(--neon-accent, #8892b0)', margin: '0 0 1.5rem 0', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>
                Visual Style Tokens (Global Mutator)
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button 
                    id="token-glass" 
                    onClick={() => applyTheme('glass')} 
                    style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid #00f0ff', padding: '1rem', borderRadius: '12px', cursor: 'pointer', color: '#fff', transition: 'all 0.2s', fontWeight: 500 }}
                >
                    Glassmorphism
                </button>
                <button 
                    id="token-terminal" 
                    onClick={() => applyTheme('terminal')} 
                    style={{ background: '#000', border: '1px solid #4ade80', padding: '1rem', borderRadius: '12px', cursor: 'pointer', color: '#4ade80', fontFamily: 'monospace', transition: 'all 0.2s' }}
                >
                    &gt;_ Terminal
                </button>
                <button 
                    id="token-cyberpunk" 
                    onClick={() => applyTheme('cyberpunk')} 
                    style={{ background: '#2b0944', border: '1px solid #fdf300', padding: '1rem', borderRadius: '12px', cursor: 'pointer', color: '#fdf300', fontWeight: 'bold', transition: 'all 0.2s', textShadow: '0 0 5px #fdf300' }}
                >
                    Cyberpunk
                </button>
                <button 
                    id="token-minimal" 
                    onClick={() => applyTheme('minimal')} 
                    style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '12px', cursor: 'pointer', color: '#0f172a', fontWeight: 600, transition: 'all 0.2s' }}
                >
                    Minimalist
                </button>
            </div>
        
            <div id="engine-state-dump" style={{ display: 'none' }}>{engineState.status}:{engineState.entropy}</div>
        </div>
    );
};
