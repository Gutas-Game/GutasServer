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
app.use(express.json());

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
