import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * [RCA TRACE] Epic 35: Supabase Data Sync (Physical Implementation)
 */
export const SupabaseSync: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [metrics, setMetrics] = useState<any[]>([]);

    useEffect(() => {
        const pingDatabase = async () => {
            setStatus('connecting');
            try {
                // Attempt to fetch from a standard swarm telemetry table
                const { data, error } = await supabase.from('swarm_telemetry').select('*').limit(1);
                
                if (error) {
                    throw error;
                }
                
                setMetrics(data || []);
                setStatus('connected');
            } catch (err: any) {
                console.error("Supabase Physical Ping Failed:", err);
                setStatus('error');
                setErrorMsg(err.message || 'Unknown network error');
            }
        };

        pingDatabase();
    }, []);

    return (
        <div style={{ padding: '2rem', border: '1px solid rgba(0, 255, 100, 0.4)', background: 'rgba(25, 35, 25, 0.8)', borderRadius: '20px', marginTop: '1.5rem' }}>
            <h3 style={{ color: '#00ff66', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                🧠 Supabase Core 
                <span style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', background: status === 'connected' ? '#004400' : status === 'error' ? '#440000' : '#444400' }}>
                    {status.toUpperCase()}
                </span>
            </h3>
            
            {status === 'error' ? (
                <div style={{ color: '#ff4444', marginTop: '1rem', padding: '1rem', background: 'rgba(255,0,0,0.1)', borderRadius: '8px' }}>
                    <strong>Physical Connection Failed:</strong> {errorMsg}
                    <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your physical .env file.</p>
                </div>
            ) : (
                <p style={{ color: '#94a3b8' }}>
                    {status === 'connecting' ? 'Establishing physical postgres connection...' : `Real-world Postgres database connectivity active. Found ${metrics.length} telemetry records.`}
                </p>
            )}
        </div>
    );
};
