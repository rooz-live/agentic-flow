/**
 * Medical Analysis REST API
 * Express-based API with WebSocket support for real-time updates
 */
export declare class MedicalAnalysisAPI {
    private port;
    private app;
    private server;
    private wss;
    private analysisService;
    private antiHallucinationService;
    private learningService;
    private providerService;
    private connections;
    constructor(port?: number);
    /**
     * Setup Express middleware
     */
    private setupMiddleware;
    /**
     * Setup API routes
     */
    private setupRoutes;
    /**
     * Setup WebSocket for real-time updates
     */
    private setupWebSocket;
    /**
     * Handle incoming WebSocket messages
     */
    private handleWebSocketMessage;
    /**
     * Send WebSocket message
     */
    private sendWebSocketMessage;
    /**
     * Broadcast to all connected clients
     */
    private broadcast;
    /**
     * Setup error handling
     */
    private setupErrorHandling;
    /**
     * Create standardized error response
     */
    private createErrorResponse;
    /**
     * Start the server
     */
    start(): void;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
}
export declare const api: MedicalAnalysisAPI;
//# sourceMappingURL=index.d.ts.map