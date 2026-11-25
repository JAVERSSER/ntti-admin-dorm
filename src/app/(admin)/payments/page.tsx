import { CheckCircle2, Clock, Receipt, XCircle } from "lucide-react";
import { after } from "next/server";
import { cleanupOldPayments } from "@/lib/cleanup";
import { createClient } from "@/lib/supabase/server";
import { currentMonth, formatDateTime, formatMonth, formatNumber, keptMonths, monthRange, sanitizeSearch } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { StatCard } from "@/components/ui/stat-card";
import { RefreshButton } from "@/components/ui/refresh-button";
import { EmptyState, ErrorNotice } from "@/components/ui/empty-state";
import { Pagination, parsePage } from "@/components/ui/pagination";
import { MonthSelect } from "./month-select";
import { SubmissionCard } from "./submission-card";
import type { PaymentSubmission, SubmissionStatus } from "@/lib/types";


const PAGE_SIZE = 24;
const STATUSES: SubmissionStatus[] = ["pending", "approved", "rejected"];
type Tab = SubmissionStatus | "all";

function one(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  const sp = await searchParams;
  // Only this month and last month are kept; older payments are deleted automatically.
  after(() => cleanupOldPayments().catch(() => {}));
  const months = keptMonths();
  const monthParam = one(sp.month) || currentMonth();
  const month = monthParam === "all" || months.some((m) => m.value === monthParam) ? monthParam : currentMonth();
  const range = month === "all" ? null : monthRange(month);
  // The page opens on "pending": the payments still waiting for a decision.
  const tab: Tab = one(sp.status) === "all" || STATUSES.includes(one(sp.status) as SubmissionStatus) ? (one(sp.status) as Tab) : "pending";
  const status = tab === "all" ? "" : tab;
  const room = one(sp.room);
  const q = sanitizeSearch(one(sp.q));
  const page = parsePage(sp.page);

  const supabase = await createClient();

  // The list and the month summary share every filter except status.
  let list = supabase.from("payment_submissions").select("*", { count: "exact" });
  let summary = supabase.from("payment_submissions").select("status");
  const equals: [string, string][] = [];
  if (room) equals.push(["room", room]);
  for (const [column, value] of equals) {
    list = list.eq(column, value);
    summary = summary.eq(column, value);
  }
  // "All months" = the kept months only, even before the cleanup has run.
  const since = `${months.at(-1)!.value}-01`;
  if (range) {
    list = list.eq("for_month", `${month}-01`);
    summary = summary.eq("for_month", `${month}-01`);
  } else {
    list = list.gte("for_month", since);
    summary = summary.gte("for_month", since);
  }
  if (q) {
    const search = `student_name.ilike.%${q}%,reference.ilike.%${q}%`;
    list = list.or(search);
    summary = summary.or(search);
  }
  if (status) list = list.eq("status", status);

  const [listRes, summaryRes, roomsRes] = await Promise.all([
    list.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    summary,
    supabase.from("rooms").select("name").order("name"),
  ]);

  const rows = (listRes.data ?? []) as PaymentSubmission[];
  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const r of (summaryRes.data ?? []) as { status: SubmissionStatus }[]) counts[r.status] += 1;
  const total = counts.pending + counts.approved + counts.rejected;

  // Short-lived links so private screenshots can be shown in the browser.
  const urls = new Map<string, string>();
  if (rows.length) {
    const { data: signed } = await supabase.storage.from("payment-slips").createSignedUrls(rows.map((r) => r.slip_path), 60 * 60);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }

  const periodLabel = range ? range.label : `${months[1].label} – ${months[0].label}`;

  const tabHref = (t: Tab) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "page" && k !== "status") next.set(k, v);
    if (t !== "pending") next.set("status", t);
    return next.size ? `/payments?${next}` : "/payments";
  };

  return (
    <>
      <PageHeader title="Payments" description={`Payment screenshots submitted by residents · paying for ${periodLabel}`} actions={<RefreshButton />} />
      {(listRes.error || summaryRes.error) && <ErrorNotice message={(listRes.error ?? summaryRes.error)!.message} />}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending review" value={formatNumber(counts.pending)} icon={<Clock className="h-5 w-5" />} accent="amber" href={tabHref("pending")} selected={tab === "pending"} hint="Needs your check" />
        <StatCard label="Approved" value={formatNumber(counts.approved)} icon={<CheckCircle2 className="h-5 w-5" />} accent="green" href={tabHref("approved")} selected={tab === "approved"} />
        <StatCard label="Rejected" value={formatNumber(counts.rejected)} icon={<XCircle className="h-5 w-5" />} accent="red" href={tabHref("rejected")} selected={tab === "rejected"} />
        <StatCard label="All submitted" value={formatNumber(total)} icon={<Receipt className="h-5 w-5" />} accent="blue" hint={periodLabel} href={tabHref("all")} selected={tab === "all"} />
      </div>

      <Card>
        <FilterBar
          searchPlaceholder="Search name or reference…"
          filters={[{ name: "room", label: "Room", options: (roomsRes.data ?? []).map((r) => ({ value: r.name, label: r.name })) }]}
        >
          <MonthSelect value={month} options={months} />
        </FilterBar>

        {rows.length === 0 ? (
          tab === "pending" && !q && !room ? (
            <EmptyState title="All caught up" description={`No payments are waiting for review in ${periodLabel}.`} />
          ) : (
            <EmptyState title="No payments found" description="Try another month or clear the filters." />
          )
        ) : (
          <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {rows.map((r) => (
              <SubmissionCard
                key={r.id}
                submission={r}
                imageUrl={urls.get(r.slip_path) ?? null}
                forMonth={formatMonth(r.for_month)}
                submittedAt={formatDateTime(r.created_at)}
                reviewedAt={r.reviewed_at ? formatDateTime(r.reviewed_at) : null}
              />
            ))}
          </div>
        )}
        <Pagination page={page} total={listRes.count ?? 0} pageSize={PAGE_SIZE} basePath="/payments" searchParams={sp} />
      </Card>
    </>
  );
}
