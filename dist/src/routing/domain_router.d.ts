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
import { Domain, Subdomain } from './multi_tenant_navigation';
export interface RouteResult {
    domain: Domain;
    subdomain?: Subdomain;
    system: string;
    basePath: string;
    tenantId?: string;
}
export interface RoutingConfig {
    defaultSystem: string;
    fallbackDomain?: string;
    strictMode: boolean;
}
export declare class DomainRouter {
    private domains;
    private config;
    constructor(config?: Partial<RoutingConfig>);
    private initializeDefaultDomains;
    registerDomain(domain: Domain): void;
    route(host: string): RouteResult | null;
    getSystemForDomain(host: string): string;
    listDomains(): Domain[];
    getDomainCount(): number;
    getSubdomainCount(): number;
}
export declare const defaultRouter: DomainRouter;
//# sourceMappingURL=domain_router.d.ts.map