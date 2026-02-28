import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const BACKEND_URL = 'http://localhost:8000';
const STABLE_FRAMES_NEEDED = 10;   // ~170ms at 60fps of stillness before translating
const MOVE_THRESHOLD = 0.018;      // max landmark movement in normalized coords (0–1)
const TRANSLATE_COOLDOWN_MS = 2000; // min ms between back-to-back translations

type DetectionState = 'idle' | 'signing' | 'translating';
type Landmark = { x: number; y: number; z: number };

interface TranslationPageProps {
  onBack: () => void;
}

const TranslationPage: React.FC<TranslationPageProps> = ({ onBack }) => {
  // DOM
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // MediaPipe
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const prevLandmarksRef = useRef<Landmark[] | null>(null);
  const stableCountRef = useRef(0);

  // Socket
  const socketRef = useRef<Socket | null>(null);

  // Sync flags (refs, not state — readable inside rAF without stale closures)
  const isActiveRef = useRef(false);
  const isTranslatingRef = useRef(false);
  const lastTranslateTimeRef = useRef(0);
  const detectionStateRef = useRef<DetectionState>('idle');
  const signHistoryRef = useRef<string[]>([]); // mirrors signHistory state for rAF loop

  // Settings
  const settingsRef = useRef({
    voices: [] as SpeechSynthesisVoice[],
    voiceIndex: 0,
    rate: 1.0,
    pitch: 1.0,
    autoSpeak: true,
  });

  // UI state
  const [isActive, setIsActive] = useState(false);
  const [mpReady, setMpReady] = useState(false);
  const [mpLoading, setMpLoading] = useState(false);
  const [detectionState, setDetectionState] = useState<DetectionState>('idle');
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Translation state
  const [signHistory, setSignHistory] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [lastSign, setLastSign] = useState('');
  const [lastConfidence, setLastConfidence] = useState(0);

  // Voice settings
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [autoSpeak, setAutoSpeak] = useState(true);

  useEffect(() => {
    settingsRef.current = { voices, voiceIndex: selectedVoiceIndex, rate, pitch, autoSpeak };
  }, [voices, selectedVoiceIndex, rate, pitch, autoSpeak]);

  // TTS voices
  useEffect(() => {
    const load = () => { const v = speechSynthesis.getVoices(); if (v.length) setVoices(v); };
    load();
    speechSynthesis.onvoiceschanged = load;
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speak = useCallback((text: string) => {
    if (!text) return;
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const { voices: v, voiceIndex, rate: r, pitch: p } = settingsRef.current;
    if (v[voiceIndex]) utt.voice = v[voiceIndex];
    utt.rate = r;
    utt.pitch = p;
    speechSynthesis.speak(utt);
  }, []);

  // Load MediaPipe HandLandmarker on mount
  useEffect(() => {
    let cancelled = false;
    setMpLoading(true);
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
        );
        const hl = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        if (!cancelled) {
          handLandmarkerRef.current = hl;
          setMpReady(true);
          setMpLoading(false);
        }
      } catch (err) {
        console.error('MediaPipe init failed:', err);
        if (!cancelled) setMpLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Capture current video frame and emit to backend
  const sendFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = 320;
    canvas.height = 240;
    canvas.getContext('2d')?.drawImage(video, 0, 0, 320, 240);
    const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
    socketRef.current?.emit('translate_sign', {
      image: base64,
      sign_history: signHistoryRef.current,
    });
  }, []);

  // Only set detection state when it actually changes (avoids excessive renders from rAF)
  const updateDetState = useCallback((next: DetectionState) => {
    if (detectionStateRef.current !== next) {
      detectionStateRef.current = next;
      setDetectionState(next);
    }
  }, []);

  // rAF detection loop: runs every frame, uses refs exclusively (no stale closures)
  const detect = useCallback(() => {
    if (!isActiveRef.current) return;

    const video = videoRef.current;
    const hl = handLandmarkerRef.current;
    if (!video || !hl || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detect);
      return;
    }

    const results = hl.detectForVideo(video, performance.now());

    if (results.landmarks.length === 0) {
      // No hand in frame — reset stability
      prevLandmarksRef.current = null;
      stableCountRef.current = 0;
      if (!isTranslatingRef.current) updateDetState('idle');
    } else {
      const lm = results.landmarks[0]; // first detected hand

      if (!isTranslatingRef.current) {
        if (prevLandmarksRef.current) {
          // Measure max landmark displacement since last frame
          let maxMove = 0;
          for (let i = 0; i < lm.length; i++) {
            const dx = lm[i].x - prevLandmarksRef.current[i].x;
            const dy = lm[i].y - prevLandmarksRef.current[i].y;
            maxMove = Math.max(maxMove, Math.sqrt(dx * dx + dy * dy));
          }

          if (maxMove > MOVE_THRESHOLD) {
            // Hand is moving
            stableCountRef.current = 0;
            updateDetState('signing');
          } else {
            // Hand is stable
            stableCountRef.current++;
            if (stableCountRef.current >= STABLE_FRAMES_NEEDED) {
              const now = Date.now();
              if (now - lastTranslateTimeRef.current > TRANSLATE_COOLDOWN_MS) {
                // Trigger translation
                isTranslatingRef.current = true;
                stableCountRef.current = 0;
                lastTranslateTimeRef.current = now;
                updateDetState('translating');
                sendFrame();
              }
            } else {
              updateDetState('signing');
            }
          }
        } else {
          // First frame with a hand
          updateDetState('signing');
        }
      }

      // Store landmarks for next frame comparison
      prevLandmarksRef.current = lm.map(p => ({ x: p.x, y: p.y, z: p.z }));
    }

    animFrameRef.current = requestAnimationFrame(detect);
  }, [sendFrame, updateDetState]);

  // Socket setup
  useEffect(() => {
    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    socket.on('connect', () => setSocketStatus('connected'));
    socket.on('disconnect', () => setSocketStatus('disconnected'));

    socket.on('translation_result', (data: {
      sign: string;
      confidence: number;
      current_word: string;
      translation: string;
    }) => {
      // Reset so next sign can be detected; clear prev landmarks to force re-stabilization
      isTranslatingRef.current = false;
      stableCountRef.current = 0;
      prevLandmarksRef.current = null;

      if (!isActiveRef.current || !data.sign || data.sign === 'NONE') return;

      const newHistory = [...signHistoryRef.current, data.sign];
      signHistoryRef.current = newHistory;

      setSignHistory(newHistory);
      setLastSign(data.sign);
      setLastConfidence(data.confidence);
      setCurrentWord(data.current_word || '');
      setTranslation(data.translation || '');

      if (settingsRef.current.autoSpeak && data.translation) {
        speak(data.translation);
      }
    });

    socket.on('translation_error', () => {
      isTranslatingRef.current = false;
      stableCountRef.current = 0;
      prevLandmarksRef.current = null;
    });

    return () => { socket.disconnect(); };
  }, [speak]);

  const startCamera = async () => {
    if (!mpReady) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      if (video.readyState < 2) {
        await new Promise<void>(res => { video.onloadeddata = () => res(); });
      }

      // Reset all sync refs
      isActiveRef.current = true;
      signHistoryRef.current = [];
      stableCountRef.current = 0;
      isTranslatingRef.current = false;
      prevLandmarksRef.current = null;
      detectionStateRef.current = 'idle';
      lastTranslateTimeRef.current = 0;

      // Reset UI state
      setIsActive(true);
      setSignHistory([]);
      setCurrentWord('');
      setTranslation('');
      setLastSign('');
      setLastConfidence(0);
      setDetectionState('idle');

      animFrameRef.current = requestAnimationFrame(detect);
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const stopCamera = useCallback(() => {
    isActiveRef.current = false;
    isTranslatingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setDetectionState('idle');
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleClear = () => {
    signHistoryRef.current = [];
    setSignHistory([]);
    setCurrentWord('');
    setTranslation('');
    setLastSign('');
    setLastConfidence(0);
    speechSynthesis.cancel();
  };

  const historyDisplay = signHistory.join(' - ');

  const stateLabel = {
    idle:        { text: 'Show a hand sign',  color: 'text-gray-500' },
    signing:     { text: 'Hold still...',     color: 'text-yellow-400 animate-pulse' },
    translating: { text: 'Translating...',    color: 'text-green-400 animate-pulse' },
  }[detectionState];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-amber-900 p-4">
      <div className="max-w-3xl w-full border-8 border-yellow-800 bg-black bg-opacity-75 rounded-xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-800">
          <button onClick={onBack} className="text-yellow-600 hover:text-yellow-400 font-mono text-sm underline">
            ← Back
          </button>
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-2xl font-serif text-yellow-500 tracking-widest uppercase">ASL Translation</h2>
            <span className={`text-xs font-mono ${
              socketStatus === 'connected'    ? 'text-green-500' :
              socketStatus === 'disconnected' ? 'text-red-500'   : 'text-yellow-600'
            }`}>● {socketStatus}</span>
          </div>
          <button
            onClick={isActive ? stopCamera : startCamera}
            disabled={!mpReady && !isActive}
            className={`font-bold py-2 px-4 rounded border-2 text-sm font-mono transition-all disabled:opacity-40 ${
              isActive
                ? 'border-red-700 text-red-400 hover:bg-red-900 hover:bg-opacity-30'
                : 'border-yellow-700 text-yellow-400 hover:bg-yellow-900 hover:bg-opacity-30'
            }`}
          >
            {isActive ? '⏹ Stop' : mpLoading ? 'Loading...' : '▶ Start Camera'}
          </button>
        </div>

        {/* Camera feed */}
        <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
          <video ref={videoRef} autoPlay playsInline muted
            className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
          <canvas ref={canvasRef} className="hidden" />

          {!isActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              {mpLoading ? (
                <p className="text-yellow-600 font-mono animate-pulse">Loading hand detection model...</p>
              ) : (
                <>
                  <p className="text-gray-500 font-mono">Camera is off</p>
                  <button onClick={startCamera} disabled={!mpReady}
                    className="bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white font-bold py-3 px-6 border-2 border-yellow-900 rounded transition-all hover:scale-105">
                    ▶ Start Camera
                  </button>
                </>
              )}
            </div>
          )}

          {/* Detection state overlay */}
          {isActive && (
            <div className="absolute top-3 left-3 bg-black bg-opacity-70 rounded px-3 py-2 space-y-1 max-w-xs">
              <p className={`text-sm font-mono ${stateLabel.color}`}>{stateLabel.text}</p>
              {lastSign && (
                <p className="text-yellow-300 font-mono text-xs">
                  Last: <span className="font-bold text-white">{lastSign}</span>
                  <span className="text-gray-400 ml-2">({Math.round(lastConfidence * 100)}%)</span>
                </p>
              )}
              {historyDisplay && (
                <p className="text-green-400 font-mono text-xs">Building: {historyDisplay}</p>
              )}
            </div>
          )}
        </div>

        {/* Translation result */}
        <div className="px-6 py-4 border-b border-yellow-900">
          <div className="bg-gray-900 border border-yellow-900 rounded-lg p-4 min-h-[80px] flex flex-col justify-between">
            {translation ? (
              <>
                <p className="text-white text-xl font-mono leading-relaxed">{translation}</p>
                {currentWord && currentWord.toLowerCase() !== translation.toLowerCase() && (
                  <p className="text-gray-500 font-mono text-xs mt-2">
                    Spelling: <span className="text-yellow-600">{currentWord}</span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-600 font-mono text-sm self-center">
                {isActive ? 'Hold a sign still to translate...' : 'Start camera to begin'}
              </p>
            )}
          </div>
          <div className="flex gap-3 mt-3">
            <button onClick={() => speak(translation)} disabled={!translation}
              className="text-yellow-600 hover:text-yellow-400 disabled:text-gray-700 text-xs font-mono border border-yellow-800 disabled:border-gray-800 rounded px-3 py-1.5 transition-colors">
              🔊 Speak
            </button>
            <button onClick={() => translation && navigator.clipboard.writeText(translation)} disabled={!translation}
              className="text-blue-500 hover:text-blue-300 disabled:text-gray-700 text-xs font-mono border border-blue-900 disabled:border-gray-800 rounded px-3 py-1.5 transition-colors">
              📋 Copy
            </button>
            <button onClick={handleClear}
              className="text-gray-500 hover:text-gray-300 text-xs font-mono border border-gray-700 rounded px-3 py-1.5 transition-colors ml-auto">
              Clear
            </button>
          </div>
        </div>

        {/* Voice controls */}
        <div className="p-5 grid gap-4">
          <h3 className="text-yellow-700 font-mono text-xs uppercase tracking-widest">Voice Settings</h3>
          <div className="flex items-center gap-3">
            <label className="text-gray-400 font-mono text-xs w-14 shrink-0">Voice</label>
            <select value={selectedVoiceIndex} onChange={e => setSelectedVoiceIndex(Number(e.target.value))}
              className="flex-1 bg-gray-900 text-gray-200 border border-yellow-900 rounded px-2 py-1 text-xs font-mono">
              {voices.map((v, i) => <option key={i} value={i}>{v.name} ({v.lang})</option>)}
              {voices.length === 0 && <option>Loading voices...</option>}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-gray-400 font-mono text-xs w-14 shrink-0">Speed</label>
            <input type="range" min="0.5" max="2" step="0.1" value={rate}
              onChange={e => setRate(Number(e.target.value))} className="flex-1 accent-yellow-500" />
            <span className="text-gray-400 font-mono text-xs w-8">{rate.toFixed(1)}x</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-gray-400 font-mono text-xs w-14 shrink-0">Pitch</label>
            <input type="range" min="0.5" max="2" step="0.1" value={pitch}
              onChange={e => setPitch(Number(e.target.value))} className="flex-1 accent-yellow-500" />
            <span className="text-gray-400 font-mono text-xs w-8">{pitch.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-gray-400 font-mono text-xs w-14 shrink-0">Auto-speak</label>
            <button onClick={() => setAutoSpeak(p => !p)}
              className={`px-3 py-1 rounded border text-xs font-mono transition-all ${
                autoSpeak ? 'border-yellow-600 text-yellow-400 bg-yellow-900 bg-opacity-30' : 'border-gray-700 text-gray-500'
              }`}>
              {autoSpeak ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TranslationPage;
