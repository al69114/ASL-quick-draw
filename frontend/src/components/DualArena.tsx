 import React from 'react';
import { useQuickDraw } from '../hooks/useQuickDraw';
import Scoreboard from './Scoreboard';

interface DuelArenaProps {
  matchId: string;
  targetSign: string | null;
  countdown: number | null;
  roundNumber: number;
  playerScore: number;
  opponentScore: number;
}

export const DuelArena: React.FC<DuelArenaProps> = ({
  matchId,
  targetSign,
  countdown,
  roundNumber,
  playerScore,
  opponentScore
}) => {
  const { localVideoRef, remoteVideoRef } = useQuickDraw({
    onRoundStart: () => console.log("Round Started!"),
    onRoundEnd: () => console.log("Round Ended!"),
    onConnectionLost: () => alert("Partner disconnected!")
  });

  return (
    <div className="saloon-container bg-wood-pattern min-h-screen p-8">
      {/* Scoreboard and round indicator  */}
      <Scoreboard 
        roundNumber={roundNumber} 
        playerScore={playerScore} 
        opponentScore={opponentScore} 
      />

      {/* Prompt (“Make sign: B”) and countdown  */}
      <div className="match-status text-center my-6">
        {countdown !== null && countdown > 0 ? (
          <h2 className="text-6xl text-red-600 font-bold drop-shadow-md">HIGH NOON IN: {countdown}</h2>
        ) : targetSign ? (
          <div className="wanted-poster bg-yellow-100 border-4 border-yellow-800 inline-block p-6">
            <h2 className="text-3xl text-black font-serif">WANTED</h2>
            <h1 className="text-8xl font-bold mt-2">SIGN: {targetSign}</h1>
            <p className="text-xl text-red-600 font-bold animate-pulse mt-4">DRAW!</p>
          </div>
        ) : (
          <h2 className="text-4xl text-white">Waitin' for the next round...</h2>
        )}
      </div>

      {/* Two video elements side by side (self vs opponent)  */}
      <div className="flex flex-row justify-center gap-8 mt-8">
        <div className="video-container relative border-8 border-yellow-900 rounded-md overflow-hidden shadow-2xl">
          <span className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 text-xl font-bold rounded">
            You
          </span>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-96 h-72 object-cover transform scale-x-[-1]" />
        </div>

        <div className="video-container relative border-8 border-yellow-900 rounded-md overflow-hidden shadow-2xl">
          <span className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 text-xl font-bold rounded">
            Partner's Feed
          </span>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-96 h-72 object-cover" />
        </div>
      </div>
    </div>
  );
};

export default DuelArena;   