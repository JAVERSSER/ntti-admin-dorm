"use client";

import { useMemo, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/components/ui/cn";
import { SubmissionCard } from "./submission-card";
import type { PaymentSubmission } from "@/lib/types";

const PAGE_SIZE = 24;
/** Paid = approved (every ABA PayWay payment). Not paid = pending or rejected screenshot uploads. */
type Tab = "paid" | "notpaid";
const isPaid = (r: PaymentSubmission) => r.status === "approved";

export type BoardRow = PaymentSubmission & {
  imageUrl: string | null;
  forMonthLabel: string;
  submittedAt: string;
  reviewedAtLabel: string | null;
};

/**
 * Paid / Not paid tabs and paging run in the browser: the server sends every payment that
 * matches the month / room / search once, so switching tabs needs no page load.
 */
export function PaymentsBoard({
  rows,
  periodLabel,
  filtered,
  toolbar,
}: {
  rows: BoardRow[];
  periodLabel: string;
  /** True when a room or search filter is set. */
  filtered: boolean;
  toolbar: ReactNode;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const statusParam = params.get("status") ?? "";
  const tab: Tab = statusParam === "notpaid" ? "notpaid" : "paid";
  const pageParam = Number(params.get("page"));

  const paidCount = useMemo(() => rows.filter(isPaid).length, [rows]);
  const visible = useMemo(() => rows.filter((r) => isPaid(r) === (tab === "paid")), [rows, tab]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? Math.min(pageParam, pages) : 1;
  const shown = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Update the address bar without asking the server for a new page.
  function go(next: { status?: Tab; page?: number }) {
    const sp = new URLSearchParams(params.toString());
    if (next.status !== undefined) {
      if (next.status === "paid") sp.delete("status");
      else sp.set("status", next.status);
      sp.delete("page");
    }
    if (next.page !== undefined) {
      if (next.page > 1) sp.set("page", String(next.page));
      else sp.delete("page");
    }
    window.history.pushState(null, "", sp.size ? `${pathname}?${sp}` : pathname);
  }

  const from = visible.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(visible.length, page * PAGE_SIZE);
  const pageBtn = "inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50";

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="Paid" value={paidCount} icon={<CheckCircle2 className="h-5 w-5" />} accent="green" hint={periodLabel} onClick={() => go({ status: "paid" })} selected={tab === "paid"} />
        <StatCard label="Not paid" value={rows.length - paidCount} icon={<XCircle className="h-5 w-5" />} accent="red" hint={periodLabel} onClick={() => go({ status: "notpaid" })} selected={tab === "notpaid"} />
      </div>

      <Card>
        {toolbar}

        {shown.length === 0 ? (
          !filtered ? (
            <EmptyState title={tab === "paid" ? "No payments yet" : "Nothing here"} description={tab === "paid" ? `No one has paid for ${periodLabel} yet.` : `Every payment for ${periodLabel} is paid.`} />
          ) : (
            <EmptyState title="No payments found" description="Try another tab or month, or clear the filters." />
          )
        ) : (
          <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {shown.map((r) => (
              <SubmissionCard
                key={r.id}
                submission={r}
                imageUrl={r.imageUrl}
                forMonth={r.forMonthLabel}
                submittedAt={r.submittedAt}
                reviewedAt={r.reviewedAtLabel}
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>
            Showing <b className="text-slate-700">{from}</b>–<b className="text-slate-700">{to}</b> of{" "}
            <b className="text-slate-700">{visible.length}</b>
          </span>
          <div className="flex items-center gap-2">
            <button type="button" className={pageBtn} disabled={page <= 1} onClick={() => go({ page: page - 1 })}>
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span>Page {page} / {pages}</span>
            <button type="button" className={cn(pageBtn)} disabled={page >= pages} onClick={() => go({ page: page + 1 })}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}
