import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Code, GitPullRequest, Layers, Workflow } from 'lucide-react';
const agentCategories = [
    {
        icon: Code,
        title: 'Core Development',
        agents: [
            { name: 'coder', desc: 'Implementation specialist for clean code' },
            { name: 'reviewer', desc: 'Code review and quality assurance' },
            { name: 'tester', desc: 'Comprehensive testing with 90%+ coverage' },
            { name: 'planner', desc: 'Strategic planning and task decomposition' },
            { name: 'researcher', desc: 'Deep research and information gathering' },
        ],
    },
    {
        icon: Layers,
        title: 'Specialized Agents',
        agents: [
            { name: 'backend-dev', desc: 'REST/GraphQL API development' },
            { name: 'mobile-dev', desc: 'React Native mobile apps' },
            { name: 'ml-developer', desc: 'Machine learning model creation' },
            { name: 'system-architect', desc: 'System design and architecture' },
            { name: 'cicd-engineer', desc: 'CI/CD pipeline creation' },
        ],
    },
    {
        icon: Workflow,
        title: 'Swarm Coordinators',
        agents: [
            { name: 'hierarchical-coordinator', desc: 'Tree-based leadership' },
            { name: 'mesh-coordinator', desc: 'Peer-to-peer coordination' },
            { name: 'adaptive-coordinator', desc: 'Dynamic topology switching' },
            { name: 'swarm-memory-manager', desc: 'Cross-agent memory sync' },
        ],
    },
    {
        icon: GitPullRequest,
        title: 'GitHub Integration',
        agents: [
            { name: 'pr-manager', desc: 'Pull request lifecycle management' },
            { name: 'code-review-swarm', desc: 'Multi-agent code review' },
            { name: 'issue-tracker', desc: 'Intelligent issue management' },
            { name: 'release-manager', desc: 'Automated release coordination' },
            { name: 'workflow-automation', desc: 'GitHub Actions specialist' },
        ],
    },
];
const AgentTypes = () => {
    return (_jsx("section", { className: "py-24 px-6", children: _jsxs("div", { className: "container mx-auto max-w-7xl", children: [_jsxs("div", { className: "text-center mb-16", children: [_jsx("h2", { className: "text-4xl md:text-5xl font-bold mb-6", children: _jsx("span", { className: "text-gradient", children: "150+ Specialized Agents" }) }), _jsx("p", { className: "text-xl text-muted-foreground max-w-3xl mx-auto", children: "Purpose-built agents for every development task and workflow" })] }), _jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8", children: agentCategories.map((category, index) => {
                        const Icon = category.icon;
                        return (_jsxs("div", { className: "bg-card border border-border rounded-2xl p-8 hover:shadow-glow transition-smooth animate-fade-in", style: { animationDelay: `${index * 100}ms` }, children: [_jsxs("div", { className: "flex items-center gap-4 mb-6", children: [_jsx("div", { className: "w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center", children: _jsx(Icon, { className: "w-6 h-6 text-foreground" }) }), _jsx("h3", { className: "text-2xl font-bold text-foreground", children: category.title })] }), _jsx("div", { className: "space-y-3", children: category.agents.map((agent, idx) => (_jsx("div", { className: "bg-background-light rounded-lg p-4 border border-border-light hover:border-primary/50 transition-smooth", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "font-mono text-sm text-primary font-semibold mb-1", children: agent.name }), _jsx("div", { className: "text-sm text-muted-foreground", children: agent.desc })] })] }) }, idx))) })] }, index));
                    }) }), _jsx("div", { className: "mt-12 text-center", children: _jsxs("div", { className: "inline-block bg-card border border-border rounded-xl p-6", children: [_jsx("p", { className: "text-muted-foreground mb-4", children: "Explore all available agents" }), _jsx("code", { className: "block bg-background rounded-lg p-4 text-primary font-mono", children: "npx agentic-flow --list" })] }) })] }) }));
};
export default AgentTypes;
//# sourceMappingURL=AgentTypes.js.map