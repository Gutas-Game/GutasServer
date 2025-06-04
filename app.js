const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
   cors: "*",
});

app.use(cors());

let waitingPlayer = null;
let games = new Map();
