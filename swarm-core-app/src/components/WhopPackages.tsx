import React from 'react';
import './WhopPackages.css';

/**
 * [RCA TRACE]
 * Epic: Sovereign Infrastructure Monetization
 * Bounded Context: Maps Gen-UI Phase Gates natively to the Whop subscription tiers.
 */
export const WhopPackages: React.FC = () => {

    return (
        <div className="whop-container">
            <h2 className="whop-title">Whop Network Packages</h2>
            <p className="whop-subtitle">Structural Sovereignty over Completion Velocity. Deploy the actual swarm.</p>
            
            <div className="whop-grid">
                
                {/* Tier 1: Agentic Seat */}
                <div className="whop-card">
                    <h3 className="whop-card-title-seat">Agentic Seat</h3>
                    <p className="whop-price">$49/mo</p>
                    <p className="whop-desc">For individual operators engaging the swarm.</p>
                    <ul className="whop-list">
                        <li>✅ Swarm Telemetry Access</li>
                        <li>✅ Read-Only Ledger Validation</li>
                        <li>✅ Basic Decentralized Identity</li>
                        <li>💊 <strong>Beginners Phase Gate</strong> (Guided Text & Dynamic Pills)</li>
                    </ul>
                    <button className="whop-btn whop-btn-seat" onClick={() => window.location.href = 'https://whop.com/checkout/plan_3Gf9P...'}>
                        Provision Seat
                    </button>
                </div>

                {/* Tier 2: Sovereign Node */}
                <div className="whop-card whop-card-recommended">
                    <div className="whop-recommended-badge">RECOMMENDED</div>
                    <h3 className="whop-card-title-node">Sovereign Node</h3>
                    <p className="whop-price">$199/mo</p>
                    <p className="whop-desc">Deploy structural sovereignty.</p>
                    <ul className="whop-list">
                        <li>✅ Full Read/Write Ledger Operations</li>
                        <li>✅ Automated Resource Scaling</li>
                        <li>✅ Rev-Share Execution (10%)</li>
                        <li>🎛️ <strong>Power Users Phase Gate</strong> (Style Tokens & Sliders)</li>
                    </ul>
                    <button className="whop-btn whop-btn-node" onClick={() => window.location.href = 'https://whop.com/checkout/plan_Tj82X...'}>
                        Deploy Node
                    </button>
                </div>

                {/* Tier 3: Holacracy Enterprise */}
                <div className="whop-card">
                    <h3 className="whop-card-title-enterprise">Holacracy Enterprise</h3>
                    <p className="whop-price">$999/mo</p>
                    <p className="whop-desc">Full matrix control and unmetered deployment.</p>
                    <ul className="whop-list">
                        <li>✅ White-Glove Swarm Implementation</li>
                        <li>✅ Infinite Sub-Domain Generation</li>
                        <li>✅ Max Priority Tensor Execution</li>
                        <li>🎨 <strong>Designers Phase Gate</strong> (Canvas & Ghost Components)</li>
                    </ul>
                    <button className="whop-btn whop-btn-enterprise" onClick={() => window.location.href = 'https://whop.com/checkout/plan_Wp04Z...'}>
                        Initialize Enterprise
                    </button>
                </div>
            </div>
        </div>
    );
};
