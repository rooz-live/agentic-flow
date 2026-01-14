/**
 * Domain Router
 *
 * Routes requests across hundreds of domains and thousands of subdomains
 * with tenant isolation and system-specific handling.
 *
 * Supported domains:
 * - interface.tag.ooo (primary)
 * - interface.o-gov.com (government)
 * - interface.decisioncall.com (enterprise)
 */
const DEFAULT_CONFIG = {
    defaultSystem: 'custom',
    strictMode: true,
};
export class DomainRouter {
    domains = new Map();
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.initializeDefaultDomains();
    }
    initializeDefaultDomains() {
        const defaultDomains = [
            {
                id: 'tag-ooo',
                name: 'Interface Tag',
                host: 'interface.tag.ooo',
                system: 'hostbill',
                subdomains: [
                    { id: 'admin', name: 'Admin Portal', prefix: 'admin', tenantId: 'admin', roles: ['admin'] },
                    { id: 'client', name: 'Client Portal', prefix: 'client', tenantId: 'client', roles: ['client'] },
                    { id: 'api', name: 'API Gateway', prefix: 'api', tenantId: 'api', roles: ['api'] },
                ],
            },
            {
                id: 'o-gov',
                name: 'O-Gov Interface',
                host: 'interface.o-gov.com',
                system: 'symfony',
                subdomains: [
                    { id: 'portal', name: 'Citizen Portal', prefix: 'portal', tenantId: 'portal', roles: ['citizen'] },
                    { id: 'staff', name: 'Staff Portal', prefix: 'staff', tenantId: 'staff', roles: ['staff'] },
                ],
            },
            {
                id: 'decisioncall',
                name: 'DecisionCall',
                host: 'interface.decisioncall.com',
                system: 'oro',
                subdomains: [
                    { id: 'crm', name: 'CRM', prefix: 'crm', tenantId: 'crm', roles: ['sales'] },
                    { id: 'analytics', name: 'Analytics', prefix: 'analytics', tenantId: 'analytics', roles: ['analyst'] },
                ],
            },
            {
                id: 'syslog-sink',
                name: 'Syslog Sink',
                host: 'syslog-sink-prod-aws-us-east-1-01.interface.tag.ooo',
                system: 'custom',
                subdomains: [],
            },
        ];
        defaultDomains.forEach(d => this.registerDomain(d));
    }
    registerDomain(domain) {
        this.domains.set(domain.host, domain);
        // Also register each subdomain as a resolvable host
        domain.subdomains.forEach(sub => {
            const subHost = `${sub.prefix}.${domain.host}`;
            // Store reference for subdomain resolution
        });
    }
    route(host) {
        // Direct domain match
        const directMatch = this.domains.get(host);
        if (directMatch) {
            return {
                domain: directMatch,
                system: directMatch.system,
                basePath: '/',
            };
        }
        // Subdomain resolution
        for (const [domainHost, domain] of this.domains) {
            if (host.endsWith(`.${domainHost}`)) {
                const prefix = host.replace(`.${domainHost}`, '');
                const subdomain = domain.subdomains.find(s => s.prefix === prefix);
                if (subdomain) {
                    return {
                        domain,
                        subdomain,
                        system: domain.system,
                        basePath: `/${subdomain.prefix}`,
                        tenantId: subdomain.tenantId,
                    };
                }
                // Unknown subdomain but valid parent domain
                if (!this.config.strictMode) {
                    return {
                        domain,
                        system: domain.system,
                        basePath: '/',
                    };
                }
            }
        }
        // Fallback
        if (this.config.fallbackDomain) {
            const fallback = this.domains.get(this.config.fallbackDomain);
            if (fallback) {
                return {
                    domain: fallback,
                    system: fallback.system,
                    basePath: '/',
                };
            }
        }
        return null;
    }
    getSystemForDomain(host) {
        const result = this.route(host);
        return result?.system || this.config.defaultSystem;
    }
    listDomains() {
        return Array.from(this.domains.values());
    }
    getDomainCount() {
        return this.domains.size;
    }
    getSubdomainCount() {
        return Array.from(this.domains.values())
            .reduce((count, domain) => count + domain.subdomains.length, 0);
    }
}
export const defaultRouter = new DomainRouter();
//# sourceMappingURL=domain_router.js.map