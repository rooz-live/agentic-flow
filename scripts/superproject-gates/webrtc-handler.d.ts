/**
 * WebRTC Handler for yo.life video communications
 * Handles peer-to-peer video connections via Socket.IO signaling
 */
import { Socket } from 'socket.io-client';
export interface RTCConfig {
    iceServers: RTCIceServer[];
}
export interface VideoPeer {
    id: string;
    connection: RTCPeerConnection;
    stream: MediaStream | null;
    name: string;
}
export declare class WebRTCHandler {
    private socket;
    private localStream;
    private peers;
    private config;
    constructor(socket: Socket, config?: RTCConfig);
    /**
     * Setup Socket.IO signaling handlers
     */
    private setupSignaling;
    /**
     * Initialize local media stream
     */
    initializeLocalStream(constraints?: MediaStreamConstraints): Promise<MediaStream>;
    /**
     * Create peer connection
     */
    private createPeerConnection;
    /**
     * Create and send offer to peer
     */
    createOffer(peerId: string, peerName?: string): Promise<void>;
    /**
     * Handle incoming offer
     */
    private handleOffer;
    /**
     * Handle incoming answer
     */
    private handleAnswer;
    /**
     * Handle incoming ICE candidate
     */
    private handleIceCandidate;
    /**
     * Handle peer disconnection
     */
    private handlePeerDisconnect;
    /**
     * Remove peer and cleanup
     */
    private removePeer;
    /**
     * Stop local stream
     */
    stopLocalStream(): void;
    /**
     * Close all connections
     */
    closeAllConnections(): void;
    /**
     * Get all active peers
     */
    getPeers(): VideoPeer[];
    /**
     * Get local stream
     */
    getLocalStream(): MediaStream | null;
    protected notifyStreamUpdate(peerId: string, stream: MediaStream): void;
    protected notifyPeerRemoved(peerId: string): void;
}
//# sourceMappingURL=webrtc-handler.d.ts.map