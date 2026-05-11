import React from 'react';

/**
 * [RCA TRACE] Epic 28: Whop SDK Injector
 */
export const WhopSDKInjector: React.FC = () => {
    return (
        <div id="whop-injector-module" style={{
            width: '100%', marginTop: '2rem', padding: '1.5rem',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            border: '1px solid #6366f1', borderRadius: '16px',
            fontFamily: "'Inter', sans-serif"
        }}>
            <h4 style={{ margin: '0 0 1.5rem 0', color: '#c7d2fe', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.3rem' }}>🔑</span> Whop SDK Dynamic Injection Layer
            </h4>
            
            <div style={{ background: '#3730a3', padding: '1.2rem', borderRadius: '12px', borderLeft: '4px solid #818cf8' }}>
                <div style={{ color: '#a5b4fc', fontSize: '0.75rem', fontFamily: "'Space Mono', monospace", marginBottom: '1.2rem', fontWeight: 800, letterSpacing: '1px' }}>
                    RESOLVING TENANT SUBSCRIPTION PAYLOADS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e0e7ff', fontSize: '0.9rem', borderBottom: '1px solid #4f46e5', paddingBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>subaltern.o-gov.com</span> <span style={{ color: '#10b981', fontWeight: 800 }}>[TIER: ENTERPRISE]</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e0e7ff', fontSize: '0.9rem' }}>
                        <span style={{ fontWeight: 600 }}>fitness.o-gov.com</span> <span style={{ color: '#fbbf24', fontWeight: 800 }}>[TIER: PRO]</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
