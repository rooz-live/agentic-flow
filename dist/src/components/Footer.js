import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Github, Book, Package, ExternalLink } from 'lucide-react';
const links = {
    documentation: [
        { name: 'Getting Started', url: '#' },
        { name: 'API Reference', url: '#' },
        { name: 'Agent Guide', url: '#' },
        { name: 'Examples', url: '#' },
    ],
    resources: [
        { name: 'GitHub', url: 'https://github.com/ruvnet/agentic-flow', icon: Github },
        { name: 'npm Package', url: 'https://www.npmjs.com/package/agentic-flow', icon: Package },
        { name: 'Documentation', url: 'https://github.com/ruvnet/agentic-flow/tree/main/docs', icon: Book },
    ],
    components: [
        { name: 'Agent Booster', url: '#' },
        { name: 'AgentDB', url: '#' },
        { name: 'ReasoningBank', url: '#' },
        { name: 'Multi-Model Router', url: '#' },
    ],
};
const stats = [
    { label: 'npm Downloads', value: '10K+' },
    { label: 'GitHub Stars', value: '1.2K+' },
    { label: 'Agents Available', value: '150+' },
    { label: 'MCP Tools', value: '213' },
];
const Footer = () => {
    return (_jsx("footer", { className: "bg-background-light border-t border-border py-16 px-6", children: _jsxs("div", { className: "container mx-auto max-w-7xl", children: [_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-6 mb-16", children: stats.map((stat, index) => (_jsxs("div", { className: "text-center p-6 bg-card rounded-xl border border-border", children: [_jsx("div", { className: "text-3xl font-bold text-gradient mb-2", children: stat.value }), _jsx("div", { className: "text-sm text-muted-foreground", children: stat.label })] }, index))) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-12 mb-16", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-lg font-bold mb-6 text-foreground", children: "Documentation" }), _jsx("ul", { className: "space-y-3", children: links.documentation.map((link, index) => (_jsx("li", { children: _jsxs("a", { href: link.url, className: "text-muted-foreground hover:text-primary transition-smooth flex items-center gap-2", children: [link.name, _jsx(ExternalLink, { className: "w-3 h-3" })] }) }, index))) })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-lg font-bold mb-6 text-foreground", children: "Resources" }), _jsx("ul", { className: "space-y-3", children: links.resources.map((link, index) => {
                                        const Icon = link.icon;
                                        return (_jsx("li", { children: _jsxs("a", { href: link.url, className: "text-muted-foreground hover:text-primary transition-smooth flex items-center gap-2", children: [_jsx(Icon, { className: "w-4 h-4" }), link.name] }) }, index));
                                    }) })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-lg font-bold mb-6 text-foreground", children: "Components" }), _jsx("ul", { className: "space-y-3", children: links.components.map((link, index) => (_jsx("li", { children: _jsx("a", { href: link.url, className: "text-muted-foreground hover:text-primary transition-smooth", children: link.name }) }, index))) })] })] }), _jsxs("div", { className: "border-t border-border pt-8", children: [_jsxs("div", { className: "flex flex-col md:flex-row justify-between items-center gap-4", children: [_jsxs("div", { className: "text-center md:text-left", children: [_jsx("div", { className: "text-2xl font-bold text-gradient mb-2", children: "Agentic Flow" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "The First AI Agent Framework That Gets Smarter AND Faster" })] }), _jsxs("div", { className: "flex items-center gap-6", children: [_jsx("a", { href: "https://github.com/ruvnet/agentic-flow", className: "text-muted-foreground hover:text-primary transition-smooth", children: _jsx(Github, { className: "w-6 h-6" }) }), _jsx("a", { href: "https://www.npmjs.com/package/agentic-flow", className: "text-muted-foreground hover:text-primary transition-smooth", children: _jsx(Package, { className: "w-6 h-6" }) })] })] }), _jsx("div", { className: "mt-8 text-center text-sm text-muted-foreground", children: _jsxs("p", { children: ["MIT License \u00A9 2025 rUv |", ' ', _jsx("a", { href: "#", className: "hover:text-primary transition-smooth", children: "Terms" }), ' ', "|", ' ', _jsx("a", { href: "#", className: "hover:text-primary transition-smooth", children: "Privacy" })] }) })] })] }) }));
};
export default Footer;
//# sourceMappingURL=Footer.js.map