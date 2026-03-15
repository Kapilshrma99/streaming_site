"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import StreamCard from "@/components/StreamCard";
import { getStreams } from "@/lib/api";
import { MagnifyingGlassIcon, FireIcon, SparklesIcon } from "@heroicons/react/24/outline";

const CATEGORIES = ["All", "Gaming", "Music", "Talk", "Dance", "Art", "Sports", "Education"];

export default function Home() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    fetchStreams();
    const interval = setInterval(fetchStreams, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchStreams() {
    try {
      const data = await getStreams();
      setStreams(data.streams || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = streams.filter((s) => {
    const matchesSearch = s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.hostUsername?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === "All" || s.category?.toLowerCase() === category.toLowerCase();
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-900/40 via-purple-900/30 to-dark-900 border-b border-white/5">
        <div className="absolute inset-0 bg-[url('https://api.dicebear.com/7.x/shapes/svg?seed=tango')] opacity-5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <FireIcon className="w-6 h-6 text-brand-400 animate-pulse" />
            <span className="text-brand-400 font-semibold text-sm uppercase tracking-widest">Trending Now</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            Watch Live <span className="gradient-text">Streams</span>
          </h1>
          <p className="text-gray-400 text-lg mb-8 max-w-xl">
            Connect with your favorite creators in real-time. Send gifts, chat, and share the moment.
          </p>

          {/* Search */}
          <div className="relative max-w-lg">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search streams or creators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-11 bg-dark-800/80 backdrop-blur-sm"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                category === cat
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                  : "bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600 border border-dark-500"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Streams Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="aspect-video bg-dark-700" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-dark-700 rounded w-3/4" />
                  <div className="h-3 bg-dark-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <SparklesIcon className="w-16 h-16 text-brand-500/30 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No streams right now</h3>
            <p className="text-gray-400 mb-6">Be the first to go live!</p>
            <a href="/stream/start" className="btn-primary">🔴 Start Streaming</a>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{filtered.length} Live</span>
                <span className="text-gray-500">streams</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Auto-refreshing
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filtered.map((stream) => (
                <StreamCard key={stream._id} stream={stream} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
