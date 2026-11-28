// Grey placeholder pieces shown while a page loads (see each page's loading.tsx).
// They use the same sizes, borders and spacing as the real PageHeader, StatCard,
// FilterBar, Table and Card, so the page does not jump when the data arrives.
import type { ReactNode } from "react";
import { cn } from "./cn";

export function Bone({ className }: { className?: string }) {
  return <div className={cn("rounded bg-slate-200/80", className)} />;
}

export function SkeletonPage({ children }: { children: ReactNode }) {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      {children}
    </div>
  );
}

/** Same layout as PageHeader: title + description on the left, buttons on the right. */
export function SkeletonHeader({ buttons = 1 }: { buttons?: number }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-2">
        <Bone className="h-7 w-36 rounded-md sm:h-8" />
        <Bone className="h-4 w-80 max-w-[80vw] bg-slate-200/60" />
      </div>
      {buttons > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: buttons }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-10 rounded-lg",
                i === buttons - 1 ? "w-28 bg-blue-200/70" : "w-24 border border-slate-200 bg-white",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Same as StatCard: label, big number, icon box on the right. */
export function SkeletonStats({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn("mb-6 grid grid-cols-2 gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2.5">
              <Bone className="h-3 w-16 bg-slate-200/60" />
              <Bone className="h-7 w-12" />
              <Bone className="h-3 w-24 bg-slate-200/50" />
            </div>
            <div className="h-9 w-9 rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

/** Same as FilterBar: search box on top, filter dropdowns in a grid below. */
export function SkeletonFilterBar({ selects = 0 }: { selects?: number }) {
  return (
    <div className="space-y-3 border-b border-slate-100 p-4">
      <div className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 lg:max-w-md" />
      {selects > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
          {Array.from({ length: selects }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg border border-slate-200 bg-slate-50" />
          ))}
        </div>
      )}
    </div>
  );
}

/** Same as Table: grey header row, then rows with dividers. `cols` are the cell widths (Tailwind classes). */
export function SkeletonTable({ cols, rows = 8, actions = true }: { cols: string[]; rows?: number; actions?: boolean }) {
  return (
    <div className="overflow-hidden">
      <div className="flex items-center gap-6 border-b border-slate-200 bg-slate-50 px-4 py-3.5">
        {cols.map((w, i) => (
          <Bone key={i} className={cn("h-3 bg-slate-200", w)} />
        ))}
        {actions && <Bone className="ml-auto h-3 w-14 bg-slate-200" />}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 px-4 py-3.5">
            {cols.map((w, i) => (
              <Bone key={i} className={cn("h-4", w, i === 0 ? "bg-slate-200" : "bg-slate-100")} />
            ))}
            {actions && (
              <div className="ml-auto flex gap-1">
                <div className="h-8 w-12 rounded-lg bg-slate-100" />
                <div className="h-8 w-14 rounded-lg bg-slate-100" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Same as the Payments footer: "Showing x–y of z" and Previous / Next. */
export function SkeletonPager() {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <Bone className="h-3 w-32 bg-slate-100" />
      <div className="flex items-center gap-2">
        <div className="h-8 w-20 rounded-lg border border-slate-200" />
        <Bone className="h-3 w-14 bg-slate-100" />
        <div className="h-8 w-16 rounded-lg border border-slate-200" />
      </div>
    </div>
  );
}
