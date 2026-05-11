import React, { useState } from 'react';
import { MagicWand } from './MagicWand';

/**
 * [RCA TRACE]
 * Epic: Generative UI (High-Level Integration)
 * Deep Why: Implements WSJF prioritized Tactical Implementation parameters.
 * Phase Gates: Beginners (Pills), Power Users (Sliders), Designers (Canvas).
 */
export const GenerativeUIController: React.FC = () => {
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState('Minimal');
  
  const styleTokens = [
    { id: 'Minimal', icon: '⚪', desc: 'Clean & whitespace' },
    { id: 'Bold', icon: '⬛', desc: 'High contrast' },
    { id: 'Sketch', icon: '✏️', desc: 'Hand-drawn feel' },
    { id: 'Realistic', icon: '📸', desc: 'Photorealistic' }
  ];

  const dynamicPills = [
    "Summarize my spending",
    "Generate a [Marketing Plan]",
    "Diff View this workspace",
    "Run Holacracy standup"
  ];

  return (
    <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2 className="dynamic-gradient-text" style={{ margin: 0, fontSize: '1.5rem' }}>
        Tactical Generative Integration
      </h2>

      {/* Dynamic Pills (Beginner Phase Gate) */}
      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
        {dynamicPills.map(pill => (
          <button 
            key={pill}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              border: '1px solid rgba(192, 132, 252, 0.3)',
              background: 'rgba(192, 132, 252, 0.1)',
              color: '#c084fc',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={(e) => {
              (e.target as HTMLButtonElement).style.background = 'rgba(192, 132, 252, 0.3)';
            }}
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Magic Wand & Shadow Templating */}
      <MagicWand />

      {/* The Config Drawer (Power Users Phase Gate) */}
      <div style={{ marginTop: '1rem' }}>
        <button 
          onClick={() => setIsConfigDrawerOpen(!isConfigDrawerOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: 0
          }}
        >
          <span>{isConfigDrawerOpen ? '▼' : '▶'}</span> Advanced Configuration (Knobs)
        </button>
        
        {isConfigDrawerOpen && (
          <div style={{
            marginTop: '1rem',
            padding: '1.5rem',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem'
          }}>
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Temperature (0.0 - 1.0)</label>
              <input type="range" min="0" max="100" defaultValue="70" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Top-P (Nucleus Sampling)</label>
              <input type="range" min="0" max="100" defaultValue="90" style={{ width: '100%' }} />
            </div>
          </div>
        )}
      </div>

      {/* Visual Style Tokens */}
      <div style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '1rem', color: '#e2e8f0', marginBottom: '1rem' }}>Visual Style Tokens</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', maxWidth: '400px' }}>
          {styleTokens.map(token => (
            <div 
              key={token.id}
              onClick={() => setSelectedToken(token.id)}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: `2px solid ${selectedToken === token.id ? '#c084fc' : 'rgba(255,255,255,0.05)'}`,
                background: selectedToken === token.id ? 'rgba(192, 132, 252, 0.1)' : 'rgba(10,10,15,0.5)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{token.icon}</div>
              <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>{token.id}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{token.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
