import { GoogleGenAI } from "@google/genai";
import { GameState, Player, Card, HandRank, Rank, Suit } from "../types";
import { evaluateHand } from "./pokerEngine";

// Use the new SDK pattern
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const formatCard = (c: Card) => `${Rank[c.rank]} of ${c.suit}`;

export const getStrategicAdvice = async (gameState: GameState, player: Player): Promise<string> => {
  const handEval = evaluateHand([...player.cards, ...gameState.communityCards]);
  const activeOpponents = gameState.players.filter(p => p.id !== player.id && p.status !== 'FOLDED').length;
  const potOdds = gameState.currentBet > 0 ? ((gameState.currentBet - player.currentBet) / (gameState.pot + (gameState.currentBet - player.currentBet))).toFixed(2) : "N/A";

  const prompt = `
    You are a professional world-class poker coach. Analyze this Texas Hold'em situation concisely and give the best move.
    
    Current Phase: ${gameState.phase}
    My Hole Cards: ${player.cards.map(formatCard).join(', ')}
    Community Cards: ${gameState.communityCards.map(formatCard).join(', ') || "None"}
    My Chip Stack: ${player.chips}
    Current Pot: ${gameState.pot}
    Active Opponents: ${activeOpponents}
    Cost to Call: ${gameState.currentBet - player.currentBet}
    My Hand Rank: ${handEval.rankName}
    
    Advise on whether to Fold, Check, Call, or Raise, and briefly explain why based on pot odds and hand strength. Keep it under 50 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I can't analyze the table right now. Trust your gut!";
  }
};
