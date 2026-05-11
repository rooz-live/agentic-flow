import React from 'react';
import { SupabaseSync } from '../components/SupabaseSync';
import { OfflineSQLite } from '../components/OfflineSQLite';
import { EdgeSync } from '../components/EdgeSync';
import { PushMatrix } from '../components/PushMatrix';
import { CapacitorNativeGate } from '../components/CapacitorNativeGate';
import { EnvRehydrator } from '../components/EnvRehydrator';

export const EnginePage: React.FC = () => {
    return (
        <div className="page-container">
            <h1 className="page-title">Physical Data Engine</h1>
            <p className="page-subtitle">Core connectivity, persistence, and event bus architectures.</p>
            <section className="page-section">
                <div>
                    <h2 className="section-title">Capacitor Native Gate</h2>
                    <CapacitorNativeGate />
                </div>
                <div>
                    <h2 className="section-title">Environment Rehydrator</h2>
                    <EnvRehydrator />
                </div>
                <div>
                    <h2 className="section-title">Supabase Sync</h2>
                    <SupabaseSync />
                </div>
                <div>
                    <h2 className="section-title">Offline SQLite Engine</h2>
                    <OfflineSQLite />
                </div>
                <div>
                    <h2 className="section-title">Optimistic Edge Sync</h2>
                    <EdgeSync />
                </div>
                <div>
                    <h2 className="section-title">Push Notification Matrix</h2>
                    <PushMatrix />
                </div>
            </section>
        </div>
    );
};
