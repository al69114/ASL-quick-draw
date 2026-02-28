import React, { useState } from 'react';

interface QueueLobbyProps {
  onMatchFound: () => void;
}

export const QueueLobby: React.FC<QueueLobbyProps> = ({ onMatchFound }) => {
  const [isQueueing, setIsQueueing] = useState(false);

  const handleQueue = () => {
    setIsQueueing(true);
    // TODO: Teammate 2 will wire this to WebSocket emit('enter_queue')
    // Simulating finding a match for UI testing purposes
    setTimeout(() => {
      onMatchFound();
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-amber-900 text-yellow-100 bg-wood-pattern p-6">
      <div className="max-w-2xl text-center border-8 border-yellow-800 bg-black bg-opacity-60 p-12 rounded-xl shadow-2xl">
        <h1 className="text-7xl font-serif text-yellow-500 mb-4 drop-shadow-lg tracking-widest uppercase">
          Quick Draw
        </h1>
        <h2 className="text-4xl font-serif text-white mb-8 tracking-widest">
          ASL Showdown
        </h2>
        
        <p className="text-xl mb-8 font-mono text-gray-300">
          Rank #47 (1250 Elo)
        </p>

        {!isQueueing ? (
          <button 
            onClick={handleQueue}
            className="bg-yellow-700 hover:bg-yellow-600 text-white text-2xl font-bold py-4 px-8 border-4 border-yellow-900 rounded shadow-[0_0_15px_rgba(202,138,4,0.5)] transition-all hover:scale-105"
          >
            Belly Up to the Bar (Enter Queue)
          </button>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-2xl font-serif text-yellow-400 animate-pulse">
              Lookin' for a duel... 3 players waitin'...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueLobby;