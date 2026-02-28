import React, { useState } from 'react';
import DuelArena from './DualArena';

interface MatchPageProps {
  roomId: string;
  opponentId: string;
  isInitiator: boolean;
  onMatchEnd: (won: boolean) => void;
}

export const MatchPage: React.FC<MatchPageProps> = ({
  roomId,
  isInitiator,
  onMatchEnd,
}) => {
  // These states will be replaced by WebSocket events in Phase 5
  const [roundNumber, setRoundNumber] = useState(1);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore] = useState(0); // setter wired to WebSocket in Phase 5
  const [countdown, setCountdown] = useState<number | null>(5);
  const [targetSign, setTargetSign] = useState<string | null>(null);

  // Mock round flow — remove when hooking up game state events in Phase 5
  React.useEffect(() => {
    if (countdown === 0) {
      setTargetSign('B');
      setTimeout(() => {
        setPlayerScore(prev => {
          const newScore = prev + 1;
          if (newScore >= 3) onMatchEnd(true);
          return newScore;
        });
        setCountdown(5);
        setRoundNumber(prev => prev + 1);
        setTargetSign(null);
      }, 4000);
    } else if (countdown !== null) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, onMatchEnd]);

  return (
    <div className="match-page-container">
      <DuelArena
        matchId={roomId}
        isInitiator={isInitiator}
        targetSign={targetSign}
        countdown={countdown}
        roundNumber={roundNumber}
        playerScore={playerScore}
        opponentScore={opponentScore}
      />
    </div>
  );
};

export default MatchPage;