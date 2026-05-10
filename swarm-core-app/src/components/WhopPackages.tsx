import React from 'react';

/**
 * [RCA TRACE]
 * Epic: Monetization & Whop Packages
 * Deep Why: A client must have a reason to purchase the architecture. We provide 3 distinct tiers 
 * representing specific Sovereign Node capabilities.
 */
export const WhopPackages: React.FC = () => {
    const packages = [
        {
            id: 'tier_1_mesh',
            name: 'Agentic Workflow Seat',
            price: '$49/mo',
            valueProp: 'Access to the cross-domain mesh (ArtChat, SummerJobSwap, Decibel).',
            features: ['Unified SSO Auth', 'Lateral Mesh Navigation', 'Basic AI Generative UI']
        },
        {
            id: 'tier_2_node',
            name: 'Sovereign Swarm Node',
            price: '$299/mo',
            valueProp: 'Self-hosted execution of the Agentic Swarm on your own cPanel/VPS.',
            features: ['Uncapped AI Workflows', 'Private Git Deployment Pipeline', 'TensorLedger Sync']
        },
        {
            id: 'tier_3_enterprise',
            name: 'Holacracy Enterprise',
            price: '$1,499/mo',
            valueProp: 'Full ecosystem rollout with Whop Affiliate tracking and Codemind Graph AI.',
            features: ['Graph-Backed Nervous System', 'Playwright Telemetry', 'B2B Subdomain Routing']
        }
    ];

    const handleCheckout = (pkgId: string) => {
        console.log(`[WHOP SDK] Initiating checkout flow for package: ${pkgId}`);
        alert(`Whop Checkout Triggered for ${pkgId}.\n(Will route to live Whop App URL once keys are injected)`);
    };

    return (
        <div style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
            <h2 style={{ fontSize: '1.8rem', color: '#f8fafc', marginBottom: '0.5rem' }}>Whop Network Packages</h2>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Acquire Sovereign Swarm capabilities directly via the Whop App infrastructure.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {packages.map(pkg => (
                    <div key={pkg.id} style={{
                        background: 'rgba(15, 15, 20, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#c084fc', fontSize: '1.2rem' }}>{pkg.name}</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff', marginBottom: '1rem' }}>{pkg.price}</div>
                        <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1.5rem', minHeight: '40px' }}>{pkg.valueProp}</p>
                        
                        <ul style={{ padding: 0, margin: '0 0 1.5rem 0', listStyle: 'none', flexGrow: 1 }}>
                            {pkg.features.map(feat => (
                                <li key={feat} style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: '#4ade80' }}>✓</span> {feat}
                                </li>
                            ))}
                        </ul>

                        <button 
                            onClick={() => handleCheckout(pkg.id)}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                                color: '#fff',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Purchase via Whop
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
