/**
 * WSJF REST API Routes
 *
 * Express.js routes for WSJF management including jobs, queues,
 * configurations, and analytics endpoints
 */
import { Router, Request, Response, NextFunction } from 'express';
import { WSJFScoringService } from '../scoring-service';
export declare class WSJFApiRoutes {
    private router;
    private scoringService;
    constructor(scoringService: WSJFScoringService);
    /**
     * Setup all WSJF API routes
     */
    private setupRoutes;
    /**
     * Setup job-related routes
     */
    private setupJobRoutes;
    /**
     * Setup queue-related routes
     */
    private setupQueueRoutes;
    /**
     * Setup configuration-related routes
     */
    private setupConfigurationRoutes;
    /**
     * Setup analytics routes
     */
    private setupAnalyticsRoutes;
    /**
     * Setup utility routes
     */
    private setupUtilityRoutes;
    /**
     * Validate job creation request
     */
    private validateJobCreateRequest;
    /**
     * Get router instance
     */
    getRouter(): Router;
    /**
     * Error handling middleware
     */
    errorHandler(error: any, req: Request, res: Response, next: NextFunction): void;
    /**
     * Get HTTP status code from error code
     */
    private getStatusCodeFromError;
}
//# sourceMappingURL=routes.d.ts.map