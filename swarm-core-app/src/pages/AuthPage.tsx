import React from 'react';
import { WhopAuthBridge } from '../components/WhopAuthBridge';
import { WhopSDKInjector } from '../components/WhopSDKInjector';
import { BiometricAuth } from '../components/BiometricAuth';
import { AppStoreGate } from '../components/AppStoreGate';
import { WhopPackages } from '../components/WhopPackages';

export const AuthPage: React.FC = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Identity & Security Gate</h1>
            <p style={{ color: '#94a3b8', marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2rem' }}>Authentication primitives and OS-level security boundaries.</p>
            <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <WhopAuthBridge />
                <WhopPackages />
                <WhopSDKInjector />
                <BiometricAuth />
                <AppStoreGate />
            </section>
        </div>
    );
};
