const { GoogleGenAI } = require("@google/genai");

// Environment variable untuk API key (akan diset di .env file)
const apiKey = process.env.GEMINI_API_KEY;

// Check if API key is available
if (!apiKey || apiKey === "your_gemini_api_key_here") {
   console.warn(
      "Gemini API key not configured. AI recommendations will use fallback pattern analysis."
   );
}

const ai =
   apiKey && apiKey !== "your_gemini_api_key_here"
      ? new GoogleGenAI({ apiKey })
      : null;

async function generateRPSRecommendation(
   gameHistory,
   currentRound,
   playerName,
   opponentName
) {
   try {
      // Don't make recommendations for early rounds
      if (currentRound < 3 || gameHistory.length < 2) {
         return "";
      }

      // If API key is not configured, use fallback immediately
      if (!ai) {
         console.log(
            "Using fallback pattern analysis (API key not configured)"
         );
         return fallbackRecommendation(gameHistory, playerName);
      }

      // Format game history for AI analysis with player perspective
      const historyText = gameHistory
         .map(
            (game) =>
               `Round ${game.round}: ${playerName} played ${
                  game.playerChoice
               }, ${opponentName} played ${game.opponentChoice}, Result: ${
                  game.result === "win"
                     ? `${playerName} won`
                     : game.result === "lose"
                     ? `${opponentName} won`
                     : "Tie"
               }`
         )
         .join("\n");

      // Create player-specific analysis prompt
      const prompt = `You are an expert Rock Paper Scissors AI strategist providing personalized advice for ${playerName}. Analyze ${opponentName}'s gameplay pattern and recommend the optimal next move for ${playerName}.

GAME HISTORY FROM ${playerName}'S PERSPECTIVE:
${historyText}

PLAYER CONTEXT:
- You are advising: ${playerName}
- Analyzing opponent: ${opponentName}
- Current Round: ${currentRound} of 7
- Player ID: ${playerName}-${currentRound}-${Date.now() % 1000}

ANALYSIS TASK:
- Focus specifically on ${opponentName}'s patterns and weaknesses
- Consider ${playerName}'s previous performance against ${opponentName}
- Look for ${opponentName}'s psychological tendencies
- Account for round progression and pressure factors
- Provide strategy specifically tailored for ${playerName} vs ${opponentName}

IMPORTANT: Respond with ONLY ONE WORD: "rock", "paper", or "scissors" (lowercase, no quotes, no explanation).`;

      const response = await ai.models.generateContent({
         model: "gemini-1.5-flash",
         contents: prompt,
         config: {
            temperature: 0.7, // Higher temperature for more varied responses per player
            maxOutputTokens: 10, // Limit output to ensure single word response
         },
      }); // Safely handle the response
      const responseText =
         response?.text ||
         response?.candidates?.[0]?.content?.parts?.[0]?.text ||
         "";

      if (!responseText) {
         console.warn("Empty AI response, falling back to pattern analysis");
         return fallbackRecommendation(gameHistory, playerName);
      }

      const recommendation = responseText.trim().toLowerCase();

      // Validate the response is one of the valid choices
      if (["rock", "paper", "scissors"].includes(recommendation)) {
         return recommendation;
      } else {
         // Fallback to pattern analysis if AI response is invalid
         console.warn("Invalid AI response, falling back to pattern analysis");
         return fallbackRecommendation(gameHistory, playerName);
      }
   } catch (error) {
      console.error("Error generating AI recommendation:", error);
      // Fallback to simple pattern analysis
      return fallbackRecommendation(gameHistory, playerName);
   }
}

// Fallback function using enhanced pattern analysis with player differentiation
function fallbackRecommendation(gameHistory, playerName = "Player") {
   if (gameHistory.length < 2) return "";

   // Use player name hash to create different analysis approaches
   const playerHash = playerName
      .split("")
      .reduce((a, b) => a + b.charCodeAt(0), 0);
   const analysisType = playerHash % 3; // 0, 1, or 2

   // Analyze opponent's moves with different strategies
   const opponentMoves = gameHistory.map((h) => h.opponentChoice);
   const moveCount = { rock: 0, paper: 0, scissors: 0 };

   if (analysisType === 0) {
      // Strategy 1: Focus on recent moves (last 3)
      const recentMoves = opponentMoves.slice(-3);
      recentMoves.forEach((move) => moveCount[move]++);
   } else if (analysisType === 1) {
      // Strategy 2: Focus on winning moves
      const winningRounds = gameHistory.filter((h) => h.result === "lose"); // opponent won
      winningRounds.forEach((round) => moveCount[round.opponentChoice]++);
   } else {
      // Strategy 3: Focus on pattern breaks
      const allMoves = opponentMoves;
      allMoves.forEach((move) => moveCount[move]++);

      // Add randomization based on player name
      const choices = ["rock", "paper", "scissors"];
      const randomChoice = choices[playerHash % 3];
      moveCount[randomChoice] += 0.5; // Slight bias
   }

   // Find most frequent move with tie-breaking
   const mostFrequent = Object.keys(moveCount).reduce((a, b) => {
      if (moveCount[a] === moveCount[b]) {
         // Tie-breaker using player hash
         return playerHash % 2 === 0 ? a : b;
      }
      return moveCount[a] > moveCount[b] ? a : b;
   });

   // Counter the most frequent move
   const counter = {
      rock: "paper",
      paper: "scissors",
      scissors: "rock",
   };

   return counter[mostFrequent];
}

module.exports = { generateRPSRecommendation };
