/**
 * WSJF REST API Routes
 * 
 * Express.js routes for WSJF management including jobs, queues,
 * configurations, and analytics endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { WSJFScoringService } from '../scoring-service';
import {
  WSJFJobCreateRequest,
  WSJFJobUpdateRequest,
  WSJFCalculateRequest,
  WSJFConfiguration,
  WSJFError
} from '../types';

export class WSJFApiRoutes {
  private router: Router;
  private scoringService: WSJFScoringService;

  constructor(scoringService: WSJFScoringService) {
    this.router = Router();
    this.scoringService = scoringService;
    this.setupRoutes();
  }

  /**
   * Setup all WSJF API routes
   */
  private setupRoutes(): void {
    // Job management routes
    this.setupJobRoutes();
    
    // Queue management routes
    this.setupQueueRoutes();
    
    // Configuration management routes
    this.setupConfigurationRoutes();
    
    // Analytics routes
    this.setupAnalyticsRoutes();
    
    // Utility routes
    this.setupUtilityRoutes();
  }

  /**
   * Setup job-related routes
   */
  private setupJobRoutes(): void {
    // GET /api/wsjf/jobs - Get all jobs
    this.router.get('/jobs', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { page = '1', pageSize = '20', queueId = 'default', status, type, circle, domain } = req.query;
        
        const pageNum = parseInt(page as string);
        const size = parseInt(pageSize as string);
        
        // Build filters based on query parameters
        const filters = [];
        if (status) {
          filters.push({ field: 'status', operator: 'eq', value: status });
        }
        if (type) {
          filters.push({ field: 'type', operator: 'eq', value: type });
        }
        if (circle) {
          filters.push({ field: 'circle', operator: 'eq', value: circle });
        }
        if (domain) {
          filters.push({ field: 'domain', operator: 'eq', value: domain });
        }

        const result = this.scoringService.getQueueManager().getJobs(
          queueId as string,
          pageNum,
          size,
          filters
        );

        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    });

    // GET /api/wsjf/jobs/:id - Get specific job
    this.router.get('/jobs/:id', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const job = this.scoringService.getQueueManager().getJob(id);
        
        if (!job) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'JOB_NOT_FOUND',
              message: `Job ${id} not found`
            }
          });
        }

        res.json({
          success: true,
          data: job
        });
      } catch (error) {
        next(error);
      }
    });

    // POST /api/wsjf/jobs - Create new job
    this.router.post('/jobs', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const jobRequest: WSJFJobCreateRequest = req.body;
        const { queueIds = ['default'] } = req.body;

        // Validate request
        this.validateJobCreateRequest(jobRequest);

        const job = await this.scoringService.createJob(jobRequest, queueIds);

        res.status(201).json({
          success: true,
          data: job
        });
      } catch (error) {
        next(error);
      }
    });

    // PUT /api/wsjf/jobs/:id - Update job
    this.router.put('/jobs/:id', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const updates: WSJFJobUpdateRequest = req.body;
        const { recalculateWSJF = true } = req.body;

        const job = await this.scoringService.updateJob(id, updates, recalculateWSJF);

        res.json({
          success: true,
          data: job
        });
      } catch (error) {
        next(error);
      }
    });

    // DELETE /api/wsjf/jobs/:id - Delete job
    this.router.delete('/jobs/:id', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        
        this.scoringService.getQueueManager().removeJob(id);

        res.json({
          success: true,
          message: `Job ${id} deleted successfully`
        });
      } catch (error) {
        next(error);
      }
    });

    // POST /api/wsjf/jobs/:id/calculate - Calculate WSJF for job
    this.router.post('/jobs/:id/calculate', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const { params, configurationId } = req.body;

        const result = await this.scoringService.calculateWSJF(id, params, configurationId);

        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Setup queue-related routes
   */
  private setupQueueRoutes(): void {
    // GET /api/wsjf/queues - Get all queues
    this.router.get('/queues', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const queues = this.scoringService.getQueueManager().getAllQueues();

        res.json({
          success: true,
          data: queues
        });
      } catch (error) {
        next(error);
      }
    });

    // GET /api/wsjf/queues/:id - Get specific queue
    this.router.get('/queues/:id', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const queue = this.scoringService.getQueueManager().getQueue(id);
        
        if (!queue) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'QUEUE_NOT_FOUND',
              message: `Queue ${id} not found`
            }
          });
        }

        res.json({
          success: true,
          data: queue
        });
      } catch (error) {
        next(error);
      }
    });

    // POST /api/wsjf/queues - Create new queue
    this.router.post('/queues', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { name, description, ...options } = req.body;

        if (!name || !description) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: 'Name and description are required'
            }
          });
        }

        const queue = this.scoringService.getQueueManager().createQueue(name, description, options);

        res.status(201).json({
          success: true,
          data: queue
        });
      } catch (error) {
        next(error);
      }
    });

    // PUT /api/wsjf/queues/:id - Update queue
    this.router.put('/queues/:id', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        const queue = this.scoringService.getQueueManager().updateQueue(id, updates);

        res.json({
          success: true,
          data: queue
        });
      } catch (error) {
        next(error);
      }
    });

    // GET /api/wsjf/queues/:id/next - Get next job from queue
    this.router.get('/queues/:id/next', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const job = this.scoringService.getQueueManager().getNextJob(id);

        if (!job) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'NO_JOBS_IN_QUEUE',
              message: 'No jobs available in queue'
            }
          });
        }

        res.json({
          success: true,
          data: job
        });
      } catch (error) {
        next(error);
      }
    });

    // GET /api/wsjf/queues/:id/statistics - Get queue statistics
    this.router.get('/queues/:id/statistics', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const statistics = this.scoringService.getQueueManager().getQueueStatistics(id);

        if (!statistics) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'QUEUE_NOT_FOUND',
              message: `Queue ${id} not found`
            }
          });
        }

        res.json({
          success: true,
          data: statistics
        });
      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Setup configuration-related routes
   */
  private setupConfigurationRoutes(): void {
    // GET /api/wsjf/configurations - Get all configurations
    this.router.get('/configurations', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const configurations = this.scoringService.getAllConfigurations();

        res.json({
          success: true,
          data: configurations
        });
      } catch (error) {
        next(error);
      }
    });

    // GET /api/wsjf/configurations/:id - Get specific configuration
    this.router.get('/configurations/:id', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const configuration = this.scoringService.getConfiguration(id);
        
        if (!configuration) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'CONFIG_NOT_FOUND',
              message: `Configuration ${id} not found`
            }
          });
        }

        res.json({
          success: true,
          data: configuration
        });
      } catch (error) {
        next(error);
      }
    });

    // GET /api/wsjf/configurations/active - Get active configuration
    this.router.get('/configurations/active', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const configuration = this.scoringService.getActiveConfiguration();

        res.json({
          success: true,
          data: configuration
        });
      } catch (error) {
        next(error);
      }
    });

    // POST /api/wsjf/configurations - Create new configuration
    this.router.post('/configurations', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { name, description, weightingFactors, ...options } = req.body;

        if (!name || !description || !weightingFactors) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: 'Name, description, and weighting factors are required'
            }
          });
        }

        const configuration = this.scoringService.createConfiguration(name, description, weightingFactors, options);

        res.status(201).json({
          success: true,
          data: configuration
        });
      } catch (error) {
        next(error);
      }
    });

    // PUT /api/wsjf/configurations/:id - Update configuration
    this.router.put('/configurations/:id', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        const configuration = this.scoringService.updateConfiguration(id, updates);

        res.json({
          success: true,
          data: configuration
        });
      } catch (error) {
        next(error);
      }
    });

    // POST /api/wsjf/configurations/:id/activate - Set active configuration
    this.router.post('/configurations/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        
        this.scoringService.setActiveConfiguration(id);

        res.json({
          success: true,
          message: `Configuration ${id} activated successfully`
        });
      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Setup analytics routes
   */
  private setupAnalyticsRoutes(): void {
    // GET /api/wsjf/analytics - Get analytics
    this.router.get('/analytics', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: 'Start date and end date are required'
            }
          });
        }

        const start = new Date(startDate as string);
        const end = new Date(endDate as string);

        const analytics = this.scoringService.getAnalytics(start, end);

        res.json({
          success: true,
          data: analytics
        });
      } catch (error) {
        next(error);
      }
    });

    // GET /api/wsjf/events - Get event history
    this.router.get('/events', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { limit = '100' } = req.query;
        const limitNum = parseInt(limit as string);

        const events = this.scoringService.getEventHistory(limitNum);

        res.json({
          success: true,
          data: events
        });
      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Setup utility routes
   */
  private setupUtilityRoutes(): void {
    // POST /api/wsjf/calculate - Batch calculate WSJF
    this.router.post('/calculate', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { calculations, configurationId } = req.body;

        if (!calculations || !Array.isArray(calculations)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: 'Calculations array is required'
            }
          });
        }

        const results = await this.scoringService.batchCalculateWSJF(calculations, configurationId);

        res.json({
          success: true,
          data: results
        });
      } catch (error) {
        next(error);
      }
    });

    // GET /api/wsjf/health - Health check endpoint
    this.router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const queueManager = this.scoringService.getQueueManager();
        const queues = queueManager.getAllQueues();
        const jobs = queueManager.getAllJobs();
        const configurations = this.scoringService.getAllConfigurations();

        const health = {
          status: 'healthy',
          timestamp: new Date(),
          metrics: {
            totalQueues: queues.length,
            totalJobs: jobs.length,
            activeConfigurations: configurations.filter(c => c.isActive).length,
            activeConfiguration: this.scoringService.getActiveConfiguration().id
          }
        };

        res.json({
          success: true,
          data: health
        });
      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Validate job creation request
   */
  private validateJobCreateRequest(request: WSJFJobCreateRequest): void {
    if (!request.name || !request.description || !request.type || !request.estimatedDuration || !request.params) {
      throw new Error('Name, description, type, estimated duration, and params are required');
    }

    const validTypes = ['feature', 'bug', 'enhancement', 'technical_debt', 'research', 'other'];
    if (!validTypes.includes(request.type)) {
      throw new Error(`Invalid job type. Must be one of: ${validTypes.join(', ')}`);
    }

    if (request.estimatedDuration <= 0) {
      throw new Error('Estimated duration must be greater than 0');
    }

    // Validate calculation params
    const { userBusinessValue, timeCriticality, customerValue, jobSize } = request.params;
    if (typeof userBusinessValue !== 'number' || userBusinessValue < 0 || userBusinessValue > 100) {
      throw new Error('User business value must be a number between 0 and 100');
    }
    if (typeof timeCriticality !== 'number' || timeCriticality < 0 || timeCriticality > 100) {
      throw new Error('Time criticality must be a number between 0 and 100');
    }
    if (typeof customerValue !== 'number' || customerValue < 0 || customerValue > 100) {
      throw new Error('Customer value must be a number between 0 and 100');
    }
    if (typeof jobSize !== 'number' || jobSize <= 0) {
      throw new Error('Job size must be a number greater than 0');
    }
  }

  /**
   * Get router instance
   */
  public getRouter(): Router {
    return this.router;
  }

  /**
   * Error handling middleware
   */
  public errorHandler(error: any, req: Request, res: Response, next: NextFunction): void {
    const wsjfError: WSJFError = error.code ? error : {
      code: 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
      timestamp: new Date()
    };

    const statusCode = this.getStatusCodeFromError(wsjfError.code);

    res.status(statusCode).json({
      success: false,
      error: wsjfError
    });
  }

  /**
   * Get HTTP status code from error code
   */
  private getStatusCodeFromError(errorCode: string): number {
    const statusMap: Record<string, number> = {
      'JOB_NOT_FOUND': 404,
      'QUEUE_NOT_FOUND': 404,
      'CONFIG_NOT_FOUND': 404,
      'INVALID_REQUEST': 400,
      'INVALID_JOB': 400,
      'QUEUE_FULL': 409,
      'CALCULATION_FAILED': 422,
      'JOB_CREATION_FAILED': 422,
      'JOB_UPDATE_FAILED': 422,
      'CONFIG_CREATION_FAILED': 422,
      'WSJF_CALCULATION_FAILED': 422,
      'BATCH_CALCULATION_FAILED': 422,
      'NO_ACTIVE_CONFIG': 500,
      'INTERNAL_ERROR': 500
    };

    return statusMap[errorCode] || 500;
  }
}