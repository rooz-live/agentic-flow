import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const DIMENSIONS = [
    { type: 'temporal', label: 'Temporal', icon: '⏰', description: 'Time-based view (past, present, future)' },
    { type: 'spatial', label: 'Spatial', icon: '🌍', description: 'Location-based view (geographic, digital spaces)' },
    { type: 'economic', label: 'Economic', icon: '💰', description: 'Financial and resource view' },
    { type: 'psychological', label: 'Psychological', icon: '🧠', description: 'Mental model and cognitive view' },
];
const CIRCLE_COLORS = {
    orchestrator: '#FF6B6B',
    assessor: '#4ECDC4',
    innovator: '#45B7D1',
    analyst: '#96CEB4',
    seeker: '#FFEAA7',
    intuitive: '#DFE6E9',
};
export const RoozSubscriptionCockpit = () => {
    const [cockpitData, setCockpitData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeDimension, setActiveDimension] = useState('temporal');
    const [showPricing, setShowPricing] = useState(false);
    const [pivoting, setPivoting] = useState(false);
    // Fetch cockpit data
    const fetchCockpitData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE}/api/cockpit`);
            setCockpitData(response.data);
            setError(null);
        }
        catch (err) {
            setError(err.message || 'Failed to load cockpit data');
            console.error('Cockpit data fetch error:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Execute dimensional pivot
    const executePivot = useCallback(async (dimension, value) => {
        try {
            setPivoting(true);
            await axios.post(`${API_BASE}/api/pivot`, { dimension, value });
            // Refresh data after pivot
            await fetchCockpitData();
        }
        catch (err) {
            setError(`Pivot failed: ${err.message}`);
            console.error('Pivot error:', err);
        }
        finally {
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
    const handleDimensionChange = (dimension) => {
        setActiveDimension(dimension);
        executePivot(dimension);
    };
    if (loading && !cockpitData) {
        return (_jsxs("div", { className: "rooz-loading", children: [_jsx("div", { className: "spinner" }), _jsx("p", { children: "Loading rooz.yo.life cockpit..." })] }));
    }
    if (error && !cockpitData) {
        return (_jsxs("div", { className: "rooz-error", children: [_jsx("h2", { children: "\u26A0\uFE0F Connection Error" }), _jsx("p", { children: error }), _jsx("button", { onClick: fetchCockpitData, children: "Retry" })] }));
    }
    if (!cockpitData)
        return null;
    return (_jsxs("div", { className: "rooz-cockpit", children: [_jsxs("header", { className: "rooz-header", children: [_jsxs("div", { className: "rooz-logo", children: [_jsx("h1", { children: "rooz.yo.life" }), _jsx("span", { className: "rooz-tagline", children: "Flourishing Life Model \u2022 Circle-Based Learning" })] }), _jsxs("div", { className: "rooz-status", children: [_jsx("span", { className: `status-badge ${cockpitData.status.healthy ? 'healthy' : 'unhealthy'}`, children: cockpitData.status.healthy ? '✓ Online' : '⚠ Degraded' }), _jsx("button", { onClick: fetchCockpitData, className: "refresh-btn", title: "Refresh", children: "\uD83D\uDD04" })] })] }), _jsxs("nav", { className: "rooz-dimensions", children: [_jsx("div", { className: "dimension-tabs", children: DIMENSIONS.map((dim) => (_jsxs("button", { className: `dimension-tab ${activeDimension === dim.type ? 'active' : ''}`, onClick: () => handleDimensionChange(dim.type), disabled: pivoting, title: dim.description, children: [_jsx("span", { className: "dimension-icon", children: dim.icon }), _jsx("span", { className: "dimension-label", children: dim.label })] }, dim.type))) }), pivoting && _jsx("div", { className: "pivot-indicator", children: "\u21BB Pivoting..." })] }), _jsxs("div", { className: "rooz-content", children: [_jsxs("section", { className: "rooz-section circle-equity", children: [_jsx("h2", { children: "\uD83C\uDFAF Circle Equity Balance" }), _jsx("div", { className: "equity-summary", children: _jsxs("div", { className: "total-episodes", children: [_jsx("span", { className: "value", children: cockpitData.equity.total_episodes }), _jsx("span", { className: "label", children: "Total Episodes" })] }) }), _jsx("div", { className: "circle-grid", children: cockpitData.circles.map((circle) => (_jsxs("div", { className: "circle-card", style: { borderColor: CIRCLE_COLORS[circle.name] }, children: [_jsxs("div", { className: "circle-header", children: [_jsx("h3", { style: { color: CIRCLE_COLORS[circle.name] }, children: circle.name }), _jsx("span", { className: "circle-count", children: circle.activity.count })] }), _jsx("div", { className: "circle-ceremonies", children: circle.ceremonies.map((ceremony) => (_jsx("span", { className: "ceremony-tag", children: ceremony }, ceremony))) }), _jsxs("div", { className: "circle-percentage", children: [_jsx("div", { className: "percentage-bar", style: {
                                                        width: `${circle.activity.percentage}%`,
                                                        backgroundColor: CIRCLE_COLORS[circle.name],
                                                    } }), _jsxs("span", { className: "percentage-label", children: [circle.activity.percentage, "%"] })] })] }, circle.name))) })] }), _jsxs("section", { className: "rooz-section roam-exposure", children: [_jsx("h2", { children: "\uD83C\uDFB2 ROAM Exposure Ontology" }), _jsxs("div", { className: "roam-score", children: [_jsxs("div", { className: "score-circle", children: [_jsx("span", { className: "score-value", children: cockpitData.roam.exposureScore }), _jsx("span", { className: "score-max", children: "/10" })] }), _jsx("span", { className: "score-label", children: "Exposure Score" })] }), _jsxs("div", { className: "roam-grid", children: [_jsxs("div", { className: "roam-card risk", children: [_jsx("span", { className: "roam-icon", children: "\u26A0\uFE0F" }), _jsx("span", { className: "roam-label", children: "Risk" }), _jsx("span", { className: "roam-count", children: cockpitData.roam.risk })] }), _jsxs("div", { className: "roam-card obstacle", children: [_jsx("span", { className: "roam-icon", children: "\uD83D\uDEA7" }), _jsx("span", { className: "roam-label", children: "Obstacle" }), _jsx("span", { className: "roam-count", children: cockpitData.roam.obstacle })] }), _jsxs("div", { className: "roam-card assumption", children: [_jsx("span", { className: "roam-icon", children: "\uD83D\uDCAD" }), _jsx("span", { className: "roam-label", children: "Assumption" }), _jsx("span", { className: "roam-count", children: cockpitData.roam.assumption })] }), _jsxs("div", { className: "roam-card mitigation", children: [_jsx("span", { className: "roam-icon", children: "\uD83D\uDEE1\uFE0F" }), _jsx("span", { className: "roam-label", children: "Mitigation" }), _jsx("span", { className: "roam-count", children: cockpitData.roam.mitigation })] })] }), _jsxs("div", { className: "roam-total", children: ["Total ROAM Entities: ", _jsx("strong", { children: cockpitData.roam.total })] })] }), _jsxs("section", { className: "rooz-section recent-episodes", children: [_jsx("h2", { children: "\uD83D\uDCDC Recent Episodes" }), cockpitData.episodes.length === 0 ? (_jsx("p", { className: "empty-state", children: "No episodes recorded yet. Start a ceremony to create your first episode!" })) : (_jsx("div", { className: "episodes-list", children: cockpitData.episodes.map((episode, idx) => (_jsxs("div", { className: "episode-card", children: [_jsx("span", { className: "episode-circle", style: { color: CIRCLE_COLORS[episode.circle] }, children: episode.circle }), _jsx("span", { className: "episode-ceremony", children: episode.ceremony }), _jsx("span", { className: "episode-time", children: new Date(episode.timestamp).toLocaleString() })] }, idx))) }))] }), _jsxs("section", { className: "rooz-section subscription-plans", children: [_jsx("button", { className: "show-pricing-btn", onClick: () => setShowPricing(!showPricing), children: showPricing ? '🔽 Hide Pricing' : '💳 View Subscription Plans' }), showPricing && (_jsxs("div", { className: "pricing-grid", children: [_jsxs("div", { className: "plan-card basic", children: [_jsx("h3", { children: "Basic" }), _jsxs("p", { className: "price", children: ["$29", _jsx("span", { children: "/month" })] }), _jsxs("ul", { className: "features", children: [_jsx("li", { children: "\u2713 Single circle access" }), _jsx("li", { children: "\u2713 10 episodes/month" }), _jsx("li", { children: "\u2713 Basic ROAM tracking" }), _jsx("li", { children: "\u2713 Temporal dimension" })] }), _jsx("button", { className: "subscribe-btn", children: "Subscribe" })] }), _jsxs("div", { className: "plan-card professional featured", children: [_jsx("div", { className: "featured-badge", children: "Most Popular" }), _jsx("h3", { children: "Professional" }), _jsxs("p", { className: "price", children: ["$79", _jsx("span", { children: "/month" })] }), _jsxs("ul", { className: "features", children: [_jsx("li", { children: "\u2713 All 6 circles" }), _jsx("li", { children: "\u2713 Unlimited episodes" }), _jsx("li", { children: "\u2713 Full ROAM ontology" }), _jsx("li", { children: "\u2713 All 4 dimensions" }), _jsx("li", { children: "\u2713 MCP integration" }), _jsx("li", { children: "\u2713 Skill-based learning" })] }), _jsx("button", { className: "subscribe-btn primary", children: "Subscribe" })] }), _jsxs("div", { className: "plan-card enterprise", children: [_jsx("h3", { children: "Enterprise" }), _jsx("p", { className: "price", children: "Custom" }), _jsxs("ul", { className: "features", children: [_jsx("li", { children: "\u2713 Everything in Professional" }), _jsx("li", { children: "\u2713 Custom circle definitions" }), _jsx("li", { children: "\u2713 White-label branding" }), _jsx("li", { children: "\u2713 Dedicated support" }), _jsx("li", { children: "\u2713 API access" }), _jsx("li", { children: "\u2713 SSO integration" })] }), _jsx("button", { className: "subscribe-btn", children: "Contact Sales" })] })] }))] })] }), _jsxs("footer", { className: "rooz-footer", children: [_jsxs("p", { children: ["Powered by ", _jsx("strong", { children: "yo.life FLM" }), " \u2022 Private Coop: rooz.live.yoservice.com/circles"] }), _jsx("p", { className: "footer-note", children: "Dimensional UI per ADR-001 \u2022 MCP/MPP Integration \u2022 Circle Equity Learning" })] }), error && (_jsxs("div", { className: "error-toast", children: ["\u26A0\uFE0F ", error, _jsx("button", { onClick: () => setError(null), children: "\u00D7" })] }))] }));
};
export default RoozSubscriptionCockpit;
//# sourceMappingURL=RoozSubscriptionCockpit.js.map