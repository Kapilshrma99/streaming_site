"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import useAuthStore from "@/store/authStore";
import { startStream, endStream } from "@/lib/api";
import { io } from "socket.io-client";
import { VideoCameraIcon, VideoCameraSlashIcon, MicrophoneIcon } from "@heroicons/react/24/solid";

const STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL || "http://localhost/stream";

export default function StartStreamPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [form, setForm] = useState({ title: "", description: "", category: "general" });
  const [isLive, setIsLive] = useState(false);
  const [streamData, setStreamData] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [error, setError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const peersRef = useRef({});

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    startCamera();
    return () => { stopAll(); };
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Don't echo self
      }
    } catch {
      setError("Camera/mic access denied. Please allow permissions.");
    }
  }

  function stopAll() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    socketRef.current?.disconnect();
    Object.values(peersRef.current).forEach((pc) => pc.close());
  }

  async function goLive() {
    if (!form.title.trim()) { setError("Please enter a stream title."); return; }
    setLoading(true);
    setError("");
    try {
      const data = await startStream(form);
      setStreamData(data);
      setIsLive(true);
      connectSignaling(data.roomId);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to start stream");
    } finally {
      setLoading(false);
    }
  }

  function connectSignaling(roomId) {
    const socket = io(STREAM_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("broadcaster", { roomId });
    });

    socket.on("viewer_joined", async ({ viewerId }) => {
      setViewerCount((v) => v + 1);
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peersRef.current[viewerId] = pc;

      streamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current);
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit("ice_candidate", { targetId: viewerId, candidate: e.candidate });
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { viewerId, sdp: pc.localDescription });
    });

    socket.on("answer", async ({ viewerId, sdp }) => {
      await peersRef.current[viewerId]?.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on("ice_candidate", async ({ fromId, candidate }) => {
      await peersRef.current[fromId]?.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    });

    socket.on("viewer_left", ({ viewerId }) => {
      setViewerCount((v) => Math.max(0, v - 1));
      peersRef.current[viewerId]?.close();
      delete peersRef.current[viewerId];
    });
  }

  async function handleEndStream() {
    if (!streamData?.stream?._id) return;
    setLoading(true);
    try {
      await endStream(streamData.stream._id);
      stopAll();
      setIsLive(false);
      router.push("/");
    } catch {
      setLoading(false);
    }
  }

  const toggleCamera = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCameraOn(!cameraOn); }
  };

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(!micOn); }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-white mb-6">
          {isLive ? (
            <span className="flex items-center gap-3">
              <span className="live-badge animate-pulse-slow">🔴 LIVE</span>
              <span className="gradient-text">{streamData?.stream?.title}</span>
            </span>
          ) : "Start Your Stream"}
        </h1>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm mb-6">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-dark-800 rounded-2xl overflow-hidden border border-dark-600">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {isLive && (
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="live-badge"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />LIVE</span>
                  <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-lg">👥 {viewerCount}</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={toggleCamera} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${cameraOn ? "bg-dark-700 text-white" : "bg-red-500/20 text-red-400 border border-red-500/40"}`}>
                {cameraOn ? <VideoCameraIcon className="w-4 h-4" /> : <VideoCameraSlashIcon className="w-4 h-4" />}
                {cameraOn ? "Camera" : "Camera Off"}
              </button>
              <button onClick={toggleMic} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${micOn ? "bg-dark-700 text-white" : "bg-red-500/20 text-red-400 border border-red-500/40"}`}>
                <MicrophoneIcon className="w-4 h-4" />
                {micOn ? "Mic" : "Mic Off"}
              </button>

              {isLive ? (
                <button onClick={handleEndStream} disabled={loading} className="ml-auto flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-xl transition-all">
                  {loading ? "Ending..." : "End Stream"}
                </button>
              ) : (
                <button onClick={goLive} disabled={loading} className="ml-auto btn-primary">
                  {loading ? "Going live..." : "🔴 Go Live"}
                </button>
              )}
            </div>
          </div>

          {/* Stream Setup */}
          {!isLive && (
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-white">Stream Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Title <span className="text-red-400">*</span></label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What are you streaming?" className="input text-sm" maxLength={100} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input text-sm">
                  {["general", "gaming", "music", "talk", "dance", "art", "sports", "education"].map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell viewers what to expect..." className="input text-sm resize-none" rows={3} maxLength={500} />
              </div>
            </div>
          )}

          {/* Live Stats */}
          {isLive && (
            <div className="space-y-4">
              <div className="card p-5 text-center">
                <div className="text-4xl font-black text-white">{viewerCount}</div>
                <div className="text-sm text-gray-400 mt-1">Live Viewers</div>
              </div>
              <div className="card p-4 text-sm text-gray-400">
                <p>🔗 Share your stream:</p>
                <code className="block mt-2 p-2 bg-dark-700 rounded text-xs text-brand-400 break-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}/stream/{streamData?.stream?._id}
                </code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
