import React, { useState } from 'react';
import QueueLobby from './components/QueueLobby';
import MatchPage from './components/MatchPage';
import ResultPage from './components/ResultPage';

type PageState = 'LOBBY' | 'MATCH' | 'RESULT';

function App() {
  const [currentPage, setCurrentPage] = useState<PageState>('LOBBY');
  const [didWin, setDidWin] = useState(false);

  const handleMatchFound = () => {
    setCurrentPage('MATCH');
  };

  const handleMatchEnd = (won: boolean) => {
    setDidWin(won);
    setCurrentPage('RESULT');
  };

  const handleRequeue = () => {
    setCurrentPage('LOBBY');
  };

  return (
    <div className="app-root min-h-screen bg-gray-900">
      {currentPage === 'LOBBY' && (
        <QueueLobby onMatchFound={handleMatchFound} />
      )}
      
      {currentPage === 'MATCH' && (
        <MatchPage onMatchEnd={handleMatchEnd} />
      )}
      
      {currentPage === 'RESULT' && (
        <ResultPage isWinner={didWin} onRequeue={handleRequeue} />
      )}
    </div>
  );
}

export default App;