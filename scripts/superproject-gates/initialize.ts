/**
 * ONNX Proxy Initialization Module
 * 
 * This module handles the initialization of the ONNX LLM proxy for the
 * agentic-flow@alpha package. It loads configuration, initializes the ONNX runtime,
 * validates model files, and starts the inference server.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as http from 'http';
import * as https from 'https';

/**
 * ONNX Proxy Configuration Interface
 */
export interface OnnxProxyConfig {
  model: {
    path: string;
    endpoint: {
      url: string;
    };
    name: string;
    version: string;
    provider: string;
  };
  connection_pooling: {
    max_connections: number;
    max_idle_connections: number;
    idle_timeout: number;
    request_timeout: number;
    connect_timeout: number;
    keep_alive: boolean;
  };
  request_routing: {
    default_model: string;
    task_models: Record<string, { model: string; priority: number }>;
    fallback: {
      enabled: boolean;
      model: string;
      max_retries: number;
      timeout: number;
    };
  };
  policies: {
    retry: {
      max_retries: number;
      strategy: 'exponential' | 'linear' | 'constant';
      initial_delay: number;
      max_delay: number;
      multiplier: number;
      jitter: boolean;
    };
    timeout: {
      request: number;
      connect: number;
      read: number;
      write: number;
      total: number;
    };
  };
  logging: {
    request_logging: boolean;
    response_logging: boolean;
    error_logging: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    request_response: {
      headers: boolean;
      body: boolean;
      response_headers: boolean;
      response_body: boolean;
      mask_sensitive: boolean;
    };
    metrics: {
      enabled: boolean;
      percentiles: number[];
      histogram_buckets: number[];
    };
    file: {
      path: string;
      max_size: number;
      max_files: number;
      rotation: 'daily' | 'hourly' | 'size';
    };
  };
  performance: {
    caching: {
      enabled: boolean;
      size_mb: number;
      ttl: number;
      key_pattern: string;
    };
    batching: {
      enabled: boolean;
      max_size: number;
      max_wait_ms: number;
    };
    warmup: {
      enabled: boolean;
      requests: number;
      timeout: number;
    };
  };
  security: {
    api_key: {
      enabled: boolean;
    };
    tls: {
      verify: boolean;
      ca_cert: string;
      client_cert: string;
      client_key: string;
    };
    rate_limit: {
      enabled: boolean;
      requests_per_second: number;
      burst: number;
    };
  };
  health_check: {
    enabled: boolean;
    interval: number;
    timeout: number;
    unhealthy_threshold: number;
    healthy_threshold: number;
    endpoint: string;
    metrics: {
      model_available: boolean;
      latency_threshold: number;
      error_rate_threshold: number;
    };
  };
}

/**
 * ONNX Proxy Initialization Options
 */
export interface InitializationOptions {
  configPath?: string;
  validateModel?: boolean;
  startServer?: boolean;
  port?: number;
}

/**
 * ONNX Proxy Class
 */
export class OnnxProxy {
  private config!: OnnxProxyConfig;
  private server?: http.Server;
  private isInitialized: boolean = false;
  private healthStatus: 'healthy' | 'unhealthy' | 'initializing' = 'initializing';
  private connectionPool: Map<string, any> = new Map();
  private requestCount: number = 0;
  private errorCount: number = 0;
  private responseTimes: number[] = [];

  constructor(private options: InitializationOptions = {}) {}

