
export enum Suit {
  HEARTS = '♥',
  DIAMONDS = '♦',
  CLUBS = '♣',
  SPADES = '♠'
}

export enum Rank {
  TWO = 2, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN, JACK, QUEEN, KING, ACE
}

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // Unique ID for React keys
}

export enum HandRank {
  HIGH_CARD = 0,
  PAIR,
  TWO_PAIR,
  THREE_OF_A_KIND,
  STRAIGHT,
  FLUSH,
  FULL_HOUSE,
  FOUR_OF_A_KIND,
  STRAIGHT_FLUSH,
  ROYAL_FLUSH
}

export interface HandResult {
  rank: HandRank;
  rankName: string;
  score: number; // For comparing hands of same rank
  bestCards: Card[];
}

export enum PlayerStatus {
  ACTIVE = 'ACTIVE',
  FOLDED = 'FOLDED',
  ALL_IN = 'ALL_IN',
  BUSTED = 'BUSTED',
  SITTING_OUT = 'SITTING_OUT'
}

export interface Player {
  id: number;
  name: string;
  isBot: boolean;
  chips: number;
  cards: Card[]; // 2 hole cards
  status: PlayerStatus;
  currentBet: number; // Bet in current round
  totalHandBet: number; // Total bet in this hand
  lastAction?: string;
  avatarSeed: string; // For generating consistent avatars
}

export enum GamePhase {
  PRE_FLOP = 'Pre-Flop',
  FLOP = 'Flop',
  TURN = 'Turn',
  RIVER = 'River',
  SHOWDOWN = 'Showdown',
  WAITING = 'Waiting'
}

export interface Pot {
  amount: number;
  eligiblePlayers: number[]; // Player IDs eligible for this pot
}

export enum BotDifficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export interface GameState {
  players: Player[];
  deck: Card[];
  communityCards: Card[];
  pot: number;
  currentBet: number; // The amount needed to call in this round
  minRaise: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  phase: GamePhase;
  winners: { playerId: number; amount: number; handName: string }[];
  message: string;
  difficulty: BotDifficulty;
}

// --- VFX Types ---

export interface GameEffect {
  id: number;
  type: 'TEXT' | 'CHIP' | 'CONFETTI' | 'WIN_BANNER';
  content?: string;
  subContent?: string; // For win details
  color?: string; // Tailwind color class e.g. 'text-red-500'
  startPos: { left: string, top: string }; // Position as % string
  endPos?: { left: string, top: string };
}
