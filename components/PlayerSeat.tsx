
import React from 'react';
import { Player, PlayerStatus, GameState } from '../types';
import Card from './Card';

interface PlayerSeatProps {
  player: Player;
  isActive: boolean;
  isDealer: boolean;
  part: 'avatar' | 'hand'; // New prop to determine what to render
  position: { top: string; left: string }; // Unified position prop
  isUser: boolean;
  gameState: GameState;
}

const PlayerSeat: React.FC<PlayerSeatProps> = ({ player, isActive, isDealer, part, position, isUser, gameState }) => {
  const showCards = isUser || (gameState.phase === 'Showdown' && player.status !== 'FOLDED');
  const isFolded = player.status === PlayerStatus.FOLDED;
  const isAllIn = player.status === PlayerStatus.ALL_IN;
  const isWinner = gameState.winners.some(w => w.playerId === player.id);
  const isRaise = player.lastAction === 'RAISE';
  const hasBet = player.currentBet > 0 && !isFolded && !isAllIn;

  // --- RENDER HAND (Inside Table) ---
  if (part === 'hand') {
    return (
      <div 
        className={`absolute flex items-center justify-center transition-all duration-500 z-10 ${isFolded ? 'opacity-40 grayscale scale-90' : ''}`}
        style={{ 
            top: position.top, 
            left: position.left,
            transform: 'translate(-50%, -50%)',
            width: '0px', height: '0px' // Point anchor
        }}
      >
         {/* Cards Group */}
         <div className="flex gap-1 h-12 md:h-16 lg:h-20 hover:scale-105 transition-transform items-center justify-center">
            {player.status !== PlayerStatus.SITTING_OUT && player.cards.map((card, idx) => (
                <div 
                    key={card.id || idx} 
                    className="shadow-lg"
                >
                    <Card card={card} hidden={!showCards && !isFolded} /> 
                </div>
            ))}
         </div>
         
         {/* Current Bet Badge - Placed next to cards on the table */}
         {player.currentBet > 0 && player.status !== 'FOLDED' && (
            <div 
                className="absolute -bottom-5 sm:-bottom-6 bg-yellow-600/90 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow border border-yellow-400 whitespace-nowrap backdrop-blur-sm z-20"
            >
                ${Math.floor(player.currentBet)}
            </div>
         )}
      </div>
    );
  }

  // --- Determine Avatar Styles based on Priority ---
  let borderClass = 'border-gray-600';
  let effectClass = '';
  
  if (isWinner) {
      borderClass = 'border-green-400';
      effectClass = 'shadow-[0_0_40px_rgba(74,222,128,0.8)] scale-125 ring-4 ring-green-500/50 z-50 animate-bounce';
  } else if (isAllIn) {
      borderClass = 'border-orange-500';
      effectClass = 'shadow-[0_0_30px_rgba(249,115,22,0.9)] scale-110 ring-2 ring-orange-400 animate-pulse';
  } else if (isActive) {
      borderClass = 'border-yellow-400';
      effectClass = 'shadow-[0_0_20px_rgba(250,204,21,0.6)] scale-110';
  } else if (isRaise && !isFolded) {
      // Distinct style for Raise: Green glow and slight scale, indicating aggression
      borderClass = 'border-green-500';
      effectClass = 'shadow-[0_0_25px_rgba(34,197,94,0.7)] scale-110';
  } else if (isFolded) {
      borderClass = 'border-red-900 bg-gray-900';
      effectClass = ''; 
  }

  // --- RENDER AVATAR (Outside Ring) ---
  return (
      <div 
        className={`absolute flex flex-col items-center justify-center transition-all duration-300 pointer-events-auto z-20 ${isFolded ? 'opacity-60' : ''}`}
        style={{ 
            top: position.top, 
            left: position.left,
            transform: 'translate(-50%, -50%)',
            width: '0px', height: '0px'
        }}
      >
          {/* Avatar Bubble */}
          <div className="relative flex flex-col items-center">
            
            {/* Active Bet Indicator Ring */}
            {hasBet && (
                <div 
                    className="absolute top-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full border-[1.5px] sm:border-2 border-dashed border-yellow-400/60 animate-[spin_8s_linear_infinite] pointer-events-none"
                    style={{ transform: 'scale(1.15)' }}
                ></div>
            )}

            <div className={`relative w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full border-4 flex flex-col items-center justify-center bg-gray-800 shadow-2xl transition-all duration-300
                ${borderClass}
                ${effectClass}
            `}>
                <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatarSeed}`} 
                    alt="Avatar" 
                    className={`w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full ${isFolded ? 'opacity-50' : ''}`}
                />
                {isDealer && (
                    <div className="absolute -top-1 -right-1 bg-white text-black text-[9px] sm:text-[10px] font-bold w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border border-gray-400 shadow">
                        D
                    </div>
                )}
            </div>

            {/* Name & Stack */}
            <div className="mt-1 bg-black/80 text-white text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full text-center min-w-[50px] sm:min-w-[70px] border border-gray-600 shadow-lg backdrop-blur-sm z-10">
                <div className="font-bold truncate max-w-[45px] sm:max-w-[75px]">{player.name}</div>
                <div className={`font-mono ${isWinner ? 'text-green-400 font-bold' : 'text-yellow-400'}`}>${Math.floor(player.chips)}</div>
            </div>
          </div>

          {/* Action Status Badge - Above Avatar */}
          {player.lastAction && (
            <div className={`absolute -top-5 sm:-top-8 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded shadow-lg animate-bounce whitespace-nowrap z-20
                ${player.lastAction === 'FOLD' ? 'bg-red-800' : 'bg-blue-600'}
                ${player.lastAction === 'ALL IN' ? 'bg-orange-600 scale-125' : ''}
                ${player.lastAction === 'RAISE' ? 'bg-green-600' : ''}
            `}>
                {player.lastAction}
            </div>
          )}
      </div>
  );
};

export default PlayerSeat;
