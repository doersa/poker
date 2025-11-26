
import React from 'react';
import { Card as CardType, Suit } from '../types';

interface CardProps {
  card?: CardType;
  hidden?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ card, hidden, className = '', style }) => {
  // Back of card UI
  const CardBack = () => (
    <div 
      className="w-full h-full bg-blue-800 rounded-md border-2 border-white shadow-md flex items-center justify-center"
      style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #1e3a8a 0, #1e3a8a 10px, #172554 10px, #172554 20px)',
      }}
    >
      <div className="w-10 h-16 border border-blue-400 rounded opacity-50"></div>
    </div>
  );

  // Front of card UI
  const CardFront = ({ c }: { c: CardType }) => {
    const isRed = c.suit === Suit.HEARTS || c.suit === Suit.DIAMONDS;
    const rankDisplay = (r: number) => {
      if (r <= 10) return r;
      if (r === 11) return 'J';
      if (r === 12) return 'Q';
      if (r === 13) return 'K';
      if (r === 14) return 'A';
      return r;
    };

    return (
      <div className="w-full h-full bg-white rounded-md border border-gray-300 shadow-md flex flex-col justify-between p-1 select-none">
        <div className={`text-xs sm:text-sm font-bold leading-none ${isRed ? 'text-red-600' : 'text-black'}`}>
          <div className="text-center">{rankDisplay(c.rank)}</div>
          <div className="text-center">{c.suit}</div>
        </div>
        <div className={`absolute inset-0 flex items-center justify-center text-2xl sm:text-4xl ${isRed ? 'text-red-600' : 'text-black'}`}>
          {c.suit}
        </div>
        <div className={`text-xs sm:text-sm font-bold leading-none rotate-180 ${isRed ? 'text-red-600' : 'text-black'}`}>
          <div className="text-center">{rankDisplay(c.rank)}</div>
          <div className="text-center">{c.suit}</div>
        </div>
      </div>
    );
  };

  // If no card data provided (e.g. initial render placeholder), just show back static
  if (!card) {
      return (
        <div className={`w-14 h-20 sm:w-16 sm:h-24 ${className}`} style={style}>
            <CardBack />
        </div>
      );
  }

  // 3D Flip Structure
  return (
    <div 
      className={`relative w-14 h-20 sm:w-16 sm:h-24 perspective-1000 animate-deal ${className}`}
      style={style}
    >
      <div 
        className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${hidden ? 'rotate-y-180' : ''}`}
      >
        {/* Front Face (Visible when not hidden) */}
        <div className="absolute inset-0 backface-hidden">
             <CardFront c={card} />
        </div>

        {/* Back Face (Visible when hidden, rotated 180deg to match the container rotation) */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
            <CardBack />
        </div>
      </div>
    </div>
  );
};

export default Card;
