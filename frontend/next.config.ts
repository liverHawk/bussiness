import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "example.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "picsum.photos", port: "", pathname: "/**" },
      { protocol: "https", hostname: "cdn.discordapp.com", port: "", pathname: "/**" },
    ]
  }
};

export default nextConfig;
