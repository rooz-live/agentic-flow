/**
 * cPanel API Client - UAPI/API2 Integration
 * Replaces SSH-based deployment with cPanel API calls
 *
 * @see https://api.docs.cpanel.net/cpanel/introduction/
 */
export class CPanelAPIClient {
    config;
    baseUrl;
    constructor(config) {
        this.config = {
            ...config,
            secure: config.secure !== false, // Default to HTTPS
            port: config.port || 2083,
        };
        const protocol = this.config.secure ? 'https' : 'http';
        this.baseUrl = `${protocol}://${this.config.host}:${this.config.port}`;
    }
    getAuthHeader() {
        return `cpanel ${this.config.username}:${this.config.token}`;
    }
    /**
     * Execute a UAPI call
     * @param module - UAPI module (e.g., 'Email', 'Fileman', 'MySQL')
     * @param function_name - Function to call
     * @param params - Function parameters
     */
    async executeUAPI(module, function_name, params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const url = `${this.baseUrl}/execute/${module}/${function_name}${queryParams ? '?' + queryParams : ''}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Accept': 'application/json',
                },
            });
            const data = await response.json();
            return {
                status: response.status,
                data: data.data,
                errors: data.errors,
                metadata: data.metadata,
            };
        }
        catch (error) {
            return {
                status: 500,
                errors: [`API call failed: ${error}`],
            };
        }
    }
    /**
     * Upload file to cPanel via Fileman
     */
    async uploadFile(localPath, remotePath) {
        const fs = require('fs');
        const path = require('path');
        const fileContent = fs.readFileSync(localPath);
        const fileName = path.basename(localPath);
        const formData = new FormData();
        formData.append('file', new Blob([fileContent]), fileName);
        formData.append('dir', remotePath);
        try {
            const response = await fetch(`${this.baseUrl}/execute/Fileman/upload_files`, {
                method: 'POST',
                headers: {
                    'Authorization': this.getAuthHeader(),
                },
                body: formData,
            });
            const data = await response.json();
            return {
                status: response.status,
                data: data.data,
                errors: data.errors,
            };
        }
        catch (error) {
            return {
                status: 500,
                errors: [`File upload failed: ${error}`],
            };
        }
    }
    /**
     * Deploy application to cPanel
     */
    async deployApplication(files, targetDir) {
        console.log(`📦 Deploying ${files.length} files to ${targetDir}...`);
        const results = [];
        for (const file of files) {
            console.log(`  Uploading ${file}...`);
            const result = await this.uploadFile(file, targetDir);
            results.push(result);
            if (result.errors?.length) {
                console.error(`  ❌ Failed: ${result.errors.join(', ')}`);
                return { status: 500, errors: result.errors };
            }
        }
        console.log(`  ✅ Deployed ${results.length} files successfully`);
        return { status: 200, data: results };
    }
    /**
     * List files in directory
     */
    async listFiles(directory) {
        return this.executeUAPI('Fileman', 'list_files', { dir: directory });
    }
    /**
     * Get account info
     */
    async getAccountInfo() {
        return this.executeUAPI('CpanelAccount', 'list_accounts');
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const result = await this.getAccountInfo();
            return result.status === 200 && !result.errors?.length;
        }
        catch {
            return false;
        }
    }
}
// Factory function
export function createCPanelClient(config) {
    const defaultConfig = {
        host: process.env.YOLIFE_CPANEL_HOST || '',
        port: parseInt(process.env.YOLIFE_CPANEL_PORT || '2083'),
        username: process.env.CPANEL_USERNAME || 'root',
        token: process.env.CPANEL_API_TOKEN || '',
    };
    return new CPanelAPIClient({ ...defaultConfig, ...config });
}
// Usage example
export async function deployCPanel() {
    const client = createCPanelClient();
    // Health check first
    const healthy = await client.healthCheck();
    if (!healthy) {
        throw new Error('cPanel API health check failed');
    }
    // Deploy files
    await client.deployApplication([
        './dist/index.html',
        './dist/app.js',
        './dist/styles.css',
    ], '/public_html/app');
}
//# sourceMappingURL=cpanel-api-client.js.map