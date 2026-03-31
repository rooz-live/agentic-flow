/**
 * Pivot View Components for yo.life Cockpit
 * Temporal, Spatial, and Dimensional analysis views
 */

import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Circle {
  name: string;
  color: string;
  episodes: number;
  percentage: number;
  lastActivity?: string;
}

// Temporal Pivot - Time-based view
export const TemporalPivot: React.FC = () => {
  const timelineData = [
    { time: '00:00', episodes: 2 },
    { time: '04:00', episodes: 1 },
    { time: '08:00', episodes: 5 },
    { time: '12:00', episodes: 8 },
    { time: '16:00', episodes: 6 },
    { time: '20:00', episodes: 3 },
  ];

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Episode Activity Over Time
      </Typography>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={timelineData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="time" tick={{ fill: '#9ca3af' }} />
          <YAxis tick={{ fill: '#9ca3af' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            labelStyle={{ color: '#f3f4f6' }}
          />
          <Line type="monotone" dataKey="episodes" stroke="#3b82f6" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" fontWeight="bold" gutterBottom>Today's Episodes</Typography>
        <List dense>
          <ListItem>
            <ListItemText 
              primary="09:15 - orchestrator::standup" 
              secondary="Duration: 12m"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="14:30 - assessor::wsjf" 
              secondary="Duration: 18m"
            />
          </ListItem>
        </List>
      </Box>
    </Box>
  );
};

// Spatial Pivot - Circle-based view
interface SpatialPivotProps {
  circles: Circle[];
}

export const SpatialPivot: React.FC<SpatialPivotProps> = ({ circles }) => {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Circle Distribution
      </Typography>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={circles}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
          <YAxis tick={{ fill: '#9ca3af' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            labelStyle={{ color: '#f3f4f6' }}
          />
          <Bar dataKey="episodes" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" fontWeight="bold" gutterBottom>Circle Status</Typography>
        {circles.slice(0, 3).map((circle) => (
          <Box key={circle.name} sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
              {circle.name}: <Chip label={circle.episodes > 0 ? 'Active' : 'Idle'} size="small" color={circle.episodes > 0 ? 'success' : 'default'} />
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// Dimensional Pivot - Multi-dimensional analysis
export const DimensionalPivot: React.FC = () => {
  const ceremonyData = [
    { ceremony: 'standup', count: 8 },
    { ceremony: 'wsjf', count: 12 },
    { ceremony: 'review', count: 6 },
    { ceremony: 'retro', count: 5 },
    { ceremony: 'refine', count: 9 },
    { ceremony: 'replenish', count: 4 },
  ];

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Ceremony Distribution
      </Typography>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={ceremonyData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" tick={{ fill: '#9ca3af' }} />
          <YAxis dataKey="ceremony" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={70} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            labelStyle={{ color: '#f3f4f6' }}
          />
          <Bar dataKey="count" fill="#ec4899" />
        </BarChart>
      </ResponsiveContainer>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" fontWeight="bold" gutterBottom>Skill Utilization</Typography>
        <Typography variant="caption" color="text.secondary">
          Top Skills: chaotic_workflow (12), full_cycle (10), retro_driven (8)
        </Typography>
      </Box>
    </Box>
  );
};

// Circle Activity Timeline
interface CircleActivityTimelineProps {
  circles: Circle[];
}

export const CircleActivityTimeline: React.FC<CircleActivityTimelineProps> = ({ circles }) => {
  const recentActivity = circles
    .filter(c => c.lastActivity)
    .slice(0, 5);

  return (
    <List dense>
      {recentActivity.length > 0 ? (
        recentActivity.map((circle) => (
          <ListItem key={circle.name} sx={{ px: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: circle.color,
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                  {circle.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {circle.lastActivity || 'No recent activity'}
                </Typography>
              </Box>
            </Box>
          </ListItem>
        ))
      ) : (
        <ListItem sx={{ px: 0 }}>
          <ListItemText 
            primary={<Typography variant="caption" color="text.secondary">No recent activity</Typography>}
          />
        </ListItem>
      )}
    </List>
  );
};
