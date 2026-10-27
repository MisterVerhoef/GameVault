import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server binds to 0.0.0.0 while browsers open 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
  // List pages read these at runtime instead of bundling games-index.json.
  outputFileTracingIncludes: {
    "/": ["./public/catalog/browse-index.json", "./public/catalog/search-index.json"],
    "/vault": ["./public/catalog/browse-index.json"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.igdb.com",
      },
      {
        protocol: "https",
        hostname: "**.igdb.com",
      },
      {
        protocol: "https",
        hostname: "cdn.cloudflare.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "shared.akamai.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "store-images.s-microsoft.com",
      },
      {
        protocol: "https",
        hostname: "image.api.playstation.com",
      },
      {
        protocol: "https",
        hostname: "www.nintendo.com",
      },
    ],
  },
};

export default nextConfig;
