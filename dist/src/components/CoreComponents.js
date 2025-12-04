import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Database, Code, Network, Cpu } from 'lucide-react';
const components = [
    {
        icon: Code,
        name: 'Agent Booster',
        description: 'Ultra-fast local code transformations via Rust/WASM with automatic edit detection',
        features: ['352x faster', '$0 cost', 'Automatic detection', 'Rust/WASM powered'],
        docs: 'https://github.com/ruvnet/agentic-flow/tree/main/agent-booster',
    },
    {
        icon: Database,
        name: 'AgentDB',
        description: 'Advanced memory system with causal reasoning, reflexion, and skill learning',
        features: ['p95 < 50ms', '80% hit rate', '17 CLI commands', 'Causal memory graph'],
        docs: './agentic-flow/src/agentdb/README.md',
    },
    {
        icon: Network,
        name: 'ReasoningBank',
        description: 'Persistent learning memory with semantic search and pattern recognition',
        features: ['46% faster', '100% success', 'Semantic search', 'Pattern learning'],
        docs: 'https://github.com/ruvnet/agentic-flow/tree/main/agentic-flow/src/reasoningbank',
    },
    {
        icon: Cpu,
        name: 'Multi-Model Router',
        description: 'Intelligent cost optimization across 100+ LLM models with auto-selection',
        features: ['85-99% savings', '100+ models', 'Auto-select', 'Quality balanced'],
        docs: 'https://github.com/ruvnet/agentic-flow/tree/main/agentic-flow/src/router',
    },
];
const CoreComponents = () => {
    return (_jsx("section", { className: "py-24 px-6 bg-background-light/50", children: _jsxs("div", { className: "container mx-auto max-w-7xl", children: [_jsxs("div", { className: "text-center mb-16", children: [_jsx("h2", { className: "text-4xl md:text-5xl font-bold mb-6", children: _jsx("span", { className: "text-gradient", children: "Core Components" }) }), _jsx("p", { className: "text-xl text-muted-foreground max-w-3xl mx-auto", children: "Modular architecture designed for maximum performance and flexibility" })] }), _jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8", children: components.map((component, index) => {
                        const Icon = component.icon;
                        return (_jsx("div", { className: "bg-card border border-border rounded-2xl p-8 hover:shadow-glow transition-smooth hover:scale-[1.02] animate-fade-in", style: { animationDelay: `${index * 100}ms` }, children: _jsxs("div", { className: "flex items-start gap-6", children: [_jsx("div", { className: "w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0", children: _jsx(Icon, { className: "w-8 h-8 text-foreground" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-2xl font-bold mb-3 text-foreground", children: component.name }), _jsx("p", { className: "text-muted-foreground mb-6 leading-relaxed", children: component.description }), _jsx("div", { className: "grid grid-cols-2 gap-3 mb-6", children: component.features.map((feature, idx) => (_jsxs("div", { className: "flex items-center gap-2 text-sm text-foreground/80", children: [_jsx("div", { className: "w-1.5 h-1.5 bg-primary rounded-full" }), feature] }, idx))) }), _jsx("a", { href: component.docs, className: "inline-flex items-center gap-2 text-primary hover:text-primary-glow transition-smooth font-semibold", children: "View Documentation \u2192" })] })] }) }, index));
                    }) }), _jsxs("div", { className: "mt-16 bg-background-light border border-border rounded-2xl p-8", children: [_jsx("h3", { className: "text-2xl font-bold mb-6 text-foreground", children: "CLI Usage" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-muted-foreground mb-2", children: "AgentDB - Full CLI" }), _jsx("code", { className: "block bg-background rounded-lg p-4 text-sm text-primary font-mono", children: "npx agentdb reflexion store \"session-1\" ..." })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-muted-foreground mb-2", children: "Multi-Model Router" }), _jsx("code", { className: "block bg-background rounded-lg p-4 text-sm text-primary font-mono", children: "npx agentic-flow --agent coder --optimize" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-muted-foreground mb-2", children: "Agent Booster" }), _jsx("code", { className: "block bg-background rounded-lg p-4 text-sm text-primary font-mono", children: "Automatic on code edits" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-muted-foreground mb-2", children: "ReasoningBank" }), _jsx("code", { className: "block bg-background rounded-lg p-4 text-sm text-primary font-mono", children: "import * as reasoningbank from 'agentic-flow'" })] })] })] })] }) }));
};
export default CoreComponents;
//# sourceMappingURL=CoreComponents.js.map