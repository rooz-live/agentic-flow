/**
 * cPanel UAPI Client for Deployment
 * Uses cPanel UAPI for file management and deployment without SSH
 */
export interface CpanelConfig {
    host: string;
    port: number;
    username: string;
    apiToken: string;
    useSsl?: boolean;
}
export interface FileUploadOptions {
    localPath: string;
    remotePath: string;
    permissions?: string;
}
export interface DeploymentResult {
    success: boolean;
    message: string;
    details?: any;
    errors?: string[];
}
export declare class CpanelClient {
    private config;
    private baseUrl;
    constructor(config: CpanelConfig);
    /**
     * Get authorization header for cPanel UAPI
     */
    private getAuthHeader;
    /**
     * Execute cPanel UAPI call
     */
    private executeUAPI;
    /**
     * Test cPanel connection
     */
    testConnection(): Promise<boolean>;
    /**
     * Upload file to cPanel
     */
    uploadFile(options: FileUploadOptions): Promise<DeploymentResult>;
    /**
     * Upload directory recursively
     */
    uploadDirectory(localDir: string, remoteDir: string, options?: {
        permissions?: string;
        exclude?: string[];
    }): Promise<DeploymentResult>;
    /**
     * Get all files in directory recursively
     */
    private getAllFiles;
    /**
     * Create directory on cPanel
     */
    createDirectory(remotePath: string): Promise<DeploymentResult>;
    /**
     * List files in directory
     */
    listFiles(remotePath: string): Promise<DeploymentResult>;
    /**
     * Set file permissions
     */
    setPermissions(remotePath: string, permissions: string): Promise<DeploymentResult>;
    /**
     * Execute command via Terminal API (if enabled)
     */
    executeCommand(command: string): Promise<DeploymentResult>;
    /**
     * Deploy application bundle
     */
    deployApplication(options: {
        localBuildDir: string;
        remoteAppDir: string;
        excludePatterns?: string[];
        postDeployCommands?: string[];
    }): Promise<DeploymentResult>;
    /**
     * Get SSL certificate info
     */
    getSSLInfo(domain: string): Promise<DeploymentResult>;
}
/**
 * Create cPanel client from environment variables
 */
export declare function createCpanelClientFromEnv(): CpanelClient | null;
/**
 * Example usage
 */
export declare function exampleDeployment(): Promise<void>;
//# sourceMappingURL=cpanel-client.d.ts.map