/**
 * Circle Equity Pie Chart Component
 * Visualizes episode distribution across circles
 */
import React from 'react';
interface Circle {
    name: string;
    color: string;
    episodes: number;
    percentage: number;
}
interface CircleEquityChartProps {
    circles: Circle[];
}
export declare const CircleEquityChart: React.FC<CircleEquityChartProps>;
export default CircleEquityChart;
//# sourceMappingURL=CircleEquityChart.d.ts.map