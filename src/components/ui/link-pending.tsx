"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/** Spinner shown inside a <Link> while its navigation is loading. Must be rendered as a descendant of the Link. */
export function LinkPending({ className = "h-5 w-5" }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span role="status" aria-label="Loading" className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60">
      <Loader2 className={`${className} animate-spin text-blue-600`} />
    </span>
  );
}
