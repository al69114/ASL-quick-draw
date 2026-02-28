import React, { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useDuelSocket } from '../hooks/useDuelSocket';

interface MatchInfo {
  roomId: string;
  opponentId: string;
  playerId: string;
  isInitiator: boolean;
}

interface QueueLobbyProps {
  onMatchFound: (info: MatchInfo) => void;
}

const ELO_CLAIM = 'https://quickdraw-asl.example.com/elo';

export const QueueLobby: React.FC<QueueLobbyProps> = ({ onMatchFound }) => {
  const [isQueueing, setIsQueueing] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth0();
  const { socket, connect } = useDuelSocket();
  const authUser = user as Record<string, unknown> | undefined;
  const playerId = typeof authUser?.sub === 'string' ? authUser.sub : null;
  const eloClaim = authUser?.[ELO_CLAIM];
  const elo = typeof eloClaim === 'number' ? eloClaim : 1000;

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
        playerId: getPlayerId(),
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
    if (!playerId) {
      setError('Missing Auth0 user identifier.');
      return;
    }

    setIsQueueing(true);
    setError(null);
    setQueuePosition(null);
    socket.emit('enter_queue', { player_id: playerId, elo });
  };

  const handleLeaveQueue = () => {
    if (playerId) {
      socket.emit('leave_queue', { player_id: playerId });
    }
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
          Current Elo: {elo}
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
