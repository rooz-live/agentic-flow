import React from 'react';
import { QuantAlpha } from '../components/QuantAlpha';
import { HypertrophyAI } from '../components/HypertrophyAI';
import { GenerativeUIController } from '../components/GenerativeUIController';
import { MultiAgentCleanRoom } from '../components/MultiAgentCleanRoom';
import { CanvasBoard } from '../components/CanvasBoard';
import { WhopPackages } from '../components/WhopPackages';
import { GenerativeUIBoard } from '../components/GenerativeUIBoard';
import { CapacitorNativeGate } from '../components/CapacitorNativeGate';

export const CapabilitiesPage: React.FC = () => {
    return (
        <div className="page-container">
            <h1 className="page-title">Swarm Capabilities</h1>
            <p className="page-subtitle">Generative workflows, domains, and UX subroutines.</p>
            <section className="page-section-tight">
                <GenerativeUIBoard />
                <CapacitorNativeGate />
                <QuantAlpha />
                <HypertrophyAI />
                <GenerativeUIController />
                <MultiAgentCleanRoom />
                <CanvasBoard />
                <WhopPackages />
            </section>
        </div>
    );
};
