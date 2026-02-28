import { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";

interface QuickDrawCallbacks {
    onRoundStart?: () => void;
    onRoundEnd?: () => void;
    onMatchEnd?: () => void;
    onConnectionLost?: () => void;
}

// Lower resolution keeps per-frame size small while still being readable for ASL.
const FRAME_INTERVAL_MS = 100; // 10 fps
const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 240;
const JPEG_QUALITY = 0.5;

export const useQuickDraw = (
    socket: Socket | null,
    callbacks?: QuickDrawCallbacks,
) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    // Opponent frames arrive as JPEG data-URLs and are painted into an <img>.
    const remoteImgRef = useRef<HTMLImageElement>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Reuse one off-screen canvas across frames to avoid repeated allocation.
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Keep socket in a ref so callbacks always access the latest value without
    // becoming new function references that trigger unnecessary re-renders.
    const socketRef = useRef(socket);
    useEffect(() => {
        socketRef.current = socket;
    }, [socket]);

    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    // Sync local camera stream to the video element.
    useEffect(() => {
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    }, [localStream]);

    // Paint incoming opponent frames into the <img> element.
    useEffect(() => {
        if (!socket) return;
        const handleFrame = ({ frame }: { frame: string }) => {
            if (remoteImgRef.current) remoteImgRef.current.src = frame;
        };
        socket.on("video_frame", handleFrame);
        return () => {
            socket.off("video_frame", handleFrame);
        };
    }, [socket]);

    // Stop streaming and release the camera on unmount.
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
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
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 },
                },
                audio: false,
            });
            setLocalStream(stream);
            return stream;
        } catch (err) {
            console.error("Failed to get local media", err);
        }
    }, []);

    // Begin capturing and sending frames to the server, which relays them to
    // the opponent. Call stopFrameStream() to tear this down.
    const startFrameStream = useCallback((roomId: string) => {
        if (!canvasRef.current) {
            canvasRef.current = document.createElement("canvas");
            canvasRef.current.width = FRAME_WIDTH;
            canvasRef.current.height = FRAME_HEIGHT;
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d")!;

        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            const video = localVideoRef.current;
            const sock = socketRef.current;
            // readyState >= 2 (HAVE_CURRENT_DATA) means there's a frame to draw.
            if (!video || !sock || video.readyState < 2) return;
            ctx.drawImage(video, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
            const frame = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
            sock.emit("video_frame", { room_id: roomId, frame });
        }, FRAME_INTERVAL_MS);
    }, []);

    const stopFrameStream = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    return {
        localVideoRef,
        remoteImgRef,
        localStream,
        initializeMedia,
        startFrameStream,
        stopFrameStream,
    };
};