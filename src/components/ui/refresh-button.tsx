"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "./button";
import { cn } from "./cn";

/** Re-fetches the current page's server data (e.g. to see newly submitted payments). */
export function RefreshButton({ label = "Refresh" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="secondary" size="sm" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
      <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
      {pending ? "Refreshing…" : label}
    </Button>
  );
}