  /**
   * Initialize the ONNX proxy
   */
  async initialize(): Promise<void> {
    try {
      this.log('info', 'Initializing ONNX Proxy...');

      // Load configuration
      await this.loadConfiguration();

      // Validate configuration
      this.validateConfiguration();

      // Validate model file
      if (this.options.validateModel !== false) {
        await this.validateModelFile();
      }

      // Initialize connection pool
      this.initializeConnectionPool();

      // Start inference server if requested
      if (this.options.startServer !== false) {
        await this.startInferenceServer();
      }

      // Perform warmup if enabled
      if (this.config.performance.warmup.enabled) {
        await this.performWarmup();
      }

      // Start health checks if enabled
      if (this.config.health_check.enabled) {
        this.startHealthChecks();
      }

      this.isInitialized = true;
      this.healthStatus = 'healthy';
      this.log('info', 'ONNX Proxy initialized successfully');
    } catch (error) {
      this.healthStatus = 'unhealthy';
      this.log('error', `Failed to initialize ONNX Proxy: ${error}`);
      throw error;
    }
  }

  /**
   * Load configuration from YAML file
   */
  private async loadConfiguration(): Promise<void> {
    const configPath = this.options.configPath || 
      path.join(process.cwd(), 'config', 'onnx-proxy.yml');

    this.log('info', `Loading configuration from: ${configPath}`);

    try {
      const configContent = await fs.promises.readFile(configPath, 'utf-8');
      this.config = yaml.load(configContent) as OnnxProxyConfig;

      // Expand environment variables in configuration
      this.expandEnvironmentVariables();

      this.log('info', 'Configuration loaded successfully');
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  /**
   * Expand environment variables in configuration
   */
  private expandEnvironmentVariables(): void {
    const expand = (obj: any): any => {
      if (typeof obj === 'string') {
        // Match ${VAR_NAME} pattern
        return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => {
          return process.env[varName] || '';
        });
      } else if (Array.isArray(obj)) {
        return obj.map(expand);
      } else if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = expand(value);
        }
        return result;
      }
      return obj;
    };

    this.config = expand(this.config) as OnnxProxyConfig;
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(): void {
    this.log('info', 'Validating configuration...');

    // Validate model path
    if (!this.config.model.path) {
      throw new Error('Model path is required in configuration');
    }

    // Validate endpoint URL
    if (!this.config.model.endpoint.url) {
      throw new Error('Endpoint URL is required in configuration');
    }

    // Validate connection pooling settings
    if (this.config.connection_pooling.max_connections <= 0) {
      throw new Error('Max connections must be greater than 0');
    }

    // Validate timeout settings
    if (this.config.policies.timeout.request <= 0) {
      throw new Error('Request timeout must be greater than 0');
    }

    this.log('info', 'Configuration validated successfully');
  }

