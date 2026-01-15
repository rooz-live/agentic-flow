import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const CircleActivityTimeline = ({ circles = [], activities = [], onActivitySelect }) => {
    return (_jsxs("div", { children: [_jsx("h3", { children: "Circle Activity Timeline" }), _jsxs("p", { children: ["Total Activities: ", activities.length] }), activities.map(activity => (_jsxs("div", { onClick: () => onActivitySelect?.(activity), children: [_jsx("strong", { children: activity.title }), _jsxs("span", { children: [" - ", activity.timestamp.toLocaleString()] })] }, activity.id)))] }));
};
export default CircleActivityTimeline;
//# sourceMappingURL=CircleActivityTimeline.js.map