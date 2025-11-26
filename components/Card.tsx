
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
      className="w-full h-full bg-blue-900 rounded-md border-2 border-white shadow-md relative overflow-hidden"
    >
      {/* Repeating Spade Pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='55%25' font-size='14' fill='%23ffffff' font-family='system-ui, sans-serif' text-anchor='middle' dominant-baseline='central'%3E♠%3C/text%3E%3C/svg%3E")`,
          backgroundSize: '20px 20px',
          backgroundRepeat: 'repeat',
        }}
      />
      
      {/* Decorative Inner Border */}
      <div className="absolute inset-1 sm:inset-1.5 border border-blue-300/30 rounded-sm"></div>
      
      {/* Center Emblem */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-blue-300/20 flex items-center justify-center bg-blue-950/40 backdrop-blur-[1px]">
        <span className="text-blue-200/50 text-xs sm:text-sm">♠</span>
      </div>
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
      <div className="w-full h-full bg-white rounded-md border border-gray-300 shadow-md flex flex-col justify-between p-0.5 sm:p-1 select-none">
        <div className={`text-[9px] sm:text-sm font-bold leading-none ${isRed ? 'text-red-600' : 'text-black'}`}>
          <div className="text-center">{rankDisplay(c.rank)}</div>
          <div className="text-center">{c.suit}</div>
        </div>
        <div className={`absolute inset-0 flex items-center justify-center text-lg sm:text-4xl ${isRed ? 'text-red-600' : 'text-black'}`}>
          {c.suit}
        </div>
        <div className={`text-[9px] sm:text-sm font-bold leading-none rotate-180 ${isRed ? 'text-red-600' : 'text-black'}`}>
          <div className="text-center">{rankDisplay(c.rank)}</div>
          <div className="text-center">{c.suit}</div>
        </div>
      </div>
    );
  };

  // If no card data provided
  if (!card) {
      return (
        <div className={`w-8 h-12 sm:w-12 sm:h-16 md:w-14 md:h-20 lg:w-16 lg:h-24 ${className}`} style={style}>
            <CardBack />
        </div>
      );
  }

  // 3D Flip Structure
  return (
    <div 
      className={`relative w-8 h-12 sm:w-12 sm:h-16 md:w-14 md:h-20 lg:w-16 lg:h-24 perspective-1000 animate-deal ${className}`}
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
