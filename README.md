# 🎥 TangoLive — Live Streaming Platform

A full-stack, Dockerized, microservices-based live streaming platform inspired by Tango Live.

## 🚀 Quick Start

```bash
docker compose up --build
```

Open [http://localhost](http://localhost) in your browser.

---

## 🏗 Project Architecture

```
tango_clone/
├── docker-compose.yml          # Orchestrates all 8 services
├── nginx/                      # Reverse proxy
├── frontend/                   # Next.js 14 + Tailwind CSS (port 3000)
├── backend/                    # Node.js + Express + MongoDB (port 4000)
├── chat-service/               # Socket.IO real-time chat (port 5000)
├── payment-service/            # Razorpay payment integration (port 6000)
└── streaming-server/           # WebRTC signaling server (port 7880)
```

## 🛠 Services

| Service            | Technology          | Port  | Description                    |
|--------------------|---------------------|-------|--------------------------------|
| `frontend`         | Next.js 14 + Tailwind | 3000 | React UI                      |
| `backend`          | Node.js + Express   | 4000  | REST API + JWT Auth           |
| `chat-service`     | Socket.IO           | 5000  | Real-time chat + gifts         |
| `payment-service`  | Razorpay SDK        | 6000  | Coin purchase & verification   |
| `streaming-server` | WebRTC Signaling    | 7880  | P2P stream relay               |
| `mongodb`          | MongoDB 7           | 27017 | Primary database               |
| `redis`            | Redis 7             | 6379  | Cache + chat history           |
| `nginx`            | Nginx 1.25          | 80    | Reverse proxy                  |

## 🌟 Features

- **Live Streaming** — Browser-based WebRTC P2P streaming (no external service required)
- **Real-time Chat** — Socket.IO chat with message history (stored in Redis)
- **Gift System** — 8 virtual gifts (Rose, Crown, Diamond, Rocket...), deducts coins, credits diamonds
- **Wallet** — Coins + Diamonds balance, Razorpay payments for buying coins
- **Follow System** — Follow/unfollow users with live counter updates
- **Leaderboard** — Top streamers ranked by gifts received (with 3-step podium)
- **User Profiles** — Bio, stats, follow button, live badge
- **JWT Auth** — Secure login/signup with 100 welcome coins

## 🔑 Environment Variables

Before running, update these values:

### `payment-service/.env`
```env
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
```

### `frontend/.env`
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
```

Get your Razorpay test keys at [dashboard.razorpay.com](https://dashboard.razorpay.com).

## 📡 API Endpoints

### Auth
- `POST /api/auth/signup` — Register (receives 100 free coins)
- `POST /api/auth/login` — Login, returns JWT
- `GET  /api/auth/me` — Get current user
- `GET  /api/auth/user/:id` — Get user profile

### Streams
- `GET  /api/streams` — List live streams (Redis cached, 30s TTL)
- `POST /api/streams` — Start stream
- `GET  /api/streams/:id` — Get stream
- `POST /api/streams/:id/join` — Join stream
- `POST /api/streams/:id/leave` — Leave stream  
- `PATCH /api/streams/:id/end` — End stream (host only)

### Gifts
- `GET  /api/gifts` — List gift catalog
- `POST /api/gifts/send` — Send gift (deducts coins, credits diamonds)

### Wallet
- `GET  /api/wallet/balance` — Get coin + diamond balance
- `GET  /api/wallet/transactions` — Transaction history (paginated)

### Follow
- `POST   /api/follow/:userId` — Follow user
- `DELETE /api/follow/:userId` — Unfollow user
- `GET    /api/follow/status/:userId` — Check follow status

### Leaderboard
- `GET /api/leaderboard` — Top streamers by diamonds

### Payment
- `GET  /payment/plans` — Coin packs (100/500/1000/3000 coins)
- `POST /payment/order` — Create Razorpay order
- `POST /payment/verify` — Verify payment + credit coins

## 🔌 Socket.IO Events (Chat Service)

| Event          | Direction        | Description              |
|----------------|------------------|--------------------------|
| `join_room`    | client → server  | Join stream room         |
| `chat_message` | bidirectional    | Send/receive chat        |
| `get_history`  | client → server  | Fetch last 50 messages   |
| `send_gift`    | client → server  | Trigger gift animation   |
| `gift_received`| server → room    | Broadcast gift event     |
| `viewer_count` | server → room    | Updated viewer count     |

## 🎬 WebRTC Events (Streaming Server)

| Event           | Description                |
|-----------------|----------------------------|
| `broadcaster`   | Host starts streaming      |
| `viewer`        | Viewer connects to room    |
| `offer`         | SDP offer (host → viewer)  |
| `answer`        | SDP answer (viewer → host) |
| `ice_candidate` | ICE candidate exchange     |
| `stream_ended`  | Broadcast when host leaves |

## 🗄 MongoDB Schemas

- **User** — username, email, password (bcrypt), coins, diamonds, followersCount, isLive
- **Stream** — title, hostId, status, viewerCount, roomId (UUID), category
- **Gift** — name, icon (emoji), coinCost, diamondValue, category
- **Transaction** — userId, type, amount, currency, metadata (Razorpay refs)
- **Follower** — followerId, followingId (unique compound index)

## 🪙 Coin Packs

| Pack     | Coins       | Price   |
|----------|-------------|---------|
| Starter  | 100         | ₹10     |
| Popular  | 500 + 50    | ₹45     |
| Pro      | 1000 + 200  | ₹80     |
| Elite    | 3000 + 1000 | ₹210    |
