import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BarChart3, TrendingDown, Clock, DollarSign } from 'lucide-react';
const metrics = [
    {
        icon: Clock,
        title: 'Code Review (100/day)',
        traditional: { latency: '35s', cost: '$240/mo', accuracy: '70%' },
        agenticFlow: { latency: '0.1s', cost: '$0/mo', accuracy: '90%' },
        improvement: '352x faster, 100% free',
    },
    {
        icon: BarChart3,
        title: 'Migration (1000 files)',
        traditional: { time: '5.87 min', cost: '$10' },
        agenticFlow: { time: '1 sec', cost: '$0' },
        improvement: '350x faster, $10 saved',
    },
    {
        icon: TrendingDown,
        title: 'Refactoring Pipeline',
        traditional: { success: '70%', supervision: 'Required' },
        agenticFlow: { success: '90%', supervision: 'Zero' },
        improvement: '+46% execution speed',
    },
    {
        icon: DollarSign,
        title: 'Cost Optimization',
        traditional: { model: 'Claude Sonnet 4.5', cost: '$240/mo' },
        agenticFlow: { model: 'DeepSeek R1', cost: '$36/mo' },
        improvement: '85% cost reduction',
    },
];
const PerformanceMetrics = () => {
    return (_jsx("section", { className: "py-24 px-6", children: _jsxs("div", { className: "container mx-auto max-w-7xl", children: [_jsxs("div", { className: "text-center mb-16", children: [_jsx("h2", { className: "text-4xl md:text-5xl font-bold mb-6", children: _jsx("span", { className: "text-gradient", children: "Real-World Performance" }) }), _jsx("p", { className: "text-xl text-muted-foreground max-w-3xl mx-auto", children: "See how Agentic Flow transforms traditional workflows with measurable results" })] }), _jsx("div", { className: "space-y-8", children: metrics.map((metric, index) => {
                        const Icon = metric.icon;
                        return (_jsxs("div", { className: "bg-card border border-border rounded-2xl p-8 hover:shadow-glow transition-smooth animate-fade-in", style: { animationDelay: `${index * 100}ms` }, children: [_jsxs("div", { className: "flex items-center gap-4 mb-6", children: [_jsx("div", { className: "w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center", children: _jsx(Icon, { className: "w-6 h-6 text-foreground" }) }), _jsx("h3", { className: "text-2xl font-bold text-foreground", children: metric.title })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsxs("div", { className: "bg-background-light/50 rounded-xl p-6 border border-border-light", children: [_jsx("div", { className: "text-sm text-muted-foreground mb-4 font-semibold", children: "Traditional Agent" }), _jsx("div", { className: "space-y-2", children: Object.entries(metric.traditional).map(([key, value]) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsxs("span", { className: "text-muted-foreground capitalize", children: [key, ":"] }), _jsx("span", { className: "text-foreground font-mono", children: value })] }, key))) })] }), _jsxs("div", { className: "bg-primary/10 rounded-xl p-6 border border-primary/30", children: [_jsx("div", { className: "text-sm text-primary mb-4 font-semibold", children: "Agentic Flow" }), _jsx("div", { className: "space-y-2", children: Object.entries(metric.agenticFlow).map(([key, value]) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsxs("span", { className: "text-muted-foreground capitalize", children: [key, ":"] }), _jsx("span", { className: "text-foreground font-mono font-semibold", children: value })] }, key))) })] }), _jsx("div", { className: "flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-3xl font-bold text-gradient mb-2", children: metric.improvement.split(',')[0] }), metric.improvement.split(',')[1] && (_jsx("div", { className: "text-lg font-semibold text-secondary", children: metric.improvement.split(',')[1] }))] }) })] })] }, index));
                    }) }), _jsx("div", { className: "mt-12 bg-gradient-primary rounded-2xl p-8 text-center", children: _jsx("p", { className: "text-2xl md:text-3xl font-bold text-foreground", children: "The only agent framework that gets faster AND smarter the more you use it" }) })] }) }));
};
export default PerformanceMetrics;
//# sourceMappingURL=PerformanceMetrics.js.map