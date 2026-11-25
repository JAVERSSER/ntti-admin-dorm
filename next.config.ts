import type { NextConfig } from "next";

// Every admin page reads live, per-request data behind authentication,
// so Cache Components are intentionally not enabled.
// Supabase Storage images are shown with plain <img> (signed URLs), so no images config is needed.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Payment QR uploads go through a Server Action (max 5 MB + form overhead).
    serverActions: { bodySizeLimit: "6mb" },
    // Keep visited pages in the browser for 30 s so switching back is instant.
    // Saving anything (approve, edit, delete…) clears this right away; the Refresh button does too.
    staleTimes: { dynamic: 30 },
    // Load a page in the background while the mouse is over its link, so the click opens it at once.
    dynamicOnHover: true,
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
