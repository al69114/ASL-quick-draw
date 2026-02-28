import React from 'react';

interface LeaderboardPageProps {
  onBack: () => void;
}

// Mock data to display before we hook up the backend database
const MOCK_LEADERBOARD = [
  { rank: 1, name: "Calamity Jane", elo: 2450 },
  { rank: 2, name: "Wild Bill", elo: 2320 },
  { rank: 3, name: "Doc Holliday", elo: 2150 },
  { rank: 4, name: "Wyatt Earp", elo: 2040 },
  { rank: 5, name: "Annie Oakley", elo: 1980 },
  { rank: 6, name: "Billy the Kid", elo: 1850 },
  { rank: 7, name: "Jesse James", elo: 1700 },
];

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-stone-900 bg-wood-pattern p-8 flex flex-col items-center">
      
      <div className="max-w-4xl w-full relative bg-black bg-opacity-80 p-12 border-8 border-yellow-900 rounded-xl shadow-2xl mt-8">
        
        <button 
          onClick={onBack}
          className="absolute left-6 top-6 text-yellow-500 hover:text-white font-mono border-2 border-yellow-700 bg-black bg-opacity-50 px-4 py-2 rounded transition-colors"
        >
          ← Back to Saloon
        </button>

        <h1 className="text-6xl font-serif text-yellow-500 tracking-widest uppercase drop-shadow-md text-center mb-4 mt-10">
          Most Wanted
        </h1>
        <p className="text-center text-gray-400 font-mono mb-10 tracking-widest">
          (GLOBAL LEADERBOARD)
        </p>

        <div className="w-full max-w-2xl mx-auto border-4 border-yellow-800 bg-yellow-900 bg-opacity-20 rounded-lg overflow-hidden shadow-inner">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-yellow-800 text-black font-serif text-2xl uppercase tracking-wider">
                <th className="py-4 px-6 border-b-4 border-yellow-900">Rank</th>
                <th className="py-4 px-6 border-b-4 border-yellow-900">Outlaw</th>
                <th className="py-4 px-6 border-b-4 border-yellow-900 text-right">Bounty (Elo)</th>
              </tr>
            </thead>
            <tbody className="text-gray-200 font-mono text-xl">
              {MOCK_LEADERBOARD.map((player, idx) => (
                <tr 
                  key={player.rank} 
                  className={`border-b border-yellow-900 ${
                    idx % 2 === 0 ? 'bg-black bg-opacity-40' : 'bg-black bg-opacity-60'
                  } hover:bg-yellow-900 hover:bg-opacity-40 transition-colors`}
                >
                  <td className="py-4 px-6 text-yellow-500 font-bold">#{player.rank}</td>
                  <td className="py-4 px-6">{player.name}</td>
                  <td className="py-4 px-6 text-right text-green-400 font-bold">{player.elo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default LeaderboardPage;