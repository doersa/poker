
import { Card, Suit, Rank, HandRank, HandResult, Player, PlayerStatus, GameState, GamePhase, BotDifficulty } from '../types';

// --- Deck Management ---
const SUITS = [Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J, 12=Q, 13=K, 14=A

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({ suit, rank, id: `${rank}-${suit}` });
    });
  });
  return shuffleDeck(deck);
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// --- Hand Evaluation ---

const getRankValue = (rank: Rank): number => rank;

export const evaluateHand = (cards: Card[]): HandResult => {
  if (!cards || cards.length === 0) return { rank: HandRank.HIGH_CARD, rankName: 'High Card', score: 0, bestCards: [] };
  
  // Sort by rank descending
  const sorted = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));

  // Helpers
  const isFlush = (c: Card[]) => {
    const counts: Record<string, Card[]> = {};
    c.forEach(card => {
      if (!counts[card.suit]) counts[card.suit] = [];
      counts[card.suit].push(card);
    });
    for (const s in counts) {
      if (counts[s].length >= 5) return counts[s].slice(0, 5); // Already sorted
    }
    return null;
  };

  const isStraight = (c: Card[]) => {
    const uniqueRanks = Array.from(new Set(c.map(card => card.rank))).sort((a, b) => b - a);
    // Check normal straight
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
        // Find the actual cards
        const straightRanks = uniqueRanks.slice(i, i + 5);
        return straightRanks.map(r => c.find(card => card.rank === r)!);
      }
    }
    // Check Ace-low straight (A, 5, 4, 3, 2)
    if (uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
        const lowStraightRanks = [5, 4, 3, 2, 14]; // 5 high straight
        return lowStraightRanks.map(r => c.find(card => card.rank === r)!);
    }
    return null;
  };

  const getMultiples = (c: Card[]) => {
    const counts: Record<number, Card[]> = {};
    c.forEach(card => {
      if (!counts[card.rank]) counts[card.rank] = [];
      counts[card.rank].push(card);
    });
    const quads: Card[][] = [];
    const trips: Card[][] = [];
    const pairs: Card[][] = [];
    
    Object.values(counts).forEach(group => {
      if (group.length === 4) quads.push(group);
      if (group.length === 3) trips.push(group);
      if (group.length === 2) pairs.push(group);
    });
    
    // Sort groups by rank value
    quads.sort((a, b) => b[0].rank - a[0].rank);
    trips.sort((a, b) => b[0].rank - a[0].rank);
    pairs.sort((a, b) => b[0].rank - a[0].rank);

    return { quads, trips, pairs, counts };
  };

  const flushCards = isFlush(sorted);
  const straightCards = isStraight(sorted);
  
  // Straight Flush / Royal Flush
  if (flushCards) {
      const straightFlushCards = isStraight(flushCards);
      if (straightFlushCards) {
          if (straightFlushCards[0].rank === 14 && straightFlushCards[1].rank === 13) {
              return { rank: HandRank.ROYAL_FLUSH, rankName: 'Royal Flush', score: 9000000, bestCards: straightFlushCards };
          }
          return { 
            rank: HandRank.STRAIGHT_FLUSH, 
            rankName: 'Straight Flush', 
            score: 8000000 + straightFlushCards[0].rank, 
            bestCards: straightFlushCards 
          };
      }
  }

  const { quads, trips, pairs } = getMultiples(sorted);

  // Four of a Kind
  if (quads.length > 0) {
      const kicker = sorted.find(c => c.rank !== quads[0][0].rank)!;
      return { 
          rank: HandRank.FOUR_OF_A_KIND, 
          rankName: 'Four of a Kind', 
          score: 7000000 + quads[0][0].rank * 100 + kicker.rank, 
          bestCards: [...quads[0], kicker] 
      };
  }

  // Full House
  if (trips.length > 0 && (trips.length > 1 || pairs.length > 0)) {
      const trip = trips[0];
      const pair = trips.length > 1 ? trips[1].slice(0, 2) : pairs[0];
      return { 
          rank: HandRank.FULL_HOUSE, 
          rankName: 'Full House', 
          score: 6000000 + trip[0].rank * 100 + pair[0].rank, 
          bestCards: [...trip, ...pair] 
      };
  }

  // Flush
  if (flushCards) {
      return { 
          rank: HandRank.FLUSH, 
          rankName: 'Flush', 
          score: 5000000 + flushCards.reduce((acc, c, i) => acc + c.rank * Math.pow(15, 4 - i), 0), 
          bestCards: flushCards 
      };
  }

  // Straight
  if (straightCards) {
      return { 
          rank: HandRank.STRAIGHT, 
          rankName: 'Straight', 
          score: 4000000 + straightCards[0].rank, 
          bestCards: straightCards 
      };
  }

  // Three of a Kind
  if (trips.length > 0) {
      const kickers = sorted.filter(c => c.rank !== trips[0][0].rank).slice(0, 2);
      return { 
          rank: HandRank.THREE_OF_A_KIND, 
          rankName: 'Three of a Kind', 
          score: 3000000 + trips[0][0].rank * 1000 + kickers.reduce((acc, c) => acc + c.rank, 0), 
          bestCards: [...trips[0], ...kickers] 
      };
  }

  // Two Pair
  if (pairs.length >= 2) {
      const kicker = sorted.find(c => c.rank !== pairs[0][0].rank && c.rank !== pairs[1][0].rank)!;
      return { 
          rank: HandRank.TWO_PAIR, 
          rankName: 'Two Pair', 
          score: 2000000 + pairs[0][0].rank * 10000 + pairs[1][0].rank * 100 + kicker.rank, 
          bestCards: [...pairs[0], ...pairs[1], kicker] 
      };
  }

  // Pair
  if (pairs.length > 0) {
      const kickers = sorted.filter(c => c.rank !== pairs[0][0].rank).slice(0, 3);
      return { 
          rank: HandRank.PAIR, 
          rankName: 'Pair', 
          score: 1000000 + pairs[0][0].rank * 100000 + kickers.reduce((acc, c, i) => acc + c.rank * Math.pow(15, 2 - i), 0), 
          bestCards: [...pairs[0], ...kickers] 
      };
  }

  // High Card
  return { 
      rank: HandRank.HIGH_CARD, 
      rankName: 'High Card', 
      score: sorted.slice(0, 5).reduce((acc, c, i) => acc + c.rank * Math.pow(15, 4 - i), 0), 
      bestCards: sorted.slice(0, 5) 
  };
};

