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

export class WebRTCHandler {
  private socket: Socket;
  private localStream: MediaStream | null = null;
  private peers: Map<string, VideoPeer> = new Map();
  private config: RTCConfig;

  constructor(socket: Socket, config?: RTCConfig) {
    this.socket = socket;
    this.config = config || {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.setupSignaling();
  }

  /**
   * Setup Socket.IO signaling handlers
   */
  private setupSignaling() {
    this.socket.on('video:offer', this.handleOffer.bind(this));
    this.socket.on('video:answer', this.handleAnswer.bind(this));
    this.socket.on('video:ice-candidate', this.handleIceCandidate.bind(this));
    this.socket.on('video:peer-disconnected', this.handlePeerDisconnect.bind(this));
  }

  /**
   * Initialize local media stream
   */
  async initializeLocalStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        constraints || {
          video: { width: 1280, height: 720 },
          audio: true,
        }
      );

      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Failed to get local stream:', error);
      throw error;
    }
  }

  /**
   * Create peer connection
   */
  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.config);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('video:ice-candidate', {
          to: peerId,
          candidate: event.candidate,
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      const peer = this.peers.get(peerId);
      if (peer && event.streams[0]) {
        peer.stream = event.streams[0];
        this.notifyStreamUpdate(peerId, event.streams[0]);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerId} connection state: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(peerId);
      }
    };

    return pc;
  }

  /**
   * Create and send offer to peer
   */
  async createOffer(peerId: string, peerName: string = 'Unknown'): Promise<void> {
    try {
      const pc = this.createPeerConnection(peerId);
      
      this.peers.set(peerId, {
        id: peerId,
        connection: pc,
        stream: null,
        name: peerName,
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.socket.emit('video:offer', {
        to: peerId,
        offer: pc.localDescription,
      });
    } catch (error) {
      console.error('Failed to create offer:', error);
      this.removePeer(peerId);
    }
  }

  /**
   * Handle incoming offer
   */
  private async handleOffer(data: { from: string; offer: RTCSessionDescriptionInit; name?: string }) {
    try {
      const { from, offer, name } = data;
      const pc = this.createPeerConnection(from);

      this.peers.set(from, {
        id: from,
        connection: pc,
        stream: null,
        name: name || 'Unknown',
      });

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.socket.emit('video:answer', {
        to: from,
        answer: pc.localDescription,
      });
    } catch (error) {
      console.error('Failed to handle offer:', error);
    }
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(data: { from: string; answer: RTCSessionDescriptionInit }) {
    try {
      const { from, answer } = data;
      const peer = this.peers.get(from);

      if (peer) {
        await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Failed to handle answer:', error);
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  private async handleIceCandidate(data: { from: string; candidate: RTCIceCandidateInit }) {
    try {
      const { from, candidate } = data;
      const peer = this.peers.get(from);

      if (peer && candidate) {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

  /**
   * Handle peer disconnection
   */
  private handlePeerDisconnect(data: { peerId: string }) {
    this.removePeer(data.peerId);
  }

  /**
   * Remove peer and cleanup
   */
  private removePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connection.close();
      this.peers.delete(peerId);
      this.notifyPeerRemoved(peerId);
    }
  }

  /**
   * Stop local stream
   */
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }

  /**
   * Close all connections
   */
  closeAllConnections() {
    this.peers.forEach((peer) => {
      peer.connection.close();
    });
    this.peers.clear();
    this.stopLocalStream();
  }

  /**
   * Get all active peers
   */
  getPeers(): VideoPeer[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Callback hooks (override these in implementation)
  protected notifyStreamUpdate(peerId: string, stream: MediaStream) {
    console.log(`Stream updated for peer ${peerId}`);
  }

  protected notifyPeerRemoved(peerId: string) {
    console.log(`Peer removed: ${peerId}`);
  }
}
