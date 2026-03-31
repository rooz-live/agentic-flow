import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Pivot View Components for yo.life Cockpit
 * Temporal, Spatial, and Dimensional analysis views
 */
import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// Temporal Pivot - Time-based view
export const TemporalPivot = () => {
    const timelineData = [
        { time: '00:00', episodes: 2 },
        { time: '04:00', episodes: 1 },
        { time: '08:00', episodes: 5 },
        { time: '12:00', episodes: 8 },
        { time: '16:00', episodes: 6 },
        { time: '20:00', episodes: 3 },
    ];
    return (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Episode Activity Over Time" }), _jsx(ResponsiveContainer, { width: "100%", height: 250, children: _jsxs(LineChart, { data: timelineData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#374151" }), _jsx(XAxis, { dataKey: "time", tick: { fill: '#9ca3af' } }), _jsx(YAxis, { tick: { fill: '#9ca3af' } }), _jsx(Tooltip, { contentStyle: { backgroundColor: '#1f2937', border: '1px solid #374151' }, labelStyle: { color: '#f3f4f6' } }), _jsx(Line, { type: "monotone", dataKey: "episodes", stroke: "#3b82f6", strokeWidth: 2 })] }) }), _jsxs(Box, { sx: { mt: 2 }, children: [_jsx(Typography, { variant: "body2", fontWeight: "bold", gutterBottom: true, children: "Today's Episodes" }), _jsxs(List, { dense: true, children: [_jsx(ListItem, { children: _jsx(ListItemText, { primary: "09:15 - orchestrator::standup", secondary: "Duration: 12m" }) }), _jsx(ListItem, { children: _jsx(ListItemText, { primary: "14:30 - assessor::wsjf", secondary: "Duration: 18m" }) })] })] })] }));
};
export const SpatialPivot = ({ circles }) => {
    return (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Circle Distribution" }), _jsx(ResponsiveContainer, { width: "100%", height: 250, children: _jsxs(BarChart, { data: circles, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#374151" }), _jsx(XAxis, { dataKey: "name", tick: { fill: '#9ca3af', fontSize: 11 }, angle: -45, textAnchor: "end", height: 80 }), _jsx(YAxis, { tick: { fill: '#9ca3af' } }), _jsx(Tooltip, { contentStyle: { backgroundColor: '#1f2937', border: '1px solid #374151' }, labelStyle: { color: '#f3f4f6' } }), _jsx(Bar, { dataKey: "episodes", fill: "#3b82f6" })] }) }), _jsxs(Box, { sx: { mt: 2 }, children: [_jsx(Typography, { variant: "body2", fontWeight: "bold", gutterBottom: true, children: "Circle Status" }), circles.slice(0, 3).map((circle) => (_jsx(Box, { sx: { mb: 1 }, children: _jsxs(Typography, { variant: "caption", sx: { textTransform: 'capitalize' }, children: [circle.name, ": ", _jsx(Chip, { label: circle.episodes > 0 ? 'Active' : 'Idle', size: "small", color: circle.episodes > 0 ? 'success' : 'default' })] }) }, circle.name)))] })] }));
};
// Dimensional Pivot - Multi-dimensional analysis
export const DimensionalPivot = () => {
    const ceremonyData = [
        { ceremony: 'standup', count: 8 },
        { ceremony: 'wsjf', count: 12 },
        { ceremony: 'review', count: 6 },
        { ceremony: 'retro', count: 5 },
        { ceremony: 'refine', count: 9 },
        { ceremony: 'replenish', count: 4 },
    ];
    return (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Ceremony Distribution" }), _jsx(ResponsiveContainer, { width: "100%", height: 250, children: _jsxs(BarChart, { data: ceremonyData, layout: "horizontal", children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#374151" }), _jsx(XAxis, { type: "number", tick: { fill: '#9ca3af' } }), _jsx(YAxis, { dataKey: "ceremony", type: "category", tick: { fill: '#9ca3af', fontSize: 11 }, width: 70 }), _jsx(Tooltip, { contentStyle: { backgroundColor: '#1f2937', border: '1px solid #374151' }, labelStyle: { color: '#f3f4f6' } }), _jsx(Bar, { dataKey: "count", fill: "#ec4899" })] }) }), _jsxs(Box, { sx: { mt: 2 }, children: [_jsx(Typography, { variant: "body2", fontWeight: "bold", gutterBottom: true, children: "Skill Utilization" }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "Top Skills: chaotic_workflow (12), full_cycle (10), retro_driven (8)" })] })] }));
};
export const CircleActivityTimeline = ({ circles }) => {
    const recentActivity = circles
        .filter(c => c.lastActivity)
        .slice(0, 5);
    return (_jsx(List, { dense: true, children: recentActivity.length > 0 ? (recentActivity.map((circle) => (_jsx(ListItem, { sx: { px: 0 }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, width: '100%' }, children: [_jsx(Box, { sx: {
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: circle.color,
                        } }), _jsxs(Box, { sx: { flex: 1 }, children: [_jsx(Typography, { variant: "caption", sx: { textTransform: 'capitalize' }, children: circle.name }), _jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: circle.lastActivity || 'No recent activity' })] })] }) }, circle.name)))) : (_jsx(ListItem, { sx: { px: 0 }, children: _jsx(ListItemText, { primary: _jsx(Typography, { variant: "caption", color: "text.secondary", children: "No recent activity" }) }) })) }));
};
//# sourceMappingURL=PivotComponents.js.map