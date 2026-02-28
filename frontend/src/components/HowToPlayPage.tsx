import React from 'react';

interface HowToPlayPageProps {
  onBack: () => void;
}

export const HowToPlayPage: React.FC<HowToPlayPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-stone-900 bg-wood-pattern p-8 flex flex-col items-center">
      
      <div className="max-w-4xl w-full relative bg-black bg-opacity-80 p-12 border-8 border-yellow-900 rounded-xl shadow-2xl mt-8">
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="absolute left-6 top-6 text-yellow-500 hover:text-white font-mono border-2 border-yellow-700 bg-black bg-opacity-50 px-4 py-2 rounded transition-colors"
        >
          ← Back to Saloon
        </button>

        <h1 className="text-6xl font-serif text-yellow-500 tracking-widest uppercase drop-shadow-md text-center mb-4 mt-10">
          Rules of the Duel
        </h1>
        <p className="text-center text-gray-400 font-mono mb-10 tracking-widest">
          (HOW TO PLAY)
        </p>

        <div className="text-gray-200 font-serif text-xl leading-relaxed space-y-8">
          
          <p className="text-2xl text-yellow-400 text-center">
            Only the fastest hands survive the ASL Showdown. Here is how it works:
          </p>

          <ul className="space-y-6">
            <li className="bg-yellow-900 bg-opacity-20 p-6 rounded border-l-4 border-yellow-600">
              <h3 className="text-2xl text-yellow-500 font-bold mb-2">1. The Countdown</h3>
              <p className="text-gray-300">
                When the match starts, you will see a 5-second countdown. Get your hands ready and your webcam clear. 
              </p>
            </li>
            
            <li className="bg-yellow-900 bg-opacity-20 p-6 rounded border-l-4 border-yellow-600">
              <h3 className="text-2xl text-yellow-500 font-bold mb-2">2. The Draw</h3>
              <p className="text-gray-300">
                A "WANTED" poster will appear with a random letter of the alphabet. You have exactly 3 seconds to form that letter in American Sign Language. When the red <strong className="text-red-500">DRAW!</strong> text flashes, the server will take a snapshot of your hand.
              </p>
            </li>

            <li className="bg-yellow-900 bg-opacity-20 p-6 rounded border-l-4 border-yellow-600">
              <h3 className="text-2xl text-yellow-500 font-bold mb-2">3. The Verdict</h3>
              <p className="text-gray-300">
                If your sign is correct and your opponent misses, you score a point. If you both get it right, it's a tie and you both score! If you both miss, the round is a scratch.
              </p>
            </li>

            <li className="bg-yellow-900 bg-opacity-20 p-6 rounded border-l-4 border-yellow-600">
              <h3 className="text-2xl text-yellow-500 font-bold mb-2">4. Claim the Bounty</h3>
              <p className="text-gray-300">
                The first player to reach <strong>3 points</strong> wins the match, taking the glory and stealing Elo points from the loser.
              </p>
            </li>
          </ul>

        </div>

      </div>
    </div>
  );
};

export default HowToPlayPage;