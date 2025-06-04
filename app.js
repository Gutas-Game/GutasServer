const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
require("dotenv").config();
const { generateRPSRecommendation } = require("./geminiHelper");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
   cors: "*",
});

app.use(cors());
app.use(express.json()); // Untuk parsing JSON requests

// Health check endpoint
app.get("/api/health", (req, res) => {
   res.json({
      status: "ok",
      message: "Server is running",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
   });
});

let waitingPlayer = null;
let games = new Map();

function generateRoomId() {
   return Math.random().toString(36).substring(2, 8);
}

function determineWinner(choice1, choice2) {
   if (choice1 === choice2) return "tie";

   const winConditions = {
      rock: "scissors",
      paper: "rock",
      scissors: "paper",
   };

   return winConditions[choice1] === choice2 ? "win" : "lose";
}

io.on("connection", (socket) => {
   console.log("User connected:", socket.id);

   socket.on("joinGame", (username) => {
      if (waitingPlayer) {
         // Match with waiting player
         const roomId = generateRoomId();
         const waitingPlayerData = waitingPlayer; // Store reference before setting to null

         const game = {
            roomId,
            players: [
               {
                  id: waitingPlayerData.socket.id,
                  username: waitingPlayerData.username,
                  choice: null,
                  score: 0,
               },
               { id: socket.id, username, choice: null, score: 0 },
            ],
            round: 1,
         };

         games.set(roomId, game);

         // Join both players to room
         waitingPlayerData.socket.join(roomId);
         socket.join(roomId);

         // Notify both players
         waitingPlayerData.socket.emit("gameJoined", { roomId });
         socket.emit("gameJoined", { roomId });

         // Clear waiting player before setTimeout
         waitingPlayer = null;

         // Start game
         setTimeout(() => {
            io.to(roomId).emit("gameStart", {
               opponentName: game.players.find(
                  (p) => p.id === waitingPlayerData.socket.id
               ).username,
            });
            waitingPlayerData.socket.emit("gameStart", {
               opponentName: username,
            });
         }, 1000);
      } else {
         // Wait for opponent - store the socket instance
         waitingPlayer = { socket: socket, username };
         socket.emit("gameJoined", { roomId: "waiting" });
      }
   });

   socket.on("playerChoice", ({ choice, roomId }) => {
      const game = games.get(roomId);
      if (!game) return;

      const player = game.players.find((p) => p.id === socket.id);
      if (!player) return;

      player.choice = choice;

      // Check if both players made their choice
      if (game.players.every((p) => p.choice)) {
         const [player1, player2] = game.players;
         const result1 = determineWinner(player1.choice, player2.choice);
         const result2 =
            result1 === "tie" ? "tie" : result1 === "win" ? "lose" : "win";
         // Update scores
         if (result1 === "win") player1.score++;
         if (result2 === "win") player2.score++;

         // Send results
         io.to(player1.id).emit("roundResult", {
            result: result1,
            opponentChoice: player2.choice,
            playerChoice: player1.choice,
            scores: { player: player1.score, opponent: player2.score },
         });

         io.to(player2.id).emit("roundResult", {
            result: result2,
            opponentChoice: player1.choice,
            playerChoice: player2.choice,
            scores: { player: player2.score, opponent: player1.score },
         });

         // Reset choices for next round
         player1.choice = null;
         player2.choice = null;

         // Check if game is finished (7 rounds completed)
         if (game.round >= 7) {
            console.log("🏁 Game finished after 7 rounds!");
            // Determine final winner
            let finalResult1, finalResult2;

            if (player1.score > player2.score) {
               finalResult1 = "win";
               finalResult2 = "lose";
            } else if (player2.score > player1.score) {
               finalResult1 = "lose";
               finalResult2 = "win";
            } else {
               finalResult1 = "tie";
               finalResult2 = "tie";
            }

            console.log(
               `🏆 Final winner: ${
                  finalResult1 === "win"
                     ? player1.username
                     : finalResult2 === "win"
                     ? player2.username
                     : "TIE"
               }`
            );
            // Send game over results
            io.to(player1.id).emit("gameOver", {
               finalResult: finalResult1,
               finalScores: { player: player1.score, opponent: player2.score },
               playerName: player1.username,
               opponentName: player2.username,
            });
            io.to(player2.id).emit("gameOver", {
               finalResult: finalResult2,
               finalScores: { player: player2.score, opponent: player1.score },
               playerName: player2.username,
               opponentName: player1.username,
            });
            // Clean up game after sending results
            setTimeout(() => {
               console.log("🧹 Cleaning up game room:", roomId);
               games.delete(roomId);
            }, 5000);
         } else {
            // Only increment round if game is not finished
            game.round++;
            console.log(`➡️ Advancing to round ${game.round}`);
         }
      }
   });

   socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      // Handle waiting player disconnect
      if (waitingPlayer && waitingPlayer.socket.id === socket.id) {
         waitingPlayer = null;
      }

      // Handle game disconnect
      for (const [roomId, game] of games.entries()) {
         const playerIndex = game.players.findIndex((p) => p.id === socket.id);
         if (playerIndex !== -1) {
            const opponentId = game.players[1 - playerIndex].id;
            io.to(opponentId).emit("opponentDisconnected");
            games.delete(roomId);
            break;
         }
      }
   });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);
});
