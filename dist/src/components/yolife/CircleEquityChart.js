import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
export const CircleEquityChart = ({ circles }) => {
    const data = circles.map(circle => ({
        name: circle.name,
        value: circle.episodes,
        color: circle.color
    }));
    return (_jsx(ResponsiveContainer, { width: "100%", height: 250, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: data, cx: "50%", cy: "50%", labelLine: false, label: ({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`, outerRadius: 80, fill: "#8884d8", dataKey: "value", children: data.map((entry, index) => (_jsx(Cell, { fill: entry.color }, `cell-${index}`))) }), _jsx(Tooltip, {}), _jsx(Legend, {})] }) }));
};
export default CircleEquityChart;
//# sourceMappingURL=CircleEquityChart.js.map