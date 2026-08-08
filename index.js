const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// --- Express & Socket.io Setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Web UI Served directly
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AppleMC AFK Bot Console</title>
      <style>
        * { box-sizing: border-box; font-family: 'Courier New', monospace; }
        body { background-color: #0b0e14; color: #00ffcc; margin: 0; padding: 20px; }
        h2 { text-align: center; color: #00ffcc; margin-bottom: 20px; }
        #chat-box {
          width: 100%; height: 350px; background: #05070a;
          border: 1px solid #00ffcc; border-radius: 6px;
          padding: 15px; overflow-y: auto; margin-bottom: 15px;
          box-shadow: 0 0 10px rgba(0, 255, 204, 0.2);
        }
        .msg { margin: 6px 0; word-wrap: break-word; line-height: 1.4; }
        .sys { color: #ffaa00; }
        .input-box { display: flex; gap: 10px; }
        input {
          flex: 1; padding: 12px; background: #121824;
          border: 1px solid #00ffcc; color: #fff; font-size: 15px;
          border-radius: 4px; outline: none;
        }
        button {
          padding: 12px 24px; background: #00ffcc; color: #05070a;
          border: none; font-weight: bold; font-size: 15px;
          border-radius: 4px; cursor: pointer; transition: 0.2s;
        }
        button:hover { background: #00cca3; }
      </style>
    </head>
    <body>
      <h2>🎮 AppleMC AFK Bot Control Center</h2>
      <div id="chat-box"></div>
      <div class="input-box">
        <input type="text" id="msgInput" placeholder="Type a message or command (e.g. /login, /pay)..." />
        <button onclick="sendMsg()">Send</button>
      </div>

      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();
        const chatBox = document.getElementById('chat-box');
        const input = document.getElementById('msgInput');

        socket.on('chatMessage', (data) => {
          const div = document.createElement('div');
          div.className = 'msg' + (data.startsWith('[SYSTEM]') ? ' sys' : '');
          div.textContent = data;
          chatBox.appendChild(div);
          chatBox.scrollTop = chatBox.scrollHeight;
        });

        function sendMsg() {
          const text = input.value;
          if (text.trim()) {
            socket.emit('sendChatMessage', text);
            input.value = '';
          }
        }

        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') sendMsg();
        });
      </script>
    </body>
    </html>
  `);
});

// --- Mineflayer Bot Logic ---
function createBot() {
  const bot = mineflayer.createBot({
    host: 'play.applemc.fun',          // AppleMC IP
    username: 'trex12931', // 👈 Apne account ka username ya email daal
    auth: 'offline',                    // AppleMC cracked/offline mode allow karta hai toh 'offline', varna 'microsoft'
    version: false                      // Auto-detect server version
  });

  bot.on('spawn', () => {
    io.emit('chatMessage', '[SYSTEM]: Bot successfully connected & spawned in AppleMC!');
    
    // Anti-AFK Jump logic (Har 60 second me ek jump)
    setInterval(() => {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }, 60000);
  });

  // Minecraft Chat ko Web UI tak pahunchane ke liye
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    io.emit('chatMessage', `<${username}> ${message}`);
  });

  // System & Action bar messages capture karne ke liye
  bot.on('message', (jsonMsg) => {
    const str = jsonMsg.toString();
    if (str.trim()) {
      io.emit('chatMessage', str);
    }
  });

  bot.on('end', (reason) => {
    io.emit('chatMessage', `[SYSTEM]: Disconnected: ${reason}. Reconnecting in 10s...`);
    setTimeout(createBot, 10000);
  });

  bot.on('error', (err) => {
    console.log('Bot Error:', err);
    io.emit('chatMessage', `[SYSTEM ERROR]: ${err.message}`);
  });

  // Web Chat UI se game me message bhejne ka event
  io.removeAllListeners('connection');
  io.on('connection', (socket) => {
    socket.on('sendChatMessage', (msg) => {
      bot.chat(msg);
      io.emit('chatMessage', `<You (Web)> ${msg}`);
    });
  });
}

createBot();

// Web Server Listener
server.listen(PORT, () => {
  console.log(`Web Controller active on port ${PORT}`);
});
