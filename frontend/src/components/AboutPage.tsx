import React from 'react';

interface AboutPageProps {
  onBack: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onBack }) => {
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

        <h1 className="text-5xl font-serif text-yellow-500 tracking-widest uppercase drop-shadow-md text-center mb-4 mt-10">
          Our Commitment to Inclusivity
        </h1>
        <p className="text-center text-gray-400 font-mono mb-10 tracking-widest">
          (DIVERSITY, EQUITY, & INCLUSION)
        </p>

        <div className="text-gray-200 font-serif text-xl leading-relaxed space-y-8">
          
          <p>
            At <strong className="text-yellow-400">Quick Draw ASL</strong>, we believe that gaming is for everyone. We are committed to building an interactive space that not only entertains but actively bridges the communication gap between the Deaf, Hard of Hearing (HoH), and hearing communities. 
          </p>
          
          <p>
            We recognize that traditional tech and gaming spaces have historically left out marginalized communities, particularly those who rely on non-verbal communication. Our mission is to normalize American Sign Language (ASL) in competitive gaming and make learning it highly accessible, equitable, and fun.
          </p>

          <h2 className="text-3xl text-yellow-500 mt-10 mb-4 border-b-2 border-yellow-900 pb-2 font-bold">
            Our Core Pillars
          </h2>
          
          <ul className="space-y-6">
            <li>
              <h3 className="text-2xl text-yellow-400 font-bold mb-1">1. Accessible by Design</h3>
              <p className="text-gray-300 text-lg">
                We believe financial barriers should never prevent someone from learning or playing. By utilizing standard webcams and browser-based AI models, we have eliminated the need for expensive VR headsets, specialized sensory gloves, or high-end gaming PCs. If you have a browser, you have a seat at our table.
              </p>
            </li>
            
            <li>
              <h3 className="text-2xl text-yellow-400 font-bold mb-1">2. Meaningful Representation</h3>
              <p className="text-gray-300 text-lg">
                Sign language isn't just an accessibility tool; it is a rich, expressive culture. By placing ASL at the very core of our core gameplay loop—rather than treating it as an afterthought or a hidden accessibility toggle—we aim to celebrate the language and bring it to the forefront of the multiplayer experience.
              </p>
            </li>

            <li>
              <h3 className="text-2xl text-yellow-400 font-bold mb-1">3. Safe & Equitable Matchmaking</h3>
              <p className="text-gray-300 text-lg">
                Learning a new language can be intimidating. Our Elo-based matchmaking ensures that greenhorns are matched with fellow beginners, while seasoned signers can test their reflexes against equally skilled opponents. This fosters a welcoming, frustration-free community where every player has an equitable chance to succeed and grow.
              </p>
            </li>
          </ul>

          <div className="mt-12 p-6 border-2 border-yellow-700 bg-yellow-900 bg-opacity-20 text-center rounded">
            <p className="text-xl text-yellow-400 font-mono">
              "Communication is a bridge. We're just making it fun to build."
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AboutPage;