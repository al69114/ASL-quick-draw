import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const LandingPage: React.FC = () => {
  const { loginWithRedirect, isLoading } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect();
  };

  const handleSignUp = () => {
    loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-amber-900">
        <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-amber-900 text-yellow-100 bg-wood-pattern p-6">
      <div className="max-w-2xl w-full text-center border-8 border-yellow-800 bg-black bg-opacity-60 p-6 rounded-xl shadow-2xl">
        {/* Title */}
        <h1 className="text-5xl font-serif text-yellow-500 mb-1 drop-shadow-lg tracking-widest uppercase leading-tight">
          Quick Draw
        </h1>
        <h2 className="text-2xl font-serif text-white mb-4 tracking-widest">
          ASL Showdown
        </h2>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-px bg-yellow-800"></div>
          <span className="text-yellow-600 text-xl">✦</span>
          <div className="flex-1 h-px bg-yellow-800"></div>
        </div>

        {/* Description */}
        <p className="text-base font-mono text-gray-300 mb-6 leading-relaxed">
          Step into the saloon. Sign the language faster than your opponent.<br />
          First to draw wins the duel.
        </p>

        {/* Auth buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleLogin}
            className="bg-yellow-700 hover:bg-yellow-600 text-white text-xl font-bold py-3 px-8 border-4 border-yellow-900 rounded shadow-[0_0_15px_rgba(202,138,4,0.5)] transition-all hover:scale-105"
          >
            Draw Your Iron (Log In)
          </button>
          <button
            onClick={handleSignUp}
            className="bg-transparent hover:bg-yellow-900 hover:bg-opacity-40 text-yellow-400 hover:text-yellow-300 text-lg font-bold py-2 px-8 border-2 border-yellow-700 rounded transition-all hover:scale-105"
          >
            Ride Into Town (Sign Up)
          </button>
        </div>

        {/* Footer */}
        <p className="mt-6 text-gray-500 text-sm font-mono">
          ☠ Outlaws will be matched by Elo ☠
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
