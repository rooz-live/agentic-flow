import React, { useState } from 'react';
import { useWhopAuth } from '../contexts/WhopAuthContext';

/**
 * [RCA TRACE]
 * Epic 41/42: Whop SDK Auth Handshake (Physical Provider)
 * Physically drives the React Context state boundary.
 */
export const WhopAuthBridge: React.FC = () => {
    const { isAuthenticated, user, login, logout } = useWhopAuth();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleLogin = async () => {
        setIsProcessing(true);
        // Simulate OAuth hand-off and receipt of physical token
        await login('whp_live_secret_77x89y');
        setIsProcessing(false);
    };

    return (
        <div id="whop-auth-bridge" style={{
            width: '100%', padding: '1.5rem',
            background: '#020617', border: `1px solid ${isAuthenticated ? '#10b981' : '#f59e0b'}`,
            borderRadius: '16px', fontFamily: "'Inter', sans-serif",
            boxShadow: isAuthenticated ? '0 0 30px rgba(16, 185, 129, 0.15)' : 'none',
            transition: 'all 0.4s ease'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.3rem' }}>{isAuthenticated ? '🔓' : '🔒'}</span> Whop SDK Auth Bridge
                </h4>
                <div style={{
                    padding: '0.4rem 1.2rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '1.5px',
                    background: isAuthenticated ? 'rgba(16, 185, 129, 0.15)' : isProcessing ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: isAuthenticated ? '#10b981' : isProcessing ? '#38bdf8' : '#f59e0b',
                    border: `1px solid ${isAuthenticated ? '#10b981' : isProcessing ? '#38bdf8' : '#f59e0b'}`,
                    transition: 'all 0.3s'
                }}>
                    STATE: {isAuthenticated ? 'AUTHORIZED' : isProcessing ? 'HANDSHAKING' : 'UNAUTHORIZED'}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'stretch' }}>
                <div style={{ background: '#0f172a', padding: '1.2rem', borderRadius: '12px', border: '1px solid #1e293b' }}>
                    <div style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 800, marginBottom: '0.8rem', letterSpacing: '1px' }}>OAUTH HANDSHAKE SIMULATOR</div>
                    {!isAuthenticated ? (
                        <button 
                            onClick={handleLogin}
                            disabled={isProcessing}
                            style={{
                                width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none',
                                background: '#f59e0b',
                                color: '#000',
                                fontWeight: 800, cursor: isProcessing ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s', letterSpacing: '0.5px',
                                opacity: isProcessing ? 0.7 : 1
                            }}
                        >
                            {isProcessing ? 'Awaiting Whop API...' : 'Init Token Exchange'}
                        </button>
                    ) : (
                        <button 
                            onClick={logout}
                            style={{
                                width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ff4444',
                                background: 'rgba(255,0,0,0.1)',
                                color: '#ff4444',
                                fontWeight: 800, cursor: 'pointer',
                                transition: 'all 0.2s', letterSpacing: '0.5px'
                            }}
                        >
                            Terminate Session
                        </button>
                    )}
                </div>

                <div style={{ background: '#0f172a', padding: '1.2rem', borderRadius: '12px', border: '1px solid #1e293b' }}>
                    <div style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 800, marginBottom: '0.8rem', letterSpacing: '1px' }}>VERIFIED SESSION TOKEN</div>
                    <div style={{ 
                        fontFamily: "'Space Mono', monospace", color: isAuthenticated ? '#10b981' : '#475569', 
                        fontSize: isAuthenticated ? '0.85rem' : '0.8rem', background: '#020617', padding: '0.8rem', 
                        borderRadius: '6px', border: '1px inset #1e293b', wordBreak: 'break-all',
                        minHeight: '20px', display: 'flex', alignItems: 'center'
                    }}>
                        {isAuthenticated ? `whp_live_secret_77x89y (User: ${user?.username})` : 'NULL_SESSION_AWAITING_OAUTH'}
                    </div>
                </div>
            </div>
        </div>
    );
};
