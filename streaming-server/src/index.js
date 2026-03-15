require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/socket.io",
});

// Track rooms: roomId -> { broadcaster: socketId, viewers: Set<socketId> }
const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`🎥 Streaming socket connected: ${socket.id}`);

  // ── BROADCASTER: Start stream ──
  socket.on("broadcaster", ({ roomId }) => {
    if (!roomId) return;
    rooms.set(roomId, { broadcaster: socket.id, viewers: new Set() });
    socket.join(roomId);
    socket.currentRoom = roomId;
    socket.role = "broadcaster";
    console.log(`📡 Broadcaster started room: ${roomId}`);
    socket.emit("broadcaster_ready", { roomId });
  });

  // ── VIEWER: Join stream to watch ──
  socket.on("viewer", ({ roomId }) => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("stream_error", { message: "Stream not found or not live" });
      return;
    }

    room.viewers.add(socket.id);
    socket.join(roomId);
    socket.currentRoom = roomId;
    socket.role = "viewer";

    // Notify broadcaster that a viewer wants to connect
    io.to(room.broadcaster).emit("viewer_joined", { viewerId: socket.id });
    console.log(`👁️ Viewer ${socket.id} joined room: ${roomId}`);
  });

  // ── WebRTC: SDP Offer (Broadcaster → Viewer) ──
  socket.on("offer", ({ viewerId, sdp }) => {
    io.to(viewerId).emit("offer", { broadcasterId: socket.id, sdp });
  });

  // ── WebRTC: SDP Answer (Viewer → Broadcaster) ──
  socket.on("answer", ({ broadcasterId, sdp }) => {
    io.to(broadcasterId).emit("answer", { viewerId: socket.id, sdp });
  });

  // ── WebRTC: ICE Candidate exchange ──
  socket.on("ice_candidate", ({ targetId, candidate }) => {
    io.to(targetId).emit("ice_candidate", { fromId: socket.id, candidate });
  });

  // ── Disconnect ──
  socket.on("disconnect", () => {
    const roomId = socket.currentRoom;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    if (socket.role === "broadcaster") {
      // Notify all viewers that stream ended
      io.to(roomId).emit("stream_ended", { roomId });
      rooms.delete(roomId);
      console.log(`📴 Broadcaster left, room closed: ${roomId}`);
    } else if (socket.role === "viewer") {
      room.viewers.delete(socket.id);
      // Notify broadcaster that viewer left
      io.to(room.broadcaster).emit("viewer_left", { viewerId: socket.id });
    }
  });
});

// GET /rooms — list active rooms (optional admin endpoint)
app.get("/rooms", (req, res) => {
  const roomList = [];
  for (const [roomId, room] of rooms.entries()) {
    roomList.push({ roomId, viewerCount: room.viewers.size });
  }
  res.json({ rooms: roomList });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "streaming-server", activeRooms: rooms.size });
});

const PORT = process.env.PORT || 7880;
server.listen(PORT, () => {
  console.log(`🚀 WebRTC Signaling Server running on port ${PORT}`);
});
