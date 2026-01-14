/**
 * rooz.yo.life Subscription Cockpit
 * 
 * Dimensional UI for yo.life FLM (Flourishing Life Model) subscription system
 * - Temporal/Spatial/Economic/Psychological pivot dimensions
 * - Circle equity dashboard (orchestrator, assessor, innovator, analyst, seeker, intuitive)
 * - ROAM exposure graphs (Risk, Obstacle, Assumption, Mitigation)
 * - Episode tracking and skill-based learning integration
 * - Pricing hidden until requested (expandable menu pattern)
 * 
 * Per ADR-001: Web Components with MCP-Native Integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// API Configuration
const API_BASE = process.env.REACT_APP_COCKPIT_API || 'http://localhost:3030';

// Types
interface Circle {
  name: string;
  ceremonies: string[];
  activity: {
    count: number;
    percentage: number;
  };
}

interface CockpitData {
  timestamp: string;
  status: {
    raw: string;
    healthy: boolean;
  };
  equity: {
    timestamp: number;
    total_episodes: number;
    circles: Record<string, { count: number; percentage: number }>;
  };
  roam: {
    risk: number;
    obstacle: number;
    assumption: number;
    mitigation: number;
    total: number;
    exposureScore: number;
    timestamp: string;
  };
  episodes: any[];
  circles: Circle[];
}

interface Dimension {
  type: 'temporal' | 'spatial' | 'economic' | 'psychological';
  label: string;
  icon: string;
  description: string;
}

const DIMENSIONS: Dimension[] = [
  { type: 'temporal', label: 'Temporal', icon: '⏰', description: 'Time-based view (past, present, future)' },
  { type: 'spatial', label: 'Spatial', icon: '🌍', description: 'Location-based view (geographic, digital spaces)' },
  { type: 'economic', label: 'Economic', icon: '💰', description: 'Financial and resource view' },
  { type: 'psychological', label: 'Psychological', icon: '🧠', description: 'Mental model and cognitive view' },
];

const CIRCLE_COLORS: Record<string, string> = {
  orchestrator: '#FF6B6B',
  assessor: '#4ECDC4',
  innovator: '#45B7D1',
  analyst: '#96CEB4',
  seeker: '#FFEAA7',
  intuitive: '#DFE6E9',
};

export const RoozSubscriptionCockpit: React.FC = () => {
  const [cockpitData, setCockpitData] = useState<CockpitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDimension, setActiveDimension] = useState<Dimension['type']>('temporal');
  const [showPricing, setShowPricing] = useState(false);
  const [pivoting, setPivoting] = useState(false);

  // Fetch cockpit data
  const fetchCockpitData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get<CockpitData>(`${API_BASE}/api/cockpit`);
      setCockpitData(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load cockpit data');
      console.error('Cockpit data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Execute dimensional pivot
  const executePivot = useCallback(async (dimension: Dimension['type'], value?: string) => {
    try {
      setPivoting(true);
      await axios.post(`${API_BASE}/api/pivot`, { dimension, value });
      // Refresh data after pivot
      await fetchCockpitData();
    } catch (err: any) {
      setError(`Pivot failed: ${err.message}`);
      console.error('Pivot error:', err);
    } finally {
      setPivoting(false);
    }
  }, [fetchCockpitData]);

  // Initial data load
  useEffect(() => {
    fetchCockpitData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCockpitData, 30000);
    return () => clearInterval(interval);
  }, [fetchCockpitData]);

  // Handle dimension change
  const handleDimensionChange = (dimension: Dimension['type']) => {
    setActiveDimension(dimension);
    executePivot(dimension);
  };

  if (loading && !cockpitData) {
    return (
      <div className="rooz-loading">
        <div className="spinner"></div>
        <p>Loading rooz.yo.life cockpit...</p>
      </div>
    );
  }

  if (error && !cockpitData) {
    return (
      <div className="rooz-error">
        <h2>⚠️ Connection Error</h2>
        <p>{error}</p>
        <button onClick={fetchCockpitData}>Retry</button>
      </div>
    );
  }

  if (!cockpitData) return null;

  return (
    <div className="rooz-cockpit">
      {/* Header */}
      <header className="rooz-header">
        <div className="rooz-logo">
          <h1>rooz.yo.life</h1>
          <span className="rooz-tagline">Flourishing Life Model • Circle-Based Learning</span>
        </div>
        <div className="rooz-status">
          <span className={`status-badge ${cockpitData.status.healthy ? 'healthy' : 'unhealthy'}`}>
            {cockpitData.status.healthy ? '✓ Online' : '⚠ Degraded'}
          </span>
          <button onClick={fetchCockpitData} className="refresh-btn" title="Refresh">
            🔄
          </button>
        </div>
      </header>

      {/* Dimensional Navigation */}
      <nav className="rooz-dimensions">
        <div className="dimension-tabs">
          {DIMENSIONS.map((dim) => (
            <button
              key={dim.type}
              className={`dimension-tab ${activeDimension === dim.type ? 'active' : ''}`}
              onClick={() => handleDimensionChange(dim.type)}
              disabled={pivoting}
              title={dim.description}
            >
              <span className="dimension-icon">{dim.icon}</span>
              <span className="dimension-label">{dim.label}</span>
            </button>
          ))}
        </div>
        {pivoting && <div className="pivot-indicator">↻ Pivoting...</div>}
      </nav>

      <div className="rooz-content">
        {/* Circle Equity Dashboard */}
        <section className="rooz-section circle-equity">
          <h2>🎯 Circle Equity Balance</h2>
          <div className="equity-summary">
            <div className="total-episodes">
              <span className="value">{cockpitData.equity.total_episodes}</span>
              <span className="label">Total Episodes</span>
            </div>
          </div>
          <div className="circle-grid">
            {cockpitData.circles.map((circle) => (
              <div
                key={circle.name}
                className="circle-card"
                style={{ borderColor: CIRCLE_COLORS[circle.name] }}
              >
                <div className="circle-header">
                  <h3 style={{ color: CIRCLE_COLORS[circle.name] }}>{circle.name}</h3>
                  <span className="circle-count">{circle.activity.count}</span>
                </div>
                <div className="circle-ceremonies">
                  {circle.ceremonies.map((ceremony) => (
                    <span key={ceremony} className="ceremony-tag">
                      {ceremony}
                    </span>
                  ))}
                </div>
                <div className="circle-percentage">
                  <div
                    className="percentage-bar"
                    style={{
                      width: `${circle.activity.percentage}%`,
                      backgroundColor: CIRCLE_COLORS[circle.name],
                    }}
                  />
                  <span className="percentage-label">{circle.activity.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ROAM Exposure */}
        <section className="rooz-section roam-exposure">
          <h2>🎲 ROAM Exposure Ontology</h2>
          <div className="roam-score">
            <div className="score-circle">
              <span className="score-value">{cockpitData.roam.exposureScore}</span>
              <span className="score-max">/10</span>
            </div>
            <span className="score-label">Exposure Score</span>
          </div>
          <div className="roam-grid">
            <div className="roam-card risk">
              <span className="roam-icon">⚠️</span>
              <span className="roam-label">Risk</span>
              <span className="roam-count">{cockpitData.roam.risk}</span>
            </div>
            <div className="roam-card obstacle">
              <span className="roam-icon">🚧</span>
              <span className="roam-label">Obstacle</span>
              <span className="roam-count">{cockpitData.roam.obstacle}</span>
            </div>
            <div className="roam-card assumption">
              <span className="roam-icon">💭</span>
              <span className="roam-label">Assumption</span>
              <span className="roam-count">{cockpitData.roam.assumption}</span>
            </div>
            <div className="roam-card mitigation">
              <span className="roam-icon">🛡️</span>
              <span className="roam-label">Mitigation</span>
              <span className="roam-count">{cockpitData.roam.mitigation}</span>
            </div>
          </div>
          <div className="roam-total">
            Total ROAM Entities: <strong>{cockpitData.roam.total}</strong>
          </div>
        </section>

        {/* Recent Episodes */}
        <section className="rooz-section recent-episodes">
          <h2>📜 Recent Episodes</h2>
          {cockpitData.episodes.length === 0 ? (
            <p className="empty-state">No episodes recorded yet. Start a ceremony to create your first episode!</p>
          ) : (
            <div className="episodes-list">
              {cockpitData.episodes.map((episode, idx) => (
                <div key={idx} className="episode-card">
                  <span className="episode-circle" style={{ color: CIRCLE_COLORS[episode.circle] }}>
                    {episode.circle}
                  </span>
                  <span className="episode-ceremony">{episode.ceremony}</span>
                  <span className="episode-time">{new Date(episode.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Subscription Plans (Hidden by Default) */}
        <section className="rooz-section subscription-plans">
          <button
            className="show-pricing-btn"
            onClick={() => setShowPricing(!showPricing)}
          >
            {showPricing ? '🔽 Hide Pricing' : '💳 View Subscription Plans'}
          </button>

          {showPricing && (
            <div className="pricing-grid">
              <div className="plan-card basic">
                <h3>Basic</h3>
                <p className="price">$29<span>/month</span></p>
                <ul className="features">
                  <li>✓ Single circle access</li>
                  <li>✓ 10 episodes/month</li>
                  <li>✓ Basic ROAM tracking</li>
                  <li>✓ Temporal dimension</li>
                </ul>
                <button className="subscribe-btn">Subscribe</button>
              </div>

              <div className="plan-card professional featured">
                <div className="featured-badge">Most Popular</div>
                <h3>Professional</h3>
                <p className="price">$79<span>/month</span></p>
                <ul className="features">
                  <li>✓ All 6 circles</li>
                  <li>✓ Unlimited episodes</li>
                  <li>✓ Full ROAM ontology</li>
                  <li>✓ All 4 dimensions</li>
                  <li>✓ MCP integration</li>
                  <li>✓ Skill-based learning</li>
                </ul>
                <button className="subscribe-btn primary">Subscribe</button>
              </div>

              <div className="plan-card enterprise">
                <h3>Enterprise</h3>
                <p className="price">Custom</p>
                <ul className="features">
                  <li>✓ Everything in Professional</li>
                  <li>✓ Custom circle definitions</li>
                  <li>✓ White-label branding</li>
                  <li>✓ Dedicated support</li>
                  <li>✓ API access</li>
                  <li>✓ SSO integration</li>
                </ul>
                <button className="subscribe-btn">Contact Sales</button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="rooz-footer">
        <p>
          Powered by <strong>yo.life FLM</strong> • Private Coop: rooz.live.yoservice.com/circles
        </p>
        <p className="footer-note">
          Dimensional UI per ADR-001 • MCP/MPP Integration • Circle Equity Learning
        </p>
      </footer>

      {error && (
        <div className="error-toast">
          ⚠️ {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
    </div>
  );
};

export default RoozSubscriptionCockpit;
