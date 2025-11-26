
import React from 'react';
import { Player, PlayerStatus, GameState } from '../types';
import Card from './Card';

interface PlayerSeatProps {
  player: Player;
  isActive: boolean;
  isDealer: boolean;
  position: { top: string; left: string }; // Position percentage
  isUser: boolean;
  gameState: GameState;
}

const PlayerSeat: React.FC<PlayerSeatProps> = ({ player, isActive, isDealer, position, isUser, gameState }) => {
  const showCards = isUser || (gameState.phase === 'Showdown' && player.status !== 'FOLDED');
  const isFolded = player.status === PlayerStatus.FOLDED;

  return (
    <div 
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300 ${isFolded ? 'opacity-60 grayscale' : ''}`}
      style={{ top: position.top, left: position.left }}
    >
      {/* Cards */}
      <div className={`flex -space-x-4 mb-2 h-24 transition-transform duration-500 ${isFolded ? 'translate-y-4 scale-90 opacity-70' : ''}`}>
         {player.status !== PlayerStatus.SITTING_OUT && player.cards.map((card, idx) => (
             <div key={card.id || idx} className={`transform origin-bottom ${idx === 0 ? '-rotate-6' : 'rotate-6'} transition-transform hover:scale-110 z-10`}>
                 <Card card={card} hidden={!showCards && !isFolded} /> 
             </div>
         ))}
      </div>

      {/* Avatar Bubble */}
      <div className={`relative w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center bg-gray-800 shadow-lg z-20
        ${isActive ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]' : 'border-gray-600'}
        ${isFolded ? 'border-red-900 bg-gray-900' : ''}
      `}>
         <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatarSeed}`} 
            alt="Avatar" 
            className={`w-16 h-16 rounded-full ${isFolded ? 'opacity-50' : ''}`}
         />
         {isDealer && (
            <div className="absolute -top-2 -right-2 bg-white text-black text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-gray-400 shadow">
                D
            </div>
         )}
      </div>

      {/* Stats */}
      <div className="mt-1 bg-black/80 text-white text-xs px-3 py-1 rounded-full text-center min-w-[100px] border border-gray-600 backdrop-blur-sm z-30">
        <div className="font-bold truncate max-w-[90px]">{player.name}</div>
        <div className="text-yellow-400 font-mono">${player.chips}</div>
      </div>

      {/* Last Action / Status Badge */}
      {player.lastAction && (
        <div className={`absolute top-10 left-16 text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg animate-pulse whitespace-nowrap z-40
            ${player.lastAction === 'FOLD' ? 'bg-red-800' : 'bg-blue-600'}
        `}>
            {player.lastAction}
        </div>
      )}
      
      {/* Current Bet Badge */}
      {player.currentBet > 0 && player.status !== 'FOLDED' && (
          <div className="absolute -top-6 bg-yellow-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow border border-yellow-400 z-0">
             Bet: ${player.currentBet}
          </div>
      )}
    </div>
  );
};

export default PlayerSeat;
