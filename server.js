const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server,{
  cors: {
    origin: "*"},
});

const PORT = process.env.PORT || 8080;

let rooms = {};

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("joinRoom", (roomName) => {
    if (!rooms[roomName]) {
      rooms[roomName] = { clients: [] };
    }

    if (rooms[roomName].clients.length >= 2) {
      socket.emit("roomFull", roomName);
      console.log(`Room ${roomName} is full. Client ${socket.id} cannot join.`);
      return;
    }

    socket.join(roomName);
    rooms[roomName].clients.push(socket.id);

    console.log(`#ConnectedClients - joinRoom => room: ${roomName}, count: ${rooms[roomName].clients.length}`);

    if (rooms[roomName].clients.length === 1) {
      socket.emit("created", roomName);
    } else {
      socket.emit("joined", roomName); // Emit 'joined' to the second client
      // Notify the first client that a peer has joined
      socket.to(roomName).emit("peerJoined", roomName); 
    }
  });

  socket.on("ready", (roomName) => {
    socket.to(roomName).emit("ready", roomName);
  });

  socket.on("offer", (data) => {
    socket.to(data.room).emit("offer", data);
  });

  socket.on("answer", (data) => {
    socket.to(data.room).emit("answer", data);
  });

  socket.on("candidate", (data) => {
    socket.to(data.room).emit("candidate", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    for (const [roomName, roomData] of Object.entries(rooms)) {
      const index = roomData.clients.indexOf(socket.id);
      if (index !== -1) {
        roomData.clients.splice(index, 1);
        io.to(roomName).emit("userDisconnected");
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});