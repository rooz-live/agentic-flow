/**
 * Enhanced real-time service with WebSocket connection management
 */

import { WebSocketMessage, PatternMetric, AnomalyDetection, PatternExecutionStatus } from '../types/patterns';

export interface RealTimeCallbacks {
  onPatternUpdate: (pattern: PatternMetric) => void;
  onAnomalyDetected: (anomaly: AnomalyDetection) => void;
  onExecutionStatusChange: (status: PatternExecutionStatus) => void;
  onMetricsUpdate: (metrics: any) => void;
  onConnectionChange: (connected: boolean) => void;
  onError: (error: Error) => void;
}

export class RealTimeService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private callbacks: RealTimeCallbacks;
  private url: string;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;

  constructor(url: string, callbacks: RealTimeCallbacks) {
    this.url = url;
    this.callbacks = callbacks;
  }

  /**
   * Connect to WebSocket with enhanced error handling
   */
  connect(): Promise<void> {
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
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
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

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
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
  send(message: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /**
   * Subscribe to specific pattern updates
   */
  subscribeToPattern(patternId: string): boolean {
    return this.send({
      type: 'subscribe',
      channel: 'pattern',
      patternId
    });
  }

  /**
   * Subscribe to anomaly notifications
   */
  subscribeToAnomalies(): boolean {
    return this.send({
      type: 'subscribe',
      channel: 'anomalies'
    });
  }

  /**
   * Subscribe to all updates
   */
  subscribeToAll(): boolean {
    return this.send({
      type: 'subscribe',
      channel: 'all'
    });
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get ready state
   */
  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    // Handle all message types with type guard
    if (message.type === 'pattern_update') {
      if (message.data) {
        this.callbacks.onPatternUpdate(message.data);
      }
    } else if (message.type === 'anomaly') {
      if (message.data) {
        this.callbacks.onAnomalyDetected(message.data);
      }
    } else if (message.type === 'status') {
      if (message.data) {
        this.callbacks.onExecutionStatusChange(message.data);
      }
    } else if (message.type === 'metrics') {
      if (message.data) {
        this.callbacks.onMetricsUpdate(message.data);
      }
    } else if (message.type === 'heartbeat') {
      // Respond to server heartbeat
      this.send({ type: 'heartbeat_response', timestamp: Date.now() });
    } else if (message.type === 'error') {
      this.callbacks.onError(new Error(message.data?.message || 'Server error'));
    } else {
      console.warn('Unknown message type:', (message as any).type);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
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
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
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
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}