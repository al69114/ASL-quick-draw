import React, { useCallback, useEffect, useRef, useState } from 'react';
import DuelArena from './DualArena';
import { useDuelSocket } from '../hooks/useDuelSocket';
import { useQuickDraw } from '../hooks/useQuickDraw';

import type { RoundPhase, RoundResult } from '../types/duel';
export type { RoundPhase, RoundResult };

interface MatchPageProps {
  roomId: string;
  opponentId: string;
  playerId: string;
  isInitiator: boolean;
  onMatchEnd: (won: boolean) => void;
}

// After DRAW! appears, wait this long before capturing the snapshot.
const DRAW_DELAY_MS = 3000;

export const MatchPage: React.FC<MatchPageProps> = ({
  roomId,
  opponentId,
  playerId,
  isInitiator,
  onMatchEnd,
}) => {
  const [roundPhase, setRoundPhase] = useState<RoundPhase>('waiting');
  const [targetSign, setTargetSign] = useState<string | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [isReadyPressed, setIsReadyPressed] = useState(false);

  const { socket } = useDuelSocket();
  const { localVideoRef, remoteImgRef, initializeMedia, startFrameStream, stopFrameStream, captureSnapshot } =
    useQuickDraw(socket, {
      onConnectionLost: () => alert('Partner disconnected!'),
    });

  // Refs so timer callbacks always read the latest values without stale closures.
  const targetSignRef = useRef<string | null>(null);
  targetSignRef.current = targetSign;
  const roundPhaseRef = useRef<RoundPhase>('waiting');
  roundPhaseRef.current = roundPhase;

  const drawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Camera setup — runs once on mount.
  useEffect(() => {
    let active = true;
    initializeMedia()
      .then((stream) => {
        if (!stream || !active) return;
        startFrameStream(roomId);
      })
      .catch(console.error);
    return () => {
      active = false;
      stopFrameStream();
    };
  }, [roomId, initializeMedia, startFrameStream, stopFrameStream]);

  // Show DRAW! immediately, then capture a snapshot after DRAW_DELAY_MS.
  const scheduleSnapshot = useCallback(() => {
    if (drawTimerRef.current) clearTimeout(drawTimerRef.current);
    drawTimerRef.current = setTimeout(() => {
      if (roundPhaseRef.current !== 'drawing') return;
      const snapshot = captureSnapshot();
      const sign = targetSignRef.current;
      if (snapshot && sign && socket) {
        socket.emit('draw_made', {
          image: snapshot,
          target_sign: sign,
          room_id: roomId,
          player_id: playerId,
        });
      }
      setRoundPhase('analyzing');
    }, DRAW_DELAY_MS);
  }, [captureSnapshot, roomId, playerId, socket]);

  // Socket event listeners — registered once on mount.
  useEffect(() => {
    if (!socket) return;

    const onRoundStart = (data: { round_number: number; target_sign: string }) => {
      if (drawTimerRef.current) clearTimeout(drawTimerRef.current);
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);

      setRoundNumber(data.round_number);
      setTargetSign(data.target_sign);
      setRoundResult(null);
      setIsReadyPressed(false);
      setCountdownValue(5);
      setRoundPhase('countdown');

      let tick = 5;
      const doTick = () => {
        tick -= 1;
        if (tick > 0) {
          setCountdownValue(tick);
          countdownTimerRef.current = setTimeout(doTick, 1000);
        } else {
          setCountdownValue(null);
          setRoundPhase('drawing');
          scheduleSnapshot();
        }
      };
      countdownTimerRef.current = setTimeout(doTick, 1000);
    };

    const onRoundResult = (data: {
      winner_id: string | null;
      player_results: Record<string, { matches: boolean; detected_sign: string }>;
      scores: Record<string, number>;
      is_replay: boolean;
    }) => {
      setPlayerScore(data.scores[playerId] ?? 0);
      setOpponentScore(data.scores[opponentId] ?? 0);
      setRoundResult({
        winnerId: data.winner_id,
        playerResults: data.player_results,
        scores: data.scores,
        isReplay: data.is_replay,
      });
      setRoundPhase('result');

      // --- NEW: Play the gunshot SFX if YOU won the round! ---
      if (data.winner_id === playerId) {
        const gunshot = new Audio('/gunshot.mp3');
        gunshot.volume = 0.5;
        gunshot.play().catch(err => console.error("SFX failed:", err));
      }
      // -------------------------------------------------------
    };

    const onMatchComplete = (data: { winner_id: string; final_scores: Record<string, number> }) => {
      setPlayerScore(data.final_scores[playerId] ?? 0);
      setOpponentScore(data.final_scores[opponentId] ?? 0);
      onMatchEnd(data.winner_id === playerId);
    };

    socket.on('round_start', onRoundStart);
    socket.on('round_result', onRoundResult);
    socket.on('match_complete', onMatchComplete);

    return () => {
      socket.off('round_start', onRoundStart);
      socket.off('round_result', onRoundResult);
      socket.off('match_complete', onMatchComplete);
      if (drawTimerRef.current) clearTimeout(drawTimerRef.current);
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [socket, playerId, opponentId, onMatchEnd, scheduleSnapshot]);

  const handleContinue = useCallback(() => {
    setIsReadyPressed(true);
    socket?.emit('player_ready', { room_id: roomId, player_id: playerId });
  }, [socket, roomId, playerId]);

  return (
    <div className="match-page-container">
      <DuelArena
        matchId={roomId}
        isInitiator={isInitiator}
        targetSign={targetSign}
        roundPhase={roundPhase}
        countdownValue={countdownValue}
        roundNumber={roundNumber}
        playerScore={playerScore}
        opponentScore={opponentScore}
        roundResult={roundResult}
        myPlayerId={playerId}
        isReadyPressed={isReadyPressed}
        onContinue={handleContinue}
        localVideoRef={localVideoRef}
        remoteImgRef={remoteImgRef}
      />
    </div>
  );
};

export default MatchPage;