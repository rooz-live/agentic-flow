/**
 * cPanel UAPI Client for Deployment
 * Uses cPanel UAPI for file management and deployment without SSH
 */
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
export class CpanelClient {
    config;
    baseUrl;
    constructor(config) {
        this.config = {
            ...config,
            useSsl: config.useSsl !== false // Default to true
        };
        const protocol = this.config.useSsl ? 'https' : 'http';
        this.baseUrl = `${protocol}://${this.config.host}:${this.config.port}`;
    }
    /**
     * Get authorization header for cPanel UAPI
     */
    getAuthHeader() {
        return `cpanel ${this.config.username}:${this.config.apiToken}`;
    }
    /**
     * Execute cPanel UAPI call
     */
    async executeUAPI(module, function_name, params = {}) {
        const url = new URL(`${this.baseUrl}/execute/${module}/${function_name}`);
        // Add query parameters
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, String(value));
        });
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`cPanel API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (data.errors && data.errors.length > 0) {
            throw new Error(`cPanel API errors: ${data.errors.join(', ')}`);
        }
        return data;
    }
    /**
     * Test cPanel connection
     */
    async testConnection() {
        try {
            const result = await this.executeUAPI('Email', 'list_pops');
            return result.status === 1;
        }
        catch (error) {
            console.error('❌ cPanel connection test failed:', error);
            return false;
        }
    }
    /**
     * Upload file to cPanel
     */
    async uploadFile(options) {
        try {
            // Read file
            const fileContent = fs.readFileSync(options.localPath);
            const fileName = path.basename(options.localPath);
            // Create form data
            const formData = new FormData();
            formData.append('file-1', fileContent, {
                filename: fileName,
                contentType: 'application/octet-stream'
            });
            formData.append('dir', path.dirname(options.remotePath));
            if (options.permissions) {
                formData.append('permissions', options.permissions);
            }
            // Upload via UAPI
            const url = `${this.baseUrl}/execute/Fileman/upload_files`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': this.getAuthHeader(),
                    ...formData.getHeaders()
                },
                body: formData
            });
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }
            const result = await response.json();
            if (result.status === 1) {
                return {
                    success: true,
                    message: `File ${fileName} uploaded successfully to ${options.remotePath}`,
                    details: result.data
                };
            }
            else {
                return {
                    success: false,
                    message: `Upload failed for ${fileName}`,
                    errors: result.errors
                };
            }
        }
        catch (error) {
            return {
                success: false,
                message: `Upload error: ${error instanceof Error ? error.message : String(error)}`,
                errors: [String(error)]
            };
        }
    }
    /**
     * Upload directory recursively
     */
    async uploadDirectory(localDir, remoteDir, options = {}) {
        const results = [];
        const errors = [];
        try {
            const files = this.getAllFiles(localDir, options.exclude || []);
            for (const file of files) {
                const relativePath = path.relative(localDir, file);
                const remotePath = path.join(remoteDir, relativePath).replace(/\\/g, '/');
                const result = await this.uploadFile({
                    localPath: file,
                    remotePath,
                    permissions: options.permissions
                });
                results.push(result);
                if (!result.success) {
                    errors.push(`${file}: ${result.message}`);
                }
            }
            const successCount = results.filter(r => r.success).length;
            return {
                success: errors.length === 0,
                message: `Uploaded ${successCount}/${files.length} files to ${remoteDir}`,
                details: { results, successCount, totalFiles: files.length },
                errors: errors.length > 0 ? errors : undefined
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Directory upload error: ${error instanceof Error ? error.message : String(error)}`,
                errors: [String(error)]
            };
        }
    }
    /**
     * Get all files in directory recursively
     */
    getAllFiles(dir, exclude) {
        const files = [];
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            // Check if excluded
            if (exclude.some(pattern => fullPath.includes(pattern))) {
                continue;
            }
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                files.push(...this.getAllFiles(fullPath, exclude));
            }
            else {
                files.push(fullPath);
            }
        }
        return files;
    }
    /**
     * Create directory on cPanel
     */
    async createDirectory(remotePath) {
        try {
            const result = await this.executeUAPI('Fileman', 'make_dir', {
                path: remotePath
            });
            return {
                success: result.status === 1,
                message: result.status === 1
                    ? `Directory ${remotePath} created successfully`
                    : `Failed to create directory ${remotePath}`,
                details: result.data,
                errors: result.errors
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Directory creation error: ${error instanceof Error ? error.message : String(error)}`,
                errors: [String(error)]
            };
        }
    }
    /**
     * List files in directory
     */
    async listFiles(remotePath) {
        try {
            const result = await this.executeUAPI('Fileman', 'list_files', {
                path: remotePath
            });
            return {
                success: result.status === 1,
                message: result.status === 1
                    ? `Listed files in ${remotePath}`
                    : `Failed to list files in ${remotePath}`,
                details: result.data,
                errors: result.errors
            };
        }
        catch (error) {
            return {
                success: false,
                message: `List files error: ${error instanceof Error ? error.message : String(error)}`,
                errors: [String(error)]
            };
        }
    }
    /**
     * Set file permissions
     */
    async setPermissions(remotePath, permissions) {
        try {
            const result = await this.executeUAPI('Fileman', 'set_permissions', {
                path: remotePath,
                permissions
            });
            return {
                success: result.status === 1,
                message: result.status === 1
                    ? `Permissions set for ${remotePath}`
                    : `Failed to set permissions for ${remotePath}`,
                details: result.data,
                errors: result.errors
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Set permissions error: ${error instanceof Error ? error.message : String(error)}`,
                errors: [String(error)]
            };
        }
    }
    /**
     * Execute command via Terminal API (if enabled)
     */
    async executeCommand(command) {
        try {
            const result = await this.executeUAPI('Terminal', 'run_command', {
                command
            });
            return {
                success: result.status === 1,
                message: result.status === 1
                    ? 'Command executed successfully'
                    : 'Command execution failed',
                details: result.data,
                errors: result.errors
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Command execution error: ${error instanceof Error ? error.message : String(error)}`,
                errors: [String(error)]
            };
        }
    }
    /**
     * Deploy application bundle
     */
    async deployApplication(options) {
        const steps = [];
        const errors = [];
        try {
            // Step 1: Create remote directory
            steps.push('Creating remote directory...');
            const createDirResult = await this.createDirectory(options.remoteAppDir);
            if (!createDirResult.success) {
                errors.push(`Create directory failed: ${createDirResult.message}`);
            }
            // Step 2: Upload files
            steps.push('Uploading application files...');
            const uploadResult = await this.uploadDirectory(options.localBuildDir, options.remoteAppDir, {
                exclude: options.excludePatterns || ['node_modules', '.git', '.env', '*.log'],
                permissions: '0755'
            });
            if (!uploadResult.success) {
                errors.push(`Upload failed: ${uploadResult.message}`);
            }
            // Step 3: Execute post-deploy commands
            if (options.postDeployCommands && options.postDeployCommands.length > 0) {
                steps.push('Executing post-deploy commands...');
                for (const command of options.postDeployCommands) {
                    const cmdResult = await this.executeCommand(command);
                    if (!cmdResult.success) {
                        errors.push(`Command failed: ${command} - ${cmdResult.message}`);
                    }
                }
            }
            return {
                success: errors.length === 0,
                message: errors.length === 0
                    ? `Application deployed successfully to ${options.remoteAppDir}`
                    : `Deployment completed with ${errors.length} error(s)`,
                details: { steps, uploadResult },
                errors: errors.length > 0 ? errors : undefined
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Deployment error: ${error instanceof Error ? error.message : String(error)}`,
                errors: [String(error)]
            };
        }
    }
    /**
     * Get SSL certificate info
     */
    async getSSLInfo(domain) {
        try {
            const result = await this.executeUAPI('SSL', 'list_certs', {
                domain
            });
            return {
                success: result.status === 1,
                message: result.status === 1
                    ? `SSL info retrieved for ${domain}`
                    : `Failed to get SSL info for ${domain}`,
                details: result.data,
                errors: result.errors
            };
        }
        catch (error) {
            return {
                success: false,
                message: `SSL info error: ${error instanceof Error ? error.message : String(error)}`,
                errors: [String(error)]
            };
        }
    }
}
/**
 * Create cPanel client from environment variables
 */
