/**
 * cPanel API Client - UAPI/API2 Integration
 * Replaces SSH-based deployment with cPanel API calls
 *
 * @see https://api.docs.cpanel.net/cpanel/introduction/
 */
export interface CPanelConfig {
    host: string;
    port: number;
    username: string;
    token: string;
    secure?: boolean;
}
export interface CPanelResponse<T = any> {
    status: number;
    data?: T;
    errors?: string[];
    metadata?: Record<string, any>;
}
export declare class CPanelAPIClient {
    private config;
    private baseUrl;
    constructor(config: CPanelConfig);
    private getAuthHeader;
    /**
     * Execute a UAPI call
     * @param module - UAPI module (e.g., 'Email', 'Fileman', 'MySQL')
     * @param function_name - Function to call
     * @param params - Function parameters
     */
    executeUAPI<T = any>(module: string, function_name: string, params?: Record<string, any>): Promise<CPanelResponse<T>>;
    /**
     * Upload file to cPanel via Fileman
     */
    uploadFile(localPath: string, remotePath: string): Promise<CPanelResponse>;
    /**
     * Deploy application to cPanel
     */
    deployApplication(files: string[], targetDir: string): Promise<CPanelResponse>;
    /**
     * List files in directory
     */
    listFiles(directory: string): Promise<CPanelResponse>;
    /**
     * Get account info
     */
    getAccountInfo(): Promise<CPanelResponse>;
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
}
export declare function createCPanelClient(config?: Partial<CPanelConfig>): CPanelAPIClient;
export declare function deployCPanel(): Promise<void>;
//# sourceMappingURL=cpanel-api-client.d.ts.map