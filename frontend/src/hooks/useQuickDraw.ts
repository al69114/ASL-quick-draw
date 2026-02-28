import { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";

interface QuickDrawCallbacks {
    onRoundStart?: () => void;
    onRoundEnd?: () => void;
    onMatchEnd?: () => void;
    onConnectionLost?: () => void;
}

export const useQuickDraw = (
    socket: Socket | null,
    callbacks?: QuickDrawCallbacks,
) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);

    // Ref so callbacks never cause useCallbacks to get new references
    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    // Sync streams to video elements whenever they change — avoids the race
    // where getUserMedia resolves before the DOM ref is attached
    useEffect(() => {
        if (localVideoRef.current)
            localVideoRef.current.srcObject = localStream;
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current)
            remoteVideoRef.current.srcObject = remoteStream;
    }, [remoteStream]);

    // Clean up peer connection and local tracks on unmount
    useEffect(() => {
        return () => {
            peerConnection.current?.close();
            peerConnection.current = null;
            localStream?.getTracks().forEach((t) => t.stop());
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const initializeMedia = useCallback(async () => {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error(
                    "Camera unavailable: page must be served over HTTPS or localhost.",
                );
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
            });
            setLocalStream(stream);
            return stream;
        } catch (err) {
            console.error("Failed to get local media", err);
        }
    }, []);

    const setupPeerConnection = useCallback(
        (roomId: string, stream: MediaStream) => {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            });
            peerConnection.current = pc;

            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
            };

            pc.onicecandidate = (event) => {
                if (event.candidate && socket) {
                    socket.emit("webrtc_ice_candidate", {
                        room_id: roomId,
                        candidate: event.candidate,
                    });
                }
            };

            pc.onconnectionstatechange = () => {
                // 'disconnected' is transient and may recover — only treat 'failed' as fatal
                if (pc.connectionState === "failed") {
                    callbacksRef.current?.onConnectionLost?.();
                }
            };

            return pc;
        },
        [socket],
    );

    const createOffer = useCallback(
        async (roomId: string) => {
            if (!peerConnection.current || !socket) return;
            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);
            socket.emit("webrtc_offer", { room_id: roomId, offer });
        },
        [socket],
    );

    const drainIceCandidateBuffer = useCallback(async () => {
        const pc = peerConnection.current;
        if (!pc) return;
        for (const candidate of iceCandidateBuffer.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        iceCandidateBuffer.current = [];
    }, []);

    const handleOffer = useCallback(
        async (roomId: string, offer: RTCSessionDescriptionInit) => {
            if (!peerConnection.current || !socket) return;
            await peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(offer),
            );
            await drainIceCandidateBuffer();
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            socket.emit("webrtc_answer", { room_id: roomId, answer });
        },
        [socket, drainIceCandidateBuffer],
    );

    const handleAnswer = useCallback(
        async (answer: RTCSessionDescriptionInit) => {
            if (!peerConnection.current) return;
            await peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(answer),
            );
            await drainIceCandidateBuffer();
        },
        [drainIceCandidateBuffer],
    );

    const handleIceCandidate = useCallback(
        async (candidate: RTCIceCandidateInit) => {
            const pc = peerConnection.current;
            if (!pc || !pc.remoteDescription) {
                // Buffer until remote description is set
                iceCandidateBuffer.current.push(candidate);
                return;
            }
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        },
        [],
    );

    return {
        localVideoRef,
        remoteVideoRef,
        localStream,
        remoteStream,
        initializeMedia,
        setupPeerConnection,
        createOffer,
        handleOffer,
        handleAnswer,
        handleIceCandidate,
    };
};
