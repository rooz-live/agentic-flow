import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const SpatialPivot = ({ circles = [], location, onLocationChange }) => {
    return (_jsxs("div", { children: [_jsx("h3", { children: "Spatial Pivot" }), location ? (_jsxs("p", { children: ["Location: ", location.lat, ", ", location.lng] })) : (_jsx("p", { children: "No location selected" }))] }));
};
export default SpatialPivot;
//# sourceMappingURL=SpatialPivot.js.map