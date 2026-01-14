/**
 * Circle Events Calendar Component
 * Displays scheduled circle ceremonies in calendar format
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Event as EventIcon
} from '@mui/icons-material';

interface CircleEvent {
  id: string;
  circle: string;
  ceremony: string;
  date: Date;
  duration: number; // minutes
  attendees?: string[];
  color: string;
}

const CIRCLE_COLORS: Record<string, string> = {
  orchestrator: '#3b82f6',
  assessor: '#22c55e',
  innovator: '#ec4899',
  analyst: '#06b6d4',
  seeker: '#eab308',
  intuitive: '#ef4444'
};

// Sample events
const SAMPLE_EVENTS: CircleEvent[] = [
  {
    id: '1',
    circle: 'orchestrator',
    ceremony: 'standup',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    duration: 15,
    color: CIRCLE_COLORS.orchestrator
  },
  {
    id: '2',
    circle: 'assessor',
    ceremony: 'wsjf',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    duration: 30,
    color: CIRCLE_COLORS.assessor
  },
  {
    id: '3',
    circle: 'innovator',
    ceremony: 'retro',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    duration: 45,
    color: CIRCLE_COLORS.innovator
  }
];

export const CircleEventsCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events] = useState<CircleEvent[]>(SAMPLE_EVENTS);

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date: Date): CircleEvent[] => {
    return events.filter(event => 
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Generate calendar days
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null); // Empty cells before month starts
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <Card>
      <CardContent>
        {/* Calendar Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={handlePrevMonth} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventIcon /> {monthName}
          </Typography>
          <IconButton onClick={handleNextMonth} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>

        {/* Calendar Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 3 }}>
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Box key={day}>
              <Typography variant="caption" color="text.secondary" align="center" display="block">
                {day}
              </Typography>
            </Box>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <Box key={`empty-${index}`} />;
            }

            const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dayEvents = getEventsForDate(dayDate);
            const isToday = dayDate.toDateString() === new Date().toDateString();

            return (
              <Box key={day}>
                <Box
                  sx={{
                    p: 0.5,
                    minHeight: 50,
                    border: isToday ? '2px solid' : '1px solid',
                    borderColor: isToday ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    backgroundColor: isToday ? 'primary.50' : 'background.paper',
                    position: 'relative'
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: isToday ? 'bold' : 'normal' }}>
                    {day}
                  </Typography>
                  {dayEvents.map((event) => (
                    <Box
                      key={event.id}
                      sx={{
                        width: '100%',
                        height: 4,
                        backgroundColor: event.color,
                        borderRadius: 0.5,
                        mt: 0.5
                    }}
                  />
                ))}
                </Box>
              </Box>
            );
          })}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Upcoming Events List */}
        <Typography variant="subtitle2" gutterBottom>
          Upcoming Events
        </Typography>
        <List dense>
          {events
            .filter(e => e.date >= new Date())
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, 5)
            .map((event) => (
              <ListItem key={event.id} sx={{ px: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: event.color
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {event.circle} • {event.ceremony}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(event.date)} • {event.duration}m
                        </Typography>
                      }
                    />
                  </Box>
                  <Chip 
                    label={event.circle} 
                    size="small" 
                    sx={{ 
                      backgroundColor: event.color + '20',
                      color: event.color,
                      textTransform: 'capitalize'
                    }} 
                  />
                </Box>
              </ListItem>
            ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default CircleEventsCalendar;
