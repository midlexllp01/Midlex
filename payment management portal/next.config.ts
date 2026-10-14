import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow HMR/dev assets when visiting the dev server from another device on the LAN.
  // Include both the active Wi‑Fi IP and the Hyper‑V default switch IP (often shown as "Network" in `next dev`).
  allowedDevOrigins: [
    "192.168.0.138",
    "192.168.0.138:3000",
    "172.20.10.3",
    "172.20.10.3:3000",
    "172.17.128.1",
    "172.17.128.1:3000",
    "192.168.18.4",
    "192.168.18.4:3000",
    "0.0.0.0",
    "0.0.0.0:3000",
  ],
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/about",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/contact",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/book-consultation",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/team",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/practice-areas/:path*",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/insights/:path*",
        destination: "/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

