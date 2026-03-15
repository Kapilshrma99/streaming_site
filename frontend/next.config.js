/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["api.dicebear.com", "localhost"],
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
  async rewrites() {
    return [
      // Backend REST API
      { source: "/api/:path*", destination: "http://backend:4000/api/:path*" },
      // Payment service
      { source: "/payment/:path*", destination: "http://payment-service:6000/:path*" },
      // Chat Socket.IO — /ws-chat/ avoids conflict with Next.js page routes
      { source: "/ws-chat/:path*", destination: "http://chat-service:5000/:path*" },
      // Streaming WebRTC signaling — /ws-stream/ avoids conflict with /stream/[id] pages
      { source: "/ws-stream/:path*", destination: "http://streaming-server:7880/:path*" },
    ];
  },
};

module.exports = nextConfig;
