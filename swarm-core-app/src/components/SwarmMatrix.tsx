import React, { useState, useEffect } from 'react';
import { SwarmMatrixEngine } from '../domains/swarmmatrix/SwarmMatrixEngine';

/**
 * [RCA TRACE] Epic 25: The Infinite Matrix (Horizontal Scaler)
 */
export const SwarmMatrix: React.FC = () => {
    const [engineState, setEngineState] = useState<{status: string, entropy: number}>({ status: 'PENDING', entropy: 0 });
    useEffect(() => {
        const engine = new SwarmMatrixEngine();
        setEngineState(engine.getDiagnostics());
    }, []);

    const [spawning, setSpawning] = useState(false);
    const [nodes, setNodes] = useState(['core', 'investing', 'fitness']);

    const spawnNode = () => {
        setSpawning(true);
        setTimeout(() => {
            setNodes([...nodes, `subaltern-${nodes.length + 1}`]);
            setSpawning(false);
        }, 1500);
    };

    return (
        <div id="swarm-matrix-module" style={{
            width: '100%', marginTop: '2rem', padding: '1.5rem',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            border: '1px solid #4f46e5', borderRadius: '16px',
            fontFamily: "'Inter', sans-serif"
        }}>
            <h4 style={{ margin: '0 0 1.5rem 0', color: '#a5b4fc', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.3rem' }}>🌌</span> The Infinite Matrix (Horizontal Scaler)
            </h4>
            
            <div style={{ background: '#1e1b4b', padding: '1.2rem', borderRadius: '12px', borderLeft: '4px solid #6366f1' }}>
                <div style={{ color: '#818cf8', fontSize: '0.85rem', fontFamily: "'Space Mono', monospace", marginBottom: '1.2rem', fontWeight: 800 }}>
                    ACTIVE DOMAIN NODES: {nodes.length}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {nodes.map((n, i) => (
                        <span key={i} style={{ background: '#3730a3', color: '#e0e7ff', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1px' }}>
                            {n.toUpperCase()}
                        </span>
                    ))}
                    {spawning && (
                        <span style={{ background: '#4338ca', color: '#818cf8', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1px', opacity: 0.7 }}>
                            [SPAWNING...]
                        </span>
                    )}
                </div>
                
                <button 
                    onClick={spawnNode} 
                    disabled={spawning}
                    style={{ 
                        width: '100%', padding: '0.9rem', 
                        background: spawning ? '#312e81' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', 
                        cursor: spawning ? 'not-allowed' : 'pointer', fontWeight: 800, transition: 'all 0.3s', letterSpacing: '1px'
                    }}>
                    SPAWN NEW SUBALTERN NODE
                </button>
            </div>
        
            <div id="engine-state-dump" style={{ display: 'none' }}>{engineState.status}:{engineState.entropy}</div>
        </div>
    );
};
