import React, { useState, useEffect } from 'react';
import { QuantEngine } from '../domains/quant/QuantEngine';

/**
 * [RCA TRACE] Epic 17: Quant Alpha Domain Capability
 * TDD Phase: REFACTOR
 * Wired up to the physical DDD model (QuantEngine).
 */
export const QuantAlpha: React.FC = () => {
    const [prices, setPrices] = useState<number[]>([100, 102, 99, 101, 100]);
    const [currentPrice, setCurrentPrice] = useState<number>(100);
    const [signal, setSignal] = useState<'BUY' | 'SELL' | 'HOLD'>('HOLD');
    
    useEffect(() => {
        const engine = new QuantEngine();
        setSignal(engine.calculateMeanReversionSignal(prices, currentPrice));
    }, [prices, currentPrice]);

    // Simulate live ticking
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentPrice(prev => {
                const newPrice = prev + (Math.random() * 10 - 5);
                setPrices(old => [...old.slice(1), prev]); // Push previous to historical
                return newPrice;
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div id="quant-alpha-module" style={{
            width: '100%', marginTop: '2rem', padding: '1.5rem',
            background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)',
            border: `1px solid ${signal === 'BUY' ? '#10b981' : signal === 'SELL' ? '#ef4444' : '#059669'}`, 
            borderRadius: '16px',
            fontFamily: "'Inter', sans-serif"
        }}>
            <h4 style={{ margin: '0 0 1.5rem 0', color: '#a7f3d0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.3rem' }}>📈</span> Quant Alpha Trading (Capability Payload)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div style={{ background: '#022c22', padding: '1.5rem', borderRadius: '12px', borderLeft: `4px solid ${signal === 'BUY' ? '#10b981' : signal === 'SELL' ? '#ef4444' : '#34d399'}` }}>
                    <div style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', fontFamily: "'Space Mono', monospace" }}>
                        EXECUTING STRATEGY: R-MEAN-REVERSION
                    </div>
                    <div style={{ color: '#6ee7b7', fontSize: '1.6rem', fontWeight: 800, marginTop: '0.8rem' }}>
                        LIVE SIGNAL: {signal}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        Current Price Index: {currentPrice.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
};
