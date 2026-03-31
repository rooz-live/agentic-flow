import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Zap, Brain, DollarSign, TrendingUp, Shield, Layers } from 'lucide-react';
const features = [
    {
        icon: Zap,
        title: 'Agent Booster',
        description: '352x faster code operations via Rust/WASM. Transform code at blazing speed with zero cost.',
        metric: '352ms → 1ms',
        color: 'secondary',
    },
    {
        icon: Brain,
        title: 'ReasoningBank',
        description: 'Persistent learning memory system. Agents remember patterns and improve with every task.',
        metric: '46% faster execution',
        color: 'primary',
    },
    {
        icon: Layers,
        title: 'AgentDB',
        description: 'State-of-the-art memory with causal reasoning, reflexion, and skill learning.',
        metric: 'p95 < 50ms',
        color: 'accent',
    },
    {
        icon: DollarSign,
        title: 'Multi-Model Router',
        description: 'Intelligent cost optimization across 100+ LLMs. Auto-select optimal models.',
        metric: '85-99% cost savings',
        color: 'secondary',
    },
    {
        icon: TrendingUp,
        title: 'QUIC Transport',
        description: 'Ultra-low latency agent communication via Rust/WASM QUIC protocol.',
        metric: '50-70% faster',
        color: 'primary',
    },
    {
        icon: Shield,
        title: 'Production Ready',
        description: 'Docker deployment, Kubernetes support, and comprehensive monitoring built-in.',
        metric: '100% reliable',
        color: 'accent',
    },
];
const colorClasses = {
    primary: 'text-primary border-primary/30 bg-primary/5',
    secondary: 'text-secondary border-secondary/30 bg-secondary/5',
    accent: 'text-accent border-accent/30 bg-accent/5',
};
const Features = () => {
    return (_jsx("section", { className: "py-24 px-6 relative", children: _jsxs("div", { className: "container mx-auto max-w-7xl", children: [_jsxs("div", { className: "text-center mb-16 animate-fade-in", children: [_jsx("h2", { className: "text-4xl md:text-5xl font-bold mb-6", children: _jsx("span", { className: "text-gradient", children: "Core Features" }) }), _jsx("p", { className: "text-xl text-muted-foreground max-w-3xl mx-auto", children: "Built with cutting-edge technology to deliver unmatched performance and intelligence" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: features.map((feature, index) => {
                        const Icon = feature.icon;
                        const colorClass = colorClasses[feature.color];
                        return (_jsxs("div", { className: "bg-card border border-border rounded-2xl p-8 hover:shadow-glow transition-smooth hover:scale-105 animate-fade-in", style: { animationDelay: `${index * 100}ms` }, children: [_jsx("div", { className: `w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${colorClass} border`, children: _jsx(Icon, { className: "w-7 h-7" }) }), _jsx("h3", { className: "text-2xl font-bold mb-3 text-foreground", children: feature.title }), _jsx("p", { className: "text-muted-foreground mb-4 leading-relaxed", children: feature.description }), _jsx("div", { className: `inline-block px-4 py-2 rounded-full text-sm font-semibold ${colorClass} border`, children: feature.metric })] }, index));
                    }) })] }) }));
};
export default Features;
//# sourceMappingURL=Features.js.map