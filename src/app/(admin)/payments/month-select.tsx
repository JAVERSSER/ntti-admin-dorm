"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/field";

/** Month filter. Empty = current month (the default view); "all" = every month. */
export function MonthSelect({
  value,
  options,
  withAll = true,
}: {
  value: string;
  options: { value: string; label: string }[];
  withAll?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  return (
    <Select
      aria-label="Month"
      value={value}
      onChange={(e) => {
        const sp = new URLSearchParams(params.toString());
        sp.set("month", e.target.value);
        sp.delete("page");
        startTransition(() => router.replace(`${pathname}?${sp}`, { scroll: false }));
      }}
      className="w-full min-w-0 font-medium"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
      {withAll && <option value="all">All months</option>}
    </Select>
  );
}
