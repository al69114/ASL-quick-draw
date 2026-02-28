import { useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:8000';

// Module-level singleton so all components share one connection
let _socket: Socket | null = null;

function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SOCKET_URL, { autoConnect: false });
  }
  return _socket;
}

export const useDuelSocket = () => {
  const socketRef = useRef<Socket>(getSocket());

  const connect = () => {
    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }
  };

  const disconnect = () => {
    socketRef.current.disconnect();
  };

  return {
    socket: socketRef.current,
    connect,
    disconnect,
  };
};