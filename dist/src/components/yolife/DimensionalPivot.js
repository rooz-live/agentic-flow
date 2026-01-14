import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const DimensionalPivot = ({ dimension = 'default', onDimensionChange, data = {} }) => {
    return (_jsxs("div", { children: [_jsx("h3", { children: "Dimensional Pivot" }), _jsxs("p", { children: ["Current Dimension: ", dimension] }), _jsxs("p", { children: ["Data Keys: ", Object.keys(data).length] })] }));
};
export default DimensionalPivot;
//# sourceMappingURL=DimensionalPivot.js.map