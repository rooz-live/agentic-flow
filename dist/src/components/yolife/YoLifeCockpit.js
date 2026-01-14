import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * yo.life Digital Cockpit - Main Dashboard Component
 * Integrates temporal/spatial/dimensional pivots, ROAM exposure, and circle equity
 */
import { useState, useEffect } from 'react';
import { Box, Container, Grid, Paper, Typography, Tabs, Tab, Card, CardContent, Chip, LinearProgress } from '@mui/material';
import { Timeline as TimelineIcon, PieChart as PieChartIcon, Layers as LayersIcon, Groups as GroupsIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import { CircleEquityChart } from './CircleEquityChart';
import { ROAMExposureGraph } from './ROAMExposureGraph';
import { TemporalPivot } from './TemporalPivot';
import { SpatialPivot } from './SpatialPivot';
import { DimensionalPivot } from './DimensionalPivot';
import { CircleActivityTimeline } from './CircleActivityTimeline';
const CIRCLES = [
    { name: 'orchestrator', color: '#3b82f6', episodes: 0, percentage: 0 },
    { name: 'assessor', color: '#22c55e', episodes: 0, percentage: 0 },
    { name: 'innovator', color: '#ec4899', episodes: 0, percentage: 0 },
    { name: 'analyst', color: '#06b6d4', episodes: 0, percentage: 0 },
    { name: 'seeker', color: '#eab308', episodes: 0, percentage: 0 },
    { name: 'intuitive', color: '#ef4444', episodes: 0, percentage: 0 },
];
export const YoLifeCockpit = () => {
    const [currentTab, setCurrentTab] = useState(0);
    const [circles, setCircles] = useState(CIRCLES);
    const [systemStatus, setSystemStatus] = useState({
        mcpServer: 'online',
        agentdb: 'connected',
        episodeStore: 'ready'
    });
    const [roamMetrics, setRoamMetrics] = useState({
        risk: 23,
        obstacle: 15,
        assumption: 31,
        mitigation: 18,
        exposureScore: 6.2
    });
    // Fetch circle equity data
    useEffect(() => {
        fetchCircleEquity();
        const interval = setInterval(fetchCircleEquity, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);
    const fetchCircleEquity = async () => {
        try {
            const response = await fetch('/api/circles/equity');
            if (response.ok) {
                const data = await response.json();
                setCircles(data.circles || CIRCLES);
            }
        }
        catch (error) {
            console.error('Failed to fetch circle equity:', error);
        }
    };
    const handleTabChange = (_event, newValue) => {
        setCurrentTab(newValue);
    };
    const getStatusColor = (status) => {
        if (status === 'online' || status === 'connected' || status === 'ready')
            return 'success';
        if (status === 'offline' || status === 'disconnected' || status === 'error')
            return 'error';
        return 'warning';
    };
    return (_jsxs(Container, { maxWidth: "xl", sx: { py: 4 }, children: [_jsxs(Box, { sx: { mb: 4 }, children: [_jsx(Typography, { variant: "h3", component: "h1", gutterBottom: true, sx: {
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #3b82f6 0%, #ec4899 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }, children: "yo.life Digital Cockpit" }), _jsx(Typography, { variant: "body1", color: "text.secondary", children: "Circle-based agile workflow orchestration and ROAM exposure tracking" })] }), _jsx(Paper, { sx: { p: 2, mb: 3, bgcolor: 'background.paper' }, children: _jsxs(Grid, { container: true, spacing: 2, alignItems: "center", children: [_jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "MCP Server:" }), _jsx(Chip, { label: systemStatus.mcpServer, color: getStatusColor(systemStatus.mcpServer), size: "small" })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "AgentDB:" }), _jsx(Chip, { label: systemStatus.agentdb, color: getStatusColor(systemStatus.agentdb), size: "small" })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Episode Store:" }), _jsx(Chip, { label: systemStatus.episodeStore, color: getStatusColor(systemStatus.episodeStore), size: "small" })] }) })] }) }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsxs(Grid, { item: true, xs: 12, md: 4, children: [_jsx(Card, { sx: { mb: 3 }, children: _jsxs(CardContent, { children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(GroupsIcon, {}), " Circle Activity"] }), circles.map((circle) => (_jsxs(Box, { sx: { mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 0.5 }, children: [_jsx(Typography, { variant: "body2", sx: { textTransform: 'capitalize' }, children: circle.name }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: [circle.episodes, " episodes"] })] }), _jsx(LinearProgress, { variant: "determinate", value: circle.percentage, sx: {
                                                        height: 8,
                                                        borderRadius: 1,
                                                        '& .MuiLinearProgress-bar': {
                                                            backgroundColor: circle.color
                                                        }
                                                    } })] }, circle.name)))] }) }), _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(PieChartIcon, {}), " Circle Equity"] }), _jsx(CircleEquityChart, { circles: circles })] }) })] }), _jsx(Grid, { item: true, xs: 12, md: 5, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsxs(Tabs, { value: currentTab, onChange: handleTabChange, variant: "fullWidth", children: [_jsx(Tab, { icon: _jsx(TimelineIcon, {}), label: "Temporal" }), _jsx(Tab, { icon: _jsx(LayersIcon, {}), label: "Spatial" }), _jsx(Tab, { icon: _jsx(TrendingUpIcon, {}), label: "Dimensional" })] }), _jsxs(Box, { sx: { mt: 3 }, children: [currentTab === 0 && _jsx(TemporalPivot, {}), currentTab === 1 && _jsx(SpatialPivot, { circles: circles }), currentTab === 2 && _jsx(DimensionalPivot, {})] })] }) }), _jsxs(Grid, { item: true, xs: 12, md: 3, children: [_jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "ROAM Exposure" }), _jsx(ROAMExposureGraph, { metrics: roamMetrics }), _jsxs(Box, { sx: { mt: 3 }, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: ["Total Entities: ", _jsx("strong", { children: roamMetrics.risk + roamMetrics.obstacle + roamMetrics.assumption + roamMetrics.mitigation })] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["Exposure Score: ", _jsxs("strong", { children: [roamMetrics.exposureScore.toFixed(1), "/10"] })] })] })] }) }), _jsx(Card, { sx: { mt: 3 }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Recent Activity" }), _jsx(CircleActivityTimeline, { circles: circles })] }) })] })] }), _jsxs(Paper, { sx: { p: 3, mt: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Action Items" }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Chip, { label: "Review orchestrator standup results", color: "primary", sx: { width: '100%' } }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Chip, { label: "Update assessor WSJF priorities", color: "success", sx: { width: '100%' } }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Chip, { label: "Address innovator retro findings", color: "warning", sx: { width: '100%' } }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Chip, { label: "Complete analyst refine analysis", color: "info", sx: { width: '100%' } }) })] })] })] }));
};
export default YoLifeCockpit;
//# sourceMappingURL=YoLifeCockpit.js.map