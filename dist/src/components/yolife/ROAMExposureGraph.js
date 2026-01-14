import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';
export const ROAMExposureGraph = ({ metrics }) => {
    const data = [
        { subject: 'Risk', value: metrics.risk, fullMark: 50 },
        { subject: 'Obstacle', value: metrics.obstacle, fullMark: 50 },
        { subject: 'Assumption', value: metrics.assumption, fullMark: 50 },
        { subject: 'Mitigation', value: metrics.mitigation, fullMark: 50 },
    ];
    const getExposureColor = (score) => {
        if (score >= 7)
            return '#ef4444'; // red - high
        if (score >= 4)
            return '#eab308'; // yellow - medium
        return '#22c55e'; // green - low
    };
    return (_jsxs(Box, { children: [_jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(RadarChart, { data: data, children: [_jsx(PolarGrid, { stroke: "#374151" }), _jsx(PolarAngleAxis, { dataKey: "subject", tick: { fill: '#9ca3af', fontSize: 12 } }), _jsx(PolarRadiusAxis, { angle: 90, domain: [0, 50], tick: { fill: '#6b7280' } }), _jsx(Radar, { name: "ROAM", dataKey: "value", stroke: "#3b82f6", fill: "#3b82f6", fillOpacity: 0.6 })] }) }), _jsxs(Box, { sx: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 2 }, children: [_jsx(Box, { children: _jsxs(Typography, { variant: "caption", color: "error", children: ["Risk: ", metrics.risk] }) }), _jsx(Box, { children: _jsxs(Typography, { variant: "caption", color: "warning.main", children: ["Obstacle: ", metrics.obstacle] }) }), _jsx(Box, { children: _jsxs(Typography, { variant: "caption", color: "info.main", children: ["Assumption: ", metrics.assumption] }) }), _jsx(Box, { children: _jsxs(Typography, { variant: "caption", color: "success.main", children: ["Mitigation: ", metrics.mitigation] }) })] })] }));
};
export default ROAMExposureGraph;
//# sourceMappingURL=ROAMExposureGraph.js.map