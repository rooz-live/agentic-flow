import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
export const TemporalPivot = ({ selectedDate, onDateSelect, events = [] }) => {
    return (_jsxs("div", { children: [_jsx("h3", { children: "Temporal Pivot" }), _jsxs("p", { children: ["Date: ", selectedDate?.toLocaleDateString() ?? 'No date selected'] }), _jsxs("p", { children: ["Events: ", events.length] })] }));
};
export default TemporalPivot;
//# sourceMappingURL=TemporalPivot.js.map