
import React, { useEffect, useState } from 'react';
import { GameEffect } from '../types';

interface VFXLayerProps {
  effects: GameEffect[];
  onComplete: (id: number) => void;
}

const VFXLayer: React.FC<VFXLayerProps> = ({ effects, onComplete }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {effects.map((effect) => (
        <EffectItem key={effect.id} effect={effect} onComplete={onComplete} />
      ))}
    </div>
  );
};

const EffectItem: React.FC<{ effect: GameEffect; onComplete: (id: number) => void }> = ({ effect, onComplete }) => {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    // Trigger animation frame
    const timer = requestAnimationFrame(() => {
        setAnimating(true);
    });

    // Cleanup timer based on effect type duration
    const duration = effect.type === 'CONFETTI' ? 4000 : effect.type === 'WIN_BANNER' ? 3500 : 1000;
    const cleanup = setTimeout(() => {
      onComplete(effect.id);
    }, duration);

    return () => {
        cancelAnimationFrame(timer);
        clearTimeout(cleanup);
    };
  }, [effect.id, effect.type, onComplete]);

  // --- Confetti Effect ---
  if (effect.type === 'CONFETTI') {
      return (
          <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full">
                {Array.from({ length: 100 }).map((_, i) => (
                    <div 
                        key={i}
                        className="absolute w-3 h-3 sm:w-4 sm:h-4 rounded opacity-0 animate-confetti shadow-sm"
                        style={{
                            backgroundColor: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'][i % 6],
                            left: '50%',
                            top: '50%',
                            animationDelay: `${Math.random() * 0.2}s`, // Faster start
                            animationDuration: `${1.5 + Math.random() * 1.5}s`,
                            transform: `rotate(${Math.random() * 360}deg)`,
                            // Spread across the whole screen
                            ['--tx' as any]: `${(Math.random() - 0.5) * 150}vw`,
                            ['--ty' as any]: `${(Math.random() - 0.5) * 150}vh`,
                        }}
                    ></div>
                ))}
              </div>
          </div>
      );
  }

  // --- Big Win Banner Effect ---
  if (effect.type === 'WIN_BANNER') {
      return (
        <div className="absolute inset-0 flex items-center justify-center z-50">
             {/* Backdrop flash */}
             <div 
                className="absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out"
                style={{ opacity: animating ? 1 : 0 }}
             ></div>
             
             {/* God Rays / Glow background */}
             <div 
                className="absolute w-[800px] h-[800px] bg-gradient-to-r from-yellow-500/0 via-yellow-500/20 to-yellow-500/0 rounded-full blur-3xl animate-spin-slow"
                style={{ 
                    opacity: animating ? 1 : 0, 
                    transform: `scale(${animating ? 1.5 : 0.5})` 
                }}
             ></div>

             {/* Main Text Container */}
             <div 
                className="relative flex flex-col items-center justify-center transform transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)"
                style={{ 
                    opacity: animating ? 1 : 0,
                    transform: animating ? 'scale(1) translateY(0)' : 'scale(0.3) translateY(50px)'
                }}
             >
                 <h1 className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] stroke-text-white tracking-wider mb-2">
                     {effect.content}
                 </h1>
                 {effect.subContent && (
                    <div className="bg-black/60 backdrop-blur-md border-y-2 border-yellow-500 px-8 py-2 transform -skew-x-12">
                         <p className="text-xl sm:text-3xl text-white font-bold skew-x-12 tracking-widest uppercase text-shadow">
                            {effect.subContent}
                         </p>
                    </div>
                 )}
                 <div className="mt-4 text-yellow-200 font-mono text-2xl font-bold animate-pulse">
                     $$$$$$
                 </div>
             </div>
        </div>
      );
  }

  // --- Flying Chips Effect ---
  if (effect.type === 'CHIP') {
    return (
      <div
        className="absolute w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-dashed border-white shadow-lg bg-yellow-500 flex items-center justify-center text-[10px] font-bold text-black transition-all duration-700 ease-in-out"
        style={{
          left: animating ? '50%' : effect.startPos.left,
          top: animating ? '45%' : effect.startPos.top,
          opacity: animating ? 0 : 1,
          transform: `translate(-50%, -50%) scale(${animating ? 0.5 : 1}) rotate(${animating ? 720 : 0}deg)`
        }}
      >
        $
      </div>
    );
  }

  // --- Floating Text Effect ---
  if (effect.type === 'TEXT') {
    return (
      <div
        className={`absolute text-xl sm:text-3xl font-black transition-all duration-1000 ease-out flex items-center gap-2 ${effect.color || 'text-white'}`}
        style={{
          left: effect.startPos.left,
          top: animating ? `calc(${effect.startPos.top} - 15%)` : effect.startPos.top,
          opacity: animating ? 0 : 1,
          transform: 'translate(-50%, -50%)',
          textShadow: '0 2px 4px rgba(0,0,0,0.8)'
        }}
      >
        {effect.content}
      </div>
    );
  }

  return null;
};

export default VFXLayer;
