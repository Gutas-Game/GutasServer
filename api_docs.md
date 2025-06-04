## REST API Endpoints
### Health Check
- Endpoint : GET /api/health
- Deskripsi : Memeriksa status server
- Response:
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2023-06-15T12:34:56.789Z",
  "uptime": 123.456
}

### AI Recommendation
- Endpoint : POST /api/ai-recommendation
- Deskripsi : Mendapatkan rekomendasi langkah selanjutnya dari AI untuk game Rock-Paper-Scissors
- Request Body: 
{
  "gameHistory": [
    {
      "round": 1,
      "playerChoice": "rock",
      "opponentChoice": "scissors",
      "result": "win"
    },
    // ... riwayat permainan lainnya
  ],
  "currentRound": 3,
  "playerName": "Player1",
  "opponentName": "Player2"
}

Required Parameters :
- gameHistory : Array riwayat permainan sebelumnya
- currentRound : Nomor ronde saat ini
- playerName : Nama pemain yang meminta rekomendasi
- opponentName : Nama lawan

- Response Success :
{
  "recommendation": "rock" // atau "paper" atau "scissors"
}

-Response Error (400)
{
  "error": "Missing required parameters",
  "required": ["gameHistory", "currentRound", "playerName", "opponentName"]
}

- Response Fallback (jika AI tidak tersedia):
{
  "recommendation": "rock", // atau "paper" atau "scissors"
  "error": "AI temporarily unavailable, using fallback recommendation",
  "fallback": true
}

## Socket.IO Events
### Connection Events Client -> Server
- Event : connection
- Deskripsi : Terjadi ketika client terhubung ke server Server -> Client
- Event : disconnect
- Deskripsi : Terjadi ketika client terputus dari server
- Handler : Membersihkan data pemain yang terputus dan memberitahu lawan jika dalam permainan

### Game Events Client -> Server
1. Event : joinGame
   
   - Data : username (string)
   - Deskripsi : Pemain meminta untuk bergabung ke permainan
   - Proses :
     - Jika ada pemain yang menunggu, kedua pemain akan dimasukkan ke room yang sama
     - Jika tidak ada pemain yang menunggu, pemain akan masuk ke status menunggu
2. Event : playerChoice
Data: 
{
  "choice": "rock", // atau "paper" atau "scissors"
  "roomId": "abc123"
}
- Deskripsi : Pemain mengirimkan pilihannya untuk ronde saat ini
- Proses :
- Menyimpan pilihan pemain
- Jika kedua pemain sudah memilih, menentukan pemenang dan mengirim hasil

Server -> Client
1. Event : gameJoined
- Data :
{
  "roomId": "abc123" // atau "waiting" jika menunggu lawan
}
- Deskripsi : Konfirmasi pemain telah bergabung ke permainan atau sedang menunggu

2. Event : gameStart
- Data :
{
  "opponentName": "Player2"
}
- Deskripsi : Permainan dimulai dengan lawan yang telah terhubung

3. Event : roundResult
- Data :
{
  "result": "win", // atau "lose" atau "tie"
  "opponentChoice": "scissors",
  "playerChoice": "rock",
  "scores": {
    "player": 1,
    "opponent": 0
  }
}
Deskripsi : Hasil dari ronde saat ini

4. Event : gameOver
- Data :
{
  "finalResult": "win", // atau "lose" atau "tie"
  "finalScores": {
    "player": 4,
    "opponent": 3
  },
  "playerName": "Player1",
  "opponentName": "Player2"
}

5. Event : opponentDisconnected
- Data : Tidak ada
- Deskripsi : Dikirim ketika lawan terputus dari permainan