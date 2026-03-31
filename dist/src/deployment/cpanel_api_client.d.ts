/**
 * cPanel API Client for YOLIFE Deployment
 * Uses cPanel UAPI/WHM API instead of SSH for deployments
 *
 * Docs: https://api.docs.cpanel.net/cpanel/introduction/
 * Auth: https://docs.cpanel.net/knowledge-base/security/guide-to-ssl/
 */
export interface CPanelConfig {
    host: string;
    port: number;
    username: string;
    apiToken: string;
    ssl?: boolean;
}
export interface CPanelResponse<T = any> {
    status: number;
    statusDescription?: string;
    data: T;
    errors?: string[];
    warnings?: string[];
    messages?: string[];
}
export declare class CPanelAPIClient {
    private config;
    private baseUrl;
    constructor(config: CPanelConfig);
    /**
     * Make authenticated API call to cPanel UAPI
     */
    call(module: string, func: string, params?: Record<string, any>): Promise<CPanelResponse>;
    /**
     * Test connectivity to cPanel
     */
    testConnection(): Promise<{
        connected: boolean;
        version?: string;
        error?: string;
    }>;
    /**
     * Upload file via cPanel File Manager API
     */
    uploadFile(remotePath: string, fileContent: Buffer | string): Promise<CPanelResponse>;
    /**
     * List files in directory
     */
    listFiles(directory: string): Promise<CPanelResponse>;
    /**
     * Get domain list
     */
    getDomains(): Promise<CPanelResponse>;
    /**
     * Get SSL certificate info
     */
    getSSLInfo(): Promise<CPanelResponse>;
    /**
     * Execute shell command via Terminal API (if enabled)
     */
    execCommand(command: string): Promise<CPanelResponse>;
    /**
     * Get account info
     */
    getAccountInfo(): Promise<CPanelResponse>;
    /**
     * Health check - comprehensive
     */
    healthCheck(): Promise<{
        cpanel: boolean;
        domains: boolean;
        ssl: boolean;
        fileAccess: boolean;
        errors: string[];
    }>;
}
/**
 * Factory function to create client from environment variables
 */
export declare function createCPanelClient(): CPanelAPIClient;
/**
 * Example usage:
 *
 * ```typescript
 * const client = createCPanelClient();
 *
 * // Test connection
 * const health = await client.healthCheck();
 * console.log('cPanel health:', health);
 *
 * // List domains
 * const domains = await client.getDomains();
 * console.log('Domains:', domains.data);
 *
 * // Deploy (custom logic)
 * async function deployCPanel() {
 *   const files = await client.listFiles('/public_html');
 *   // ... deployment logic
 * }
 * ```
 */
//# sourceMappingURL=cpanel_api_client.d.ts.map