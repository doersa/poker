
import React, { useState, useEffect } from 'react';
import { GameState, Player } from '../types';
import { initAudio } from '../services/audioService';

interface ControlsProps {
  gameState: GameState;
  user: Player;
  onAction: (action: 'fold' | 'check' | 'call' | 'raise' | 'all-in', amount?: number) => void;
  onGeminiAdvice: () => void;
  isAdviceLoading: boolean;
}

const Controls: React.FC<ControlsProps> = ({ gameState, user, onAction, onGeminiAdvice, isAdviceLoading }) => {
  // Calculate legal betting range
  const toCall = gameState.currentBet - user.currentBet;
  const minRaise = gameState.minRaise;
  
  // The minimum TOTAL bet a player must make to legally raise
  // It must be at least the current bet + the minimum raise increment
  // If the current bet is 0, min raise is just the big blind (or minRaise value)
  const minTotalBet = gameState.currentBet + minRaise;
  
  // The maximum total bet is the user's current chips + what they already have in the pot
  const maxTotalBet = user.chips + user.currentBet;

  // Initialize slider to the minimum valid raise amount
  const [amount, setAmount] = useState(minTotalBet);

  // Sync state when turn updates
  useEffect(() => {
    setAmount(Math.max(minTotalBet, Math.min(minTotalBet, maxTotalBet)));
  }, [gameState.currentBet, gameState.minRaise, user.chips, user.currentBet]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(Number(e.target.value));
  };

  const handleAction = (action: 'fold' | 'check' | 'call' | 'raise' | 'all-in', val?: number) => {
    initAudio(); // Unlock audio context on user gesture
    onAction(action, val);
  };

  const handleAdvice = () => {
    initAudio();
    onGeminiAdvice();
  }

  const canCheck = toCall === 0;
  // Can only raise if you have enough chips to cover the minTotalBet
  const canRaise = maxTotalBet >= minTotalBet;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md p-4 border-t border-gray-700 shadow-2xl z-50">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Gemini Advice Button */}
        <button 
          onClick={handleAdvice}
          disabled={isAdviceLoading}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition disabled:opacity-50"
        >
           {isAdviceLoading ? (
               <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
           ) : (
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
           )}
           <span>AI Coach</span>
        </button>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full md:w-auto justify-center">
            <button 
                onClick={() => handleAction('fold')}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg shadow-md border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
            >
                Fold
            </button>
            
            <button 
                onClick={() => handleAction(canCheck ? 'check' : 'call')}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-md border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 min-w-[100px]"
            >
                {canCheck ? 'Check' : `Call $${toCall}`}
            </button>

            {/* Raise Control - Only show if player has enough to raise */}
            {canRaise ? (
              <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg border border-gray-600">
                  <input 
                      type="range" 
                      min={minTotalBet} 
                      max={maxTotalBet} 
                      step={10} 
                      value={amount}
                      onChange={handleAmountChange}
                      className="w-32 md:w-48 cursor-pointer accent-green-500"
                  />
                  <button 
                      onClick={() => handleAction(amount >= maxTotalBet ? 'all-in' : 'raise', amount)}
                      className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded shadow-md border-b-4 border-green-800 active:border-b-0 active:translate-y-1 whitespace-nowrap min-w-[110px]"
                  >
                      {amount >= maxTotalBet ? 'All In' : `Raise to $${amount}`}
                  </button>
              </div>
            ) : (
              // If can't raise properly but has chips, essentially only All-in option or just Call if stacks are weird
              // Simplified: If you can't min-raise, you can usually only shove all-in
               user.chips > toCall && (
                 <button 
                    onClick={() => handleAction('all-in')}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-6 rounded-lg shadow-md border-b-4 border-orange-800 active:border-b-0 active:translate-y-1"
                 >
                    All In
                 </button>
               )
            )}
        </div>
      </div>
    </div>
  );
};

export default Controls;
