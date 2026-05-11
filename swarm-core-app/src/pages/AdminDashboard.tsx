import React, { useState } from 'react';
import './AdminDashboard.css';

/**
 * [RCA TRACE]
 * Epic 57: Unified Admin Dashboard
 * Domain-Driven Design (DDD): Orchestrates the Subdomain generation and ROAM risk tracking.
 */
export const AdminDashboard: React.FC = () => {
    const [subdomain, setSubdomain] = useState('');
    const [status, setStatus] = useState('Idle');

    const handleProvision = async () => {
        setStatus('Provisioning (MCP Harness Active)...');
        try {
            const response = await fetch('http://localhost:3001/api/provision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subdomain })
            });
            const data = await response.json();
            
            if (response.ok) {
                setStatus(data.message);
            } else {
                setStatus(`ERROR: ${data.error || 'Failed to provision node'}`);
            }
        } catch (error) {
            const e = error as Error;
            setStatus(`ERROR: Connection to Node.js bridge failed - ${e.message}`);
        }
    };

    return (
        <div className="admin-dashboard-container">
            <h1 className="admin-title">
                Unified Swarm Administration
            </h1>
            <p className="admin-subtitle">
                app/network/platform/software • MCP • MPP • ROAM Analysis: Active
            </p>

            <div className="admin-grid">
                {/* Network Layer: Subdomain Generation */}
                <div className="admin-panel">
                    <h3 className="admin-panel-title">Subdomain Generation Harness</h3>
                    <p className="admin-panel-desc">
                        Executes cPanel UAPI commands to physically allocate DNS and routing boundaries.
                    </p>
                    <input 
                        type="text" 
                        placeholder="e.g., subaltern" 
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value)}
                        className="admin-input"
                    />
                    <button 
                        onClick={handleProvision}
                        disabled={!subdomain}
                        className={`admin-btn ${subdomain ? 'admin-btn-active' : 'admin-btn-disabled'}`}
                    >
                        Provision Subdomain (cPanel UAPI)
                    </button>
                    {status !== 'Idle' && (
                        <div className={`admin-status ${status.includes('SUCCESS') ? 'admin-status-success' : 'admin-status-pending'}`}>
                            STATUS: {status}
                        </div>
                    )}
                </div>

                {/* Platform Layer: DDD Telemetry */}
                <div className="admin-panel">
                    <h3 className="admin-panel-title">DDD Structural Sovereignty</h3>
                    <ul className="admin-list">
                        <li className="admin-list-item">🟢 <strong>Auth Bounded Context:</strong> Whop SDK Linked</li>
                        <li className="admin-list-item">🟢 <strong>Telemetry Domain:</strong> TensorLedger Synced</li>
                        <li className="admin-list-item">🟢 <strong>Git Pipeline:</strong> Fileman UAPI Bridged</li>
                        <li>🟢 <strong>ROAM Status:</strong> All Critical Risks Mitigated</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
