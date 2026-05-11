import React, { useState, useEffect } from 'react';
import { HypertrophyEngine } from '../domains/fitness/HypertrophyEngine';
import type { Routine } from '../domains/fitness/HypertrophyEngine';

/**
 * [RCA TRACE] Epic 18: Hypertrophy AI Domain Capability
 * TDD Phase: REFACTOR
 * Wired up to the physical DDD model (HypertrophyEngine).
 */
export const HypertrophyAI: React.FC = () => {
    const [focus, setFocus] = useState<'CHEST' | 'BACK' | 'LEGS'>('CHEST');
    const [routine, setRoutine] = useState<Routine | null>(null);
    const [projectedMass, setProjectedMass] = useState<number>(0);
    const [weeks, setWeeks] = useState<number>(1);
    
    const engine = new HypertrophyEngine();

    useEffect(() => {
        setRoutine(engine.generateRoutine(focus));
        setProjectedMass(engine.calculateLeanMassProjection(weeks, 0.85)); // 85% compliance
    }, [focus, weeks]);

    // Simulate time passing (weeks increasing)
    useEffect(() => {
        const interval = setInterval(() => {
            setWeeks(prev => (prev < 12 ? prev + 1 : 1));
            setFocus(prev => prev === 'CHEST' ? 'BACK' : prev === 'BACK' ? 'LEGS' : 'CHEST');
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div id="hypertrophy-ai-module" style={{
            width: '100%', marginTop: '2rem', padding: '1.5rem',
            background: 'linear-gradient(135deg, #431407 0%, #7c2d12 100%)',
            border: '1px solid #ea580c', borderRadius: '16px',
            fontFamily: "'Inter', sans-serif",
            boxShadow: '0 10px 30px rgba(234, 88, 12, 0.1)'
        }}>
            <h4 style={{ margin: '0 0 1.5rem 0', color: '#fed7aa', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.3rem' }}>🏋️</span> Hypertrophy AI (Capability Payload)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div style={{ background: '#431407', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #fb923c' }}>
                    <div style={{ color: '#fb923c', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', fontFamily: "'Space Mono', monospace" }}>
                        GENERATING MACRO-CYCLE: {routine?.type} [FOCUS: {focus}]
                    </div>
                    <div style={{ color: '#fdba74', fontSize: '1.6rem', fontWeight: 800, marginTop: '0.8rem' }}>
                        +{projectedMass.toFixed(2)}kg Lean Mass Projected ({weeks}w)
                    </div>
                    <div style={{ color: '#fed7aa', fontSize: '0.9rem', marginTop: '0.8rem', opacity: 0.8 }}>
                        Prescribed: {routine?.exercises.join(', ')}
                    </div>
                </div>
            </div>
        </div>
    );
};
