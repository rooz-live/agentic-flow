import React from 'react';
import { DiffViewSync } from '../components/DiffViewSync';
import { TensorLedger } from '../components/TensorLedger';
import { SubalternGovModule } from '../components/SubalternGovModule';
import { GenerativeAccessNode } from '../components/GenerativeAccessNode';
import { SwarmTelemetry } from '../components/SwarmTelemetry';
import { OGovCore } from '../components/OGovCore';
import { CICDDashboard } from '../components/CICDDashboard';
import { ArtifactGenerator } from '../components/ArtifactGenerator';
import { RefactorLoop } from '../components/RefactorLoop';
import { HoshinKanri } from '../components/HoshinKanri';
import { SwarmMatrix } from '../components/SwarmMatrix';
import { GembaWalk } from '../components/GembaWalk';
import { QuantumEntanglement } from '../components/QuantumEntanglement';
import { SubalternSEO } from '../components/SubalternSEO';
import { TerminalClosureGate } from '../components/TerminalClosureGate';

export const GovernancePage: React.FC = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Governance & Telemetry</h1>
            <p style={{ color: '#94a3b8', marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2rem' }}>Macro system observability, organizational flow, and policy matrices.</p>
            <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <OGovCore />
                <SubalternGovModule />
                <HoshinKanri />
                <SwarmTelemetry />
                <SwarmMatrix />
                <TensorLedger />
                <DiffViewSync />
                <GenerativeAccessNode />
                <CICDDashboard />
                <ArtifactGenerator />
                <RefactorLoop />
                <GembaWalk />
                <QuantumEntanglement />
                <SubalternSEO />
                <TerminalClosureGate />
            </section>
        </div>
    );
};
