import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./cn";

export const PAGE_SIZE = 20;

export function parsePage(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function Pagination({
  page,
  total,
  pageSize = PAGE_SIZE,
  basePath,
  searchParams,
}: {
  page: number;
  total: number;
  pageSize?: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k !== "page" && typeof v === "string" && v) sp.set(k, v);
    }
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const link = "inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
      <span>
        Showing <b className="text-slate-700">{from}</b>–<b className="text-slate-700">{to}</b> of{" "}
        <b className="text-slate-700">{total}</b>
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link className={link} href={href(page - 1)}><ChevronLeft className="h-3.5 w-3.5" /> Previous</Link>
        ) : (
          <span className={cn(link, "pointer-events-none opacity-50")}><ChevronLeft className="h-3.5 w-3.5" /> Previous</span>
        )}
        <span>Page {Math.min(page, pages)} / {pages}</span>
        {page < pages ? (
          <Link className={link} href={href(page + 1)}>Next <ChevronRight className="h-3.5 w-3.5" /></Link>
        ) : (
          <span className={cn(link, "pointer-events-none opacity-50")}>Next <ChevronRight className="h-3.5 w-3.5" /></span>
        )}
      </div>
    </div>
  );
}
