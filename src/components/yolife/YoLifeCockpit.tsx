/**
 * yo.life Digital Cockpit - Main Dashboard Component
 * Integrates temporal/spatial/dimensional pivots, ROAM exposure, and circle equity
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Tabs, 
  Tab,
  Card,
  CardContent,
  Chip,
  LinearProgress
} from '@mui/material';
import { 
  Timeline as TimelineIcon,
  PieChart as PieChartIcon,
  Layers as LayersIcon,
  Groups as GroupsIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

import { CircleEquityChart } from './CircleEquityChart';
import { ROAMExposureGraph } from './ROAMExposureGraph';
import { TemporalPivot } from './TemporalPivot';
import { SpatialPivot } from './SpatialPivot';
import { DimensionalPivot } from './DimensionalPivot';
import { CircleActivityTimeline } from './CircleActivityTimeline';

interface Circle {
  name: string;
  color: string;
  episodes: number;
  percentage: number;
  lastActivity?: string;
}

interface SystemStatus {
  mcpServer: 'online' | 'offline';
  agentdb: 'connected' | 'disconnected';
  episodeStore: 'ready' | 'error';
}

interface ROAMMetrics {
  risk: number;
  obstacle: number;
  assumption: number;
  mitigation: number;
  exposureScore: number;
}

const CIRCLES: Circle[] = [
  { name: 'orchestrator', color: '#3b82f6', episodes: 0, percentage: 0 },
  { name: 'assessor', color: '#22c55e', episodes: 0, percentage: 0 },
  { name: 'innovator', color: '#ec4899', episodes: 0, percentage: 0 },
  { name: 'analyst', color: '#06b6d4', episodes: 0, percentage: 0 },
  { name: 'seeker', color: '#eab308', episodes: 0, percentage: 0 },
  { name: 'intuitive', color: '#ef4444', episodes: 0, percentage: 0 },
];

export const YoLifeCockpit: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [circles, setCircles] = useState<Circle[]>(CIRCLES);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    mcpServer: 'online',
    agentdb: 'connected',
    episodeStore: 'ready'
  });
  const [roamMetrics, setRoamMetrics] = useState<ROAMMetrics>({
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
    } catch (error) {
      console.error('Failed to fetch circle equity:', error);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' => {
    if (status === 'online' || status === 'connected' || status === 'ready') return 'success';
    if (status === 'offline' || status === 'disconnected' || status === 'error') return 'error';
    return 'warning';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ 
          fontWeight: 700,
          background: 'linear-gradient(135deg, #3b82f6 0%, #ec4899 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          yo.life Digital Cockpit
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Circle-based agile workflow orchestration and ROAM exposure tracking
        </Typography>
      </Box>

      {/* System Status Bar */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
        <Grid container spacing={2} alignItems="center">
          {/* @ts-expect-error - MUI Grid prop types */}
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">MCP Server:</Typography>
              <Chip 
                label={systemStatus.mcpServer} 
                color={getStatusColor(systemStatus.mcpServer)} 
                size="small" 
              />
            </Box>
          </Grid>
          {/* @ts-expect-error - MUI Grid prop types */}
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">AgentDB:</Typography>
              <Chip 
                label={systemStatus.agentdb} 
                color={getStatusColor(systemStatus.agentdb)} 
                size="small" 
              />
            </Box>
          </Grid>
          {/* @ts-expect-error - MUI Grid prop types */}
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">Episode Store:</Typography>
              <Chip 
                label={systemStatus.episodeStore} 
                color={getStatusColor(systemStatus.episodeStore)} 
                size="small" 
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Left Column - Circle Activity & Equity */}
        {/* @ts-expect-error - MUI Grid prop types */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupsIcon /> Circle Activity
              </Typography>
              {circles.map((circle) => (
                <Box key={circle.name} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {circle.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {circle.episodes} episodes
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={circle.percentage} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 1,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: circle.color
                      }
                    }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PieChartIcon /> Circle Equity
              </Typography>
              <CircleEquityChart circles={circles} />
            </CardContent>
          </Card>
        </Grid>

        {/* Center Column - Pivot Views */}
        {/* @ts-expect-error - MUI Grid prop types */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Tabs value={currentTab} onChange={handleTabChange} variant="fullWidth">
              <Tab icon={<TimelineIcon />} label="Temporal" />
              <Tab icon={<LayersIcon />} label="Spatial" />
              <Tab icon={<TrendingUpIcon />} label="Dimensional" />
            </Tabs>

            <Box sx={{ mt: 3 }}>
              {currentTab === 0 && <TemporalPivot />}
              {currentTab === 1 && <SpatialPivot circles={circles} />}
              {currentTab === 2 && <DimensionalPivot />}
            </Box>
          </Paper>
        </Grid>

        {/* Right Column - ROAM Exposure */}
        {/* @ts-expect-error - MUI Grid prop types */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ROAM Exposure
              </Typography>
              <ROAMExposureGraph metrics={roamMetrics} />
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Entities: <strong>{roamMetrics.risk + roamMetrics.obstacle + roamMetrics.assumption + roamMetrics.mitigation}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Exposure Score: <strong>{roamMetrics.exposureScore.toFixed(1)}/10</strong>
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <CircleActivityTimeline circles={circles} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bottom Section - Action Items */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Action Items
        </Typography>
        <Grid container spacing={2}>
          {/* @ts-expect-error - MUI Grid prop types */}
          <Grid item xs={12} sm={6} md={3}>
            <Chip label="Review orchestrator standup results" color="primary" sx={{ width: '100%' }} />
          </Grid>
          {/* @ts-expect-error - MUI Grid prop types */}
          <Grid item xs={12} sm={6} md={3}>
            <Chip label="Update assessor WSJF priorities" color="success" sx={{ width: '100%' }} />
          </Grid>
          {/* @ts-expect-error - MUI Grid prop types */}
          <Grid item xs={12} sm={6} md={3}>
            <Chip label="Address innovator retro findings" color="warning" sx={{ width: '100%' }} />
          </Grid>
          {/* @ts-expect-error - MUI Grid prop types */}
          <Grid item xs={12} sm={6} md={3}>
            <Chip label="Complete analyst refine analysis" color="info" sx={{ width: '100%' }} />
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default YoLifeCockpit;
