
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
            <div className={`relative w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full border-4 flex flex-col items-center justify-center bg-gray-800 shadow-2xl
                ${isActive ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)] scale-110' : 'border-gray-600'}
                ${isFolded ? 'border-red-900 bg-gray-900' : ''}
                ${isAllIn ? 'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.9)] scale-110 ring-2 ring-orange-400 animate-pulse' : ''}
                transition-all duration-300
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
            <div className="mt-1 bg-black/80 text-white text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full text-center min-w-[50px] sm:min-w-[70px] border border-gray-600 shadow-lg backdrop-blur-sm">
                <div className="font-bold truncate max-w-[45px] sm:max-w-[75px]">{player.name}</div>
                <div className="text-yellow-400 font-mono">${Math.floor(player.chips)}</div>
            </div>
          </div>

          {/* Action Status Badge - Above Avatar */}
          {player.lastAction && (
            <div className={`absolute -top-5 sm:-top-8 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded shadow-lg animate-bounce whitespace-nowrap
                ${player.lastAction === 'FOLD' ? 'bg-red-800' : 'bg-blue-600'}
                ${player.lastAction === 'ALL IN' ? 'bg-orange-600 scale-125' : ''}
            `}>
                {player.lastAction}
            </div>
          )}
      </div>
  );
};

export default PlayerSeat;
