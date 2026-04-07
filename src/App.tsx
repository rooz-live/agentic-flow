// src/App.tsx
// @business-context WSJF-Cycle-53: React Native Routing Arrays
// @adr ADR-044: Bounding Dashboards via explicit front-end Router components cleanly.
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TLDDashboard from './dashboard/pages/TLDDashboard';

const API_ENDPOINT = 'https://api.interface.rooz.live'; // Native cloud proxy boundaries

function TelemetryDashboard() {
  const [temporalLimit, setTemporalLimit] = useState(1000);
  const [inferenceResult, setInferenceResult] = useState('');
  const [governanceBlocked, setGovernanceBlocked] = useState(false);

  const performOfflineInference = async () => {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: `!turboquant ${temporalLimit}`,
          requested_minutes: temporalLimit 
        })
      });

      const data = await response.json();
      
      // If Python governance formally rejects it, standardizing the React hook to drop
      if (data.status === 'governance_drop' || temporalLimit > 5000) {
        setGovernanceBlocked(true);
        setInferenceResult('WSJF R-2026-018: Attention Fragmented. Zoom limit severely exceeds 5000 minute array constraints. Request blocked natively by Governance Admission.');
      } else {
        setGovernanceBlocked(false);
        setInferenceResult(JSON.stringify(data.chunks, null, 2) || "Inference Matrix Accepted.");
      }

    } catch (err) {
      setGovernanceBlocked(true);
      setInferenceResult('Offline Network Proxy unreachable. Verify tld-config bounds are bound.');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <h1 style={{ color: '#fff' }}>Offline Inference Matrix</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Temporal Zoom Request (Minutes): </label>
        <input 
          type="number" 
          value={temporalLimit} 
          onChange={(e) => setTemporalLimit(Number(e.target.value))}
          style={{ background: '#334155', color: '#fff', border: '1px solid #475569', padding: '5px', borderRadius: '4px' }}
        />
        <button onClick={performOfflineInference} style={{ marginLeft: '10px', background: '#6366f1', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Request Trace</button>
      </div>

      <div style={{ 
        padding: '15px', 
        border: governanceBlocked ? '2px solid #ef4444' : '2px solid #10b981',
        backgroundColor: governanceBlocked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        borderRadius: '8px'
      }}>
        <pre>{inferenceResult}</pre>
      </div>
    </div>
  );
}

function HostBillBilling() {
  const [telemetry, setTelemetry] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_ENDPOINT}/api/stx-telemetry`)
      .then(res => res.json())
      .then(data => setTelemetry(data))
      .catch(err => console.error("Telemetry Endpoint Offline:", err));
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <h1 style={{ color: '#fff' }}>StarlingX HostBill Integration</h1>
      <p>Dashboard mapping dynamic STX boundaries cleanly parsing telemetry limits.</p>
      
      {telemetry && (
        <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #334155', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <h3>Target Node: {telemetry.stx_node}</h3>
          <p>Watts (AVG): <b>{telemetry.ipmi_telemetry?.pmbus_average_watts}W</b></p>
          <p>Peak Thermal: <b>{telemetry.ipmi_telemetry?.peak_thermal_celsius}°C</b></p>
          <p>HostBill Ledger Map: <b>${telemetry.hostbill_mapping_usd} USD/hr</b></p>
          <p style={{ color: telemetry.status === 'GREEN' ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
            Status: {telemetry.status}
          </p>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 50, display: 'flex', gap: '15px', padding: '15px 25px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', borderBottomLeftRadius: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace' }}>
        <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>Dashboard</Link>
        <Link to="/inference" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>Inference Node</Link>
        <Link to="/hostbill" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>Telemetry</Link>
      </div>
      <Routes>
        <Route path="/" element={<TLDDashboard />} />
        <Route path="/inference" element={<TelemetryDashboard />} />
        <Route path="/hostbill" element={<HostBillBilling />} />
      </Routes>
    </Router>
  );
}

export default App;
