import React from 'react';

interface HomePageProps {
  onSelectShowdown: () => void;
  onSelectTranslation: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onSelectShowdown, onSelectTranslation }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-amber-900 text-yellow-100 bg-wood-pattern p-6">
      <div className="max-w-2xl text-center border-8 border-yellow-800 bg-black bg-opacity-60 p-12 rounded-xl shadow-2xl">
        <h1 className="text-7xl font-serif text-yellow-500 mb-4 drop-shadow-lg tracking-widest uppercase">
          Quick Draw
        </h1>
        <h2 className="text-4xl font-serif text-white mb-8 tracking-widest">
          ASL Showdown
        </h2>

        <p className="text-xl mb-10 font-mono text-gray-300">
          Choose your mode, partner
        </p>

        <div className="flex flex-col gap-4">
          <button
            onClick={onSelectShowdown}
            className="bg-yellow-700 hover:bg-yellow-600 text-white text-2xl font-bold py-4 px-8 border-4 border-yellow-900 rounded shadow-[0_0_15px_rgba(202,138,4,0.5)] transition-all hover:scale-105"
          >
            ☠ ASL Showdown
            <p className="text-sm font-mono font-normal mt-1 text-yellow-200 opacity-80">
              Duel opponents — sign faster to win
            </p>
          </button>

          <button
            onClick={onSelectTranslation}
            className="bg-transparent hover:bg-yellow-900 hover:bg-opacity-40 text-yellow-400 hover:text-yellow-300 text-2xl font-bold py-4 px-8 border-2 border-yellow-700 rounded transition-all hover:scale-105"
          >
            ✋ Translation
            <p className="text-sm font-mono font-normal mt-1 text-yellow-500 opacity-80">
              Translate ASL signs in real time
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
