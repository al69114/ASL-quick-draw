import React from 'react';

interface ScoreboardProps {
  roundNumber: number;
  playerScore: number;
  opponentScore: number;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ roundNumber, playerScore, opponentScore }) => {
  // Best of 5 logic means max score is 3
  const renderBullets = (score: number) => {
    return Array.from({ length: 3 }).map((_, i) => (
      <span key={i} className={`text-4xl ${i < score ? 'text-yellow-500' : 'text-gray-600 opacity-50'}`}>
        {i < score ? '🎯' : '⚫'}
      </span>
    ));
  };

  return (
    <div className="scoreboard flex justify-between items-center bg-black bg-opacity-80 p-4 rounded-xl border-2 border-yellow-600">
      <div className="player-score flex gap-2">
        {renderBullets(playerScore)}
      </div>
      
      {/* Round indicator  */}
      <div className="text-center">
        <h1 className="text-5xl font-bold text-yellow-500 font-serif tracking-widest uppercase">
          Round {roundNumber}
        </h1>
        <p className="text-gray-300 font-mono text-sm mt-1">Best of 5 Showdown</p>
      </div>

      <div className="opponent-score flex gap-2 flex-row-reverse">
        {renderBullets(opponentScore)}
      </div>
    </div>
  );
};

export default Scoreboard;