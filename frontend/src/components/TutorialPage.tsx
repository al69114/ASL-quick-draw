import React, { useState, useEffect, useRef } from 'react';
import { useDuelSocket } from '../hooks/useDuelSocket';

interface TutorialPageProps {
  onBack: () => void;
}

interface ClassificationResult {
  matches: boolean;
  detected_sign: string;
  confidence: number;
}

// J and Z require motion so they're excluded from static-sign practice
const PRACTICE_LETTERS = 'ABCDEFGHIKLMNOPQRSTUVWXY'.split('');

export const TutorialPage: React.FC<TutorialPageProps> = ({ onBack }) => {
  const [currentLetterIdx, setCurrentLetterIdx] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { socket, connect } = useDuelSocket();

  const currentLetter = PRACTICE_LETTERS[currentLetterIdx];

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        setCameraError('Camera access denied. Please allow camera access to use the practice range.');
      }
    };
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Connect socket and listen for tutorial events
  useEffect(() => {
    connect();

    const handleTutorialResult = (data: ClassificationResult) => {
      setResult(data);
      setIsAnalyzing(false);
      setSessionStats(prev => ({
        correct: prev.correct + (data.matches ? 1 : 0),
        total: prev.total + 1,
      }));
    };

    const handleTutorialError = (data: { error: string }) => {
      setError(data.error);
      setIsAnalyzing(false);
    };

    socket.on('tutorial_result', handleTutorialResult);
    socket.on('tutorial_error', handleTutorialError);

    return () => {
      socket.off('tutorial_result', handleTutorialResult);
      socket.off('tutorial_error', handleTutorialError);
    };
  }, [socket, connect]);

  const captureAndClassify = () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw raw (unmirrored) frame for accurate classification
    ctx.drawImage(video, 0, 0);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    socket.emit('tutorial_classify', {
      image: imageDataUrl,
      target_sign: currentLetter,
    });
  };

  const changeLetter = (newIdx: number) => {
    setCurrentLetterIdx(newIdx);
    setResult(null);
    setError(null);
  };

  const goToPrev = () => changeLetter((currentLetterIdx - 1 + PRACTICE_LETTERS.length) % PRACTICE_LETTERS.length);
  const goToNext = () => changeLetter((currentLetterIdx + 1) % PRACTICE_LETTERS.length);
  const goToRandom = () => changeLetter(Math.floor(Math.random() * PRACTICE_LETTERS.length));

  const accuracy = sessionStats.total > 0
    ? Math.round((sessionStats.correct / sessionStats.total) * 100)
    : null;

  return (
    <div className="min-h-screen bg-stone-900 bg-wood-pattern p-4 flex flex-col items-center">
      <div className="max-w-5xl w-full relative bg-black bg-opacity-80 p-8 border-8 border-yellow-900 rounded-xl shadow-2xl mt-4">

        {/* Header */}
        <button
          onClick={onBack}
          className="absolute left-6 top-6 text-yellow-500 hover:text-white font-mono border-2 border-yellow-700 bg-black bg-opacity-50 px-4 py-2 rounded transition-colors"
        >
          ← Back to Saloon
        </button>

        <h1 className="text-5xl font-serif text-yellow-500 tracking-widest uppercase text-center mb-1 mt-8">
          Practice Range
        </h1>
        <p className="text-center text-gray-400 font-mono mb-4 tracking-widest text-sm">
          (SOLO TRAINING — NO OPPONENT NEEDED)
        </p>

        {/* Session stats */}
        <div className="text-center mb-6 font-mono text-gray-300 text-sm">
          Session:{' '}
          <span className="text-green-400 font-bold">{sessionStats.correct}</span>
          {' / '}
          {sessionStats.total} correct
          {accuracy !== null && (
            <span className="ml-3 text-yellow-400">({accuracy}% accuracy)</span>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">

          {/* ── Camera + Result ── */}
          <div className="flex flex-col items-center gap-4 flex-1 w-full">

            {/* Camera feed */}
            <div className="relative w-full max-w-md border-4 border-yellow-800 rounded-lg overflow-hidden bg-stone-900 aspect-video">
              {cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center text-red-400 text-center p-4 font-mono text-sm">
                  {cameraError}
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              )}
              {isAnalyzing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Hidden canvas for snapshot capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* ASL reference image — shown below camera when answer is wrong */}
            {result && !result.matches && (
              <div className="w-full max-w-md bg-black bg-opacity-60 border-4 border-yellow-800 rounded-lg p-4 flex flex-col items-center gap-2">
                <div className="text-yellow-500 font-mono text-xs uppercase tracking-widest">
                  ◆ Reference Sign for <strong className="text-white text-sm">{currentLetter}</strong> ◆
                </div>
                <img
                  src={`https://www.lifeprint.com/asl101/fingerspelling/abc-gifs/${currentLetter.toLowerCase()}.gif`}
                  alt={`ASL sign for letter ${currentLetter}`}
                  className="w-40 h-40 object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).replaceWith(
                      Object.assign(document.createElement('p'), {
                        className: 'text-gray-500 text-xs font-mono py-4',
                        textContent: 'Reference image unavailable',
                      })
                    );
                  }}
                />
                <div className="text-gray-400 font-mono text-xs">
                  Try matching this hand position
                </div>
              </div>
            )}

            {/* Check button */}
            <button
              onClick={captureAndClassify}
              disabled={isAnalyzing || !!cameraError}
              className="w-full max-w-md bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-2xl font-bold py-4 px-8 border-4 border-red-900 rounded shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all hover:scale-105 disabled:hover:scale-100"
            >
              {isAnalyzing ? '⏳ Analyzing...' : '🤠 Check My Sign'}
            </button>

            {/* Classification result */}
            {result && (
              <div className={`w-full max-w-md p-5 rounded-lg border-4 font-mono text-center transition-all ${
                result.matches
                  ? 'bg-green-900 bg-opacity-60 border-green-500'
                  : 'bg-red-900 bg-opacity-60 border-red-500'
              }`}>
                <div className={`text-3xl font-bold mb-2 ${result.matches ? 'text-green-300' : 'text-red-300'}`}>
                  {result.matches ? '✓ Correct!' : '✗ Not quite'}
                </div>
                <div className="text-gray-200">
                  Detected: <strong className="text-white text-xl">{result.detected_sign}</strong>
                </div>
                <div className="text-gray-400 text-sm mt-1">
                  Confidence: {Math.round(result.confidence * 100)}%
                </div>
                {!result.matches && result.detected_sign !== 'UNKNOWN' && (
                  <div className="text-yellow-400 text-sm mt-2">
                    Tip: Make sure your hand is clearly visible and well-lit.
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="w-full max-w-md p-4 rounded-lg bg-red-900 bg-opacity-60 border-2 border-red-500 text-red-300 font-mono text-center text-sm">
                Error: {error}
              </div>
            )}
          </div>

          {/* ── Target Sign Panel ── */}
          <div className="flex flex-col items-center gap-4 flex-shrink-0">

            {/* WANTED-poster style letter display */}
            <div className="bg-amber-900 border-8 border-yellow-800 rounded-lg p-6 text-center shadow-xl w-64">
              <div className="text-yellow-600 font-serif text-lg tracking-widest mb-2">◆ TARGET SIGN ◆</div>
              <div className="text-9xl font-serif text-yellow-200 leading-none py-4 drop-shadow-lg">
                {currentLetter}
              </div>
              <div className="text-yellow-700 font-mono text-xs tracking-widest">ASL LETTER</div>
            </div>

            {/* Prev / Next navigation */}
            <div className="flex gap-3 items-center">
              <button
                onClick={goToPrev}
                className="bg-stone-700 hover:bg-stone-600 text-white text-2xl font-bold w-12 h-12 border-2 border-stone-500 rounded transition-all hover:scale-110"
              >
                ‹
              </button>
              <span className="text-gray-400 font-mono text-sm w-16 text-center">
                {currentLetterIdx + 1} / {PRACTICE_LETTERS.length}
              </span>
              <button
                onClick={goToNext}
                className="bg-stone-700 hover:bg-stone-600 text-white text-2xl font-bold w-12 h-12 border-2 border-stone-500 rounded transition-all hover:scale-110"
              >
                ›
              </button>
            </div>

            <button
              onClick={goToRandom}
              className="bg-yellow-800 hover:bg-yellow-700 text-white font-bold py-2 px-6 border-2 border-yellow-900 rounded font-mono transition-all hover:scale-105"
            >
              🎲 Random Letter
            </button>

            {/* Quick-access letter grid */}
            <div className="grid grid-cols-6 gap-1 mt-2">
              {PRACTICE_LETTERS.map((letter, idx) => (
                <button
                  key={letter}
                  onClick={() => changeLetter(idx)}
                  className={`w-9 h-9 text-sm font-bold border rounded transition-all hover:scale-110 ${
                    idx === currentLetterIdx
                      ? 'bg-yellow-600 border-yellow-400 text-white shadow-[0_0_8px_rgba(202,138,4,0.6)]'
                      : 'bg-stone-700 border-stone-500 text-gray-300 hover:bg-stone-600'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>

            <p className="text-gray-600 font-mono text-xs text-center mt-1">
              * J and Z require motion<br />and are excluded
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialPage;
