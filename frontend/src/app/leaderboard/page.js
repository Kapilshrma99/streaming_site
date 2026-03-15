"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getLeaderboard } from "@/lib/api";
import { TrophyIcon } from "@heroicons/react/24/solid";

const rankBg = ["from-yellow-500 to-orange-400", "from-gray-400 to-gray-300", "from-orange-700 to-orange-600"];
const rankEmoji = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then((d) => setLeaders(d.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <TrophyIcon className="w-8 h-8 text-yellow-400" />
            <h1 className="text-4xl font-black gradient-text">Leaderboard</h1>
            <TrophyIcon className="w-8 h-8 text-yellow-400" />
          </div>
          <p className="text-gray-400">Top streamers ranked by gifts received</p>
        </div>

        {/* Top 3 Podium */}
        {!loading && leaders.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-10">
            {[leaders[1], leaders[0], leaders[2]].map((streamer, idx) => {
              const realIdx = [1, 0, 2][idx];
              const heights = ["h-28", "h-36", "h-24"];
              return (
                <Link key={streamer._id} href={`/profile/${streamer._id}`}
                  className={`flex flex-col items-center ${idx === 1 ? "scale-110" : ""} hover:scale-105 transition-transform`}>
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${rankBg[realIdx]} flex items-center justify-center text-xl font-black text-white mb-2 ring-4 ring-white/20`}>
                    {streamer.displayName?.[0] || streamer.username?.[0]}
                  </div>
                  <span className="text-xl mb-1">{rankEmoji[realIdx]}</span>
                  <div className={`${heights[idx]} w-24 rounded-t-2xl bg-gradient-to-b ${rankBg[realIdx]} flex flex-col items-center justify-end pb-3`}>
                    <span className="text-white font-bold text-xs truncate px-2 max-w-full">{streamer.displayName || streamer.username}</span>
                    <span className="text-white/80 text-xs">💎 {streamer.totalGiftsReceived}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Full List */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-dark-600">
            <h2 className="font-semibold text-white text-sm">All Rankings</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : leaders.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No data yet. Start streaming to earn gifts!</div>
          ) : (
            <div className="divide-y divide-dark-600">
              {leaders.map((streamer, idx) => (
                <Link key={streamer._id} href={`/profile/${streamer._id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-dark-700/50 transition-colors">
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${idx < 3 ? `bg-gradient-to-br ${rankBg[idx]} text-white` : "bg-dark-600 text-gray-400"}`}>
                    {idx < 3 ? rankEmoji[idx] : idx + 1}
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                    {streamer.displayName?.[0]?.toUpperCase() || streamer.username?.[0]?.toUpperCase()}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white truncate">{streamer.displayName || streamer.username}</span>
                      {streamer.isLive && <span className="live-badge text-xs py-0.5">LIVE</span>}
                    </div>
                    <div className="text-xs text-gray-500">@{streamer.username} · {streamer.followersCount || 0} followers</div>
                  </div>

                  {/* Diamonds */}
                  <div className="text-right">
                    <div className="font-bold text-yellow-400">💎 {(streamer.totalGiftsReceived || 0).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">diamonds</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
