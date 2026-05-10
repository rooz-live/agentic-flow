/**
 * [RCA TRACE]
 * Epic: Lateral Integration (Horizontal Swarm Ecosystem)
 * Deep Why: We must eliminate siloed user experiences. If a user lands in Decibel natively, 
 * they must be able to seamlessly jump to JobSwap or ArtChat without downloading a new app.
 * Impact: ROI [Extreme] - Maximizes user lifetime value across the entire domain matrix.
 */
import React, { useState } from 'react';

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

/**
 * [UI/UX] Lateral Mesh Navigation
 * Implementation of Glassmorphism, Dynamic Pills, and Domain Traversability.
 */
export const MeshNavigation: React.FC = () => {
    // Execute jump (Using window.location for actual cross-domain traversal or native Capacitor bridging)
    window.location.assign(traversalUrl.toString());
  };

  return (
    <nav style={{
      width: '100%',
      padding: '1.5rem',
      background: 'rgba(15, 15, 20, 0.8)',
      backdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      display: 'flex',
      gap: '1rem',
      justifyContent: 'center',
      flexWrap: 'wrap',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      {DOMAIN_NODES.map(node => (
        <button
          key={node.id}
          onClick={() => handleTraversal(node.id, node.url)}
          style={{
            background: activeNode === node.id ? `rgba(${hexToRgb(node.color)}, 0.15)` : 'transparent',
            border: `1px solid ${activeNode === node.id ? node.color : 'rgba(255, 255, 255, 0.1)'}`,
            color: activeNode === node.id ? '#fff' : '#8892b0',
            padding: '0.6rem 1.4rem',
            borderRadius: '30px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: activeNode === node.id ? `0 0 20px rgba(${hexToRgb(node.color)}, 0.2)` : 'none',
            transform: activeNode === node.id ? 'scale(1.05)' : 'scale(1)'
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>{node.icon}</span>
          {node.name}
        </button>
      ))}
    </nav>
  );
};

// Extracted UI utility for Generative Token injection
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
    : '255, 255, 255';
}
