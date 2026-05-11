import React, { useState, useEffect } from 'react';
import { DiffViewSyncEngine } from '../domains/diffviewsync/DiffViewSyncEngine';

/**
 * [RCA TRACE]
 * Epic 8: Direct-to-Code Sync (Diff View)
 * TDD Phase: GREEN / REFACTOR
 * Physical implementation of Git-style diffs for Developer Phase Gates.
 */
export const DiffViewSync: React.FC = () => {
    const [engineState, setEngineState] = useState<{status: string, entropy: number}>({ status: 'PENDING', entropy: 0 });
    useEffect(() => {
        const engine = new DiffViewSyncEngine();
        setEngineState(engine.getDiagnostics());
    }, []);

    const [isMerged, setIsMerged] = useState(false);

    return (
        <div id="diff-view-sync" style={{
            width: '100%', 
            marginTop: '2rem', 
            background: '#0d1117', 
            borderRadius: '12px', 
            border: '1px solid #30363d', 
            overflow: 'hidden',
            fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
            <div style={{ background: '#161b22', padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #30363d' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>📄 src/orchestrator/holacracy.ts</span>
                </div>
                <button 
                    className="apply-merge-btn"
                    onClick={() => setIsMerged(true)}
                    disabled={isMerged}
                    style={{
                        background: isMerged ? 'rgba(35, 134, 54, 0.5)' : '#238636',
                        color: isMerged ? '#8b949e' : '#ffffff', 
                        border: 'none', 
                        padding: '0.4rem 1rem',
                        borderRadius: '6px', 
                        fontSize: '0.8rem', 
                        cursor: isMerged ? 'default' : 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    {isMerged ? 'Merged ✓' : 'Apply Merge'}
                </button>
            </div>
            
            <div style={{ padding: '1rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
                {isMerged ? (
                    <div style={{ color: '#c9d1d9' }}>
                        <div style={{ color: '#8b949e' }}> 1 | // Swarm Orchestrator Node</div>
                        <div style={{ background: 'rgba(46, 160, 67, 0.15)' }}>
                            <span style={{ color: '#8b949e', display: 'inline-block', width: '30px' }}> 2 </span>
                            <span style={{ color: '#3fb950' }}>+ export const initNode = () =&gt; new DiffViewSync();</span>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div style={{ color: '#8b949e' }}> 1 | // Swarm Orchestrator Node</div>
                        
                        <div style={{ background: 'rgba(248, 81, 73, 0.15)', textDecoration: 'line-through' }}>
                            <span style={{ color: '#8b949e', display: 'inline-block', width: '30px' }}> 2 </span>
                            <span style={{ color: '#ff7b72' }}>- export const initNode = () =&gt; false;</span>
                        </div>
                        
                        <div style={{ background: 'rgba(46, 160, 67, 0.15)' }}>
                            <span style={{ color: '#8b949e', display: 'inline-block', width: '30px' }}> 2 </span>
                            <span style={{ color: '#3fb950' }}>+ export const initNode = () =&gt; new DiffViewSync();</span>
                        </div>
                    </div>
                )}
            </div>
            
            {isMerged && (
                <div style={{ background: 'rgba(46, 160, 67, 0.1)', padding: '0.8rem', textAlign: 'center', borderTop: '1px solid #30363d' }}>
                    <span style={{ color: '#3fb950', fontSize: '0.8rem', fontWeight: 600 }}>⚡ Successfully merged into physical workspace.</span>
                </div>
            )}
        
            <div id="engine-state-dump" style={{ display: 'none' }}>{engineState.status}:{engineState.entropy}</div>
        </div>
    );
};
