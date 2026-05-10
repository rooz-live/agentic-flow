import React from 'react';
import { QuantAlpha } from '../components/QuantAlpha';
import { HypertrophyAI } from '../components/HypertrophyAI';
import { GenerativeUIController } from '../components/GenerativeUIController';
import { MultiAgentCleanRoom } from '../components/MultiAgentCleanRoom';
import { CanvasBoard } from '../components/CanvasBoard';

export const CapabilitiesPage: React.FC = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Swarm Capabilities</h1>
            <p style={{ color: '#94a3b8', marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2rem' }}>Generative workflows, domains, and UX subroutines.</p>
            <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <QuantAlpha />
                <HypertrophyAI />
                <GenerativeUIController />
                <MultiAgentCleanRoom />
                <CanvasBoard />
            </section>
        </div>
    );
};
