import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Kantumruy_Pro } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Khmer letters: Geist has none, so the browser falls through to this font for them.
const khmer = Kantumruy_Pro({ variable: "--font-khmer", subsets: ["khmer"], display: "swap" });

export const metadata: Metadata = {
  title: "Dormitory Admin",
  description: "Dormitory payment management for administrators.",
  robots: { index: false, follow: false },
  icons: { icon: "/logo.png" },
};

// Same phone setup as the user app: fit the screen width, browser bar in the app colour.
export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${khmer.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-900">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
