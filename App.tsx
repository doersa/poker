
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Player, GamePhase, PlayerStatus, HandResult, Card, GameEffect, BotDifficulty } from './types';
import { createDeck, evaluateHand, getBotAction } from './services/pokerEngine';
import { getStrategicAdvice } from './services/geminiService';
import { playDeal, playChips, playCheck, playFold, playWin, startBGM, stopBGM, initAudio } from './services/audioService';
import PlayerSeat from './components/PlayerSeat';
import CardComponent from './components/Card';
import Controls from './components/Controls';
import VFXLayer from './components/VFXLayer';

// Constants
const INITIAL_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

const App: React.FC = () => {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    deck: [],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    minRaise: BIG_BLIND,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    phase: GamePhase.WAITING,
    winners: [],
    message: "Welcome to Gemini Poker!",
    difficulty: BotDifficulty.MEDIUM
  });

  const [advice, setAdvice] = useState<string | null>(null);
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);
  const [showAdviceModal, setShowAdviceModal] = useState(false);
  const [effects, setEffects] = useState<GameEffect[]>([]);
  const [isBGMEnabled, setIsBGMEnabled] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const effectIdCounter = useRef(0);

  // --- Initialization ---
  useEffect(() => {
    initializeGame();
    return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        stopBGM();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleBGMHandler = () => {
      initAudio();
      if (isBGMEnabled) {
          stopBGM();
          setIsBGMEnabled(false);
      } else {
          startBGM();
          setIsBGMEnabled(true);
      }
  };

  // Listen for wins to play sound and VFX
  useEffect(() => {
      if (gameState.winners.length > 0) {
          playWin();
          // Trigger confetti
          triggerEffect({ 
              type: 'CONFETTI', 
              startPos: { left: '50%', top: '50%' } 
          });

          // Trigger Big Banner
          const winnerName = gameState.players.find(p => p.id === gameState.winners[0].playerId)?.name || 'Unknown';
          const winAmount = gameState.winners.reduce((acc, w) => acc + w.amount, 0);
          const handName = gameState.winners[0].handName;
          
          triggerEffect({
            type: 'WIN_BANNER',
            startPos: { left: '50%', top: '50%' },
            content: `${winnerName} WINS!`,
            subContent: `${handName} • $${winAmount}`
          });
      }
  }, [gameState.winners]);

  // Helper for triggering effects
  const triggerEffect = (effect: Omit<GameEffect, 'id'>) => {
      const id = effectIdCounter.current++;
      setEffects(prev => [...prev, { ...effect, id }]);
  };

  const removeEffect = (id: number) => {
      setEffects(prev => prev.filter(e => e.id !== id));
  };

  // Calculate positions for Avatar (Outer) and Cards (Inner/Table)
  const getPlayerPosition = (index: number, totalPlayers: number) => {
      const angleStep = 360 / totalPlayers;
      // Start at 90deg (bottom) to have user centered if index 0
      const startAngle = 90; 
      const angleDeg = startAngle + (index * angleStep);
      const angleRad = angleDeg * (Math.PI / 180);
      
      // Avatar Radius (Outer Ring - near screen edge)
      // Elliptical distribution to match screen aspect ratio roughly
      const avRx = 45; // 45% of width
      const avRy = 42; // 42% of height
      
      const avX = 50 + avRx * Math.cos(angleRad);
      const avY = 50 + avRy * Math.sin(angleRad);

      // Card Radius (Inner Ring - ON THE TABLE)
      // The table is roughly 60-90% width and 30-50% height
      // We want cards to land on the felt.
      // Felt is Aspect 2:1.
      const cardRx = 28; // Closer to center horizontally
      const cardRy = 20; // Closer to center vertically to fit on the flattened table view
      
      const cardX = 50 + cardRx * Math.cos(angleRad);
      const cardY = 50 + cardRy * Math.sin(angleRad);
      
      return { 
          avatar: { left: `${avX}%`, top: `${avY}%` },
          cards: { left: `${cardX}%`, top: `${cardY}%` }
      };
  };

  const initializeGame = () => {
    const players: Player[] = [
      { id: 0, name: 'You', isBot: false, chips: INITIAL_CHIPS, cards: [], status: PlayerStatus.ACTIVE, currentBet: 0, totalHandBet: 0, avatarSeed: 'user-hero' },
      { id: 1, name: 'Alex', isBot: true, chips: INITIAL_CHIPS, cards: [], status: PlayerStatus.ACTIVE, currentBet: 0, totalHandBet: 0, avatarSeed: 'alex' },
      { id: 2, name: 'Beth', isBot: true, chips: INITIAL_CHIPS, cards: [], status: PlayerStatus.ACTIVE, currentBet: 0, totalHandBet: 0, avatarSeed: 'beth' },
      { id: 3, name: 'Carl', isBot: true, chips: INITIAL_CHIPS, cards: [], status: PlayerStatus.ACTIVE, currentBet: 0, totalHandBet: 0, avatarSeed: 'carl' },
      { id: 4, name: 'Dana', isBot: true, chips: INITIAL_CHIPS, cards: [], status: PlayerStatus.ACTIVE, currentBet: 0, totalHandBet: 0, avatarSeed: 'dana' },
      { id: 5, name: 'Earl', isBot: true, chips: INITIAL_CHIPS, cards: [], status: PlayerStatus.ACTIVE, currentBet: 0, totalHandBet: 0, avatarSeed: 'earl' },
    ];
    
    setGameState(prev => ({
      ...prev,
      players,
      phase: GamePhase.WAITING,
      message: "Starting new game..."
    }));
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => startNewHand(players, 0), 1000);
  };

  const startNewHand = (currentPlayers: Player[], dealerIdx: number) => {
    playDeal();

    const deck = createDeck();
    
    // Reset players for new hand
    const nextPlayers = currentPlayers.map(p => ({
      ...p,
      cards: [],
      status: p.chips > 0 ? PlayerStatus.ACTIVE : PlayerStatus.BUSTED,
      currentBet: 0,
      totalHandBet: 0,
      lastAction: undefined
    }));

    const activeCount = nextPlayers.filter(p => p.status === PlayerStatus.ACTIVE).length;

    if (activeCount < 2) {
      const winner = nextPlayers.find(p => p.chips > 0);
      setGameState(prev => ({ 
          ...prev, 
          players: nextPlayers, 
          message: winner?.isBot ? "Game Over! You Lost." : "Game Over! You Won!",
          phase: GamePhase.WAITING
      }));
      return;
    }

    // Deal cards
    nextPlayers.forEach(p => {
      if(p.status === PlayerStatus.ACTIVE) {
        p.cards = [deck.pop()!, deck.pop()!];
      }
    });

    const getNextActive = (idx: number) => {
        let next = (idx + 1) % nextPlayers.length;
        let loops = 0;
        while((nextPlayers[next].status === PlayerStatus.BUSTED || nextPlayers[next].status === PlayerStatus.SITTING_OUT) && loops < nextPlayers.length) {
             next = (next + 1) % nextPlayers.length;
             loops++;
        }
        return next;
    };

    // Blinds logic
    let sbIndex = getNextActive(dealerIdx);
    let bbIndex = getNextActive(sbIndex);

    // Heads up adjustment
    if (activeCount === 2) {
        if (nextPlayers[dealerIdx].status === PlayerStatus.ACTIVE) {
            sbIndex = dealerIdx;
            bbIndex = getNextActive(dealerIdx);
        }
    }

    const sbPlayer = nextPlayers[sbIndex];
    const bbPlayer = nextPlayers[bbIndex];

    if (!sbPlayer || !bbPlayer) {
        return;
    }

    // Apply Blinds - Integers Only
    const sbAmount = Math.floor(Math.min(sbPlayer.chips, SMALL_BLIND));
    sbPlayer.chips -= sbAmount;
    sbPlayer.currentBet = sbAmount;
    sbPlayer.totalHandBet = sbAmount;
    sbPlayer.lastAction = 'SB';

    const bbAmount = Math.floor(Math.min(bbPlayer.chips, BIG_BLIND));
    bbPlayer.chips -= bbAmount;
    bbPlayer.currentBet = bbAmount;
    bbPlayer.totalHandBet = bbAmount;
    bbPlayer.lastAction = 'BB';

    const pot = sbAmount + bbAmount;
    const firstToAct = getNextActive(bbIndex);

    setGameState(prev => ({
      ...prev,
      players: nextPlayers,
      deck,
      communityCards: [],
      pot,
      currentBet: BIG_BLIND,
      minRaise: BIG_BLIND,
      dealerIndex: dealerIdx,
      currentPlayerIndex: firstToAct,
      phase: GamePhase.PRE_FLOP,
      winners: [],
      message: "Pre-Flop Betting"
    }));
  };

  // --- Game Loop ---
  useEffect(() => {
    // Auto-start next hand if showdown is complete and we have a winner
    if (gameState.phase === GamePhase.SHOWDOWN) {
         if (timerRef.current) clearTimeout(timerRef.current);
         timerRef.current = setTimeout(() => {
             const nextDealer = (gameState.dealerIndex + 1) % gameState.players.length;
             startNewHand(gameState.players, nextDealer);
         }, 8000); 
         return;
    }

    if (gameState.phase === GamePhase.WAITING || gameState.players.length === 0) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer) return;

    // Auto-skip invalid players
    if (currentPlayer.status === PlayerStatus.FOLDED || currentPlayer.status === PlayerStatus.BUSTED || currentPlayer.status === PlayerStatus.SITTING_OUT) {
       proceedTurn();
       return;
    }

    // Auto-advance if All-In
    if (currentPlayer.status === PlayerStatus.ALL_IN) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => proceedTurn(), 500);
        return;
    }

    // Bot Action
    if (currentPlayer.isBot) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // Double check state hasn't changed
        if (currentPlayer && gameState.phase !== GamePhase.SHOWDOWN) {
            // Pass the difficulty level to the bot engine
            const botMove = getBotAction(currentPlayer, gameState, gameState.difficulty);
            handlePlayerAction(currentPlayer.id, botMove.action, botMove.amount);
        }
      }, 1000 + Math.random() * 1000);
    }
  }, [gameState.currentPlayerIndex, gameState.phase, gameState.currentBet, gameState.communityCards.length]);

  const handlePlayerAction = (playerId: number, action: 'fold' | 'check' | 'call' | 'raise' | 'all-in', amount?: number) => {
    // Play sound based on action
    if (action === 'fold') playFold();
    else if (action === 'check') playCheck();
    else playChips();

    // Trigger VFX
    const playerPos = getPlayerPosition(playerId, gameState.players.length);
    // Use Avatar position for VFX text
    const vfxPos = playerPos.avatar; 
    
    // UI VFX Triggers
    if (action === 'fold') {
        triggerEffect({ type: 'TEXT', content: 'FOLD', color: 'text-red-500', startPos: vfxPos });
    } else if (action === 'check') {
        triggerEffect({ type: 'TEXT', content: 'CHECK', color: 'text-gray-300', startPos: vfxPos });
    } else if (action === 'all-in') {
        triggerEffect({ type: 'TEXT', content: 'ALL IN!', color: 'text-orange-500', startPos: vfxPos });
        triggerEffect({ type: 'CHIP', startPos: vfxPos });
    } else if (action === 'call') {
        triggerEffect({ type: 'TEXT', content: 'CALL', color: 'text-blue-400', startPos: vfxPos });
        triggerEffect({ type: 'CHIP', startPos: vfxPos });
    } else if (action === 'raise') {
        triggerEffect({ type: 'TEXT', content: `RAISE TO $${Math.floor(amount || 0)}`, color: 'text-green-400', startPos: vfxPos });
        triggerEffect({ type: 'CHIP', startPos: vfxPos });
    }

    setGameState(prev => {
      // Validate turn
      if (!prev.players[prev.currentPlayerIndex] || prev.players[prev.currentPlayerIndex].id !== playerId) return prev;

      const players = [...prev.players];
      const playerIndex = players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return prev;

      const player = { ...players[playerIndex] };
      players[playerIndex] = player;

      let newPot = prev.pot;
      let newCurrentBet = prev.currentBet;
      let minRaise = prev.minRaise;

      player.lastAction = action.toUpperCase();

      if (action === 'fold') {
        player.status = PlayerStatus.FOLDED;
      } else if (action === 'check') {
          // Check logic
      } else if (action === 'call') {
        const toCall = prev.currentBet - player.currentBet;
        if (player.chips <= toCall) {
            newPot += player.chips;
            player.currentBet += player.chips;
            player.totalHandBet += player.chips;
            player.chips = 0;
            player.status = PlayerStatus.ALL_IN;
            player.lastAction = "ALL IN";
        } else {
            newPot += toCall;
            player.chips -= toCall;
            player.currentBet += toCall;
            player.totalHandBet += toCall;
        }
      } else if (action === 'raise') {
        const raiseTotal = Math.floor(amount || (prev.currentBet + prev.minRaise));
        const actualRaise = raiseTotal - player.currentBet; 
        
        if (player.chips <= actualRaise) {
             newPot += player.chips;
             player.currentBet += player.chips;
             player.totalHandBet += player.chips;
             newCurrentBet = Math.max(newCurrentBet, player.currentBet); 
             player.chips = 0;
             player.status = PlayerStatus.ALL_IN;
             player.lastAction = "ALL IN";
        } else {
            newPot += actualRaise;
            player.chips -= actualRaise;
            player.currentBet += actualRaise;
            player.totalHandBet += actualRaise;
            
            const raiseDiff = player.currentBet - prev.currentBet;
            if (raiseDiff > 0) minRaise = raiseDiff;
            
            newCurrentBet = player.currentBet;
        }
      } else if (action === 'all-in') {
         newPot += player.chips;
         player.currentBet += player.chips;
         player.totalHandBet += player.chips;
         if (player.currentBet > newCurrentBet) {
             const raiseDiff = player.currentBet - newCurrentBet;
             if (raiseDiff >= prev.minRaise) minRaise = raiseDiff;
             newCurrentBet = player.currentBet;
         }
         player.chips = 0;
         player.status = PlayerStatus.ALL_IN;
      }

      return {
        ...prev,
        players,
        pot: newPot,
        currentBet: newCurrentBet,
        minRaise,
        message: `${player.name} ${player.lastAction}`
      };
    });
    
    setTimeout(() => proceedTurn(), 0);
  };

  const determineWinners = (players: Player[], communityCards: Card[], pot: number, earlyWin: boolean) => {
    const activePlayers = players.filter(p => p.status !== PlayerStatus.FOLDED && p.status !== PlayerStatus.BUSTED && p.status !== PlayerStatus.SITTING_OUT);
    
    let winners: { playerId: number, amount: number, handName: string }[] = [];

    if (earlyWin) {
        winners = [{ playerId: activePlayers[0].id, amount: Math.floor(pot), handName: 'Opponents Folded' }];
    } else {
        const results = activePlayers.map(p => ({
            playerId: p.id,
            hand: evaluateHand([...p.cards, ...communityCards])
        }));
        
        results.sort((a, b) => b.hand.score - a.hand.score);
        const winner = results[0];
        const ties = results.filter(r => r.hand.score === winner.hand.score);
        
        // Integer Division
        const winAmount = Math.floor(pot / ties.length);
        const remainder = pot % ties.length; // Extra chips go to first winner (simplified rule)
        
        winners = ties.map((t, idx) => ({ 
            playerId: t.playerId, 
            amount: winAmount + (idx === 0 ? remainder : 0), 
            handName: t.hand.rankName 
        }));
    }

    const updatedPlayers = players.map(p => {
        const win = winners.find(w => w.playerId === p.id);
        if (win) return { ...p, chips: Math.floor(p.chips + win.amount) };
        return p;
    });

    return { players: updatedPlayers, winners };
  };

  const proceedTurn = () => {
    setGameState(prev => {
        if (prev.phase === GamePhase.SHOWDOWN) return prev;

        const activePlayers = prev.players.filter(p => p.status !== PlayerStatus.FOLDED && p.status !== PlayerStatus.BUSTED && p.status !== PlayerStatus.SITTING_OUT);
        const notAllInPlayers = activePlayers.filter(p => p.status !== PlayerStatus.ALL_IN);

        if (activePlayers.length === 1) {
            const { players, winners } = determineWinners(prev.players, prev.communityCards, prev.pot, true);
            return {
                ...prev,
                players,
                winners,
                phase: GamePhase.SHOWDOWN,
                message: `${winners[0].handName}`
            };
        }

        if (notAllInPlayers.length < 2) {
             const maxBet = Math.max(...activePlayers.map(p => p.currentBet));
             const allMatched = activePlayers.every(p => p.currentBet === maxBet || p.status === PlayerStatus.ALL_IN);

             if (allMatched) {
                return advancePhase(prev);
             }
        }

        const allMatched = notAllInPlayers.every(p => p.currentBet === prev.currentBet);
        
        let nextIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
        let loopCount = 0;
        while (loopCount < prev.players.length) {
            const p = prev.players[nextIndex];
            if (p.status !== PlayerStatus.FOLDED && p.status !== PlayerStatus.BUSTED && p.status !== PlayerStatus.SITTING_OUT && p.status !== PlayerStatus.ALL_IN) {
                break;
            }
            nextIndex = (nextIndex + 1) % prev.players.length;
            loopCount++;
        }

        const currentPlayer = prev.players[prev.currentPlayerIndex];
        const isRaise = currentPlayer?.lastAction === 'RAISE' || currentPlayer?.lastAction === 'ALL IN';
        const isPreFlop = prev.phase === GamePhase.PRE_FLOP;
        
        if (allMatched && !isRaise && prev.players.some(p => p.lastAction !== undefined)) {
             if (isPreFlop && prev.currentBet === BIG_BLIND && currentPlayer.lastAction !== 'CHECK' && currentPlayer.lastAction !== 'FOLD') {
                 // PreFlop BB option logic
             } else {
                 return advancePhase(prev);
             }
        }

        return {
            ...prev,
            currentPlayerIndex: nextIndex
        };
    });
  };

  const advancePhase = (currentGameState: GameState): GameState => {
      const nextPlayers = currentGameState.players.map(p => ({ ...p, currentBet: 0, lastAction: undefined }));
      const deck = [...currentGameState.deck];
      let communityCards = [...currentGameState.communityCards];
      let phase = currentGameState.phase;
      let msg = "";

      if (phase === GamePhase.PRE_FLOP) {
          phase = GamePhase.FLOP;
          communityCards.push(deck.pop()!, deck.pop()!, deck.pop()!);
          msg = "The Flop";
      } else if (phase === GamePhase.FLOP) {
          phase = GamePhase.TURN;
          communityCards.push(deck.pop()!);
          msg = "The Turn";
      } else if (phase === GamePhase.TURN) {
          phase = GamePhase.RIVER;
          communityCards.push(deck.pop()!);
          msg = "The River";
      } else if (phase === GamePhase.RIVER) {
          const { players, winners } = determineWinners(nextPlayers, communityCards, currentGameState.pot, false);
          return { 
              ...currentGameState, 
              players, 
              communityCards, 
              winners,
              phase: GamePhase.SHOWDOWN,
              message: winners.length > 1 ? "Split Pot!" : `${players.find(p => p.id === winners[0].playerId)?.name} Wins!`
          };
      }

      const canBet = nextPlayers.filter(p => p.status === PlayerStatus.ACTIVE).length >= 2;
      let firstToAct = (currentGameState.dealerIndex + 1) % nextPlayers.length;
      
      if (canBet) {
        let loops = 0;
        while ((nextPlayers[firstToAct].status === PlayerStatus.FOLDED || nextPlayers[firstToAct].status === PlayerStatus.BUSTED || nextPlayers[firstToAct].status === PlayerStatus.ALL_IN) && loops < nextPlayers.length) {
            firstToAct = (firstToAct + 1) % nextPlayers.length;
            loops++;
        }
      } else {
          firstToAct = 0; 
      }

      return {
          ...currentGameState,
          players: nextPlayers,
          deck,
          communityCards,
          phase,
          currentBet: 0,
          minRaise: BIG_BLIND,
          currentPlayerIndex: firstToAct,
          message: msg
      };
  };

  const requestAdvice = async () => {
      setIsAdviceLoading(true);
      setShowAdviceModal(true);
      const user = gameState.players.find(p => !p.isBot);
      if (user) {
          const adviceText = await getStrategicAdvice(gameState, user);
          setAdvice(adviceText);
      }
      setIsAdviceLoading(false);
  };

  const changeDifficulty = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setGameState(prev => ({ ...prev, difficulty: e.target.value as BotDifficulty }));
  };

  const userPlayer = gameState.players.find(p => !p.isBot);

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden flex flex-col">
      {/* VFX Overlay */}
      <VFXLayer effects={effects} onComplete={removeEffect} />

      {/* Header Info */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
         <div className="flex flex-col gap-2 pointer-events-auto">
             <div className="bg-black/50 p-2 rounded text-white backdrop-blur-sm">
                <h1 className="text-xl font-bold text-yellow-500">Gemini Poker</h1>
                <p className="text-sm text-gray-300">Blinds: {SMALL_BLIND}/{BIG_BLIND}</p>
             </div>
             
             <div className="flex gap-2">
                 <div className="bg-black/50 p-2 rounded backdrop-blur-sm flex flex-col">
                    <label className="text-xs text-gray-400 font-bold mb-1">Difficulty</label>
                    <select 
                        value={gameState.difficulty}
                        onChange={changeDifficulty}
                        className="bg-gray-800 text-white text-sm rounded border border-gray-600 px-2 py-1 outline-none focus:border-yellow-500"
                    >
                        <option value={BotDifficulty.EASY}>Easy</option>
                        <option value={BotDifficulty.MEDIUM}>Medium</option>
                        <option value={BotDifficulty.HARD}>Hard</option>
                    </select>
                 </div>
                 <button 
                    onClick={toggleBGMHandler}
                    className={`p-2 rounded backdrop-blur-sm border ${isBGMEnabled ? 'bg-green-900/50 border-green-500 text-green-300' : 'bg-black/50 border-gray-600 text-gray-400'}`}
                 >
                     {isBGMEnabled ? '♫ On' : '♫ Off'}
                 </button>
             </div>
         </div>
         
         <div className="bg-black/50 p-2 rounded text-white backdrop-blur-sm">
             <div className="text-center text-lg font-mono text-green-400">POT: ${Math.floor(gameState.pot)}</div>
             <div className="text-xs text-gray-400 text-center">{gameState.message}</div>
         </div>
      </div>

      {/* Game Arena - Full Screen Container */}
      <div className="flex-grow relative flex items-center justify-center bg-gray-900 overflow-hidden">
        
        {/* The Felt - Visual Table Only */}
        <div className="poker-felt relative w-[90%] sm:w-[70%] md:w-[60%] aspect-[2/1] rounded-[200px] shadow-[0_0_50px_rgba(0,0,0,0.8)_inset] border-[16px] border-[#2c1e12] flex items-center justify-center z-0">
            {/* Community Cards */}
            <div className="flex gap-2 sm:gap-4 z-10 mb-2 sm:mb-8">
                {gameState.communityCards.map((card, idx) => (
                    <CardComponent key={idx} card={card} />
                ))}
                {Array.from({ length: 5 - gameState.communityCards.length }).map((_, idx) => (
                    <div key={`placeholder-${idx}`} className="w-12 h-16 md:w-16 md:h-24 border-2 border-white/20 rounded-md bg-black/10"></div>
                ))}
            </div>
        </div>

        {/* Players Overlay - Positioned relative to the full Arena */}
        <div className="absolute inset-0 z-10 pointer-events-none">
            {gameState.players.map((player, idx) => {
                const positions = getPlayerPosition(player.id, gameState.players.length);
                return (
                    <PlayerSeat 
                        key={player.id}
                        player={player}
                        isActive={gameState.currentPlayerIndex === gameState.players.findIndex(p => p.id === player.id)}
                        isDealer={gameState.dealerIndex === gameState.players.findIndex(p => p.id === player.id)}
                        avatarPos={positions.avatar}
                        cardPos={positions.cards}
                        isUser={!player.isBot}
                        gameState={gameState}
                    />
                );
            })}
        </div>
      </div>

      {/* Controls */}
      {userPlayer && userPlayer.status !== PlayerStatus.FOLDED && userPlayer.status !== PlayerStatus.ALL_IN && gameState.players[gameState.currentPlayerIndex]?.id === userPlayer.id && (
          <Controls 
            gameState={gameState}
            user={userPlayer}
            onAction={(action, amount) => handlePlayerAction(userPlayer.id, action, amount)}
            onGeminiAdvice={requestAdvice}
            isAdviceLoading={isAdviceLoading}
          />
      )}
      
      {/* Game Over / Restart Overlay */}
      {gameState.players.filter(p => p.status === PlayerStatus.ACTIVE).length < 2 && gameState.phase === GamePhase.WAITING && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-8 rounded-lg text-center border-2 border-yellow-500 shadow-2xl">
                  <h2 className="text-3xl text-white font-bold mb-4">{gameState.message}</h2>
                  <button 
                    onClick={initializeGame}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-full text-xl transition transform hover:scale-105"
                  >
                      Play Again
                  </button>
              </div>
          </div>
      )}

      {/* Advice Modal */}
      {showAdviceModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white text-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 border-4 border-purple-500 relative animate-fade-in-up">
            <button 
                onClick={() => setShowAdviceModal(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-600 text-white p-2 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <h3 className="text-xl font-bold">Coach's Advice</h3>
            </div>
            
            {isAdviceLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                    <p className="text-gray-600 animate-pulse">Analyzing table dynamics...</p>
                </div>
            ) : (
                <div className="prose">
                    <p className="text-lg leading-relaxed">{advice}</p>
                </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes confetti {
            0% { transform: translate(0,0) rotate(0deg); opacity: 1; }
            100% { transform: translate(var(--tx), var(--ty)) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
            animation-name: confetti;
            animation-timing-function: ease-out;
            animation-fill-mode: forwards;
        }
        @keyframes spin-slow {
            from { transform: rotate(0deg) scale(1.5); }
            to { transform: rotate(360deg) scale(1.5); }
        }
        .animate-spin-slow {
            animation: spin-slow 10s linear infinite;
        }
        .stroke-text-white {
            -webkit-text-stroke: 2px white;
        }
        .text-shadow {
            text-shadow: 2px 2px 0 #000;
        }
      `}</style>
    </div>
  );
};

export default App;
