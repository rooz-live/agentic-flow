/**
 * Circle Equity Pie Chart Component
 * Visualizes episode distribution across circles
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface Circle {
  name: string;
  color: string;
  episodes: number;
  percentage: number;
}

interface CircleEquityChartProps {
  circles: Circle[];
}

export const CircleEquityChart: React.FC<CircleEquityChartProps> = ({ circles }) => {
  const data = circles.map(circle => ({
    name: circle.name,
    value: circle.episodes,
    color: circle.color
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CircleEquityChart;
