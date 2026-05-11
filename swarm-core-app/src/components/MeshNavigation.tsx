/**
 * [RCA TRACE]
 * Epic: Lateral Integration (Horizontal Swarm Ecosystem)
 * Deep Why: We must eliminate siloed user experiences. If a user lands in Decibel natively, 
 * they must be able to seamlessly jump to JobSwap or ArtChat without downloading a new app.
 * Impact: ROI [Extreme] - Maximizes user lifetime value across the entire domain matrix.
 */
import React, { useState, useEffect } from 'react';
import WhopAPI from '@whop/sdk';
import './MeshNavigation.css';

// Central Domain Registry for Native Mesh
const DOMAIN_NODES = [
  { id: 'decibel', name: 'Decibel.co', icon: '📊', color: '#818cf8', url: 'https://decibel.co' },
  { id: 'artchat', name: 'ArtChat.art', icon: '🎨', color: '#f472b6', url: 'https://artchat.art' },
  { id: 'jobswap', name: 'SummerJobSwap', icon: '🤝', color: '#4ade80', url: 'https://summerjobswap.com' },
  { id: 'tagvote', name: 'TAG.vote', icon: '🏷️', color: '#fbbf24', url: 'https://tag.vote' },
  { id: 'epic', name: 'EPIC.cab', icon: '🚖', color: '#c084fc', url: 'https://epic.cab' },
  { id: 'd720', name: 'Discord 720', icon: '🎧', color: '#5865F2', url: 'https://discord.720.chat' },
  { id: 'f720', name: 'Facebook 720', icon: '📘', color: '#1877F2', url: 'https://facebook.720.chat' },
  { id: 'i720', name: 'Insta 720', icon: '📸', color: '#E1306C', url: 'https://instagram.720.chat' },
  { id: 'dtag', name: 'Discord TAG', icon: '🎮', color: '#5865F2', url: 'https://discord.tag.vote' },
  { id: 'ytag', name: 'YouTube TAG', icon: '▶️', color: '#FF0000', url: 'https://youtube.tag.vote' }
];

export const MeshNavigation: React.FC = () => {
    const [activeNode, setActiveNode] = useState('decibel');
    const [whopClient, setWhopClient] = useState<any>(null);

    useEffect(() => {
        // Seeker Circle: Initialize Physical Whop SDK for cross-domain telemetry
        const initWhop = async () => {
            try {
                // @ts-expect-error - WhopAPI is dynamically imported
                const client = new WhopAPI({ token: import.meta.env.VITE_WHOP_API_KEY || 'whp_mock_token_77x' });
                setWhopClient(client);
            } catch (e) {
                console.warn("[SEEKER CIRCLE] Failed to initialize physical Whop SDK", e);
            }
        };
        initWhop();
    }, []);

    const handleTraversal = async (nodeId: string, url: string) => {
        setActiveNode(nodeId);
        console.log(`[LATERAL TRAVERSAL] Engaging mesh jump to: ${url}`);
        
        let traversalUrl = url;

        try {
            // Seeker Circle: Deeply integrate the actual @whop/sdk to securely mint
            if (whopClient && typeof whopClient.programs?.createAffiliateLink === 'function') {
                console.log(`[SEEKER] Requesting secure per-domain affiliate link via Whop API for: ${nodeId}`);
                const response = await whopClient.programs.createAffiliateLink({
                    campaignId: import.meta.env.VITE_WHOP_CAMPAIGN_ID || 'cmp_default',
                    destinationUrl: url,
                    metadata: { source: 'mesh_navigation', domain: nodeId }
                });
                
                if (response?.url) {
                    traversalUrl = response.url;
                }
            } else {
                // Fallback for local testing if API isn't fully hydrated
                const affiliateId = import.meta.env.VITE_WHOP_AFFILIATE_ID || localStorage.getItem('whop_affiliate_id') || 'swrm_default_720';
                const fallbackUrl = new URL(url);
                fallbackUrl.searchParams.append('ref', affiliateId);
                fallbackUrl.searchParams.append('source', 'mesh_navigation');
                traversalUrl = fallbackUrl.toString();
            }
        } catch (error) {
            console.error('[SEEKER] Failed to mint Whop affiliate link, using raw domain.', error);
        }
        
        window.location.assign(traversalUrl);
    };

    return (
        <nav className="mesh-nav-container">
            {DOMAIN_NODES.map(node => (
                <div key={node.id} className="nav-dropdown-container">
                    <button
                        onClick={() => handleTraversal(node.id, node.url)}
                        className={`nav-dropdown-button nav-node-${node.id} ${activeNode === node.id ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{node.icon}</span>
                        {node.name} ▾
                    </button>
                    {/* Vertically Integrated Subaltern Dropdown */}
                    <div className="nav-dropdown-menu">
                        <button onClick={(e) => { e.stopPropagation(); handleTraversal(node.id, `${node.url}/gen-ui`) }} className="nav-sub-btn">🎨 Gen-UI Matrix</button>
                        <button onClick={(e) => { e.stopPropagation(); handleTraversal(node.id, `${node.url}/subaltern`) }} className="nav-sub-btn">🌐 Subaltern Auth</button>
                        <button onClick={(e) => { e.stopPropagation(); handleTraversal(node.id, `${node.url}/roam`) }} className="nav-sub-btn">📊 ROAM Telemetry</button>
                    </div>
                </div>
            ))}
        </nav>
    );
};


