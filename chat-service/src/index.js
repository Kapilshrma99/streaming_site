require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Redis = require("ioredis");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/socket.io",
});

const redis = new Redis(process.env.REDIS_URL, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
});
redis.on("connect", () => console.log("✅ Chat-Service Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err.message));

// Store room:viewers count in Redis
const getRoomViewerKey = (roomId) => `room:${roomId}:viewers`;
const getRoomMessagesKey = (roomId) => `room:${roomId}:messages`;

// JWT Auth middleware for Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    // Allow anonymous viewers
    socket.user = { id: null, username: "Guest", isGuest: true };
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: decoded.id, username: decoded.username || "User", isGuest: false };
    next();
  } catch (err) {
    socket.user = { id: null, username: "Guest", isGuest: true };
    next();
  }
});

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id} (${socket.user?.username || "Guest"})`);

  // ── JOIN STREAM ROOM ──
  socket.on("join_room", async ({ roomId, username, avatar }) => {
    if (!roomId) return;

    socket.join(roomId);
    socket.currentRoom = roomId;

    // Increment viewer count
    const viewerKey = getRoomViewerKey(roomId);
    const viewers = await redis.incr(viewerKey);
    await redis.expire(viewerKey, 86400);

    // Broadcast viewer count update
    io.to(roomId).emit("viewer_count", { roomId, count: viewers });

    // Notify room of new viewer
    socket.to(roomId).emit("user_joined", {
      userId: socket.user.id,
      username: username || socket.user.username,
      avatar: avatar || "",
      timestamp: new Date().toISOString(),
    });

    console.log(`👤 ${username || socket.user.username} joined room: ${roomId}`);
  });

  // ── LEAVE STREAM ROOM ──
  socket.on("leave_room", async ({ roomId }) => {
    if (!roomId) return;
    socket.leave(roomId);
    await decrementViewers(roomId);
  });

  // ── CHAT MESSAGE ──
  socket.on("chat_message", async ({ roomId, message, username, avatar }) => {
    if (!roomId || !message) return;
    if (message.trim().length === 0) return;
    if (message.length > 500) return;

    const msgObj = {
      id: `${Date.now()}-${socket.id}`,
      userId: socket.user.id,
      username: username || socket.user.username,
      avatar: avatar || "",
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    // Store last 100 messages in Redis
    const messagesKey = getRoomMessagesKey(roomId);
    await redis.lpush(messagesKey, JSON.stringify(msgObj));
    await redis.ltrim(messagesKey, 0, 99);
    await redis.expire(messagesKey, 86400);

    // Broadcast to all in room
    io.to(roomId).emit("chat_message", msgObj);
  });

  // ── GET CHAT HISTORY ──
  socket.on("get_history", async ({ roomId }, callback) => {
    if (!roomId) return;
    const messagesKey = getRoomMessagesKey(roomId);
    const raw = await redis.lrange(messagesKey, 0, 49);
    const messages = raw.map((m) => JSON.parse(m)).reverse();
    if (callback) callback({ messages });
  });

  // ── SEND GIFT (real-time notification) ──
  socket.on("send_gift", async ({ roomId, gift, senderName, senderAvatar, quantity = 1 }) => {
    if (!roomId || !gift) return;

    const giftEvent = {
      id: `gift-${Date.now()}-${socket.id}`,
      senderName: senderName || socket.user.username,
      senderAvatar: senderAvatar || "",
      gift,
      quantity,
      timestamp: new Date().toISOString(),
    };

    // Broadcast gift animation to all in room
    io.to(roomId).emit("gift_received", giftEvent);
    console.log(`🎁 Gift sent in room ${roomId}: ${quantity}x ${gift.name}`);
  });

  // ── DISCONNECT ──
  socket.on("disconnect", async () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
    if (socket.currentRoom) {
      await decrementViewers(socket.currentRoom);
    }
  });

  async function decrementViewers(roomId) {
    const viewerKey = getRoomViewerKey(roomId);
    const viewers = await redis.decr(viewerKey);
    const count = Math.max(0, viewers);
    if (viewers < 0) await redis.set(viewerKey, 0);
    io.to(roomId).emit("viewer_count", { roomId, count });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "chat-service" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Chat Service with Socket.IO running on port ${PORT}`);
});
