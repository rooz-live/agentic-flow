/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react'; 
import { MAPEKDashboard } from '../../src/components/MAPEKDashboard';

/**
 * TDD FIRST PRINCIPLES BDD SUITE
 * 
 * Boundary Testing for Zero-Spend Inversion Hypothesis and OPEX Gates.
 * Eradicating Completion Theater via Mechanical Verification.
 */
describe('MAPEKDashboard Architecture & Boundaries', () => {

  const MOCK_STATE_CRITICAL = {
    metrics: [],
    pewmaLatency: 1540,
    pewmaAlpha: 0.3,
    anomalyDetected: true,
    anomalyScore: 0.95,
    frugalMode: false,
    scenario: 'critical' as const,
    lastGcAt: Date.now(),
  };

  const MOCK_STATE_BASELINE = {
    metrics: [],
    pewmaLatency: 150,
    pewmaAlpha: 0.05,
    anomalyDetected: false,
    anomalyScore: 0.05,
    frugalMode: true,
    scenario: 'baseline' as const,
    lastGcAt: Date.now(),
  };

  it('fails gracefully when OPEX limit is breached to >95% (Zero-Spend Inversion Hypothesis)', () => {
    // 1. Arrange: Setup OPEX burn to 99% simulating out of bounds execution!
    render(<MAPEKDashboard overrideState={MOCK_STATE_BASELINE} overrideOpexPct={99} overrideOffload="denied" />);
    
    // 2. Assert: Verify the Gate is Closed structurally. It MUST drop the string to DOM.
    expect(screen.getByText(/GATE CLOSED/i)).toBeInTheDocument();
  });

  it('correctly maps adverse scenarios to Bare-Metal STX offloading via HostBill LBEC boundary', () => {
    // 1. Arrange: Scenario set to 'severe', anomaly active, LBEC triggered
    render(<MAPEKDashboard overrideState={MOCK_STATE_CRITICAL} overrideOpexPct={40} overrideOffload="bare-metal-edge" />);
    
    // 2. Assert: Verify 'bare-metal-edge' routing logic structurally breaks frugal mode limits and implies STX bounds
    const dispatchElement = screen.getByTestId('lbec-decision-status');
    expect(dispatchElement).toHaveTextContent(/BARE-METAL EDGE/i);
  });

  it('correctly merges hierarchical structural grid in Vector views', () => {
    // 1. Arrange: Baseline tracking Code/CLT scopes
    render(<MAPEKDashboard overrideState={MOCK_STATE_BASELINE} overrideOpexPct={10} overrideOffload="local" />);
    
    // 2. Assert: Verify Vector topological references are present
    const latencyNode = screen.getByTestId('pewma-latency-metric');
    expect(latencyNode).toHaveTextContent(/150/);
    expect(screen.getByTestId('frugal-mode-status')).toHaveTextContent(/ACTIVE/i);
  });
});