  /**
   * Validate model file exists and is accessible
   */
  private async validateModelFile(): Promise<void> {
    this.log('info', `Validating model file: ${this.config.model.path}`);

    try {
      // Check if file exists
      await fs.promises.access(this.config.model.path, fs.constants.R_OK);

      // Get file stats
      const stats = await fs.promises.stat(this.config.model.path);
      this.log('info', `Model file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Check file extension
      const ext = path.extname(this.config.model.path).toLowerCase();
      if (ext !== '.onnx') {
        this.log('warn', `Model file extension is '${ext}', expected '.onnx'`);
      }

      this.log('info', 'Model file validated successfully');
    } catch (error) {
      throw new Error(`Model file validation failed: ${error}`);
    }
  }

  /**
   * Initialize connection pool
   */
  private initializeConnectionPool(): void {
    this.log('info', 'Initializing connection pool...');

    // In a real implementation, this would create actual connection pool
    // For now, we'll just log the configuration
    this.log('info', `Max connections: ${this.config.connection_pooling.max_connections}`);
    this.log('info', `Idle timeout: ${this.config.connection_pooling.idle_timeout}s`);
    this.log('info', `Request timeout: ${this.config.connection_pooling.request_timeout}s`);
    this.log('info', `Keep-alive: ${this.config.connection_pooling.keep_alive}`);
  }

  /**
   * Start inference server
   */
  private async startInferenceServer(): Promise<void> {
    this.log('info', 'Starting inference server...');

    const port = this.options.port || 11434;
    const endpoint = this.config.model.endpoint.url;

    // Parse endpoint URL to determine protocol
    const url = new URL(endpoint);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    // Create HTTP server
    this.server = http.createServer(async (req, res) => {
      await this.handleRequest(req, res);
    });

    return new Promise<void>((resolve, reject) => {
      this.server!.listen(port, () => {
        this.log('info', `Inference server listening on port ${port}`);
        this.log('info', `Forwarding requests to: ${endpoint}`);
        resolve();
      });

      this.server!.on('error', (error) => {
        this.log('error', `Server error: ${error}`);
        reject(error);
      });
    });
  }

  /**
   * Handle incoming HTTP request
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const startTime = Date.now();
    this.requestCount++;

    try {
      // Log request if enabled
      if (this.config.logging.request_logging) {
        this.logRequest(req);
      }

      // Parse request body
      const body = await this.parseRequestBody(req);

      // Route request to appropriate model
      const taskType = this.extractTaskType(req, body);
      const model = this.routeRequest(taskType);

      // Forward request to inference endpoint
      const response = await this.forwardRequest(body, model);

      // Calculate response time
      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);

      // Log response if enabled
      if (this.config.logging.response_logging) {
        this.logResponse(req, res, responseTime);
      }

      // Send response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));

      // Update metrics if enabled
      if (this.config.logging.metrics.enabled) {
        this.updateMetrics(responseTime);
      }
    } catch (error) {
      this.errorCount++;
      this.log('error', `Request failed: ${error}`);

      // Send error response
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  /**
   * Parse request body
   */
  private parseRequestBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error('Invalid JSON in request body'));
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * Extract task type from request
   */
  private extractTaskType(req: http.IncomingMessage, body: any): string {
    // Try to extract task type from request headers
    const taskHeader = req.headers['x-task-type'] as string;
    if (taskHeader) {
      return taskHeader;
    }

    // Try to extract task type from request body
    if (body && body.task_type) {
      return body.task_type;
    }

    // Default to 'default'
    return 'default';
  }

  /**
   * Route request to appropriate model
   */
  private routeRequest(taskType: string): string {
    const routing = this.config.request_routing;

    // Check if task type has a specific model mapping
    if (routing.task_models[taskType]) {
      return routing.task_models[taskType].model;
    }

    // Return default model
    return routing.default_model;
  }

  /**
   * Forward request to inference endpoint
   */
  private async forwardRequest(body: any, model: string): Promise<any> {
    const endpoint = this.config.model.endpoint.url;
    const url = new URL(endpoint);

    // Prepare request options
    const options: http.RequestOptions | https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Model': model,
      },
      timeout: this.config.policies.timeout.request * 1000,
    };

    // Add API key if configured
    if (this.config.security.api_key.enabled) {
      const apiKey = process.env.ONNX_PROXY_API_KEY;
      if (apiKey) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${apiKey}`,
        };
      }
    }

