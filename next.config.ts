import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow hot module reloading when testing on mobile devices on your local network
  allowedDevOrigins: ["192.168.2.57", "localhost:3000"],

  // Wide-open CORS for local dev so mobile devices connecting through a
  // local proxy (e.g. ngrok) can hit the API routes.
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
