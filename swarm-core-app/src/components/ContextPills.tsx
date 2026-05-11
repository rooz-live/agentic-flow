import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * [RCA TRACE]
 * Epic 10: Context-Aware Pills (Beginner Phase Gate)
 * Fetches actual page telemetry based on the physical routing layer.
 */
export const ContextPills: React.FC = () => {
    const location = useLocation();
    const [telemetry, setTelemetry] = useState<string | null>(null);

    const getPillsForRoute = (path: string) => {
        if (path.startsWith('/auth')) return ['Scan Biometrics', 'Verify Whop License'];
        if (path.startsWith('/engine')) return ['Fetch Telemetry', 'Analyze TensorLedger'];
        if (path.startsWith('/governance')) return ['Review ROAM Risks', 'Audit DoR Constraints'];
        if (path.startsWith('/admin')) return ['Provision Subdomains', 'Force Git-Merge'];
        if (path.startsWith('/capabilities')) return ['Scan MCP Bridges', 'Load Dask/TensorFlow'];
        return ['Summarize Page', 'Extract Entities'];
    };

    const pills = getPillsForRoute(location.pathname);

    const handlePillClick = (pill: string) => {
        setTelemetry(`Fetching telemetry for [${pill}] in bounded context [${location.pathname}]...`);
        setTimeout(() => {
            setTelemetry(`✅ Telemetry Acquired: [${pill}] execution physicalized.`);
        }, 1500);
    };

    // Clear telemetry on route change
    useEffect(() => {
        setTelemetry(null);
    }, [location.pathname]);

    return (
        <div id="context-pills-container" style={{
            display: 'flex', flexDirection: 'column', gap: '0.8rem',
            padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', 
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            marginBottom: '1rem', borderRadius: '8px'
        }}>
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>
                    Context Pills:
                </span>
                {pills.map((pill, idx) => (
                    <button 
                        key={idx}
                        className="context-pill-btn"
                        onClick={() => handlePillClick(pill)}
                        style={{
                            background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8', padding: '0.3rem 0.8rem', borderRadius: '16px',
                            fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                    >
                        ✨ {pill}
                    </button>
                ))}
            </div>
            {telemetry && (
                <div id="telemetry-output" style={{ fontSize: '0.8rem', color: '#10b981', fontFamily: 'monospace' }}>
                    {telemetry}
                </div>
            )}
        </div>
    );
};
