/**
 * ROAM Exposure Radar Chart Component
 * Visualizes Risk, Obstacle, Assumption, Mitigation metrics
 */

import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';

interface ROAMMetrics {
  risk: number;
  obstacle: number;
  assumption: number;
  mitigation: number;
  exposureScore: number;
}

interface ROAMExposureGraphProps {
  metrics: ROAMMetrics;
}

export const ROAMExposureGraph: React.FC<ROAMExposureGraphProps> = ({ metrics }) => {
  const data = [
    { subject: 'Risk', value: metrics.risk, fullMark: 50 },
    { subject: 'Obstacle', value: metrics.obstacle, fullMark: 50 },
    { subject: 'Assumption', value: metrics.assumption, fullMark: 50 },
    { subject: 'Mitigation', value: metrics.mitigation, fullMark: 50 },
  ];

  const getExposureColor = (score: number) => {
    if (score >= 7) return '#ef4444'; // red - high
    if (score >= 4) return '#eab308'; // yellow - medium
    return '#22c55e'; // green - low
  };

  return (
    <Box>
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 50]} tick={{ fill: '#6b7280' }} />
          <Radar
            name="ROAM"
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 2 }}>
        <Box>
          <Typography variant="caption" color="error">
            Risk: {metrics.risk}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="warning.main">
            Obstacle: {metrics.obstacle}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="info.main">
            Assumption: {metrics.assumption}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="success.main">
            Mitigation: {metrics.mitigation}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ROAMExposureGraph;
