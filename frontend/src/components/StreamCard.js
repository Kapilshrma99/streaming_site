"use client";
import Link from "next/link";
import { EyeIcon } from "@heroicons/react/24/solid";

export default function StreamCard({ stream }) {
  const { _id, title, hostUsername, hostAvatar, viewerCount, category, roomId } = stream;

  const avatarLetter = hostUsername?.[0]?.toUpperCase() || "?";

  return (
    <Link href={`/stream/${_id}`} className="group block">
      <div className="card overflow-hidden hover:border-brand-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/10 hover:scale-[1.01]">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gradient-to-br from-dark-700 via-dark-600 to-brand-900/50 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-3xl font-bold shadow-2xl">
              {avatarLetter}
            </div>
          </div>
          {/* Animated live overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-transparent to-transparent" />

          {/* LIVE Badge */}
          <div className="absolute top-2 left-2">
            <span className="live-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          </div>

          {/* Viewer count */}
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
            <EyeIcon className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-xs text-gray-200 font-medium">{viewerCount || 0}</span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-sm font-bold">
              {avatarLetter}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate group-hover:text-brand-400 transition-colors">
                {title}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 truncate">@{hostUsername}</p>
              {category && (
                <span className="inline-block mt-1 text-xs bg-brand-500/15 text-brand-400 px-2 py-0.5 rounded-full">
                  {category}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
