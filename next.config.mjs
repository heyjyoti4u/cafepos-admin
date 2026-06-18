import withPWAInit from "@ducanh2912/next-pwa";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Local dev mein pareshan nahi karega
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
}

export default withPWA(nextConfig);