    const httpModule = url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = httpModule.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error('Invalid JSON in response'));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(JSON.stringify(body));
      req.end();
    });
  }

  /**
   * Perform warmup requests
   */
  private async performWarmup(): Promise<void> {
    this.log('info', 'Performing warmup...');

    const warmupConfig = this.config.performance.warmup;
    const timeout = warmupConfig.timeout * 1000;

    for (let i = 0; i < warmupConfig.requests; i++) {
      try {
        const startTime = Date.now();
        await this.forwardRequest({ warmup: true }, this.config.model.name);
        const duration = Date.now() - startTime;
        this.log('debug', `Warmup request ${i + 1}/${warmupConfig.requests} completed in ${duration}ms`);
      } catch (error) {
        this.log('warn', `Warmup request ${i + 1}/${warmupConfig.requests} failed: ${error}`);
      }
    }

    this.log('info', 'Warmup completed');
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.log('info', 'Starting health checks...');

    const interval = this.config.health_check.interval * 1000;

    setInterval(async () => {
      await this.performHealthCheck();
    }, interval);
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();

      // Check model availability
      if (this.config.health_check.metrics.model_available) {
        await fs.promises.access(this.config.model.path, fs.constants.R_OK);
      }

      // Check latency
      const responseTime = Date.now() - startTime;
      if (responseTime > this.config.health_check.metrics.latency_threshold) {
        this.log('warn', `Health check latency exceeded: ${responseTime}ms`);
      }

      // Check error rate
      if (this.requestCount > 0) {
        const errorRate = this.errorCount / this.requestCount;
        if (errorRate > this.config.health_check.metrics.error_rate_threshold) {
          this.log('warn', `Health check error rate exceeded: ${(errorRate * 100).toFixed(2)}%`);
          this.healthStatus = 'unhealthy';
        } else {
          this.healthStatus = 'healthy';
        }
      }

      this.log('debug', `Health check completed: ${this.healthStatus}`);
    } catch (error) {
      this.log('error', `Health check failed: ${error}`);
      this.healthStatus = 'unhealthy';
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(responseTime: number): void {
    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
  }

  /**
   * Log message
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // Log to console
    if (this.shouldLog(level)) {
      console.log(logMessage);
    }

    // Log to file if configured
    if (this.config.logging.file.path) {
      this.logToFile(logMessage);
    }
  }

  /**
   * Check if message should be logged based on log level
   */
  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logging.level);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }

  /**
   * Log to file
   */
  private async logToFile(message: string): Promise<void> {
    try {
      const logPath = this.config.logging.file.path;
      const logDir = path.dirname(logPath);

      // Ensure log directory exists
      await fs.promises.mkdir(logDir, { recursive: true });

      // Append to log file
      await fs.promises.appendFile(logPath, message + '\n');
    } catch (error) {
      console.error(`Failed to write to log file: ${error}`);
    }
  }

  /**
   * Log request
   */
  private logRequest(req: http.IncomingMessage): void {
    const logData: any = {
      method: req.method,
      url: req.url,
      headers: this.config.logging.request_response.headers ? req.headers : undefined,
    };

    this.log('info', `Request: ${JSON.stringify(logData)}`);
  }

  /**
   * Log response
   */
  private logResponse(req: http.IncomingMessage, res: http.ServerResponse, responseTime: number): void {
    const logData: any = {
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
    };

    this.log('info', `Response: ${JSON.stringify(logData)}`);
  }

  /**
   * Shutdown the proxy
   */
  async shutdown(): Promise<void> {
    this.log('info', 'Shutting down ONNX Proxy...');

    if (this.server) {
      return new Promise<void>((resolve) => {
        this.server!.close(() => {
          this.log('info', 'Inference server stopped');
          resolve();
        });
      });
    }

    this.isInitialized = false;
    this.log('info', 'ONNX Proxy shut down successfully');
  }

  /**
   * Get proxy status
   */
  getStatus(): {
    isInitialized: boolean;
    healthStatus: string;
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
  } {
    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    return {
      isInitialized: this.isInitialized,
      healthStatus: this.healthStatus,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      averageResponseTime: Math.round(averageResponseTime),
    };
  }
}

/**
 * Initialize ONNX proxy with default options
 */
export async function initializeOnnxProxy(options?: InitializationOptions): Promise<OnnxProxy> {
  const proxy = new OnnxProxy(options);
  await proxy.initialize();
  return proxy;
}

/**
 * Main entry point for standalone execution
 */
export async function main(): Promise<void> {
  try {
    const proxy = await initializeOnnxProxy({
      validateModel: true,
      startServer: true,
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT, shutting down...');
      await proxy.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nReceived SIGTERM, shutting down...');
      await proxy.shutdown();
      process.exit(0);
    });

    console.log('ONNX Proxy is running. Press Ctrl+C to stop.');
  } catch (error) {
    console.error('Failed to start ONNX Proxy:', error);
    process.exit(1);
  }
}

// Run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
