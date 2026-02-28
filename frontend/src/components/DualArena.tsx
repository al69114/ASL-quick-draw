import React, { RefObject } from 'react';
import Scoreboard from './Scoreboard';
import type { RoundPhase, RoundResult } from '../types/duel';

interface DuelArenaProps {
  matchId: string;
  isInitiator: boolean;
  targetSign: string | null;
  roundPhase: RoundPhase;
  countdownValue: number | null;
  roundNumber: number;
  playerScore: number;
  opponentScore: number;
  roundResult: RoundResult | null;
  myPlayerId: string;
  isReadyPressed: boolean;
  onContinue: () => void;
  localVideoRef: RefObject<HTMLVideoElement>;
  remoteImgRef: RefObject<HTMLImageElement>;
}

export const DualArena: React.FC<DuelArenaProps> = ({
  matchId: _matchId,
  isInitiator: _isInitiator,
  targetSign,
  roundPhase,
  countdownValue,
  roundNumber,
  playerScore,
  opponentScore,
  roundResult,
  myPlayerId,
  isReadyPressed,
  onContinue,
  localVideoRef,
  remoteImgRef,
}) => {
  const renderStatus = () => {
    switch (roundPhase) {
      case 'countdown':
        return (
          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl text-yellow-300 font-bold">Get ready...</p>
            <span className="text-9xl font-bold text-white drop-shadow-2xl">
              {countdownValue}
            </span>
          </div>
        );

      case 'drawing':
        return targetSign ? (
          <div className="wanted-poster bg-yellow-100 border-4 border-yellow-800 inline-block p-6 mx-auto">
            <h2 className="text-3xl text-black font-serif">WANTED</h2>
            <h1 className="text-8xl font-bold mt-2 text-black">SIGN: {targetSign}</h1>
            <p className="text-xl text-red-600 font-bold animate-pulse mt-4">DRAW!</p>
          </div>
        ) : null;

      case 'analyzing':
        return (
          <h2 className="text-4xl text-yellow-300 drop-shadow-md animate-pulse">
            Analyzin' your draw...
          </h2>
        );

      case 'result':
        return renderRoundResult();

      default:
        return (
          <h2 className="text-4xl text-white drop-shadow-md">
            Waitin' for the next round...
          </h2>
        );
    }
  };

  const renderRoundResult = () => {
    if (!roundResult) return null;

    const myResult = roundResult.playerResults[myPlayerId];
    let headline: string;
    let headlineColor: string;

    if (roundResult.isReplay) {
      headline = roundResult.winnerId === null
        ? 'Both missed — replay!'
        : 'Too close to call — replay!';
      headlineColor = 'text-yellow-400';
    } else if (roundResult.winnerId === myPlayerId) {
      headline = 'You win this round!';
      headlineColor = 'text-green-400';
    } else if (roundResult.winnerId === null) {
      // Both correct, both got a point
      headline = 'Both got it — point each!';
      headlineColor = 'text-blue-400';
    } else {
      headline = 'Opponent wins this round';
      headlineColor = 'text-red-400';
    }

    return (
      <div className="flex flex-col items-center gap-4">
        <h2 className={`text-5xl font-bold drop-shadow-md ${headlineColor}`}>{headline}</h2>
        {myResult && (
          <p className="text-xl text-gray-200">
            You showed: <span className="font-bold text-white">{myResult.detected_sign}</span>
            {' '}({myResult.matches ? '✓ correct' : '✗ wrong'})
          </p>
        )}
        {isReadyPressed ? (
          <p className="text-lg text-gray-400 mt-2">Waitin' on partner...</p>
        ) : (
          <button
            onClick={onContinue}
            className="mt-4 px-10 py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-2xl rounded-lg shadow-lg transition-colors"
          >
            Continue
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="saloon-container bg-wood-pattern min-h-screen p-8 flex flex-col">
      {/* Scoreboard and round indicator */}
      <Scoreboard
        roundNumber={roundNumber}
        playerScore={playerScore}
        opponentScore={opponentScore}
      />

      {/* Main status area */}
      <div className="match-status text-center my-8 flex-grow flex flex-col justify-center">
        {renderStatus()}
      </div>

      {/* Two feeds side by side: local camera (video) and opponent (img) */}
      <div className="flex flex-row justify-center gap-8 mt-auto mb-4">
        <div className="video-container relative border-8 border-yellow-900 rounded-md bg-black shadow-2xl w-96 h-72 flex items-center justify-center">
          <span className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 text-xl font-bold rounded z-10">
            You
          </span>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
          />
        </div>

        <div className="video-container relative border-8 border-yellow-900 rounded-md bg-black shadow-2xl w-96 h-72 flex items-center justify-center">
          <span className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 text-xl font-bold rounded z-10">
            Partner's Feed
          </span>
          <p className="text-gray-500 font-mono z-0">Waitin' on partner...</p>
          <img
            ref={remoteImgRef}
            alt="Partner's feed"
            className="absolute inset-0 w-full h-full object-cover z-10"
          />
        </div>
      </div>
    </div>
  );
};

export default DualArena;
