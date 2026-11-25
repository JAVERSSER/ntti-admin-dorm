"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";
import type { ActionResult } from "@/lib/types";

/**
 * Run a server action from a client component: pending state, toast feedback,
 * field errors, and a router refresh on success.
 */
export function useAction<A extends unknown[], T>(
  action: (...args: A) => Promise<ActionResult<T>>,
  opts?: { onSuccess?: (data?: T) => void; refresh?: boolean; silent?: boolean },
) {
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const toast = useToast();
  const router = useRouter();

  function run(...args: A) {
    startTransition(async () => {
      try {
        const res = await action(...args);
        if (res.ok) {
          setFieldErrors({});
          if (!opts?.silent && res.message) toast.success(res.message);
          if (opts?.refresh !== false) router.refresh();
          opts?.onSuccess?.(res.data);
        } else {
          setFieldErrors(res.fieldErrors ?? {});
          toast.error(res.error);
        }
      } catch {
        toast.error("Network or server error. Please try again.");
      }
    });
  }

  return { run, pending, fieldErrors, setFieldErrors };
}
