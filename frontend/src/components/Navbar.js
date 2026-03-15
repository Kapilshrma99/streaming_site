"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import useAuthStore from "@/store/authStore";
import {
  VideoCameraIcon,
  TrophyIcon,
  WalletIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const navLinks = [
  { href: "/", label: "Discover", icon: null },
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon },
  { href: "/wallet", label: "Wallet", icon: WalletIcon },
];

export default function Navbar() {
  const { user, logout, initAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
              <VideoCameraIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">TangoLive</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === href
                    ? "bg-brand-500/20 text-brand-400"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Coin balance */}
                <div className="hidden sm:flex items-center gap-1.5 bg-dark-700 border border-dark-500 px-3 py-1.5 rounded-lg">
                  <span className="text-yellow-400 text-sm">🪙</span>
                  <span className="text-sm font-semibold text-white">{user.coins ?? 0}</span>
                </div>

                {/* Start Stream */}
                <Link href="/stream/start" className="hidden sm:block btn-primary text-sm py-2 px-4">
                  Go Live
                </Link>

                {/* Profile */}
                <Link href={`/profile/${user._id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-xs font-bold ring-2 ring-brand-500/30">
                    {user.displayName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || "U"}
                  </div>
                </Link>

                {/* Logout */}
                <button onClick={handleLogout} className="hidden sm:flex items-center gap-1 text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="btn-secondary text-sm py-2">Login</Link>
                <Link href="/signup" className="btn-primary text-sm py-2">Sign Up</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors">
              {menuOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/5 bg-dark-900/95 backdrop-blur-md px-4 py-4 space-y-2">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all"
            >
              {Icon && <Icon className="w-4 h-4" />}
              {label}
            </Link>
          ))}
          {user && (
            <Link href="/stream/start" onClick={() => setMenuOpen(false)} className="btn-primary w-full text-center block mt-3">
              🔴 Go Live
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
