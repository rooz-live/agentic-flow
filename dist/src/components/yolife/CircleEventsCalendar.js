import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Circle Events Calendar Component
 * Displays scheduled circle ceremonies in calendar format
 */
import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Chip, IconButton, List, ListItem, ListItemText, Divider } from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Event as EventIcon } from '@mui/icons-material';
const CIRCLE_COLORS = {
    orchestrator: '#3b82f6',
    assessor: '#22c55e',
    innovator: '#ec4899',
    analyst: '#06b6d4',
    seeker: '#eab308',
    intuitive: '#ef4444'
};
// Sample events
const SAMPLE_EVENTS = [
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
export const CircleEventsCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events] = useState(SAMPLE_EVENTS);
    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };
    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };
    const getEventsForDate = (date) => {
        return events.filter(event => event.date.getDate() === date.getDate() &&
            event.date.getMonth() === date.getMonth() &&
            event.date.getFullYear() === date.getFullYear());
    };
    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };
    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };
    const formatDate = (date) => {
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
    return (_jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsx(IconButton, { onClick: handlePrevMonth, size: "small", children: _jsx(ChevronLeftIcon, {}) }), _jsxs(Typography, { variant: "h6", sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(EventIcon, {}), " ", monthName] }), _jsx(IconButton, { onClick: handleNextMonth, size: "small", children: _jsx(ChevronRightIcon, {}) })] }), _jsxs(Box, { sx: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 3 }, children: [['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (_jsx(Box, { children: _jsx(Typography, { variant: "caption", color: "text.secondary", align: "center", display: "block", children: day }) }, day))), calendarDays.map((day, index) => {
                            if (day === null) {
                                return _jsx(Box, {}, `empty-${index}`);
                            }
                            const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                            const dayEvents = getEventsForDate(dayDate);
                            const isToday = dayDate.toDateString() === new Date().toDateString();
                            return (_jsx(Box, { children: _jsxs(Box, { sx: {
                                        p: 0.5,
                                        minHeight: 50,
                                        border: isToday ? '2px solid' : '1px solid',
                                        borderColor: isToday ? 'primary.main' : 'divider',
                                        borderRadius: 1,
                                        backgroundColor: isToday ? 'primary.50' : 'background.paper',
                                        position: 'relative'
                                    }, children: [_jsx(Typography, { variant: "caption", sx: { fontWeight: isToday ? 'bold' : 'normal' }, children: day }), dayEvents.map((event) => (_jsx(Box, { sx: {
                                                width: '100%',
                                                height: 4,
                                                backgroundColor: event.color,
                                                borderRadius: 0.5,
                                                mt: 0.5
                                            } }, event.id)))] }) }, day));
                        })] }), _jsx(Divider, { sx: { my: 2 } }), _jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "Upcoming Events" }), _jsx(List, { dense: true, children: events
                        .filter(e => e.date >= new Date())
                        .sort((a, b) => a.date.getTime() - b.date.getTime())
                        .slice(0, 5)
                        .map((event) => (_jsx(ListItem, { sx: { px: 0 }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, width: '100%' }, children: [_jsx(Box, { sx: {
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: event.color
                                    } }), _jsx(Box, { sx: { flex: 1 }, children: _jsx(ListItemText, { primary: _jsxs(Typography, { variant: "body2", sx: { textTransform: 'capitalize' }, children: [event.circle, " \u2022 ", event.ceremony] }), secondary: _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [formatDate(event.date), " \u2022 ", event.duration, "m"] }) }) }), _jsx(Chip, { label: event.circle, size: "small", sx: {
                                        backgroundColor: event.color + '20',
                                        color: event.color,
                                        textTransform: 'capitalize'
                                    } })] }) }, event.id))) })] }) }));
};
export default CircleEventsCalendar;
//# sourceMappingURL=CircleEventsCalendar.js.map