/**
 * Enhanced real-time service with WebSocket connection management
 */
export class RealTimeService {
    ws = null;
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    reconnectDelay = 1000;
    heartbeatInterval = null;
    callbacks;
    url;
    reconnectTimeoutId = null;
    constructor(url, callbacks) {
        this.url = url;
        this.callbacks = callbacks;
    }
    /**
     * Connect to WebSocket with enhanced error handling
     */
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);
                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.callbacks.onConnectionChange(true);
                    resolve();
                };
                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    }
                    catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                        this.callbacks.onError(error instanceof Error ? error : new Error('Parse error'));
                    }
                };
                this.ws.onclose = (event) => {
                    console.log('WebSocket disconnected:', event.code, event.reason);
                    this.stopHeartbeat();
                    this.callbacks.onConnectionChange(false);
                    this.scheduleReconnect();
                };
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.callbacks.onError(new Error('WebSocket connection error'));
                    reject(error);
                };
                // Connection timeout
                const timeout = setTimeout(() => {
                    if (this.ws?.readyState === WebSocket.CONNECTING) {
                        this.ws.close();
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 10000);
                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    console.log('WebSocket connected');
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.callbacks.onConnectionChange(true);
                    resolve();
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        this.clearReconnectTimeout();
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
    }
    /**
     * Send message to server
     */
    send(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    }
    /**
     * Subscribe to specific pattern updates
     */
    subscribeToPattern(patternId) {
        return this.send({
            type: 'subscribe',
            channel: 'pattern',
            patternId
        });
    }
    /**
     * Subscribe to anomaly notifications
     */
    subscribeToAnomalies() {
        return this.send({
            type: 'subscribe',
            channel: 'anomalies'
        });
    }
    /**
     * Subscribe to all updates
     */
    subscribeToAll() {
        return this.send({
            type: 'subscribe',
            channel: 'all'
        });
    }
    /**
     * Get connection status
     */
    isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
    /**
     * Get ready state
     */
    getReadyState() {
        return this.ws?.readyState ?? WebSocket.CLOSED;
    }
    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(message) {
        // Handle all message types with type guard
        if (message.type === 'pattern_update') {
            if (message.data) {
                this.callbacks.onPatternUpdate(message.data);
            }
        }
        else if (message.type === 'anomaly') {
            if (message.data) {
                this.callbacks.onAnomalyDetected(message.data);
            }
        }
        else if (message.type === 'status') {
            if (message.data) {
                this.callbacks.onExecutionStatusChange(message.data);
            }
        }
        else if (message.type === 'metrics') {
            if (message.data) {
                this.callbacks.onMetricsUpdate(message.data);
            }
        }
        else if (message.type === 'heartbeat') {
            // Respond to server heartbeat
            this.send({ type: 'heartbeat_response', timestamp: Date.now() });
        }
        else if (message.type === 'error') {
            this.callbacks.onError(new Error(message.data?.message || 'Server error'));
        }
        else {
            console.warn('Unknown message type:', message.type);
        }
    }
    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }
        this.clearReconnectTimeout();
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        console.log(`Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
        this.reconnectTimeoutId = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect().catch(error => {
                console.error('Reconnection failed:', error);
            });
        }, delay);
    }
    /**
     * Clear reconnection timeout
     */
    clearReconnectTimeout() {
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }
    }
    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send({ type: 'heartbeat', timestamp: Date.now() });
            }
        }, 30000); // Send heartbeat every 30 seconds
    }
    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
}
//# sourceMappingURL=RealTimeService.js.map