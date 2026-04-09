/**
 * SaaS Deployment API Server Example
 * 
 * This example demonstrates how to set up a REST API server for the SaaS Deployment Framework
 * using Express.js with authentication, rate limiting, and comprehensive endpoints.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { DeploymentApi } from '../src/saas-deployment/api/deployment-api';
import { SaaSDeploymentFramework } from '../src/saas-deployment';
import { OrchestrationFramework } from '../src/core/orchestration-framework';
import { WSJFService } from '../src/core/wsjf-service';
import { HealthCheckSystem } from '../src/core/health-checks';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Initialize SaaS Deployment Framework
async function initializeFramework() {
  console.log('Initializing SaaS Deployment Framework...');
  
  const orchestration = new OrchestrationFramework();
  const wsjfService = new WSJFService();
  const healthCheckSystem = new HealthCheckSystem();

  const framework = new SaaSDeploymentFramework({
    deploymentManager: {
      orchestration,
      wsjfService,
      healthCheckSystem
    },
    securityService: {
      orchestration,
      wsjfService,
      healthCheckSystem
    },
    configurationManager: {
      orchestration,
      wsjfService,
      healthCheckSystem
    },
    monitoringService: {
      orchestration,
      wsjfService,
      healthCheckSystem
    },
    integration: {
      neuralTrading: {
        enabled: true,
        endpoint: process.env.NEURAL_TRADING_API_URL || 'https://api.neuraltrading.com',
        apiKey: process.env.NEURAL_TRADING_API_KEY || 'demo-key'
      },
      paymentProcessing: {
        enabled: true,
        stripeSecretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_demo'
      },
      monitoring: {
        enabled: true,
        endpoint: process.env.MONITORING_API_URL || 'https://api.monitoring.com',
        apiKey: process.env.MONITORING_API_KEY || 'demo-key'
      }
    }
  });

  await framework.initialize();
  console.log('✅ SaaS Deployment Framework initialized');
  
  return framework;
}

// Initialize API
async function initializeApi() {
  const framework = await initializeFramework();
  
  const api = new DeploymentApi({
    deploymentManager: framework.getDeploymentManager(),
    securityService: framework.getSecurityService(),
    configurationManager: framework.getConfigurationManager(),
    monitoringService: framework.getMonitoringService(),
    integration: framework.getIntegrationLayer()
  });

  // Mount API routes
  app.use('/api/deployments', api.createRouter());
  
  // Add additional documentation routes
  app.get('/api/docs', (req, res) => {
    res.json({
      title: 'SaaS Deployment API',
      version: '1.0.0',
      description: 'RESTful API for managing SaaS deployments',
      endpoints: {
        deployments: {
          'GET /api/deployments': 'List all deployments',
          'POST /api/deployments': 'Create a new deployment',
          'GET /api/deployments/:id': 'Get a specific deployment',
          'PUT /api/deployments/:id': 'Update a deployment',
          'DELETE /api/deployments/:id': 'Cancel a deployment',
          'POST /api/deployments/:id/rollback': 'Rollback a deployment',
          'POST /api/deployments/:id/verify': 'Verify a deployment'
        },
        templates: {
          'GET /api/deployments/templates': 'List deployment templates',
          'POST /api/deployments/templates': 'Create a new template',
          'GET /api/deployments/templates/:id': 'Get a specific template',
          'PUT /api/deployments/templates/:id': 'Update a template',
          'DELETE /api/deployments/templates/:id': 'Delete a template'
        },
        environments: {
          'GET /api/deployments/environments': 'List environment configurations',
          'POST /api/deployments/environments': 'Create a new environment',
          'GET /api/deployments/environments/:id': 'Get a specific environment',
          'PUT /api/deployments/environments/:id': 'Update an environment'
        },
        monitoring: {
          'GET /api/deployments/monitoring/metrics/:deploymentId': 'Get deployment metrics',
          'GET /api/deployments/monitoring/alerts/:tenantId': 'Get tenant alerts',
          'POST /api/deployments/monitoring/alerts/:alertId/acknowledge': 'Acknowledge an alert',
          'POST /api/deployments/monitoring/alerts/:alertId/resolve': 'Resolve an alert',
          'GET /api/deployments/monitoring/dashboards/:tenantId': 'Get tenant dashboards'
        },
        integrations: {
          'GET /api/deployments/integrations/neural-trading/:tenantId': 'Get neural trading integration',
          'GET /api/deployments/integrations/payment-processing/:tenantId': 'Get payment processing integration',
          'GET /api/deployments/integrations/monitoring/:tenantId': 'Get monitoring integration'
        }
      }
    });
  });

  // Add example usage endpoint
  app.get('/api/examples', (req, res) => {
    res.json({
      examples: {
        createDeployment: {
          method: 'POST',
          url: '/api/deployments',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer your-jwt-token'
          },
          body: {
            tenantId: 'tenant-123',
            name: 'Production Deployment',
            description: 'Deploy production application',
            configuration: {
              environment: 'production',
              region: 'us-east-1',
              infrastructure: {
                compute: {
                  instanceType: 't3.medium',
                  count: 3
                },
                application: {
                  version: '1.0.0',
                  dockerImage: 'my-app:1.0.0'
                },
                strategy: {
                  type: 'rolling'
                }
              }
            },
            priority: 'high'
          }
        },
        getMetrics: {
          method: 'GET',
          url: '/api/deployments/monitoring/metrics/deployment-123',
          headers: {
            'Authorization': 'Bearer your-jwt-token'
          }
        },
        createAlert: {
          method: 'POST',
          url: '/api/deployments/monitoring/alerts',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer your-jwt-token'
          },
          body: {
            tenantId: 'tenant-123',
            deploymentId: 'deployment-123',
            type: 'performance',
            severity: 'warning',
            title: 'High CPU Utilization',
            description: 'CPU utilization is above 80%',
            condition: {
              metric: 'cpu_utilization',
              operator: 'gt',
              threshold: 80,
              duration: 300
            },
            threshold: 80,
            currentValue: 85
          }
        }
      }
    });
  });

  return framework;
}

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  try {
    await initializeApi();
    
    app.listen(PORT, () => {
      console.log(`🚀 SaaS Deployment API Server running on port ${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`📝 API Examples: http://localhost:${PORT}/api/examples`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

export { initializeApi, startServer };