// --- Bot Logic ---

export const getBotAction = (player: Player, gameState: GameState, difficulty: BotDifficulty): { action: 'fold' | 'call' | 'check' | 'raise' | 'all-in', amount?: number } => {
  // Critical Safety Check
  if (!player || !player.cards || player.cards.length < 2) {
      return { action: 'fold' };
  }

  const { cards, chips } = player;
  const { currentBet, communityCards, pot, minRaise, phase } = gameState;
  
  const toCall = currentBet - (player.currentBet || 0);
  const hand = evaluateHand([...cards, ...communityCards]);

  // Safety fallback if hand evaluation fails to return expected structure
  if (!hand || !hand.bestCards) {
      return { action: 'fold' };
  }
  
  // -- Tuning Parameters based on Difficulty --
  let bluffProbability = 0;   // Chance to raise with a weak hand
  let tightness = 0;          // Higher = folds more medium hands
  let aggression = 0;         // Higher = raises more often with good hands
  let stickiness = 0;         // Higher = calls more often with marginal hands (Calling Station)

  // Random factor for this specific decision (0.0 to 1.0)
  const rng = Math.random();

  switch (difficulty) {
    case BotDifficulty.EASY:
      // Easy: "Loose Passive". Plays many hands, calls often, rarely raises/bluffs.
      bluffProbability = 0.05;
      tightness = 0.2; // Very loose
      aggression = 0.1; // Very passive
      stickiness = 0.8; // Calls almost anything
      break;
    
    case BotDifficulty.MEDIUM:
      // Medium: Balanced. Some bluffs, reasonable folds.
      bluffProbability = 0.15;
      tightness = 0.5;
      aggression = 0.5;
      stickiness = 0.5;
      break;
    
    case BotDifficulty.HARD:
      // Hard: "Tight Aggressive". Folds trash, bets strong, bluffs intelligently.
      bluffProbability = 0.30;
      tightness = 0.8; 
      aggression = 0.8;
      stickiness = 0.3; // Won't chase bad draws
      break;
  }

  // --- Pre-Flop Logic ---
  if (phase === GamePhase.PRE_FLOP) {
      const highCards = cards.filter(c => c.rank >= 10).length;
      const isPair = cards[0].rank === cards[1].rank;
      const isSuited = cards[0].suit === cards[1].suit;
      const isConnected = Math.abs(cards[0].rank - cards[1].rank) === 1;

      // 1. Premium Hands (AA, KK, QQ, AK)
      if (isPair && cards[0].rank >= 12 || (highCards === 2 && (isSuited || cards[0].rank >= 13))) {
          // Hard bots raise more aggressively here
          if (rng < aggression + 0.2) {
              const raiseAmt = Math.min(chips, currentBet + minRaise * (difficulty === BotDifficulty.HARD ? 4 : 2));
              return { action: 'raise', amount: raiseAmt };
          }
          return { action: 'call' };
      }

      // 2. Good Hands (Pairs, Suited Connectors, Two High Cards)
      if (isPair || (highCards === 2) || (isSuited && isConnected && highCards > 0)) {
          if (toCall <= minRaise * 3 || rng < stickiness) {
              // Occasional raise from aggressive bots
              if (rng < aggression * 0.4 && toCall === 0) return { action: 'raise', amount: minRaise * 2 };
              return { action: 'call' };
          }
      }

      // 3. Speculative Hands (Low Suited Connectors, Small Pairs)
      if ((isSuited && isConnected) || (isPair && cards[0].rank < 7)) {
          // Easy bots call these too often. Hard bots fold if expensive.
          if (toCall <= minRaise || (difficulty === BotDifficulty.EASY && toCall <= minRaise * 2)) {
               return { action: 'call' };
          }
      }

      // 4. Trash Hands
      if (toCall === 0) return { action: 'check' };
      // Easy bots might cold call trash sometimes
      if (difficulty === BotDifficulty.EASY && rng < 0.2 && toCall <= minRaise) return { action: 'call' };
      
      return { action: 'fold' };
  }

  // --- Post-Flop Logic ---
  
  const strength = hand.rank;
  const potOdds = toCall / (pot + toCall || 1); 

  // 1. Monster Hands (Two Pair or better)
  if (strength >= HandRank.TWO_PAIR) {
      // Slow play check?
      if (rng < 0.2 && difficulty === BotDifficulty.HARD) return { action: 'check' }; // Trapping
      
      if (rng < aggression + 0.3) {
           const raiseAmt = Math.min(chips, Math.max(minRaise, pot * (0.5 + Math.random() * 0.5)));
           return { action: 'raise', amount: raiseAmt };
      }
      return { action: 'call' };
  }
  
  // 2. Top Pair / Overpair (Simulated by Pair rank + high kicker logic simplified)
  if (strength === HandRank.PAIR && hand.bestCards.length > 0) {
      // Logic to guess if it's a "good" pair (e.g., rank > 10 or matches board high)
      // Simplified: If pair rank is > 9, treat as strong
      const pairRank = hand.bestCards[0].rank; 
      const isStrongPair = pairRank >= 10;

      if (isStrongPair) {
          if (toCall > pot * 0.7 && difficulty === BotDifficulty.HARD) return { action: 'fold' }; // Fold to huge bet
          if (rng < aggression && toCall < pot * 0.5) return { action: 'raise', amount: minRaise + pot * 0.3 };
          return { action: 'call' };
      } 
      
      // Weak Pair
      if (toCall === 0) return { action: 'check' };
      if (toCall < pot * 0.2 || rng < stickiness) return { action: 'call' };
      return { action: 'fold' };
  }

  // 3. Draws (Simplified: just checking if we have 4 to flush/straight)
  // Note: EvaluateHand doesn't return "almost flush", so we just use randomness for "semi-bluff"
  const isDraw = rng < 0.3; // Simulation of having a draw
  if (isDraw && difficulty === BotDifficulty.HARD) {
       if (rng < aggression && toCall < pot * 0.33) return { action: 'raise', amount: minRaise + pot * 0.4 }; // Semi-bluff
       if (potOdds < 0.3) return { action: 'call' };
  }

  // 4. Air / Weak Hand
  if (toCall === 0) {
      // Random Bluff attempt
      if (rng < bluffProbability) {
          return { action: 'raise', amount: minRaise + pot * 0.5 };
      }
      return { action: 'check' };
  }

  // Desperation / Bluff Raise
  if (difficulty !== BotDifficulty.EASY && rng < bluffProbability * 0.5) {
      return { action: 'raise', amount: Math.min(chips, pot) };
  }

  return { action: 'fold' };
};
