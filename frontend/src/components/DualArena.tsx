import React, { useEffect, useState } from 'react';
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
  const [camError, setCamError] = useState<string | null>(null);
  
  const { localVideoRef, remoteVideoRef, initializeMedia } = useQuickDraw({
    onRoundStart: () => console.log("Round Started!"),
    onRoundEnd: () => console.log("Round Ended!"),
    onConnectionLost: () => alert("Partner disconnected!")
  });

  // Ask for camera permissions as soon as the match arena loads
  useEffect(() => {
    initializeMedia().catch(err => {
      console.error(err);
      setCamError("Camera permission denied or unavailable.");
    });
  }, [initializeMedia]);

  return (
    <div className="saloon-container bg-wood-pattern min-h-screen p-8 flex flex-col">
      {/* Scoreboard and round indicator */}
      <Scoreboard 
        roundNumber={roundNumber} 
        playerScore={playerScore} 
        opponentScore={opponentScore} 
      />  

      {/* Prompt (“Make sign: B”) and countdown */}
      <div className="match-status text-center my-8 flex-grow flex flex-col justify-center">
        {countdown !== null && countdown > 0 ? (
          <h2 className="text-6xl text-red-600 font-bold drop-shadow-md">HIGH NOON IN: {countdown}</h2>
        ) : targetSign ? (
          <div className="wanted-poster bg-yellow-100 border-4 border-yellow-800 inline-block p-6 mx-auto">
            <h2 className="text-3xl text-black font-serif">WANTED</h2>
            <h1 className="text-8xl font-bold mt-2 text-black">SIGN: {targetSign}</h1>
            <p className="text-xl text-red-600 font-bold animate-pulse mt-4">DRAW!</p>
          </div>
        ) : (
          <h2 className="text-4xl text-white drop-shadow-md">Waitin' for the next round...</h2>
        )}
      </div>

      {/* Two video elements side by side (self vs opponent) */}
      <div className="flex flex-row justify-center gap-8 mt-auto mb-4">
        <div className="video-container relative border-8 border-yellow-900 rounded-md bg-black shadow-2xl w-96 h-72 flex items-center justify-center">
          <span className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 text-xl font-bold rounded z-10">
            You
          </span>
          {camError && <p className="text-red-500 font-mono text-center px-4 z-10">{camError}</p>}
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" />
        </div>

        <div className="video-container relative border-8 border-yellow-900 rounded-md bg-black shadow-2xl w-96 h-72 flex items-center justify-center">
          <span className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 text-xl font-bold rounded z-10">
            Partner's Feed
          </span>
          <p className="text-gray-500 font-mono z-0">Waitin' on partner...</p>
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover z-10" />
        </div>
      </div>
    </div>
  );
};

export default DuelArena;