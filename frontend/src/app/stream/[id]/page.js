"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import useAuthStore from "@/store/authStore";
import { getStream, joinStream, leaveStream, getGifts, sendGift } from "@/lib/api";
import { io } from "socket.io-client";
import {
  PaperAirplaneIcon,
  GiftIcon,
  UserGroupIcon,
  XMarkIcon,
  HeartIcon,
} from "@heroicons/react/24/solid";

const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_URL || "http://localhost/chat";
const STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL || "http://localhost/stream";

export default function WatchStreamPage() {
  const { id: streamId } = useParams();
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [gifts, setGifts] = useState([]);
  const [showGifts, setShowGifts] = useState(false);
  const [giftNotifs, setGiftNotifs] = useState([]);
  const [error, setError] = useState("");

  const chatSocketRef = useRef(null);
  const streamSocketRef = useRef(null);
  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const chatEndRef = useRef(null);
  const roomId = useRef(null);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load stream data
  useEffect(() => {
    loadStream();
  }, [streamId]);

  async function loadStream() {
    try {
      const data = await getStream(streamId);
      setStream(data.stream);
      roomId.current = data.stream.roomId;
      setViewerCount(data.stream.viewerCount || 0);
      if (data.stream.status !== "live") {
        setError("This stream has ended.");
        setLoading(false);
        return;
      }
      await joinStream(streamId);
      loadGifts();
      connectChat(data.stream.roomId);
      connectWebRTC(data.stream.roomId);
    } catch {
      setError("Stream not found.");
    } finally {
      setLoading(false);
    }
  }

  async function loadGifts() {
    try {
      const data = await getGifts();
      setGifts(data.gifts || []);
    } catch {}
  }

  function connectChat(room) {
    const socket = io(CHAT_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    chatSocketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_room", { roomId: room, username: user?.username, avatar: user?.avatar });
      // Load history
      socket.emit("get_history", { roomId: room }, ({ messages: hist }) => {
        setMessages(hist || []);
      });
    });

    socket.on("chat_message", (msg) => {
      setMessages((prev) => [...prev.slice(-200), msg]);
    });

    socket.on("viewer_count", ({ count }) => {
      setViewerCount(count);
    });

    socket.on("gift_received", (evt) => {
      setGiftNotifs((prev) => [...prev, { ...evt, key: Date.now() }]);
      setTimeout(() => {
        setGiftNotifs((prev) => prev.slice(1));
      }, 3500);
    });
  }

  function connectWebRTC(room) {
    const socket = io(STREAM_URL, { transports: ["websocket", "polling"] });
    streamSocketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("viewer", { roomId: room });
    });

    socket.on("viewer_joined", async ({ viewerId }) => {
      // This fires on the broadcaster side; ignore viewer here
    });

    socket.on("offer", async ({ broadcasterId, sdp }) => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      peerRef.current = pc;

      pc.ontrack = (e) => {
        if (videoRef.current && e.streams[0]) {
          videoRef.current.srcObject = e.streams[0];
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("ice_candidate", { targetId: broadcasterId, candidate: e.candidate });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { broadcasterId, sdp: pc.localDescription });
    });

    socket.on("ice_candidate", ({ candidate }) => {
      peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    });

    socket.on("stream_ended", () => {
      setError("The stream has ended.");
      if (videoRef.current) videoRef.current.srcObject = null;
    });
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveStream(streamId).catch(() => {});
      chatSocketRef.current?.disconnect();
      streamSocketRef.current?.disconnect();
      peerRef.current?.close();
    };
  }, [streamId]);

  const sendMessage = () => {
    if (!chatInput.trim() || !chatSocketRef.current) return;
    chatSocketRef.current.emit("chat_message", {
      roomId: roomId.current,
      message: chatInput.trim(),
      username: user?.username || "Guest",
      avatar: user?.avatar || "",
    });
    setChatInput("");
  };

  const handleSendGift = async (gift) => {
    if (!user) return router.push("/login");
    try {
      const result = await sendGift({ giftId: gift._id, streamId, recipientId: stream.hostId, quantity: 1 });
      chatSocketRef.current?.emit("send_gift", {
        roomId: roomId.current,
        gift,
        senderName: user.username,
        quantity: 1,
      });
      setShowGifts(false);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to send gift");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <span className="text-5xl">📺</span>
      <h2 className="text-xl font-bold text-white">{error}</h2>
      <button onClick={() => router.push("/")} className="btn-primary">Browse Streams</button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-4 py-6 gap-6">
        {/* Video + Controls */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Video */}
          <div className="relative aspect-video bg-dark-800 rounded-2xl overflow-hidden border border-dark-600">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {/* No video fallback */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center opacity-50">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-4xl font-bold mx-auto mb-3">
                  {stream?.hostUsername?.[0]?.toUpperCase()}
                </div>
                <p className="text-gray-400">Connecting to stream...</p>
              </div>
            </div>
            {/* Overlays */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="live-badge"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE</span>
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/60 backdrop-blur rounded-lg px-3 py-1.5">
              <UserGroupIcon className="w-4 h-4 text-gray-300" />
              <span className="text-sm text-white font-medium">{viewerCount}</span>
            </div>
            {/* Gift animations */}
            <div className="absolute bottom-6 left-4 space-y-2 pointer-events-none">
              {giftNotifs.map((notif) => (
                <div key={notif.key} className="animate-gift-pop flex items-center gap-2 bg-black/70 backdrop-blur rounded-xl px-3 py-2">
                  <span className="text-2xl">{notif.gift?.icon}</span>
                  <div>
                    <span className="text-xs font-semibold text-brand-400">{notif.senderName}</span>
                    <span className="text-xs text-gray-300"> sent {notif.quantity}x </span>
                    <span className="text-xs font-semibold text-white">{notif.gift?.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stream Info */}
          <div className="card p-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">{stream?.title}</h1>
              <p className="text-gray-400 text-sm mt-1">@{stream?.hostUsername}</p>
              {stream?.description && <p className="text-gray-400 text-sm mt-2">{stream.description}</p>}
            </div>
            {/* Gift button */}
            <button onClick={() => setShowGifts(!showGifts)} className="flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all shadow-lg shadow-orange-500/25">
              <GiftIcon className="w-4 h-4" />
              Send Gift
            </button>
          </div>

          {/* Gift Panel */}
          {showGifts && (
            <div className="card p-4 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Choose a Gift</h3>
                <button onClick={() => setShowGifts(false)}><XMarkIcon className="w-5 h-5 text-gray-400 hover:text-white" /></button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {gifts.map((gift) => (
                  <button key={gift._id} onClick={() => handleSendGift(gift)}
                    className="flex flex-col items-center gap-1.5 p-3 bg-dark-700 hover:bg-dark-600 border border-dark-500 hover:border-brand-500/50 rounded-xl transition-all hover:scale-105 group">
                    <span className="text-2xl group-hover:animate-bounce">{gift.icon}</span>
                    <span className="text-xs text-gray-400">{gift.name}</span>
                    <span className="text-xs font-bold text-yellow-400">🪙 {gift.coinCost}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        <div className="w-full lg:w-80 flex flex-col card overflow-hidden" style={{ height: "calc(100vh - 10rem)" }}>
          <div className="px-4 py-3 border-b border-dark-600 flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Live Chat</h3>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {viewerCount} watching
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2 text-sm animate-slide-up">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                  {msg.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <span className="font-semibold text-brand-400 text-xs">{msg.username} </span>
                  <span className="text-gray-300">{msg.message}</span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-dark-600">
            {user ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Say something..."
                  maxLength={500}
                  className="input py-2 text-sm flex-1"
                />
                <button onClick={sendMessage} className="btn-primary px-3 py-2">
                  <PaperAirplaneIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <a href="/login" className="btn-secondary w-full text-center text-sm block">
                Login to chat
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
