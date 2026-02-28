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
  frozenFrame: string | null;
  frozenOpponentFrame: string | null;
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
  frozenFrame,
  frozenOpponentFrame,
}) => {
  // Scoring indicators — only shown when result is final (not a replay)
  const playerScored =
    roundPhase === 'result' &&
    roundResult !== null &&
    !roundResult.isReplay &&
    (roundResult.winnerId === myPlayerId || roundResult.winnerId === null);
  const opponentScored =
    roundPhase === 'result' &&
    roundResult !== null &&
    !roundResult.isReplay &&
    (roundResult.winnerId !== myPlayerId || roundResult.winnerId === null);

  const renderStatus = () => {
    switch (roundPhase) {
      case 'countdown':
        return (
          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl text-yellow-300 font-bold">Draw's comin'...</p>
            <span className="text-9xl font-bold text-white drop-shadow-2xl">
              {countdownValue}
            </span>
          </div>
        );

      case 'drawing':
        return targetSign ? (
          <div className="wanted-poster bg-yellow-100 border-4 border-yellow-800 inline-block p-6 mx-auto">
            <h2 className="text-3xl text-black font-serif">WANTED</h2>
            <h1 className="text-6xl font-bold mt-2 text-black">SIGN: {targetSign}</h1>
            <p className="text-xl text-red-600 font-bold animate-pulse mt-4">DRAW!</p>
          </div>
        ) : null;

      case 'analyzing':
        return (
          <h2 className="text-4xl text-yellow-300 drop-shadow-md animate-pulse">
            The sheriff's decidin'...
          </h2>
        );

      case 'result':
        return renderRoundResult();

      default:
        return (
          <h2 className="text-4xl text-white drop-shadow-md">
            Holdin' at the saloon...
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
      headline =
        roundResult.winnerId === null
          ? 'Both outlaws missed — draw again!'
          : 'Too close to judge — draw again!';
      headlineColor = 'text-yellow-400';
    } else if (roundResult.winnerId === myPlayerId) {
      headline = 'Quick draw! Round\'s yours!';
      headlineColor = 'text-green-400';
    } else if (roundResult.winnerId === null) {
      headline = 'Both outlaws drew true!';
      headlineColor = 'text-blue-400';
    } else {
      headline = 'Outgunned this round!';
      headlineColor = 'text-red-400';
    }

    return (
      <div className="flex flex-col items-center gap-4">
        <h2 className={`text-5xl font-bold drop-shadow-md ${headlineColor}`}>{headline}</h2>
        {myResult && (
          <p className="text-xl text-gray-200">
            Your draw: <span className="font-bold text-white">{myResult.detected_sign}</span>
            {' '}({myResult.matches ? '✓ hit' : '✗ missed'})
          </p>
        )}
        {isReadyPressed ? (
          <p className="text-lg text-gray-400 mt-2">Waitin' on the other outlaw...</p>
        ) : (
          <button
            onClick={onContinue}
            className="mt-4 px-10 py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-2xl rounded-lg shadow-lg transition-colors font-serif tracking-wide"
          >
            Ride On
          </button>
        )}
      </div>
    );
  };

  const localBorderClass = playerScored
    ? 'border-yellow-400 ring-4 ring-yellow-400 shadow-yellow-400/60 shadow-lg'
    : 'border-yellow-900';
  const opponentBorderClass = opponentScored
    ? 'border-red-500 ring-4 ring-red-500 shadow-red-500/60 shadow-lg'
    : 'border-yellow-900';

  return (
    // h-screen + overflow-hidden keeps the layout fixed regardless of status content size
    <div className="saloon-container bg-wood-pattern h-screen p-6 flex flex-col overflow-hidden">
      {/* Scoreboard */}
      <div className="flex-shrink-0 mb-2">
        <Scoreboard
          roundNumber={roundNumber}
          playerScore={playerScore}
          opponentScore={opponentScore}
        />
      </div>

      {/* Main status area — flex-1 + min-h-0 so it absorbs space without pushing video feeds */}
      <div className="flex-1 min-h-0 flex items-center justify-center text-center overflow-hidden">
        {renderStatus()}
      </div>

      {/* Two feeds side by side — flex-shrink-0 so they never move */}
      <div className="flex-shrink-0 flex flex-row justify-center gap-8 mb-4">
        {/* Local feed */}
        <div className={`video-container relative border-8 ${localBorderClass} rounded-md bg-black shadow-2xl w-96 h-64 flex items-center justify-center transition-all duration-300`}>
          {/* Point badge */}
          {playerScored && (
            <span className="absolute top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-black font-bold px-3 py-1 text-base rounded z-30 tracking-widest font-serif">
              POINT!
            </span>
          )}

          {/* Bottom label — swaps to MUGSHOT when frame is frozen */}
          <span className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 text-xl font-bold rounded z-30">
            {frozenFrame ? '✦ MUGSHOT ✦' : 'You'}
          </span>

          {/* Live feed (always rendered underneath) */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
          />

          {/* Frozen mugshot overlay — sepia tones for that Old West photograph feel */}
          {frozenFrame && (
            <img
              src={frozenFrame}
              alt="Captured draw"
              className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] sepia contrast-125 z-20"
            />
          )}
        </div>

        {/* Opponent feed */}
        <div className={`video-container relative border-8 ${opponentBorderClass} rounded-md bg-black shadow-2xl w-96 h-64 flex items-center justify-center transition-all duration-300`}>
          {/* Point badge */}
          {opponentScored && (
            <span className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white font-bold px-3 py-1 text-base rounded z-20 tracking-widest font-serif">
              POINT!
            </span>
          )}

          {/* Bottom label — swaps to MUGSHOT when frame is frozen */}
          <span className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 text-xl font-bold rounded z-30">
            {frozenOpponentFrame ? '✦ MUGSHOT ✦' : 'Outlaw'}
          </span>
          <p className="text-gray-500 font-mono z-0">Waitin' on the other outlaw...</p>

          {/* Live feed (always rendered underneath) */}
          <img
            ref={remoteImgRef}
            alt="Opponent's feed"
            className="absolute inset-0 w-full h-full object-cover z-10"
          />

          {/* Frozen mugshot overlay */}
          {frozenOpponentFrame && (
            <img
              src={frozenOpponentFrame}
              alt="Opponent captured draw"
              className="absolute inset-0 w-full h-full object-cover sepia contrast-125 z-20"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DualArena;
