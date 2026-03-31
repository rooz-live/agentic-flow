/**
 * cPanel API Client for YOLIFE Deployment
 * Uses cPanel UAPI/WHM API instead of SSH for deployments
 * 
 * Docs: https://api.docs.cpanel.net/cpanel/introduction/
 * Auth: https://docs.cpanel.net/knowledge-base/security/guide-to-ssl/
 */

import https from 'https';

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

export class CPanelAPIClient {
  private config: CPanelConfig;
  private baseUrl: string;

  constructor(config: CPanelConfig) {
    this.config = {
      ...config,
      port: config.port || 2083,
      ssl: config.ssl !== false // Default to SSL
    };
    
    const protocol = this.config.ssl ? 'https' : 'http';
    this.baseUrl = `${protocol}://${this.config.host}:${this.config.port}`;
  }

  /**
   * Make authenticated API call to cPanel UAPI
   */
  async call(module: string, func: string, params: Record<string, any> = {}): Promise<CPanelResponse> {
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/execute/${module}/${func}${queryString ? '?' + queryString : ''}`;

    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          'Authorization': `cpanel ${this.config.username}:${this.config.apiToken}`,
          'Accept': 'application/json'
        },
        rejectUnauthorized: false // Allow self-signed certs (dev only)
      }, (res) => {
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({
              status: res.statusCode || 0,
              statusDescription: res.statusMessage,
              data: parsed
            });
          } catch (error) {
            reject(new Error(`Failed to parse cPanel response: ${error}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('cPanel API request timeout'));
      });
    });
  }

  /**
   * Test connectivity to cPanel
   */
  async testConnection(): Promise<{ connected: boolean; version?: string; error?: string }> {
    try {
      const response = await this.call('Branding', 'get_available_brands');
      return {
        connected: response.status === 200,
        version: response.data?.version
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Upload file via cPanel File Manager API
   */
  async uploadFile(remotePath: string, fileContent: Buffer | string): Promise<CPanelResponse> {
    // Implementation uses Fileman/upload_files UAPI call
    // Requires multipart/form-data which needs proper FormData handling
    throw new Error('uploadFile not yet implemented - use cPanel File Manager UI or FTP');
  }

  /**
   * List files in directory
   */
  async listFiles(directory: string): Promise<CPanelResponse> {
    return this.call('Fileman', 'list_files', { dir: directory });
  }

  /**
   * Get domain list
   */
  async getDomains(): Promise<CPanelResponse> {
    return this.call('DomainInfo', 'list_domains');
  }

  /**
   * Get SSL certificate info
   */
  async getSSLInfo(): Promise<CPanelResponse> {
    return this.call('SSL', 'list_certs');
  }

  /**
   * Execute shell command via Terminal API (if enabled)
   */
  async execCommand(command: string): Promise<CPanelResponse> {
    // Note: Terminal API may not be available on all cPanel installs
    return this.call('Terminal', 'execute', { command });
  }

  /**
   * Get account info
   */
  async getAccountInfo(): Promise<CPanelResponse> {
    return this.call('UserManager', 'get_user_information');
  }

  /**
   * Health check - comprehensive
   */
  async healthCheck(): Promise<{
    cpanel: boolean;
    domains: boolean;
    ssl: boolean;
    fileAccess: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // Test cPanel connection
    const connTest = await this.testConnection();
    if (!connTest.connected) {
      errors.push(`cPanel connection failed: ${connTest.error}`);
    }

    // Test domain access
    let domainsOk = false;
    try {
      const domains = await this.getDomains();
      domainsOk = domains.status === 200;
    } catch (error) {
      errors.push(`Domain API failed: ${error}`);
    }

    // Test SSL info
    let sslOk = false;
    try {
      const ssl = await this.getSSLInfo();
      sslOk = ssl.status === 200;
    } catch (error) {
      errors.push(`SSL API failed: ${error}`);
    }

    // Test file access
    let fileAccessOk = false;
    try {
      const files = await this.listFiles('/');
      fileAccessOk = files.status === 200;
    } catch (error) {
      errors.push(`File API failed: ${error}`);
    }

    return {
      cpanel: connTest.connected,
      domains: domainsOk,
      ssl: sslOk,
      fileAccess: fileAccessOk,
      errors
    };
  }
}

/**
 * Factory function to create client from environment variables
 */
export function createCPanelClient(): CPanelAPIClient {
  const host = process.env.YOLIFE_CPANEL_HOST;
  const username = process.env.CPANEL_USERNAME || 'root';
  const apiToken = process.env.CPANEL_API_TOKEN;

  if (!host || !apiToken) {
    throw new Error('Missing required environment variables: YOLIFE_CPANEL_HOST, CPANEL_API_TOKEN');
  }

  return new CPanelAPIClient({
    host,
    port: 2083,
    username,
    apiToken,
    ssl: true
  });
}

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
