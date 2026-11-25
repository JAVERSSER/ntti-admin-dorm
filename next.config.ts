import type { NextConfig } from "next";

// Every admin page reads live, per-request data behind authentication,
// so Cache Components / partial prefetching are intentionally not enabled.
// Supabase Storage images are shown with plain <img> (signed URLs), so no images config is needed.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Payment QR uploads go through a Server Action (max 5 MB + form overhead).
    serverActions: { bodySizeLimit: "6mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
