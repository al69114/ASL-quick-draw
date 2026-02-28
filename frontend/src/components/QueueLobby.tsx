import React, { useState, useEffect, useRef } from 'react';
import { useDuelSocket } from '../hooks/useDuelSocket';

interface MatchInfo {
  roomId: string;
  opponentId: string;
  isInitiator: boolean;
}

interface QueueLobbyProps {
  onMatchFound: (info: MatchInfo) => void;
}

// Generate or retrieve a per-tab player ID (sessionStorage = unique per tab)
function generateId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Fallback for non-secure contexts (plain HTTP on LAN)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getPlayerId(): string {
  let id = sessionStorage.getItem('player_id');
  if (!id) {
    id = generateId();
    sessionStorage.setItem('player_id', id);
  }
  return id;
}

export const QueueLobby: React.FC<QueueLobbyProps> = ({ onMatchFound }) => {
  const [isQueueing, setIsQueueing] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { socket, connect } = useDuelSocket();

  // Keep onMatchFound stable in the event handler closure
  const onMatchFoundRef = useRef(onMatchFound);
  onMatchFoundRef.current = onMatchFound;

  useEffect(() => {
    connect();

    const handleMatchFound = (data: {
      room_id: string;
      opponent_id: string;
      is_initiator: boolean;
    }) => {
      onMatchFoundRef.current({
        roomId: data.room_id,
        opponentId: data.opponent_id,
        isInitiator: data.is_initiator,
      });
    };

    const handleQueueJoined = (data: { position: number }) => {
      setQueuePosition(data.position);
    };

    const handleQueueError = (data: { message: string }) => {
      setError(data.message);
      setIsQueueing(false);
    };

    socket.on('match_found', handleMatchFound);
    socket.on('queue_joined', handleQueueJoined);
    socket.on('queue_error', handleQueueError);

    return () => {
      socket.off('match_found', handleMatchFound);
      socket.off('queue_joined', handleQueueJoined);
      socket.off('queue_error', handleQueueError);
    };
  }, [socket, connect]);

  const handleQueue = () => {
    setIsQueueing(true);
    setError(null);
    setQueuePosition(null);
    socket.emit('enter_queue', { player_id: getPlayerId(), elo: 1000 });
  };

  const handleLeaveQueue = () => {
    socket.emit('leave_queue', { player_id: getPlayerId() });
    setIsQueueing(false);
    setQueuePosition(null);
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

        {error && (
          <p className="text-red-400 font-mono mb-4">{error}</p>
        )}

        {!isQueueing ? (
          <button
            onClick={handleQueue}
            className="bg-yellow-700 hover:bg-yellow-600 text-white text-2xl font-bold py-4 px-8 border-4 border-yellow-900 rounded shadow-[0_0_15px_rgba(202,138,4,0.5)] transition-all hover:scale-105"
          >
            Belly Up to the Bar (Enter Queue)
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-2xl font-serif text-yellow-400 animate-pulse">
              {queuePosition !== null
                ? `Lookin' for a duel... ${queuePosition} players waitin'...`
                : "Steppin' into the saloon..."}
            </p>
            <button
              onClick={handleLeaveQueue}
              className="text-gray-400 underline text-sm hover:text-gray-200"
            >
              Holster up (leave queue)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueLobby;