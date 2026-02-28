import React, { useState } from 'react';
import DuelArena from './DualArena';

interface MatchPageProps {
  onMatchEnd: (won: boolean) => void;
}

export const MatchPage: React.FC<MatchPageProps> = ({ onMatchEnd }) => {
  // These states will eventually be driven by Teammate 2's WebSocket hook
  const [roundNumber, setRoundNumber] = useState(1);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(5);
  const [targetSign, setTargetSign] = useState<string | null>(null);

  // Simulating a mock match flow for testing UI
  // Remove this when hooking up to WebSockets
  React.useEffect(() => {
    if (countdown === 0) {
      setTargetSign('B');
      // Simulate someone winning the round
      setTimeout(() => {
        setPlayerScore(prev => {
          const newScore = prev + 1;
          if (newScore >= 3) onMatchEnd(true);
          return newScore;
        });
        setCountdown(5); // Next round
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
        matchId="mock-room-123"
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