export function createCpanelClientFromEnv() {
    const host = process.env.YOLIFE_CPANEL_HOST;
    const username = process.env.YOLIFE_CPANEL_USERNAME || 'root';
    const apiToken = process.env.CPANEL_API_TOKEN;
    if (!host || !apiToken) {
        console.error('❌ Missing cPanel credentials in environment');
        console.error('Required: YOLIFE_CPANEL_HOST, CPANEL_API_TOKEN');
        return null;
    }
    return new CpanelClient({
        host,
        port: 2083, // Default cPanel SSL port
        username,
        apiToken,
        useSsl: true
    });
}
/**
 * Example usage
 */
export async function exampleDeployment() {
    const client = createCpanelClientFromEnv();
    if (!client) {
        return;
    }
    // Test connection
    console.log('🔍 Testing cPanel connection...');
    const connected = await client.testConnection();
    console.log(connected ? '✅ Connected' : '❌ Connection failed');
    if (!connected) {
        return;
    }
    // Deploy application
    const result = await client.deployApplication({
        localBuildDir: './dist',
        remoteAppDir: '/home/rooz/public_html/agentic-flow',
        excludePatterns: ['node_modules', '.git', '.env', '*.log', 'tests'],
        postDeployCommands: [
            'cd /home/rooz/public_html/agentic-flow && npm install --production',
            'pm2 restart agentic-flow || pm2 start index.js --name agentic-flow'
        ]
    });
    console.log(result.success ? '✅ Deployment successful' : '❌ Deployment failed');
    console.log(result.message);
    if (result.errors) {
        console.error('Errors:', result.errors);
    }
}
//# sourceMappingURL=cpanel-client.js.map