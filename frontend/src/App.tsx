import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import LandingPage from './components/LandingPage';
import HomePage from './components/HomePage';
import QueueLobby from './components/QueueLobby';
import MatchPage from './components/MatchPage';
import ResultPage from './components/ResultPage';
import TranslationPage from './components/TranslationPage';

type PageState = 'HOME' | 'LOBBY' | 'MATCH' | 'RESULT' | 'TRANSLATION';

function App() {
  const { isAuthenticated, isLoading } = useAuth0();
  const [currentPage, setCurrentPage] = useState<PageState>('HOME');
  const [didWin, setDidWin] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-amber-900">
        <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  const handleMatchFound = () => setCurrentPage('MATCH');
  const handleMatchEnd = (won: boolean) => { setDidWin(won); setCurrentPage('RESULT'); };
  const handleRequeue = () => setCurrentPage('HOME');

  return (
    <div className="app-root min-h-screen bg-gray-900">
      {currentPage === 'HOME' && (
        <HomePage
          onSelectShowdown={() => setCurrentPage('LOBBY')}
          onSelectTranslation={() => setCurrentPage('TRANSLATION')}
        />
      )}
      {currentPage === 'LOBBY' && <QueueLobby onMatchFound={handleMatchFound} />}
      {currentPage === 'MATCH' && <MatchPage onMatchEnd={handleMatchEnd} />}
      {currentPage === 'RESULT' && <ResultPage isWinner={didWin} onRequeue={handleRequeue} />}
      {currentPage === 'TRANSLATION' && (
        <TranslationPage onBack={() => setCurrentPage('HOME')} />
      )}
    </div>
  );
}

export default App;
