import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { LinkPending } from "./link-pending";

const accents = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-50 text-violet-600",
};

export function StatCard({
  label,
  value,
  icon,
  accent = "blue",
  hint,
  href,
  onClick,
  selected,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent?: keyof typeof accents;
  hint?: ReactNode;
  /** Makes the card a link (e.g. a filter tab). */
  href?: string;
  /** Makes the card a button that filters in place (no page load). */
  onClick?: () => void;
  selected?: boolean;
}) {
  const body = (
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={cn("rounded-lg p-2", accents[accent])}>{icon}</div>
      </div>
  );
  const box = "block rounded-xl border bg-white p-4 shadow-sm";
  const interactive = cn(
    box,
    "relative w-full text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
    selected ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 hover:border-blue-300 hover:shadow-md",
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={interactive}>
        {body}
      </button>
    );
  }
  if (!href) return <div className={cn(box, "border-slate-200")}>{body}</div>;
  return (
    <Link href={href} scroll={false} aria-current={selected ? "page" : undefined} className={interactive}>
      {body}
      <LinkPending />
    </Link>
  );
}
