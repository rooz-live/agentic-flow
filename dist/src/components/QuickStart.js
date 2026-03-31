import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Terminal, Rocket, Package, GitBranch } from 'lucide-react';
const installSteps = [
    {
        icon: Package,
        title: 'Install Package',
        command: 'npm install -g agentic-flow',
        description: 'Global installation for CLI access',
    },
    {
        icon: Terminal,
        title: 'Set API Key',
        command: 'export ANTHROPIC_API_KEY=sk-ant-...',
        description: 'Configure your Claude API credentials',
    },
    {
        icon: Rocket,
        title: 'Run Your First Agent',
        command: 'npx agentic-flow --agent researcher --task "Analyze trends"',
        description: 'Execute agents with full MCP tool access',
    },
    {
        icon: GitBranch,
        title: 'Or Use npx',
        command: 'npx agentic-flow --help',
        description: 'No installation required, run directly',
    },
];
const examples = [
    {
        title: 'Cost-Optimized Coding',
        code: `npx agentic-flow \\
  --agent coder \\
  --task "Build REST API" \\
  --optimize --priority cost`,
        description: 'Auto-select cheapest model for simple tasks',
    },
    {
        title: 'Quality-First Review',
        code: `npx agentic-flow \\
  --agent reviewer \\
  --task "Security audit" \\
  --optimize --priority quality`,
        description: 'Use flagship models for critical reviews',
    },
    {
        title: 'AgentDB Memory',
        code: `npx agentdb reflexion store \\
  "session-1" "implement_auth" \\
  0.95 true "Success!"`,
        description: 'Store agent learning experiences',
    },
];
const QuickStart = () => {
    return (_jsx("section", { className: "py-24 px-6 bg-background-light/50", children: _jsxs("div", { className: "container mx-auto max-w-7xl", children: [_jsxs("div", { className: "text-center mb-16", children: [_jsx("h2", { className: "text-4xl md:text-5xl font-bold mb-6", children: _jsx("span", { className: "text-gradient", children: "Quick Start" }) }), _jsx("p", { className: "text-xl text-muted-foreground max-w-3xl mx-auto", children: "Get up and running in minutes with our simple installation process" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16", children: installSteps.map((step, index) => {
                        const Icon = step.icon;
                        return (_jsxs("div", { className: "bg-card border border-border rounded-2xl p-6 hover:shadow-glow transition-smooth hover:scale-105 animate-fade-in", style: { animationDelay: `${index * 100}ms` }, children: [_jsx("div", { className: "w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4", children: _jsx(Icon, { className: "w-6 h-6 text-foreground" }) }), _jsxs("div", { className: "text-sm text-primary font-semibold mb-2", children: ["Step ", index + 1] }), _jsx("h3", { className: "text-lg font-bold mb-3 text-foreground", children: step.title }), _jsx("code", { className: "block bg-background rounded-lg p-3 text-xs text-primary font-mono mb-3 break-all", children: step.command }), _jsx("p", { className: "text-sm text-muted-foreground", children: step.description })] }, index));
                    }) }), _jsxs("div", { className: "space-y-8", children: [_jsx("h3", { className: "text-3xl font-bold text-center mb-8 text-foreground", children: "Common Use Cases" }), examples.map((example, index) => (_jsx("div", { className: "bg-card border border-border rounded-2xl p-8 hover:shadow-glow transition-smooth animate-fade-in", style: { animationDelay: `${index * 100}ms` }, children: _jsxs("div", { className: "flex flex-col lg:flex-row gap-6", children: [_jsxs("div", { className: "lg:w-1/3", children: [_jsx("h4", { className: "text-xl font-bold mb-3 text-foreground", children: example.title }), _jsx("p", { className: "text-muted-foreground", children: example.description })] }), _jsx("div", { className: "lg:w-2/3", children: _jsx("pre", { className: "bg-background rounded-xl p-6 overflow-x-auto border border-border-light", children: _jsx("code", { className: "text-sm text-primary font-mono", children: example.code }) }) })] }) }, index)))] }), _jsxs("div", { className: "mt-16 bg-gradient-primary rounded-2xl p-8", children: [_jsx("h3", { className: "text-2xl font-bold mb-6 text-center text-foreground", children: "Programmatic API" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-background/10 rounded-xl p-6 backdrop-blur-sm", children: [_jsx("div", { className: "text-sm font-semibold mb-3 text-foreground/80", children: "Import Components" }), _jsx("pre", { className: "bg-background/20 rounded-lg p-4 overflow-x-auto", children: _jsx("code", { className: "text-sm text-foreground font-mono", children: `import { ReflexionMemory } from 'agentic-flow/agentdb';
import { ModelRouter } from 'agentic-flow/router';
import * as reasoningbank from 'agentic-flow/reasoningbank';` }) })] }), _jsxs("div", { className: "bg-background/10 rounded-xl p-6 backdrop-blur-sm", children: [_jsx("div", { className: "text-sm font-semibold mb-3 text-foreground/80", children: "Use in Code" }), _jsx("pre", { className: "bg-background/20 rounded-lg p-4 overflow-x-auto", children: _jsx("code", { className: "text-sm text-foreground font-mono", children: `const router = new ModelRouter();
const response = await router.chat({
  model: 'auto', priority: 'cost'
});` }) })] })] })] })] }) }));
};
export default QuickStart;
//# sourceMappingURL=QuickStart.js.map