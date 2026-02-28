import React from 'react';

interface ResultPageProps {
  isWinner: boolean;
  eloChange: number;
  onRequeue: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({ isWinner, eloChange, onRequeue }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 bg-wood-pattern p-6">
      <div className={`max-w-2xl w-full text-center border-8 p-12 rounded-xl shadow-2xl ${
        isWinner ? 'border-green-800 bg-green-900 bg-opacity-20' : 'border-red-800 bg-red-900 bg-opacity-20'
      }`}>
        
        <h1 className={`text-7xl font-serif mb-6 uppercase tracking-widest drop-shadow-md ${
          isWinner ? 'text-green-500' : 'text-red-600'
        }`}>
          {isWinner ? "Yer the Fastest!" : "Yer Dead!"}
        </h1>

        <p className="text-2xl text-gray-300 font-mono mb-8">
          {isWinner ? `You out-drew 'em. +${eloChange} Elo` : `Practice yer draw... ${eloChange} Elo`}
        </p>

        <div className="flex justify-center gap-6 mt-8">
          <button 
            onClick={onRequeue}
            className="bg-yellow-700 hover:bg-yellow-600 text-white text-xl font-bold py-3 px-6 border-4 border-yellow-900 rounded shadow-lg transition-transform hover:scale-105"
          >
            Queue fer another?
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;