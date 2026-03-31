/**
 * Enhanced hook for real-time pattern monitoring
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { RealTimeService } from '../services/RealTimeService';
export function useRealTime(callbacks, options = {}) {
    const { wsUrl = 'ws://localhost:8080', autoConnect = true, reconnectOnMount = true } = options;
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);
    const serviceRef = useRef(null);
    const callbacksRef = useRef(callbacks);
    // Update callbacks ref when callbacks change
    useEffect(() => {
        callbacksRef.current = callbacks;
    }, [callbacks]);
    // Create real-time service
    const createService = useCallback(() => {
        const realTimeCallbacks = {
            onPatternUpdate: (pattern) => {
                setLastUpdate(new Date());
                callbacksRef.current.onPatternUpdate?.(pattern);
            },
            onAnomalyDetected: (anomaly) => {
                setLastUpdate(new Date());
                callbacksRef.current.onAnomalyDetected?.(anomaly);
            },
            onExecutionStatusChange: (status) => {
                setLastUpdate(new Date());
                callbacksRef.current.onExecutionStatusChange?.(status);
            },
            onMetricsUpdate: (metrics) => {
                setLastUpdate(new Date());
                callbacksRef.current.onMetricsUpdate?.(metrics);
            },
            onConnectionChange: (connected) => {
                setIsConnected(connected);
                setConnectionStatus(connected ? 'connected' : 'disconnected');
                if (connected) {
                    setError(null);
                }
            },
            onError: (err) => {
                setError(err);
                setConnectionStatus('error');
                console.error('Real-time service error:', err);
            }
        };
        return new RealTimeService(wsUrl, realTimeCallbacks);
    }, [wsUrl]);
    // Connect to WebSocket
    const connect = useCallback(async () => {
        if (!serviceRef.current) {
            serviceRef.current = createService();
        }
        setConnectionStatus('connecting');
        setError(null);
        try {
            await serviceRef.current.connect();
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Connection failed'));
            setConnectionStatus('error');
            throw err;
        }
    }, [createService]);
    // Reconnect function
    const reconnect = useCallback(async () => {
        if (serviceRef.current) {
            serviceRef.current.disconnect();
        }
        await connect();
    }, [connect]);
    // Disconnect function
    const disconnect = useCallback(() => {
        if (serviceRef.current) {
            serviceRef.current.disconnect();
        }
        setIsConnected(false);
        setConnectionStatus('disconnected');
    }, []);
    // Subscribe to specific pattern
    const subscribeToPattern = useCallback((patternId) => {
        if (serviceRef.current) {
            serviceRef.current.subscribeToPattern(patternId);
        }
    }, []);
    // Subscribe to anomalies
    const subscribeToAnomalies = useCallback(() => {
        if (serviceRef.current) {
            serviceRef.current.subscribeToAnomalies();
        }
    }, []);
    // Subscribe to all updates
    const subscribeToAll = useCallback(() => {
        if (serviceRef.current) {
            serviceRef.current.subscribeToAll();
        }
    }, []);
    // Send message
    const sendMessage = useCallback((message) => {
        if (serviceRef.current) {
            return serviceRef.current.send(message);
        }
        return false;
    }, []);
    // Auto-connect on mount
    useEffect(() => {
        if (autoConnect && reconnectOnMount) {
            connect().catch(err => {
                console.error('Auto-connection failed:', err);
            });
        }
        return () => {
            disconnect();
        };
    }, [autoConnect, reconnectOnMount, connect, disconnect]);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (serviceRef.current) {
                serviceRef.current.disconnect();
            }
        };
    }, []);
    return {
        isConnected,
        connectionStatus,
        lastUpdate,
        subscribeToPattern,
        subscribeToAnomalies,
        subscribeToAll,
        sendMessage,
        error,
        reconnect,
        disconnect
    };
}
//# sourceMappingURL=useRealTime.js.map