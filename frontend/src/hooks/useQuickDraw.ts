import { useState, useEffect, useRef, useCallback } from 'react';

// Exposing simple callbacks/events to the rest of the app [cite: 29]
interface QuickDrawCallbacks {
  onRoundStart?: () => void;
  onRoundEnd?: () => void;
  onMatchEnd?: () => void;
  onConnectionLost?: () => void;
}

export const useQuickDraw = (callbacks?: QuickDrawCallbacks) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Use getUserMedia to capture webcam and render local video [cite: 27]
  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Failed to get local media", err);
    }
  }, []);

  // Integrate WebRTC for peer video and logic to handle offer/answer exchange [cite: 28]
  const setupPeerConnection = useCallback((signalingSocket: any, roomId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerConnection.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Show remote stream when connection established [cite: 29]
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalingSocket.emit('ice-candidate', { roomId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        callbacks?.onConnectionLost?.();
      }
    };

    return pc;
  }, [callbacks]);

  // Create/join room flow that gets a match ID (Triggered by signaling layer) [cite: 28]
  const createOffer = async (signalingSocket: any, roomId: string) => {
    if (!peerConnection.current) return;
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    signalingSocket.emit('offer', { roomId, offer });
  };

  const handleOffer = async (signalingSocket: any, roomId: string, offer: RTCSessionDescriptionInit) => {
    if (!peerConnection.current) return;
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);
    signalingSocket.emit('answer', { roomId, answer });
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnection.current) return;
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
  };

  return {
    localVideoRef,
    remoteVideoRef,
    initializeMedia,
    setupPeerConnection,
    createOffer,
    handleOffer,
    handleAnswer,
  };
};