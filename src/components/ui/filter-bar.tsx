"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { Input, Select } from "./field";
import { cn } from "./cn";

export interface FilterDef {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

/** URL-driven search + filters (server components read searchParams). */
export function FilterBar({
  searchPlaceholder,
  filters = [],
  moreFilters = [],
  local = false,
  children,
}: {
  searchPlaceholder?: string;
  filters?: FilterDef[];
  /** Less-used filters, shown after pressing "More filters". */
  moreFilters?: FilterDef[];
  /** Filter in the browser: only the address bar changes, the server is not asked for a new page. */
  local?: boolean;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    const url = `${pathname}${sp.size ? `?${sp}` : ""}`;
    if (local) window.history.replaceState(null, "", url);
    else startTransition(() => router.replace(url, { scroll: false }));
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => update({ q: q.trim() }), local ? 120 : 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const moreActive = moreFilters.filter((f) => params.get(f.name)).length;
  const [showMore, setShowMore] = useState(moreActive > 0);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const morePanelRef = useRef<HTMLDivElement>(null);

  // Close "More filters" when clicking anywhere outside the button/panel, or pressing Escape.
  useEffect(() => {
    if (!showMore) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (moreBtnRef.current?.contains(t) || morePanelRef.current?.contains(t)) return;
      setShowMore(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowMore(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [showMore]);

  const active = [...filters, ...moreFilters].some((f) => params.get(f.name)) || params.get("q");

  function clearAll() {
    setQ("");
    update(Object.fromEntries([...filters, ...moreFilters].map((f) => [f.name, ""]).concat([["q", ""]])));
  }

  const renderSelect = (f: FilterDef) => (
    <Select
      key={f.name}
      aria-label={f.label}
      title={f.label}
      value={params.get(f.name) ?? ""}
      onChange={(e) => update({ [f.name]: e.target.value })}
      className={cn("w-full min-w-0 truncate", params.get(f.name) && "border-blue-300 bg-blue-50/60 font-medium text-blue-800")}
    >
      <option value="">{f.label}: All</option>
      {f.options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  );

  const hasControls = Boolean(children) || filters.length > 0 || moreFilters.length > 0;

  // Fixed layout so nothing jumps: search + (reserved) spinner/Clear on top, filters in an even grid below.
  return (
    <div className="space-y-3 border-b border-slate-100 p-4">
      <div className="flex items-center gap-2">
        {searchPlaceholder ? (
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
              aria-label="Search"
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Loader2 className={cn("h-4 w-4 animate-spin text-slate-400", !pending && "invisible")} aria-hidden={!pending} />
          <button
            type="button"
            onClick={clearAll}
            disabled={!active}
            className={cn(
              "inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800",
              !active && "invisible",
            )}
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      </div>
      {hasControls && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
          {children}
          {filters.map(renderSelect)}
          {moreFilters.length > 0 && (
            <button
              ref={moreBtnRef}
              type="button"
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition",
                showMore || moreActive ? "border-blue-300 bg-blue-50/60 text-blue-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              More filters
              {moreActive > 0 && <span className="rounded-full bg-blue-600 px-1.5 text-xs text-white">{moreActive}</span>}
            </button>
          )}
        </div>
      )}
      {showMore && moreFilters.length > 0 && (
        <div ref={morePanelRef} className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
          {moreFilters.map(renderSelect)}
        </div>
      )}
    </div>
  );
}
