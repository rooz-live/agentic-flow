/**
 * [RCA TRACE]
 * Epic: Generative UI (High-Level Integration)
 * Deep Why: Users need immediate, contextual assistance to refine their inputs without 
 * leaving their primary workflow. The Magic Wand offloads syntax/persona formatting 
 * to a localized or fast-flash LLM model.
 * Impact: ROI [High] - Reduces cognitive load for non-technical users entering the network.
 */
import React, { useState, useEffect } from 'react';
import { MagicWandEngine } from '../domains/magicwand/MagicWandEngine';

export const MagicWand: React.FC = () => {
    const [engineState, setEngineState] = useState<{status: string, entropy: number}>({ status: 'PENDING', entropy: 0 });
    useEffect(() => {
        const engine = new MagicWandEngine();
        setEngineState(engine.getDiagnostics());
    }, []);

  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMagicWandClick = () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    
    // Simulate offloading to fast local model for grammar/persona rewrite
    setTimeout(() => {
      setText(`<task>Auto-Refined Output</task>\n<audience>Tech</audience>\n\n${text.toUpperCase()}`);
      setIsProcessing(false);
    }, 1200);
  };

  return (
    <div style={{
      width: '100%',
      position: 'relative',
      marginTop: '2rem',
      backgroundColor: 'rgba(25, 25, 35, 0.4)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '1.5rem',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
    }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#c084fc', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
        <span>🪄</span> Generative UI Vector
      </h3>
      
      <div style={{ position: 'relative' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="I need a blog post... (Click the wand to auto-wrap schema)"
          disabled={isProcessing}
          style={{
            width: '100%',
            minHeight: '120px',
            backgroundColor: 'rgba(10, 10, 15, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            color: '#fff',
            padding: '1rem',
            paddingRight: '3.5rem', // space for the wand button
            fontSize: '0.95rem',
            fontFamily: 'Inter, sans-serif',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        
        <button
          onClick={handleMagicWandClick}
          disabled={isProcessing || !text.trim()}
          style={{
            position: 'absolute',
            right: '12px',
            bottom: '18px',
            background: 'linear-gradient(135deg, #818cf8, #c084fc)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isProcessing || !text.trim() ? 'not-allowed' : 'pointer',
            opacity: isProcessing || !text.trim() ? 0.4 : 1,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isProcessing || !text.trim() ? 'none' : '0 0 20px rgba(192, 132, 252, 0.5)'
          }}
          title="Magic Wand: Auto-Refine & Apply Shadow Templating"
        >
          {isProcessing ? '⏳' : '✨'}
        </button>
      </div>
      
      <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
        <span>Phase Gate: <strong>Beginner</strong> (Pills & Hints)</span>
        <span>Shadow Templating <strong>Active</strong></span>
      </div>
    
            <div id="engine-state-dump" style={{ display: 'none' }}>{engineState.status}:{engineState.entropy}</div>
        </div>
  );
};
