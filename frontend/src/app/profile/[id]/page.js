"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import StreamCard from "@/components/StreamCard";
import useAuthStore from "@/store/authStore";
import { getUser, getFollowStatus, followUser, unfollowUser, getStreams } from "@/lib/api";
import { UserGroupIcon, VideoCameraIcon, GiftIcon } from "@heroicons/react/24/outline";

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [streams, setStreams] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = me?._id === id;

  useEffect(() => {
    loadProfile();
  }, [id]);

  async function loadProfile() {
    try {
      const [userResp, allStreams] = await Promise.all([
        getUser(id),
        getStreams(),
      ]);
      setProfile(userResp.user);
      // Filter host's streams
      const hostStreams = (allStreams.streams || []).filter((s) => s.hostId === id);
      setStreams(hostStreams);

      if (me && me._id !== id) {
        const statusResp = await getFollowStatus(id);
        setIsFollowing(statusResp.isFollowing);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  async function handleFollow() {
    if (!me) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(id);
        setIsFollowing(false);
        setProfile((p) => ({ ...p, followersCount: (p.followersCount || 1) - 1 }));
      } else {
        await followUser(id);
        setIsFollowing(true);
        setProfile((p) => ({ ...p, followersCount: (p.followersCount || 0) + 1 }));
      }
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen"><Navbar />
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen"><Navbar />
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <span className="text-4xl">👤</span>
        <p className="text-gray-400">User not found</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="card p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-4xl font-black ring-4 ring-brand-500/30">
                {profile.displayName?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase()}
              </div>
              {profile.isLive && (
                <span className="absolute bottom-0 right-0 live-badge text-xs">LIVE</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-black text-white">{profile.displayName || profile.username}</h1>
              <p className="text-gray-400">@{profile.username}</p>
              {profile.bio && <p className="text-gray-300 mt-2 text-sm">{profile.bio}</p>}

              {/* Stats */}
              <div className="flex gap-6 mt-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{profile.followersCount || 0}</div>
                  <div className="text-xs text-gray-500">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{profile.followingCount || 0}</div>
                  <div className="text-xs text-gray-500">Following</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-400">{profile.totalGiftsReceived || 0}</div>
                  <div className="text-xs text-gray-500">💎 Gifts</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {!isOwnProfile && me && (
                <button onClick={handleFollow} disabled={followLoading}
                  className={isFollowing ? "btn-secondary" : "btn-primary"}>
                  {followLoading ? "..." : isFollowing ? "Unfollow" : "Follow"}
                </button>
              )}
              {isOwnProfile && (
                <a href="/stream/start" className="btn-primary">🔴 Go Live</a>
              )}
            </div>
          </div>
        </div>

        {/* Streams */}
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <VideoCameraIcon className="w-5 h-5 text-brand-400" />
          {isOwnProfile ? "Your Streams" : `Streams by ${profile.displayName || profile.username}`}
        </h2>
        {streams.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-500">No live streams right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {streams.map((s) => <StreamCard key={s._id} stream={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}
