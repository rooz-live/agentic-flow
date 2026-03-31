/**
 * React Hook for ROAM WebSocket Connection
 * Provides real-time ROAM metrics and circle event updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface ROAMMetrics {
  risk: number;
  obstacle: number;
  assumption: number;
  mitigation: number;
  exposureScore: number;
  entities: number;
  relationships: number;
  timestamp: number;
}

interface CircleEvent {
  circle: string;
  ceremony: string;
  timestamp: number;
  duration?: number;
  status: 'started' | 'completed' | 'failed';
}

interface WSMessage {
  type: 'roam_update' | 'circle_event' | 'heartbeat';
  data?: any;
  timestamp: number;
}

interface UseROAMWebSocketReturn {
  metrics: ROAMMetrics | null;
  events: CircleEvent[];
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
}

export const useROAMWebSocket = (url: string = 'ws://localhost:8080'): UseROAMWebSocketReturn => {
  const [metrics, setMetrics] = useState<ROAMMetrics | null>(null);
  const [events, setEvents] = useState<CircleEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;

        // Send subscribe message
        ws.send(JSON.stringify({
          type: 'subscribe',
          timestamp: Date.now()
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'roam_update':
              setMetrics(message.data);
              break;
            
            case 'circle_event':
              setEvents((prev) => [message.data, ...prev].slice(0, 50)); // Keep last 50 events
              break;
            
            case 'heartbeat':
              // Heartbeat received, connection is alive
              break;
            
            default:
              console.warn('Unknown message type:', message.type);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setError(new Error('Max reconnection attempts reached'));
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, [url]);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    metrics,
    events,
    isConnected,
    error,
    reconnect
  };
};

export default useROAMWebSocket;
